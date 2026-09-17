import { FOLDER_ASSET, describeFileType, isImageType, isVideoType } from './file-types';

describe('describeFileType', () => {
  it('classifies images as red', () => {
    expect(describeFileType('photo.jpg').kind).toBe('image');
    expect(describeFileType('photo.jpg').color).toBe('#ea4335');
    expect(describeFileType('logo.PNG').kind).toBe('image');
  });

  it('classifies office documents with the Workspace palette', () => {
    expect(describeFileType('report.docx').kind).toBe('word');
    expect(describeFileType('report.docx').color).toBe('#4285f4');
    expect(describeFileType('budget.xlsx').kind).toBe('excel');
    expect(describeFileType('budget.xlsx').color).toBe('#0f9d58');
    expect(describeFileType('deck.pptx').kind).toBe('powerpoint');
    expect(describeFileType('notes.pdf').kind).toBe('pdf');
  });

  it('classifies archives and video', () => {
    expect(describeFileType('bundle.zip').kind).toBe('archive');
    expect(describeFileType('archive.tar.gz').kind).toBe('archive');
    expect(describeFileType('clip.mp4').kind).toBe('video');
    expect(describeFileType('song.mp3').kind).toBe('audio');
  });

  it('prefers the mime type over a misleading extension', () => {
    expect(describeFileType('screenshot.zip', 'image/png').kind).toBe('image');
    expect(describeFileType('movie.txt', 'video/mp4').kind).toBe('video');
  });

  it('falls back to a neutral file icon', () => {
    expect(describeFileType('mystery.qqq').kind).toBe('other');
    expect(describeFileType(undefined, undefined).kind).toBe('other');
    expect(describeFileType('noextension').icon).toBe('file');
  });

  it('points the supplied types at the artwork in public/', () => {
    expect(describeFileType('photo.jpg').asset).toBe('/image.png');
    expect(describeFileType('notes.pdf').asset).toBe('/pdf.png');
    expect(describeFileType('report.docx').asset).toBe('/logo.png');
    expect(describeFileType('budget.xlsx').asset).toBe('/excel-file.png');
    expect(describeFileType('bundle.zip').asset).toBe('/zip.png');
    expect(describeFileType('clip.mp4').asset).toBe('/video-camera.png');
    expect(FOLDER_ASSET).toBe('/folder.png');
  });

  it('leaves types without artwork on the lucide fallback', () => {
    expect(describeFileType('deck.pptx').asset).toBeUndefined();
    expect(describeFileType('song.mp3').asset).toBeUndefined();
    expect(describeFileType('main.ts').asset).toBeUndefined();
    expect(describeFileType('mystery.qqq').asset).toBeUndefined();
    // …but they still carry a glyph and a colour.
    expect(describeFileType('deck.pptx').icon).toBe('presentation');
    expect(describeFileType('deck.pptx').color).toBe('#f4b400');
  });

  it('exposes image and video helpers used by the drive lightbox', () => {
    expect(isImageType('a.webp')).toBe(true);
    expect(isImageType('a.mp4')).toBe(false);
    expect(isVideoType('a.mov')).toBe(true);
    expect(isVideoType(undefined, 'video/webm')).toBe(true);
    expect(isVideoType('a.pdf')).toBe(false);
  });
});
