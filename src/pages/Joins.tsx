import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, hlRows, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

// Orders reference a product_id; the product table is missing one of them,
// and carries one product nobody ordered. That asymmetry is the whole lesson.
const ORDERS = df({
  order_id: ["A-1", "A-2", "A-3", "A-4"],
  product_id: ["P1", "P2", "P9", "P1"],
  qty: [2, 1, 5, 3],
});

const PRODUCTS = df({
  product_id: ["P1", "P2", "P3"],
  name: ["Latte", "Mocha", "Chai"],
  price: [280, 320, 150],
});

const O_KEY = ["P1", "P2", "P9", "P1"];
const P_KEY = ["P1", "P2", "P3"];

const matchedOrders = O_KEY.map((k, i) => (P_KEY.includes(k) ? i : -1)).filter((i) => i >= 0);
const orphanOrders = O_KEY.map((k, i) => (P_KEY.includes(k) ? -1 : i)).filter((i) => i >= 0);
const matchedProducts = P_KEY.map((k, i) => (O_KEY.includes(k) ? i : -1)).filter((i) => i >= 0);
const orphanProducts = P_KEY.map((k, i) => (O_KEY.includes(k) ? -1 : i)).filter((i) => i >= 0);

/** Build the merge result for a given `how`, the way pandas would. */
function merged(how: "inner" | "left" | "right" | "outer") {
  const rows: Array<{ order: number | null; product: number | null }> = [];
  if (how !== "right") {
    O_KEY.forEach((k, i) => {
      const p = P_KEY.indexOf(k);
      if (p >= 0) rows.push({ order: i, product: p });
      else if (how === "left" || how === "outer") rows.push({ order: i, product: null });
    });
  } else {
    P_KEY.forEach((k, p) => {
      const hits = O_KEY.map((ok, i) => (ok === k ? i : -1)).filter((i) => i >= 0);
      if (hits.length) hits.forEach((i) => rows.push({ order: i, product: p }));
      else rows.push({ order: null, product: p });
    });
  }
  if (how === "outer") {
    P_KEY.forEach((k, p) => { if (!O_KEY.includes(k)) rows.push({ order: null, product: p }); });
  }

  const pick = (i: number | null, col: CellValue[]) => (i === null ? null : col[i]);
  return {
    frame: df({
      order_id: rows.map((r) => pick(r.order, ORDERS.data.map((d) => d[0]))),
      product_id: rows.map((r) => (r.order !== null ? O_KEY[r.order] : P_KEY[r.product!])),
      qty: rows.map((r) => pick(r.order, ORDERS.data.map((d) => d[2]))),
      name: rows.map((r) => pick(r.product, PRODUCTS.data.map((d) => d[1]))),
      price: rows.map((r) => pick(r.product, PRODUCTS.data.map((d) => d[2]))),
    }),
    rows,
  };
}

/** Mark every NaN the join introduced, so the cost of each `how` is visible. */
function nanHighlights(rows: Array<{ order: number | null; product: number | null }>): HighlightMap {
  const m: HighlightMap = {};
  rows.forEach((r, i) => {
    if (r.order === null) { m[`${i}:0`] = "null"; m[`${i}:2`] = "null"; }
    if (r.product === null) { m[`${i}:3`] = "null"; m[`${i}:4`] = "null"; }
  });
  return m;
}

