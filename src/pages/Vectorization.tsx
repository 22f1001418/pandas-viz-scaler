import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols } from "@/lib/dataframe";
import type { Step, HighlightMap } from "@/types";

// ═══ 11. pd.cut & pd.qcut ═════════════════════════════════

export function CutQcutPage() {
  const ages = df({
    name: ["Aarav", "Priya", "Ishaan", "Diya", "Kabir", "Zoya", "Ravi", "Sara"],
    age: [12, 22, 35, 45, 17, 65, 28, 55],
    bucket: ["Youth", "Adult", "Adult", "Middle", "Youth", "Senior", "Adult", "Middle"],
  });
  const bucketHl: HighlightMap = {};
  const colors: Record<string, import("@/types").HighlightKind> = { Youth: "group-a", Adult: "group-b", Middle: "group-c", Senior: "group-d" };
  ages.data.forEach((r, i) => { bucketHl[`${i}:2`] = colors[r[2] as string] ?? "match"; });

  const qcutDf = df({
    name: ["Aarav", "Priya", "Ishaan", "Diya", "Kabir", "Zoya", "Ravi", "Sara"],
    age: [12, 22, 35, 45, 17, 65, 28, 55],
    quartile: ["Q1", "Q1", "Q2", "Q3", "Q1", "Q4", "Q2", "Q3"],
  });
  const qcutHl: HighlightMap = {};
  const qColors: Record<string, import("@/types").HighlightKind> = { Q1: "group-a", Q2: "group-b", Q3: "group-c", Q4: "group-d" };
  qcutDf.data.forEach((r, i) => { qcutHl[`${i}:2`] = qColors[r[2] as string] ?? "match"; });

  const steps: Step[] = [
    { id: "cut", label: "pd.cut — fixed boundaries", views: [
        { frame: ages, title: "cut result", highlights: bucketHl, badge: "4 custom buckets" },
      ], explain: "pd.cut splits at the boundaries YOU specify: [0, 18, 35, 60, 100]. Age 12 → Youth, 35 → Adult (the boundary goes into the RIGHT bucket by default).",
      variables: [{ name: "bins", type: "list", preview: "[0, 18, 35, 60, 100]" }, { name: "labels", type: "list", preview: "['Youth','Adult','Middle','Senior']" }] },
    { id: "qcut", label: "pd.qcut — equal-count buckets", views: [
        { frame: qcutDf, title: "qcut result", highlights: qcutHl, badge: "4 quartiles (2 each)" },
      ], explain: "pd.qcut(df['age'], q=4) finds boundaries so each bucket has the SAME number of rows. Useful for percentile-based analysis.",
      variables: [{ name: "q", type: "int", preview: "4 (quartiles)" }] },
  ];

  return (
    <PageShell meta={PAGES["cut-qcut"]}>
      <StepRunner runId="cut-qcut" code={`# Fixed boundaries (you choose the edges)
df["bucket"] = pd.cut(
    df["age"],
    bins=[0, 18, 35, 60, 100],
    labels=["Youth", "Adult", "Middle", "Senior"],
)

# Equal-count buckets (pandas chooses edges)
df["quartile"] = pd.qcut(df["age"], q=4, labels=["Q1","Q2","Q3","Q4"])`} steps={steps} />
    </PageShell>
  );
}

// ═══ 12. Vectorization Patterns ════════════════════════════

export function VectorizationPage() {
  const orders = df({
    product: ["Laptop", "Mouse", "Keyboard", "Monitor", "Webcam"],
    price: [999, 29, 79, 349, 89],
    qty: [5, 120, 80, 20, 45],
    revenue: [4995, 3480, 6320, 6980, 4005],
  });
  const revHl: HighlightMap = {};
  for (let r = 0; r < 5; r++) revHl[`${r}:3`] = "new";

  const withDiscount = df({
    product: ["Laptop", "Mouse", "Keyboard", "Monitor", "Webcam"],
    price: [999, 29, 79, 349, 89],
    discounted: [799.2, 29, 63.2, 279.2, 89],
  });
  const discHl: HighlightMap = {};
  for (let r = 0; r < 5; r++) discHl[`${r}:2`] = "new";

  const steps: Step[] = [
    { id: "arith", label: "Column arithmetic", views: [
        { frame: orders, title: "df", highlights: revHl, badge: "price × qty = revenue" },
      ], explain: "df['revenue'] = df['price'] * df['qty']. One line, no loop. pandas multiplies element-wise using numpy — runs in C, not Python." },
    { id: "where", label: "np.where — conditional", views: [
        { frame: withDiscount, title: "df", highlights: discHl, badge: "20% off if price > 50" },
      ], explain: "np.where(condition, yes_value, no_value). Vectorized if/else: prices > 50 get 20% off, others stay the same. No loop, no .apply()." },
    { id: "str", label: ".str methods", views: [
        { frame: df({ product: ["Laptop", "Mouse", "Keyboard", "Monitor", "Webcam"], upper: ["LAPTOP", "MOUSE", "KEYBOARD", "MONITOR", "WEBCAM"] }),
          title: ".str.upper()", highlights: hlCols([1], 5, "changed"), badge: "vectorized string ops" },
      ], explain: ".str.upper(), .str.contains(), .str.split() — all run at C speed across the whole column. The .str accessor is the string equivalent of numpy vectorization." },
  ];

  return (
    <PageShell meta={PAGES["vectorization"]}>
      <StepRunner runId="vectorization" code={`# Column arithmetic (vectorized multiply)
df["revenue"] = df["price"] * df["qty"]

# Conditional (vectorized if/else)
import numpy as np
df["discounted"] = np.where(df["price"] > 50, df["price"] * 0.8, df["price"])

# String operations
df["product_upper"] = df["product"].str.upper()`} steps={steps} />
    </PageShell>
  );
}

