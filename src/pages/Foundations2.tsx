import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, takeRows, hlCols, hlHeaders, hlRows, hlMerge, series, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

const DRINK = ["Latte", "Espresso", "Mocha", "Cappuccino", "Americano", "Cold Brew"];
const SIZE = ["L", "S", "L", "M", "M", "L"];
const PRICE = [280, 180, 320, 250, 200, 300];
const QTY = [45, 72, 31, 55, 40, 38];
const RATING = [4.5, 4.2, 4.8, 4.3, 3.9, 4.6];

const COFFEE = df({ drink: DRINK, size: SIZE, price: PRICE, qty: QTY, rating: RATING });

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => round2(sum(xs) / xs.length);

// 6. Sorting & Top-N

export function SortingTopNPage() {
  const byPriceDesc = [...PRICE.keys()].sort((a, b) => PRICE[b] - PRICE[a]);
  const sorted = takeRows(COFFEE, byPriceDesc);
  const top3 = takeRows(COFFEE, byPriceDesc.slice(0, 3));

  // Multi-key: size ascending, then price descending inside each size.
  const multi = [...PRICE.keys()].sort(
    (a, b) => SIZE[a].localeCompare(SIZE[b]) || PRICE[b] - PRICE[a],
  );
  const multiSorted = takeRows(COFFEE, multi);
  const sizeTones: Record<string, import("@/types").HighlightKind> = { L: "group-a", M: "group-b", S: "group-c" };
  const multiHl: HighlightMap = {};
  multi.forEach((src, r) => { for (let c = 0; c < 5; c++) multiHl[`${r}:${c}`] = sizeTones[SIZE[src]]; });

  const revenue = PRICE.map((p, i) => p * QTY[i]);
  const withRevenue = df({ drink: DRINK, price: PRICE, qty: QTY, revenue });
  const byRevenue = [...revenue.keys()].sort((a, b) => revenue[b] - revenue[a]);
  const topRevenue = takeRows(withRevenue, byRevenue.slice(0, 3));

  const steps: Step[] = [
    {
      id: "raw", label: "Insertion order means nothing",
      views: [{ frame: COFFEE, title: "menu", badge: "6 drinks" }],
      explain: "Rows arrive in whatever order they were written. Any question about best, worst, or top-N needs an explicit ordering first - and pandas will never guess one for you.",
    },
    {
      id: "sort", label: "sort_values reorders rows",
      views: [{ frame: sorted, title: "df.sort_values('price', ascending=False)", highlights: hlCols([2], 6, "match"), badge: "highest first" }],
      explain: "The whole row travels with its sort key - Mocha's qty and rating move with its price. Watch the index column: it is still 2, 5, 0, ... because the labels belong to the rows, not to their positions.",
      variables: [{ name: "sorted.index.tolist()", type: "list", preview: `[${byPriceDesc.join(", ")}]` }],
    },
    {
      id: "index", label: "The index is now scrambled",
      views: [{ frame: sorted, title: "sorted", highlights: { "i:*": "changed" }, badge: "labels kept their rows" }],
      explain: "After sorting, .iloc[0] and .loc[0] point at different rows - position 0 is Mocha, label 0 is Latte. Add reset_index(drop=True) if the old labels no longer mean anything, and keep them if they do.",
    },
    {
      id: "multi", label: "Multiple keys break ties",
      views: [{ frame: multiSorted, title: "sort_values(['size', 'price'], ascending=[True, False])", highlights: multiHl, badge: "size, then price within it" }],
      explain: "Pass a list and pandas sorts by the first key, then uses the second only within ties. ascending takes a list too, so you can sort size A-Z while sorting price high-to-low inside each size group.",
    },
    {
      id: "stable", label: "Ties keep their original order",
      views: [{ frame: multiSorted, title: "kind='mergesort' is stable", highlights: hlRows([0, 1, 2], 5, "match"), badge: "predictable" }],
      explain: "The default quicksort does NOT preserve the relative order of equal values, so two rows with the same price can swap between runs. Pass kind='mergesort' when you need a stable, reproducible ordering - it matters more than people expect in tests and reports.",
    },
    {
      id: "topn", label: "nlargest says what you mean",
      views: [{ frame: top3, title: "df.nlargest(3, 'price')", highlights: hlCols([2], 3, "new"), badge: "3 rows" }],
      explain: "Same answer as sort_values().head(3), and it states the intent directly. It also does less work: finding the top 3 does not require ordering the other rows, so on a large frame it is meaningfully faster.",
      bars: {
        title: "Top 10 of 1M rows",
        bars: [
          { label: "sort + head", value: 210, display: "210 ms", tone: "slow" },
          { label: "nlargest", value: 38, display: "38 ms", tone: "fast" },
        ],
        note: "sort_values orders all million rows to give you ten of them.",
      },
    },
    {
      id: "derived", label: "Sort by something you computed",
      views: [{ frame: topRevenue, title: "nlargest(3, 'revenue')", highlights: hlMerge(hlCols([3], 3, "new"), hlHeaders([3], "new")), badge: "price x qty" }],
      explain: "The interesting ranking is rarely a raw column. Cappuccino is only the fourth most expensive drink but the top earner, because it sells well. Compute the metric, then rank on it - that is where the actual insight lives.",
    },
    {
      id: "nan", label: "Where do NaNs go?",
      views: [{ frame: sorted, title: "na_position='last' by default", highlights: { "5:*": "null" }, badge: "always at the end" }],
      explain: "sort_values puts NaN last regardless of direction, so a descending sort does not start with them. nlargest drops them entirely. Neither is wrong, but if missing values are the thing you are hunting, sorting will quietly hide them at the bottom.",
    },
  ];

  return (
    <PageShell meta={PAGES["sorting-topn"]}>
      <StepRunner runId="sorting-topn" steps={steps} code={`df.sort_values("price", ascending=False)

# Multiple keys, per-key direction
df.sort_values(["size", "price"], ascending=[True, False])

df.sort_values("price", kind="mergesort")     # stable: ties keep their order
df.sort_values("price").reset_index(drop=True)  # drop labels that no longer mean anything

df.nlargest(3, "price")      # says what you mean, and does less work
df.nsmallest(3, "price")

# Rank on what you computed, not on a raw column
df["revenue"] = df["price"] * df["qty"]
df.nlargest(3, "revenue")

df.sort_values("price", na_position="first")  # default is "last"`} />
    </PageShell>
  );
}

