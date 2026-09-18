import { isValidFolderName } from './folder-validator';

describe('isValidFolderName', () => {
  it('rejects empty or whitespace-only folder names', () => {
    expect(isValidFolderName('').valid).toBe(false);
    expect(isValidFolderName('   ').valid).toBe(false);
    expect(isValidFolderName('   ').error).toBe('Folder name cannot be empty.');
  });

  it('rejects names exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const res = isValidFolderName(longName);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Folder name cannot exceed 100 characters.');
  });

  it('rejects all special characters including symbols, punctuation, quotes, tildes, backticks', () => {
    const invalidNames = [
      'Test````',
      'sdfdsf~~~~~~',
      'Project~1',
      '`Secret`',
      'Folder ~ Draft',
      'folder/name',
      'folder\\name',
      'name:test',
      'test*file',
      'what?',
      '"quote"',
      '<tag>',
      'pipe|test',
      '......',
      '------',
      '$$$$$',
      '@@@@',
      '!@#$%^&()_+',
      '- _ .',
      'Project-Alpha',
      'Reports (Q1)',
      '100% Complete',
      'Sales & Marketing',
      'New #1',
    ];
    for (const name of invalidNames) {
      const res = isValidFolderName(name);
      expect(res.valid).toBe(false);
      expect(res.error).toBe(
        'Special characters are not allowed in folder names (only letters, numbers, spaces, and emojis).',
      );
    }
  });

  it('accepts clean alphanumeric names and spaces', () => {
    const validNames = [
      'Invoices 2026',
      'Debu',
      '4545',
      'New Folder',
      'Project Alpha',
      'Quarter 1 Reports',
      'Engineering Team Docs',
    ];
    for (const name of validNames) {
      const res = isValidFolderName(name);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    }
  });

  it('accepts emojis in folder names', () => {
    const emojiNames = [
      '📁 Documents',
      '🚀 Project Launch',
      '🔥 Hot Deals',
      '🎉',
      '📸 Photos 2026',
      '💡 Ideas and Notes',
    ];
    for (const name of emojiNames) {
      const res = isValidFolderName(name);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    }
  });

  it('accepts non-Latin unicode alphabet characters and numbers', () => {
    const unicodeNames = ['文件夹', 'مستندات', 'दस्तावेज़', 'Документы', '日本語フォルダ 2026'];
    for (const name of unicodeNames) {
      const res = isValidFolderName(name);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    }
  });
});
