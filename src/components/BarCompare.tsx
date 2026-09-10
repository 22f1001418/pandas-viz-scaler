import { motion } from "framer-motion";
import type { BarChart } from "@/types";

/**
 * Magnitude comparison for the performance topics — loop vs vectorized,
 * CSV vs Parquet, scan vs indexed lookup. Bars are scaled to the largest
 * value, so a 100x gap reads as a 100x gap.
 */
export function BarCompare({ title, bars, note }: BarChart) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="card p-4 flex flex-col gap-3">
      {title && <div className="text-[11px] font-semibold uppercase tracking-[.1em] text-fg-subtle">{title}</div>}
      <div className="flex flex-col gap-2.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-[12px] font-mono text-fg-muted w-[104px] shrink-0 truncate" title={b.label}>{b.label}</span>
            <div className="flex-1 min-w-0 h-[22px] rounded-md overflow-hidden" style={{ background: "var(--s2)" }}>
              <motion.div
                className={`h-full rounded-md perf-bar perf-bar--${b.tone ?? "neutral"}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((b.value / max) * 100, 1.5)}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <span className="text-[12px] font-mono text-fg w-[86px] shrink-0 text-right">
              {b.display ?? `${b.value}${b.unit ? ` ${b.unit}` : ""}`}
            </span>
          </div>
        ))}
      </div>
      {note && <p className="text-[11.5px] text-fg-muted italic leading-relaxed">{note}</p>}
    </div>
  );
}
