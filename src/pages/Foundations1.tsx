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

  // Integer labels that are deliberately not positions — the one case where
  // .loc and .iloc given the SAME integer return different rows.
  const LABELS = [3, 1, 5, 0, 4, 2];
  const shuffled = { ...takeCols(COFFEE, ["drink", "price", "rating"]), index: LABELS };
  const byLabel = LABELS.indexOf(3);          // .loc[3] → the row LABELLED 3
  const byPosition = 3;                       // .iloc[3] → the 4th row

  // Chained assignment: the copy that gets written to and thrown away.
  const PRICEY = COFFEE.data.map((r) => (r[2] as number) > 250);
  const priceyRows = PRICEY.flatMap((m, i) => (m ? [i] : []));
  const qtyCol = COFFEE.columns.findIndex((c) => c.name === "qty");
  const discounted = {
    ...COFFEE,
    data: COFFEE.data.map((r, i) => r.map((v, c) => (c === qtyCol && PRICEY[i] ? 0 : v))),
  };

  const steps: Step[] = [
    { id: "iloc-single", label: "iloc[0] — position", views: [
        { frame: COFFEE, title: "df", highlights: hlRows([0], 5), badge: "position 0" },
      ], explain: ".iloc uses integer positions. iloc[0] = first row regardless of index labels. Think of it as 'integer location'." },
    { id: "iloc-slice", label: "iloc[1:4] — exclusive end", views: [
        { frame: takeRows(COFFEE, [1, 2, 3]), title: "df.iloc[1:4]", badge: "3 rows (not 4!)" },
      ], explain: "Like Python slicing, the stop is EXCLUDED: 1:4 gives positions 1, 2, 3 — three rows, not four. Hold on to that, because .loc two steps from now does the opposite with the same-looking syntax." },
    { id: "iloc-2d", label: "iloc[:3, :2] — rows AND cols", views: [
        { frame: COFFEE, title: "df", highlights: (() => { const h: HighlightMap = {}; for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) h[`${r}:${c}`] = "match"; return h; })(), badge: "3×2 block" },
      ], explain: "Two slots, comma-separated: [rows, cols]. Each takes an int, a slice, a list, or a boolean mask. Negative positions count from the end, so .iloc[-1] is the last row — the idiom for 'the most recent record' when the frame is sorted by time." },
    { id: "loc-label", label: ".loc by label", views: [
        { frame: namedIdx, title: "df.set_index('drink')", highlights: { "0:*": "match", "4:*": "match" }, badge: "look up by name" },
      ], explain: ".loc uses index labels, not positions. After set_index('drink'), loc['Latte'] finds the Latte row by hash lookup — O(1), not a scan.",
      variables: [{ name: 'df.loc["Latte"]', type: "Series", preview: "L, 280, 45, 4.5" }] },
    { id: "loc-slice", label: ".loc slice is INCLUSIVE", views: [
        { frame: namedIdx, title: 'df.loc["Espresso":"Cappuccino"]', highlights: (() => { const h: HighlightMap = {}; for (let r = 0; r < 4; r++) h[`${r}:*`] = "match"; return h; })(), badge: "4 rows — both ends included!" },
      ], explain: "The biggest gotcha: .loc slices INCLUDE both endpoints, because a label slice cannot know what comes 'one before' the end label. 'Espresso':'Cappuccino' gives 4 rows where the equivalent .iloc slice would give 3." },
    {
      id: "bracket-two-things", label: "[] means two different things",
      views: [
        { frame: takeCols(COFFEE, ["price"]), title: "df['price']", highlights: hlHeaders([0], "match"), badge: "a string → COLUMN" },
        { frame: takeRows(COFFEE, [1, 2]), title: "df[1:3]", highlights: { "0:*": "new", "1:*": "new" }, badge: "a slice → ROWS" },
      ],
      explain: "Bare [] switches axis depending on what you hand it. A string or list of strings selects columns; a slice or a boolean mask selects rows. That inconsistency is exactly why .loc and .iloc exist - they always take [rows, cols] in that order, so you never have to remember which axis you are on.",
    },
    {
      id: "loc-int-trap", label: "When .loc and .iloc disagree",
      views: [
        { frame: shuffled, title: "df.loc[3]", highlights: { [`${byLabel}:*`]: "match", [`i:${byLabel}`]: "match" }, badge: `label 3 → row at position ${byLabel}` },
        { frame: shuffled, title: "df.iloc[3]", highlights: { [`${byPosition}:*`]: "new", [`i:${byPosition}`]: "new" }, badge: `position 3 → label ${LABELS[byPosition]}` },
      ],
      explain: "Here the index holds integers that are not positions - after a sort, a filter, or a merge, this is the normal state of a frame. The same integer 3 now means two different rows: .loc reads it as a LABEL, .iloc as a POSITION. Every 'why is this the wrong row?' bug lives here. Call .reset_index(drop=True) when you want the two to line up again.",
      variables: [{ name: "df.loc[3]['drink']", type: "str", preview: String(shuffled.data[byLabel][0]) }, { name: "df.iloc[3]['drink']", type: "str", preview: String(shuffled.data[byPosition][0]) }],
    },
    {
      id: "loc-two-slots", label: "Filter and pick a column at once",
      views: [
        { frame: COFFEE, title: "df.loc[df['price'] > 250, 'qty']", highlights: (() => {
          const h: HighlightMap = {};
          PRICEY.forEach((m, r) => { for (let c = 0; c < 5; c++) h[`${r}:${c}`] = m ? "mask-true" : "mask-false"; });
          priceyRows.forEach((r) => { h[`${r}:${qtyCol}`] = "match"; });
          return h;
        })(), badge: `${priceyRows.length} rows × 1 column` },
      ],
      explain: "A boolean mask is legal in the row slot, so one .loc call does the filtering and the column pick together. Green rows pass the mask; the highlighted cells are what actually comes back. Doing it in two steps - df[mask]['qty'] - looks identical and is the setup for the bug in the next step.",
    },
    {
      id: "chained-assignment", label: "The assignment that vanishes",
      views: [
        { frame: COFFEE, title: "df[df['price'] > 250]['qty'] = 0", highlights: (() => {
          const h: HighlightMap = {};
          priceyRows.forEach((r) => { h[`${r}:${qtyCol}`] = "drop"; });
          return h;
        })(), badge: "SettingWithCopyWarning · df unchanged" },
        { frame: discounted, title: "df.loc[df['price'] > 250, 'qty'] = 0", highlights: (() => {
          const h: HighlightMap = {};
          priceyRows.forEach((r) => { h[`${r}:${qtyCol}`] = "changed"; });
          return h;
        })(), badge: "df actually changed" },
      ],
      explain: "df[mask] may hand back a COPY. Assigning into that copy writes to a temporary object that is discarded on the next line, so the original frame keeps its old values and you get a SettingWithCopyWarning instead of an error - the left frame still reads 45, 31 and 38. One .loc call with both slots writes to the frame itself. The rule: if an assignment has two [] on the left, it is a bug.",
      variables: [{ name: "chained → df qty", type: "list", preview: priceyRows.map((r) => String(COFFEE.data[r][qtyCol])).join(", ") }, { name: ".loc → df qty", type: "list", preview: priceyRows.map(() => "0").join(", ") }],
    },
  ];

  return (
    <PageShell meta={PAGES["selection"]}>
      <StepRunner runId="selection" code={`df.iloc[0]                # row at position 0 → Series
df.iloc[1:4]              # positions 1,2,3 → DataFrame (end EXCLUSIVE)
df.iloc[:3, :2]           # first 3 rows, first 2 columns

df = df.set_index("drink")
df.loc["Latte"]                     # single label → Series
df.loc["Espresso":"Cappuccino"]     # label slice → INCLUSIVE at both ends

df["price"]               # a string  → one COLUMN
df[1:3]                   # a slice   → two ROWS  (same operator, other axis)

df.loc[df["price"] > 250, "qty"]      # mask in slot 1, column in slot 2

df[df["price"] > 250]["qty"] = 0      # writes to a COPY — silently lost
df.loc[df["price"] > 250, "qty"] = 0  # writes to the frame`} steps={steps} />
    </PageShell>
  );
}

