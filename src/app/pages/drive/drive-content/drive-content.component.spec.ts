import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CircleMinus,
  Download,
  EllipsisVertical,
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
  SquarePen,
  Trash2,
} from 'lucide-angular';
import { DriveContentComponent } from './drive-content.component';

describe('DriveContentComponent', () => {
  let component: DriveContentComponent;
  let fixture: ComponentFixture<DriveContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriveContentComponent],
      providers: [
        importProvidersFrom(
          LucideAngularModule.pick({
            CircleMinus,
            Folder,
            File: FileIcon,
            FileArchive,
            FileCode,
            FileImage,
            FilePlay,
            FileSpreadsheet,
            FileText,
            Music,
            Presentation,
            Download,
            SquarePen,
            Trash2,
            EllipsisVertical,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DriveContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders empty state when no folders and files exist', () => {
    fixture.componentRef.setInput('currentFolders', []);
    fixture.componentRef.setInput('currentFiles', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-card')).toBeTruthy();
  });

  it('renders folders and files in grid view', () => {
    fixture.componentRef.setInput('currentFolders', [
      {
        id: 'f1',
        name: 'Work',
        type: 'folder',
        parentId: 'root',
        createdAt: new Date().toISOString(),
      },
    ]);
    fixture.componentRef.setInput('currentFiles', [
      {
        id: 'file1',
        name: 'doc.pdf',
        type: 'file',
        size: 1024,
        parentId: 'root',
        createdAt: new Date().toISOString(),
      },
    ]);
    fixture.componentRef.setInput('viewMode', 'grid');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.folder-card')).toBeTruthy();
    expect(compiled.querySelector('.file-card')).toBeTruthy();
  });

  it('renders folders and files in list view', () => {
    fixture.componentRef.setInput('currentFolders', [
      {
        id: 'f1',
        name: 'Work',
        type: 'folder',
        parentId: 'root',
        createdAt: new Date().toISOString(),
      },
    ]);
    fixture.componentRef.setInput('currentFiles', [
      {
        id: 'file1',
        name: 'doc.pdf',
        type: 'file',
        size: 1024,
        parentId: 'root',
        createdAt: new Date().toISOString(),
      },
    ]);
    fixture.componentRef.setInput('viewMode', 'list');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.drive-table')).toBeTruthy();
    expect(compiled.querySelectorAll('.drive-row').length).toBe(2);
  });
});
