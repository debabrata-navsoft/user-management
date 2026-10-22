function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

export function onSelectionShortcut(
  event: KeyboardEvent,
  run: { selectAll: () => void; clear: () => void },
): void {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();
  if (key === 'a' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    run.selectAll();
  } else if (key === 'escape') {
    run.clear();
  }
}
