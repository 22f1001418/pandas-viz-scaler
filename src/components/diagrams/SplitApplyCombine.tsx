export interface SacGroup {
  key: string;
  /** Group colour slot: a-e, matching the --grp-* variables. */
  tone: string;
  rows: number;
  agg: string;
}

interface Props {
  /** Row stripes in source order, each carrying its group's tone. */
  rowTones?: string[];
  /** Buckets in result order. */
  groups?: SacGroup[];
  aggLabel?: string;
}

const DEFAULT_ROWS = ["a", "b", "a", "c", "b", "a"];
const DEFAULT_GROUPS: SacGroup[] = [
  { key: "Tea", tone: "a", rows: 3, agg: "268" },
  { key: "Coffee", tone: "b", rows: 2, agg: "310" },
  { key: "Juice", tone: "c", rows: 1, agg: "190" },
];

const fill = (t: string) => `var(--grp-${t}-soft)`;
const line = (t: string) => `var(--grp-${t})`;

const ROW_H = 20;
const ROW_GAP = 4;
const BOX_PAD = 12;
const BUCKET_GAP = 14;

/** The three-beat story behind every groupby call. */
export function SplitApplyCombine({ rowTones = DEFAULT_ROWS, groups = DEFAULT_GROUPS, aggLabel = "mean" }: Props) {
  // Lay buckets out by cumulative height so any group sizes fit without overlap.
  let cursor = 26;
  const placed = [];
  for (const g of groups) {
    const h = g.rows * (ROW_H - 4) + BOX_PAD * 2;
    placed.push({ ...g, y: cursor, h });
    cursor += h + BUCKET_GAP;
  }

  const srcH = rowTones.length * (ROW_H + ROW_GAP);
  const height = Math.max(cursor + 24, srcH + 66);
  const srcTop = 26 + Math.max(0, (cursor - 26 - srcH) / 2);
  const resTop = 26 + Math.max(0, (cursor - 26 - groups.length * (ROW_H + ROW_GAP)) / 2);

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 620 ${height}`} role="img" aria-label="split, apply, combine">
        <text x="58" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.2">SPLIT</text>
        <text x="300" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.2">APPLY</text>
        <text x="540" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.2">COMBINE</text>

        {/* Source frame: one stripe per row, coloured by its group key */}
        {rowTones.map((t, i) => (
          <rect key={i} x="14" y={srcTop + i * (ROW_H + ROW_GAP)} width="88" height={ROW_H} rx="4"
            fill={fill(t)} stroke={line(t)} strokeWidth="1" />
        ))}
        <text x="58" y={srcTop + srcH + 14} textAnchor="middle" className="mono" fontSize="10.5" fill="var(--fg-subtle)">df</text>

        {placed.map((g, gi) => {
          const mid = g.y + g.h / 2;
          const resY = resTop + gi * (ROW_H + ROW_GAP);
          return (
            <g key={g.key}>
              {/* Split: rows fan out into one bucket per key */}
              <path d={`M104 ${srcTop + srcH / 2} C 140 ${srcTop + srcH / 2}, 140 ${mid}, 172 ${mid}`}
                fill="none" stroke="var(--border-strong)" strokeWidth="1.25" />
              <rect x="174" y={g.y} width="122" height={g.h} rx="6"
                fill={fill(g.tone)} stroke={line(g.tone)} strokeWidth="1.25" />
              <text x="184" y={g.y + 16} className="mono" fontSize="11" fill={line(g.tone)}>{g.key}</text>
              <text x="286" y={g.y + 16} textAnchor="end" className="mono" fontSize="9.5" fill={line(g.tone)}>
                {g.rows} {g.rows === 1 ? "row" : "rows"}
              </text>

              {/* Apply: each bucket collapses to one aggregate */}
              <path d={`M300 ${mid} L 346 ${mid}`} fill="none" stroke="var(--border-strong)" strokeWidth="1.25"
                markerEnd="url(#sac-arrow)" />
              <text x="323" y={mid - 6} textAnchor="middle" className="mono" fontSize="9.5" fill="var(--fg-subtle)">{aggLabel}</text>

              <rect x="354" y={mid - 13} width="62" height="26" rx="5"
                fill={fill(g.tone)} stroke={line(g.tone)} strokeWidth="1.25" />
              <text x="385" y={mid + 5} textAnchor="middle" className="mono" fontSize="11" fill={line(g.tone)}>{g.agg}</text>

              {/* Combine: aggregates stack back into one frame */}
              <path d={`M418 ${mid} C 452 ${mid}, 456 ${resY + ROW_H / 2}, 476 ${resY + ROW_H / 2}`}
                fill="none" stroke="var(--border-strong)" strokeWidth="1.25" />
              <rect x="478" y={resY} width="126" height={ROW_H} rx="4"
                fill={fill(g.tone)} stroke={line(g.tone)} strokeWidth="1" />
              <text x="488" y={resY + 14} className="mono" fontSize="10.5" fill={line(g.tone)}>{g.key}</text>
              <text x="594" y={resY + 14} textAnchor="end" className="mono" fontSize="10.5" fill={line(g.tone)}>{g.agg}</text>
            </g>
          );
        })}

        <text x="541" y={resTop + groups.length * (ROW_H + ROW_GAP) + 14} textAnchor="middle"
          className="mono" fontSize="10.5" fill="var(--fg-subtle)">one row per group</text>

        <defs>
          <marker id="sac-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill="var(--border-strong)" />
          </marker>
        </defs>
      </svg>
      <figcaption className="text-[11.5px] text-fg-muted text-center max-w-2xl mx-auto">
        groupby itself only splits. Nothing is computed until you call an aggregation — that is the apply step.
      </figcaption>
    </figure>
  );
}
