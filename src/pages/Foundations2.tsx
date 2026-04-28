import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, takeRows, cloneFrame, hlCols, hlRows, hlMerge } from "@/lib/dataframe";
import type { Step, HighlightMap } from "@/types";

const COFFEE = df({
  drink: ["Latte", "Espresso", "Mocha", "Cappuccino", "Americano", "Cold Brew"],
  size: ["L", "S", "L", "M", "M", "L"],
  price: [280, 180, 320, 250, 200, 300],
  qty: [45, 72, 31, 55, 40, 38],
  rating: [4.5, 4.2, 4.8, 4.3, 3.9, 4.6],
});

// ═══ 6. Sorting & Top-N ════════════════════════════════════

export function SortingTopNPage() {
  const byPrice = takeRows(COFFEE, [2, 5, 0, 3, 4, 1]); // 320,300,280,250,200,180
  const top3 = takeRows(COFFEE, [2, 5, 0]); // Mocha, Cold Brew, Latte

  const steps: Step[] = [
    { id: "start", label: "Original order", views: [{ frame: COFFEE, title: "df" }],
      explain: "Rows are in insertion order. We want them sorted by price descending." },
    { id: "sort", label: "sort_values(ascending=False)", views: [
        { frame: byPrice, title: "sorted", highlights: hlCols([2], 6), badge: "price ↓" },
      ], explain: "Rows reorder but index labels (0–5) travel with them. Mocha (320) is now first. To reset: .reset_index(drop=True).",
      variables: [{ name: "result.index", type: "Int64Index", preview: "[2, 5, 0, 3, 4, 1]" }] },
    { id: "multi", label: "Multi-column sort", views: [
        { frame: takeRows(COFFEE, [1, 4, 3, 0, 5, 2]), title: "by size ↑, price ↓", highlights: hlMerge(hlCols([1], 6), hlCols([2], 6, "changed")), badge: "ties broken by price" },
      ], explain: "ascending=[True, False] — first sort by size alphabetically, then within each size, sort by price descending." },
    { id: "topn", label: "nlargest(3, 'price')", views: [
        { frame: top3, title: "top 3 by price", badge: "faster than sort + head" },
      ], explain: "nlargest uses a partial sort — O(n log k) instead of O(n log n). For top-3 from a million rows, that's a real difference." },
  ];

  return (
    <PageShell meta={PAGES["sorting-topn"]}>
      <StepRunner runId="sorting-topn" code={`df.sort_values("price", ascending=False)

df.sort_values(["size", "price"], ascending=[True, False])

df.nlargest(3, "price")     # faster than sort + head
df.nsmallest(3, "rating")`} steps={steps} />
    </PageShell>
  );
}

// ═══ 7. Basic Aggregation ══════════════════════════════════

export function BasicAggPage() {
  const aggResult = df(
    { price: [1530, 255, 180, 320], qty: [281, 46.83, 31, 72], rating: [26.3, 4.38, 3.9, 4.8] },
    { index: ["sum", "mean", "min", "max"] },
  );

  const steps: Step[] = [
    { id: "single", label: "Single aggregation", views: [
        { frame: df({ result: [255] }, { index: ["price.mean()"] }), title: "scalar", badge: "₹255" },
      ], explain: "One column + one function = one number. NaN is silently skipped by default.",
      variables: [{ name: "df['price'].mean()", type: "float", preview: "255.0" }] },
    { id: "multi", label: ".agg() — multiple at once", views: [
        { frame: aggResult, title: "df[['price','qty','rating']].agg([...])", badge: "4 metrics × 3 cols" },
      ], explain: "Pass a list of function names to .agg() — each becomes a row. Much cleaner than calling .sum(), .mean(), .min(), .max() separately." },
    { id: "describe", label: ".describe() — the shortcut", views: [
        { frame: df(
          { price: [6, 255, 56.4, 180, 210, 265, 305, 320], qty: [6, 46.83, 14.7, 31, 37.5, 47.5, 58.75, 72] },
          { index: ["count", "mean", "std", "min", "25%", "50%", "75%", "max"] },
        ), title: "df.describe()", badge: "numeric summary" },
      ], explain: ".describe() gives count, mean, std, min, quartiles, max for all numeric columns in one call. Your first stop after loading any dataset." },
  ];

  return (
    <PageShell meta={PAGES["basic-agg"]}>
      <StepRunner runId="basic-agg" code={`df["price"].mean()       # single column → scalar
df["price"].sum()
df["qty"].count()        # non-null count

# Multiple aggregations at once
df[["price", "qty", "rating"]].agg(["sum", "mean", "min", "max"])

df.describe()            # shortcut: count/mean/std/min/q/max`} steps={steps} />
    </PageShell>
  );
}

// ═══ 8. Working with Dates ═════════════════════════════════