// ═══ 13. Loop vs Vectorized ════════════════════════════════

export function LoopVsVecPage() {
  // Representative timings for the same 1M-row multiplication.
  const TIMINGS = [
    { label: "iterrows", ms: 12400, tone: "slow" as const, display: "12.4 s" },
    { label: "iloc loop", ms: 8700, tone: "slow" as const, display: "8.7 s" },
    { label: "apply(lambda)", ms: 3200, tone: "slow" as const, display: "3.2 s" },
    { label: "col * col", ms: 12, tone: "fast" as const, display: "12 ms" },
    { label: "np.where", ms: 15, tone: "fast" as const, display: "15 ms" },
  ];

  const bars = (upto: number) => ({
    title: "1,000,000 rows",
    bars: TIMINGS.slice(0, upto).map((t) => ({ label: t.label, value: t.ms, display: t.display, tone: t.tone })),
  });

  const data = df({
    approach: TIMINGS.map((t) => t.label),
    time_1M_rows: TIMINGS.map((t) => t.display),
    speedup: TIMINGS.map((t) => {
      const x = TIMINGS[0].ms / t.ms;
      return `${x < 10 ? x.toFixed(1) : Math.round(x)}x`;
    }),
  });

  const steps: Step[] = [
    {
      id: "loop", label: "iterrows: the slowest path",
      views: [{ frame: data, title: "timing comparison", highlights: { "0:*": "drop" }, badge: "12.4 s" }],
      bars: { ...bars(1), note: "One bar so far. The scale is about to change dramatically." },
      explain: "iterrows() rebuilds a Series object for every row, then hands it to the Python interpreter. At a million rows that is a million object constructions before any arithmetic happens.",
    },
    {
      id: "iloc", label: "A tighter loop is still a loop",
      views: [{ frame: data, title: "timing comparison", highlights: { "0:*": "drop", "1:*": "group-d" }, badge: "8.7 s" }],
      bars: bars(2),
      explain: "Dropping down to .iloc skips the Series construction and saves about 30%. Still 8.7 seconds — because the real cost is not how you index, it is that the loop runs in Python at all.",
    },
    {
      id: "apply", label: "apply: better, not fast",
      views: [{ frame: data, title: "timing comparison", highlights: { "2:*": "group-d" }, badge: "3.2 s" }],
      bars: { ...bars(3), note: "Three approaches, all within one order of magnitude of each other." },
      explain: ".apply(lambda) is about 4x faster than iterrows and reads much better, which is why it feels like the solution. It is not: it still calls a Python function once per row.",
    },
    {
      id: "vectorized", label: "Vectorized: a different scale",
      views: [{ frame: data, title: "timing comparison", highlights: { "3:*": "new" }, badge: "12 ms" }],
      bars: { ...bars(4), note: "The loop bars have not changed. The new bar is so short it nearly vanishes." },
      explain: "df['price'] * df['qty'] hands the whole column to a single compiled C loop. 12 milliseconds — roughly 1000x faster, and shorter to type than any of the alternatives.",
      variables: [{ name: "speedup", type: "float", preview: `${Math.round(TIMINGS[0].ms / TIMINGS[3].ms)}x` }],
    },
    {
      id: "conditional", label: "Conditionals vectorize too",
      views: [{ frame: data, title: "timing comparison", highlights: { "3:*": "new", "4:*": "new" }, badge: "15 ms" }],
      bars: bars(5),
      explain: "The usual excuse for looping is 'but I need an if'. np.where(cond, yes, no) is that if, evaluated across the whole column at once. Nested conditions go to np.select. Almost nothing genuinely needs a row loop.",
    },
    {
      id: "takeaway", label: "Think in columns",
      views: [{
        frame: data, title: "timing comparison",
        highlights: { "0:*": "drop", "1:*": "drop", "2:*": "drop", "3:*": "new", "4:*": "new" },
        badge: "the whole lesson",
      }],
      bars: { ...bars(5), note: "Same operation, same machine, same data. The only difference is where the loop runs." },
      explain: "The gap is not 20% — it is three orders of magnitude, and it grows with your data. When you catch yourself writing 'for each row', stop and ask what the column-level expression would be.",
    },
  ];

  return (
    <PageShell meta={PAGES["loop-vs-vec"]}>
      <StepRunner runId="loop-vs-vec" steps={steps} code={`# SLOW - a Python function call per row
for i, row in df.iterrows():
    df.at[i, "revenue"] = row["price"] * row["qty"]

# BETTER - but still one call per row
df["revenue"] = df.apply(lambda r: r["price"] * r["qty"], axis=1)

# FAST - one compiled C loop over the whole column
df["revenue"] = df["price"] * df["qty"]

# "But I need an if" - that vectorizes too
df["tier"] = np.where(df["revenue"] > 1000, "high", "low")`} />
    </PageShell>
  );
}
