import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BreadcrumbItem, DriveNode, DriveStats } from '../models/drive.model';
import { batchedWrite, runPacedWrites } from '../utils/write-pacing';

export const DRIVE_ROOT = 'root';

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/nodes`;

  getNodes(parentId: string = DRIVE_ROOT): Observable<DriveNode[]> {
    return this.http.get<DriveNode[]>(`${this.baseUrl}?parentId=${parentId}`);
  }

  getAllNodes(): Observable<DriveNode[]> {
    return this.http.get<DriveNode[]>(this.baseUrl);
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

  deleteNode(id: string): Observable<void> {
    return this.getAllNodes().pipe(
      switchMap(async (allNodes) => {
        const ids = [...this.getDescendantIds(id, allNodes), id];
        const { done } = await runPacedWrites(ids, (nodeId) =>
          this.http.delete<void>(`${this.baseUrl}/${nodeId}`, { context: batchedWrite() }),
        );

        if (done.length < ids.length) {
          throw new Error(`Deleted ${done.length} of ${ids.length} items. Please try again.`);
        }
      }),
    );
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

  getStats(): Observable<DriveStats> {
    return this.getAllNodes().pipe(
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
