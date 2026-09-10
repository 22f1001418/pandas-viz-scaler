import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlMerge, hlRows, series, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

const WEEK = ["W01", "W02", "W03", "W04", "W05", "W06", "W07", "W08"];
const SALES = [120, 138, 131, 152, 166, 149, 175, 190];
const W = 3;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** rolling(W).mean() — NaN until the window is full. */
function rollingMean(minPeriods = W): CellValue[] {
  return SALES.map((_, i) => {
    const win = SALES.slice(Math.max(0, i - W + 1), i + 1);
    return win.length >= minPeriods ? round1(win.reduce((a, b) => a + b, 0) / win.length) : null;
  });
}

export function RollingPage() {
  const ma = rollingMean();
  const maPartial = rollingMean(1);

  const base = df({ week: WEEK, sales: SALES });
  const withMa = df({ week: WEEK, sales: SALES, ma3: ma });
  const withPartial = df({ week: WEEK, sales: SALES, ma3: maPartial });

  /** Shade the W rows feeding the window that ends at `at`. */
  const windowAt = (at: number): HighlightMap => {
    const m: HighlightMap = {};
    for (let r = Math.max(0, at - W + 1); r <= at; r++) m[`${r}:1`] = "window";
    m[`${at}:2`] = "new";
    return m;
  };

  const nanHl: HighlightMap = { "0:2": "null", "1:2": "null" };

  const steps: Step[] = [
    {
      id: "raw", label: "A noisy weekly series",
      views: [{ frame: series("sales", SALES, { index: WEEK }), title: "sales", badge: "Series", render: "series" }],
      explain: "Week-to-week sales bounce around: up 18, down 7, up 21. The underlying trend is upward, but any single week is too noisy to make a decision from.",
    },
    {
      id: "diagram", label: "How the window slides", diagram: "rolling-window",
      views: [{ frame: base, title: "sales", badge: "window = 3" }],
      explain: "rolling(3) walks a three-row window down the column. At each stop it hands those three values to an aggregation. The window is anchored at its RIGHT edge by default — the result sits on the last row of the window, never the middle.",
    },
    {
      id: "first-full", label: "The first complete window",
      views: [{ frame: withMa, title: "sales.rolling(3).mean()", highlights: windowAt(2), badge: "rows 0-2" }],
      explain: `The first window that holds three values ends at W03: (${SALES[0]} + ${SALES[1]} + ${SALES[2]}) / 3 = ${ma[2]}. Rows W01 and W02 could not fill a window, so their results are NaN.`,
      variables: [{ name: "ma3['W03']", type: "float64", preview: String(ma[2]) }],
    },
    {
      id: "slide", label: "Slide one row",
      views: [{ frame: withMa, title: "rolling(3).mean()", highlights: windowAt(3), badge: "rows 1-3" }],
      explain: `The window advances by one: W01 drops out, W04 enters. Each step forgets exactly one value and learns one — which is why rolling is cheap even on millions of rows.`,
      variables: [{ name: "ma3['W04']", type: "float64", preview: String(ma[3]) }],
    },
    {
      id: "slide2", label: "And again",
      views: [{ frame: withMa, title: "rolling(3).mean()", highlights: windowAt(5), badge: "rows 3-5" }],
      explain: "By W06 the raw series has dipped (166 down to 149) but the moving average barely moves. That damping is the entire point: one bad week cannot swing a three-week average far.",
    },
    {
      id: "nans", label: "The leading NaNs",
      views: [{ frame: withMa, title: "result", highlights: nanHl, badge: "first 2 rows" }],
      explain: "A window of n always costs you the first n-1 rows. Do not paper over them with fillna(0) — a zero moving average is a claim you did not measure. Leave them NaN, or shorten the window.",
      variables: [{ name: "ma3.isna().sum()", type: "int", preview: String(W - 1) }],
    },
    {
      id: "min-periods", label: "min_periods=1 for partial windows",
      views: [{ frame: withPartial, title: "rolling(3, min_periods=1).mean()", highlights: { "0:2": "new", "1:2": "new" }, badge: "no NaNs" }],
      explain: `min_periods=1 emits a result as soon as there is at least one value, so W01 is just its own value (${maPartial[0]}) and W02 is the mean of two. Convenient for charts, but the first rows are averaging fewer weeks than the rest — do not compare them to later ones.`,
    },
    {
      id: "compare", label: "Raw vs smoothed",
      views: [{ frame: withMa, title: "sales vs ma3", highlights: hlCols([2], 8, "match"), badge: "the trend" }],
      explain: "Side by side, the smoothed column climbs steadily while the raw column zigzags. That is what you want on a dashboard: rolling for the trend line, raw for the individual weeks.",
    },
  ];

  return (
    <PageShell meta={PAGES["rolling"]}>
      <StepRunner runId="rolling" steps={steps} code={`df["ma3"] = df["sales"].rolling(3).mean()

# The window is right-anchored: the result lands on the LAST row it covers.
# A window of n means the first n-1 results are NaN.

df["sales"].rolling(3, min_periods=1).mean()   # emit partial windows
df["sales"].rolling(3, center=True).mean()     # centre the window instead
df["sales"].rolling(3).agg(["mean", "std"])    # any aggregation works`} />
    </PageShell>
  );
}