// 7. Basic Aggregation

export function BasicAggPage() {
  const revenue = PRICE.map((p, i) => p * QTY[i]);

  const singleStats = withIndex(
    df({ value: [PRICE.length, mean(PRICE), Math.min(...PRICE), Math.max(...PRICE), sum(PRICE)] as CellValue[] }),
    ["count", "mean", "min", "max", "sum"], ["statistic"],
  );

  const multiCol = withIndex(
    df({
      price: [sum(PRICE), mean(PRICE), Math.min(...PRICE), Math.max(...PRICE)],
      qty: [sum(QTY), mean(QTY), Math.min(...QTY), Math.max(...QTY)],
    }),
    ["sum", "mean", "min", "max"], ["statistic"],
  );

  const withNulls: CellValue[] = [4.5, null, 4.8, 4.3, null, 4.6];
  const observed = [4.5, 4.8, 4.3, 4.6];
  const nullFrame = df({ drink: DRINK, rating: withNulls });
  const nullStats = withIndex(
    df({ value: [observed.length, mean(observed), round2(sum(observed) / 6)] as CellValue[] }),
    ["count()", "mean()", "sum() / len(df)"], ["statistic"],
  );

  const weighted = df({
    drink: DRINK, price: PRICE, qty: QTY, revenue,
  });

  const nullHl: HighlightMap = { "1:1": "null", "4:1": "null" };

  const steps: Step[] = [
    {
      id: "scalar", label: "An aggregation collapses to one number",
      views: [
        { frame: series("price", PRICE), title: "df['price']", badge: "6 values", render: "series" },
        { frame: series("", [mean(PRICE)], { dtype: "float64" }), title: "df['price'].mean()", badge: "a scalar, not a Series", render: "series" },
      ],
      explain: "Six values in, one out. That is the defining move of an aggregation, and it is why the result is a plain number rather than a Series - there is no index left to attach it to.",
      variables: [{ name: "type(df['price'].mean())", type: "class", preview: "numpy.float64" }],
    },
    {
      id: "family", label: "The same shape, different questions",
      views: [{ frame: singleStats, title: "one column, five statistics", highlights: hlCols([0], 5, "match"), badge: "count, mean, min, max, sum" }],
      explain: "Every aggregation follows Series -> scalar. count for how many, sum for a total, mean and median for the centre, min and max for the extremes, std for the spread, nunique for distinct values.",
    },
    {
      id: "whole-frame", label: "Aggregating the whole frame",
      views: [{ frame: multiCol, title: "df[['price','qty']].agg(['sum','mean','min','max'])", highlights: hlHeaders([0, 1], "match"), badge: "one column per input" }],
      explain: "Call an aggregation on a DataFrame and it runs down each column independently, returning a Series indexed by column name. .agg with a list gives a whole grid - statistics down, columns across.",
    },
    {
      id: "describe", label: "describe() is the fast overview",
      views: [{ frame: multiCol, title: "df.describe()", highlights: hlCols([0], 4, "new"), badge: "8 statistics at once" }],
      explain: "describe() returns count, mean, std, min, the three quartiles and max for every numeric column. It is the first thing to run on unfamiliar data - a min of -1 in a quantity column or a max far from the 75th percentile tells you where to look next.",
    },
    {
      id: "nan", label: "NaN is skipped, silently",
      views: [{ frame: nullFrame, title: "two ratings missing", highlights: nullHl, badge: "6 rows, 4 values" }],
      explain: "Every aggregation ignores NaN by default. mean() here divides by 4, not 6 - which is usually what you want, and is never announced. The row count and the value count have quietly diverged.",
    },
    {
      id: "nan-danger", label: "Which denominator did you mean?",
      views: [{ frame: nullStats, title: "three plausible answers", highlights: { "1:0": "new", "2:0": "changed" }, badge: "4.55 vs 3.03" }],
      explain: `count() gives ${observed.length}, not 6. mean() gives ${mean(observed)} - the average of what was measured. Dividing the sum by len(df) gives ${round2(sum(observed) / 6)} - treating missing as zero. All three are defensible; only one matches your question. Check isna().sum() before you quote an average.`,
    },
    {
      id: "weighted", label: "The average that misleads",
      views: [{ frame: weighted, title: "mean price vs revenue per unit", highlights: hlMerge(hlCols([1], 6, "match"), hlCols([3], 6, "new")), badge: `${mean(PRICE)} vs ${round2(sum(revenue) / sum(QTY))}` }],
      explain: `The mean price is ${mean(PRICE)}, but the average price customers actually paid is ${round2(sum(revenue) / sum(QTY))} - lower, because the cheap Espresso outsells everything. A plain mean weights every ROW equally; you usually want to weight by volume. Sum the parts and divide, rather than averaging the averages.`,
      variables: [{ name: "df['price'].mean()", type: "float", preview: String(mean(PRICE)) },
                  { name: "revenue.sum() / qty.sum()", type: "float", preview: String(round2(sum(revenue) / sum(QTY))) }],
    },
    {
      id: "median", label: "Mean or median?",
      views: [{ frame: singleStats, title: "when they disagree, ask why", highlights: { "1:0": "match" }, badge: "outliers move the mean" }],
      explain: "The mean uses every value, so one extreme row drags it. The median only cares about the middle. When they differ substantially your data is skewed - and for anything money-shaped, the median is usually the more honest headline number.",
    },
  ];

  return (
    <PageShell meta={PAGES["basic-agg"]}>
      <StepRunner runId="basic-agg" steps={steps} code={`df["price"].mean()          # Series -> one scalar
df["price"].agg(["count", "mean", "min", "max", "sum"])

df[["price", "qty"]].mean()          # per column -> a Series
df[["price", "qty"]].agg(["sum", "mean"])
df.describe()                        # the overview to run first

# NaN is skipped, silently - these are three different questions
df["rating"].count()                 # non-null values
df["rating"].mean()                  # average of what was measured
df["rating"].sum() / len(df)         # treats missing as zero
df["rating"].isna().sum()            # check before quoting an average

# A plain mean weights every ROW equally
df["price"].mean()                              # unweighted
(df["price"] * df["qty"]).sum() / df["qty"].sum()   # weighted by volume`} />
    </PageShell>
  );
}

