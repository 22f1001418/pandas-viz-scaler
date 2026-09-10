import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { SplitApplyCombine } from "@/components/diagrams/SplitApplyCombine";
import { df, hlByGroup, hlCols, hlHeaders, hlMerge, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

// Shared dataset: drink orders across two regions
const ITEM = ["Latte", "Espresso", "Mocha", "Green Tea", "Chai", "Cold Brew", "Lemonade", "Iced Tea"];
const CATEGORY = ["Coffee", "Coffee", "Coffee", "Tea", "Tea", "Coffee", "Juice", "Tea"];
const REGION = ["North", "South", "North", "South", "North", "South", "North", "South"];
const REVENUE = [12600, 12960, 9920, 5400, 6300, 11400, 4200, 4900];
const QTY = [45, 72, 31, 30, 42, 38, 28, 35];

const ORDERS = df({ item: ITEM, category: CATEGORY, region: REGION, revenue: REVENUE, qty: QTY });
const NCOL = ORDERS.columns.length;

/**
 * Aggregate rows by one or two keys. Computed rather than hand-typed, so the
 * numbers on screen always agree with the dataset above.
 */
function aggregate(keys: string[][], values: number[], how: "mean" | "sum" | "count") {
  const buckets = new Map<string, { key: string[]; vals: number[] }>();
  keys.forEach((k, i) => {
    const id = k.join(" ");
    if (!buckets.has(id)) buckets.set(id, { key: k, vals: [] });
    buckets.get(id)!.vals.push(values[i]);
  });
  return [...buckets.values()].map(({ key, vals }) => ({
    key,
    value:
      how === "count" ? vals.length
        : how === "sum" ? vals.reduce((a, b) => a + b, 0)
        : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  }));
}

// 14. GroupBy Mental Model

export function GroupByMentalPage() {
  const groupColors = hlByGroup(CATEGORY, NCOL);

  // Sorted by key, because that is what groupby does to the result index.
  const sorted = aggregate(CATEGORY.map((c) => [c]), REVENUE, "mean")
    .sort((a, b) => a.key[0].localeCompare(b.key[0]));

  const result = withIndex(
    df({ revenue: sorted.map((g) => g.value) }),
    sorted.map((g) => g.key[0]),
    ["category"],
  );
  const flat = df({ category: sorted.map((g) => g.key[0]), revenue: sorted.map((g) => g.value) });

  const steps: Step[] = [
    {
      id: "frame", label: "The raw rows", diagram: "split-apply-combine",
      views: [{ frame: ORDERS, title: "orders", badge: "8 rows, one per item" }],
      explain: "Eight order rows. The question — average revenue per category — cannot be answered by any single row, only by rows considered together. That is what groupby is for.",
    },
    {
      id: "key", label: "Pick the key",
      views: [{ frame: ORDERS, title: "orders", highlights: hlMerge(hlCols([1], 8), hlHeaders([1])), badge: "key = category" }],
      explain: "The key column decides the buckets. Every distinct value in 'category' becomes one group — here three of them: Coffee, Tea, Juice.",
    },
    {
      id: "split", label: "Split",
      views: [{ frame: ORDERS, title: "orders", highlights: groupColors, badge: "3 buckets" }],
      explain: "Split: each row is assigned to a bucket by its key. Rows keep their original order and index inside the bucket — nothing has been computed yet.",
      variables: [{ name: "orders.groupby('category')", type: "DataFrameGroupBy", preview: "3 groups" }],
    },
    {
      id: "lazy", label: "Nothing has run yet",
      views: [{ frame: ORDERS, title: "orders", highlights: groupColors, badge: "lazy", note: "Printing a groupby object shows only its memory address — no data." }],
      explain: "groupby is lazy. It returns an object describing the split, not a result. This is why df.groupby('category') on its own looks useless — you have to ask it for something.",
      variables: [{ name: "type(g)", type: "class", preview: "DataFrameGroupBy" }],
    },
    {
      id: "select", label: "Choose the column",
      views: [{ frame: ORDERS, title: "orders", highlights: hlMerge(groupColors, hlCols([3], 8, "match"), hlHeaders([3])), badge: "['revenue']" }],
      explain: "Selecting a column narrows what gets aggregated. Without it, pandas aggregates every numeric column it can — revenue AND qty — which is rarely what you meant.",
    },
    {
      id: "apply", label: "Apply",
      views: [{ frame: ORDERS, title: "orders", highlights: hlMerge(groupColors, hlCols([3], 8, "match")), badge: "mean() per bucket" }],
      explain: "Apply: the aggregation runs once per bucket, collapsing each to a single number. Coffee averages across its four rows, Tea across three, Juice across its one.",
    },
    {
      id: "combine", label: "Combine",
      views: [{ frame: result, title: "orders.groupby('category')['revenue'].mean()", badge: "one row per group" }],
      explain: "Combine: results are stitched into a single object. The group keys became the INDEX — not a column — and they come back sorted alphabetically, not in first-seen order.",
      variables: [{ name: "result.index.name", type: "str", preview: "'category'" }],
    },
    {
      id: "reset", label: "Keys back as a column",
      views: [{ frame: flat, title: ".reset_index()", badge: "category is a column again" }],
      explain: "reset_index() moves the key out of the index and back into a normal column. Reach for it whenever the next step is a merge, a plot, or a CSV export — all of which expect flat columns.",
    },
  ];

  // Feed the diagram this page's real numbers rather than the registry's
  // generic placeholders, so nothing on screen contradicts the frame below.
  const TONES = ["a", "b", "c", "d", "e"];
  const toneOf = new Map<string, string>();
  CATEGORY.forEach((c) => { if (!toneOf.has(c)) toneOf.set(c, TONES[toneOf.size % TONES.length]); });

  const renderDiagram = () => (
    <SplitApplyCombine
      rowTones={CATEGORY.map((c) => toneOf.get(c)!)}
      groups={sorted.map((g) => ({
        key: g.key[0],
        tone: toneOf.get(g.key[0])!,
        rows: CATEGORY.filter((c) => c === g.key[0]).length,
        agg: String(g.value),
      }))}
    />
  );

  return (
    <PageShell meta={PAGES["groupby-mental"]}>
      <StepRunner runId="groupby-mental" steps={steps} renderDiagram={renderDiagram} code={`# Split - Apply - Combine

g = orders.groupby("category")   # 1. SPLIT, lazy: nothing computed yet
g["revenue"]                     #    choose what to aggregate
g["revenue"].mean()              # 2. APPLY  +  3. COMBINE

# The keys land in the index. To get them back as a column:
orders.groupby("category")["revenue"].mean().reset_index()

# ...or skip the round trip entirely:
orders.groupby("category", as_index=False)["revenue"].mean()`} />
    </PageShell>
  );
}

// 17. Multi-level GroupBy

export function MultiGroupByPage() {
  const pairs = CATEGORY.map((c, i) => [c, REGION[i]]);
  const agg = aggregate(pairs, REVENUE, "sum")
    .sort((a, b) => a.key[0].localeCompare(b.key[0]) || a.key[1].localeCompare(b.key[1]));

  const multi = withIndex(
    df({ revenue: agg.map((g) => g.value) }),
    agg.map((g) => g.key),
    ["category", "region"],
  );
  const flat = df({
    category: agg.map((g) => g.key[0]),
    region: agg.map((g) => g.key[1]),
    revenue: agg.map((g) => g.value),
  });

  // unstack: the inner level (region) becomes columns
  const cats = [...new Set(agg.map((g) => g.key[0]))];
  const regions = [...new Set(agg.map((g) => g.key[1]))].sort();
  const unstacked = withIndex(
    df(Object.fromEntries(regions.map((r) => [
      r,
      cats.map((c) => agg.find((g) => g.key[0] === c && g.key[1] === r)?.value ?? null) as CellValue[],
    ]))),
    cats,
    ["category"],
  );

  const catColors = hlByGroup(CATEGORY, NCOL);
  // Rows whose outer label is blanked because it repeats the row above.
  const repeats = agg
    .map((g, i) => (i > 0 && agg[i - 1].key[0] === g.key[0] ? i : -1))
    .filter((i) => i >= 0);
  const repeatHl: HighlightMap = {};
  repeats.forEach((r) => { repeatHl[`i:${r}`] = "match"; repeatHl[`${r}:0`] = "match"; });

  const coffeeRows = agg.map((g, i) => (g.key[0] === "Coffee" ? i : -1)).filter((i) => i >= 0);
  const coffeeHl: HighlightMap = {};
  coffeeRows.forEach((r) => { coffeeHl[`i:${r}`] = "match"; coffeeHl[`${r}:0`] = "match"; });

  const steps: Step[] = [
    {
      id: "one-key", label: "One key is not enough",
      views: [{ frame: ORDERS, title: "orders", highlights: catColors, badge: "grouped by category only" }],
      explain: "Grouping by category alone answers 'how much per category' but hides the regional split. Real business questions are usually two-dimensional: revenue per category PER region.",
    },
    {
      id: "two-keys", label: "Pass a list of keys",
      views: [{ frame: ORDERS, title: "orders", highlights: hlMerge(catColors, hlHeaders([1, 2], "match")), badge: "['category', 'region']" }],
      explain: "A list of keys nests the split: first by category, then by region within each category. The buckets are every combination that actually occurs — pandas does not invent empty ones.",
    },
    {
      id: "multiindex", label: "The result is a MultiIndex",
      views: [{ frame: multi, title: "orders.groupby(['category','region'])['revenue'].sum()", badge: "2 index levels" }],
      explain: "The result index now has two levels. Notice pandas prints an outer label only when it changes — the blanks are the same category repeated, not missing data. That display trick is the single biggest source of MultiIndex confusion.",
      variables: [{ name: "result.index.nlevels", type: "int", preview: "2" }],
    },
    {
      id: "blanks", label: "Blanks are repeats, not NaN",
      views: [{ frame: multi, title: "result", highlights: repeatHl, badge: "same key as the row above" }],
      explain: "Every highlighted row still belongs to the category printed above it. Export this to CSV without flattening and those blanks become genuinely empty cells — the file will be wrong in a way that is hard to spot later.",
    },
    {
      id: "select-group", label: "Selecting from a MultiIndex",
      views: [{ frame: multi, title: "result.loc['Coffee']", highlights: coffeeHl, badge: "one label, whole outer group" }],
      explain: "A single label selects an entire outer group. For one exact cell you pass a tuple: result.loc[('Coffee', 'North')]. Slicing across the inner level instead needs .xs() or pd.IndexSlice.",
    },
    {
      id: "reset", label: "Flatten with reset_index",
      views: [{ frame: flat, title: ".reset_index()", badge: "3 plain columns" }],
      explain: "reset_index() turns both levels into ordinary columns. This is the safe shape for merging, plotting, and writing to disk.",
    },
    {
      id: "unstack", label: "Or pivot the inner level",
      views: [{ frame: unstacked, title: ".unstack()", badge: "region becomes columns" }],
      explain: "unstack() lifts the innermost index level into columns, turning a tall result into a compact grid. Same numbers, far more readable — and this is exactly what pivot_table does in a single call.",
      variables: [{ name: "result.unstack().shape", type: "tuple", preview: `(${cats.length}, ${regions.length})` }],
    },
  ];

  return (
    <PageShell meta={PAGES["multi-groupby"]}>
      <StepRunner runId="multi-groupby" steps={steps} code={`r = orders.groupby(["category", "region"])["revenue"].sum()

r                            # MultiIndex: outer labels print once
r.index.nlevels              # 2
r.loc["Coffee"]              # whole outer group
r.loc[("Coffee", "North")]   # one exact cell, note the tuple

r.reset_index()              # both levels back to columns
r.unstack()                  # inner level (region) becomes columns`} />
    </PageShell>
  );
}
