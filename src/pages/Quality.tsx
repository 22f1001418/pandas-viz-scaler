import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { NullMatrix } from "@/components/NullMatrix";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, hlRows, series, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

// 38. Classifying Missingness (MCAR / MAR / MNAR)

export function McarMarMnarPage() {
  const survey = df({
    respondent: ["r1", "r2", "r3", "r4", "r5", "r6"],
    age: [24, 41, 33, 58, 29, 47],
    device: ["app", "web", "app", "web", "app", "web"],
    income: [42000, null, 51000, null, 38000, null],
    rating: [4, 5, null, 4, 5, 3],
  });

  const byDevice = withIndex(
    df({ n: [3, 3], income_missing: [0, 3], pct: [0, 100] }),
    ["app", "web"], ["device"],
  );

  const incomeHl: HighlightMap = { "1:3": "null", "3:3": "null", "5:3": "null" };
  const ratingHl: HighlightMap = { "2:4": "null" };
  const deviceHl = hlMerge(
    { "1:2": "match", "3:2": "match", "5:2": "match" },
    incomeHl,
  );

  const kinds = df({
    kind: ["MCAR", "MAR", "MNAR"],
    depends_on: ["nothing", "other OBSERVED columns", "the missing value itself"],
    safe_to_drop: ["Yes, just loses power", "No, biases unless you condition", "No, needs domain knowledge"],
  });

  const steps: Step[] = [
    {
      id: "data", label: "Two columns with gaps",
      views: [{ frame: survey, title: "survey", highlights: hlMerge(incomeHl, ratingHl), badge: "5 NaNs" }],
      explain: "Both income and rating have gaps. Counting them tells you how many - it says nothing about whether dropping those rows is safe. That depends entirely on WHY they are missing.",
    },
    {
      id: "why", label: "The question is always 'why'",
      views: [{ frame: kinds, title: "three mechanisms", highlights: hlCols([1], 3, "match"), badge: "MCAR / MAR / MNAR" }],
      explain: "Three mechanisms, distinguished by what the missingness depends on: nothing at all, something you CAN see, or the hidden value itself. Your handling strategy follows from which one you are facing.",
    },
    {
      id: "mcar", label: "MCAR: missing at random",
      views: [{ frame: survey, title: "rating", highlights: ratingHl, badge: "no pattern" }],
      explain: "One rating is missing, and nothing about that respondent predicts it - a dropped packet, a skipped field. Dropping MCAR rows shrinks your sample but does not bend it: the survivors still look like the population. This is the only genuinely safe case.",
    },
    {
      id: "mar", label: "MAR: predictable from what you can see",
      views: [{ frame: survey, title: "survey", highlights: deviceHl, badge: "look at device" }],
      explain: "Look at income against device. Every missing income is a web respondent; every app respondent answered. The missingness is not random - it is fully explained by a column you already have.",
    },
    {
      id: "mar-proof", label: "Test it by grouping",
      views: [{ frame: byDevice, title: "survey.groupby('device')['income'].apply(lambda s: s.isna().mean())", highlights: hlCols([2], 2, "changed"), badge: "0% vs 100%" }],
      explain: "This is the diagnostic: group by each candidate column and compare missing rates. A flat rate suggests MCAR; a rate that swings with the group means MAR. Here it swings from 0% to 100% - as clear as this test ever gets.",
      variables: [{ name: "corr(isna(income), device)", type: "float", preview: "1.0  (perfectly explained)" }],
    },
    {
      id: "mar-consequence", label: "Why MAR matters",
      views: [{ frame: survey, title: "dropna() would delete every web user", highlights: hlRows([1, 3, 5], 5, "drop"), badge: "the whole segment" }],
      explain: "dropna() here does not remove a random half - it removes ALL web respondents. Every conclusion afterwards describes app users only, while still being reported as if it covered everyone. The sample size looks reasonable; the sample is broken.",
    },
    {
      id: "mnar", label: "MNAR: the value hides itself",
      views: [{ frame: survey, title: "income", highlights: incomeHl, badge: "who declines to answer?" }],
      explain: "The hardest case: whether income is missing depends on the income. High earners decline more often, so the gaps sit disproportionately at the top. No column in your data reveals this, and no test on your data can detect it - the evidence is precisely what you do not have.",
    },
    {
      id: "strategy", label: "What to do about each",
      views: [{ frame: kinds, title: "handling", highlights: hlMerge(hlCols([2], 3, "new"), hlHeaders([2], "new")), badge: "the decision" }],
      explain: "MCAR: drop or impute freely. MAR: impute conditioned on the explaining column - group medians by device, not one global median. MNAR: no statistical fix exists. Report it, model it explicitly, or go and collect the missing data. And whatever you choose, add an is_missing flag - the fact that a value was absent is itself information.",
    },
  ];

  return (
    <PageShell meta={PAGES["mcar-mar-mnar"]}>
      <StepRunner runId="mcar-mar-mnar" steps={steps} code={`df.isna().sum()          # HOW MANY. Says nothing about WHY.

# Is the missingness explained by a column you already have? (MAR test)
df.groupby("device")["income"].apply(lambda s: s.isna().mean())

# Do respondents WITH and WITHOUT a value differ elsewhere?
df.groupby(df["income"].isna())[["age", "rating"]].mean()

# MCAR -> dropping is safe (you only lose power)
# MAR  -> impute CONDITIONED on the explaining column
df["income"] = df.groupby("device")["income"].transform(lambda s: s.fillna(s.median()))
# MNAR -> no statistical fix. Report it, or collect the data.

df["income_missing"] = df["income"].isna()   # always keep the flag`} />
    </PageShell>
  );
}

