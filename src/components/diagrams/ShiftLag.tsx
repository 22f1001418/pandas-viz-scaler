const VALUES = [120, 138, 131, 152, 166];
const ROW_H = 30;
const TOP = 40;

/** shift(1) slides values down one row, which is what makes a delta possible. */
export function ShiftLag() {
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 460 210" role="img" aria-label="shift and lag">
        <text x="40" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.1">week</text>
        <text x="150" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.1">sales</text>
        <text x="290" y="26" textAnchor="middle" className="mono" fontSize="11" fill="var(--accent)">.shift(1)</text>
        <text x="410" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1.1">delta</text>

        {VALUES.map((v, i) => {
          const y = TOP + i * ROW_H;
          const prev = i === 0 ? null : VALUES[i - 1];
          return (
            <g key={i}>
              <text x="40" y={y + 19} textAnchor="middle" className="mono" fontSize="11.5" fill="var(--fg-subtle)">W{i + 1}</text>

              <rect x="112" y={y} width="76" height="24" rx="5" fill="var(--s2)" stroke="var(--border)" />
              <text x="150" y={y + 17} textAnchor="middle" className="mono" fontSize="12" fill="var(--fg)">{v}</text>

              {/* The diagonal is the shift: row i's value lands on row i+1 */}
              {i < VALUES.length - 1 && (
                <path d={`M190 ${y + 12} C 226 ${y + 12}, 226 ${y + ROW_H + 12}, 250 ${y + ROW_H + 12}`}
                  fill="none" stroke="var(--accent)" strokeWidth="1.4" markerEnd="url(#sl-arrow)" opacity=".8" />
              )}

              <rect x="252" y={y} width="76" height="24" rx="5"
                fill={prev === null ? "var(--amber-soft)" : "var(--accent-soft)"}
                stroke={prev === null ? "var(--amber)" : "var(--accent)"}
                strokeDasharray={prev === null ? "3 2" : undefined} />
              <text x="290" y={y + 17} textAnchor="middle" className="mono" fontSize="12"
                fill={prev === null ? "var(--amber)" : "var(--accent)"}>{prev === null ? "NaN" : prev}</text>

              <rect x="360" y={y} width="82" height="24" rx="5"
                fill={prev === null ? "var(--s2)" : "var(--green-soft)"}
                stroke={prev === null ? "var(--border)" : "var(--green)"} />
              <text x="401" y={y + 17} textAnchor="middle" className="mono" fontSize="11.5"
                fill={prev === null ? "var(--fg-subtle)" : "var(--green)"}>
                {prev === null ? "NaN" : `${v - prev > 0 ? "+" : ""}${v - prev}`}
              </text>
            </g>
          );
        })}

        <defs>
          <marker id="sl-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill="var(--accent)" />
          </marker>
        </defs>
      </svg>
      <figcaption className="text-[11.5px] text-fg-muted text-center">
        Row 1 has nothing before it, so every shift-based metric starts with a NaN. That is a real gap, not a bug —
        do not fill it with zero.
      </figcaption>
    </figure>
  );
}
