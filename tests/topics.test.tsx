import { Suspense } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IMPLEMENTED } from "@/pages";
import { PAGES } from "@/pages/registry";
import { PAGE_ORDER } from "@/lib/routing";
import type { PageId } from "@/store/useStore";

/**
 * The checked-in version of the smoke test that used to be re-typed into a
 * browser console each time: mount all 44 topics and prove each one resolves
 * its lazy chunk, renders its own header, and draws real step content. It
 * catches an export renamed out from under `src/pages/index.ts` — a mistake
 * TypeScript cannot see through a dynamic import.
 */
async function mountTopic(id: PageId) {
  const Cmp = IMPLEMENTED[id]!;
  const view = render(
    <Suspense fallback={<div data-testid="pending" />}>
      <Cmp />
    </Suspense>,
  );
  await waitFor(() => expect(screen.queryByTestId("pending")).not.toBeInTheDocument());
  return view;
}

describe("every topic renders", () => {
  it("has a lazy component registered for all 44 topics", () => {
    expect(PAGE_ORDER.filter((id) => IMPLEMENTED[id])).toHaveLength(44);
  });

  it.each(PAGE_ORDER)("%s", async (id) => {
    const meta = PAGES[id];
    const { container } = await mountTopic(id);

    // Its own header, not a neighbour's and not the stub.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(meta.title);
    expect(screen.queryByText(/Visualization in progress/)).not.toBeInTheDocument();

    // The What / Why / How context from the registry.
    for (const label of ["What", "Why", "How"]) {
      expect(within(container).getByText(label)).toBeInTheDocument();
    }

    // Real step content: a code cell plus at least one rendered frame or diagram.
    expect(container.querySelector("pre, code")).toBeTruthy();
    expect(container.querySelector("table, svg")).toBeTruthy();
    expect(container.querySelectorAll("*").length).toBeGreaterThan(80);
  });
});
