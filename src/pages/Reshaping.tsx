import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, withColumnGroups, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

// Long-format sales. North/Jan appears twice on purpose: without a duplicate
// combination there is nothing for aggfunc to actually do.
const REGION = ["North", "North", "South", "South", "North", "South", "East"];
const MONTH = ["Jan", "Feb", "Jan", "Feb", "Jan", "Mar", "Jan"];
const REVENUE = [1200, 1500, 900, 1100, 800, 700, 600];

const SALES = df({ region: REGION, month: MONTH, revenue: REVENUE });

const REGIONS = [...new Set(REGION)].sort();
const MONTHS = ["Jan", "Feb", "Mar"];

function cellsFor(how: "sum" | "mean") {
  return (r: string, m: string): CellValue => {
    const vals = REVENUE.filter((_, i) => REGION[i] === r && MONTH[i] === m);
    if (!vals.length) return null;
    const total = vals.reduce((a, b) => a + b, 0);
    return how === "sum" ? total : Math.round(total / vals.length);
  };
}

function grid(how: "sum" | "mean", fill?: number) {
  const cell = cellsFor(how);
  return withIndex(
    df(Object.fromEntries(MONTHS.map((m) => [
      m,
      REGIONS.map((r) => {
        const v = cell(r, m);
        return v === null && fill !== undefined ? fill : v;
      }),
    ]))),
    REGIONS,
    ["region"],
  );
}

