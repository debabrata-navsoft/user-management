/**
 * Checks if a string contains at least one alphanumeric character (a-z, A-Z, 0-9)
 * or any valid Unicode letter/number (including non-Latin alphabets like Chinese, Arabic, Hindi, etc.)
 * or any Unicode emoji character (\p{Extended_Pictographic}).
 *
 * This prevents pure junk / noise names composed only of repeated punctuation / symbols
 * such as "```````~~~~~~~", ".....", "---", "$#@#$", etc., while permitting
 * normal folder names with special characters (e.g. "Project 2026 (v1.0)", "Q&A - Sales")
 * as well as emoji-based folder names (e.g. "📁 Documents", "🚀 Releases").
 */
export function isValidFolderName(name: string): { valid: boolean; error?: string } {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return { valid: false, error: 'Folder name cannot be empty.' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Folder name cannot exceed 100 characters.' };
  }

  // Only allow letters (\p{L}), numbers (\p{N}), marks (\p{M}), emojis (\p{Extended_Pictographic}), and spaces.
  // No special characters allowed.
  const onlyLettersNumbersEmojiSpaces = /^[\p{L}\p{N}\p{M}\p{Extended_Pictographic}\s]+$/u;
  if (!onlyLettersNumbersEmojiSpaces.test(trimmed)) {
    return {
      valid: false,
      error:
        'Special characters are not allowed in folder names (only letters, numbers, spaces, and emojis).',
    };
  }

  // Must contain at least one alphanumeric letter/number OR emoji
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
