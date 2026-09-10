import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { SplitApplyCombine } from "@/components/diagrams/SplitApplyCombine";
import { df, hlByGroup, hlCols, hlHeaders, hlMerge, withColumnGroups, withIndex } from "@/lib/dataframe";
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

// 15. Aggregation Patterns

export function AggPatternsPage() {
  const cats = [...new Set(CATEGORY)].sort();
  const rowsFor = (c: string) => CATEGORY.map((x, i) => (x === c ? i : -1)).filter((i) => i >= 0);
  const sum = (idx: number[], src: number[]) => idx.reduce((a, i) => a + src[i], 0);
  const mean = (idx: number[], src: number[]) => Math.round(sum(idx, src) / idx.length);

  const single = withIndex(df({ revenue: cats.map((c) => sum(rowsFor(c), REVENUE)) }), cats, ["category"]);

  // .agg(["sum", "mean", "count"]) -> one column per function
  const listAgg = withIndex(
    df({
      sum: cats.map((c) => sum(rowsFor(c), REVENUE)),
      mean: cats.map((c) => mean(rowsFor(c), REVENUE)),
      count: cats.map((c) => rowsFor(c).length),
    }),
    cats, ["category"],
  );

  // .agg({"revenue": ["sum", "mean"], "qty": "sum"}) -> MultiIndex columns
  const dictAgg = withIndex(
    withColumnGroups(
      df({
        sum: cats.map((c) => sum(rowsFor(c), REVENUE)),
        mean: cats.map((c) => mean(rowsFor(c), REVENUE)),
        "sum ": cats.map((c) => sum(rowsFor(c), QTY)),
      }),
      [{ label: "revenue", span: 2 }, { label: "qty", span: 1 }],
    ),
    cats, ["category"],
  );

  const named = df({
    category: cats,
    total_revenue: cats.map((c) => sum(rowsFor(c), REVENUE)),
    avg_revenue: cats.map((c) => mean(rowsFor(c), REVENUE)),
    units: cats.map((c) => sum(rowsFor(c), QTY)),
    n_items: cats.map((c) => rowsFor(c).length),
  });

  const custom = df({
    category: cats,
    revenue_range: cats.map((c) => {
      const vals = rowsFor(c).map((i) => REVENUE[i]);
      return Math.max(...vals) - Math.min(...vals);
    }),
    top_item: cats.map((c) => {
      const idx = rowsFor(c);
      return ITEM[idx.reduce((best, i) => (REVENUE[i] > REVENUE[best] ? i : best), idx[0])];
    }),
  });

  const flattened = df({
    category: cats,
    revenue_sum: cats.map((c) => sum(rowsFor(c), REVENUE)),
    revenue_mean: cats.map((c) => mean(rowsFor(c), REVENUE)),
    qty_sum: cats.map((c) => sum(rowsFor(c), QTY)),
  });

  const steps: Step[] = [
    {
      id: "single", label: "One metric is rarely enough",
      views: [{ frame: single, title: "groupby('category')['revenue'].sum()", badge: "1 number per group" }],
      explain: "A single aggregation answers a single question. Every real report wants several at once - total AND average AND how many rows went into each - and running three separate groupbys re-splits the data three times.",
    },
    {
      id: "list", label: "A list of functions",
      views: [{ frame: listAgg, title: ".agg(['sum', 'mean', 'count'])", highlights: hlHeaders([0, 1, 2], "match"), badge: "3 columns" }],
      explain: "Pass a list and each function becomes a column, computed in one pass over the groups. The column names come from the function names, which is convenient here and a problem in the next step.",
    },
    {
      id: "dict", label: "Different functions per column",
      views: [{ frame: dictAgg, title: ".agg({'revenue': ['sum','mean'], 'qty': 'sum'})", badge: "MultiIndex columns" }],
      explain: "A dict aggregates each column differently. But now the columns have two levels - the outer names the source column, the inner the function - and 'sum' appears twice. Referring to a column means writing df[('revenue', 'sum')], which is where this style stops being pleasant.",
      variables: [{ name: "result.columns.nlevels", type: "int", preview: "2" }],
    },
    {
      id: "named", label: "Named aggregation: the one to learn",
      views: [{ frame: named, title: ".agg(total_revenue=('revenue','sum'), ...)", highlights: hlHeaders([1, 2, 3, 4], "new"), badge: "flat, named columns" }],
      explain: "Named aggregation takes new_name=(column, function) pairs and gives you flat, meaningful column names immediately. No MultiIndex, no flattening step, and the name says what the number means rather than which function produced it. Default to this.",
    },
    {
      id: "custom", label: "Custom functions",
      views: [{ frame: custom, title: "lambda inside agg", highlights: hlHeaders([1, 2], "changed"), badge: "any callable" }],
      explain: "Any function that takes a Series and returns a scalar works, including a lambda. Here one computes the spread between the best and worst item in each category, the other picks the top item's name. Built-in strings ('sum', 'mean') are faster - reach for a lambda only when nothing built in fits.",
    },
    {
      id: "count-vs-size", label: "count vs size vs nunique",
      views: [{ frame: listAgg, title: "counting things", highlights: hlCols([2], cats.length, "match"), badge: "three different counts" }],
      explain: "count() counts NON-NULL values, so it silently reports fewer rows when data is missing. size() counts every row including nulls. nunique() counts distinct values. Picking the wrong one is a quiet bug: your group sizes look right until a column has NaNs.",
      variables: [
        { name: "g['revenue'].count()", type: "int", preview: "non-null only" },
        { name: "g.size()", type: "int", preview: "all rows" },
      ],
    },
    {
      id: "flatten", label: "Flattening MultiIndex columns",
      views: [{ frame: flattened, title: "columns joined with '_'", highlights: hlHeaders([1, 2, 3], "new"), badge: "flat again" }],
      explain: "If you do end up with two-level columns, flatten them with a join: df.columns = ['_'.join(c).strip('_') for c in df.columns]. Worth knowing, because pivot_table and describe() hand you MultiIndex columns whether you asked for them or not.",
    },
    {
      id: "reset", label: "Finish flat",
      views: [{ frame: named, title: "the shape to hand onward", badge: "ready to merge or plot" }],
      explain: "Named aggregation plus as_index=False (or a trailing reset_index) gives an ordinary frame: flat columns, integer index, meaningful names. That is the shape every downstream step - merge, plot, to_csv - expects.",
    },
  ];

  return (
    <PageShell meta={PAGES["agg-patterns"]}>
      <StepRunner runId="agg-patterns" steps={steps} code={`g = orders.groupby("category")

g["revenue"].agg(["sum", "mean", "count"])          # list -> one column each

g.agg({"revenue": ["sum", "mean"], "qty": "sum"})   # dict -> MultiIndex columns

# Named aggregation: flat names, says what the number MEANS. Prefer this.
orders.groupby("category", as_index=False).agg(
    total_revenue=("revenue", "sum"),
    avg_revenue=("revenue", "mean"),
    units=("qty", "sum"),
    n_items=("item", "count"),
)

# Custom: any Series -> scalar callable
g["revenue"].agg(lambda s: s.max() - s.min())

# count = non-null, size = all rows, nunique = distinct
g["revenue"].count();  g.size();  g["item"].nunique()

# Flattening two-level columns, when you inherit them
df.columns = ["_".join(c).strip("_") for c in df.columns]`} />
    </PageShell>
  );
}

