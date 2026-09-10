import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/pages/registry";
import type { PageId } from "@/store/useStore";

/**
 * Suspense fallback for a topic whose chunk is still loading. The header and
 * the What / Why / How context come from the eagerly-loaded registry, so the
 * page a student can already read appears immediately and only the
 * visualization area is stood in for.
 */
export function TopicSkeleton({ pageId }: { pageId: PageId }) {
  return (
    <PageShell meta={PAGES[pageId]}>
      <div className="card p-5 flex flex-col gap-3" aria-hidden>
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
      <span className="sr-only" role="status">Loading {PAGES[pageId].title}…</span>
    </PageShell>
  );
}
