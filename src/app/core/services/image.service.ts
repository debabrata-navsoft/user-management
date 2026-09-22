import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImageItem, ImageUploadPreview } from '../models/image.model';
import { User } from '../models/user.model';
import { batchedWrite } from '../utils/write-pacing';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/images`;

  getImages(): Observable<ImageItem[]> {
    return this.http.get<ImageItem[]>(this.baseUrl, {
      params: this.auth.ownedScope({ _sort: 'createdAt', _order: 'desc' }),
    });
  }

  /** Every user's images, for the admin and manager dashboard totals. */
  getAllImages(): Observable<ImageItem[]> {
    return this.http.get<ImageItem[]>(this.baseUrl, {
      params: { _sort: 'createdAt', _order: 'desc' },
    });
  }

  /** One user's gallery, for an admin or manager reviewing them from the user list. */
  getImagesFor(owner: Pick<User, 'email' | 'name'>): Observable<ImageItem[]> {
    return this.http.get<ImageItem[]>(this.baseUrl, {
      params: this.auth.ownerScope(owner, { _sort: 'createdAt', _order: 'desc' }),
    });
  }

  getImageById(id: string | number): Observable<ImageItem> {
    return this.http.get<ImageItem>(`${this.baseUrl}/${id}`);
  }

  uploadImage(image: Partial<ImageItem>): Observable<ImageItem> {
    const payload: Partial<ImageItem> = {
      ...image,
      createdAt: new Date().toISOString(),
    };
    return this.http.post<ImageItem>(this.baseUrl, payload);
  }

  /** Always issued through `runPacedWrites`, which owns the retry and the reporting. */
  deleteImage(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { context: batchedWrite() });
  }

  processFileForPreview(file: File): Promise<ImageUploadPreview> {
    return new Promise((resolve) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      const maxBytes = (environment.maxUploadMb || 2) * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        resolve({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: '',
          error: `Invalid type "${file.type || 'unknown'}". Allowed: JPG, PNG, WEBP, GIF, SVG.`,
        });
        return;
      }

      if (file.size > maxBytes) {
        resolve({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: '',
          error: `File size exceeds ${environment.maxUploadMb}MB limit.`,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || '';
        const img = new Image();
        img.onload = () => {
          resolve({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
            dimensions: { width: img.naturalWidth, height: img.naturalHeight },
          });
        };
        img.onerror = () => {
          resolve({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
          });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        resolve({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: '',
          error: 'Failed to read file.',
        });
      };
      reader.readAsDataURL(file);
    });
  }
}
