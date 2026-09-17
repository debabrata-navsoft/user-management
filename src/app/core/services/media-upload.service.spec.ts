import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';
import { MediaUploadItem, MediaUploadService } from './media-upload.service';

const item = (name: string, type: string): MediaUploadItem => ({
  name,
  type,
  size: 128,
  dataUrl: `data:${type};base64,AAAA`,
});

const fileOf = (name: string, type: string, bytes: number): File =>
  new File([new Uint8Array(bytes)], name, { type });

describe('MediaUploadService', () => {
  let service: MediaUploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MediaUploadService,
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(
          LucideAngularModule.pick({ Info, CheckCircle2, AlertCircle, TriangleAlert, X }),
        ),
      ],
    });
    service = TestBed.inject(MediaUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('readFiles', () => {
    it('reads every picked file, so multiple selection works', async () => {
      const read = await service.readFiles([
        fileOf('a.png', 'image/png', 8),
        fileOf('b.png', 'image/png', 8),
        fileOf('c.pdf', 'application/pdf', 8),
      ]);

      expect(read.items.map((i) => i.name)).toEqual(['a.png', 'b.png', 'c.pdf']);
      expect(read.items.every((i) => i.dataUrl.startsWith('data:'))).toBe(true);
      expect(read.tooLarge).toEqual([]);
      expect(read.unreadable).toEqual([]);
    });

    it('skips oversized files without reading them', async () => {
      const tooBig = (environment.maxDriveUploadMb + 1) * 1024 * 1024;
      const read = await service.readFiles([
        fileOf('ok.png', 'image/png', 8),
        fileOf('huge.jpg', 'image/jpeg', tooBig),
      ]);

      expect(read.items.map((i) => i.name)).toEqual(['ok.png']);
      expect(read.tooLarge).toEqual(['huge.jpg']);
    });
  });

  describe('uploadToDrive', () => {
    it('uploads every item in a batch, not just the first', async () => {
      const pending = service.uploadToDrive(
        [item('a.pdf', 'application/pdf'), item('b.pdf', 'application/pdf')],
        {
          uploadedBy: 'Tester',
        },
      );

      const first = await waitForRequest(httpMock, `${environment.apiUrl}/nodes`);
      expect(first.request.body.name).toBe('a.pdf');
      first.flush({ ...first.request.body });

      const second = await waitForRequest(httpMock, `${environment.apiUrl}/nodes`);
      expect(second.request.body.name).toBe('b.pdf');
      second.flush({ ...second.request.body });

      const outcome = await pending;
      expect(outcome.uploaded).toEqual(['a.pdf', 'b.pdf']);
      expect(outcome.failed).toEqual([]);
    });

    it('keeps an image in the drive instead of mirroring it into the gallery', async () => {
      const pending = service.uploadToDrive([item('cat.png', 'image/png')], {
        uploadedBy: 'Tester',
        driveParentId: 'folder-abc',
      });

      const nodeReq = await waitForRequest(httpMock, `${environment.apiUrl}/nodes`);
      expect(nodeReq.request.body.parentId).toBe('folder-abc');
      nodeReq.flush({ ...nodeReq.request.body });

      expect((await pending).uploaded).toEqual(['cat.png']);
      httpMock.expectNone(`${environment.apiUrl}/images`);
    });
  });

  describe('uploadToGallery', () => {
    it('writes images to the gallery without touching the drive', async () => {
      const pending = service.uploadToGallery([item('cat.png', 'image/png')], {
        uploadedBy: 'Tester',
      });

      const imageReq = await waitForRequest(httpMock, `${environment.apiUrl}/images`);
      expect(imageReq.request.body).toMatchObject({
        name: 'cat.png',
        url: 'data:image/png;base64,AAAA',
        uploadedBy: 'Tester',
      });
      imageReq.flush({ id: 99, ...imageReq.request.body });

      expect((await pending).uploaded).toEqual(['cat.png']);
      httpMock.expectNone(`${environment.apiUrl}/nodes`);
    });

    it('records a failed image without aborting the batch', async () => {
      const pending = service.uploadToGallery(
        [item('dog.jpg', 'image/jpeg'), item('fox.jpg', 'image/jpeg')],
        { uploadedBy: 'Tester' },
      );

      const first = await waitForRequest(httpMock, `${environment.apiUrl}/images`);
      first.flush('boom', { status: 500, statusText: 'Server Error' });

      const second = await waitForRequest(httpMock, `${environment.apiUrl}/images`);
      second.flush({ id: 100, ...second.request.body });

      const outcome = await pending;
      expect(outcome.uploaded).toEqual(['fox.jpg']);
      expect(outcome.failed).toEqual(['dog.jpg']);
    });
  });

  describe('global loader', () => {
    it('stays up for the whole paced batch instead of blinking per file', async () => {
      const loading = TestBed.inject(LoadingService);

      // Sample faster than WRITE_GAP_MS, so a drop in the gap between two
      // writes — the flicker this guards against — cannot slip past.
      const samples: boolean[] = [];
      const sampler = setInterval(() => samples.push(loading.isLoading()), 10);

      const pending = service.uploadToDrive(
        [item('a.pdf', 'application/pdf'), item('b.pdf', 'application/pdf')],
        { uploadedBy: 'Tester' },
      );

      for (let i = 0; i < 2; i++) {
        const req = await waitForRequest(httpMock, `${environment.apiUrl}/nodes`);
        req.flush({ ...req.request.body });
      }

      await pending;
      clearInterval(sampler);

      expect(samples.length).toBeGreaterThan(0);
      expect(samples.every(Boolean)).toBe(true);
      expect(loading.isLoading()).toBe(false);
    });
  });

  describe('readAndUploadToDrive', () => {
    it('folds read failures into the outcome', async () => {
      const tooBig = (environment.maxDriveUploadMb + 1) * 1024 * 1024;
      const pending = service.readAndUploadToDrive(
        [fileOf('ok.pdf', 'application/pdf', 8), fileOf('huge.jpg', 'image/jpeg', tooBig)],
        { uploadedBy: 'Tester' },
      );

      const nodeReq = await waitForRequest(httpMock, `${environment.apiUrl}/nodes`);
      nodeReq.flush({ ...nodeReq.request.body });

      const outcome = await pending;
      expect(outcome.uploaded).toEqual(['ok.pdf']);
      expect(outcome.tooLarge).toEqual(['huge.jpg']);
    });
  });
});

/** Polls the mock backend until the expected request has been issued. */
async function waitForRequest(httpMock: HttpTestingController, url: string) {
  for (let i = 0; i < 50; i++) {
    const matches = httpMock.match(url);
    if (matches.length > 0) return matches[0];
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`No request to ${url}`);
}
