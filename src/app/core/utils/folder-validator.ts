export function isValidFolderName(name: string): { valid: boolean; error?: string } {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return { valid: false, error: 'Folder name cannot be empty.' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Folder name cannot exceed 100 characters.' };
  }

  const onlyLettersNumbersEmojiSpaces = /^[\p{L}\p{N}\p{M}\p{Extended_Pictographic}\s]+$/u;
  if (!onlyLettersNumbersEmojiSpaces.test(trimmed)) {
    return {
      valid: false,
      error:
        'Special characters are not allowed in folder names (only letters, numbers, spaces, and emojis).',
    };
  }

  const hasLetterOrNumber = /\p{L}|\p{N}/u.test(trimmed);
  const hasEmoji = /\p{Extended_Pictographic}/u.test(trimmed);

  if (!hasLetterOrNumber && !hasEmoji) {
    return {
      valid: false,
      error: 'Folder name must contain at least one letter, number, or emoji character.',
    };
  }

  return { valid: true };
}