export function JoinTypesPage() {
  const inner = merged("inner");
  const left = merged("left");
  const right = merged("right");
  const outer = merged("outer");

  const steps: Step[] = [
    {
      id: "setup", label: "Two frames, one key",
      views: [
        { frame: ORDERS, title: "orders", badge: "4 rows" },
        { frame: PRODUCTS, title: "products", badge: "3 rows" },
      ],
      explain: "Both frames share a product_id column — that is the join key. Before choosing a join type, look at what does NOT match on each side. That is the only thing the five join types disagree about.",
    },
    {
      id: "unmatched", label: "Find the orphans",
      views: [
        { frame: ORDERS, title: "orders", highlights: hlMerge(hlRows(matchedOrders, 3, "mask-true"), hlRows(orphanOrders, 3, "drop")), badge: "P9 has no product" },
        { frame: PRODUCTS, title: "products", highlights: hlMerge(hlRows(matchedProducts, 3, "mask-true"), hlRows(orphanProducts, 3, "drop")), badge: "P3 was never ordered" },
      ],
      explain: "Order A-3 points at P9, which is not in the product table — a broken reference. Product P3 exists but nobody ordered it. Each join type decides the fate of these two rows differently.",
      variables: [{ name: "orphan orders", type: "int", preview: "1  (A-3)" }, { name: "orphan products", type: "int", preview: "1  (P3)" }],
    },
    {
      id: "inner", label: "inner: matches only", diagram: "venn-inner",
      views: [{ frame: inner.frame, title: "pd.merge(orders, products, on='product_id')", badge: `${inner.frame.data.length} rows` }],
      explain: "inner is the default. Both orphans are dropped — silently. Your revenue total is now missing order A-3 and nothing in the output hints that a row disappeared. This is the most common way join bugs hide.",
      variables: [{ name: "len(result)", type: "int", preview: `${inner.frame.data.length}  (was 4)` }],
    },
    {
      id: "left", label: "left: keep every left row", diagram: "venn-left",
      views: [{ frame: left.frame, title: "how='left'", highlights: nanHighlights(left.rows), badge: `${left.frame.data.length} rows` }],
      explain: "left keeps all four orders. A-3 survives, but with NaN for name and price because there was nothing to fill them with. No rows lost — you just have to decide what to do with the NaNs.",
      variables: [{ name: "result['name'].isna().sum()", type: "int", preview: "1" }],
    },
    {
      id: "right", label: "right: keep every right row", diagram: "venn-right",
      views: [{ frame: right.frame, title: "how='right'", highlights: nanHighlights(right.rows), badge: `${right.frame.data.length} rows` }],
      explain: "right mirrors left: every product survives, including never-ordered P3, whose order columns are NaN. In practice people write left and swap the frame order instead — it reads better in a chain.",
    },
    {
      id: "outer", label: "outer: keep everything", diagram: "venn-outer",
      views: [{ frame: outer.frame, title: "how='outer'", highlights: nanHighlights(outer.rows), badge: `${outer.frame.data.length} rows` }],
      explain: "outer keeps both orphans and fills every gap with NaN. Use it when you are auditing data quality and need to see exactly what failed to match on either side.",
    },
    {
      id: "indicator", label: "Audit with indicator=True",
      views: [{
        frame: df({
          order_id: outer.frame.data.map((r) => r[0]),
          product_id: outer.frame.data.map((r) => r[1]),
          _merge: outer.rows.map((r) => (r.order === null ? "right_only" : r.product === null ? "left_only" : "both")),
        }),
        title: "merge(..., how='outer', indicator=True)",
        highlights: (() => {
          const m: HighlightMap = {};
          outer.rows.forEach((r, i) => { m[`${i}:2`] = r.order === null || r.product === null ? "changed" : "mask-true"; });
          return m;
        })(),
        badge: "_merge column",
      }],
      explain: "indicator=True adds a _merge column labelling each row both, left_only, or right_only. Run an outer join with it before committing to a join type — it answers 'what am I about to throw away?' in one line.",
      variables: [{ name: "result['_merge'].value_counts()", type: "Series", preview: "both 4, left_only 1, right_only 1" }],
    },
    {
      id: "cross", label: "cross: no key at all", diagram: "venn-cross",
      views: [{ frame: ORDERS, title: "orders", badge: "4 rows" }, { frame: PRODUCTS, title: "products", badge: "3 rows" }],
      explain: "cross pairs every left row with every right row: 4 x 3 = 12 rows, no key involved. Useful for building complete date-by-category grids. It is also what an accidental many-to-many join feels like — if your row count explodes, this is why.",
      variables: [{ name: "len(cross)", type: "int", preview: "12  (4 x 3)" }],
    },
  ];

  return (
    <PageShell meta={PAGES["join-types"]}>
      <StepRunner runId="join-types" steps={steps} code={`# inner (default): only keys present on both sides
pd.merge(orders, products, on="product_id")

pd.merge(orders, products, on="product_id", how="left")    # keep all orders
pd.merge(orders, products, on="product_id", how="right")   # keep all products
pd.merge(orders, products, on="product_id", how="outer")   # keep everything
pd.merge(orders, products, how="cross")                    # every pair, no key

# Before you choose: see what would be dropped
pd.merge(orders, products, on="product_id", how="outer", indicator=True)`} />
    </PageShell>
  );
}