// 39. Visualizing Missingness

export function VizMissingPage() {
  const COLS = ["user_id", "email", "age", "last_login", "plan"];
  const ROWS = 34;

  // email: scattered random loss. last_login: a contiguous outage block.
  // age: missing for one segment. plan: complete.
  const missing: boolean[][] = Array.from({ length: ROWS }, (_, r) => [
    false,
    [3, 9, 17, 26, 31].includes(r),
    r % 3 === 1,
    r >= 12 && r <= 20,
    false,
  ]);

  const counts = withIndex(
    df({
      n_missing: COLS.map((_, c) => missing.filter((row) => row[c]).length),
      pct: COLS.map((_, c) => Math.round((missing.filter((row) => row[c]).length / ROWS) * 1000) / 10),
    }),
    COLS, ["column"],
  );

  const steps: Step[] = [
    {
      id: "counts", label: "Counts tell you how much",
      views: [{ frame: counts, title: "df.isna().sum()", highlights: hlCols([0], COLS.length, "match"), badge: "the summary" }],
      explain: "The standard first move, and worth doing. But three columns here have similar-looking counts and completely different problems - and the count cannot tell them apart.",
    },
    {
      id: "matrix", label: "The matrix shows you where",
      diagram: "null-matrix",
      views: [{ frame: counts, title: "msno.matrix(df)", badge: "rows down, columns across" }],
      explain: "Every row of the frame is one stripe, every column a band, and each gap is marked. Now the shapes are visible: scattered specks in email, a regular pattern in age, and a solid block in last_login. Same counts, three different causes.",
    },
    {
      id: "block", label: "A block means an outage",
      diagram: "null-matrix-login",
      views: [{ frame: counts, title: "last_login", highlights: hlRows([3], 2, "changed"), badge: "contiguous rows" }],
      explain: "A solid run of missing values across consecutive rows is almost never random. If the frame is in insert order, that block is a window in time when a pipeline failed. Go and find the incident - imputing over it would paper over a bug.",
    },
    {
      id: "scatter", label: "Specks mean random loss",
      diagram: "null-matrix-email",
      views: [{ frame: counts, title: "email", highlights: hlRows([1], 2, "match"), badge: "no pattern" }],
      explain: "Isolated gaps with no structure look like MCAR - a validation that occasionally failed, an optional field. These are the safe ones to drop or impute, and the matrix is what gives you the confidence to say so.",
    },
    {
      id: "correlation", label: "Columns that go missing together",
      views: [{ frame: counts, title: "df.isna().corr()", highlights: hlCols([1], COLS.length, "match"), badge: "heatmap of co-missingness" }],
      explain: "Correlating the null indicators finds columns that vanish as a set. High correlation usually means one upstream source feeds them all, so they are really one problem, not three. It also tells you dropping rows for one column will cost you the others too.",
    },
    {
      id: "threshold", label: "Deciding what to keep",
      views: [{ frame: counts, title: "% missing per column", highlights: hlCols([1], COLS.length, "changed"), badge: "how much is too much?" }],
      explain: "There is no universal threshold, but the shape of the question is: a column that is 80% empty carries little signal and imputing it mostly invents data. Weigh how much is missing against how much you need that column - and prefer dropping a bad COLUMN over dropping the rows it ruins.",
    },
    {
      id: "rows", label: "Look per row as well",
      views: [{ frame: counts, title: "df.isna().sum(axis=1)", badge: "completeness per record" }],
      explain: "Counting along axis=1 gives each record's completeness. A handful of rows missing almost everything are usually junk you can drop outright, and finding them is often the cheapest cleaning win available.",
    },
    {
      id: "before", label: "Do this first, always",
      diagram: "null-matrix",
      views: [{ frame: counts, title: "before any cleaning", badge: "look before you fill" }],
      explain: "Plot the matrix before deciding anything. fillna and dropna are irreversible on the frame in memory, and once filled you can never see the pattern again - so the outage, the segment gap, and the junk rows all disappear behind values you invented.",
    },
  ];

  const renderDiagram = (step: { diagram?: string }) => {
    const focus = step.diagram === "null-matrix-login" ? 3
      : step.diagram === "null-matrix-email" ? 1 : undefined;
    const caption = focus === 3
      ? "A contiguous block: rows 12-20 all lost last_login together. That is an incident, not randomness."
      : focus === 1
        ? "Scattered and structureless - the signature of genuinely random loss."
        : "Three different shapes of missingness that isna().sum() reports almost identically.";
    return <NullMatrix columns={COLS} missing={missing} focusCol={focus} caption={caption} />;
  };

  return (
    <PageShell meta={PAGES["viz-missing"]}>
      <StepRunner runId="viz-missing" steps={steps} renderDiagram={renderDiagram} code={`df.isna().sum()              # how many per column
df.isna().mean() * 100       # as a percentage
df.isna().sum(axis=1)        # how complete is each ROW

# The pattern is the point - look before you fill
import missingno as msno
msno.matrix(df)              # rows x columns, every gap marked
msno.heatmap(df)             # which columns go missing TOGETHER

# Without the library
import seaborn as sns
sns.heatmap(df.isna(), cbar=False)
df.isna().corr()             # co-missingness

# A block = a pipeline outage. Specks = random loss. Stripes = a segment.`} />
    </PageShell>
  );
}