export function DatesPage() {
  const orders = df({
    order_id: ["A01", "A02", "A03", "A04", "A05"],
    date_str: ["2024-01-15", "2024-03-22", "2024-03-24", "2024-10-11", "2024-12-01"],
    amount: [499, 999, 149, 2499, 780],
  });

  const extracted = df({
    order_id: ["A01", "A02", "A03", "A04", "A05"],
    year: [2024, 2024, 2024, 2024, 2024],
    month: [1, 3, 3, 10, 12],
    day_name: ["Monday", "Friday", "Sunday", "Friday", "Sunday"],
  });
  const extractHl: HighlightMap = {};
  for (let r = 0; r < 5; r++) { extractHl[`${r}:1`] = "new"; extractHl[`${r}:2`] = "new"; extractHl[`${r}:3`] = "new"; }

  const steps: Step[] = [
    { id: "parse", label: "pd.to_datetime", views: [
        { frame: orders, title: "df", highlights: hlCols([1], 5, "changed"), badge: "string → datetime64" },
      ], explain: "The column looks the same visually, but its dtype changed from 'object' to datetime64[ns]. Only then do .dt methods work." },
    { id: "extract", label: ".dt accessor", views: [
        { frame: extracted, title: "extracted components", highlights: extractHl, badge: "year · month · day_name" },
      ], explain: ".dt.year, .dt.month, .dt.day_name() pull parts from each timestamp. These become regular int/string columns you can groupby or filter." },
    { id: "groupby-month", label: "Monthly revenue", views: [
        { frame: df({ month: [1, 3, 10, 12], total_amount: [499, 1148, 2499, 780] }), title: "grouped by month", badge: "4 groups" },
      ], explain: "The classic pattern: parse → extract month → groupby month → sum. Now you can plot monthly revenue.",
      variables: [{ name: "monthly", type: "DataFrame", preview: "4 rows × 2 columns" }] },
  ];

  return (
    <PageShell meta={PAGES["dates"]}>
      <StepRunner runId="dates" code={`df["date"] = pd.to_datetime(df["date_str"])

df["year"]     = df["date"].dt.year
df["month"]    = df["date"].dt.month
df["day_name"] = df["date"].dt.day_name()

monthly = df.groupby("month")["amount"].sum().reset_index()`} steps={steps} />
    </PageShell>
  );
}

// ═══ 9. Missing Data Basics ════════════════════════════════

export function MissingBasicsPage() {
  const withNa = df({
    student: ["Aarav", "Priya", "Ishaan", "Diya", "Kabir"],
    score: [91, null, 74, 95, null],
    grade: ["A", "B", null, "A", "B"],
  });
  const nullHl: HighlightMap = { "1:1": "null", "4:1": "null", "2:2": "null" };

  const dropped = takeRows(withNa, [0, 3]);
  const filled = cloneFrame(withNa);
  filled.data[1][1] = 86.67; filled.data[4][1] = 86.67;
  filled.data[2][2] = "Unknown";
  const filledHl: HighlightMap = { "1:1": "changed", "4:1": "changed", "2:2": "changed" };

  const steps: Step[] = [
    { id: "detect", label: "Detect NaN", views: [
        { frame: withNa, title: "df", highlights: nullHl, badge: "3 NaN cells" },
      ], explain: "Orange cells are NaN. df.isna().sum() shows: score has 2 nulls, grade has 1.",
      variables: [{ name: "df.isna().sum()", type: "Series", preview: "student 0, score 2, grade 1" }] },
    { id: "drop", label: "dropna()", views: [
        { frame: withNa, title: "before", highlights: { "1:*": "drop", "2:*": "drop", "4:*": "drop" } },
        { frame: dropped, title: "after dropna()", badge: "2 rows remain" },
      ], explain: "Drops any row with at least one NaN. Aggressive — 3 of 5 rows had a NaN. Use subset=['score'] to only check specific columns." },
    { id: "fill", label: "fillna() per column", views: [
        { frame: filled, title: "after fillna", highlights: filledHl, badge: "3 cells filled" },
      ], explain: "Numeric column → mean (86.67). Categorical → a sentinel 'Unknown'. Pick a strategy per column — a blanket fill is rarely right." },
  ];

  return (
    <PageShell meta={PAGES["missing-basics"]}>
      <StepRunner runId="missing-basics" code={`df.isna().sum()          # count NaN per column

df.dropna()              # drop rows with any NaN
df.dropna(subset=["score"])  # only check 'score' column

df["score"].fillna(df["score"].mean())    # numeric → mean
df["grade"].fillna("Unknown")             # categorical → label`} steps={steps} />
    </PageShell>
  );
}

// ═══ 10. Chaining vs Intermediates ═════════════════════════

export function ChainingPage() {
  const result = df(
    { avg_price: [300, 250] },
    { index: ["L", "M"] },
  );

  const steps: Step[] = [
    { id: "chain", label: "Method chain", views: [
        { frame: result, title: "chained result", badge: "one pipeline" },
      ], explain: "Each method returns a new DataFrame/Series, so you chain them: query → groupby → agg → sort → reset_index. Reads like a recipe, top to bottom." },
    { id: "intermediate", label: "Intermediate variables", views: [
        { frame: takeRows(COFFEE, [0, 2, 3, 5]), title: "step 1: filtered", badge: "price > 200" },
        { frame: result, title: "step 2: grouped", badge: "avg per size" },
      ], explain: "Same result, two named variables. Easier to inspect midway. Better when debugging or when a mid-step is reused later." },
    { id: "when", label: "When to choose", views: [
        { frame: df({ style: ["Chain", "Chain", "Variables", "Variables"], criterion: ["Linear pipeline", "One-shot transform", "Need to inspect mid-step", "Mid-step reused elsewhere"] }), title: "decision guide" },
      ], explain: "Chain when the pipeline is linear and short (< 5 methods). Break into variables when you need to debug, reuse, or the chain exceeds 5-6 methods." },
  ];

  return (
    <PageShell meta={PAGES["chaining"]}>
      <StepRunner runId="chaining" code={`# Chained — reads like a recipe
result = (
    df
    .query("price > 200")
    .groupby("size")["price"]
    .mean()
    .sort_values(ascending=False)
    .reset_index(name="avg_price")
)

# Intermediate variables — easier to debug
filtered = df.query("price > 200")
grouped  = filtered.groupby("size")["price"].mean()
result   = grouped.sort_values(ascending=False).reset_index(name="avg_price")`} steps={steps} />
    </PageShell>
  );
}