// 16. Transform vs Apply vs Filter

export function TransformApplyFilterPage() {
  const catTotal = (c: string) => REVENUE.filter((_, i) => CATEGORY[i] === c).reduce((a, b) => a + b, 0);
  const groupColors = hlByGroup(CATEGORY, NCOL);

  const cats = [...new Set(CATEGORY)].sort();
  const collapsed = withIndex(df({ revenue: cats.map((c) => catTotal(c)) }), cats, ["category"]);

  const broadcast = df({
    item: ITEM, category: CATEGORY, revenue: REVENUE,
    cat_total: CATEGORY.map((c) => catTotal(c)),
  });
  const withPct = df({
    item: ITEM, category: CATEGORY, revenue: REVENUE,
    cat_total: CATEGORY.map((c) => catTotal(c)),
    pct_of_cat: REVENUE.map((v, i) => Math.round((v / catTotal(CATEGORY[i])) * 1000) / 10),
  });

  // filter: keep groups with more than one item
  const keptRows = CATEGORY.map((c, i) => (CATEGORY.filter((x) => x === c).length > 1 ? i : -1)).filter((i) => i >= 0);
  const filterHl: HighlightMap = {};
  CATEGORY.forEach((c, r) => {
    const keep = CATEGORY.filter((x) => x === c).length > 1;
    for (let cc = 0; cc < NCOL; cc++) filterHl[`${r}:${cc}`] = keep ? "mask-true" : "mask-false";
  });
  const filtered = df({
    item: keptRows.map((i) => ITEM[i]),
    category: keptRows.map((i) => CATEGORY[i]),
    revenue: keptRows.map((i) => REVENUE[i]),
  });

  const shapes = df({
    method: ["agg", "transform", "apply", "filter"],
    returns: ["one row per group", "same shape as input", "whatever you return", "a subset of the ROWS"],
    use_for: ["summaries", "columns relative to the group", "anything else", "dropping whole groups"],
  });

  const steps: Step[] = [
    {
      id: "goal", label: "The question",
      views: [{ frame: ORDERS, title: "orders", highlights: groupColors, badge: "what % of its category is each item?" }],
      explain: "Each item's share of its own category's revenue. The denominator is a group-level number, but the answer belongs on every original row - so an aggregation alone cannot produce it.",
    },
    {
      id: "agg-collapses", label: "agg collapses",
      views: [{ frame: collapsed, title: "groupby('category')['revenue'].sum()", badge: "3 rows, not 8" }],
      explain: "agg returns one row per group. You now have the denominators but lost the rows you needed to attach them to. Joining this back onto the original frame works, but it is two steps and a merge.",
      variables: [{ name: "len(result)", type: "int", preview: `${cats.length}  (input was 8)` }],
    },
    {
      id: "transform", label: "transform broadcasts back",
      views: [{ frame: broadcast, title: "groupby('category')['revenue'].transform('sum')", highlights: hlCols([3], 8, "new"), badge: "8 rows, same as input" }],
      explain: "transform computes per group, then broadcasts the group's result back onto every row of that group. Same length as the input, so it drops straight into the frame as a new column. Look at the repeats: every Coffee row carries the same category total.",
    },
    {
      id: "pct", label: "Now the division works",
      views: [{ frame: withPct, title: "revenue / cat_total * 100", highlights: hlCols([4], 8, "new"), badge: "% of category" }],
      explain: "With both numbers on the same row it is ordinary arithmetic. This pattern - transform for the denominator, then divide - covers share-of-total, deviation from group mean, and z-scores within a group.",
    },
    {
      id: "apply", label: "apply is the escape hatch",
      views: [{ frame: withPct, title: ".apply(custom_fn)", badge: "any shape out" }],
      explain: "apply hands your function the whole group as a DataFrame and accepts any shape back - a scalar, a Series, a frame. Maximum flexibility, and the slowest of the three because it runs Python per group. Use it when neither agg nor transform fits, not as a default.",
    },
    {
      id: "filter", label: "filter drops whole groups",
      views: [{ frame: ORDERS, title: "orders", highlights: filterHl, badge: "keep groups with > 1 item" }],
      explain: "filter asks a yes/no question of each group and keeps or discards the group ENTIRELY. Note what is being tested: not individual rows, but the group as a whole. Juice has a single item, so the whole Juice group goes.",
    },
    {
      id: "filtered", label: "The result",
      views: [{ frame: filtered, title: ".filter(lambda g: len(g) > 1)", badge: `${filtered.data.length} rows` }],
      explain: "Every remaining row comes from a group that passed. This is how you drop groups too small to be meaningful - categories with one sale, users with one session, cohorts below a size threshold.",
    },
    {
      id: "summary", label: "Which one do I want?",
      views: [{ frame: shapes, title: "choosing", highlights: { "1:*": "new" }, badge: "by output shape" }],
      explain: "Choose by the SHAPE you need back. One row per group is agg. Same shape as the input is transform. A subset of rows is filter. Anything else is apply - and if you are reaching for apply often, check whether transform would do it faster.",
    },
  ];

  return (
    <PageShell meta={PAGES["transform-apply-filter"]}>
      <StepRunner runId="transform-apply-filter" steps={steps} code={`g = orders.groupby("category")

g["revenue"].sum()                      # agg      -> one row per group
g["revenue"].transform("sum")           # transform-> SAME shape as input
g.apply(lambda grp: ...)                # apply    -> any shape you return
g.filter(lambda grp: len(grp) > 1)      # filter   -> a subset of the rows

# The share-of-group pattern
orders["cat_total"]  = g["revenue"].transform("sum")
orders["pct_of_cat"] = orders["revenue"] / orders["cat_total"] * 100

# Deviation from the group mean, same idea
orders["vs_avg"] = orders["revenue"] - g["revenue"].transform("mean")`} />
    </PageShell>
  );
}

