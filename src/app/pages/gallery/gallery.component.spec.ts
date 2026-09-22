import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  AlertCircle,
  ArrowLeft,
  CircleMinus,
  Download,
  Eye,
  Grid,
  LucideAngularModule,
  Maximize2,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { ImageItem } from '../../core/models/image.model';
import { User } from '../../core/models/user.model';
import { ImageModalService } from '../../core/services/image-modal.service';
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
            ArrowLeft,
            Download,
            Grid,
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

  describe('card interaction', () => {
    const cards = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.gallery-item'));

    const fire = (card: HTMLElement, type: 'click' | 'dblclick') => {
      card.dispatchEvent(new MouseEvent(type, { bubbles: true }));
      fixture.detectChanges();
    };

    /** Longer than the component's own double-click window. */
    const settle = async () => {
      await new Promise((r) => setTimeout(r, 320));
      fixture.detectChanges();
    };

    afterEach(() => TestBed.inject(ImageModalService).close());

    it('magnifies on a single click, once no second click follows', async () => {
      fire(cards()[1], 'click');
      await settle();

      expect(component.activeImage()?.name).toBe('two.png');
      expect(TestBed.inject(ImageModalService).isOpen()).toBe(false);
    });

    it('opens the lightbox on a double click, cancelling the pending magnify', async () => {
      const card = cards()[1];
      fire(card, 'click');
      fire(card, 'click');
      fire(card, 'dblclick');
      await settle();

      const modal = TestBed.inject(ImageModalService);
      expect(modal.isOpen()).toBe(true);
      expect(modal.currentImage()?.title).toBe('two.png');
      // The studio must not have swallowed the grid on the way.
      expect(component.activeImage()).toBeNull();
    });

    it('no longer paints Magnify and View pills over the thumbnail', () => {
      expect(fixture.nativeElement.querySelector('.gallery-hover-overlay')).toBeNull();
    });

    it('opens the card that was double-clicked, not its position in the full collection', async () => {
      component.searchQuery.set('three');
      fixture.detectChanges();

      fire(cards()[0], 'dblclick');
      await settle();

      expect(TestBed.inject(ImageModalService).currentImage()?.title).toBe('three.png');
    });

    it('swaps the collection for the studio, and the back button returns to it', async () => {
      fire(cards()[0], 'click');
      await settle();
      expect(fixture.nativeElement.querySelector('app-gallery-collection')).toBeNull();

      const back: HTMLButtonElement = fixture.nativeElement.querySelector('.studio-back-btn');
      back.click();
      await fixture.whenStable();

      expect(component.activeImage()).toBeNull();
      expect(fixture.nativeElement.querySelector('app-gallery-collection')).toBeTruthy();
      expect(cards().length).toBe(mockImages.length);
    });
  });

  describe('select all', () => {
    const press = (key: string, init: KeyboardEventInit = {}) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));

    afterEach(() => TestBed.inject(ImageModalService).close());

    it('selects the collection on Ctrl+A, and drops it again on Escape', () => {
      press('a', { ctrlKey: true });
      expect(component.selectedCount()).toBe(mockImages.length);
      expect(component.allFilteredSelected()).toBe(true);

      press('Escape');
      expect(component.selectedCount()).toBe(0);
    });

    it('takes Cmd+A too, and leaves Ctrl+A alone inside a text box', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      expect(component.selectedCount()).toBe(0);
      input.remove();

      press('a', { metaKey: true });
      expect(component.selectedCount()).toBe(mockImages.length);
    });

    it('only selects what the search box left on screen', () => {
      component.searchQuery.set('three');

      press('a', { ctrlKey: true });

      expect(component.selectedImages().map((i) => i.name)).toEqual(['three.png']);
    });

    it('stays out of the way while the studio is open', () => {
      component.setActiveImage(mockImages[0]);

      press('a', { ctrlKey: true });

      expect(component.selectedCount()).toBe(0);
    });

    it('ticks every card, and the select-all box, when the shortcut fires', () => {
      press('a', { ctrlKey: true });
      fixture.detectChanges();

      expect(cardCheckboxes().length).toBe(mockImages.length);
      expect(cardCheckboxes().every((box) => box.checked)).toBe(true);
      expect(selectAllCheckbox().checked).toBe(true);
    });
  });

  it('searches the uploader as well as the image name', () => {
    component.images.set([
      { ...mockImage(1, 'sunset.png'), uploadedBy: 'Smith Josh' },
      { ...mockImage(2, 'budget.png'), uploadedBy: 'debabrata@demo.com' },
    ]);

    component.searchQuery.set('smith');
    expect(component.filteredImages().map((i) => i.name)).toEqual(['sunset.png']);

    // An uploader stored as an email is searchable by that email too.
    component.searchQuery.set('debabrata');
    expect(component.filteredImages().map((i) => i.name)).toEqual(['budget.png']);

    component.searchQuery.set('sunset');
    expect(component.filteredImages().map((i) => i.name)).toEqual(['sunset.png']);
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

describe('GalleryComponent user browsing', () => {
  let fixture: ComponentFixture<GalleryComponent>;
  let component: GalleryComponent;
  let httpMock: HttpTestingController;

  const admin: User = {
    id: 1,
    name: 'System Admin',
    email: 'admin@demo.com',
    role: 'admin',
    status: 'active',
  };
  const emma: User = {
    id: 7,
    name: 'Emma Employee',
    email: 'emma@demo.com',
    role: 'employee',
    status: 'active',
  };

  const flushAll = (url: string, body: User | User[]) => {
    for (const req of httpMock.match((r) => r.url === url)) req.flush(body);
  };

  beforeEach(async () => {
    localStorage.setItem(
      'user_manage_session',
      JSON.stringify({ token: 'x', user: admin, expiresAt: Date.now() + 3_600_000 }),
    );

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
            ArrowLeft,
            CircleMinus,
            Download,
            Eye,
            Grid,
            Maximize2,
            Plus,
            Search,
            Trash2,
            TriangleAlert,
            Upload,
            X,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // AuthService re-reads the stored session on boot, then the page loads the directory.
    flushAll(`${environment.apiUrl}/users/1`, admin);
    flushAll(`${environment.apiUrl}/users`, [admin, emma]);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('shows the user list first, not an empty gallery', () => {
    expect(component.showUserList()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-user-picker')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-gallery-collection')).toBeNull();
    // Nothing is fetched from /images until a user is chosen.
    httpMock.expectNone((r) => r.url.endsWith('/images'));
  });

  it('opens one user`s images, asked for by email and display name', () => {
    component.viewUser(emma);
    fixture.detectChanges();

    const req = httpMock.match((r) => r.url.endsWith('/images'))[0];
    expect(req.request.params.getAll('uploadedBy')).toEqual(['emma@demo.com', 'Emma Employee']);
    req.flush([mockImage(1, 'emma.png')]);
    fixture.detectChanges();

    expect(component.showUserList()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-gallery-collection')).toBeTruthy();
    // Uploads carry the signed-in identity, so they cannot go into someone else's gallery.
    expect(component.canUpload()).toBe(false);
  });

  it('puts the viewed user in the URL, so browser Back returns to the list', () => {
    const navigations: Record<string, unknown>[] = [];
    const router = TestBed.inject(Router);
    router.navigate = ((_commands: unknown[], extras: Record<string, unknown>) => {
      navigations.push(extras);
      return Promise.resolve(true);
    }) as never;

    component.viewUser(emma);
    expect(navigations.at(-1)?.['queryParams']).toEqual({ userId: 7 });

    component.backToUsers();
    expect(navigations.at(-1)?.['queryParams']).toEqual({});
  });

  it('goes back to the list, and never offers upload to a reviewer', () => {
    component.viewUser(emma);
    httpMock.match((r) => r.url.endsWith('/images'))[0].flush([]);

    component.backToUsers();
    fixture.detectChanges();
    expect(component.showUserList()).toBe(true);
    expect(component.images()).toEqual([]);

    // Not even on their own row: an admin's upload would be stored against their account.
    component.viewUser(admin);
    httpMock.match((r) => r.url.endsWith('/images'))[0].flush([]);
    expect(component.canUpload()).toBe(false);
  });
});