// 27. merge vs join vs concat

export function MergeJoinConcatPage() {
  const LEFT = df({ id: ["a", "b", "c"], score: [10, 20, 30] });
  const RIGHT_COL = df({ id: ["a", "b", "d"], grade: ["A", "B", "D"] });
  const RIGHT_IDX = withIndex(df({ grade: ["A", "B", "D"] }), ["a", "b", "d"], ["id"]);
  const LEFT_IDX = withIndex(df({ score: [10, 20, 30] }), ["a", "b", "c"], ["id"]);

  const mergedInner = df({ id: ["a", "b"], score: [10, 20], grade: ["A", "B"] });
  const joined = withIndex(df({ score: [10, 20, 30], grade: ["A", "B", null] }), ["a", "b", "c"], ["id"]);

  const MORE = df({ id: ["e", "f"], score: [40, 50] });
  const stacked = df({ id: ["a", "b", "c", "e", "f"], score: [10, 20, 30, 40, 50] });
  const sideBySide = df({ id: ["a", "b", "c"], score: [10, 20, 30], grade: ["A", "B", "D"] });

  const decision = df({
    situation: [
      "Keys live in columns",
      "Keys live in the index",
      "Same columns, more rows",
      "Same rows, more columns",
    ],
    use: ["pd.merge", ".join", "pd.concat(axis=0)", "pd.concat(axis=1)"],
    matches_on: ["column values", "index labels", "nothing - stacks", "index labels"],
  });

  const steps: Step[] = [
    {
      id: "three", label: "Three tools, three jobs",
      views: [{ frame: decision, title: "the decision table", highlights: hlCols([1], 4, "match"), badge: "read this first" }],
      explain: "All three combine frames, and picking the wrong one gives a confusing NaN-filled result rather than an error. The question that separates them: WHERE do my keys live, and am I adding rows or columns?",
    },
    {
      id: "merge", label: "merge: keys in columns",
      views: [
        { frame: LEFT, title: "left", highlights: hlMerge(hlCols([0], 3, "match"), hlHeaders([0])), badge: "id column" },
        { frame: RIGHT_COL, title: "right", highlights: hlMerge(hlCols([0], 3, "match"), hlHeaders([0])), badge: "id column" },
      ],
      explain: "merge is the SQL join: it matches on the VALUES of one or more columns. This is the one you will use most, because data usually arrives with its keys as ordinary columns.",
    },
    {
      id: "merge-result", label: "merge output",
      views: [{ frame: mergedInner, title: "pd.merge(left, right, on='id')", badge: "inner by default" }],
      explain: "Only ids present in both survive - c and d are gone. Note the default: merge is inner, so it drops silently. Everything from the join-types lesson applies here.",
    },
    {
      id: "join", label: "join: keys in the index",
      views: [
        { frame: LEFT_IDX, title: "left.set_index('id')", highlights: { "i:*": "match" }, badge: "id is the index" },
        { frame: RIGHT_IDX, title: "right.set_index('id')", highlights: { "i:*": "match" }, badge: "id is the index" },
      ],
      explain: ".join matches on INDEX labels rather than column values. It is a convenience wrapper over merge for the already-indexed case, and its default is left, not inner - the opposite of merge, which catches people out.",
    },
    {
      id: "join-result", label: "join output",
      views: [{ frame: joined, title: "left.join(right)", highlights: { "2:1": "null" }, badge: "LEFT by default" }],
      explain: "All three left rows survive and c gets NaN, because join defaults to how='left'. Same data as the merge above, different result - purely because of the default. When in doubt, write merge and pass how explicitly.",
    },
    {
      id: "concat-rows", label: "concat axis=0: more rows",
      views: [
        { frame: LEFT, title: "batch 1", badge: "3 rows" },
        { frame: MORE, title: "batch 2", badge: "2 rows" },
      ],
      explain: "concat does not match anything - it stacks. Same columns, more rows: monthly CSV exports, appending new records, combining chunks from a chunked read.",
    },
    {
      id: "concat-result", label: "Stacked",
      views: [{ frame: stacked, title: "pd.concat([b1, b2], ignore_index=True)", highlights: hlRows([3, 4], 2, "new"), badge: "5 rows" }],
      explain: "Rows are appended in order. ignore_index=True renumbers 0..4 - without it you get duplicate index labels (0,1,2,0,1) that will bite you the next time you use .loc or join on the index.",
    },
    {
      id: "concat-cols", label: "concat axis=1: more columns",
      views: [{ frame: sideBySide, title: "pd.concat([left, right], axis=1)", highlights: hlMerge(hlCols([2], 3, "changed"), hlHeaders([2], "changed")), badge: "aligned by INDEX" }],
      explain: "axis=1 pastes columns side by side, aligning on the index - NOT on any key column. Here that means row 2 gets grade 'D' from right's third row, even though its id is 'c' and the grade belongs to 'd'. concat does not check; it lines up positions. If your rows are not already aligned, use merge.",
    },
  ];

  return (
    <PageShell meta={PAGES["merge-join-concat"]}>
      <StepRunner runId="merge-join-concat" steps={steps} code={`pd.merge(left, right, on="id")        # keys in COLUMNS. default: inner
left.join(right)                       # keys in the INDEX. default: LEFT (!)

pd.concat([jan, feb], ignore_index=True)   # stack ROWS (same columns)
pd.concat([left, right], axis=1)           # paste COLUMNS (aligns on index)

# Watch the defaults - these two are NOT the same
pd.merge(left, right, on="id")             # inner
left.set_index("id").join(right.set_index("id"))   # left

# concat(axis=1) aligns by index position, not by any key.
# If the rows are not already aligned, you want merge.`} />
    </PageShell>
  );
}

