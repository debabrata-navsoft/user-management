import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DriveNode } from '../models/drive.model';
import { ImageItem } from '../models/image.model';
import { isConnectionLost, pause } from '../utils/write-pacing';
import { DRIVE_ROOT } from './drive.service';
import { LoadingService } from './loading.service';
import { SnackbarService } from './snackbar.service';

export interface MediaUploadOutcome {
  uploaded: string[];
  tooLarge: string[];
  failed: string[];
}

export interface MediaUploadOptions {
  uploadedBy: string;
  driveParentId?: string;
  maxMb?: number;
}

export interface MediaUploadItem {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ReadFilesResult {
  items: MediaUploadItem[];
  tooLarge: string[];
  unreadable: string[];
}

@Injectable({
  providedIn: 'root',
})
export class MediaUploadService {
  private http = inject(HttpClient);
  private snackbar = inject(SnackbarService);
  private loading = inject(LoadingService);
  private imagesUrl = `${environment.apiUrl}/images`;
  private nodesUrl = `${environment.apiUrl}/nodes`;

  get maxUploadMb(): number {
    return environment.maxDriveUploadMb;
  }

  async readFiles(files: File[], maxMb = this.maxUploadMb): Promise<ReadFilesResult> {
    const maxBytes = maxMb * 1024 * 1024;
    const result: ReadFilesResult = { items: [], tooLarge: [], unreadable: [] };

    for (const file of files) {
      if (file.size > maxBytes) {
        result.tooLarge.push(file.name);
        continue;
      }
      try {
        result.items.push({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: await this.readAsDataUrl(file),
        });
      } catch {
        result.unreadable.push(file.name);
      }
    }

    return result;
  }

  /** Drive and Gallery are separate stores: this writes `nodes` only. */
  uploadToDrive(items: MediaUploadItem[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    const parentId = opts.driveParentId || DRIVE_ROOT;
    return this.runUploads(items, (item) =>
      this.http.post<DriveNode>(this.nodesUrl, this.nodeFor(item, parentId, opts.uploadedBy)),
    );
  }

  /** Counterpart of {@link uploadToDrive}: this writes `images` only. */
  uploadToGallery(items: MediaUploadItem[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    return this.runUploads(items, (item) =>
      this.http.post<ImageItem>(this.imagesUrl, this.imageFor(item, opts.uploadedBy)),
    );
  }

  async readAndUploadToDrive(files: File[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    // Reading a batch of base64 blobs is slow but issues no request, so without
    // this the overlay only appears once the first POST goes out. Nesting is
    // safe: LoadingService counts holds.
    this.loading.show();
    try {
      const read = await this.readFiles(files, opts.maxMb ?? this.maxUploadMb);
      const outcome = await this.uploadToDrive(read.items, opts);
      outcome.tooLarge.push(...read.tooLarge);
      outcome.failed.push(...read.unreadable);
      return outcome;
    } finally {
      this.loading.hide();
    }
  }

  report(outcome: MediaUploadOutcome, destination = 'current folder'): void {
    const { uploaded, tooLarge, failed } = outcome;

    if (uploaded.length > 0) {
      this.snackbar.success(
        uploaded.length === 1
          ? `Uploaded "${uploaded[0]}" to the ${destination}.`
          : `Uploaded ${uploaded.length} files to the ${destination}.`,
      );
    }
    if (tooLarge.length > 0) {
      this.snackbar.error(
        `${tooLarge.length} file(s) exceed the ${this.maxUploadMb}MB limit and were skipped: ` +
          tooLarge.join(', '),
        'File Too Large',
      );
    }
    if (failed.length > 0) {
      this.snackbar.error(`Failed to upload: ${failed.join(', ')}`);
    }
  }

  private async runUploads(
    items: MediaUploadItem[],
    post: (item: MediaUploadItem) => Observable<unknown>,
  ): Promise<MediaUploadOutcome> {
    const outcome: MediaUploadOutcome = { uploaded: [], tooLarge: [], failed: [] };

    // One loader for the whole batch. The interceptor raises and drops the
    // global loader per request, so across a paced batch the request count hits
    // zero in every gap: the overlay unmounts, the page's own inline loader
    // (which only hides while the overlay is up) takes its place, and the next
    // file swaps them back — two loaders flickering, once per file. Holding the
    // count above zero for the batch keeps it to a single, steady overlay.
    this.loading.show();
    try {
      for (const [index, item] of items.entries()) {
        try {
          if (index) await pause();
          await firstValueFrom(post(item));
          outcome.uploaded.push(item.name);
        } catch (error) {
          outcome.failed.push(item.name);

          // Once the connection is gone the rest cannot land either, and each
          // attempt would raise its own error toast. Record them and stop.
          if (isConnectionLost(error)) {
            outcome.failed.push(...items.slice(index + 1).map((rest) => rest.name));
            break;
          }
        }
      }
    } finally {
      this.loading.hide();
    }

    return outcome;
  }

  private nodeFor(item: MediaUploadItem, parentId: string, uploadedBy: string): DriveNode {
    return {
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      name: item.name,
      type: 'file',
      parentId,
      size: item.size,
      mimeType: item.type,
      dataUrl: item.dataUrl,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };
  }

  private imageFor(item: MediaUploadItem, uploadedBy: string): Omit<ImageItem, 'id'> {
    return {
      name: item.name,
      url: item.dataUrl,
      size: item.size,
      type: item.type,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = (e.target?.result as string) || '';
        if (url) resolve(url);
        else reject(new Error(`Empty read for ${file.name}`));
      };
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }
}
