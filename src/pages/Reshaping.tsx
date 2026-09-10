import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { MeltFlow } from "@/components/diagrams/MeltFlow";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, hlRows, withColumnGroups, withIndex } from "@/lib/dataframe";
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

// 22. pd.crosstab

const SURVEY_REGION = ["North", "South", "North", "East", "South", "North", "South", "North", "East", "South"];
const SURVEY_PLAN = ["Free", "Pro", "Free", "Pro", "Pro", "Pro", "Free", "Free", "Free", "Pro"];

export function CrosstabPage() {
  const SURVEY = df({
    user: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10"],
    region: SURVEY_REGION,
    plan: SURVEY_PLAN,
  });

  const regions = [...new Set(SURVEY_REGION)].sort();
  const plans = [...new Set(SURVEY_PLAN)].sort();
  const count = (r: string, p: string) =>
    SURVEY_REGION.filter((x, i) => x === r && SURVEY_PLAN[i] === p).length;

  const table = withIndex(
    df(Object.fromEntries(plans.map((p) => [p, regions.map((r) => count(r, p))]))),
    regions, ["region"],
  );

  const rowTotals = regions.map((r) => plans.reduce((a, p) => a + count(r, p), 0));
  const colTotals = plans.map((p) => regions.reduce((a, r) => a + count(r, p), 0));
  const withMargins = withIndex(
    df({
      ...Object.fromEntries(plans.map((p, pi) => [
        p, [...regions.map((r) => count(r, p) as CellValue), colTotals[pi] as CellValue],
      ])),
      All: [...rowTotals, SURVEY_REGION.length] as CellValue[],
    }),
    [...regions, "All"], ["region"],
  );

  const rowPct = withIndex(
    df(Object.fromEntries(plans.map((p) => [
      p, regions.map((r, ri) => Math.round((count(r, p) / rowTotals[ri]) * 1000) / 10),
    ]))),
    regions, ["region"],
  );

  const longEquivalent = df({
    region: regions.flatMap((r) => plans.map(() => r)),
    plan: regions.flatMap(() => plans),
    n: regions.flatMap((r) => plans.map((p) => count(r, p))),
  });

  const marginHl: HighlightMap = { [`${regions.length}:*`]: "match", [`*:${plans.length}`]: "match" };

  const steps: Step[] = [
    {
      id: "raw", label: "Two categorical columns",
      views: [{ frame: SURVEY, title: "users", highlights: hlMerge(hlCols([1], 10, "group-a"), hlCols([2], 10, "group-b"), { "h:1": "group-a", "h:2": "group-b" }), badge: "region x plan" }],
      explain: "Ten users, each with a region and a plan. The question 'how many Pro users are in the South?' needs both columns at once - a count of every combination.",
    },
    {
      id: "table", label: "The contingency table",
      views: [{ frame: table, title: "pd.crosstab(users['region'], users['plan'])", badge: "counts per pair" }],
      explain: "crosstab counts occurrences of each pair: rows are the first argument, columns the second, cells are frequencies. No values column, no aggfunc - counting is the default and the point.",
    },
    {
      id: "vs-pivot", label: "It is groupby + count + unstack",
      views: [
        { frame: longEquivalent, title: "groupby(['region','plan']).size()", badge: "the long way" },
        { frame: table, title: "pd.crosstab(...)", badge: "one call" },
      ],
      explain: "Exactly what a groupby on both columns, a size(), and an unstack() would give you. crosstab is the shortcut - and unlike pivot_table it needs no values column, because the thing being aggregated is the rows themselves.",
    },
    {
      id: "margins", label: "margins=True for totals",
      views: [{ frame: withMargins, title: "margins=True", highlights: marginHl, badge: "row + column totals" }],
      explain: "The All row and column give the marginal distributions - how many users per region regardless of plan, and per plan regardless of region. The bottom-right corner is the grand total, a quick check that you have not lost rows.",
    },
    {
      id: "normalize", label: "normalize for percentages",
      views: [{ frame: rowPct, title: "normalize='index'", highlights: hlRows([0], plans.length, "match"), badge: "% within each row" }],
      explain: "Raw counts mislead when groups are different sizes: a region with 5 users will out-count one with 2 whatever the pattern. normalize='index' turns each row into percentages of that row, making regions comparable. Use 'columns' to normalise the other way, or 'all' for share of the grand total.",
    },
    {
      id: "which-normalize", label: "Which direction answers your question?",
      views: [
        { frame: rowPct, title: "normalize='index'", badge: "of this region, what % is Pro?" },
        { frame: table, title: "raw counts", badge: "how many?" },
      ],
      explain: "'What share of Northerners are Pro?' normalises by index. 'What share of Pro users are Northern?' normalises by columns. These are different numbers answering different questions, and quoting one for the other is a classic reporting error.",
    },
    {
      id: "values", label: "Counting is not the only option",
      views: [{ frame: table, title: "values=..., aggfunc='mean'", badge: "beyond frequencies" }],
      explain: "Pass values and aggfunc together and crosstab aggregates that column instead of counting - average revenue per region-plan pair, say. At that point it is pivot_table with a different spelling, so use whichever reads better.",
    },
    {
      id: "stats", label: "Why statisticians care",
      views: [{ frame: withMargins, title: "the contingency table", highlights: marginHl, badge: "chi-square input" }],
      explain: "This shape is the standard input to a chi-square test of independence: are region and plan related, or does the split look like chance? The margins give the expected counts. Even without running the test, comparing normalised rows tells you whether the pattern differs by group.",
    },
  ];

  return (
    <PageShell meta={PAGES["crosstab"]}>
      <StepRunner runId="crosstab" steps={steps} code={`pd.crosstab(users["region"], users["plan"])          # frequencies

pd.crosstab(users["region"], users["plan"], margins=True)        # + totals
pd.crosstab(users["region"], users["plan"], normalize="index")   # row %
pd.crosstab(users["region"], users["plan"], normalize="columns") # column %

# The long way round - crosstab is the shortcut for this
users.groupby(["region", "plan"]).size().unstack(fill_value=0)

# Aggregate something other than counts
pd.crosstab(users["region"], users["plan"],
            values=users["revenue"], aggfunc="mean")`} />
    </PageShell>
  );
}

