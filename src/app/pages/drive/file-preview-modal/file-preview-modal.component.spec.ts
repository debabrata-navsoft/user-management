import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  File as FileIcon,
  FileArchive,
  FileCode,
  FileImage,
  FilePlay,
  FileSpreadsheet,
  FileText,
  Folder,
  LucideAngularModule,
  Music,
  Presentation,
  X,
} from 'lucide-angular';
import { FilePreviewModalComponent } from './file-preview-modal.component';

describe('FilePreviewModalComponent', () => {
  let component: FilePreviewModalComponent;
  let fixture: ComponentFixture<FilePreviewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePreviewModalComponent],
      providers: [
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
            Folder,
            Music,
            Presentation,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreviewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
