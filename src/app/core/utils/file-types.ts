/**
 * Maps a file to a Google Drive-style icon and colour so every view (grid,
 * table, preview) labels the same file the same way.
 */
export type FileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'archive'
  | 'code'
  | 'text'
  | 'other';

export interface FileTypeInfo {
  kind: FileKind;
  /** Lucide icon name (kebab-case), used when there is no `asset`. */
  icon: string;
  /** Artwork in `public/`, served from the site root. Preferred when present. */
  asset?: string;
  /** Google Workspace palette, applied to the Lucide fallback. */
  color: string;
  label: string;
}

/** Folder artwork, for the drive's folder rows and cards. */
export const FOLDER_ASSET = '/folder.png';

const TYPES: Record<FileKind, Omit<FileTypeInfo, 'kind'>> = {
  image: { icon: 'file-image', asset: '/image.png', color: '#ea4335', label: 'Image' },
  video: { icon: 'file-play', asset: '/video-camera.png', color: '#ea4335', label: 'Video' },
  audio: { icon: 'music', color: '#e8710a', label: 'Audio' },
  pdf: { icon: 'file-text', asset: '/pdf.png', color: '#ea4335', label: 'PDF' },
  word: { icon: 'file-text', asset: '/logo.png', color: '#4285f4', label: 'Document' },
  excel: {
    icon: 'file-spreadsheet',
    asset: '/excel-file.png',
    color: '#0f9d58',
    label: 'Spreadsheet',
  },
  powerpoint: { icon: 'presentation', color: '#f4b400', label: 'Presentation' },
  archive: { icon: 'file-archive', asset: '/zip.png', color: '#5f6368', label: 'Archive' },
  code: { icon: 'file-code', color: '#4285f4', label: 'Code' },
  text: { icon: 'file-text', asset: '/logo.png', color: '#5f6368', label: 'Text' },
  other: { icon: 'file', color: '#5f6368', label: 'File' },
};

const EXTENSIONS: Partial<Record<FileKind, string>> = {
  image: 'jpg jpeg png gif webp svg bmp ico avif',
  video: 'mp4 webm mov avi mkv m4v ogv',
  audio: 'mp3 wav ogg m4a flac aac',
  pdf: 'pdf',
  word: 'doc docx odt rtf',
  excel: 'xls xlsx csv ods',
  powerpoint: 'ppt pptx odp',
  archive: 'zip rar 7z tar gz bz2',
  text: 'txt md log',
  code: 'js ts json html css xml yml yaml py java sh',
};

const BY_EXTENSION = new Map<string, FileKind>(
  Object.entries(EXTENSIONS).flatMap(([kind, exts]) =>
    (exts as string).split(' ').map((ext) => [ext, kind as FileKind] as const),
  ),
);

/** Mime types win over the extension; both are unreliable on their own. */
function kindOf(name?: string, mimeType?: string): FileKind {
  const mime = (mimeType || '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('wordprocessing') || mime === 'application/msword') return 'word';
  if (mime.includes('spreadsheet') || mime === 'application/vnd.ms-excel') return 'excel';
  if (mime.includes('presentation') || mime === 'application/vnd.ms-powerpoint') {
    return 'powerpoint';
  }
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) return 'archive';

  const ext = (name || '').split('.').pop()?.toLowerCase() ?? '';
  return BY_EXTENSION.get(ext) ?? (mime.startsWith('text/') ? 'text' : 'other');
}

export function describeFileType(name?: string, mimeType?: string): FileTypeInfo {
  const kind = kindOf(name, mimeType);
  return { kind, ...TYPES[kind] };
}

export function isImageType(name?: string, mimeType?: string): boolean {
  return kindOf(name, mimeType) === 'image';
}

export function isVideoType(name?: string, mimeType?: string): boolean {
  return kindOf(name, mimeType) === 'video';
}
