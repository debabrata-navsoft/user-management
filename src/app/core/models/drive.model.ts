export type DriveNodeType = 'folder' | 'file';

export interface DriveNode {
  id: string;
  name: string;
  type: DriveNodeType;
  parentId: string; 
  size?: number; 
  mimeType?: string; 
  dataUrl?: string; 
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
