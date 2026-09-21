import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  File as FileIcon,
  FileArchive,
  FileCode,
  FileImage,
  FilePlay,
  FileSpreadsheet,
  FileText,
  LucideAngularModule,
  Music,
  Presentation,
  X,
} from 'lucide-angular';
import { environment } from '../../../../../environments/environment';
import { User } from '../../../../core/models/user.model';
import { ImageModalService } from '../../../../core/services/image-modal.service';
import { UserViewModalComponent } from './user-view-modal.component';

const owner: User = {
  id: 7,
  name: 'Emma Employee',
  email: 'emma@demo.com',
  role: 'employee',
  status: 'active',
  department: 'Design',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('UserViewModalComponent uploads', () => {
  let fixture: ComponentFixture<UserViewModalComponent>;
  let httpMock: HttpTestingController;

  const request = (collection: string): HttpRequest<unknown> | undefined =>
    httpMock.match((r) => r.url === `${environment.apiUrl}/${collection}`)[0]?.request;

  const open = (user: User | null) => {
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserViewModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        importProvidersFrom(
          LucideAngularModule.pick({
            X,
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

    fixture = TestBed.createComponent(UserViewModalComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(ImageModalService).close());

  it('asks for the viewed user`s uploads, by email and by display name', () => {
    open(owner);

    // `uploadedBy` is the email on newer rows and the name on older ones; json-server ORs them.
    for (const collection of ['images', 'nodes']) {
      expect(request(collection)?.params.getAll('uploadedBy')).toEqual([
        'emma@demo.com',
        'Emma Employee',
      ]);
    }
  });

  it('fetches nothing until it is opened', () => {
    fixture.componentRef.setInput('user', owner);
    fixture.detectChanges();

    httpMock.expectNone(() => true);
  });

  it('lists the files and drops the folders, which are not uploads', () => {
    open(owner);

    httpMock.match((r) => r.url.endsWith('/images'))[0].flush([]);
    httpMock
      .match((r) => r.url.endsWith('/nodes'))[0]
      .flush([
        { id: 'folder-1', name: 'Work', type: 'folder', parentId: 'root', createdAt: '' },
        { id: 'file-1', name: 'spec.pdf', type: 'file', parentId: 'root', size: 10, createdAt: '' },
      ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual(['spec.pdf']);
    expect(fixture.nativeElement.textContent).toContain('spec.pdf');
  });

  it('opens a picture in the lightbox at the thumbnail that was clicked', () => {
    open(owner);

    httpMock
      .match((r) => r.url.endsWith('/images'))[0]
      .flush([
        { id: 1, name: 'one.png', url: 'data:image/png;base64,AA', size: 1, createdAt: '' },
        { id: 2, name: 'two.png', url: 'data:image/png;base64,BB', size: 1, createdAt: '' },
      ]);
    httpMock.match((r) => r.url.endsWith('/nodes'))[0].flush([]);
    fixture.detectChanges();

    const thumbs: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.upload-thumb'),
    );
    expect(thumbs.length).toBe(2);
    thumbs[1].click();

    const lightbox = TestBed.inject(ImageModalService);
    expect(lightbox.isOpen()).toBe(true);
    expect(lightbox.currentImage()?.title).toBe('two.png');
  });
});