// 8. Working with Dates

export function DatesPage() {
  const RAW = ["2024-01-15", "2024-01-28", "2024-02-03", "2024-02-19", "2024-03-07", "2024-03-22"];
  const AMOUNT = [1200, 890, 1450, 760, 1680, 1100];

  const asStrings = df({ date_str: RAW, amount: AMOUNT });

  const parts = RAW.map((d) => {
    const dt = new Date(d + "T00:00:00Z");
    return {
      year: dt.getUTCFullYear(),
      month: dt.getUTCMonth() + 1,
      day: dt.getUTCDate(),
      dayName: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][(dt.getUTCDay() + 6) % 7],
    };
  });

  const parsed = df({ date: RAW, amount: AMOUNT });
  const withParts = df({
    date: RAW,
    year: parts.map((p) => p.year),
    month: parts.map((p) => p.month),
    day_name: parts.map((p) => p.dayName),
  });

  const months = [...new Set(parts.map((p) => p.month))];
  const monthly = withIndex(
    df({ amount: months.map((m) => sum(AMOUNT.filter((_, i) => parts[i].month === m))) }),
    months.map((m) => `2024-0${m}`), ["month"],
  );

  const badSort = df({
    naive_string_sort: ["1/15/2024", "1/28/2024", "10/2/2024", "2/3/2024"],
    correct_order: ["2024-01-15", "2024-01-28", "2024-02-03", "2024-10-02"],
  });

  const steps: Step[] = [
    {
      id: "strings", label: "Dates arrive as text",
      views: [{ frame: asStrings, title: "orders", highlights: hlMerge(hlCols([0], 6, "drop"), hlHeaders([0], "drop")), badge: "dtype: object" }],
      explain: "Read a CSV and every date is a string. It LOOKS fine - the values are readable and even sort correctly in ISO format - which is exactly why this step gets skipped.",
      variables: [{ name: "df['date_str'].dtype", type: "dtype", preview: "object" }],
    },
    {
      id: "why", label: "What breaks if you leave them",
      views: [{ frame: badSort, title: "string sort vs date sort", highlights: hlMerge(hlCols([0], 4, "drop"), hlCols([1], 4, "new"), hlHeaders([0], "drop"), hlHeaders([1], "new")), badge: "10/2 before 2/3" }],
      explain: "Sorted as text, October comes before February - because '1' precedes '2' character by character. You also cannot subtract them, resample them, or extract a month. ISO strings hide this by sorting correctly, which just delays the discovery.",
    },
    {
      id: "parse", label: "pd.to_datetime",
      views: [{ frame: parsed, title: "pd.to_datetime(df['date_str'])", highlights: hlMerge(hlCols([0], 6, "new"), hlHeaders([0], "new")), badge: "dtype: datetime64[ns]" }],
      explain: "One call converts the column. Do it immediately after loading, before anything else touches the data - every later operation assumes it has been done.",
      variables: [{ name: "df['date'].dtype", type: "dtype", preview: "datetime64[ns]" }],
    },
    {
      id: "ambiguous", label: "03/04/2024 is a real problem",
      views: [{ frame: parsed, title: "March 4th or April 3rd?", highlights: { "*:0": "changed" }, badge: "pass format=" }],
      explain: "Ambiguous formats are guessed, and a guess that succeeds on the first thousand rows can flip halfway through a file. Pass format='%d/%m/%Y' explicitly - it is faster too, since pandas stops inferring. Use errors='coerce' to turn unparseable values into NaT instead of an exception, then count them.",
    },
    {
      id: "dt", label: "The .dt accessor",
      views: [{ frame: withParts, title: ".dt.year, .dt.month, .dt.day_name()", highlights: hlMerge(hlCols([1, 2, 3], 6, "new"), hlHeaders([1, 2, 3], "new")), badge: "components as columns" }],
      explain: ".dt is to datetimes what .str is to strings: vectorized access to the parts. year, month, day, hour, dayofweek, day_name(), quarter, is_month_end - each returns a full column, ready to group by.",
    },
    {
      id: "group", label: "Now time-based grouping works",
      views: [{ frame: monthly, title: "groupby(df['date'].dt.to_period('M'))['amount'].sum()", highlights: hlCols([0], months.length, "new"), badge: "monthly revenue" }],
      explain: "This is the payoff. Monthly totals need a real month, and a real month needs a real datetime. to_period('M') is cleaner than grouping on .dt.month, which would merge January 2024 with January 2025.",
    },
    {
      id: "arithmetic", label: "Date arithmetic gives durations",
      views: [{ frame: parsed, title: "df['date'].max() - df['date'].min()", badge: "Timedelta" }],
      explain: "Subtracting two datetimes gives a Timedelta, not a number. .dt.days pulls out whole days - the step people forget, right before comparing a Timedelta to an integer and getting a confusing error. Add time with pd.Timedelta(days=30) or pd.DateOffset(months=1), which handles month lengths properly.",
    },
    {
      id: "index", label: "Dates as the index",
      views: [{ frame: monthly, title: "df.set_index('date')", highlights: { "i:*": "match" }, badge: "unlocks resample and slicing" }],
      explain: "With a DatetimeIndex you get df.loc['2024-02'] for a whole month and df.loc['2024-01':'2024-02'] for a range, plus resample for time-aware rollups. Sort the index afterwards - slicing an unsorted DatetimeIndex is slow and can raise.",
    },
  ];

  return (
    <PageShell meta={PAGES["dates"]}>
      <StepRunner runId="dates" steps={steps} code={`df["date"] = pd.to_datetime(df["date_str"])       # do this on load

# Ambiguous formats: be explicit rather than lucky
pd.to_datetime(df["d"], format="%d/%m/%Y")
pd.to_datetime(df["d"], errors="coerce")          # bad values -> NaT, not a crash
df["date"].isna().sum()                           # then count what failed

df["year"]     = df["date"].dt.year
df["month"]    = df["date"].dt.month
df["day_name"] = df["date"].dt.day_name()
df["quarter"]  = df["date"].dt.quarter

# Group by a real period, not just the month number
df.groupby(df["date"].dt.to_period("M"))["amount"].sum()

(df["date"].max() - df["date"].min()).days        # Timedelta -> int
df["due"] = df["date"] + pd.Timedelta(days=30)

df = df.set_index("date").sort_index()
df.loc["2024-02"]              # a whole month
df.loc["2024-01":"2024-02"]    # a range`} />
    </PageShell>
  );
}

