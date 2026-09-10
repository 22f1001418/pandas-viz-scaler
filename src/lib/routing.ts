import { SECTIONS } from "@/pages/registry";
import type { PageId } from "@/store/useStore";

/** Every topic id in sidebar order — the canonical curriculum sequence. */
export const PAGE_ORDER: PageId[] = SECTIONS.flatMap((s) => s.pages);

const VALID = new Set<string>(PAGE_ORDER);

export const DEFAULT_PAGE: PageId = PAGE_ORDER[0];

export function isPageId(v: string): v is PageId {
  return VALID.has(v);
}

/** Read the current topic from `#/topic-id`. Falls back to the first topic. */
export function pageFromHash(): PageId {
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  return isPageId(raw) ? raw : DEFAULT_PAGE;
}

/** Write the topic to the URL without adding a history entry per keystroke. */
export function writeHash(p: PageId, replace = false): void {
  const next = `#/${p}`;
  if (window.location.hash === next) return;
  if (replace) window.history.replaceState(null, "", next);
  else window.location.hash = next;
}

/** Neighbouring topics in curriculum order (null at the ends). */
export function neighbours(p: PageId): { prev: PageId | null; next: PageId | null } {
  const i = PAGE_ORDER.indexOf(p);
  return {
    prev: i > 0 ? PAGE_ORDER[i - 1] : null,
    next: i >= 0 && i < PAGE_ORDER.length - 1 ? PAGE_ORDER[i + 1] : null,
  };
}
