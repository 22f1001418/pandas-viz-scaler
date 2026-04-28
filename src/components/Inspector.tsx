import { motion, AnimatePresence } from "framer-motion";
import { Info, ChevronRight } from "lucide-react";
import type { VariableSnapshot } from "@/types";

interface Props { variables?: VariableSnapshot[]; explain?: string; stepLabel?: string; }

export function Inspector({ variables, explain, stepLabel }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-3 min-h-[180px]">
      <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
        <Info size={14} className="text-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Inspector</span>
        {stepLabel && <span className="ml-auto chip chip-accent">{stepLabel}</span>}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={stepLabel ?? "d"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .18 }} className="flex flex-col gap-3">
          {explain && <p className="text-[13px] leading-relaxed text-fg">{explain}</p>}
          {variables && variables.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[10.5px] font-semibold uppercase tracking-[.1em] text-fg-subtle">Variables</div>
              <div className="flex flex-col gap-1.5">
                {variables.map((v) => (
                  <div key={v.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-s2 border" style={{ borderColor: "var(--border)" }}>
                    <ChevronRight size={12} className="text-fg-subtle" />
                    <span className="font-mono text-[12px] font-semibold text-pink">{v.name}</span>
                    <span className="font-mono text-[10.5px] text-fg-subtle">{v.type}</span>
                    <span className="ml-auto font-mono text-[11.5px] text-fg truncate">{v.preview}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