// ═══ 3. Comprehensions ═════════════════════════════════════

export function ComprehensionsPage() {
  const COLS = ["drink", "size", "price", "qty", "rating"];
  const origCols = df({ columns: COLS });
  const upperCols = df({ columns: COLS.map((c) => c.toUpperCase()) });

  const messy = ["  Order ID ", "Customer Name", "TOTAL amount "];
  const tidy = messy.map((c) => c.trim().toLowerCase().replace(/ /g, "_"));
  const renameFrame = df({ before: messy, after: tidy });

  const numericCols = df({
    column: COLS,
    dtype: ["object", "object", "int64", "int64", "float64"],
    is_numeric: [false, false, true, true, true],
  });

  const steps: Step[] = [
    {
      id: "loop", label: "The loop it replaces",
      views: [{ frame: df({ squared: [0, 1, 4, 9] }), title: "the long way", badge: "3 lines" }],
      explain: "out = []; for x in range(8): out.append(x**2). Three lines, a throwaway variable, and the intent buried in the middle. A comprehension says the same thing in one line where the shape of the result is visible immediately.",
    },
    {
      id: "list", label: "List comprehension",
      views: [{ frame: df({ squared: [0, 1, 4, 9, 16, 25, 36, 49] }), title: "[x**2 for x in range(8)]", badge: "8 elements" }],
      explain: "Read it as: the expression, then where the values come from. [expression for variable in iterable]. The result is always a new list - the input is untouched.",
    },
    {
      id: "filter", label: "Add a condition",
      views: [{ frame: df({ even_sq: [0, 4, 16, 36] }), title: "[x**2 for x in range(8) if x % 2 == 0]", highlights: { "*:0": "mask-true" }, badge: "4 survive" }],
      explain: "A trailing if filters the input before the expression runs. Order matters when reading: the if applies to x, not to x**2. Filtering on the OUTPUT needs a different shape - build it first, then filter.",
    },
    {
      id: "ternary", label: "A conditional value is different",
      views: [{ frame: df({ label: ["even", "odd", "even", "odd"] }), title: "['even' if x % 2 == 0 else 'odd' for x in range(4)]", badge: "if BEFORE for" }],
      explain: "Two different ifs. A trailing if drops elements; an if/else BEFORE the for chooses between values and keeps every element. Same keyword, opposite effect on the length of the result - this is the comprehension mistake people make most.",
    },
    {
      id: "dict", label: "Dict comprehension for rename",
      views: [
        { frame: origCols, title: "df.columns", badge: "lowercase" },
        { frame: upperCols, title: "after rename", highlights: { "*:0": "changed" }, badge: "UPPERCASE" },
      ],
      explain: "{key: value for item in iterable} builds a mapping. df.rename(columns={c: c.upper() for c in df.columns}) renames every column in one expression, with no list of hand-typed pairs to fall out of date.",
      variables: [{ name: "rename_map", type: "dict", preview: "{'drink': 'DRINK', 'size': 'SIZE', ...}" }],
    },
    {
      id: "clean", label: "The real-world version",
      views: [{ frame: renameFrame, title: "cleaning messy headers", highlights: hlMerge(hlCols([1], 3, "new"), hlHeaders([1], "new")), badge: "strip, lower, underscore" }],
      explain: "This is the comprehension you will actually write most: normalising column names off a spreadsheet export. Strip the whitespace, lowercase, swap spaces for underscores - and now df.order_id works instead of df['  Order ID '].",
    },
    {
      id: "select-cols", label: "Selecting columns by a rule",
      views: [{ frame: numericCols, title: "[c for c in df.columns if df[c].dtype != 'object']", highlights: hlCols([2], 5, "mask-true"), badge: "a column list" }],
      explain: "Comprehensions over df.columns are how you build column lists by rule rather than by hand - every numeric column, everything ending in _id, everything except the keys. The result goes straight into df[cols].",
      variables: [{ name: "num_cols", type: "list", preview: "['price', 'qty', 'rating']" }],
    },
    {
      id: "limit", label: "Where to stop",
      views: [{ frame: numericCols, title: "not for row data", highlights: { "*:*": "drop" }, badge: "use vectorization" }],
      explain: "Comprehensions are for METADATA - column names, small lists, rename maps. Running one over a data column ([x * 2 for x in df['price']]) is a Python loop wearing a costume, and it is a thousand times slower than df['price'] * 2. Comprehensions for structure, vectorization for data.",
    },
  ];

  return (
    <PageShell meta={PAGES["comprehensions"]}>
      <StepRunner runId="comprehensions" steps={steps} code={`squares = [x**2 for x in range(8)]                    # expression, then source
evens   = [x**2 for x in range(8) if x % 2 == 0]      # trailing if: FILTERS
labels  = ["even" if x % 2 == 0 else "odd" for x in range(8)]   # if/else: CHOOSES

# Metadata work - this is where comprehensions earn their place
df = df.rename(columns={c: c.strip().lower().replace(" ", "_") for c in df.columns})

num_cols = [c for c in df.columns if df[c].dtype != "object"]
df[num_cols].describe()

# NOT for row data - this is a Python loop in disguise, ~1000x slower
# df["double"] = [x * 2 for x in df["price"]]
df["double"] = df["price"] * 2`} />
    </PageShell>
  );
}

