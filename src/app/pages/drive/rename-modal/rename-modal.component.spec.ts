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
import { RenameModalComponent } from './rename-modal.component';

describe('RenameModalComponent', () => {
  let component: RenameModalComponent;
  let fixture: ComponentFixture<RenameModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenameModalComponent],
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

    fixture = TestBed.createComponent(RenameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('validates invalid folder name', () => {
    fixture.componentRef.setInput('node', {
      id: 'f1',
      name: 'Folder',
      type: 'folder',
      parentId: 'root',
      createdAt: '',
    });
    fixture.detectChanges();

    component.renameValue.set('Invalid*Name');
    component.submit();
    expect(component.renameError()).toContain('Special characters are not allowed');
  });
});
