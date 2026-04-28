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
  const data = df({
    approach: ["for-loop (iterrows)", "for-loop (iloc)", "apply(lambda)", "Vectorized (col × col)", "Vectorized (np.where)"],
    time_1M_rows: ["12.4s", "8.7s", "3.2s", "0.012s", "0.015s"],
    speedup: ["1x", "1.4x", "3.9x", "~1000x", "~800x"],
  });

  const speedHl: HighlightMap = {
    "3:1": "new", "3:2": "new",
    "4:1": "new", "4:2": "new",
    "0:1": "drop", "0:2": "drop",
    "1:1": "drop", "1:2": "drop",
  };

  const steps: Step[] = [
    { id: "loop", label: "The loop approach", views: [
        { frame: data, title: "timing comparison", highlights: { "0:*": "drop", "1:*": "group-d" }, badge: "slow" },
      ], explain: "A Python for-loop over rows calls into the Python interpreter for every single row. At 1M rows that's 1M function calls — each with interpreter overhead." },
    { id: "apply", label: ".apply() — better, not great", views: [
        { frame: data, title: "timing comparison", highlights: { "2:*": "group-d" }, badge: "3-4x faster" },
      ], explain: ".apply(lambda) avoids the dict-overhead of iterrows but still calls a Python function per row. For simple operations, it's the wrong tool." },
    { id: "vectorized", label: "Vectorized — the right way", views: [
        { frame: data, title: "timing comparison", highlights: speedHl, badge: "~1000x faster" },
      ], explain: "df['c'] = df['a'] * df['b'] compiles to a single numpy C loop. 1M multiplications in 12ms. The mental shift: think in COLUMNS, not rows." },
  ];

  return (
    <PageShell meta={PAGES["loop-vs-vec"]}>
      <StepRunner runId="loop-vs-vec" code={`# ❌ SLOW — Python loop, 1M function calls
for i, row in df.iterrows():
    df.at[i, "revenue"] = row["price"] * row["qty"]

# ⚠️ BETTER — still one function call per row
df["revenue"] = df.apply(lambda r: r["price"] * r["qty"], axis=1)

# ✅ FAST — single C loop, ~1000x faster
df["revenue"] = df["price"] * df["qty"]`} steps={steps} />
    </PageShell>
  );
}