// 23. Melt: Wide to Long

export function MeltPage() {
  const NAMES = ["Asha", "Ben", "Chen"];
  const MONTHS_W = ["jan", "feb", "mar"];
  const WIDE_VALS: Record<string, number[]> = {
    jan: [120, 90, 140],
    feb: [135, 105, 130],
    mar: [150, 95, 160],
  };

  const wide = df({ rep: NAMES, ...WIDE_VALS });

  // Long: every rep x month pair becomes one row.
  const longRep: string[] = [];
  const longMonth: string[] = [];
  const longVal: number[] = [];
  MONTHS_W.forEach((m) => NAMES.forEach((n, i) => {
    longRep.push(n); longMonth.push(m); longVal.push(WIDE_VALS[m][i]);
  }));
  const long = df({ rep: longRep, month: longMonth, sales: longVal });

  const upTo = (n: number) => df({
    rep: longRep.slice(0, n), month: longMonth.slice(0, n), sales: longVal.slice(0, n),
  });
  const first1 = upTo(1);
  const first3 = upTo(NAMES.length);

  const grouped = withIndex(
    df({ sales: MONTHS_W.map((m) => WIDE_VALS[m].reduce((a, b) => a + b, 0)) }),
    MONTHS_W, ["month"],
  );

  const steps: Step[] = [
    {
      id: "wide", label: "Wide: months as columns",
      views: [{ frame: wide, title: "sales_wide", highlights: hlHeaders([1, 2, 3], "group-a"), badge: "3 reps x 3 months" }],
      explain: "This is how humans build spreadsheets: one row per rep, one column per month. Easy to read, and structurally awkward - the month is data, but it is stored as a column NAME, where no pandas operation can reach it.",
    },
    {
      id: "problem", label: "Why it fights back",
      views: [{ frame: wide, title: "sales_wide", highlights: hlHeaders([1, 2, 3], "drop"), badge: "add April = change the schema" }],
      explain: "Try to group by month and there is no month column to group by. Try to plot sales over time and there is no time axis. Add April and the schema itself changes, so every downstream query has to be rewritten. Wide data does not scale along its own axis.",
    },
    {
      id: "id-vars", label: "Decide what identifies a row",
      views: [{ frame: wide, title: "sales_wide", highlights: hlMerge(hlCols([0], 3, "match"), { "h:0": "match" }), badge: "id_vars = ['rep']" }],
      explain: "id_vars are the columns that stay put - the identity of the row. Everything else gets unpivoted. Here the rep identifies the row; the three month columns are the measurements to be collapsed.",
    },
    {
      id: "melting", label: "One cell becomes one row", diagram: "melt-flow",
      views: [{ frame: first1, title: "long (so far)", highlights: hlMerge(hlCols([1], 1, "new"), { "h:1": "new" }), badge: "1 of 9" }],
      explain: "Watch where the header goes. The column NAME 'jan' detaches and lands in the month column; the number that sat under it lands in sales. The rep comes along to say whose number it was. That is the whole operation - one wide cell becomes one long row.",
    },
    {
      id: "melting-col", label: "Then the rest of the column",
      diagram: "melt-flow",
      views: [{ frame: first3, title: "long (so far)", highlights: hlMerge(hlCols([1], 3, "new"), { "h:1": "new" }), badge: "3 of 9" }],
      explain: "The same 'jan' header is reused for every rep under it, so one column of 3 values becomes 3 rows that all carry the same month. The month column is repetitive by design - that repetition is what lets you group by it.",
    },
    {
      id: "melting-all", label: "Every cell, every column",
      diagram: "melt-flow",
      views: [{ frame: long, title: "long", badge: `${long.data.length} of ${long.data.length}` }],
      explain: "Nine cells, nine rows. Nothing was aggregated and nothing was lost - melt is a pure reshape, so the 9 numbers in the wide block are the same 9 numbers in the sales column.",
      variables: [{ name: "wide cells", type: "int", preview: String(NAMES.length * MONTHS_W.length) }, { name: "long rows", type: "int", preview: String(long.data.length) }],
    },
    {
      id: "long", label: "The full long frame",
      views: [{ frame: long, title: "pd.melt(sales_wide, id_vars=['rep'], var_name='month', value_name='sales')", badge: `${long.data.length} rows = 3 reps x 3 months` }],
      explain: "Three rows became nine: one per rep-month observation. This is tidy data - one observation per row, one variable per column - and it is what groupby, seaborn, and most ML pipelines expect as input.",
      variables: [{ name: "wide.shape", type: "tuple", preview: "(3, 4)" }, { name: "long.shape", type: "tuple", preview: `(${long.data.length}, 3)` }],
    },
    {
      id: "names", label: "Name the new columns",
      views: [{ frame: long, title: "var_name / value_name", highlights: hlHeaders([1, 2], "new"), badge: "not 'variable' / 'value'" }],
      explain: "Without var_name and value_name you get columns literally called 'variable' and 'value'. Always name them - it costs two arguments and saves everyone reading the next twenty lines.",
    },
    {
      id: "payoff", label: "Now the questions are easy",
      views: [{ frame: grouped, title: "long.groupby('month')['sales'].sum()", highlights: hlCols([0], 3, "new"), badge: "possible only in long form" }],
      explain: "Total per month is now an ordinary groupby, because month is a real column. Filtering to a quarter, plotting a trend, joining a targets table - all of them work on the long frame and none of them worked on the wide one.",
    },
    {
      id: "roundtrip", label: "Back again when you report",
      views: [
        { frame: long, title: "long", badge: "compute in this shape" },
        { frame: wide, title: "pivot back", badge: "present in this shape" },
      ],
      explain: "melt and pivot are inverses. The working rule: reshape to long to compute, pivot to wide to present. Long is for machines, wide is for the human reading the final table.",
    },
  ];

  return (
    <PageShell meta={PAGES["melt"]}>
      <StepRunner runId="melt" steps={steps}
        renderDiagram={(step) => (
          <MeltFlow names={NAMES} months={MONTHS_W} values={WIDE_VALS}
            emitted={step.id === "melting" ? 1 : step.id === "melting-col" ? NAMES.length : longVal.length}
            cascade={step.id !== "melting"} />
        )}
        code={`long = pd.melt(
    sales_wide,
    id_vars=["rep"],                     # columns that stay as they are
    value_vars=["jan", "feb", "mar"],    # columns to collapse (default: all others)
    var_name="month",                    # else the column is called "variable"
    value_name="sales",                  # else it is called "value"
)

# Now month is real data, so this works:
long.groupby("month")["sales"].sum()

# And back the other way for presentation
long.pivot(index="rep", columns="month", values="sales")`} />
    </PageShell>
  );
}