// 40. Imputation Strategies

export function ImputationPage() {
  const RAW: CellValue[] = [21, null, 24, 26, null, 31, 30, null];
  const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

  const mean = 26;   // mean of the six observed values, rounded
  const filledMean: CellValue[] = RAW.map((v) => (v === null ? mean : v));
  const filledFfill: CellValue[] = (() => {
    let last: CellValue = null;
    return RAW.map((v) => { if (v !== null) last = v; return v === null ? last : v; });
  })();
  const filledInterp: CellValue[] = [21, 22.5, 24, 26, 28.5, 31, 30, 30];

  const base = df({ hour: HOURS, temp: RAW });
  const withMean = df({ hour: HOURS, temp: RAW, mean_filled: filledMean });
  const withFfill = df({ hour: HOURS, temp: RAW, ffilled: filledFfill });
  const withInterp = df({ hour: HOURS, temp: RAW, interpolated: filledInterp });
  const withFlag = df({ hour: HOURS, temp: filledInterp, was_missing: RAW.map((v) => v === null) });

  const gaps = [1, 4, 7];
  const gapHl: HighlightMap = {};
  gaps.forEach((r) => { gapHl[`${r}:1`] = "null"; });
  const fillHl = (col: number): HighlightMap => {
    const m: HighlightMap = { ...gapHl };
    gaps.forEach((r) => { m[`${r}:${col}`] = "new"; });
    return m;
  };

  const steps: Step[] = [
    {
      id: "gaps", label: "Hourly readings with gaps",
      views: [{ frame: base, title: "sensor", highlights: gapHl, badge: "3 missing" }],
      explain: "A temperature reading every hour, three of them lost. The values rise through the day - that trend is the information any sensible fill has to respect.",
    },
    {
      id: "drop", label: "Dropping is the default you did not choose",
      views: [{ frame: base, title: "df.dropna()", highlights: hlRows(gaps, 2, "drop"), badge: "8 rows to 5" }],
      explain: "dropna throws away 37% of the series, including the other columns on those rows which were perfectly fine. On time series it also breaks the even spacing that rolling and resample rely on. Dropping is a decision, not a neutral default.",
    },
    {
      id: "mean", label: "Mean fill: convenient and flat",
      views: [{ frame: withMean, title: "fillna(df['temp'].mean())", highlights: fillHl(2), badge: "every gap = 26" }],
      explain: "Every gap gets the same number. It preserves the mean by construction and shrinks the variance - the 13:00 reading sits at 26 in the middle of a clear upward run, which is visibly wrong to anyone reading the series. Use median instead when the column is skewed; use both only when order does not matter.",
    },
    {
      id: "group-mean", label: "Better: fill within groups",
      views: [{ frame: withMean, title: "groupby('sensor')['temp'].transform(lambda s: s.fillna(s.median()))", highlights: fillHl(2), badge: "conditional" }],
      explain: "One global mean across several sensors, cities or segments blurs them together. Filling with each group's own median respects the structure you already know about - and it is the correct handling for MAR missingness.",
    },
    {
      id: "ffill", label: "Forward fill: carry the last known",
      views: [{ frame: withFfill, title: "df['temp'].ffill()", highlights: fillHl(2), badge: "repeat the previous value" }],
      explain: "ffill assumes nothing changed since the last observation, which is right for state - a price, a status, a config that holds until updated. It is wrong for measurements: it flattens the curve and, over a long gap, invents hours of identical readings.",
    },
    {
      id: "leak", label: "The direction matters",
      views: [{ frame: withFfill, title: "bfill uses the FUTURE", highlights: { "1:2": "drop", "4:2": "drop", "7:2": "drop" }, badge: "leakage risk" }],
      explain: "bfill pulls values backwards from later rows. In a model that is target leakage: your training data now contains information from after the prediction point, the model scores beautifully, and it fails in production. On time series, forward only.",
    },
    {
      id: "interpolate", label: "Interpolate: follow the trend",
      views: [{ frame: withInterp, title: "df['temp'].interpolate()", highlights: fillHl(2), badge: "linear between neighbours" }],
      explain: "Linear interpolation draws a straight line between the surrounding readings, so 10:00 becomes 22.5 - between 21 and 24, exactly where the trend puts it. For smoothly varying physical quantities this is usually the most honest fill. Note the trailing gap: with nothing after it, interpolate can only extend the last value.",
    },
    {
      id: "flag", label: "Always keep the flag",
      views: [{ frame: withFlag, title: "df['was_missing'] = df['temp'].isna()", highlights: hlMerge(hlCols([2], 8, "changed"), hlHeaders([2], "changed")), badge: "before you fill" }],
      explain: "Record the flag BEFORE filling, because afterwards the information is gone forever. It lets you audit how much of a result rests on invented data, it is often predictive in its own right, and it stops the next person mistaking your imputations for measurements.",
    },
  ];

  return (
    <PageShell meta={PAGES["imputation"]}>
      <StepRunner runId="imputation" steps={steps} code={`df["was_missing"] = df["temp"].isna()     # FIRST. You cannot recover it later.

df["temp"].fillna(df["temp"].mean())      # flat; shrinks variance
df["temp"].fillna(df["temp"].median())    # better when skewed
df["temp"].fillna(df["temp"].mode()[0])   # categoricals

# Conditional fill - the right answer for MAR
df.groupby("sensor")["temp"].transform(lambda s: s.fillna(s.median()))

df["temp"].ffill()                        # state that holds until changed
df["temp"].bfill()                        # uses the FUTURE - leakage in models
df["temp"].interpolate()                  # follows the trend
df["temp"].interpolate(method="time")     # respects uneven timestamps

df["temp"].ffill(limit=2)                 # do not paper over a long outage`} />
    </PageShell>
  );
}

