export type VennMode = "inner" | "left" | "right" | "outer" | "cross";

const CAPTION: Record<VennMode, string> = {
  inner: "Only keys present in BOTH frames survive.",
  left: "Every left row is kept; unmatched right columns become NaN.",
  right: "Every right row is kept; unmatched left columns become NaN.",
  outer: "Every key from both sides is kept; gaps on either side become NaN.",
  cross: "No key at all — every left row is paired with every right row.",
};

/** how= as a Venn: the shaded region is exactly the rows the merge returns. */
export function Venn({ mode }: { mode: VennMode }) {
  const lit = { left: mode === "left" || mode === "outer", right: mode === "right" || mode === "outer" };

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 420 168" role="img" aria-label={`${mode} join`}>
        <defs>
          <clipPath id={`vc-${mode}`}><circle cx="248" cy="78" r="60" /></clipPath>
        </defs>

        {/* Full-circle fills for the keep-everything joins */}
        <circle cx="172" cy="78" r="60" fill={lit.left ? "var(--accent-soft)" : "transparent"} />
        <circle cx="248" cy="78" r="60" fill={lit.right ? "var(--accent-soft)" : "transparent"} />

        {/* The overlap is shaded for every join type except cross */}
        {mode !== "cross" && (
          <g clipPath={`url(#vc-${mode})`}>
            <circle cx="172" cy="78" r="60" fill="var(--accent)" opacity=".38" />
          </g>
        )}

        <circle cx="172" cy="78" r="60" fill="none" stroke="var(--accent)" strokeWidth="1.75" />
        <circle cx="248" cy="78" r="60" fill="none" stroke="var(--accent)" strokeWidth="1.75" />

        <text x="118" y="83" textAnchor="middle" className="mono" fontSize="12" fill="var(--fg-muted)">left</text>
        <text x="302" y="83" textAnchor="middle" className="mono" fontSize="12" fill="var(--fg-muted)">right</text>
        <text x="210" y="160" textAnchor="middle" className="mono" fontSize="12.5" fill="var(--accent)">
          how="{mode}"
        </text>
      </svg>
      <figcaption className="text-[11.5px] text-fg-muted text-center max-w-md">{CAPTION[mode]}</figcaption>
    </figure>
  );
}
