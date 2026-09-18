const OBJECT_URL_TTL_MS = 60_000;

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;

  const [, mimeType, base64, payload] = match;
  const type = mimeType || 'application/octet-stream';

  try {
    if (!base64) {
      return new Blob([decodeURIComponent(payload)], { type });
    }

    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  } catch {
    return null;
  }
}

export function openDataUrlInNewTab(dataUrl: string): boolean {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return false;

  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, '_blank');

  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    return false;
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_TTL_MS);
  return true;
}
