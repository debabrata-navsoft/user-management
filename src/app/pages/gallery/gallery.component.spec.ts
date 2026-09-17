import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  AlertCircle,
  Download,
  LucideAngularModule,
  Maximize2,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-angular';
import { ImageItem } from '../../core/models/image.model';
import { ImageService } from '../../core/services/image.service';
import { GalleryComponent } from './gallery.component';

const mockImage = (id: number, name: string): ImageItem => ({
  id,
  name,
  url: `data:image/png;base64,${name}`,
  size: id * 10,
  type: 'image/png',
  uploadedBy: 'Tester',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const mockImages: ImageItem[] = [
  mockImage(1, 'one.png'),
  mockImage(2, 'two.png'),
  mockImage(3, 'three.png'),
];

describe('GalleryComponent selection', () => {
  let fixture: ComponentFixture<GalleryComponent>;
  let component: GalleryComponent;

  const cardCheckboxes = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.select-check .select-box'));

  const selectAllCheckbox = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('.select-all-row .select-box');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        importProvidersFrom(
          LucideAngularModule.pick({
            AlertCircle,
            Download,
            Maximize2,
            Plus,
            Search,
            Trash2,
            TriangleAlert,
            Upload,
            X,
          }),
        ),
        { provide: ImageService, useValue: { getImages: () => of(mockImages) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders a checkbox per image, all unchecked initially', () => {
    expect(cardCheckboxes().length).toBe(mockImages.length);
    expect(cardCheckboxes().every((box) => box.checked)).toBe(false);
    expect(selectAllCheckbox().checked).toBe(false);
  });

  it('ticks every card checkbox when select all is clicked', async () => {
    // No manual detectChanges(): the app is zoneless, so the click alone must
    // be enough to re-render the checkboxes.
    selectAllCheckbox().click();
    await fixture.whenStable();

    expect(component.selectedCount()).toBe(mockImages.length);
    expect(selectAllCheckbox().checked).toBe(true);
    expect(cardCheckboxes().every((box) => box.checked)).toBe(true);
  });

  it('clears every card checkbox when select all is clicked again', async () => {
    selectAllCheckbox().click();
    fixture.detectChanges();
    await fixture.whenStable();

    selectAllCheckbox().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedCount()).toBe(0);
    expect(cardCheckboxes().some((box) => box.checked)).toBe(false);
  });

  it('marks the grid as selection-active only while something is selected', async () => {
    const grid = (): HTMLElement => fixture.nativeElement.querySelector('.gallery-grid');
    expect(grid().classList.contains('selection-active')).toBe(false);

    selectAllCheckbox().click();
    await fixture.whenStable();
    expect(grid().classList.contains('selection-active')).toBe(true);

    selectAllCheckbox().click();
    await fixture.whenStable();
    expect(grid().classList.contains('selection-active')).toBe(false);
  });

  it('ticks select all once every card is individually checked', async () => {
    for (const box of cardCheckboxes()) {
      box.click();
    }
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedCount()).toBe(mockImages.length);
    expect(selectAllCheckbox().checked).toBe(true);
  });
});
