import { motion } from "framer-motion";

interface Props {
  names: string[];
  months: string[];
  values: Record<string, number[]>;
  /** How many long rows exist yet. The last one flies in from its source cell. */
  emitted: number;
  /** Stagger the arrivals instead of flying only the newest row. */
  cascade?: boolean;
}

// Wide table on the left, long table on the right, one flight path between.
const W_X = 6, W_COLS = [50, 46, 46, 46], HEAD_Y = 30, HEAD_H = 22, W_ROW_H = 22, W_ROW_Y = 56;
const L_X = 322, L_COLS = [52, 56, 56], L_ROW_H = 20, L_ROW_Y = 54;

const colX = (cols: number[], x0: number, j: number) => x0 + cols.slice(0, j).reduce((a, b) => a + b, 0);
const mid = (cols: number[], x0: number, j: number) => colX(cols, x0, j) + cols[j] / 2;

/**
 * Where a melted row comes from. The instructive moment is that a column
 * *name* becomes a *value*: 'jan' leaves the header and lands in the month
 * column, and the number under it lands in the sales column. Before/after
 * frames state that; only the flight shows it.
 */
export function MeltFlow({ names, months, values, emitted, cascade = false }: Props) {
  const rows = names.length * months.length;
  const height = L_ROW_Y + rows * L_ROW_H + 26;
  // The long frame is three times as tall as the wide one; centre the wide
  // block against it so the flight paths read across, not diagonally down.
  const shift = Math.max(0, (rows * L_ROW_H - names.length * W_ROW_H) / 2);
  const headY = HEAD_Y + shift;
  const rowY = (r: number) => W_ROW_Y + shift + r * W_ROW_H;

  // Row k of the long frame, in the order pd.melt emits them.
  const source = (k: number) => ({ month: Math.floor(k / names.length), name: k % names.length });

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 560 ${height}`} role="img"
        aria-label="A column name becoming a value as a wide frame melts to long">
        <text x={W_X} y={headY - 12} fontSize="10.5" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.1">SALES_WIDE</text>
        <text x={L_X} y="16" fontSize="10.5" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.1">LONG</text>

        {/* ── Wide frame ─────────────────────────────────────────── */}
        {["rep", ...months].map((label, j) => {
          const isMonth = j > 0;
          const live = isMonth && emitted > 0 && (cascade || source(emitted - 1).month === j - 1);
          return (
            <g key={`wh-${j}`}>
              <rect x={colX(W_COLS, W_X, j)} y={headY} width={W_COLS[j] - 3} height={HEAD_H} rx="4"
                fill={live ? "var(--pink-soft)" : isMonth ? "var(--s2)" : "var(--s1)"}
                stroke={live ? "var(--pink)" : "var(--border)"} strokeWidth={live ? 1.75 : 1} />
              <text x={mid(W_COLS, W_X, j) - 1.5} y={headY + 15} textAnchor="middle" className="mono" fontSize="11"
                fill={live ? "var(--pink)" : "var(--fg-muted)"} fontWeight={isMonth ? 700 : 400}>{label}</text>
            </g>
          );
        })}

        {names.map((n, r) => (
          <g key={`wr-${r}`}>
            <rect x={colX(W_COLS, W_X, 0)} y={rowY(r)} width={W_COLS[0] - 3} height={W_ROW_H - 3} rx="4"
              fill="var(--s1)" stroke="var(--border)" />
            <text x={mid(W_COLS, W_X, 0) - 1.5} y={rowY(r) + 14} textAnchor="middle"
              className="mono" fontSize="11" fill="var(--fg-muted)">{n}</text>
            {months.map((m, c) => {
              const taken = emitted > 0 && (c * names.length + r) < emitted;
              const live = emitted > 0 && !cascade && source(emitted - 1).month === c && source(emitted - 1).name === r;
              return (
                <g key={`wc-${r}-${c}`}>
                  <rect x={colX(W_COLS, W_X, c + 1)} y={rowY(r)} width={W_COLS[c + 1] - 3} height={W_ROW_H - 3} rx="4"
                    fill={live ? "var(--accent-soft)" : taken ? "var(--s2)" : "var(--s1)"}
                    stroke={live ? "var(--accent)" : "var(--border)"} strokeWidth={live ? 1.75 : 1}
                    strokeDasharray={taken && !live ? "3 2" : undefined} />
                  <text x={mid(W_COLS, W_X, c + 1) - 1.5} y={rowY(r) + 14} textAnchor="middle"
                    className="mono" fontSize="11"
                    fill={live ? "var(--accent)" : taken ? "var(--fg-subtle)" : "var(--fg-muted)"}>{values[m][r]}</text>
                </g>
              );
            })}
          </g>
        ))}

        {/* ── Long frame ─────────────────────────────────────────── */}
        {["rep", "month", "sales"].map((label, j) => (
          <g key={`lh-${j}`}>
            <rect x={colX(L_COLS, L_X, j)} y={HEAD_Y} width={L_COLS[j] - 3} height={HEAD_H} rx="4"
              fill={j === 0 ? "var(--s1)" : "var(--s2)"} stroke="var(--border)" />
            <text x={mid(L_COLS, L_X, j) - 1.5} y={HEAD_Y + 15} textAnchor="middle" className="mono" fontSize="11"
              fill="var(--fg-muted)" fontWeight={j > 0 ? 700 : 400}>{label}</text>
          </g>
        ))}

        {Array.from({ length: rows }, (_, k) => {
          const y = L_ROW_Y + k * L_ROW_H;
          if (k >= emitted) {
            return (
              <rect key={`lp-${k}`} x={L_X} y={y} width={L_COLS.reduce((a, b) => a + b, 0) - 3} height={L_ROW_H - 3}
                rx="4" fill="none" stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
            );
          }
          const { month, name } = source(k);
          const newest = k === emitted - 1;
          const delay = cascade ? k * 0.09 : 0;

          // Each chip starts over the cell it came from and settles into place.
          const fly = (fromX: number, fromY: number, toX: number, toY: number) => ({
            initial: { x: fromX - toX, y: fromY - toY, opacity: 0 },
            animate: { x: 0, y: 0, opacity: 1 },
            transition: { type: "spring" as const, stiffness: 120, damping: 18, delay },
          });

          const monthX = mid(L_COLS, L_X, 1), salesX = mid(L_COLS, L_X, 2);
          const cy = y + 14;

          return (
            <g key={`lr-${k}`}>
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}>
                <rect x={colX(L_COLS, L_X, 0)} y={y} width={L_COLS[0] - 3} height={L_ROW_H - 3} rx="4"
                  fill="var(--s1)" stroke="var(--border)" />
                <text x={mid(L_COLS, L_X, 0) - 1.5} y={cy} textAnchor="middle" className="mono" fontSize="10.5"
                  fill="var(--fg-muted)">{names[name]}</text>
              </motion.g>

              {/* The header that became data */}
              <motion.g {...fly(mid(W_COLS, W_X, month + 1), headY + 15, monthX, cy)}>
                <rect x={colX(L_COLS, L_X, 1)} y={y} width={L_COLS[1] - 3} height={L_ROW_H - 3} rx="4"
                  fill="var(--pink-soft)" stroke="var(--pink)" strokeWidth={newest ? 1.6 : 1} />
                <text x={monthX - 1.5} y={cy} textAnchor="middle" className="mono" fontSize="10.5"
                  fill="var(--pink)">{months[month]}</text>
              </motion.g>

              {/* The cell that sat under it */}
              <motion.g {...fly(mid(W_COLS, W_X, month + 1), rowY(name) + 14, salesX, cy)}>
                <rect x={colX(L_COLS, L_X, 2)} y={y} width={L_COLS[2] - 3} height={L_ROW_H - 3} rx="4"
                  fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={newest ? 1.6 : 1} />
                <text x={salesX - 1.5} y={cy} textAnchor="middle" className="mono" fontSize="10.5"
                  fill="var(--accent)">{values[months[month]][name]}</text>
              </motion.g>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-[11.5px] text-fg-muted text-center">
        Pink is the column <span className="mono">name</span> becoming a value; indigo is the cell that sat
        under it. One wide cell → one long row.
      </figcaption>
    </figure>
  );
}
