import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/pages/registry";
import type { PageId } from "@/store/useStore";
import { Construction } from "lucide-react";

export function StubPage({ pageId }: { pageId: PageId }) {
  const meta = PAGES[pageId];
  return (
    <PageShell meta={meta}>
      <div className="card p-8 flex flex-col items-center gap-4 text-center">
        <Construction size={40} className="text-amber" />
        <h2 className="text-lg font-semibold text-fg">Visualization in progress</h2>
        <p className="text-sm text-fg-muted max-w-md">
          The interactive visualization for <strong>{meta.title}</strong> is being built.
          The What / Why / How context above covers the concept. Check back soon for the step-by-step animation.
        </p>
      </div>
    </PageShell>
  );
}