// 41. Duplicates

export function DuplicatesPage() {
  const orders = df({
    order_id: ["A-1", "A-2", "A-2", "A-3", "A-3"],
    email: ["asha@x.com", "ben@x.com", "ben@x.com", "chen@x.com", "chen@x.com"],
    amount: [560, 320, 320, 150, 175],
    updated: ["09:00", "09:05", "09:05", "10:00", "11:30"],
  });

  const flagged = df({
    order_id: ["A-1", "A-2", "A-2", "A-3", "A-3"],
    amount: [560, 320, 320, 150, 175],
    duplicated: [false, false, true, false, false],
  });

  const exactDrop = df({
    order_id: ["A-1", "A-2", "A-3", "A-3"],
    email: ["asha@x.com", "ben@x.com", "chen@x.com", "chen@x.com"],
    amount: [560, 320, 150, 175],
    updated: ["09:00", "09:05", "10:00", "11:30"],
  });

  const subsetKeep = df({
    order_id: ["A-1", "A-2", "A-3"],
    amount: [560, 320, 175],
    updated: ["09:00", "09:05", "11:30"],
  });

  const steps: Step[] = [
    {
      id: "data", label: "Five rows, three orders",
      views: [{ frame: orders, title: "orders", badge: "something is off" }],
      explain: "Sum the amount column and you get 1525 across what should be three orders. Two problems are hiding here, and they need different fixes - which is why 'just call drop_duplicates' is not an answer.",
    },
    {
      id: "exact", label: "Exact duplicates",
      views: [{ frame: orders, title: "orders", highlights: hlRows([1, 2], 4, "changed"), badge: "A-2 twice, identical" }],
      explain: "The two A-2 rows are identical in every column - a re-import or a retried request. These are unambiguous: one of them is noise, and removing it is safe.",
    },
    {
      id: "conflict", label: "Same key, different data",
      views: [{ frame: orders, title: "orders", highlights: hlMerge(hlRows([3, 4], 4, "drop"), { "3:2": "changed", "4:2": "changed" }), badge: "A-3 twice, amounts differ" }],
      explain: "The two A-3 rows share a key but disagree on amount - 150 at 10:00, 175 at 11:30. This is not noise, it is a genuine conflict, most likely an edit. Only you can decide which is correct, and drop_duplicates will decide for you if you let it.",
    },
    {
      id: "duplicated", label: "duplicated() marks the repeats",
      views: [{ frame: flagged, title: "df.duplicated()", highlights: hlMerge(hlCols([2], 5, "mask-true"), { "2:2": "changed" }), badge: "look before you drop" }],
      explain: "duplicated() returns a boolean Series marking rows seen before - so the FIRST occurrence is False and later copies are True. Inspect this before dropping anything: df[df.duplicated(keep=False)] shows every member of every duplicate set, originals included.",
    },
    {
      id: "drop-exact", label: "drop_duplicates removes exact repeats",
      views: [{ frame: exactDrop, title: "df.drop_duplicates()", highlights: hlRows([2, 3], 4, "changed"), badge: "5 rows to 4" }],
      explain: "With no arguments it compares ALL columns, so only the identical A-2 pair collapses. Both A-3 rows survive, because they differ - which is correct behaviour and also why the row count is still wrong.",
    },
    {
      id: "subset", label: "subset defines what 'duplicate' means",
      views: [{ frame: subsetKeep, title: "drop_duplicates(subset=['order_id'], keep='last')", highlights: hlRows([2], 3, "new"), badge: "3 rows" }],
      explain: "subset says which columns define identity. On order_id alone, both A-3 rows are duplicates and keep decides the survivor: 'first', 'last', or False to drop every copy. Sort by your timestamp first - 'last' means last in ROW ORDER, not latest in time.",
    },
    {
      id: "keep-false", label: "keep=False finds them all",
      views: [{ frame: orders, title: "df[df.duplicated(subset=['order_id'], keep=False)]", highlights: hlRows([1, 2, 3, 4], 4, "drop"), badge: "every member of every set" }],
      explain: "keep=False marks all copies including the first, which is the auditing view: what exactly is duplicated, and do the conflicting rows disagree in ways that matter? Run this before choosing a keep strategy.",
    },
    {
      id: "prevention", label: "Where they come from",
      views: [{ frame: orders, title: "the usual causes", badge: "fix upstream" }],
      explain: "Three sources dominate: a many-to-many merge (use validate), a concat of overlapping files, and a re-run without idempotency. If duplicates keep reappearing, de-duplicating downstream is treating a symptom - and every dedupe silently discards a row someone might have needed.",
    },
  ];

  return (
    <PageShell meta={PAGES["duplicates"]}>
      <StepRunner runId="duplicates" steps={steps} code={`# LOOK first - every member of every duplicate set
df[df.duplicated(subset=["order_id"], keep=False)].sort_values("order_id")

df.duplicated()                    # True for repeats; FIRST occurrence is False
df.drop_duplicates()               # compares ALL columns - exact repeats only

# subset defines identity; keep chooses the survivor
df.sort_values("updated").drop_duplicates(subset=["order_id"], keep="last")

# "last" means last in ROW ORDER. Sort before you rely on it.

df.duplicated(subset=["email"]).sum()   # how many, per definition of duplicate

# Prevention beats cleanup:
pd.merge(a, b, on="k", validate="m:1")     # stop the merge that creates them`} />
    </PageShell>
  );
}

