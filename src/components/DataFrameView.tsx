import { motion, AnimatePresence } from "framer-motion";
import type { DataFrame, HighlightKind, HighlightMap, Column } from "@/types";
import { formatCell, isStringCol } from "@/lib/dataframe";

interface Props {
  frame: DataFrame; title?: string; badge?: string;
  highlights?: HighlightMap; note?: string;
  layoutId?: string; maxHeight?: number;
}

const HL: Record<HighlightKind, string> = {
  none: "", match: "df-hl-match", drop: "df-hl-drop", new: "df-hl-new",
  changed: "df-hl-changed", null: "df-hl-null",
  "mask-true": "df-hl-mask-true", "mask-false": "df-hl-mask-false",
  "group-a": "df-hl-group-a", "group-b": "df-hl-group-b",
  "group-c": "df-hl-group-c", "group-d": "df-hl-group-d", "group-e": "df-hl-group-e",
};

const resolve = (m: HighlightMap | undefined, r: number, c: number): HighlightKind | undefined =>
  m ? (m[`${r}:${c}`] ?? m[`${r}:*`] ?? m[`*:${c}`] ?? undefined) : undefined;

export function DataFrameView({ frame, title, badge, highlights, note, layoutId = "df", maxHeight }: Props) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {(title || badge) && (
        <div className="flex items-center gap-2 px-0.5">
          {title && <span className="text-[11px] font-mono text-fg-subtle">{title}</span>}
          {badge && <span className="chip chip-accent">{badge}</span>}
        </div>
      )}
      <div className="card overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="df-header" style={{ width: 46 }}>&nbsp;</th>
              {frame.columns.map((c) => (
                <th key={c.name} className={`df-header ${isStringCol(c) ? "df-header-str" : ""}`}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {frame.data.map((row, r) => (
                <motion.tr key={`${layoutId}-r-${frame.index[r]}-${r}`} layout
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}>
                  <td className="df-index">{frame.index[r]}</td>
                  {row.map((v, c) => {
                    const col: Column = frame.columns[c];
                    const hl = resolve(highlights, r, c);
                    return (
                      <motion.td key={`${layoutId}-${r}-${c}`} layout
                        className={`df-cell ${isStringCol(col) ? "df-cell-str" : ""} ${hl ? HL[hl] : ""}`}>
                        {formatCell(v, col.dtype)}
                      </motion.td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {note && <p className="text-[11.5px] text-fg-muted px-0.5 italic leading-relaxed">{note}</p>}
    </div>
  );
}
