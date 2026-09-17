import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DriveNode } from '../models/drive.model';
import { ImageItem } from '../models/image.model';
import { isImageType } from '../utils/file-types';
import { DRIVE_ROOT } from './drive.service';
import { SnackbarService } from './snackbar.service';

export interface MediaUploadOutcome {
  /** Names that were stored successfully. */
  uploaded: string[];
  /** Rejected before any request, because of the size ceiling. */
  tooLarge: string[];
  /** Could not be read, or the request failed; nothing was stored. */
  failed: string[];
  /** Stored, but the copy in the other collection could not be created. */
  notShared: string[];
}

export interface MediaUploadOptions {
  uploadedBy: string;
  /** Drive folder the file belongs to. Gallery uploads land at the root. */
  driveParentId?: string;
  /** Overrides `environment.maxDriveUploadMb`. */
  maxMb?: number;
}

/**
 * A file already read into a data URL.
 *
 * Uploads deliberately take these instead of `File` objects: a `File` is only
 * readable while its `<input>` still holds the selection, and the input has to
 * be reset so that picking the same file twice re-fires `change`. Reading it
 * later therefore fails. Read while the selection is live, then upload.
 */
export interface MediaUploadItem {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ReadFilesResult {
  items: MediaUploadItem[];
  /** Over the ceiling, so never read. */
  tooLarge: string[];
  /** Read failed. */
  unreadable: string[];
}

/**
 * The single upload path shared by the Gallery and the Drive.
 *
 * Every accepted file is written to the drive's `nodes`; images are additionally
 * written to `images` and cross-linked, so one upload appears in both places.
 * Requests are issued one at a time because json-server rewrites the whole of
 * db.json per write.
 */
@Injectable({
  providedIn: 'root',
})
export class MediaUploadService {
  private http = inject(HttpClient);
  private snackbar = inject(SnackbarService);
  private imagesUrl = `${environment.apiUrl}/images`;
  private nodesUrl = `${environment.apiUrl}/nodes`;

  /** Human-readable ceiling, for messages and drop-zone hints. */
  get maxUploadMb(): number {
    return environment.maxDriveUploadMb;
  }

  /**
   * Read picked files into upload items. Call this straight from the `change`
   * handler, before resetting the input, while the selection is still live.
   */
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

  async uploadShared(
    items: MediaUploadItem[],
    opts: MediaUploadOptions,
  ): Promise<MediaUploadOutcome> {
    const parentId = opts.driveParentId || DRIVE_ROOT;
    const outcome: MediaUploadOutcome = {
      uploaded: [],
      tooLarge: [],
      failed: [],
      notShared: [],
    };

    for (const item of items) {
      try {
        const node = await this.createNode(item, parentId, opts.uploadedBy);
        outcome.uploaded.push(item.name);

        if (isImageType(item.name, item.type)) {
          try {
            await this.mirrorToGallery(node);
          } catch {
            outcome.notShared.push(item.name);
          }
        }
      } catch {
        outcome.failed.push(item.name);
      }
    }

    return outcome;
  }

  /** Read then upload, for callers that start from a file input. */
  async readAndUpload(files: File[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    const read = await this.readFiles(files, opts.maxMb ?? this.maxUploadMb);
    const outcome = await this.uploadShared(read.items, opts);
    outcome.tooLarge.push(...read.tooLarge);
    outcome.failed.push(...read.unreadable);
    return outcome;
  }

  /** Turns an outcome into toasts, so both pages report uploads identically. */
  report(outcome: MediaUploadOutcome, destination = 'current folder'): void {
    const { uploaded, tooLarge, failed, notShared } = outcome;

    if (uploaded.length > 0) {
      this.snackbar.success(
        uploaded.length === 1
          ? `Uploaded "${uploaded[0]}" to the Gallery and Drive.`
          : `Uploaded ${uploaded.length} files into the ${destination}.`,
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
    if (notShared.length > 0) {
      this.snackbar.warning(
        `Saved to Drive but not shared to the Gallery: ${notShared.join(', ')}`,
      );
    }
  }

  private createNode(
    item: MediaUploadItem,
    parentId: string,
    uploadedBy: string,
  ): Promise<DriveNode> {
    const node: DriveNode = {
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
    return firstValueFrom(this.http.post<DriveNode>(this.nodesUrl, node));
  }

  private async mirrorToGallery(node: DriveNode): Promise<ImageItem> {
    const image = await firstValueFrom(
      this.http.post<ImageItem>(this.imagesUrl, {
        name: node.name,
        url: node.dataUrl,
        size: node.size || 0,
        type: node.mimeType || 'image/*',
        uploadedBy: node.uploadedBy || 'User',
        createdAt: node.createdAt,
        driveNodeId: node.id,
      }),
    );

    await firstValueFrom(
      this.http.patch<DriveNode>(`${this.nodesUrl}/${node.id}`, { galleryId: image.id }),
    );
    return image;
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
