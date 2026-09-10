import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, series, takeRows, takeCols, hlRows, hlCols, hlHeaders, hlMerge } from "@/lib/dataframe";
import type { Step, HighlightMap } from "@/types";

// ─── Shared dataset: Coffee shop sales ─────────────────────
const COFFEE = df({
  drink: ["Latte", "Espresso", "Mocha", "Cappuccino", "Americano", "Cold Brew"],
  size: ["L", "S", "L", "M", "M", "L"],
  price: [280, 180, 320, 250, 200, 300],
  qty: [45, 72, 31, 55, 40, 38],
  rating: [4.5, 4.2, 4.8, 4.3, 3.9, 4.6],
});

// ═══ 1. Series vs DataFrame ════════════════════════════════

export function SeriesVsDfPage() {
  const priceSeries = series("price", [280, 180, 320, 250, 200, 300]);
  const singleCol = takeCols(COFFEE, ["price"]);
  const twoCols = takeCols(COFFEE, ["drink", "price"]);
  const rowSeries = series("0", ["Latte", "L", 280, 45, 4.5], {
    index: ["drink", "size", "price", "qty", "rating"],
  });

  const steps: Step[] = [
    { id: "df", label: "A DataFrame", views: [{ frame: COFFEE, title: "sales_df", badge: "2-D table · 6 rows × 5 cols" }],
      explain: "A DataFrame is a 2-D labelled table. Every column has a name and a single dtype. The left-most integers (0–5) are the row index.", variables: [{ name: "sales_df.shape", type: "tuple", preview: "(6, 5)" }] },
    { id: "series", label: "One column → Series", views: [
        { frame: COFFEE, title: "sales_df", highlights: hlMerge(hlCols([2], 6), hlHeaders([2])), badge: "select 'price'" },
        { frame: priceSeries, title: "sales_df['price']", badge: "Series (1-D)", render: "series" },
      ], explain: "Pulling one column out gives a Series — a 1-D labelled array. Look at what the repr loses: no column header, no grid, and a dtype line at the bottom instead. It keeps the DataFrame's index, so it stays aligned with its sibling columns." },
    { id: "anatomy", label: "A Series has three parts", views: [
        { frame: priceSeries, title: "sales_df['price']", highlights: { "i:*": "match" }, badge: "index · values · dtype", render: "series",
          note: "Left column = index labels. Right = values. Footer = the name and the one dtype shared by every value." },
      ], explain: "Index, values, and a single dtype. That last part is the constraint people forget: a Series is one type all the way down, which is why mixing text into a number column silently turns the whole thing into object.",
      variables: [{ name: "sales_df['price'].dtype", type: "dtype", preview: "int64" }] },
    { id: "double-bracket", label: "One column, but double brackets", views: [
        { frame: priceSeries, title: "sales_df['price']", badge: "Series", render: "series" },
        { frame: singleCol, title: "sales_df[['price']]", badge: "DataFrame — note the header" },
      ], explain: "Same data, different container. Single brackets give a Series; a LIST inside the brackets gives a DataFrame, even when the list holds one name. This is the distinction behind half of all 'why does my code say Series has no attribute...' errors.",
      variables: [{ name: "type(sales_df['price'])", type: "class", preview: "Series" }, { name: "type(sales_df[['price']])", type: "class", preview: "DataFrame" }] },
    { id: "sub-df", label: "Multiple columns → DataFrame", views: [
        { frame: COFFEE, title: "sales_df", highlights: hlMerge(hlCols([0], 6), hlCols([2], 6), hlHeaders([0, 2])), badge: "select drink + price" },
        { frame: twoCols, title: "sales_df[['drink','price']]", badge: "still a DataFrame" },
      ], explain: "Double brackets with a list → a sub-DataFrame. Notice it's still 2-D with an index, headers, and multiple columns — and each column keeps its own dtype." },
    { id: "row", label: "One row → also a Series", views: [
        { frame: COFFEE, title: "sales_df", highlights: hlRows([0], 5), badge: "row 0" },
        { frame: rowSeries, title: "sales_df.iloc[0]", badge: "Series — index is the column names", render: "series" },
      ], explain: "Picking a single row returns a Series too, rotated: the index is now the column NAMES and the values are that row's data. Because those values mix text and numbers, the dtype collapses to object — which is why row-wise arithmetic on a mixed frame misbehaves.",
      variables: [{ name: "sales_df.iloc[0].dtype", type: "dtype", preview: "object" }] },
    { id: "df-is-dict", label: "A DataFrame is a dict of Series", views: [
        { frame: COFFEE, title: "sales_df", highlights: hlHeaders([0, 1, 2, 3, 4], "group-a"), badge: "5 Series, one shared index" },
      ], explain: "That is the whole model: a DataFrame is columns of Series glued to one common index. Every operation you will learn is either 'do something to one Series' or 'line up several Series by their index' — and alignment by index, not by position, is what makes pandas different from a spreadsheet.",
      variables: [{ name: "sales_df.dtypes", type: "Series", preview: "object, object, int64, int64, float64" }] },
  ];

  return (
    <PageShell meta={PAGES["series-vs-df"]}>
      <StepRunner runId="series-vs-df" code={`import pandas as pd

sales_df = pd.DataFrame({
    "drink": ["Latte", "Espresso", "Mocha", "Cappuccino", "Americano", "Cold Brew"],
    "size":  ["L", "S", "L", "M", "M", "L"],
    "price": [280, 180, 320, 250, 200, 300],
    "qty":   [45, 72, 31, 55, 40, 38],
    "rating":[4.5, 4.2, 4.8, 4.3, 3.9, 4.6],
})

sales_df["price"]             # one column  → Series
sales_df[["price"]]           # list of one → DataFrame (!)
sales_df[["drink", "price"]]  # list        → DataFrame
sales_df.iloc[0]              # one row     → Series, indexed by column name

sales_df["price"].dtype       # int64  — a Series is ONE dtype
sales_df.dtypes               # per-column dtypes of the whole frame`} steps={steps} />
    </PageShell>
  );
}

