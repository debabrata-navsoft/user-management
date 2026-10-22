import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, finalize, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BreadcrumbItem, DriveNode, DriveStats } from '../models/drive.model';
import { User } from '../models/user.model';
import { PacedWriteOutcome, batchedWrite, runPacedWrites } from '../utils/write-pacing';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';

export const DRIVE_ROOT = 'root';

export type DriveOwner = Pick<User, 'email' | 'name'>;

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private loading = inject(LoadingService);
  private baseUrl = `${environment.apiUrl}/nodes`;

  getNodes(parentId: string = DRIVE_ROOT, owner?: DriveOwner): Observable<DriveNode[]> {
    return this.http.get<DriveNode[]>(this.baseUrl, { params: this.scopeFor(owner, { parentId }) });
  }

  private scopeFor(owner: DriveOwner | undefined, base: Record<string, string> = {}) {
    return owner ? this.auth.ownerScope(owner, base) : this.auth.ownedScope(base);
  }

  getAllNodes(): Observable<DriveNode[]> {
    return this.http.get<DriveNode[]>(this.baseUrl);
  }

  getVisibleNodes(owner?: DriveOwner): Observable<DriveNode[]> {
    return this.http.get<DriveNode[]>(this.baseUrl, { params: this.scopeFor(owner) });
  }

  getFilesFor(owner: DriveOwner): Observable<DriveNode[]> {
    return this.getVisibleNodes(owner).pipe(map((nodes) => nodes.filter((n) => n.type === 'file')));
  }

  getNodeById(id: string): Observable<DriveNode> {
    return this.http.get<DriveNode>(`${this.baseUrl}/${id}`);
  }

  createFolder(
    name: string,
    parentId: string = DRIVE_ROOT,
    uploadedBy: string = 'Admin',
  ): Observable<DriveNode> {
    const id = 'folder-' + Math.random().toString(36).substring(2, 9);
    const newFolder: DriveNode = {
      id,
      name: name.trim(),
      type: 'folder',
      parentId: parentId || DRIVE_ROOT,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };
    return this.http.post<DriveNode>(this.baseUrl, newFolder);
  }

  uploadFile(
    file: File,
    parentId: string = DRIVE_ROOT,
    uploadedBy: string = 'Admin',
  ): Promise<Observable<DriveNode>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || '';
        const id = 'file-' + Math.random().toString(36).substring(2, 9);
        const newFile: DriveNode = {
          id,
          name: file.name,
          type: 'file',
          parentId: parentId || DRIVE_ROOT,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          uploadedBy,
          createdAt: new Date().toISOString(),
        };
        resolve(this.http.post<DriveNode>(this.baseUrl, newFile));
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  renameNode(id: string, newName: string): Observable<DriveNode> {
    return this.http.patch<DriveNode>(`${this.baseUrl}/${id}`, {
      name: newName.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  deleteNodes(ids: string[]): Observable<PacedWriteOutcome<string>> {
    return defer(() => {
      this.loading.show();
      return this.getAllNodes().pipe(
        switchMap((allNodes) => {
          const targets = new Set(
            ids.flatMap((id) => [...this.getDescendantIds(id, allNodes), id]),
          );

          return runPacedWrites([...targets], (nodeId) =>
            this.http.delete<void>(`${this.baseUrl}/${nodeId}`, { context: batchedWrite() }),
          );
        }),
        finalize(() => this.loading.hide()),
      );
    });
  }

  getBreadcrumbs(currentFolderId: string): Observable<BreadcrumbItem[]> {
    if (!currentFolderId || currentFolderId === DRIVE_ROOT) {
      return of([{ id: DRIVE_ROOT, name: 'My Drive' }]);
    }

    return this.getAllNodes().pipe(
      map((nodes) => {
        const crumbs: BreadcrumbItem[] = [];
        let curr: string | undefined = currentFolderId;

        const nodeMap = new Map(nodes.map((n) => [n.id, n]));

        while (curr && curr !== DRIVE_ROOT) {
          const node = nodeMap.get(curr);
          if (node) {
            crumbs.unshift({ id: node.id, name: node.name });
            curr = node.parentId;
          } else {
            break;
          }
        }

        crumbs.unshift({ id: DRIVE_ROOT, name: 'My Drive' });
        return crumbs;
      }),
    );
  }

  getAllStats(): Observable<DriveStats> {
    return this.toStats(this.getAllNodes());
  }

  getStats(owner?: DriveOwner): Observable<DriveStats> {
    return this.toStats(this.getVisibleNodes(owner));
  }

  private toStats(nodes: Observable<DriveNode[]>): Observable<DriveStats> {
    return nodes.pipe(
      map((nodes) => {
        let totalFolders = 0;
        let totalFiles = 0;
        let totalSizeBytes = 0;

        for (const n of nodes) {
          if (n.type === 'folder') {
            totalFolders++;
          } else {
            totalFiles++;
            totalSizeBytes += n.size || 0;
          }
        }

        return {
          totalFolders,
          totalFiles,
          totalSizeBytes,
        };
      }),
    );
  }

  private getDescendantIds(parentId: string, allNodes: DriveNode[]): string[] {
    const directChildren = allNodes.filter((n) => n.parentId === parentId);
    let result: string[] = [];

    for (const child of directChildren) {
      result.push(child.id);
      if (child.type === 'folder') {
        result = result.concat(this.getDescendantIds(child.id, allNodes));
      }
    }

    return result;
  }
}
