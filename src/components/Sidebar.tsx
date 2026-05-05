import * as Icons from "lucide-react";
import { useStore } from "@/store/useStore";
import { PAGES, SECTIONS } from "@/pages/registry";

export function Sidebar() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const open = useStore((s) => s.sidebarOpen);

  return (
    <aside className={`sidebar shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${open ? "w-[252px]" : "w-0"}`}>
      <div className="flex flex-col h-full w-[252px]">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
          <div className="grid place-items-center rounded-md" style={{ width: 28, height: 28, background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 12 }}>pd</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13.5px] font-semibold" style={{ color: "var(--sidebar-fg)" }}>pandas Visualizer</span>
            <span className="text-[10.5px] tracking-wider uppercase" style={{ color: "var(--sidebar-muted)" }}>scaler</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto pb-4">
          {SECTIONS.map((sec) => (
            <div key={sec.label} className="flex flex-col">
              <div className="sb-section">{sec.label}</div>
              {sec.pages.map((id) => {
                const meta = PAGES[id];
                const Ic = (Icons[meta.icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ?? Icons.Circle;
                const active = id === page;
                return (
                  <button key={id} className={`sb-link ${active ? "sb-link--active" : ""}`} onClick={() => setPage(id)}>
                    <Ic size={14} />
                    <span className="truncate">{meta.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 text-[11px] leading-relaxed" style={{ color: "var(--sidebar-muted)", borderTop: "1px solid var(--sidebar-border)" }}>
          Built for students · v1.0
        </div>
      </div>
    </aside>
  );
}
