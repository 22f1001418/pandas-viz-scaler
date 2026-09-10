import { describe, expect, it } from "vitest";
import { PAGES, SECTIONS } from "@/pages/registry";
import { PAGE_ORDER } from "@/lib/routing";
import { IMPLEMENTED, isImplemented } from "@/pages";
import { hasTopicIcon } from "@/lib/icons";
import type { PageId } from "@/store/useStore";

const ids = Object.keys(PAGES) as PageId[];

describe("topic registry", () => {
  it("covers all 44 topics", () => {
    expect(ids).toHaveLength(44);
  });

  it("places every topic in exactly one section", () => {
    const placed = SECTIONS.flatMap((s) => s.pages);
    expect([...placed].sort()).toEqual([...ids].sort());
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("keys every entry by its own id", () => {
    for (const id of ids) expect(PAGES[id].id).toBe(id);
  });

  it("gives every topic a title, blurb and What/Why/How", () => {
    for (const id of ids) {
      const { title, blurb, context } = PAGES[id];
      expect(title.trim(), id).not.toBe("");
      expect(blurb.trim(), id).not.toBe("");
      for (const key of ["what", "why", "how"] as const) {
        expect(context[key].trim().length, `${id}.${key}`).toBeGreaterThan(20);
      }
    }
  });

  // topicIcon falls back to Sparkles for an unknown name, so a topic added to
  // the registry with an icon nobody imported degrades silently in the UI.
  it("has a real icon import for every registry icon name", () => {
    const missing = ids.filter((id) => !hasTopicIcon(PAGES[id].icon));
    expect(missing, "add these to src/lib/icons.ts").toEqual([]);
  });

  it("marks every topic implemented, matching the sidebar count", () => {
    expect(ids.filter(isImplemented)).toHaveLength(44);
    expect(Object.keys(IMPLEMENTED).sort()).toEqual([...ids].sort());
  });

  it("orders PAGE_ORDER by section, with no gaps", () => {
    expect(PAGE_ORDER).toEqual(SECTIONS.flatMap((s) => s.pages));
    expect(PAGE_ORDER).toHaveLength(44);
  });
});
