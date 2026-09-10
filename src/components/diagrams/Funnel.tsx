const STAGES = [
  { name: "Visited", users: 10000 },
  { name: "Signed up", users: 4200 },
  { name: "Added to cart", users: 1850 },
  { name: "Purchased", users: 610 },
];

const CX = 268;        // funnel centre line
const TOP_W = 272;     // width of the widest stage
const H = 42;
const GAP = 14;

/** Where users leak out, and why stage-over-stage beats a top-line rate. */
export function Funnel() {
  const first = STAGES[0].users;

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 600 244" role="img" aria-label="conversion funnel">
        <text x="516" y="16" fontSize="10" fontWeight="700" fill="var(--fg-subtle)" letterSpacing="1">STEP RATE</text>

        {STAGES.map((s, i) => {
          const y = 26 + i * (H + GAP);
          const w = (s.users / first) * TOP_W;
          const x = CX - w / 2;
          const prev = i === 0 ? null : STAGES[i - 1].users;
          const step = prev === null ? null : (s.users / prev) * 100;
          const drop = prev === null ? null : prev - s.users;

          return (
            <g key={s.name}>
              {/* Stage names sit in a fixed gutter, so a narrow bar never
                  has to contain text it cannot fit. */}
              <text x="112" y={y + 26} textAnchor="end" className="mono" fontSize="12" fill="var(--fg)">
                {s.name}
              </text>

              <rect x={x} y={y} width={w} height={H} rx="6"
                fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.4" />

              {/* Count always sits just outside the bar's right edge */}
              <text x={x + w + 12} y={y + 26} className="mono" fontSize="12" fill="var(--accent)">
                {s.users.toLocaleString()}
              </text>

              {step !== null && (
                <>
                  <path d={`M${CX} ${y - GAP} L${CX} ${y - 3}`}
                    stroke="var(--border-strong)" strokeWidth="1.25" markerEnd="url(#fn-arrow)" />
                  <text x="516" y={y + 21} className="mono" fontSize="12"
                    fill={step < 50 ? "var(--red)" : "var(--green)"}>
                    {step.toFixed(0)}%
                  </text>
                  <text x="516" y={y + 35} className="mono" fontSize="10" fill="var(--fg-subtle)">
                    −{drop!.toLocaleString()}
                  </text>
                </>
              )}
            </g>
          );
        })}

        <defs>
          <marker id="fn-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill="var(--border-strong)" />
          </marker>
        </defs>
      </svg>
      <figcaption className="text-[11.5px] text-fg-muted text-center max-w-2xl mx-auto">
        Overall conversion is 6.1%, which tells you nothing actionable. The stage rates do: cart to purchase at 33%
        is the leak worth fixing.
      </figcaption>
    </figure>
  );
}
