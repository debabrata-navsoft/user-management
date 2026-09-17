export interface ImageItem {
  id: string | number;
  name: string;
  url: string; // Base64 or URL
  size: number; // in bytes
  type: string;
  dimensions?: { width: number; height: number };
  uploadedBy: string;
  createdAt: string;
  tags?: string[];
  description?: string;
  /** Id of the mirrored drive node, when this image was shared to both. */
  driveNodeId?: string;
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
