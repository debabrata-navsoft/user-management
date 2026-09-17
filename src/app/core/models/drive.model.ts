export type DriveNodeType = 'folder' | 'file';

export interface DriveNode {
  id: string;
  name: string;
  type: DriveNodeType;
  parentId: string; // 'root' or folder ID
  size?: number; // for files
  mimeType?: string; // for files
  dataUrl?: string; // for file content/preview
  uploadedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface DriveStats {
  totalFolders: number;
  totalFiles: number;
  totalSizeBytes: number;
}
