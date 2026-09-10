import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PAGE, PAGE_ORDER, isPageId, neighbours, pageFromHash, writeHash } from "@/lib/routing";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("isPageId", () => {
  it("accepts every topic in the curriculum", () => {
    for (const id of PAGE_ORDER) expect(isPageId(id)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const v of ["", "nope", "SELECTION", "series-vs-df/"]) expect(isPageId(v)).toBe(false);
  });
});

describe("pageFromHash", () => {
  it("reads the topic out of #/topic-id", () => {
    window.location.hash = "#/rolling";
    expect(pageFromHash()).toBe("rolling");
  });

  it("tolerates a missing slash and surrounding space", () => {
    window.location.hash = "#outliers";
    expect(pageFromHash()).toBe("outliers");
  });

  it("falls back to the first topic for junk or an empty hash", () => {
    for (const h of ["", "#/", "#/not-a-topic"]) {
      window.history.replaceState(null, "", `/${h}`);
      expect(pageFromHash()).toBe(DEFAULT_PAGE);
    }
  });
});

describe("writeHash", () => {
  it("writes #/topic-id", () => {
    writeHash("melt");
    expect(window.location.hash).toBe("#/melt");
  });

  it("replaces instead of pushing when asked", () => {
    const before = window.history.length;
    writeHash("melt", true);
    expect(window.location.hash).toBe("#/melt");
    expect(window.history.length).toBe(before);
  });

  it("is a no-op when the hash already matches", () => {
    writeHash("melt");
    const before = window.history.length;
    writeHash("melt");
    expect(window.history.length).toBe(before);
  });
});

describe("neighbours", () => {
  it("has no prev at the start and no next at the end", () => {
    expect(neighbours(PAGE_ORDER[0]).prev).toBeNull();
    expect(neighbours(PAGE_ORDER.at(-1)!).next).toBeNull();
  });

  it("walks the curriculum in both directions", () => {
    for (let i = 1; i < PAGE_ORDER.length - 1; i++) {
      const { prev, next } = neighbours(PAGE_ORDER[i]);
      expect(prev).toBe(PAGE_ORDER[i - 1]);
      expect(next).toBe(PAGE_ORDER[i + 1]);
    }
  });

  it("chains: next of prev is where you started", () => {
    for (const id of PAGE_ORDER.slice(1)) {
      expect(neighbours(neighbours(id).prev!).next).toBe(id);
    }
  });
});
