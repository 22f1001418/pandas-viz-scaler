import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, hlRows, series } from "@/lib/dataframe";
import type { Step, HighlightMap } from "@/types";

// ═══ 11. pd.cut & pd.qcut ═════════════════════════════════

export function CutQcutPage() {
  const NAMES = ["Aarav", "Priya", "Ishaan", "Diya", "Kabir", "Zoya", "Ravi", "Sara"];
  const AGES = [12, 22, 35, 45, 17, 65, 28, 55];

  const EDGES = [0, 18, 35, 60, 100];
  const LABELS = ["Youth", "Adult", "Middle", "Senior"];
  // Default closed="right": a value lands in the bucket whose upper edge it
  // does not exceed. 35 therefore falls in Adult (18, 35], not Middle.
  const cutOf = (a: number) => LABELS[EDGES.findIndex((e, i) => i > 0 && a <= e) - 1];

  const sortedAges = [...AGES].sort((x, y) => x - y);
  const qLabels = ["Q1", "Q2", "Q3", "Q4"];
  const qOf = (a: number) => qLabels[Math.min(3, Math.floor(sortedAges.indexOf(a) / 2))];

  const tones: Record<string, import("@/types").HighlightKind> = {
    Youth: "group-a", Adult: "group-b", Middle: "group-c", Senior: "group-d",
    Q1: "group-a", Q2: "group-b", Q3: "group-c", Q4: "group-d",
  };
  const colorBy = (vals: string[], col: number): HighlightMap => {
    const m: HighlightMap = {};
    vals.forEach((v, r) => { m[`${r}:${col}`] = tones[v] ?? "match"; });
    return m;
  };

  const raw = df({ name: NAMES, age: AGES });
  const cutVals = AGES.map(cutOf);
  const qVals = AGES.map(qOf);

  const withCut = df({ name: NAMES, age: AGES, bucket: cutVals });
  const withQcut = df({ name: NAMES, age: AGES, quartile: qVals });
  const both = df({ name: NAMES, age: AGES, cut: cutVals, qcut: qVals });

  const cutCounts = withIndexCount(LABELS, cutVals);
  const qcutCounts = withIndexCount(qLabels, qVals);

  const boundaryRow = AGES.indexOf(35);

  const steps: Step[] = [
    {
      id: "continuous", label: "A continuous column",
      views: [{ frame: raw, title: "people", badge: "8 ages, all different" }],
      explain: "Age is continuous - eight rows, eight distinct values. You cannot group by it, count it, or put it in a legend. Bucketing turns it into a handful of categories you can actually reason about.",
    },
    {
      id: "cut", label: "pd.cut: you choose the edges",
      views: [{ frame: withCut, title: "pd.cut(age, bins=[0,18,35,60,100], labels=[...])", highlights: colorBy(cutVals, 2), badge: "4 bins by VALUE" }],
      explain: "cut splits on boundaries you supply, so the buckets mean something outside the data: under 18 is a child, over 60 is a senior. Those definitions come from the domain, not from the numbers.",
      variables: [{ name: "bins", type: "list", preview: "[0, 18, 35, 60, 100]" }],
    },
    {
      id: "edges", label: "Which side is the edge on?",
      views: [{ frame: withCut, title: "age 35 -> Adult, not Middle", highlights: hlMerge(colorBy(cutVals, 2), { [`${boundaryRow}:1`]: "changed", [`${boundaryRow}:2`]: "changed" }), badge: "(18, 35] by default" }],
      explain: "Intervals are right-closed by default: (18, 35] includes 35 but excludes 18. So Ishaan at exactly 35 is Adult, not Middle. Pass right=False to flip it. Whenever a boundary value looks misfiled, this is why.",
    },
    {
      id: "uneven", label: "cut gives uneven counts",
      views: [{ frame: cutCounts, title: "value_counts()", highlights: hlCols([0], LABELS.length, "changed"), badge: "not balanced" }],
      explain: "Because the edges are fixed, bucket sizes fall where they fall - here Adult holds three people and Senior one. That is correct behaviour, and it is a problem if you needed comparable group sizes.",
    },
    {
      id: "qcut", label: "pd.qcut: equal counts instead",
      views: [{ frame: withQcut, title: "pd.qcut(age, q=4)", highlights: colorBy(qVals, 2), badge: "4 bins by RANK" }],
      explain: "qcut ignores the values and splits on rank: it moves the boundaries so each bucket holds the same number of rows. You choose how many buckets; pandas works out where the edges must go.",
    },
    {
      id: "balanced", label: "Two per bucket, by construction",
      views: [{ frame: qcutCounts, title: "value_counts()", highlights: hlCols([0], qLabels.length, "new"), badge: "balanced" }],
      explain: "Eight people, four quartiles, two each. This is what you want for percentile analysis, stratified sampling, or any comparison that needs equally-sized groups.",
    },
    {
      id: "compare", label: "Same data, different meaning",
      views: [{ frame: both, title: "cut vs qcut", highlights: hlMerge(colorBy(cutVals, 2), colorBy(qVals, 3), hlHeaders([2, 3], "match")), badge: "read the two columns" }],
      explain: "Zoya at 65 is Senior by cut and Q4 by qcut - those say different things. 'Senior' is an absolute claim about age; 'Q4' only says she is among the oldest IN THIS DATA. Change the sample and the qcut label changes with it, while the cut label does not.",
    },
    {
      id: "traps", label: "Two things that will bite",
      views: [{ frame: withQcut, title: "duplicates and NaN", highlights: hlMerge(colorBy(qVals, 2), hlHeaders([2], "drop")), badge: "watch out" }],
      explain: "First: if many rows share a value, qcut cannot find distinct edges and raises - pass duplicates='drop' and accept fewer buckets. Second: a value outside your cut bins becomes NaN silently, so an age of 120 against a top edge of 100 just vanishes. Always check value_counts(dropna=False) after bucketing.",
    },
  ];

  return (
    <PageShell meta={PAGES["cut-qcut"]}>
      <StepRunner runId="cut-qcut" steps={steps} code={`# cut: YOU choose the edges. Buckets mean something outside the data.
df["bucket"] = pd.cut(df["age"],
                      bins=[0, 18, 35, 60, 100],
                      labels=["Youth", "Adult", "Middle", "Senior"])

# Intervals are RIGHT-closed: (18, 35] includes 35, excludes 18
pd.cut(df["age"], bins=[0, 18, 35, 60, 100], right=False)   # flip it

# qcut: pandas chooses the edges so each bucket has the same COUNT
df["quartile"] = pd.qcut(df["age"], q=4, labels=["Q1", "Q2", "Q3", "Q4"])

# Traps
pd.qcut(df["score"], q=4, duplicates="drop")   # many ties -> non-unique edges
df["bucket"].value_counts(dropna=False)        # values outside bins -> NaN`} />
    </PageShell>
  );
}

