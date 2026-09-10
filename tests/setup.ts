import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// jsdom ships neither of these, and both are load-bearing: DataFrameView's
// framer-motion layout animations measure elements, and App prefetches topic
// chunks on idle.
window.requestIdleCallback ??= ((cb: IdleRequestCallback) =>
  window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 0)) as typeof window.requestIdleCallback;
window.cancelIdleCallback ??= ((id: number) => clearTimeout(id)) as typeof window.cancelIdleCallback;
window.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(),
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
})) as typeof window.matchMedia;
window.scrollTo ??= vi.fn();
Element.prototype.scrollTo ??= vi.fn();
