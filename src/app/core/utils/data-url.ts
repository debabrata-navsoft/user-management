/**
 * Stored files are base64 `data:` URLs inside db.json, and Chrome has blocked
 * top-frame navigation to those since v60 — `window.open(dataUrl)` just lands
 * on a blank tab. Re-wrapping the bytes in a Blob and handing over an object
 * URL is same-origin, so the browser opens it normally: PDFs, text and CSV
 * render in Chrome's own viewers, and formats it cannot display (Word, Excel)
 * fall through to a download, which is the best a browser can do for them.
 */

/** Object URLs hold the whole file in memory, so they cannot leak forever. */
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
    // Truncated or malformed base64 — the caller falls back to its own UI.
    return null;
  }
}

/**
 * Opens a stored file in a new browser tab.
 *
 * Returns false if the bytes could not be decoded or the pop-up was blocked,
 * so callers can fall back rather than leaving the click doing nothing. Must be
 * invoked synchronously from a user gesture, or Chrome blocks the tab.
 */
export function openDataUrlInNewTab(dataUrl: string): boolean {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return false;

  const objectUrl = URL.createObjectURL(blob);
  // No 'noopener' in the features string: it makes window.open return null,
  // which would be indistinguishable from a blocked pop-up.
  const opened = window.open(objectUrl, '_blank');

  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    return false;
  }

  // Revoking now would race the new tab's own load of the URL.
  setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_TTL_MS);
  return true;
}