// ═══ 2. Selection & Indexing ═══════════════════════════════

export function SelectionPage() {
  const namedIdx = { ...COFFEE, index: COFFEE.data.map((r) => r[0] as string), columns: COFFEE.columns.slice(1), data: COFFEE.data.map((r) => r.slice(1)) };

  const steps: Step[] = [
    { id: "iloc-single", label: "iloc[0] — position", views: [
        { frame: COFFEE, title: "df", highlights: hlRows([0], 5), badge: "position 0" },
      ], explain: ".iloc uses integer positions. iloc[0] = first row regardless of index labels. Think of it as 'integer location'." },
    { id: "iloc-slice", label: "iloc[1:4] — exclusive end", views: [
        { frame: takeRows(COFFEE, [1, 2, 3]), title: "df.iloc[1:4]", badge: "3 rows (not 4!)" },
      ], explain: "Like Python slicing, the stop index is EXCLUDED. 1:4 gives positions 1, 2, 3." },
    { id: "iloc-2d", label: "iloc[:3, :2] — rows AND cols", views: [
        { frame: COFFEE, title: "df", highlights: (() => { const h: HighlightMap = {}; for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) h[`${r}:${c}`] = "match"; return h; })(), badge: "3×2 block" },
      ], explain: "Two slots: [rows, cols]. Both accept ints, slices, lists, or negative indices." },
    { id: "loc-label", label: ".loc by label", views: [
        { frame: namedIdx, title: "df.set_index('drink')", highlights: { "0:*": "match", "4:*": "match" }, badge: "look up by name" },
      ], explain: ".loc uses index labels, not positions. After set_index('drink'), loc['Latte'] finds the Latte row by hash lookup — O(1), not a scan.",
      variables: [{ name: 'df.loc["Latte"]', type: "Series", preview: "L, 280, 45, 4.5" }] },
    { id: "loc-slice", label: ".loc slice is INCLUSIVE", views: [
        { frame: namedIdx, title: 'df.loc["Espresso":"Cappuccino"]', highlights: (() => { const h: HighlightMap = {}; for (let r = 0; r < 4; r++) h[`${r}:*`] = "match"; return h; })(), badge: "4 rows — both ends included!" },
      ], explain: "The biggest gotcha: .loc slices INCLUDE both endpoints. 'Espresso':'Cappuccino' gives 4 rows, not 3." },
  ];

  return (
    <PageShell meta={PAGES["selection"]}>
      <StepRunner runId="selection" code={`df.iloc[0]                # row at position 0 → Series
df.iloc[1:4]              # positions 1,2,3 → DataFrame (end EXCLUSIVE)
df.iloc[:3, :2]           # first 3 rows, first 2 columns

df = df.set_index("drink")
df.loc["Latte"]                     # single label → Series
df.loc["Espresso":"Cappuccino"]     # label slice → INCLUSIVE at both ends`} steps={steps} />
    </PageShell>
  );
}

