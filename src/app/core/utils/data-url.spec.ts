import { dataUrlToBlob, openDataUrlInNewTab } from './data-url';

const base64Of = (text: string, mime = 'application/pdf') => `data:${mime};base64,${btoa(text)}`;

describe('dataUrlToBlob', () => {
  it('keeps the mime type, so Chrome picks the right viewer', async () => {
    const blob = dataUrlToBlob(base64Of('%PDF-1.4 hello'));

    expect(blob?.type).toBe('application/pdf');
    expect(await blob?.text()).toBe('%PDF-1.4 hello');
  });

  it('decodes a plain (non-base64) data URL', async () => {
    const blob = dataUrlToBlob('data:text/plain,hello%20world');

    expect(blob?.type).toBe('text/plain');
    expect(await blob?.text()).toBe('hello world');
  });

  it('falls back to a binary type when the URL declares none', () => {
    expect(dataUrlToBlob('data:;base64,QUJD')?.type).toBe('application/octet-stream');
  });

  it('returns null for something that is not a data URL', () => {
    expect(dataUrlToBlob('https://example.com/a.pdf')).toBeNull();
    expect(dataUrlToBlob('')).toBeNull();
  });

  it('returns null for truncated base64 rather than throwing', () => {
    expect(dataUrlToBlob('data:application/pdf;base64,!!!not-base64!!!')).toBeNull();
  });
});

describe('openDataUrlInNewTab', () => {
  const originalOpen = window.open;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  let opened: string[];
  let revoked: string[];

  beforeEach(() => {
    opened = [];
    revoked = [];
    URL.createObjectURL = () => 'blob:mock/1';
    URL.revokeObjectURL = (url: string) => void revoked.push(url);
  });

  afterEach(() => {
    window.open = originalOpen;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('opens an object URL, never the data URL Chrome would block', () => {
    window.open = ((url: string) => {
      opened.push(url);
      return {} as Window;
    }) as typeof window.open;

    expect(openDataUrlInNewTab(base64Of('doc'))).toBe(true);
    expect(opened).toEqual(['blob:mock/1']);
    expect(revoked).toEqual([]);
  });

  it('reports a blocked pop-up and releases the object URL', () => {
    window.open = (() => null) as typeof window.open;

    expect(openDataUrlInNewTab(base64Of('doc'))).toBe(false);
    expect(revoked).toEqual(['blob:mock/1']);
  });

  it('does not open a tab for bytes it cannot decode', () => {
    window.open = ((url: string) => {
      opened.push(url);
      return {} as Window;
    }) as typeof window.open;

    expect(openDataUrlInNewTab('not-a-data-url')).toBe(false);
    expect(opened).toEqual([]);
  });
});