/** Count how many rows fell into each bucket, in the buckets' own order. */
function withIndexCount(labels: string[], values: string[]) {
  return {
    ...df({ count: labels.map((l) => values.filter((v) => v === l).length) }),
    index: labels,
    indexNames: ["bucket"],
  };
}

// 12. Vectorization Patterns

export function VectorizationPage() {
  const PRODUCT = ["Laptop", "Mouse", "Keyboard", "Monitor", "Webcam"];
  const PRICE = [999, 29, 79, 349, 89];
  const QTY = [5, 120, 80, 20, 45];
  const revenue = PRICE.map((p, i) => p * QTY[i]);
  const discounted = PRICE.map((p) => (p > 50 ? Math.round(p * 0.8 * 100) / 100 : p));
  const tier = revenue.map((r) => (r > 6000 ? "high" : r > 4000 ? "mid" : "low"));

  const base = df({ product: PRODUCT, price: PRICE, qty: QTY });
  const withRevenue = df({ product: PRODUCT, price: PRICE, qty: QTY, revenue });
  const withDiscount = df({ product: PRODUCT, price: PRICE, discounted });
  const withTier = df({ product: PRODUCT, revenue, tier });
  const withUpper = df({ product: PRODUCT, upper: PRODUCT.map((p) => p.toUpperCase()) });

  const alignA = series("qty", [5, 120, 80], { index: ["a", "b", "c"] });
  const alignB = series("qty", [80, 5, 120], { index: ["c", "a", "b"] });

  const steps: Step[] = [
    {
      id: "loop-thinking", label: "The instinct to loop",
      views: [{ frame: base, title: "orders", highlights: hlRows([0], 3, "match"), badge: "row 0, then row 1, then..." }],
      explain: "Coming from Python, revenue looks like a loop: take a row, multiply two fields, store it, move on. That instinct is the single biggest thing standing between you and idiomatic pandas.",
    },
    {
      id: "columns", label: "Think in columns instead",
      views: [{ frame: base, title: "orders", highlights: hlMerge(hlCols([1], 5, "group-a"), hlCols([2], 5, "group-b"), hlHeaders([1], "group-a"), hlHeaders([2], "group-b")), badge: "two whole columns" }],
      explain: "Stop seeing five rows and start seeing two columns. price and qty are arrays of the same length, and multiplying them is one operation on the pair - not five operations on rows.",
    },
    {
      id: "arith", label: "Column arithmetic",
      views: [{ frame: withRevenue, title: "df['revenue'] = df['price'] * df['qty']", highlights: hlMerge(hlCols([3], 5, "new"), hlHeaders([3], "new")), badge: "one expression" }],
      explain: "Element-wise multiplication across the whole column, executed by numpy in compiled C. No loop appears anywhere in your code, and the version that reads more simply is also the one that runs a thousand times faster.",
    },
    {
      id: "alignment", label: "Alignment is by INDEX, not position",
      views: [
        { frame: alignA, title: "a", badge: "order a, b, c", render: "series" },
        { frame: alignB, title: "b", badge: "order c, a, b", render: "series" },
      ],
      explain: "This is what makes pandas arithmetic different from numpy. Adding these two Series matches label to label, not slot to slot - so a+b pairs each 'a' with each 'a' regardless of row order. It also means a label present in only one side produces NaN rather than an error.",
      variables: [{ name: "(a + b)['a']", type: "int", preview: "10  (5 + 5, matched by label)" }],
    },
    {
      id: "where", label: "Conditionals vectorize too",
      views: [{ frame: withDiscount, title: "np.where(price > 50, price * 0.8, price)", highlights: hlMerge(hlCols([2], 5, "new"), hlHeaders([2], "new")), badge: "if/else, no loop" }],
      explain: "np.where(condition, if_true, if_false) evaluates the condition across the entire column and picks from two arrays. The Mouse at 29 keeps its price; everything above 50 gets 20% off. This replaces most of the loops people write.",
    },
    {
      id: "select", label: "More than two branches",
      views: [{ frame: withTier, title: "np.select([...], [...], default='low')", highlights: hlMerge(hlCols([2], 5, "new"), hlHeaders([2], "new")), badge: "nested if/elif" }],
      explain: "np.select takes a list of conditions and a list of results, applying the first that matches - the vectorized elif chain. Nesting np.where three deep also works and becomes unreadable fast; np.select stays legible.",
    },
    {
      id: "str", label: "Strings vectorize through .str",
      views: [{ frame: withUpper, title: "df['product'].str.upper()", highlights: hlMerge(hlCols([1], 5, "changed"), hlHeaders([1], "changed")), badge: "C speed on text" }],
      explain: "Text is not an exception. The .str accessor exposes upper, contains, split, replace and the rest across a whole column at once. Same idea for dates through .dt - year, month, day_name, all vectorized.",
    },
    {
      id: "test", label: "The question to ask yourself",
      views: [{ frame: withRevenue, title: "no loop, no apply", highlights: { "*:*": "new" }, badge: "the habit" }],
      explain: "Whenever you type 'for' or '.apply' over rows, pause and ask what the column-level expression would be. It usually exists: arithmetic, comparison, np.where, .str, .dt, groupby-transform. The rare cases that genuinely need per-row Python are worth the exception - the reflex should be to look first.",
    },
  ];

  return (
    <PageShell meta={PAGES["vectorization"]}>
      <StepRunner runId="vectorization" steps={steps} code={`import numpy as np

df["revenue"] = df["price"] * df["qty"]        # element-wise, in C

# Series arithmetic aligns on the INDEX, not on row position
a + b                                          # matched label to label

df["discounted"] = np.where(df["price"] > 50, df["price"] * 0.8, df["price"])

df["tier"] = np.select(                        # the vectorized elif chain
    [df["revenue"] > 6000, df["revenue"] > 4000],
    ["high", "mid"],
    default="low",
)

df["product"].str.upper()      # text vectorizes through .str
df["date"].dt.day_name()       # dates through .dt

# The habit: before writing "for" or ".apply", look for the column expression.`} />
    </PageShell>
  );
}

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
