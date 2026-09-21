/** Ctrl+A belongs to the text box while the caret is in one. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

/**
 * The Google Drive selection shortcuts, shared by every page with a select-all: Ctrl/Cmd+A
 * selects, Escape clears. Callers guard their own modals first.
 */
export function onSelectionShortcut(
  event: KeyboardEvent,
  run: { selectAll: () => void; clear: () => void },
): void {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();
  if (key === 'a' && (event.ctrlKey || event.metaKey)) {
    // Otherwise the browser selects the whole page instead.
    event.preventDefault();
    run.selectAll();
  } else if (key === 'escape') {
    run.clear();
  }
}
