import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlMerge, hlRows } from "@/lib/dataframe";
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
