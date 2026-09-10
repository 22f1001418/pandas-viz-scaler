import { motion, AnimatePresence } from "framer-motion";
import type { DataFrame, HighlightKind, HighlightMap } from "@/types";
import { formatCell, isStringCol } from "@/lib/dataframe";

interface Props {
  frame: DataFrame; title?: string; badge?: string;
  highlights?: HighlightMap; note?: string;
  layoutId?: string; maxHeight?: number;
}

const HL: Record<HighlightKind, string> = {
  none: "", match: "df-hl-match", drop: "df-hl-drop", new: "df-hl-new",
  changed: "df-hl-changed", null: "df-hl-null", window: "df-hl-window",
  "mask-true": "df-hl-mask-true", "mask-false": "df-hl-mask-false",
  "group-a": "df-hl-group-a", "group-b": "df-hl-group-b",
  "group-c": "df-hl-group-c", "group-d": "df-hl-group-d", "group-e": "df-hl-group-e",
};

/**
 * A Series is not a one-column table — it has no column header, and it prints
 * a `Name: …, dtype: …` footer. Drawing that difference is the whole point of
 * the Series-vs-DataFrame lesson, so it gets its own renderer.
 */
export function SeriesView({ frame, title, badge, highlights, note, layoutId = "sr", maxHeight }: Props) {
  const col = frame.columns[0];
  if (!col) return null;
  const str = isStringCol(col);

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {(title || badge) && (
        <div className="flex items-center gap-2 px-0.5 flex-wrap">
          {title && <span className="text-[11px] font-mono text-fg-subtle">{title}</span>}
          {badge && <span className="chip chip-pink">{badge}</span>}
        </div>
      )}
      <div className="card sr-card overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="border-collapse">
          <tbody>
            <AnimatePresence initial={false}>
              {frame.data.map((row, r) => {
                const hl = highlights?.[`${r}:0`] ?? highlights?.[`${r}:*`] ?? highlights?.["*:0"];
                return (
                  <motion.tr key={`${layoutId}-${String(frame.index[r])}-${r}`} layout
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}>
                    <td className="df-index sr-index">{String(frame.index[r])}</td>
                    <td className={`df-cell sr-value ${str ? "df-cell-str" : ""} ${hl ? HL[hl] : ""}`}>
                      {formatCell(row[0], col.dtype)}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        <div className="sr-footer">
          {col.name ? `Name: ${col.name}, ` : ""}dtype: {col.dtype}
        </div>
      </div>
      {note && <p className="text-[11.5px] text-fg-muted px-0.5 italic leading-relaxed">{note}</p>}
    </div>
  );
}
