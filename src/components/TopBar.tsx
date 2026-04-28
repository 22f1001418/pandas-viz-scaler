import { Menu, Moon, Sun, ExternalLink } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PAGES } from "@/pages/registry";

export function TopBar() {
  const page = useStore((s) => s.page);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const meta = PAGES[page];

  return (
    <header className="h-12 shrink-0 border-b flex items-center px-3 gap-3" style={{ borderColor: "var(--border)", background: "var(--s1)" }}>
      <button className="btn btn-ghost" onClick={toggleSidebar} aria-label="Toggle sidebar"><Menu size={16} /></button>
      <div className="flex items-center gap-2 text-[13px] text-fg-muted min-w-0">
        <span className="chip chip-accent">pandas</span>
        <span className="text-fg-subtle">/</span>
        <span className="truncate text-fg font-medium">{meta.title}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <a className="btn btn-ghost hidden sm:inline-flex" href="https://pandas.pydata.org/docs/" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Docs</a>
        <button className="btn btn-ghost" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