// 18. Window Ops in Groups

export function WindowGroupsPage() {
  const groupColors = hlByGroup(CATEGORY, NCOL);

  // Dense rank within each category, highest revenue first.
  const rank = REVENUE.map((v, i) => {
    const peers = REVENUE.filter((_, j) => CATEGORY[j] === CATEGORY[i]);
    return peers.filter((p) => p > v).length + 1;
  });

  // Running total within each category, in row order.
  const running: number[] = [];
  const seen = new Map<string, number>();
  CATEGORY.forEach((c, i) => {
    const acc = (seen.get(c) ?? 0) + REVENUE[i];
    seen.set(c, acc);
    running.push(acc);
  });

  const withRank = df({ item: ITEM, category: CATEGORY, revenue: REVENUE, rank_in_cat: rank });
  const withCum = df({ item: ITEM, category: CATEGORY, revenue: REVENUE, running_total: running });

  const topRows = rank.map((r, i) => (r === 1 ? i : -1)).filter((i) => i >= 0);
  const topHl: HighlightMap = {};
  rank.forEach((r, i) => {
    for (let c = 0; c < 4; c++) topHl[`${i}:${c}`] = r === 1 ? "mask-true" : "mask-false";
  });
  const topPerCat = df({
    item: topRows.map((i) => ITEM[i]),
    category: topRows.map((i) => CATEGORY[i]),
    revenue: topRows.map((i) => REVENUE[i]),
  });

  const steps: Step[] = [
    {
      id: "setup", label: "Ranking needs a scope",
      views: [{ frame: ORDERS, title: "orders", highlights: groupColors, badge: "rank within category" }],
      explain: "A global ranking of these items would be dominated by Coffee. The useful question is almost always ranked WITHIN a group: best seller per category, top user per region, biggest order per month.",
    },
    {
      id: "rank", label: "rank inside each group",
      views: [{ frame: withRank, title: "groupby('category')['revenue'].rank(ascending=False)", highlights: hlCols([3], 8, "new"), badge: "1 = best in its category" }],
      explain: "The rank restarts at 1 for every group. Juice's only item ranks 1 despite being the smallest number in the frame - it is first among its own peers, which is exactly what a per-group ranking means.",
    },
    {
      id: "methods", label: "Ties: method matters",
      views: [{ frame: withRank, title: "rank(method=...)", highlights: hlCols([3], 8, "match"), badge: "dense / min / first" }],
      explain: "With ties, 'min' gives 1,1,3 (leaves a gap), 'dense' gives 1,1,2 (no gap), 'first' breaks ties by row order, and the default 'average' can hand you 1.5 - a rank that is not an integer, which breaks any code that indexes by it.",
    },
    {
      id: "topn", label: "Top-N per group",
      views: [{ frame: ORDERS, title: "orders", highlights: topHl, badge: "rank == 1" }],
      explain: "Filtering on the rank is the standard top-N-per-group recipe: add the rank, then keep rank <= N. Change one number and it becomes top 3 per category.",
    },
    {
      id: "topn-result", label: "The winners",
      views: [{ frame: topPerCat, title: "orders[orders['rank_in_cat'] == 1]", badge: "one per category" }],
      explain: "One row per category, each the best seller in its own group. Doing this with groupby().max() would give you the max revenue but lose which ITEM it was - the rank-and-filter approach keeps the whole row.",
    },
    {
      id: "cumsum", label: "Running totals per group",
      views: [{ frame: withCum, title: "groupby('category')['revenue'].cumsum()", highlights: hlCols([3], 8, "new"), badge: "resets per group" }],
      explain: "cumsum accumulates down the rows and restarts at every group boundary. Watch the Coffee rows climb while Tea starts over from its own first value. This is how you build per-user running balances or per-region cumulative sales.",
    },
    {
      id: "order", label: "The trap: row order is the window",
      views: [{ frame: withCum, title: "unsorted input", highlights: hlCols([3], 8, "drop"), badge: "meaningless without a sort" }],
      explain: "cumsum, shift, pct_change and rank(method='first') all depend on ROW ORDER. A running total over unsorted rows is a running total of nothing. Sort by your time or sequence column before any of them - groupby preserves within-group order, it does not create one.",
    },
    {
      id: "family", label: "The rest of the family",
      views: [{ frame: withRank, title: "same pattern, different function", badge: "cummax, pct_change, shift" }],
      explain: "Everything here follows one shape: df.groupby(key)[col].WINDOW_FN(). cumsum and cummax for running totals and records, pct_change for growth, shift for lags, rolling for moving averages within each group. Learn the shape once and the whole family follows.",
    },
  ];

  return (
    <PageShell meta={PAGES["window-groups"]}>
      <StepRunner runId="window-groups" steps={steps} code={`orders = orders.sort_values(["category", "revenue"])   # order IS the window

g = orders.groupby("category")["revenue"]

orders["rank_in_cat"]   = g.rank(ascending=False, method="dense")
orders["running_total"] = g.cumsum()
orders["best_so_far"]   = g.cummax()
orders["growth"]        = g.pct_change()

# Top-N per group: rank, then filter
orders[orders["rank_in_cat"] <= 1]

# Rolling windows work per group too
orders.groupby("category")["revenue"].rolling(2).mean()`} />
    </PageShell>
  );
}
