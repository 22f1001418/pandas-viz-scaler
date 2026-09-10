import { motion, AnimatePresence } from "framer-motion";
import type { Column, DataFrame, HighlightKind, HighlightMap, IndexEntry } from "@/types";
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

const cls = (k: HighlightKind | undefined) => (k ? HL[k] : "");

const body = (m: HighlightMap | undefined, r: number, c: number): HighlightKind | undefined =>
  m ? (m[`${r}:${c}`] ?? m[`${r}:*`] ?? m[`*:${c}`] ?? undefined) : undefined;
const header = (m: HighlightMap | undefined, c: number): HighlightKind | undefined =>
  m ? (m[`h:${c}`] ?? m["h:*"] ?? undefined) : undefined;
const indexCell = (m: HighlightMap | undefined, r: number): HighlightKind | undefined =>
  m ? (m[`i:${r}`] ?? m["i:*"] ?? undefined) : undefined;

/** A MultiIndex row is a tuple of labels; a plain one is a single label. */
const levelsOf = (e: IndexEntry): string[] => (Array.isArray(e) ? e.map(String) : [String(e)]);
const depth = (index: IndexEntry[]): number =>
  index.reduce<number>((n, e) => Math.max(n, Array.isArray(e) ? e.length : 1), 1);

/**
 * pandas prints a MultiIndex label only when it changes, which is what makes
 * the grouping legible. Blank a level when it and every level above it repeat.
 */
function shouldPrint(index: IndexEntry[], r: number, level: number): boolean {
  if (r === 0) return true;
  const cur = levelsOf(index[r]);
  const prev = levelsOf(index[r - 1]);
  for (let l = 0; l <= level; l++) if (cur[l] !== prev[l]) return true;
  return false;
}

export function DataFrameView({ frame, title, badge, highlights, note, layoutId = "df", maxHeight }: Props) {
  const nLevels = depth(frame.index);
  const idxNames = frame.indexNames ?? [];

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {(title || badge) && (
        <div className="flex items-center gap-2 px-0.5 flex-wrap">
          {title && <span className="text-[11px] font-mono text-fg-subtle">{title}</span>}
          {badge && <span className="chip chip-accent">{badge}</span>}
        </div>
      )}
      <div className="card overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full border-collapse">
          <thead>
            {frame.columnGroups && frame.columnGroups.length > 0 && (
              <tr>
                <th className="df-header df-header-group" colSpan={nLevels}>&nbsp;</th>
                {frame.columnGroups.map((g, i) => (
                  <th key={`${g.label}-${i}`} className="df-header df-header-group" colSpan={g.span}>{g.label}</th>
                ))}
              </tr>
            )}
            <tr>
              {Array.from({ length: nLevels }, (_, l) => (
                <th key={`idx-${l}`} className="df-header df-header-index" style={{ minWidth: 46 }}>
                  {idxNames[l] ?? " "}
                </th>
              ))}
              {frame.columns.map((c, ci) => (
                <th key={`${c.name}-${ci}`}
                  className={`df-header ${isStringCol(c) ? "df-header-str" : ""} ${cls(header(highlights, ci))}`}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {frame.data.map((row, r) => {
                const labels = levelsOf(frame.index[r]);
                const ihl = cls(indexCell(highlights, r));
                return (
                  <motion.tr key={`${layoutId}-r-${labels.join("|")}-${r}`} layout
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}>
                    {Array.from({ length: nLevels }, (_, l) => (
                      <td key={`i-${l}`} className={`df-index ${l < nLevels - 1 ? "df-index-outer" : ""} ${ihl}`}>
                        {shouldPrint(frame.index, r, l) ? (labels[l] ?? "") : ""}
                      </td>
                    ))}
                    {row.map((v, c) => {
                      const col: Column = frame.columns[c];
                      return (
                        <motion.td key={`${layoutId}-${r}-${c}`} layout
                          className={`df-cell ${isStringCol(col) ? "df-cell-str" : ""} ${cls(body(highlights, r, c))}`}>
                          {formatCell(v, col.dtype)}
                        </motion.td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {note && <p className="text-[11.5px] text-fg-muted px-0.5 italic leading-relaxed">{note}</p>}
    </div>
  );
}
