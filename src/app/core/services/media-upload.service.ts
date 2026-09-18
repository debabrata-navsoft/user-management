import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DriveNode } from '../models/drive.model';
import { ImageItem } from '../models/image.model';
import { batchedWrite, runPacedWrites } from '../utils/write-pacing';
import { DRIVE_ROOT } from './drive.service';
import { LoadingService } from './loading.service';
import { SnackbarService } from './snackbar.service';

export interface MediaUploadOutcome {
  uploaded: string[];
  tooLarge: string[];
  duplicates: string[];
  failed: string[];
  /** The API stopped responding mid-batch, so the remaining files were never attempted. */
  connectionLost?: boolean;
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

  uploadToDrive(items: MediaUploadItem[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    const parentId = opts.driveParentId || DRIVE_ROOT;
    return this.runUploads(items, (item) =>
      this.http.post<DriveNode>(this.nodesUrl, this.nodeFor(item, parentId, opts.uploadedBy), {
        context: batchedWrite(),
      }),
    );
  }

  /** Counterpart of {@link uploadToDrive}: this writes `images` only. */
  uploadToGallery(items: MediaUploadItem[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    return this.runUploads(items, (item) =>
      this.http.post<ImageItem>(this.imagesUrl, this.imageFor(item, opts.uploadedBy), {
        context: batchedWrite(),
      }),
    );
  }

  async readAndUploadToDrive(files: File[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
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
    const { uploaded, tooLarge, duplicates, failed } = outcome;

    if (uploaded.length > 0) {
      this.snackbar.success(
        uploaded.length === 1
          ? `Uploaded "${uploaded[0]}" to the ${destination}.`
          : `Uploaded ${uploaded.length} files to the ${destination}.`,
      );
    }
    if (duplicates && duplicates.length > 0) {
      this.snackbar.error(
        `${duplicates.length} duplicate file(s) skipped (already exist in ${destination}): ` +
          duplicates.join(', '),
        'Duplicate File',
      );
    }
    if (tooLarge.length > 0) {
      this.snackbar.error(
        `${tooLarge.length} file(s) exceed the ${this.maxUploadMb}MB limit and were skipped: ` +
          tooLarge.join(', '),
        'File Too Large',
      );
    }
    if (outcome.connectionLost) {
      this.snackbar.error(
        `${failed.length} file(s) were not uploaded because the API stopped responding. ` +
          'Check that `npm run api` is still running, then retry them.',
        'Upload Interrupted',
      );
    } else if (failed.length > 0) {
      this.snackbar.error(`Failed to upload: ${failed.join(', ')}`);
    }
  }

  private async runUploads(
    items: MediaUploadItem[],
    post: (item: MediaUploadItem) => Observable<unknown>,
  ): Promise<MediaUploadOutcome> {
    this.loading.show();
    try {
      const { done, failed, pending, aborted } = await runPacedWrites(items, post);
      return {
        uploaded: done.map((item) => item.name),
        // `pending` never got attempted, but from the caller's side it is the same miss.
        failed: [...failed, ...pending].map((item) => item.name),
        tooLarge: [],
        duplicates: [],
        connectionLost: aborted,
      };
    } finally {
      this.loading.hide();
    }
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