// 42. The .str Accessor

export function StrAccessorPage() {
  const raw = df({
    name: ["  Asha Rao ", "BEN CHEN", "chen li", "Dara  Singh"],
    email: ["Asha@Example.COM", "ben@corp.co.in", "chen@example.com", "dara@corp.co.in"],
  });

  const cleaned = df({
    name: ["Asha Rao", "Ben Chen", "Chen Li", "Dara  Singh"],
    email: ["asha@example.com", "ben@corp.co.in", "chen@example.com", "dara@corp.co.in"],
  });

  const domains = df({
    email: ["asha@example.com", "ben@corp.co.in", "chen@example.com", "dara@corp.co.in"],
    domain: ["example.com", "corp.co.in", "example.com", "corp.co.in"],
  });

  const maskHl: HighlightMap = {};
  ["example.com", "corp.co.in", "example.com", "corp.co.in"].forEach((d, r) => {
    for (let c = 0; c < 2; c++) maskHl[`${r}:${c}`] = d === "corp.co.in" ? "mask-true" : "mask-false";
  });

  const nullCase = df({ name: ["Asha", null, "Chen"], upper: ["ASHA", null, "CHEN"] });

  const steps: Step[] = [
    {
      id: "raw", label: "Text as it actually arrives",
      views: [{ frame: raw, title: "users", badge: "whitespace, casing, chaos" }],
      explain: "Leading spaces, shouting caps, inconsistent domains. Every one of these breaks an exact-match join or a groupby, and none of them is visible in a row count.",
    },
    {
      id: "loop", label: "The loop you do not need",
      views: [{ frame: raw, title: "df['name'].apply(lambda s: s.strip().title())", highlights: { "*:*": "drop" }, badge: "Python per row" }],
      explain: "apply with a lambda works and runs a Python function per row. .str does the same work in a single pass at C speed - same result, far less time, and shorter to write.",
    },
    {
      id: "clean", label: ".str.strip().str.title()",
      views: [{ frame: cleaned, title: "cleaned", highlights: hlMerge(hlCols([0], 4, "new"), hlCols([1], 4, "new")), badge: "chainable" }],
      explain: ".str methods return a Series, so they chain. strip removes surrounding whitespace, title fixes casing, lower normalises the email. Do this on arrival - normalise once at the boundary, then trust the column everywhere after.",
    },
    {
      id: "inner-space", label: "What strip does not fix",
      views: [{ frame: cleaned, title: "cleaned", highlights: { "3:0": "changed" }, badge: "'Dara  Singh' - double space" }],
      explain: "strip only touches the ENDS. 'Dara  Singh' keeps its internal double space and will silently fail to match 'Dara Singh' forever. Collapse internal runs too: .str.replace(r'\\\\s+', ' ', regex=True).",
    },
    {
      id: "contains", label: ".str.contains for filtering",
      views: [{ frame: domains, title: "df[df['email'].str.contains('corp', case=False)]", highlights: maskHl, badge: "a boolean mask" }],
      explain: "contains returns a boolean Series, so it drops straight into df[...] like any other mask. Pass case=False rather than lowering first, and remember it treats its argument as a REGEX by default - a literal dot matches any character until you pass regex=False.",
    },
    {
      id: "split", label: ".str.split with .str[i]",
      views: [{ frame: domains, title: "df['email'].str.split('@').str[1]", highlights: hlMerge(hlCols([1], 4, "new"), hlHeaders([1], "new")), badge: "the domain" }],
      explain: "split gives a column of lists; the second .str[1] indexes into each list. That double .str trips people up - the first accesses the string, the second the resulting list. expand=True instead returns a DataFrame with one column per piece.",
    },
    {
      id: "nulls", label: "NaN propagates, it does not crash",
      views: [{ frame: nullCase, title: "df['name'].str.upper()", highlights: { "1:0": "null", "1:1": "null" }, badge: "NaN stays NaN" }],
      explain: ".str methods skip nulls and return NaN rather than raising - much friendlier than apply, which hands your lambda a float and gets an AttributeError. But watch the boolean case: .str.contains returns NaN, not False, so filtering needs na=False or the mask will fail.",
    },
    {
      id: "kit", label: "The everyday set",
      views: [{ frame: cleaned, title: "the ones worth memorising", badge: "strip, lower, contains, replace, split" }],
      explain: "strip, lower/upper/title, contains, startswith/endswith, replace, split, len, cat, and extract for regex groups. Between them they cover nearly all text cleaning - and the moment you find yourself writing .apply on a string column, check this list first.",
    },
  ];

  return (
    <PageShell meta={PAGES["str-accessor"]}>
      <StepRunner runId="str-accessor" steps={steps} code={`# Normalise on arrival, once
df["name"]  = df["name"].str.strip().str.title()
df["email"] = df["email"].str.strip().str.lower()

# strip only touches the ENDS - collapse internal runs too
df["name"] = df["name"].str.replace(r"\\s+", " ", regex=True)

df[df["email"].str.contains("corp", case=False, na=False)]   # na=False matters
df["domain"] = df["email"].str.split("@").str[1]
df["email"].str.split("@", expand=True)      # -> a DataFrame, one col per piece

df["name"].str.len()
df["name"].str.startswith("A")

# contains treats its argument as a REGEX by default
df["sku"].str.contains(".", regex=False)     # a literal dot`} />
    </PageShell>
  );
}