// ═══ 3. Comprehensions ═════════════════════════════════════

export function ComprehensionsPage() {
  const origCols = df({ columns: ["drink", "size", "price", "qty", "rating"] });
  const upperCols = df({ columns: ["DRINK", "SIZE", "PRICE", "QTY", "RATING"] });

  const steps: Step[] = [
    { id: "list", label: "List comprehension", views: [
        { frame: df({ squared: [0, 1, 4, 9, 16, 25, 36, 49] }), title: "[x**2 for x in range(8)]", badge: "8 elements" },
      ], explain: "One line builds a list from an iterable. [expression for variable in iterable]. Replaces a 3-line for-loop." },
    { id: "filter", label: "With condition", views: [
        { frame: df({ even_sq: [0, 4, 16, 36] }), title: "[x**2 for x in range(8) if x % 2 == 0]", badge: "filtered" },
      ], explain: "Add 'if condition' at the end to filter. Only elements where x % 2 == 0 survive. Equivalent to filter() + map()." },
    { id: "dict", label: "Dict comp for rename", views: [
        { frame: origCols, title: "original columns", badge: "lowercase" },
        { frame: upperCols, title: "after rename", badge: "UPPERCASE", highlights: { "*:0": "changed" } },
      ], explain: "Dict comprehension builds a mapping in one line: {col: col.upper() for col in df.columns}. Pass it to df.rename(columns=...) for a clean bulk rename.",
      variables: [{ name: "rename_map", type: "dict", preview: "{'drink':'DRINK', 'size':'SIZE', ...}" }] },
  ];

  return (
    <PageShell meta={PAGES["comprehensions"]}>
      <StepRunner runId="comprehensions" code={`# List comprehension
squares = [x**2 for x in range(8)]

# With filter
even_squares = [x**2 for x in range(8) if x % 2 == 0]

# Dict comprehension → pandas rename
rename_map = {col: col.upper() for col in df.columns}
df = df.rename(columns=rename_map)`} steps={steps} />
    </PageShell>
  );
}

// ═══ 4. Lambda, map, filter ════════════════════════════════

export function LambdaMapFilterPage() {
  const grades = df({
    drink: ["Latte", "Espresso", "Mocha", "Cappuccino", "Americano", "Cold Brew"],
    price: [280, 180, 320, 250, 200, 300],
    tier: ["Premium", "Budget", "Premium", "Standard", "Standard", "Premium"],
  });
  const tierHl: HighlightMap = {};
  for (let r = 0; r < 6; r++) tierHl[`${r}:2`] = "new";

  const filtered = df({
    drink: ["Latte", "Mocha", "Cappuccino", "Cold Brew"],
    price: [280, 320, 250, 300],
  });

  const steps: Step[] = [
    { id: "lambda", label: "lambda → apply", views: [
        { frame: grades, title: "df", highlights: tierHl, badge: "+ tier column" },
      ], explain: "lambda p: 'Premium' if p >= 280 else 'Standard' if p >= 200 else 'Budget'. This anonymous function runs once per price value via .apply()." },
    { id: "filter", label: "filter() equivalent", views: [
        { frame: COFFEE, title: "df", highlights: hlMerge(hlRows([0, 2, 3, 5], 5, "mask-true"), hlRows([1, 4], 5, "mask-false")), badge: "price >= 250" },
        { frame: filtered, title: "after filter", badge: "4 rows kept" },
      ], explain: "Python's filter(fn, iterable) keeps truthy elements. In pandas: df[df['price'] >= 250] is the vectorized equivalent — faster and more readable." },
    { id: "map", label: "map → Series.map", views: [
        { frame: df({ size: ["L", "S", "L", "M", "M", "L"], full_size: ["Large", "Small", "Large", "Medium", "Medium", "Large"] }),
          title: "map lookup", highlights: hlCols([1], 6, "new"), badge: "dict mapping" },
      ], explain: "Series.map({'S':'Small', 'M':'Medium', 'L':'Large'}) is the pandas way. It replaces each value with its dict lookup. Unmapped values become NaN." },
  ];

  return (
    <PageShell meta={PAGES["lambda-map-filter"]}>
      <StepRunner runId="lambda-map-filter" code={`# lambda with .apply()
df["tier"] = df["price"].apply(
    lambda p: "Premium" if p >= 280 else "Standard" if p >= 200 else "Budget"
)

# Vectorized filter (better than Python's filter())
expensive = df[df["price"] >= 250]

# Series.map for lookup
df["full_size"] = df["size"].map({"S": "Small", "M": "Medium", "L": "Large"})`} steps={steps} />
    </PageShell>
  );
}