// 28. Merge Mechanics

export function MergeMechanicsPage() {
  // A duplicated key on the right is what makes row counts explode.
  const L = df({ order_id: ["A-1", "A-2", "A-3"], cust_id: ["c1", "c2", "c1"], amount: [100, 250, 175] });
  const R_DUP = df({ cust_id: ["c1", "c1", "c2"], city: ["Pune", "Pune", "Delhi"], source: ["web", "app", "web"] });
  const R_OK = df({ cust_id: ["c1", "c2"], city: ["Pune", "Delhi"] });

  const exploded = df({
    order_id: ["A-1", "A-1", "A-2", "A-3", "A-3"],
    cust_id: ["c1", "c1", "c2", "c1", "c1"],
    amount: [100, 100, 250, 175, 175],
    source: ["web", "app", "web", "web", "app"],
  });

  const clean = df({
    order_id: ["A-1", "A-2", "A-3"], cust_id: ["c1", "c2", "c1"],
    amount: [100, 250, 175], city: ["Pune", "Delhi", "Pune"],
  });

  // Both frames carry a "name" column: suffixes disambiguate.
  const suffixed = df({
    order_id: ["A-1", "A-2", "A-3"],
    name_order: ["rush", "std", "rush"],
    name_customer: ["Asha", "Ben", "Asha"],
  });

  const indicator = df({
    order_id: ["A-1", "A-2", "A-3"],
    cust_id: ["c1", "c2", "c1"],
    _merge: ["both", "both", "both"],
  });

  const steps: Step[] = [
    {
      id: "setup", label: "Three orders, one lookup",
      views: [
        { frame: L, title: "orders", badge: "3 rows" },
        { frame: R_DUP, title: "customers", badge: "3 rows" },
      ],
      explain: "Three orders and a customer lookup. It looks harmless. Look closely at the right frame before merging - c1 appears twice, because the same customer arrived from two sources.",
    },
    {
      id: "duplicate-key", label: "The duplicate key",
      views: [{ frame: R_DUP, title: "customers", highlights: hlRows([0, 1], 3, "changed"), badge: "c1 twice" }],
      explain: "The right frame is not a clean lookup table - its key is not unique. A lookup table must have one row per key, and this one has two for c1. This single fact is about to change your row count.",
    },
    {
      id: "explosion", label: "The row count explodes",
      views: [{ frame: exploded, title: "pd.merge(orders, customers, on='cust_id')", highlights: hlRows([0, 1, 3, 4], 4, "changed"), badge: "5 rows from 3" }],
      explain: "Every left row matches EVERY right row with the same key, so each c1 order became two rows. Sum the amount column now and you will report 750 instead of 525 - inflated by 43% with no error, no warning, and numbers that still look plausible.",
      variables: [{ name: "len(orders)", type: "int", preview: "3" }, { name: "len(result)", type: "int", preview: "5  (!)" }],
    },
    {
      id: "validate", label: "validate catches it",
      views: [{ frame: exploded, title: "validate='m:1' raises MergeError", highlights: { "*:*": "drop" }, badge: "fails loudly" }],
      explain: "validate='m:1' asserts many-to-one: many left rows, at most one right match each. When the assumption breaks, pandas raises instead of quietly duplicating. Add it to every merge - it is one argument that turns a silent data corruption into a stack trace.",
      variables: [{ name: "validate", type: "str", preview: "'1:1' | '1:m' | 'm:1' | 'm:m'" }],
    },
    {
      id: "fix", label: "Fix the lookup, not the merge",
      views: [{ frame: R_OK, title: "customers.drop_duplicates('cust_id')", badge: "one row per key" }],
      explain: "The fix is upstream: make the lookup unique, by de-duplicating or by aggregating the extra column first. Deciding WHICH source row to keep is a real decision - do not let a merge make it for you by accident.",
    },
    {
      id: "fixed", label: "Row count preserved",
      views: [{ frame: clean, title: "merge with a clean lookup", highlights: hlCols([3], 3, "new"), badge: "3 rows in, 3 rows out" }],
      explain: "Three orders in, three orders out, with city attached. The habit worth forming: assert len(result) == len(left) after any merge you expect to be a lookup.",
    },
    {
      id: "suffixes", label: "Colliding column names",
      views: [{ frame: suffixed, title: "suffixes=('_order', '_customer')", highlights: hlHeaders([1, 2], "match"), badge: "no more _x / _y" }],
      explain: "When both frames carry a column of the same name, pandas appends _x and _y - which tells you nothing three months later. Pass suffixes to name them after their source. If you did not expect a collision, that is a signal you are merging on the wrong thing.",
    },
    {
      id: "indicator", label: "indicator answers 'what matched?'",
      views: [{ frame: indicator, title: "indicator=True", highlights: hlMerge(hlCols([2], 3, "mask-true"), hlHeaders([2], "new")), badge: "_merge column" }],
      explain: "indicator=True adds a _merge column reading both, left_only, or right_only. Run the merge with how='outer' and indicator=True first, check the value_counts, and only then decide the join type. Row count in, row count out, and a labelled reason for every difference.",
    },
  ];

  return (
    <PageShell meta={PAGES["merge-mechanics"]}>
      <StepRunner runId="merge-mechanics" steps={steps} code={`# Assert what you believe. A silent 43% overcount is worse than a crash.
pd.merge(orders, customers, on="cust_id", validate="m:1")

# '1:1'  both sides unique       '1:m'  left unique, right repeats
# 'm:1'  right unique (lookups)  'm:m'  no constraint (rarely what you want)

# Name colliding columns after their source, not _x / _y
pd.merge(orders, customers, on="cust_id", suffixes=("_order", "_customer"))

# Audit BEFORE choosing a join type
chk = pd.merge(orders, customers, on="cust_id", how="outer", indicator=True)
chk["_merge"].value_counts()

# The habit
assert len(result) == len(orders), "merge changed the row count"`} />
    </PageShell>
  );
}