// 43. Regex for Extraction

export function RegexExtractPage() {
  const logs = df({
    line: [
      "2024-03-01 ERROR user=u102 code=500",
      "2024-03-01 WARN  user=u87  code=301",
      "2024-03-02 ERROR user=u102 code=503",
      "2024-03-02 INFO  user=u44  code=200",
    ],
  });

  const split = df({
    date: ["2024-03-01", "2024-03-01", "2024-03-02", "2024-03-02"],
    level: ["ERROR", "WARN", "ERROR", "INFO"],
    user: ["u102", "u87", "u102", "u44"],
    code: [500, 301, 503, 200],
  });

  const partial = df({
    "0": ["2024-03-01", "2024-03-01", "2024-03-02", "2024-03-02"],
    "1": ["ERROR", "WARN", "ERROR", "INFO"],
  });

  const failed = df({
    line: ["2024-03-01 ERROR user=u102 code=500", "malformed line, no fields"],
    user: ["u102", null],
  });

  const phones = df({
    raw: ["+91 98765 43210", "022-2345-6789", "9876543210"],
    digits: ["919876543210", "02223456789", "9876543210"],
  });

  const steps: Step[] = [
    {
      id: "logs", label: "Structure inside a string",
      views: [{ frame: logs, title: "logs", badge: "one column, four fields" }],
      explain: "Four fields packed into one string. split cannot help - the separators differ, the spacing is uneven, and the fields are labelled rather than positional. This is what extract is for.",
    },
    {
      id: "groups", label: "Capture groups become columns",
      views: [{ frame: partial, title: "df['line'].str.extract(r'(\\\\d{4}-\\\\d{2}-\\\\d{2}) (\\\\w+)')", highlights: hlHeaders([0, 1], "changed"), badge: "one column per ()" }],
      explain: "Each parenthesised group in the pattern becomes a column, in order. Two groups, two columns - named 0 and 1, which is already unhelpful with two and unusable with five.",
    },
    {
      id: "named", label: "Name the groups",
      views: [{ frame: split, title: "(?P<date>...) (?P<level>...) user=(?P<user>...)", highlights: hlHeaders([0, 1, 2, 3], "new"), badge: "readable columns" }],
      explain: "(?P<name>...) names a group and the column takes that name. Always do this: it documents the pattern from the inside, and it survives someone later inserting a group in the middle - which silently renumbers everything in the unnamed version.",
    },
    {
      id: "no-match", label: "No match means NaN, not an error",
      views: [{ frame: failed, title: "a line that does not fit", highlights: { "1:1": "null" }, badge: "silent failure" }],
      explain: "extract returns NaN for rows the pattern does not match. Nothing raises, nothing warns. Always check the null rate afterwards - a pattern that quietly matches 60% of your log is worse than one that fails loudly.",
      variables: [{ name: "result['user'].isna().mean()", type: "float", preview: "check this every time" }],
    },
    {
      id: "extractall", label: "extract vs extractall",
      views: [{ frame: split, title: "extract = first match only", highlights: hlCols([2], 4, "match"), badge: "one row in, one row out" }],
      explain: "extract takes only the FIRST match per string. If a line can contain several matches - every hashtag, every id - use extractall, which returns a MultiIndexed frame with one row per match. Silently keeping only the first is a common and invisible bug.",
    },
    {
      id: "types", label: "Everything comes back as text",
      views: [{ frame: split, title: "code is a string", highlights: hlMerge(hlCols([3], 4, "changed"), hlHeaders([3], "changed")), badge: "cast it" }],
      explain: "Regex operates on text, so every extracted column is object dtype - including the numbers. Sorting gives '500' before '99', and sums concatenate. Cast immediately: .astype(int) or pd.to_numeric(errors='coerce') when some rows may not be numeric.",
    },
    {
      id: "replace", label: "Regex in replace, too",
      views: [{ frame: phones, title: "str.replace(r'\\\\D', '', regex=True)", highlights: hlMerge(hlCols([1], 3, "new"), hlHeaders([1], "new")), badge: "strip everything non-digit" }],
      explain: "Three phone formats, one expression: delete every non-digit and compare what remains. Normalising to a canonical form before matching is almost always easier than writing a pattern that accepts every format.",
    },
    {
      id: "advice", label: "Keep patterns boring",
      views: [{ frame: split, title: "readable beats clever", badge: "and check the null rate" }],
      explain: "Two habits pay for themselves: name every group, and check the null rate after every extract. A third - prefer several simple patterns over one heroic one. The clever regex nobody can read is the one that silently stops matching when the log format shifts.",
    },
  ];

  return (
    <PageShell meta={PAGES["regex-extract"]}>
      <StepRunner runId="regex-extract" steps={steps} code={`# Name every group - columns take the names
fields = df["line"].str.extract(
    r"(?P<date>\\d{4}-\\d{2}-\\d{2}) +(?P<level>\\w+) +user=(?P<user>\\w+) +code=(?P<code>\\d+)"
)

# ALWAYS check what failed to match - no match is a silent NaN
fields["user"].isna().mean()

# Everything comes back as text, including the numbers
fields["code"] = pd.to_numeric(fields["code"], errors="coerce")

# extract  -> first match per string
# extractall -> ALL matches, one row each (MultiIndex)
df["text"].str.extractall(r"#(?P<tag>\\w+)")

# Normalise, then compare - easier than matching every format
df["phone"].str.replace(r"\\D", "", regex=True)`} />
    </PageShell>
  );
}