export function ShiftLagPage() {
  const prev: CellValue[] = SALES.map((_, i) => (i === 0 ? null : SALES[i - 1]));
  const delta: CellValue[] = SALES.map((v, i) => (i === 0 ? null : v - SALES[i - 1]));
  const pct: CellValue[] = SALES.map((v, i) =>
    i === 0 ? null : round1(((v - SALES[i - 1]) / SALES[i - 1]) * 100));

  const base = df({ week: WEEK, sales: SALES });
  const withPrev = df({ week: WEEK, sales: SALES, prev_week: prev });
  const withDelta = df({ week: WEEK, sales: SALES, prev_week: prev, delta });
  const withPct = df({ week: WEEK, sales: SALES, prev_week: prev, wow_pct: pct });

  // Same data, shuffled — the mistake that makes shift silently wrong.
  const order = [2, 0, 4, 1, 6, 3, 7, 5];
  const shuffled = df({
    week: order.map((i) => WEEK[i]),
    sales: order.map((i) => SALES[i]),
    prev_week: order.map((_, r) => (r === 0 ? null : SALES[order[r - 1]])),
  });

  const shiftHl: HighlightMap = { "0:2": "null" };
  for (let r = 1; r < WEEK.length; r++) shiftHl[`${r}:2`] = "changed";

  const steps: Step[] = [
    {
      id: "raw", label: "The series",
      views: [{ frame: base, title: "df", badge: "8 weeks" }],
      explain: "To report week-over-week growth you need two numbers on the same row: this week and last week. Right now last week's value lives on a different row, which arithmetic cannot reach.",
    },
    {
      id: "diagram", label: "shift moves values down", diagram: "shift-lag",
      views: [{ frame: base, title: "df", badge: "shift(1)" }],
      explain: "shift(1) slides every value down one row. W01's value lands on W02, W02's on W03, and so on. Now each row carries both its own value and the previous one — the comparison becomes a single subtraction.",
    },
    {
      id: "prev", label: "The lagged column",
      views: [{ frame: withPrev, title: "df['prev_week'] = df['sales'].shift(1)", highlights: shiftHl, badge: "shifted by 1" }],
      explain: "prev_week is just sales moved down a row. W01 has nothing above it, so it gets NaN — a real gap, not an error. Filling it with zero would make W01's growth read as infinite.",
      variables: [{ name: "df['prev_week'][0]", type: "float64", preview: "NaN" }],
    },
    {
      id: "delta", label: "Absolute change",
      views: [{ frame: withDelta, title: "sales - prev_week", highlights: hlCols([3], 8, "new"), badge: "delta" }],
      explain: "Subtract and you have the absolute week-over-week change. The NaN propagates: anything minus NaN is NaN, so row W01 stays empty without any special-casing on your part.",
    },
    {
      id: "pct", label: "Percentage growth",
      views: [{ frame: withPct, title: "(sales - prev) / prev * 100", highlights: hlCols([3], 8, "new"), badge: "WoW %" }],
      explain: `Divide by the previous value for the percentage. W02 grew ${pct[1]}%, and W06 fell ${pct[5]}%. pandas ships this as .pct_change(), which is shift plus this arithmetic in one call.`,
      variables: [{ name: "df['sales'].pct_change()", type: "Series", preview: "same numbers / 100" }],
    },
    {
      id: "sort-first", label: "The trap: unsorted rows",
      views: [{ frame: shuffled, title: "df.shift(1) on unsorted data", highlights: { "*:2": "drop" }, badge: "silently wrong" }],
      explain: "shift works on ROW POSITION, not on dates. If the frame is not sorted by time, 'previous week' is whatever row happened to be above — and every growth number is quietly wrong. Always sort_values('date') before shifting.",
    },
    {
      id: "periods", label: "Longer lags",
      views: [{ frame: withPrev, title: "shift(4) for month-over-month", badge: "periods=4" }],
      explain: "The argument is how many rows to move. On weekly data shift(4) is roughly month-over-month and shift(52) is year-over-year. Negative values look forward instead: shift(-1) brings the NEXT row back, which is how you build prediction targets.",
    },
    {
      id: "grouped", label: "Per group, not across groups",
      views: [{ frame: withDelta, title: "df.groupby('region')['sales'].shift(1)", badge: "groupby + shift" }],
      explain: "With several regions stacked in one frame, a plain shift would bleed the last row of one region into the first row of the next. df.groupby('region')['sales'].shift(1) restarts the lag at every group boundary — the first row of each group correctly gets NaN.",
    },
  ];

  return (
    <PageShell meta={PAGES["shift-lag"]}>
      <StepRunner runId="shift-lag" steps={steps} code={`df = df.sort_values("week")        # ALWAYS sort first: shift uses row order

df["prev_week"] = df["sales"].shift(1)
df["delta"]     = df["sales"] - df["prev_week"]
df["wow_pct"]   = (df["sales"] - df["prev_week"]) / df["prev_week"] * 100

df["sales"].pct_change()           # the same thing, built in
df["sales"].shift(4)               # ~month-over-month on weekly data
df["sales"].shift(-1)              # look FORWARD one row

# Several regions in one frame? Restart the lag per group:
df.groupby("region")["sales"].shift(1)`} />
    </PageShell>
  );
}

