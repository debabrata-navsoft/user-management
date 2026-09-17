export interface ImageItem {
  id: string | number;
  name: string;
  url: string; 
  size: number; 
  type: string;
  dimensions?: { width: number; height: number };
  uploadedBy: string;
  createdAt: string;
  tags?: string[];
  description?: string;
}

export interface ImageUploadPreview {
  file: File;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  dimensions?: { width: number; height: number };
  error?: string;
}
