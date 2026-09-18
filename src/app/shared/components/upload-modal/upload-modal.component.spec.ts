import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  AlertCircle,
  CheckCircle2,
  File as FileIcon,
  FileArchive,
  FileCode,
  FileImage,
  FilePlay,
  FileSpreadsheet,
  FileText,
  Folder,
  Info,
  LucideAngularModule,
  Maximize2,
  Music,
  Plus,
  Presentation,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-angular';
import { UploadModalComponent } from './upload-modal.component';

describe('UploadModalComponent', () => {
  let fixture: ComponentFixture<UploadModalComponent>;
  let component: UploadModalComponent;

  const dummyFile = new File(['dummy content'], 'dummy.png', { type: 'image/png' });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        importProvidersFrom(
          LucideAngularModule.pick({
            AlertCircle,
            CheckCircle2,
            File: FileIcon,
            FileArchive,
            FileCode,
            FileImage,
            FilePlay,
            FileSpreadsheet,
            FileText,
            Folder,
            Info,
            Maximize2,
            Music,
            Plus,
            Presentation,
            Search,
            Trash2,
            TriangleAlert,
            Upload,
            X,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calculates valid previews count correctly', () => {
    component.selectedPreviews.set([
      {
        file: dummyFile,
        name: 'good.png',
        size: 100,
        type: 'image/png',
        dataUrl: 'data:image/png;base64,good',
      },
      {
        file: dummyFile,
        name: 'bad.png',
        size: 100,
        type: 'image/png',
        dataUrl: '',
        error: 'Too large',
      },
    ]);
    expect(component.validPreviewsCount()).toBe(1);
  });

  it('clears previews when clearPreviews is called', () => {
    component.selectedPreviews.set([
      {
        file: dummyFile,
        name: 'good.png',
        size: 100,
        type: 'image/png',
        dataUrl: 'data:image/png;base64,good',
      },
    ]);
    expect(component.selectedPreviews().length).toBe(1);
    component.clearPreviews();
    expect(component.selectedPreviews().length).toBe(0);
  });

  it('flags duplicate file as error if it already exists in existingNames', async () => {
    fixture.componentRef.setInput('existingNames', ['existing-photo.jpg']);
    fixture.detectChanges();

    const file = new File(['123'], 'existing-photo.jpg', { type: 'image/jpeg' });
    await component.onFilesSelected([file]);

    const previews = component.selectedPreviews();
    expect(previews.length).toBe(1);
    expect(previews[0].error).toContain('Duplicate: A file with this name already exists');
    expect(component.validPreviewsCount()).toBe(0);
  });

  describe('accept enforcement', () => {
    const galleryAccept = 'image/png, image/jpeg, image/webp, image/gif, image/svg+xml';

    beforeEach(() => {
      fixture.componentRef.setInput('accept', galleryAccept);
      fixture.componentRef.setInput('target', 'gallery');
      fixture.detectChanges();
    });

    it('keeps a video out of the queue entirely, rather than listing it with an error', async () => {
      // The OS picker lets the filter be switched to "All files", so this is what actually
      // stops a screencast landing in the Gallery.
      await component.onFilesSelected([
        new File(['x'], 'Screencast from 2026-09-11 12-52-10.mp4', { type: 'video/mp4' }),
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]);

      expect(component.selectedPreviews().map((p) => p.name)).toEqual(['photo.png']);
    });

    it('matches on the name when the file arrives without a MIME type', async () => {
      await component.onFilesSelected([
        new File(['x'], 'clip.mov', { type: '' }),
        new File(['x'], 'shot.jpeg', { type: '' }),
      ]);

      expect(component.selectedPreviews().map((p) => p.name)).toEqual(['shot.jpeg']);
    });

    it('takes anything once the picker accepts anything', async () => {
      fixture.componentRef.setInput('accept', '*/*');
      fixture.componentRef.setInput('target', 'drive');
      fixture.detectChanges();

      await component.onFilesSelected([
        new File(['x'], 'clip.mp4', { type: 'video/mp4' }),
        new File(['x'], 'notes.pdf', { type: 'application/pdf' }),
      ]);

      expect(component.selectedPreviews().length).toBe(2);
    });
  });

  it('flags duplicate file within the same selection batch', async () => {
    const file1 = new File(['123'], 'batch-photo.jpg', { type: 'image/jpeg' });
    const file2 = new File(['123'], 'batch-photo.jpg', { type: 'image/jpeg' });

    await component.onFilesSelected([file1, file2]);

    const previews = component.selectedPreviews();
    expect(previews.length).toBe(2);
    expect(previews[0].error).toBeUndefined();
    expect(previews[1].error).toContain('Duplicate: File already added');
    expect(component.validPreviewsCount()).toBe(1);
  });
});
