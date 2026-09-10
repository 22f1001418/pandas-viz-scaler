import { useEffect, useRef, useState } from "react";
import { Menu, ExternalLink, Sun, Moon, Keyboard, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PAGES } from "@/pages/registry";
import { neighbours } from "@/lib/routing";

const SHORTCUTS: Array<[string, string]> = [
  ["←  →", "Previous / next step"],
  ["Space", "Play or pause"],
  ["R", "Restart from step 1"],
  ["[  ]", "Previous / next topic"],
  ["/", "Search topics"],
  ["T", "Toggle theme"],
];

export function TopBar() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const meta = PAGES[page];
  const { prev, next } = neighbours(page);

  return (
    <header className="h-12 shrink-0 border-b flex items-center px-3 gap-2" style={{ borderColor: "var(--border)", background: "var(--s1)" }}>
      <button className="btn btn-ghost" onClick={toggleSidebar} aria-label="Toggle sidebar"><Menu size={16} /></button>
      <div className="flex items-center gap-2 text-[13px] text-fg-muted min-w-0">
        <span className="chip chip-accent">{meta.section}</span>
        <span className="text-fg-subtle">/</span>
        <span className="truncate text-fg font-medium">{meta.title}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button className="btn btn-ghost" onClick={() => prev && setPage(prev)} disabled={!prev} aria-label="Previous topic"><ChevronLeft size={16} /></button>
        <button className="btn btn-ghost" onClick={() => next && setPage(next)} disabled={!next} aria-label="Next topic"><ChevronRight size={16} /></button>
        <ShortcutsButton />
        <button className="btn btn-ghost" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <a className="btn btn-ghost hidden sm:inline-flex" href="https://pandas.pydata.org/docs/" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Docs</a>
      </div>
    </header>
  );
}

function ShortcutsButton() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={wrap}>
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)} aria-label="Keyboard shortcuts" aria-expanded={open}>
        <Keyboard size={16} />
      </button>
      {open && (
        <div className="card absolute right-0 top-full mt-1.5 z-30 p-3 w-[228px] flex flex-col gap-1.5 shadow-lg">
          <div className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-fg-subtle pb-1">Shortcuts</div>
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys} className="flex items-center gap-2 text-[12px]">
              <kbd className="kbd">{keys}</kbd>
              <span className="text-fg-muted">{what}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