// 44. Outlier Detection

export function OutliersPage() {
  const VALUES = [42, 38, 45, 41, 39, 44, 40, 43, 890, 37];
  const IDS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"];

  const orders = df({ txn: IDS, amount: VALUES });

  const sorted = [...VALUES].sort((a, b) => a - b);
  const q1 = 38.75, q3 = 44.25, iqr = q3 - q1;
  const lo = Math.round((q1 - 1.5 * iqr) * 10) / 10;
  const hi = Math.round((q3 + 1.5 * iqr) * 10) / 10;

  const mean = Math.round((VALUES.reduce((a, b) => a + b, 0) / VALUES.length) * 10) / 10;
  const meanNoOutlier = Math.round(
    (VALUES.filter((v) => v !== 890).reduce((a, b) => a + b, 0) / (VALUES.length - 1)) * 10) / 10;
  const median = (sorted[4] + sorted[5]) / 2;

  const stats = df({
    statistic: ["mean", "median", "std"],
    with_outlier: [mean, median, 268.2],
    without: [meanNoOutlier, median, 2.7],
  });

  const bounds = withIndex(
    df({ value: [q1, q3, iqr, lo, hi] }),
    ["Q1", "Q3", "IQR", "lower bound", "upper bound"], ["statistic"],
  );

  const flagged = df({
    txn: IDS, amount: VALUES,
    is_outlier: VALUES.map((v) => v < lo || v > hi),
  });

  const capped = df({
    txn: IDS,
    amount: VALUES,
    winsorized: VALUES.map((v) => (v > hi ? hi : v < lo ? lo : v)),
  });

  const outlierHl: HighlightMap = {};
  VALUES.forEach((v, r) => { for (let c = 0; c < 2; c++) outlierHl[`${r}:${c}`] = v === 890 ? "drop" : "mask-false"; });

  const steps: Step[] = [
    {
      id: "data", label: "One value is not like the others",
      views: [{ frame: orders, title: "transactions", highlights: outlierHl, badge: "t9 = 890" }],
      explain: "Nine transactions around 40 and one at 890. With ten rows you can see it. With ten million you cannot, which is why this needs to be a computation rather than a glance.",
    },
    {
      id: "damage", label: "What it does to your numbers",
      views: [{ frame: stats, title: "with and without t9", highlights: hlMerge(hlCols([1], 3, "drop"), hlCols([2], 3, "new")), badge: "mean: 121.9 vs 40.8" }],
      explain: "One row in ten triples the mean and inflates the standard deviation a hundredfold. The median barely moves - which is the general lesson: medians and IQRs resist outliers, means and standard deviations do not.",
    },
    {
      id: "quartiles", label: "The IQR method",
      views: [{ frame: bounds, title: "Q1, Q3, IQR", highlights: { "0:0": "match", "1:0": "match", "2:0": "match" }, badge: "the middle 50%" }],
      explain: "Q1 and Q3 bracket the middle half of the data, and the IQR is the distance between them. Because both are positional, the extreme value cannot drag them around - the measuring stick is unaffected by the thing it is measuring.",
    },
    {
      id: "fences", label: "1.5 x IQR fences",
      views: [{ frame: bounds, title: "bounds", highlights: { "3:0": "changed", "4:0": "changed" }, badge: `outside ${lo} to ${hi}` }],
      explain: `Anything below Q1 minus 1.5 IQR or above Q3 plus 1.5 IQR is flagged. The 1.5 is convention, not law - it comes from the boxplot and covers roughly 99% of normal data. Use 3.0 when you only want extremes.`,
    },
    {
      id: "flag", label: "Flag, do not delete",
      views: [{ frame: flagged, title: "is_outlier", highlights: hlMerge(hlCols([2], 10, "mask-true"), { "8:2": "changed" }), badge: "one flagged" }],
      explain: "Add a boolean column rather than dropping rows. It keeps the decision reversible, it lets you count how many you are excluding, and it makes the exclusion visible to whoever reads the analysis next.",
    },
    {
      id: "zscore", label: "Z-score: the other method",
      views: [{ frame: stats, title: "|z| > 3", highlights: hlCols([1], 3, "drop"), badge: "mind the circularity" }],
      explain: "Z-score measures distance from the mean in standard deviations, flagging |z| > 3. The catch: the outlier inflates the very standard deviation used to judge it, so an extreme point can mask itself. It also assumes roughly normal data. Prefer IQR unless you know the distribution.",
    },
    {
      id: "cap", label: "Cap instead of removing",
      views: [{ frame: capped, title: "winsorize at the fences", highlights: { "8:2": "new" }, badge: "890 becomes " + hi }],
      explain: "Winsorizing pulls extremes back to the fence, keeping the row and its other columns while limiting its leverage. Better than deletion when the row is real but the value is unreliable - and unlike deletion it does not change your sample size.",
    },
    {
      id: "judgement", label: "The statistic cannot decide for you",
      views: [{ frame: orders, title: "is 890 an error or a customer?", highlights: outlierHl, badge: "look before you act" }],
      explain: "IQR finds unusual values; it cannot tell you whether they are wrong. 890 might be a decimal-point error, or your best customer. Investigate a flagged row before deciding - and remember that in fraud, failure and revenue analysis the outliers are frequently the entire point.",
    },
  ];

  return (
    <PageShell meta={PAGES["outliers"]}>
      <StepRunner runId="outliers" steps={steps} code={`q1, q3 = df["amount"].quantile([0.25, 0.75])
iqr = q3 - q1
lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr

# FLAG, do not delete - keeps the decision reversible and visible
df["is_outlier"] = (df["amount"] < lo) | (df["amount"] > hi)
df["is_outlier"].sum()

# Cap instead of dropping: keeps the row, limits its leverage
df["amount_capped"] = df["amount"].clip(lower=lo, upper=hi)

# Z-score - assumes roughly normal, and the outlier inflates its own sigma
z = (df["amount"] - df["amount"].mean()) / df["amount"].std()
df[z.abs() > 3]

# Per group, when scale differs between segments
df.groupby("category")["amount"].transform(
    lambda s: s.between(s.quantile(.25) - 1.5 * (s.quantile(.75) - s.quantile(.25)),
                        s.quantile(.75) + 1.5 * (s.quantile(.75) - s.quantile(.25)))
)`} />
    </PageShell>
  );
}
