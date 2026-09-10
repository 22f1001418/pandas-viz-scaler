/** True when the key event came from a field the user is typing or scrubbing in. */
export function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * True when the target already handles Space/Enter itself — letting our global
 * handler run too would toggle playback twice on one press.
 */
export function isActivatable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && ["BUTTON", "A"].includes(el.tagName);
}
