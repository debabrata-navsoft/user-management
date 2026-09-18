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
