import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PAGES } from "@/pages/registry";
import { neighbours } from "@/lib/routing";
import type { PageId } from "@/store/useStore";

/** Prev / next topic footer — keeps the curriculum walkable without the sidebar. */
export function TopicNav() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const { prev, next } = neighbours(page);

  return (
    <nav className="max-w-[1280px] mx-auto px-6 pb-8 pt-2 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
      <NavCard id={prev} dir="prev" onGo={setPage} />
      <NavCard id={next} dir="next" onGo={setPage} />
    </nav>
  );
}

function NavCard({ id, dir, onGo }: { id: PageId | null; dir: "prev" | "next"; onGo: (p: PageId) => void }) {
  const isNext = dir === "next";
  if (!id) return <div className="hidden sm:block" />;
  const meta = PAGES[id];

  return (
    <button
      onClick={() => onGo(id)}
      className={`card card-link px-4 py-3 flex items-center gap-3 ${isNext ? "sm:col-start-2 text-right" : ""}`}
    >
      {!isNext && <ArrowLeft size={16} className="text-fg-subtle shrink-0" />}
      <span className={`flex flex-col min-w-0 ${isNext ? "ml-auto items-end" : ""}`}>
        <span className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-fg-subtle">
          {isNext ? "Next" : "Previous"}
        </span>
        <span className="text-[13.5px] font-medium text-fg truncate">{meta.title}</span>
      </span>
      {isNext && <ArrowRight size={16} className="text-fg-subtle shrink-0" />}
    </button>
  );
}
