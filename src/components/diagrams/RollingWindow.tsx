const VALUES = [12, 18, 9, 24, 15, 21, 30, 11];
const W = 3;
const X0 = 18;
const CELL = 62;

/** Why a rolling mean is shorter than its input, and where the NaNs come from. */
export function RollingWindow({ at = 3 }: { at?: number }) {
  const start = Math.max(0, at - W + 1);
  const win = VALUES.slice(start, at + 1);
  const mean = win.reduce((a, b) => a + b, 0) / win.length;

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 540 168" role="img" aria-label={`rolling window of ${W}`}>
        <text x="18" y="16" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.2">sales</text>

        {VALUES.map((v, i) => {
          const inWin = i >= start && i <= at;
          return (
            <g key={i}>
              <rect x={X0 + i * CELL} y="26" width={CELL - 8} height="34" rx="5"
                fill={inWin ? "var(--accent-soft)" : "var(--s2)"}
                stroke={inWin ? "var(--accent)" : "var(--border)"} strokeWidth={inWin ? 1.75 : 1} />
              <text x={X0 + i * CELL + (CELL - 8) / 2} y="48" textAnchor="middle" className="mono" fontSize="12.5"
                fill={inWin ? "var(--accent)" : "var(--fg-muted)"}>{v}</text>
            </g>
          );
        })}

        {/* Bracket under the live window */}
        <path
          d={`M${X0 + start * CELL} 68 L${X0 + start * CELL} 76 L${X0 + at * CELL + CELL - 8} 76 L${X0 + at * CELL + CELL - 8} 68`}
          fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <text x={(X0 + start * CELL + X0 + at * CELL + CELL - 8) / 2} y="93" textAnchor="middle"
          className="mono" fontSize="11" fill="var(--accent)">window = {W}</text>

        {/* Result row: the first W-1 slots can never fill a full window */}
        <text x="18" y="120" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.2">ma3</text>
        {VALUES.map((v, i) => {
          const empty = i < W - 1;
          const isOut = i === at;
          return (
            <g key={`r-${i}`}>
              <rect x={X0 + i * CELL} y="128" width={CELL - 8} height="30" rx="5"
                fill={empty ? "var(--amber-soft)" : isOut ? "var(--green-soft)" : "var(--s2)"}
                stroke={empty ? "var(--amber)" : isOut ? "var(--green)" : "var(--border)"}
                strokeWidth={isOut ? 1.75 : 1} strokeDasharray={empty ? "3 2" : undefined} />
              <text x={X0 + i * CELL + (CELL - 8) / 2} y="148" textAnchor="middle" className="mono" fontSize="11.5"
                fill={empty ? "var(--amber)" : isOut ? "var(--green)" : "var(--fg-subtle)"}>
                {empty ? "NaN" : isOut ? mean.toFixed(1) : "·"}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-[11.5px] text-fg-muted text-center">
        The window needs {W} values before it can produce one, so the first {W - 1} results are NaN. Pass
        min_periods=1 to emit partial windows instead.
      </figcaption>
    </figure>
  );
}