// 9. Missing Data Basics

export function MissingBasicsPage() {
  const NAMES = ["Asha", "Ben", "Chen", "Dara", "Eve", "Farid"];
  const SCORES: CellValue[] = [88, null, 74, 91, null, 66];
  const EMAILS: CellValue[] = ["asha@x.com", "ben@x.com", null, "dara@x.com", "eve@x.com", "farid@x.com"];

  const students = df({ name: NAMES, score: SCORES, email: EMAILS });

  const nullCounts = withIndex(
    df({ n_missing: [0, 2, 1], pct: [0, 33.3, 16.7] }),
    ["name", "score", "email"], ["column"],
  );

  const observed = SCORES.filter((v): v is number => v !== null);
  const med = 81;

  const dropAny = df({
    name: ["Asha", "Dara", "Farid"],
    score: [88, 91, 66] as CellValue[],
    email: ["asha@x.com", "dara@x.com", "farid@x.com"] as CellValue[],
  });
  const dropSubset = df({
    name: ["Asha", "Ben", "Dara", "Eve", "Farid"],
    score: [88, null, 91, null, 66] as CellValue[],
  });
  const filled = df({
    name: NAMES,
    score: SCORES.map((v) => (v === null ? med : v)),
    was_missing: SCORES.map((v) => v === null),
  });

  const nullHl: HighlightMap = { "1:1": "null", "4:1": "null", "2:2": "null" };

  const steps: Step[] = [
    {
      id: "data", label: "Gaps in two columns",
      views: [{ frame: students, title: "students", highlights: nullHl, badge: "3 NaNs" }],
      explain: "NaN means 'no value here'. It is not zero, not an empty string, and not False - it is the absence of a measurement, and pandas treats it as its own thing throughout.",
    },
    {
      id: "detect", label: "Find them first",
      views: [{ frame: nullCounts, title: "df.isna().sum()", highlights: hlCols([0], 3, "match"), badge: "per column" }],
      explain: "isna() gives a True/False frame; summing it counts per column, because True adds as 1. df.isna().mean() gives the proportion instead, which is easier to judge - 33% missing reads very differently from '2'.",
    },
    {
      id: "equality", label: "NaN is not equal to itself",
      views: [{ frame: students, title: "df['score'] == np.nan is ALWAYS False", highlights: { "*:1": "drop" }, badge: "use isna()" }],
      explain: "By IEEE rules NaN equals nothing, including another NaN. So filtering with == np.nan silently returns zero rows, every time. Always use .isna() and .notna() - there is no comparison operator that works.",
      variables: [{ name: "np.nan == np.nan", type: "bool", preview: "False" }],
    },
    {
      id: "silent", label: "Aggregations skip them quietly",
      views: [{ frame: students, title: "df['score'].mean()", highlights: { "1:1": "null", "4:1": "null" }, badge: `divides by ${observed.length}, not 6` }],
      explain: `mean() averages the ${observed.length} scores that exist and never mentions the two that do not. count() returns ${observed.length} while len(df) returns 6. Neither is wrong; both are easy to quote as if they covered everyone.`,
    },
    {
      id: "dropna", label: "dropna is blunt by default",
      views: [{ frame: dropAny, title: "df.dropna()", highlights: { "*:*": "drop" }, badge: "6 rows to 3" }],
      explain: "With no arguments it removes any row with a NaN ANYWHERE. Chen is deleted for a missing email even though the score was fine - half the data gone to fix three cells. This is almost never what you actually wanted.",
    },
    {
      id: "subset", label: "Say which column matters",
      views: [{ frame: dropSubset, title: "df.dropna(subset=['email'])", highlights: hlRows([1, 3], 2, "null"), badge: "5 rows kept" }],
      explain: "subset restricts the check to the columns you truly cannot proceed without. Only Chen goes; the missing scores stay, because a missing score is a fact about that student rather than a broken row. how='all' is stricter still - drop only rows that are entirely empty.",
    },
    {
      id: "fillna", label: "fillna replaces",
      views: [{ frame: filled, title: "score.fillna(score.median())", highlights: hlMerge({ "1:1": "new", "4:1": "new" }, hlCols([2], 6, "changed"), hlHeaders([2], "changed")), badge: `both become ${med}` }],
      explain: `fillna substitutes a value - here the median, ${med}, which resists outliers better than the mean. Note the second column: record was_missing BEFORE filling. Once filled, invented values are indistinguishable from measured ones, forever.`,
    },
    {
      id: "decision", label: "Zero is a claim",
      views: [{ frame: filled, title: "fillna(0) says 'they scored nothing'", highlights: { "1:1": "drop", "4:1": "drop" }, badge: "a different statement" }],
      explain: "fillna(0) is the most common and most damaging default. On a score column it asserts two students scored zero, dragging the average down and inventing failures. Ask what the absence means: not measured, not applicable, or genuinely nothing? Only the last one deserves a zero.",
    },
  ];

  return (
    <PageShell meta={PAGES["missing-basics"]}>
      <StepRunner runId="missing-basics" steps={steps} code={`df.isna().sum()          # count per column
df.isna().mean() * 100   # percentage - easier to judge

# NaN != NaN, so comparison NEVER works
df[df["score"] == np.nan]     # always empty
df[df["score"].isna()]        # correct

df.dropna()                        # any NaN anywhere - usually too blunt
df.dropna(subset=["email"])        # only what you cannot proceed without
df.dropna(how="all")               # only fully empty rows

df["was_missing"] = df["score"].isna()          # BEFORE filling
df["score"] = df["score"].fillna(df["score"].median())

# fillna(0) claims the value WAS zero. On a score column that invents failures.`} />
    </PageShell>
  );
}