// ═══ 5. Filtering Patterns ═════════════════════════════════

export function FilteringPage() {
  const mask = [true, false, true, true, false, true];
  const maskDf = df({ "price > 250": mask });
  const maskHl: HighlightMap = {};
  mask.forEach((m, r) => { maskHl[`${r}:0`] = m ? "mask-true" : "mask-false"; });

  const dfHl: HighlightMap = {};
  mask.forEach((m, r) => { for (let c = 0; c < 5; c++) dfHl[`${r}:${c}`] = m ? "mask-true" : "mask-false"; });

  const kept = takeRows(COFFEE, [0, 2, 3, 5]);

  // isin example
  const isinMask = ["L", "S", "L", "M", "M", "L"].map((s) => s === "L" || s === "S");
  const isinHl: HighlightMap = {};
  isinMask.forEach((m, r) => { for (let c = 0; c < 5; c++) isinHl[`${r}:${c}`] = m ? "mask-true" : "mask-false"; });
  const isinKept = takeRows(COFFEE, [0, 1, 2, 5]);

  const steps: Step[] = [
    { id: "mask", label: "Build a boolean mask", views: [
        { frame: maskDf, title: "mask = df['price'] > 250", highlights: maskHl, badge: "True/False per row" },
      ], explain: "Step 1: a comparison produces a Series of booleans. Green = keep, red = drop. No rows are removed yet." },
    { id: "apply-mask", label: "Apply the mask", views: [
        { frame: COFFEE, title: "df (before)", highlights: dfHl, badge: "mask applied" },
        { frame: kept, title: "df[mask] (after)", badge: "4 rows" },
      ], explain: "Step 2: pass the mask to df[...]. Only True rows survive. The index labels travel with their rows." },
    { id: "combine", label: "Combine with & | ~", views: [
        { frame: COFFEE, title: "df", highlights: (() => {
          const h: HighlightMap = {};
          COFFEE.data.forEach((r, ri) => {
            const p = r[2] as number; const rat = r[4] as number;
            const m = p > 200 && rat >= 4.3;
            for (let c = 0; c < 5; c++) h[`${ri}:${c}`] = m ? "mask-true" : "mask-false";
          });
          return h;
        })(), badge: "price>200 AND rating≥4.3" },
      ], explain: "Wrap each condition in parentheses when combining: (cond1) & (cond2). | = or, ~ = not. Without parens, Python's operator precedence silently breaks things." },
    { id: "isin", label: ".isin() for multiple values", views: [
        { frame: COFFEE, title: "df", highlights: isinHl, badge: "size in ['L','S']" },
        { frame: isinKept, title: "result", badge: "4 rows" },
      ], explain: ".isin(['L','S']) is cleaner than (size == 'L') | (size == 'S'). Works for any number of values." },
    { id: "query", label: ".query() string syntax", views: [
        { frame: kept, title: "df.query('price > 250')", badge: "same result, cleaner syntax" },
      ], explain: "String-based filtering. Use @variable to reference Python variables. For large DataFrames, query can be faster because it avoids intermediate arrays." },
  ];

  return (
    <PageShell meta={PAGES["filtering"]}>
      <StepRunner runId="filtering" code={`# Boolean mask
mask = df["price"] > 250
df[mask]

# Combine conditions — MUST use parentheses
df[(df["price"] > 200) & (df["rating"] >= 4.3)]

# .isin() for multiple values
df[df["size"].isin(["L", "S"])]

# .query() — string syntax
df.query("price > 250")
df.query("price > @threshold")   # @ references Python variable`} steps={steps} />
    </PageShell>
  );
}
