import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  AlertCircle,
  CheckCircle2,
  CircleMinus,
  EllipsisVertical,
  File as FileIcon,
  FileArchive,
  FileCode,
  FileImage,
  FilePlay,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Info,
  LucideAngularModule,
  Music,
  Presentation,
  Upload,
  Search,
  Trash2,
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
            FolderPlus,
            Music,
            Presentation,
            Upload,
            EllipsisVertical,
            Trash2,
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

  describe('opening a file', () => {
    const fileNode = (name: string, mimeType: string, dataUrl?: string) => ({
      id: 'file-' + name,
      name,
      type: 'file' as const,
      parentId: 'root',
      mimeType,
      dataUrl,
      createdAt: '',
    });

    const originalOpen = window.open;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    let opened: string[];

    beforeEach(() => {
      opened = [];
      URL.createObjectURL = () => 'blob:mock/1';
      URL.revokeObjectURL = () => undefined;
      window.open = ((url: string) => {
        opened.push(url);
        return {} as Window;
      }) as typeof window.open;
    });

    afterEach(() => {
      window.open = originalOpen;
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    });

    it('sends a document to a browser tab instead of the in-app modal', () => {
      const pdf = fileNode('report.pdf', 'application/pdf', 'data:application/pdf;base64,QUJD');
      fixture.componentInstance.openPreview(pdf);

      expect(opened).toEqual(['blob:mock/1']);
      expect(fixture.componentInstance.isPreviewOpen()).toBe(false);
    });

    it('does the same for a spreadsheet, which Chrome will download', () => {
      const xlsx = fileNode(
        'budget.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'data:application/vnd.ms-excel;base64,QUJD',
      );
      fixture.componentInstance.openPreview(xlsx);

      expect(opened.length).toBe(1);
      expect(fixture.componentInstance.isPreviewOpen()).toBe(false);
    });

    it('keeps images in the in-app lightbox', () => {
      const png = fileNode('cat.png', 'image/png', 'data:image/png;base64,QUJD');
      fixture.componentInstance.openPreview(png);

      expect(opened).toEqual([]);
      expect(fixture.componentInstance.isPreviewOpen()).toBe(false);
    });

    it('falls back to the modal when a document has no stored bytes', () => {
      fixture.componentInstance.openPreview(fileNode('empty.docx', 'application/msword'));

      expect(opened).toEqual([]);
      expect(fixture.componentInstance.isPreviewOpen()).toBe(true);
    });

    it('falls back to the modal when the pop-up is blocked', () => {
      window.open = (() => null) as typeof window.open;
      fixture.componentInstance.openPreview(
        fileNode('report.pdf', 'application/pdf', 'data:application/pdf;base64,QUJD'),
      );

      expect(fixture.componentInstance.isPreviewOpen()).toBe(true);
    });
  });

  it('exposes upload modal for multiple file upload', () => {
    fixture.componentInstance.openUploadModal();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('app-upload-modal');
    expect(modal).toBeTruthy();
  });

  it('opens and closes upload modal', () => {
    fixture.componentInstance.openUploadModal();
    expect(fixture.componentInstance.isUploadModalOpen()).toBe(true);

    fixture.componentInstance.closeUploadModal();
    expect(fixture.componentInstance.isUploadModalOpen()).toBe(false);
  });

  it('opens and closes create folder modal', () => {
    fixture.componentInstance.openCreateFolderModal();
    expect(fixture.componentInstance.isCreateFolderOpen()).toBe(true);

    fixture.componentInstance.closeCreateFolderModal();
    expect(fixture.componentInstance.isCreateFolderOpen()).toBe(false);
  });

  it('searches the owner column as well as the file name', () => {
    const component = fixture.componentInstance;
    const createdAt = new Date().toISOString();
    component.nodes.set([
      {
        id: 'file-1',
        name: 'notes.pdf',
        type: 'file',
        parentId: 'root',
        createdAt,
        uploadedBy: 'Smith Josh',
      },
      {
        id: 'file-2',
        name: 'budget.xlsx',
        type: 'file',
        parentId: 'root',
        createdAt,
        uploadedBy: 'debabrata@demo.com',
      },
    ]);

    component.searchQuery.set('smith');
    expect(component.currentFiles().map((f) => f.name)).toEqual(['notes.pdf']);

    // An owner stored as an email is searchable by that email too.
    component.searchQuery.set('debabrata');
    expect(component.currentFiles().map((f) => f.name)).toEqual(['budget.xlsx']);

    component.searchQuery.set('notes');
    expect(component.currentFiles().map((f) => f.name)).toEqual(['notes.pdf']);
  });

  describe('select all and bulk delete', () => {
    const createdAt = new Date().toISOString();
    const folder = {
      id: 'folder-1',
      name: 'Reports',
      type: 'folder' as const,
      parentId: 'root',
      createdAt,
    };
    const file = {
      id: 'file-1',
      name: 'notes.pdf',
      type: 'file' as const,
      parentId: 'root',
      createdAt,
    };
    const nested = {
      id: 'file-2',
      name: 'nested.pdf',
      type: 'file' as const,
      parentId: 'folder-1',
      createdAt,
    };

    const press = (key: string, init: KeyboardEventInit = {}) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));

    beforeEach(() => {
      fixture.componentInstance.nodes.set([folder, file]);
    });

    it('selects every item in the folder on Ctrl+A, and drops it again on Escape', () => {
      const component = fixture.componentInstance;

      press('a', { ctrlKey: true });
      expect(component.selectedCount()).toBe(2);
      expect(component.allVisibleSelected()).toBe(true);

      press('Escape');
      expect(component.selectedCount()).toBe(0);
    });

    it('takes Cmd+A too, and leaves Ctrl+A alone inside a text box', () => {
      const component = fixture.componentInstance;

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      expect(component.selectedCount()).toBe(0);
      input.remove();

      press('a', { metaKey: true });
      expect(component.selectedCount()).toBe(2);
    });

    it('only selects what the search box left on screen', () => {
      const component = fixture.componentInstance;
      component.searchQuery.set('notes');

      press('a', { ctrlKey: true });

      expect([...component.selectedIds()]).toEqual(['file-1']);
    });

    it('deletes the whole selection in one paced batch, descendants included', async () => {
      const component = fixture.componentInstance;
      component.selectAll();
      component.confirmDeleteSelected();
      component.submitDelete();

      // The tree is fetched once, not once per selected node.
      const tree = await waitFor(httpMock, (r) => r.method === 'GET' && r.url.endsWith('/nodes'));
      tree.flush([folder, file, nested]);

      const deleted: string[] = [];
      for (let i = 0; i < 3; i++) {
        const req = await waitFor(httpMock, (r) => r.method === 'DELETE');
        deleted.push(req.request.url.split('/nodes/')[1]);
        req.flush(null);
      }

      // The batch finishes a microtask after the last flush.
      await new Promise((r) => setTimeout(r, 20));

      // The folder's child goes with it, and no id is deleted twice.
      expect(deleted.sort()).toEqual(['file-1', 'file-2', 'folder-1']);
      expect(httpMock.match((r) => r.method === 'DELETE')).toEqual([]);
      expect(component.selectedCount()).toBe(0);
      expect(component.isDeleteOpen()).toBe(false);
    });

    it('asks about the selection, not about one item', () => {
      const component = fixture.componentInstance;
      component.selectAll();
      component.confirmDeleteSelected();

      expect(component.deleteDialog().title).toBe('Delete Selected Items');
      expect(component.deleteDialog().message).toContain('these 2 items');

      component.closeDeleteModal();
      component.confirmDelete(file);
      expect(component.deleteDialog().title).toBe('Delete Item');
      expect(component.deleteDialog().message).toContain('notes.pdf');
    });
  });

  it('still reports a sibling name the search box is hiding, so duplicates stay blocked', () => {
    const component = fixture.componentInstance;
    const createdAt = new Date().toISOString();
    component.nodes.set([
      { id: 'folder-1', name: 'Reports', type: 'folder', parentId: 'root', createdAt },
      { id: 'file-1', name: 'notes.pdf', type: 'file', parentId: 'root', createdAt },
    ]);

    component.searchQuery.set('notes');

    // The grid only shows the match...
    expect(component.currentFolders()).toEqual([]);
    // ...but "Reports" is still taken, and the duplicate check has to know that.
    expect(component.existingFolderNames()).toEqual(['Reports']);
    expect(component.existingFileNames()).toEqual(['notes.pdf']);
  });
});

/** Paced writes are 150 ms apart, so the next one does not exist yet when the spec looks. */
async function waitFor(
  httpMock: HttpTestingController,
  match: (r: HttpRequest<unknown>) => boolean,
) {
  for (let i = 0; i < 200; i++) {
    const matches = httpMock.match(match);
    if (matches.length > 0) return matches[0];
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('No matching request');
}

async function waitForPost(httpMock: HttpTestingController, url: string) {
  for (let i = 0; i < 100; i++) {
    const matches = httpMock.match(url);
    if (matches.length > 0) return matches[0];
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`No request to ${url}`);
}
