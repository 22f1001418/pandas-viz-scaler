interface Props {
  columns: string[];
  /** missing[r][c] === true means that cell is NaN. */
  missing: boolean[][];
  caption?: string;
  /** Highlight one column by index — the one the step is talking about. */
  focusCol?: number;
}

const CELL_W = 78;
const CELL_H = 5;
const GAP = 1;
const LEFT = 8;
const TOP = 34;

/**
 * A missingno-style matrix: rows down, columns across, a mark for every NaN.
 * The point is the PATTERN — a solid block of missing rows is a pipeline
 * outage, scattered specks are random loss — which no isna().sum() can show.
 */
export function NullMatrix({ columns, missing, caption, focusCol }: Props) {
  const rows = missing.length;
  const width = LEFT * 2 + columns.length * CELL_W;
  const height = TOP + rows * (CELL_H + GAP) + 46;

  const pctMissing = columns.map(
    (_, c) => (missing.filter((row) => row[c]).length / rows) * 100,
  );

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="missing data matrix">
        {columns.map((name, c) => {
          const x = LEFT + c * CELL_W;
          const focused = focusCol === c;
          return (
            <g key={name}>
              <text x={x + CELL_W / 2 - 4} y="16" textAnchor="middle" fontSize="11"
                fontWeight={focused ? 700 : 500}
                fill={focused ? "var(--accent)" : "var(--fg-muted)"}>
                {name}
              </text>

              {/* One thin mark per row: filled = present, coloured = missing */}
              {missing.map((row, r) => (
                <rect key={r} x={x} y={TOP + r * (CELL_H + GAP)} width={CELL_W - 8} height={CELL_H}
                  fill={row[c] ? "var(--amber)" : "var(--s3)"}
                  opacity={row[c] ? 0.95 : 0.85} />
              ))}

              <text x={x + CELL_W / 2 - 4} y={TOP + rows * (CELL_H + GAP) + 20} textAnchor="middle"
                className="mono" fontSize="10.5"
                fill={pctMissing[c] > 0 ? "var(--amber)" : "var(--fg-subtle)"}>
                {pctMissing[c].toFixed(0)}% null
              </text>
            </g>
          );
        })}

        <text x={LEFT} y={TOP + rows * (CELL_H + GAP) + 38} fontSize="10" fill="var(--fg-subtle)">
          each stripe is one row · amber = missing
        </text>
      </svg>
      {caption && <figcaption className="text-[11.5px] text-fg-muted text-center max-w-2xl mx-auto">{caption}</figcaption>}
    </figure>
  );
}