export function LambdaMapFilterPage() {
  const DRINK = ["Latte", "Espresso", "Mocha", "Cappuccino", "Americano", "Cold Brew"];
  const PRICE = [280, 180, 320, 250, 200, 300];
  const SIZE = ["L", "S", "L", "M", "M", "L"];

  const tierOf = (p: number) => (p >= 280 ? "Premium" : p >= 200 ? "Standard" : "Budget");
  const grades = df({ drink: DRINK, price: PRICE, tier: PRICE.map(tierOf) });

  const SIZE_MAP: Record<string, string> = { S: "Small", M: "Medium", L: "Large" };
  const mapped = df({ size: SIZE, full_size: SIZE.map((s) => SIZE_MAP[s]) });
  const missingMap = df({ size: ["L", "S", "XL"], full_size: ["Large", "Small", null] });

  const filtered = df({
    drink: ["Latte", "Mocha", "Cappuccino", "Cold Brew"],
    price: [280, 320, 250, 300],
  });

  const npWhere = df({ drink: DRINK, price: PRICE, tier: PRICE.map(tierOf) });

  const steps: Step[] = [
    {
      id: "lambda", label: "lambda is just a function",
      views: [{ frame: df({ input: [180, 250, 320], output: ["Budget", "Standard", "Premium"] }), title: "lambda p: ...", badge: "one expression, no name" }],
      explain: "lambda x: <expression> is a function with no name and no return statement - the expression IS the return value. That is the whole feature. It exists so you can pass a small function somewhere without defining one above.",
    },
    {
      id: "apply", label: "apply runs it per element",
      views: [{ frame: grades, title: "df['price'].apply(lambda p: ...)", highlights: hlMerge(hlCols([2], 6, "new"), hlHeaders([2], "new")), badge: "+ tier column" }],
      explain: ".apply calls your function once for every value and collects the results. It is the universal escape hatch - anything you can express in Python, you can apply. That flexibility is also its cost: a Python call per row.",
    },
    {
      id: "map-dict", label: "Series.map takes a dict",
      views: [{ frame: mapped, title: "df['size'].map({'S':'Small', 'M':'Medium', 'L':'Large'})", highlights: hlMerge(hlCols([1], 6, "new"), hlHeaders([1], "new")), badge: "lookup, not a function" }],
      explain: "For a straight value-to-value translation, skip the lambda entirely and hand map a dict. It is faster than apply, and the mapping is data you can inspect, reuse, and store in a config file rather than logic buried in a lambda.",
    },
    {
      id: "map-missing", label: "Unmapped values become NaN",
      views: [{ frame: missingMap, title: "'XL' is not in the dict", highlights: { "2:1": "null" }, badge: "silent NaN" }],
      explain: "A value missing from the dict maps to NaN - no error, no warning. Check with .isna().sum() afterwards, or use .replace() instead, which leaves unmatched values alone rather than blanking them.",
    },
    {
      id: "filter", label: "Python filter vs a boolean mask",
      views: [
        { frame: COFFEE, title: "df", highlights: hlMerge(hlRows([0, 2, 3, 5], 5, "mask-true"), hlRows([1, 4], 5, "mask-false")), badge: "price >= 250" },
        { frame: filtered, title: "df[df['price'] >= 250]", badge: "4 rows" },
      ],
      explain: "Python's filter(fn, iterable) has a pandas equivalent you should use instead: a boolean mask. df[df['price'] >= 250] is vectorized, reads better, and keeps the index intact. filter() on a Series works and is simply worse.",
    },
    {
      id: "vectorize", label: "Most lambdas have a faster twin",
      views: [{ frame: npWhere, title: "np.select instead of apply", highlights: hlMerge(hlCols([2], 6, "new"), hlHeaders([2], "new")), badge: "same column, no Python" }],
      explain: "That tier lambda is a chain of conditions, and np.select expresses it without per-row Python. Identical output, roughly 100x faster on a large frame. Before reaching for apply, check whether np.where, np.select, .map, .str or .dt already covers it.",
      bars: {
        title: "Deriving tier on 1M rows",
        bars: [
          { label: "apply(lambda)", value: 2800, display: "2.8 s", tone: "slow" },
          { label: "np.select", value: 24, display: "24 ms", tone: "fast" },
        ],
      },
    },
    {
      id: "axis", label: "apply(axis=1) is the slow one",
      views: [{ frame: grades, title: "df.apply(lambda r: ..., axis=1)", highlights: { "*:*": "drop" }, badge: "a Series per row" }],
      explain: "Applying across rows builds a whole Series object for every row before your function even runs. If the function only combines a few columns, do the arithmetic on the columns directly - df['price'] * df['qty'] rather than a row lambda that multiplies two fields.",
    },
    {
      id: "when", label: "When a lambda is right",
      views: [{ frame: grades, title: "genuinely irregular logic", badge: "the honest use" }],
      explain: "Some things have no vectorized form: calling an external API, parsing an irregular string, logic with real branching. Use apply there without guilt - and name the function instead of inlining a lambda once it needs a comment. Readable beats clever when the operation is slow either way.",
    },
  ];

  return (
    <PageShell meta={PAGES["lambda-map-filter"]}>
      <StepRunner runId="lambda-map-filter" steps={steps} code={`# lambda = an unnamed function whose expression IS the return value
df["tier"] = df["price"].apply(
    lambda p: "Premium" if p >= 280 else "Standard" if p >= 200 else "Budget"
)

# Same result, no Python per row - ~100x faster
df["tier"] = np.select(
    [df["price"] >= 280, df["price"] >= 200], ["Premium", "Standard"], default="Budget"
)

df["full_size"] = df["size"].map({"S": "Small", "M": "Medium", "L": "Large"})
df["full_size"].isna().sum()      # unmapped values became NaN, silently

expensive = df[df["price"] >= 250]     # a mask, not filter()

# axis=1 builds a Series per row - avoid when column arithmetic would do
# df.apply(lambda r: r["price"] * r["qty"], axis=1)
df["price"] * df["qty"]`} />
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

  // .between — derived, so the badge can never disagree with the highlights.
  const LO = 200, HI = 300;
  const PRICES = COFFEE.data.map((r) => r[2] as number);
  const betweenMask = PRICES.map((p) => p >= LO && p <= HI);
  const betweenRows = betweenMask.flatMap((m, i) => (m ? [i] : []));
  const betweenHl: HighlightMap = {};
  betweenMask.forEach((m, r) => { for (let c = 0; c < 5; c++) betweenHl[`${r}:${c}`] = m ? "mask-true" : "mask-false"; });

  // A rating that never arrived. Every comparison against it is False.
  const RATINGS = COFFEE.data.map((r) => r[4] as number);
  const gapAt = 4;
  const ratingsWithGap = RATINGS.map((v, i) => (i === gapAt ? null : v));
  const ratingCol = COFFEE.columns.findIndex((c) => c.name === "rating");
  const withGap = {
    ...COFFEE,
    data: COFFEE.data.map((r, i) => r.map((v, c) => (c === ratingCol && i === gapAt ? null : v))),
  };
  const THRESH = 4.3;
  const gapMask = ratingsWithGap.map((v) => v !== null && v >= THRESH);
  const gapHl: HighlightMap = {};
  gapMask.forEach((m, r) => { for (let c = 0; c < 5; c++) gapHl[`${r}:${c}`] = m ? "mask-true" : "mask-false"; });
  gapHl[`${gapAt}:${ratingCol}`] = "null";
  const belowMask = ratingsWithGap.map((v) => v !== null && v < THRESH);
  const belowHl: HighlightMap = {};
  belowMask.forEach((m, r) => { for (let c = 0; c < 5; c++) belowHl[`${r}:${c}`] = m ? "mask-true" : "mask-false"; });
  belowHl[`${gapAt}:${ratingCol}`] = "null";
  const keptCount = gapMask.filter(Boolean).length;
  const belowCount = belowMask.filter(Boolean).length;
  const rowsWord = (n: number) => `${n} row${n === 1 ? "" : "s"} kept`;

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
      ], explain: "String-based filtering: the column names are read from the frame, so there is no df[...] noise repeated in every condition. Use @variable to reach a Python variable and backticks for column names with spaces. On a large frame it can also be faster, because it evaluates the expression without materialising an intermediate boolean array per condition." },
    {
      id: "between", label: ".between() for a range",
      views: [
        { frame: COFFEE, title: `df['price'].between(${LO}, ${HI})`, highlights: betweenHl, badge: `${betweenRows.length} rows · both ends included` },
      ],
      explain: `Two comparisons collapse into one call: .between(${LO}, ${HI}) is (price >= ${LO}) & (price <= ${HI}). Note that it is INCLUSIVE on both sides by default - the ${LO} and the ${HI} are both in - which is the opposite of a Python range and catches people out on bucket boundaries. Pass inclusive='neither' or 'left' when you need the other behaviour.`,
    },
    {
      id: "precedence", label: "Why the parentheses matter",
      views: [
        { frame: COFFEE, title: "df[df['price'] > 200 & df['rating'] >= 4.3]", highlights: hlRows([], 5), badge: "TypeError / wrong rows" },
        { frame: COFFEE, title: "df[(df['price'] > 200) & (df['rating'] >= 4.3)]", highlights: (() => {
          const h: HighlightMap = {};
          COFFEE.data.forEach((r, ri) => {
            const m = (r[2] as number) > 200 && (r[4] as number) >= 4.3;
            for (let c = 0; c < 5; c++) h[`${ri}:${c}`] = m ? "mask-true" : "mask-false";
          });
          return h;
        })(), badge: "what you meant" },
      ],
      explain: "& binds TIGHTER than > in Python, so the un-parenthesised version is read as price > (200 & df['rating']) >= 4.3 - it compares against the wrong thing entirely and usually raises TypeError. Every condition gets its own parentheses. And use & / | / ~, never and / or / not: the keywords ask a whole Series for one True/False and raise 'truth value of a Series is ambiguous'.",
    },
    {
      id: "nan-mask", label: "NaN is never True",
      views: [
        { frame: withGap, title: `df['rating'] >= ${THRESH}`, highlights: gapHl, badge: rowsWord(keptCount) },
        { frame: withGap, title: `df['rating'] < ${THRESH}`, highlights: belowHl, badge: rowsWord(belowCount) },
      ],
      explain: `Americano's rating never arrived. Every comparison against NaN returns False - NaN is not equal to, greater than, or less than anything, including itself - so that row fails BOTH filters. ${keptCount} + ${belowCount} = ${keptCount + belowCount} of ${COFFEE.data.length} rows: splitting a frame on a condition and its opposite silently loses the nulls, and the two halves do not add back up. Filter on .notna() first, or fill, and decide which side the missing rows belong on rather than letting them fall out.`,
      variables: [{ name: "kept + dropped", type: "int", preview: `${keptCount + belowCount} of ${COFFEE.data.length}` }, { name: "np.nan == np.nan", type: "bool", preview: "False" }],
    },
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
df.query("price > @threshold")   # @ references Python variable

# .between() — INCLUSIVE at both ends
df[df["price"].between(200, 300)]

# NaN fails every comparison, so these two do NOT partition the frame
df[df["rating"] >= 4.3]
df[df["rating"] <  4.3]
df[df["rating"].isna()]          # the rows both filters dropped`} steps={steps} />
    </PageShell>
  );
}