export function PivotTablePage() {
  const sum = grid("sum");
  const filled = grid("sum", 0);

  // Every NaN in the grid is a region/month pair that never occurred.
  const gaps: HighlightMap = {};
  REGIONS.forEach((r, ri) => {
    MONTHS.forEach((m, mi) => { if (cellsFor("sum")(r, m) === null) gaps[`${ri}:${mi}`] = "null"; });
  });

  // margins=True appends a totals row and column.
  const rowTotals = REGIONS.map((r) => MONTHS.reduce((a, m) => a + ((cellsFor("sum")(r, m) as number) ?? 0), 0));
  const colTotals = MONTHS.map((m) => REGIONS.reduce((a, r) => a + ((cellsFor("sum")(r, m) as number) ?? 0), 0));
  const withMargins = withIndex(
    df({
      ...Object.fromEntries(MONTHS.map((m, mi) => [
        m,
        [...REGIONS.map((r) => (cellsFor("sum")(r, m) ?? 0) as CellValue), colTotals[mi] as CellValue],
      ])),
      All: [...rowTotals, rowTotals.reduce((a, b) => a + b, 0)] as CellValue[],
    }),
    [...REGIONS, "All"],
    ["region"],
  );
  const marginHl: HighlightMap = { [`${REGIONS.length}:*`]: "match", [`*:${MONTHS.length}`]: "match" };

  // aggfunc=['sum','mean'] produces a MultiIndex on the columns.
  const twoAggs = withColumnGroups(
    df({
      ...Object.fromEntries(MONTHS.map((m) => [m, REGIONS.map((r) => cellsFor("sum")(r, m))])),
      ...Object.fromEntries(MONTHS.map((m) => [` ${m}`, REGIONS.map((r) => cellsFor("mean")(r, m))])),
    }),
    [{ label: "sum", span: MONTHS.length }, { label: "mean", span: MONTHS.length }],
  );
  const twoAggsIdx = withIndex(twoAggs, REGIONS, ["region"]);

  const dupRows = REGION.map((r, i) => (r === "North" && MONTH[i] === "Jan" ? i : -1)).filter((i) => i >= 0);
  const dupHl: HighlightMap = {};
  dupRows.forEach((r) => { for (let c = 0; c < 3; c++) dupHl[`${r}:${c}`] = "changed"; });

  const steps: Step[] = [
    {
      id: "long", label: "Long format in",
      views: [{ frame: SALES, title: "sales", badge: "7 rows, one per record" }],
      explain: "Long format stores one observation per row. It is easy to append to and easy to filter, but almost impossible to read as a report — you cannot see at a glance how North compares to South across months.",
    },
    {
      id: "roles", label: "Three columns, three roles",
      views: [{
        frame: SALES, title: "sales",
        highlights: hlMerge(
          hlCols([0], 7, "group-a"), hlCols([1], 7, "group-b"), hlCols([2], 7, "group-c"),
          { "h:0": "group-a", "h:1": "group-b", "h:2": "group-c" },
        ),
        badge: "index / columns / values",
      }],
      explain: "Every pivot_table call assigns three roles. region becomes the row labels (index), month becomes the column headers (columns), revenue is the number that fills the cells (values). Getting these three right is the entire skill.",
      variables: [
        { name: "index", type: "str", preview: "'region'" },
        { name: "columns", type: "str", preview: "'month'" },
        { name: "values", type: "str", preview: "'revenue'" },
      ],
    },
    {
      id: "duplicates", label: "Why aggfunc exists",
      views: [{ frame: SALES, title: "sales", highlights: dupHl, badge: "North + Jan appears twice" }],
      explain: "Two rows share the same region/month pair. One grid cell cannot hold two numbers, so pivot_table must combine them — that is what aggfunc decides. This is the difference between pivot_table and plain pivot, which raises an error here instead.",
    },
    {
      id: "grid", label: "The grid",
      views: [{ frame: sum, title: "pd.pivot_table(sales, index='region', columns='month', values='revenue', aggfunc='sum')", badge: "3 x 3" }],
      explain: "Rows are regions, columns are months, each cell is the summed revenue. North/Jan shows 2000 — the two duplicate rows added together. The same report, now readable left to right and top to bottom.",
    },
    {
      id: "gaps", label: "Missing combinations become NaN",
      views: [{ frame: sum, title: "result", highlights: gaps, badge: "pairs that never occurred" }],
      explain: "East only ever traded in January, so its Feb and Mar cells are NaN — not zero. The distinction matters: NaN means 'no data', zero means 'we measured, and it was nothing'. Reshaping turns absent rows into visible holes.",
    },
    {
      id: "fill", label: "fill_value when zero is honest",
      views: [{ frame: filled, title: "fill_value=0", highlights: gaps, badge: "NaN to 0" }],
      explain: "fill_value=0 replaces the holes. Use it only when zero is the truthful reading — no sales really did happen — because it permanently erases the difference between 'nothing sold' and 'we have no data'.",
    },
    {
      id: "margins", label: "margins=True for totals",
      views: [{ frame: withMargins, title: "margins=True", highlights: marginHl, badge: "All row + All column" }],
      explain: "margins=True appends row and column totals under the label 'All'. Handy for a finished report — but remember the total row is now a data row, so any later groupby or sum over this frame will double-count it.",
    },
    {
      id: "multi-agg", label: "Several aggregations at once",
      views: [{
        frame: twoAggsIdx, title: "aggfunc=['sum', 'mean']",
        highlights: hlHeaders([0, 1, 2], "group-a"), badge: "MultiIndex columns",
      }],
      explain: "Pass a list of aggregations and the columns gain a second level: the outer level names the function, the inner names the month. North/Jan reads 2000 under sum and 1000 under mean — the same two rows, summed and averaged.",
      variables: [{ name: "result.columns.nlevels", type: "int", preview: "2" }],
    },
  ];

  return (
    <PageShell meta={PAGES["pivot-table"]}>
      <StepRunner runId="pivot-table" steps={steps} code={`pd.pivot_table(
    sales,
    index="region",      # -> row labels
    columns="month",     # -> column headers
    values="revenue",    # -> what fills the cells
    aggfunc="sum",       # -> how duplicates combine
)

# Missing region/month pairs come back as NaN
pd.pivot_table(..., fill_value=0)      # only if zero is the honest answer
pd.pivot_table(..., margins=True)      # adds the "All" total row + column
pd.pivot_table(..., aggfunc=["sum", "mean"])   # MultiIndex on the columns`} />
    </PageShell>
  );
}
