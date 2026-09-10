import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { useStore } from "@/store/useStore";
import { PAGES, SECTIONS } from "@/pages/registry";
import { isImplemented } from "@/pages";
import { PAGE_ORDER } from "@/lib/routing";
import type { PageId } from "@/store/useStore";

const matches = (id: PageId, q: string): boolean => {
  const m = PAGES[id];
  return `${m.title} ${m.blurb} ${m.section}`.toLowerCase().includes(q);
};

export function Sidebar() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const open = useStore((s) => s.sidebarOpen);
  const searchFocusToken = useStore((s) => s.searchFocusToken);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Deep links land on topics far down the list — bring the active one into view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [page]);

  // `/` anywhere in the app focuses the filter.
  useEffect(() => {
    if (searchFocusToken > 0) inputRef.current?.focus();
  }, [searchFocusToken]);

  const q = query.trim().toLowerCase();
  const sections = useMemo(
    () =>
      SECTIONS.map((sec) => ({ ...sec, pages: q ? sec.pages.filter((id) => matches(id, q)) : sec.pages }))
        .filter((sec) => sec.pages.length > 0),
    [q],
  );

  const built = PAGE_ORDER.filter(isImplemented).length;

  return (
    <aside className={`sidebar shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${open ? "w-[252px]" : "w-0"}`}>
      <div className="flex flex-col h-full w-[252px]">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
          <div className="grid place-items-center rounded-md" style={{ width: 28, height: 28, background: "var(--accent)", color: "var(--accent-fg)", fontWeight: 800, fontSize: 12 }}>pd</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13.5px] font-semibold" style={{ color: "var(--sidebar-fg)" }}>pandas Visualizer</span>
            <span className="text-[10.5px] tracking-wider uppercase" style={{ color: "var(--sidebar-muted)" }}>scaler</span>
          </div>
        </div>

        <div className="px-3 pb-2 pt-1">
          <div className="sb-search">
            <Icons.Search size={13} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setQuery(""); e.currentTarget.blur(); }
                if (e.key === "Enter" && sections[0]?.pages[0]) { setPage(sections[0].pages[0]); e.currentTarget.blur(); }
              }}
              placeholder="Search topics…"
              aria-label="Search topics"
              spellCheck={false}
            />
            {query
              ? <button className="sb-search__clear" onClick={() => setQuery("")} aria-label="Clear search"><Icons.X size={12} /></button>
              : <kbd className="sb-kbd">/</kbd>}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-4">
          {sections.map((sec) => (
            <div key={sec.label} className="flex flex-col">
              <div className="sb-section">{sec.label}</div>
              {sec.pages.map((id) => {
                const meta = PAGES[id];
                const Ic = (Icons[meta.icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ?? Icons.Circle;
                const active = id === page;
                const done = isImplemented(id);
                return (
                  <button key={id} ref={active ? activeRef : undefined}
                    className={`sb-link ${active ? "sb-link--active" : ""}`} onClick={() => setPage(id)}>
                    <Ic size={14} className="shrink-0" />
                    <span className="truncate">{meta.title}</span>
                    <span
                      className={`sb-dot ${done ? "sb-dot--done" : ""}`}
                      title={done ? "Interactive visualization ready" : "Context only — visualization in progress"}
                    />
                  </button>
                );
              })}
            </div>
          ))}
          {sections.length === 0 && (
            <p className="px-4 py-6 text-[12px]" style={{ color: "var(--sidebar-muted)" }}>
              No topic matches “{query}”.
            </p>
          )}
        </nav>

        <div className="px-4 py-3 text-[11px] leading-relaxed" style={{ color: "var(--sidebar-muted)", borderTop: "1px solid var(--sidebar-border)" }}>
          {built} of {PAGE_ORDER.length} topics visualized
        </div>
      </div>
    </aside>
  );
}
