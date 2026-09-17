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
  uploaded: string[];
  tooLarge: string[];
  failed: string[];
  notShared: string[];
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

  async readAndUpload(files: File[], opts: MediaUploadOptions): Promise<MediaUploadOutcome> {
    const read = await this.readFiles(files, opts.maxMb ?? this.maxUploadMb);
    const outcome = await this.uploadShared(read.items, opts);
    outcome.tooLarge.push(...read.tooLarge);
    outcome.failed.push(...read.unreadable);
    return outcome;
  }

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