// 31. concat Patterns

export function ConcatPatternsPage() {
  const JAN = df({ item: ["Latte", "Mocha"], sales: [120, 90] });
  const FEB = df({ item: ["Latte", "Chai"], sales: [140, 70] });

  const naive = df({ item: ["Latte", "Mocha", "Latte", "Chai"], sales: [120, 90, 140, 70] });
  const renumbered = df({ item: ["Latte", "Mocha", "Latte", "Chai"], sales: [120, 90, 140, 70] });

  const keyed = withIndex(
    df({ item: ["Latte", "Mocha", "Latte", "Chai"], sales: [120, 90, 140, 70] }),
    [["jan", 0], ["jan", 1], ["feb", 0], ["feb", 1]],
    ["month", ""],
  );

  const MISMATCH = df({ item: ["Cold Brew"], sales: [160], region: ["North"] });
  const ragged = df({
    item: ["Latte", "Mocha", "Cold Brew"],
    sales: [120, 90, 160],
    region: [null, null, "North"],
  });

  const steps: Step[] = [
    {
      id: "sources", label: "Two monthly exports",
      views: [
        { frame: JAN, title: "jan", badge: "2 rows" },
        { frame: FEB, title: "feb", badge: "2 rows" },
      ],
      explain: "The most common concat job: files with the same schema that need stacking. No keys to match, no join to reason about - just put one on top of the other.",
    },
    {
      id: "naive", label: "The default keeps old labels",
      views: [{ frame: naive, title: "pd.concat([jan, feb])", highlights: { "i:2": "drop", "i:3": "drop" }, badge: "index reads 0,1,0,1" }],
      explain: "Both frames brought their own index, so the result has duplicate labels. .loc[0] now returns TWO rows, and any later join on the index misbehaves. This is the concat mistake that surfaces three steps downstream.",
      variables: [{ name: "result.index.is_unique", type: "bool", preview: "False" }],
    },
    {
      id: "ignore-index", label: "ignore_index=True",
      views: [{ frame: renumbered, title: "pd.concat([jan, feb], ignore_index=True)", highlights: { "i:*": "new" }, badge: "0,1,2,3" }],
      explain: "A clean 0..n index. Use this whenever the original labels carry no meaning - which, for stacked exports, is almost always.",
    },
    {
      id: "keys", label: "keys= remembers the source",
      views: [{ frame: keyed, title: "pd.concat([jan, feb], keys=['jan','feb'])", badge: "MultiIndex: source + original" }],
      explain: "keys adds an outer index level naming which frame each row came from. Better than ignore_index when provenance matters - after stacking twelve monthly files you can still ask which month a row belongs to, without adding a column by hand.",
    },
    {
      id: "mismatch", label: "Mismatched columns",
      views: [
        { frame: JAN, title: "jan", badge: "item, sales" },
        { frame: MISMATCH, title: "mar", highlights: hlMerge(hlCols([2], 1, "changed"), hlHeaders([2], "changed")), badge: "item, sales, region" },
      ],
      explain: "The third file has an extra column. concat does not complain about this - it takes the union of all columns and fills the gaps.",
    },
    {
      id: "ragged", label: "The union, filled with NaN",
      views: [{ frame: ragged, title: "pd.concat([jan, mar])", highlights: { "0:2": "null", "1:2": "null" }, badge: "region is NaN for January" }],
      explain: "January rows get NaN for region because that column did not exist in their file. Sometimes correct, sometimes a schema drift you wanted to catch. Compare the column sets before concatenating if the files should match - concat will never tell you they did not.",
      variables: [{ name: "set(jan.columns) ^ set(mar.columns)", type: "set", preview: "{'region'}" }],
    },
    {
      id: "join-inner", label: "join='inner' keeps only shared columns",
      views: [{ frame: naive, title: "pd.concat([jan, mar], join='inner')", badge: "common columns only" }],
      explain: "join='inner' keeps only columns present in every frame, so no NaN is invented. Choose deliberately: outer (the default) preserves everything and adds gaps, inner guarantees no gaps and silently drops data.",
    },
    {
      id: "perf", label: "Never concat in a loop",
      views: [{ frame: renumbered, title: "collect, then concat once", highlights: { "*:*": "new" }, badge: "O(n) not O(n squared)" }],
      explain: "df = pd.concat([df, chunk]) inside a loop copies the whole accumulated frame every iteration - quadratic time, and the single most common cause of a script that crawls on large inputs. Append the pieces to a Python list and call pd.concat once at the end.",
    },
  ];

  return (
    <PageShell meta={PAGES["concat-patterns"]}>
      <StepRunner runId="concat-patterns" steps={steps} code={`pd.concat([jan, feb])                      # keeps both indexes: 0,1,0,1 (!)
pd.concat([jan, feb], ignore_index=True)   # clean 0..n
pd.concat([jan, feb], keys=["jan", "feb"]) # MultiIndex remembers the source

pd.concat([jan, mar])                  # union of columns, gaps become NaN
pd.concat([jan, mar], join="inner")    # only columns present in ALL frames

# SLOW - copies the whole frame every iteration
for f in files:
    df = pd.concat([df, pd.read_csv(f)])

# FAST - one concat at the end
parts = [pd.read_csv(f) for f in files]
df = pd.concat(parts, ignore_index=True)`} />
    </PageShell>
  );
}
