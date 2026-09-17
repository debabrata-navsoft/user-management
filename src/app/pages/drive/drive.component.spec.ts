import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  AlertCircle,
  CheckCircle2,
  CircleMinus,
  File as FileIcon,
  FileArchive,
  FileCode,
  FileImage,
  FilePlay,
  FileSpreadsheet,
  FileText,
  Info,
  LucideAngularModule,
  Music,
  Presentation,
  Search,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { DriveComponent } from './drive.component';

/** jsdom has no DataTransfer.items.add, so stand in a FileList-like object. */
function attachFiles(input: HTMLInputElement, files: File[]): void {
  const list = {
    ...files,
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  };
  Object.defineProperty(input, 'files', { value: list, configurable: true, writable: true });
}

const fileOf = (name: string, type: string, bytes = 16): File =>
  new File([new Uint8Array(bytes)], name, { type });

describe('DriveComponent multi-file upload', () => {
  let fixture: ComponentFixture<DriveComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriveComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        importProvidersFrom(
          LucideAngularModule.pick({
            Search,
            X,
            Info,
            CheckCircle2,
            AlertCircle,
            TriangleAlert,
            CircleMinus,
            File: FileIcon,
            FileArchive,
            FileCode,
            FileImage,
            FilePlay,
            FileSpreadsheet,
            FileText,
            Music,
            Presentation,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DriveComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // ngOnInit loads the folder and the stats.
    for (const req of httpMock.match((r) => r.url.includes('/nodes'))) {
      req.flush([]);
    }
    await fixture.whenStable();
  });

  describe('context menu placement', () => {
    /** Fake a trigger button sitting `fromBottom` px above the viewport edge. */
    const clickAt = (fromBottom: number): MouseEvent => {
      const trigger = document.createElement('button');
      trigger.getBoundingClientRect = () =>
        ({ bottom: window.innerHeight - fromBottom }) as DOMRect;
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'currentTarget', { value: trigger });
      return event;
    };

    const node = {
      id: 'file-1',
      name: 'a.pdf',
      type: 'file' as const,
      parentId: 'root',
      createdAt: '',
    };

    it('drops down when there is room below', () => {
      fixture.componentInstance.toggleMenu(node, clickAt(500));
      expect(fixture.componentInstance.menuDropUp()).toBe(false);
      expect(fixture.componentInstance.activeMenuNode()?.id).toBe('file-1');
    });

    it('flips up for a trigger near the bottom of the viewport', () => {
      fixture.componentInstance.toggleMenu(node, clickAt(40));
      expect(fixture.componentInstance.menuDropUp()).toBe(true);
    });

    it('closes again when the same trigger is clicked twice', () => {
      fixture.componentInstance.toggleMenu(node, clickAt(40));
      fixture.componentInstance.toggleMenu(node, clickAt(40));
      expect(fixture.componentInstance.activeMenuNode()).toBeNull();
    });
  });

  it('exposes a multiple file input wired to the upload handler', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input.multiple).toBe(true);
  });

  it('POSTs every selected file, not only the first', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const picked = [
      fileOf('one.pdf', 'application/pdf'),
      fileOf('two.zip', 'application/zip'),
      fileOf('three.txt', 'text/plain'),
    ];
    attachFiles(input, picked);
    input.dispatchEvent(new Event('change'));

    const posted: string[] = [];
    // Uploads are sequential, so drain one POST at a time.
    for (let i = 0; i < picked.length; i++) {
      const req = await waitForPost(httpMock, `${environment.apiUrl}/nodes`);
      posted.push(req.request.body.name);
      req.flush({ ...req.request.body });
    }

    expect(posted).toEqual(['one.pdf', 'two.zip', 'three.txt']);
  });

  it('mirrors each selected image into the gallery', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    attachFiles(input, [fileOf('a.png', 'image/png'), fileOf('b.png', 'image/png')]);
    input.dispatchEvent(new Event('change'));

    const mirrored: string[] = [];
    for (let i = 0; i < 2; i++) {
      const nodeReq = await waitForPost(httpMock, `${environment.apiUrl}/nodes`);
      nodeReq.flush({ ...nodeReq.request.body });

      const imgReq = await waitForPost(httpMock, `${environment.apiUrl}/images`);
      mirrored.push(imgReq.request.body.name);
      imgReq.flush({ id: 100 + i, ...imgReq.request.body });

      const patchReq = await waitForPost(
        httpMock,
        `${environment.apiUrl}/nodes/${nodeReq.request.body.id}`,
      );
      patchReq.flush({});
    }

    expect(mirrored).toEqual(['a.png', 'b.png']);
  });
});

async function waitForPost(httpMock: HttpTestingController, url: string) {
  for (let i = 0; i < 100; i++) {
    const matches = httpMock.match(url);
    if (matches.length > 0) return matches[0];
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`No request to ${url}`);
}