// 19. Resampling

// Deliberately irregular: some days have several orders, some have none.
const TX_DATE = [
  "2024-03-01", "2024-03-01", "2024-03-03", "2024-03-04",
  "2024-03-08", "2024-03-11", "2024-03-12", "2024-03-12", "2024-03-19",
];
const TX_AMOUNT = [120, 80, 260, 95, 310, 140, 60, 200, 175];

/** ISO week bucket (Mondays) for each transaction date. */
function weekOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function ResamplePage() {
  const TX = df({ date: TX_DATE, amount: TX_AMOUNT });

  const weeks = [...new Set(TX_DATE.map(weekOf))].sort();
  // Every Monday in the span, including the one with no transactions at all.
  const allWeeks: string[] = [];
  for (let d = new Date(weeks[0] + "T00:00:00Z"); d.toISOString().slice(0, 10) <= weeks[weeks.length - 1];
       d.setUTCDate(d.getUTCDate() + 7)) {
    allWeeks.push(d.toISOString().slice(0, 10));
  }

  const weekSum = (w: string) =>
    TX_AMOUNT.filter((_, i) => weekOf(TX_DATE[i]) === w).reduce((a, b) => a + b, 0);
  const weekCount = (w: string) => TX_DATE.filter((d) => weekOf(d) === w).length;

  const strTx = withIndex(df({ amount: TX_AMOUNT }), TX_DATE, ["date"]);

  const resampled = withIndex(
    df({ amount: allWeeks.map(weekSum), n_orders: allWeeks.map(weekCount) }),
    allWeeks, ["date"],
  );

  const groupbyVersion = withIndex(
    df({ amount: weeks.map(weekSum) }), weeks, ["week"],
  );

  const emptyWeeks = allWeeks.map((w, i) => (weekCount(w) === 0 ? i : -1)).filter((i) => i >= 0);
  const emptyHl = hlRows(emptyWeeks, 2, "null");

  const daily = withIndex(
    df({ amount: ["...", "...", "..."] }),
    ["2024-03-01", "2024-03-02", "2024-03-03"], ["date"],
  );

  const steps: Step[] = [
    {
      id: "raw", label: "Irregular transactions",
      views: [{ frame: TX, title: "tx", badge: "9 orders, uneven days" }],
      explain: "Raw transaction logs are irregular: two orders on the 1st, none on the 2nd, a gap over the 5th to the 7th. Nobody reports at this granularity - you roll it up to days, weeks, or months first.",
    },
    {
      id: "dtype", label: "Strings will not do",
      views: [{ frame: TX, title: "tx", highlights: hlMerge(hlCols([0], 9, "drop"), { "h:0": "drop" }), badge: "dtype: object" }],
      explain: "Those dates are strings. Sorting them happens to work for ISO format and breaks for anything else, and no time-aware operation will touch them. pd.to_datetime first - this is the step people skip.",
      variables: [{ name: "tx['date'].dtype", type: "dtype", preview: "object  (should be datetime64)" }],
    },
    {
      id: "index", label: "resample needs a DatetimeIndex",
      views: [{ frame: strTx, title: "tx.set_index('date')", highlights: { "i:*": "match" }, badge: "dates are now the index" }],
      explain: "resample buckets along the INDEX, so the datetime column has to become the index. Alternatively pass on='date' and let resample find the column - but the index form is what you will see in most code.",
    },
    {
      id: "buckets", label: "Bucket by frequency",
      views: [{ frame: resampled, title: "tx.resample('W-MON')['amount'].sum()", highlights: hlCols([0], allWeeks.length, "new"), badge: "one row per week" }],
      explain: "resample('W') is groupby for time: every row falls into the calendar bucket that contains it, and the aggregation runs per bucket. D, W, ME, QE and YE cover almost everything you will need.",
    },
    {
      id: "gaps", label: "The difference that matters",
      views: [{ frame: resampled, title: "resample fills empty periods", highlights: emptyHl, badge: "a week with no orders" }],
      explain: "Here is what separates resample from groupby: resample emits EVERY period in the range, including ones with no data. That quiet week shows up as a real row with zero. It is a gap in your business, and a chart built on it will show the dip.",
    },
    {
      id: "groupby-compare", label: "groupby would hide it",
      views: [
        { frame: groupbyVersion, title: "groupby(week).sum()", badge: `${weeks.length} rows - gap missing` },
        { frame: resampled, title: "resample('W').sum()", highlights: emptyHl, badge: `${allWeeks.length} rows - gap shown` },
      ],
      explain: "Same data, same aggregation, different row counts. groupby only ever produces keys that exist in the data, so the empty week silently vanishes and your line chart draws straight through it. For anything time-based, this is why resample is the right tool.",
    },
    {
      id: "agg", label: "Any aggregation, several at once",
      views: [{ frame: resampled, title: ".agg({'amount': 'sum', 'order_id': 'count'})", highlights: hlCols([1], allWeeks.length, "match"), badge: "sum + count" }],
      explain: "resample returns a groupby-like object, so everything from the aggregation lesson applies: .sum(), .mean(), .agg() with a dict, named aggregation. Revenue and order count per week in one pass.",
    },
    {
      id: "upsample", label: "Upsampling goes the other way",
      views: [{ frame: daily, title: "resample('D').ffill()", badge: "coarse to fine" }],
      explain: "Resampling to a FINER frequency creates rows that have no data - you have to say what fills them. ffill carries the last known value forward, interpolate draws a line between points, asfreq leaves NaN. Choose deliberately: ffill on a monthly price series invents 29 days of flat prices.",
    },
  ];

  return (
    <PageShell meta={PAGES["resample"]}>
      <StepRunner runId="resample" steps={steps} code={`tx["date"] = pd.to_datetime(tx["date"])     # strings will not resample
tx = tx.set_index("date")                    # resample buckets on the INDEX

tx.resample("W")["amount"].sum()             # weekly revenue
tx.resample("ME")["amount"].sum()            # month end
tx.resample("W").agg(revenue=("amount", "sum"), orders=("amount", "count"))

# resample emits EVERY period, including empty ones.
# groupby only emits keys that exist - which silently hides quiet weeks.
tx.groupby(tx.index.to_period("W"))["amount"].sum()

# Upsampling creates empty rows: say how they fill
tx.resample("D")["amount"].ffill()
tx.resample("D")["amount"].interpolate()`} />
    </PageShell>
  );
}