// 10. Chaining vs Intermediates

export function ChainingPage() {
  const revenue = PRICE.map((p, i) => p * QTY[i]);
  const full = df({ drink: DRINK, size: SIZE, price: PRICE, qty: QTY, revenue });

  const keptIdx = PRICE.map((p, i) => (p >= 250 ? i : -1)).filter((i) => i >= 0);
  const filtered = takeRows(full, keptIdx);

  const sizes = [...new Set(keptIdx.map((i) => SIZE[i]))].sort();
  const grouped = withIndex(
    df({ revenue: sizes.map((s) => sum(keptIdx.filter((i) => SIZE[i] === s).map((i) => revenue[i]))) }),
    sizes, ["size"],
  );
  const finalOut = df({
    size: sizes,
    revenue: sizes.map((s) => sum(keptIdx.filter((i) => SIZE[i] === s).map((i) => revenue[i]))),
  });

  const maskHl: HighlightMap = {};
  PRICE.forEach((p, r) => { for (let c = 0; c < 5; c++) maskHl[`${r}:${c}`] = p >= 250 ? "mask-true" : "mask-false"; });

  const steps: Step[] = [
    {
      id: "task", label: "A four-step pipeline",
      views: [{ frame: full, title: "menu", highlights: hlMerge(hlCols([4], 6, "new"), hlHeaders([4], "new")), badge: "revenue per size, premium only" }],
      explain: "Add revenue, keep drinks at 250 or more, total by size, flatten the result. Four steps - and how you write them decides whether the next reader can follow it.",
    },
    {
      id: "intermediates", label: "Named intermediates",
      views: [{ frame: filtered, title: "premium = df[df['price'] >= 250]", highlights: hlCols([2], keptIdx.length, "match"), badge: "step 2 of 4" }],
      explain: "Four statements, four variables. Every stage is inspectable, which is exactly what you want while you are still working out what the pipeline should do. The cost is four names, and names that outlive their usefulness start to mislead.",
      variables: [{ name: "premium", type: "DataFrame", preview: `${keptIdx.length} rows` }],
    },
    {
      id: "shadowing", label: "The failure mode",
      views: [{ frame: filtered, title: "df = df[...]  # four times", highlights: { "*:*": "drop" }, badge: "which df is this?" }],
      explain: "Reassigning df at every step is the common shortcut, and it means the name tells you nothing about the state. Re-run one cell out of order in a notebook and you filter twice - no error, just a wrong answer. Chaining removes the opportunity entirely.",
    },
    {
      id: "chain-1", label: "Chaining: assign",
      views: [{ frame: full, title: ".assign(revenue=lambda d: d['price'] * d['qty'])", highlights: hlMerge(hlCols([4], 6, "new"), hlHeaders([4], "new")), badge: "step 1" }],
      explain: "assign adds a column and returns a new frame, so it fits mid-chain. The lambda receives the frame AS IT IS AT THAT POINT - which is what lets you use a column you created two lines earlier in the same chain.",
    },
    {
      id: "chain-2", label: "query, then groupby",
      views: [{ frame: full, title: ".query('price >= 250')", highlights: maskHl, badge: "step 2" }],
      explain: "query keeps the chain readable where a bracket filter would need the frame's name - which does not exist mid-chain. This is the practical reason to learn query: it is the only filter that composes.",
    },
    {
      id: "chain-3", label: "The result",
      views: [{ frame: finalOut, title: "the whole pipeline", highlights: hlCols([1], sizes.length, "new"), badge: "same answer" }],
      explain: "Identical output, one statement, no intermediate names. Read top to bottom, each line is one verb: add this, keep those, group by size, flatten. Nothing can be re-run out of order because there is no order to get wrong.",
    },
    {
      id: "debug", label: "Debugging a chain",
      views: [{ frame: grouped, title: ".pipe(lambda d: print(d.shape) or d)", badge: "inspect without breaking it" }],
      explain: "The usual objection is that a chain is hard to debug. Two answers: comment out the tail and run the head, or drop in .pipe with a print. Both let you see any intermediate without unpicking the chain into variables.",
    },
    {
      id: "when", label: "When to break it up",
      views: [{ frame: finalOut, title: "chain by default, break on purpose", badge: "the rule" }],
      explain: "Break the chain when a step is reused, when you genuinely need to inspect a middle result, or when it grows past five or six calls. Chain by default because it removes state; break deliberately when a name would explain something the chain cannot.",
    },
  ];

  return (
    <PageShell meta={PAGES["chaining"]}>
      <StepRunner runId="chaining" steps={steps} code={`# Intermediates - inspectable, but four names to keep straight
with_rev = df.assign(revenue=df["price"] * df["qty"])
premium  = with_rev[with_rev["price"] >= 250]
by_size  = premium.groupby("size")["revenue"].sum()
result   = by_size.reset_index()

# Chained - one statement, no state to get out of order
result = (
    df
    .assign(revenue=lambda d: d["price"] * d["qty"])
    .query("price >= 250")
    .groupby("size", as_index=False)["revenue"].sum()
)

# Debug without unpicking it
result = (
    df
    .assign(revenue=lambda d: d["price"] * d["qty"])
    .pipe(lambda d: print(d.shape) or d)      # peek, pass through
    .query("price >= 250")
)

# NOT this: the name stops meaning anything, and re-running double-filters
# df = df.assign(...); df = df[df[...]]; df = df.groupby(...)`} />
    </PageShell>
  );
}
