import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { CreateFolderModalComponent } from './create-folder-modal.component';

describe('CreateFolderModalComponent', () => {
  let component: CreateFolderModalComponent;
  let fixture: ComponentFixture<CreateFolderModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateFolderModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(
          LucideAngularModule.pick({
            X,
            AlertCircle,
            TriangleAlert,
            CheckCircle2,
            Info,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateFolderModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('validates empty folder names', () => {
    component.newFolderName.set('');
    component.submit();
    expect(component.folderNameError()).toBe('Folder name cannot be empty.');
  });

  it('validates duplicate folder names', () => {
    fixture.componentRef.setInput('existingFolderNames', ['Documents']);
    component.newFolderName.set('documents');
    component.submit();
    expect(component.folderNameError()).toContain('already exists');
  });
});
