import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, withIndex } from "@/lib/dataframe";
import type { CellValue, HighlightMap, Step } from "@/types";

// Raw event log. Users appear once per event, which is why every funnel
// starts with a de-duplication step people routinely forget.
const EVENTS = df({
  user_id: ["u1", "u1", "u2", "u1", "u3", "u2", "u4", "u3", "u1", "u5"],
  event: ["visit", "signup", "visit", "cart", "visit", "signup", "visit", "signup", "purchase", "visit"],
  ts: ["09:01", "09:04", "09:07", "09:12", "09:15", "09:18", "09:22", "09:30", "09:33", "09:41"],
});

const STAGES = ["visit", "signup", "cart", "purchase"];

const USERS = ["u1", "u2", "u3", "u4", "u5"];
const REACHED: Record<string, string[]> = {
  u1: ["visit", "signup", "cart", "purchase"],
  u2: ["visit", "signup"],
  u3: ["visit", "signup"],
  u4: ["visit"],
  u5: ["visit"],
};

const counts = STAGES.map((s) => USERS.filter((u) => REACHED[u].includes(s)).length);

export function FunnelPage() {
  const flags = df({
    user_id: USERS,
    ...Object.fromEntries(STAGES.map((s) => [s, USERS.map((u) => REACHED[u].includes(s)) as CellValue[]])),
  });

  const stageCounts = withIndex(
    df({
      users: counts,
      step_rate: counts.map((c, i) => (i === 0 ? null : Math.round((c / counts[i - 1]) * 1000) / 10)),
      overall: counts.map((c) => Math.round((c / counts[0]) * 1000) / 10),
    }),
    STAGES,
    ["stage"],
  );

  // The weakest stage-over-stage transition is the one worth fixing.
  const rates = counts.map((c, i) => (i === 0 ? Infinity : c / counts[i - 1]));
  const worst = rates.indexOf(Math.min(...rates));

  const dupHl: HighlightMap = {};
  EVENTS.data.forEach((r, i) => { if (r[0] === "u1") for (let c = 0; c < 3; c++) dupHl[`${i}:${c}`] = "changed"; });

  const steps: Step[] = [
    {
      id: "events", label: "Start from an event log",
      views: [{ frame: EVENTS, title: "events", badge: "10 rows, 5 users" }],
      explain: "Funnel data almost never arrives as a funnel. It arrives as an event log: one row per thing that happened, users scattered across many rows, stages out of order.",
    },
    {
      id: "dupes", label: "Rows are not users",
      views: [{ frame: EVENTS, title: "events", highlights: dupHl, badge: "u1 appears 4 times" }],
      explain: "u1 has four rows. Counting rows per stage would count u1 four times and report a funnel wider than your actual user base. Every funnel starts with counting DISTINCT users — nunique, not count.",
      variables: [{ name: "events['user_id'].nunique()", type: "int", preview: String(USERS.length) },
                  { name: "len(events)", type: "int", preview: String(EVENTS.data.length) }],
    },
    {
      id: "flags", label: "One row per user, one flag per stage",
      views: [{ frame: flags, title: "reached", highlights: hlCols([1, 2, 3, 4], 5, "mask-true"), badge: "boolean matrix" }],
      explain: "Pivot the log into one row per user with a True/False per stage. From here every funnel number is a column sum. This intermediate shape is worth building explicitly — it is also what you need for cohort and retention analysis.",
    },
    {
      id: "counts", label: "Count users per stage", diagram: "funnel",
      views: [{ frame: stageCounts, title: "funnel", highlights: hlCols([0], 4, "match"), badge: "users per stage" }],
      explain: `Summing each flag column gives the stage counts: ${counts.join(" then ")}. The diagram below shows the same funnel at a realistic scale — five users make the arithmetic easy to follow, but you need thousands before the rates mean anything. Either way, the shape alone does not tell you where to spend engineering time.`,
    },
    {
      id: "rates", label: "Stage rate beats overall rate",
      views: [{ frame: stageCounts, title: "funnel", highlights: hlMerge(hlCols([1], 4, "new"), hlCols([2], 4, "mask-false")), badge: "step vs overall" }],
      explain: "The overall column compares every stage to the top, which mostly restates that funnels shrink. The step_rate column compares each stage to the one directly before it — that is the number that isolates a single broken transition.",
    },
    {
      id: "leak", label: "Find the leak",
      views: [{ frame: stageCounts, title: "funnel", highlights: { [`${worst}:*`]: "drop", [`i:${worst}`]: "drop" }, badge: `weakest step: ${STAGES[worst]}` }],
      explain: `The ${STAGES[worst - 1]} to ${STAGES[worst]} transition is the weakest link. Fixing a stage that already converts at 80% caps your upside at 20%; fixing this one is where the actual growth is. Rank stages by step rate, not by how many users you lost.`,
      variables: [{ name: "weakest step", type: "str", preview: `${STAGES[worst - 1]} to ${STAGES[worst]}` }],
    },
    {
      id: "ordering", label: "The trap: unordered events",
      views: [{ frame: EVENTS, title: "events", highlights: { "*:2": "drop" }, badge: "timestamps ignored" }],
      explain: "This counts a user as having 'reached' a stage regardless of when. A user who purchased before ever signing up would be counted in both. If order matters, sort by timestamp and require each stage's first event to come after the previous stage's.",
    },
    {
      id: "windows", label: "Bound the funnel in time",
      views: [{ frame: flags, title: "reached (within 7 days)", highlights: hlCols([4], 5, "mask-false"), badge: "conversion window" }],
      explain: "An unbounded funnel flatters itself: given infinite time, conversion only ever goes up. Real funnels fix a window — did they purchase within 7 days of visiting? Without one, your funnel improves every month for no reason at all.",
    },
  ];

  return (
    <PageShell meta={PAGES["funnel"]}>
      <StepRunner runId="funnel" steps={steps} code={`stages = ["visit", "signup", "cart", "purchase"]

# 1. One row per user, one boolean per stage (DISTINCT users, not rows)
reached = (events.assign(hit=True)
                 .pivot_table(index="user_id", columns="event",
                              values="hit", aggfunc="any", fill_value=False))

# 2. Users per stage
funnel = reached[stages].sum()

# 3. Step-over-step rate is the actionable number
funnel_df = funnel.to_frame("users")
funnel_df["step_rate"] = funnel_df["users"] / funnel_df["users"].shift(1) * 100
funnel_df["overall"]   = funnel_df["users"] / funnel_df["users"].iloc[0] * 100

# 4. The leakiest step, ranked
funnel_df["step_rate"].idxmin()`} />
    </PageShell>
  );
}

// 25. Cohort Analysis

export function CohortPage() {
  // Five users, first seen in one of three months, active in later months.
  const COHORT_OF: Record<string, string> = { u1: "Jan", u2: "Jan", u3: "Jan", u4: "Feb", u5: "Feb" };
  const ACTIVITY: Record<string, number[]> = { // months since first seen
    u1: [0, 1, 2], u2: [0, 1], u3: [0], u4: [0, 1], u5: [0, 1],
  };
  const COHORTS = ["Jan", "Feb"];
  const OFFSETS = [0, 1, 2];

  const activityRows = Object.entries(ACTIVITY).flatMap(([u, offs]) =>
    offs.map((o) => ({ user: u, cohort: COHORT_OF[u], offset: o })));

  const events = df({
    user: activityRows.map((r) => r.user),
    cohort: activityRows.map((r) => r.cohort),
    month_offset: activityRows.map((r) => r.offset),
  });

  const size = (c: string) => Object.keys(COHORT_OF).filter((u) => COHORT_OF[u] === c).length;
  const active = (c: string, o: number) =>
    Object.keys(COHORT_OF).filter((u) => COHORT_OF[u] === c && ACTIVITY[u].includes(o)).length;

  const counts = withIndex(
    df(Object.fromEntries(OFFSETS.map((o) => [
      `M${o}`, COHORTS.map((c) => (active(c, o) || null) as CellValue),
    ]))),
    COHORTS, ["cohort"],
  );

  const rates = withIndex(
    df(Object.fromEntries(OFFSETS.map((o) => [
      `M${o}`, COHORTS.map((c) => {
        const n = active(c, o);
        return n === 0 ? null : Math.round((n / size(c)) * 1000) / 10;
      }) as CellValue[],
    ]))),
    COHORTS, ["cohort"],
  );

  const sizes = withIndex(df({ users: COHORTS.map(size) }), COHORTS, ["cohort"]);

  const steps: Step[] = [
    {
      id: "events", label: "Activity events",
      views: [{ frame: events, title: "activity", badge: "who was active, when" }],
      explain: "A cohort analysis needs two things per event: which cohort the user belongs to, and how long after joining the event happened. Everything else is bookkeeping.",
    },
    {
      id: "cohort-key", label: "1. Assign each user a cohort",
      views: [{ frame: events, title: "activity", highlights: hlMerge(hlCols([1], events.data.length, "group-a"), hlHeaders([1], "group-a")), badge: "month of FIRST activity" }],
      explain: "The cohort is the month a user was first seen, and it never changes - it is a property of the user, not of the event. Compute it as a groupby-min over first activity, then broadcast it back with transform onto every one of that user's rows.",
    },
    {
      id: "offset", label: "2. Compute the period offset",
      views: [{ frame: events, title: "activity", highlights: hlMerge(hlCols([2], events.data.length, "group-b"), hlHeaders([2], "group-b")), badge: "months since joining" }],
      explain: "The offset is event month minus cohort month: 0 for the joining month, 1 the month after, and so on. This is the step that makes cohorts comparable - it puts every cohort on the same relative clock instead of the calendar.",
    },
    {
      id: "pivot", label: "3. Pivot to a grid",
      views: [{ frame: counts, title: "pivot_table(index='cohort', columns='month_offset', aggfunc='nunique')", badge: "users still active" }],
      explain: "Cohorts down, offsets across, distinct users in the cells. nunique, not count - a user with three events in a month is still one retained user, and count would triple them.",
    },
    {
      id: "sizes", label: "4. Get each cohort's size",
      views: [{ frame: sizes, title: "cohort size = M0 column", highlights: hlCols([0], COHORTS.length, "match"), badge: "the denominator" }],
      explain: "Column M0 is every cohort's starting size, because every user is active in the month they joined. That column is the denominator for the whole row.",
    },
    {
      id: "rates", label: "5. Divide into retention rates",
      views: [{ frame: rates, title: "counts.divide(sizes, axis=0) * 100", highlights: hlCols([0], COHORTS.length, "match"), badge: "% retained" }],
      explain: "Divide each row by its own cohort size, axis=0 to align down the rows. M0 is 100% by construction; the interesting numbers are M1 and beyond. Now a 3-user cohort and a 300-user cohort can be read on the same scale.",
    },
    {
      id: "read", label: "How to read the triangle",
      views: [{ frame: rates, title: "retention", highlights: { "0:*": "match" }, badge: "across = decay, down = trend" }],
      explain: "Read ACROSS a row for how one cohort decays over its life. Read DOWN a column for whether newer cohorts retain better than older ones at the same age - that comparison is what tells you if a product change worked. The grid is triangular because young cohorts have not lived long enough to fill the right-hand columns.",
    },
    {
      id: "trap", label: "The trap: incomplete periods",
      views: [{ frame: rates, title: "retention", highlights: { [`${COHORTS.length - 1}:*`]: "drop" }, badge: "Feb has not finished M2" }],
      explain: "The newest cohort has not had time to reach later offsets, so its empty cells are 'not yet', not 'churned'. Plot them as zero and you will invent a retention cliff that does not exist. Mask any cell whose period has not fully elapsed.",
    },
  ];

  return (
    <PageShell meta={PAGES["cohort"]}>
      <StepRunner runId="cohort" steps={steps} code={`# 1. Cohort = month of the user's FIRST activity, broadcast to all their rows
ev["cohort"] = ev.groupby("user")["month"].transform("min")

# 2. How many periods after joining did this event happen?
ev["offset"] = (ev["month"] - ev["cohort"]).apply(lambda x: x.n)

# 3. Distinct users per (cohort, offset). nunique, NOT count.
counts = ev.pivot_table(index="cohort", columns="offset",
                        values="user", aggfunc="nunique")

# 4 + 5. Divide each row by its own cohort size
retention = counts.divide(counts[0], axis=0) * 100

# Cells whose period has not elapsed yet are "not yet", not zero.`} />
    </PageShell>
  );
}

// 29. Normalizing Denormalized Data

export function NormalizePage() {
  const FLAT = df({
    order_id: ["A-1", "A-2", "A-3", "A-4"],
    customer_name: ["Asha Rao", "Ben Chen", "Asha Rao", "Asha Rao "],
    customer_city: ["Pune", "Delhi", "Pune", "Pune"],
    product: ["Latte", "Mocha", "Latte", "Chai"],
    price: [280, 320, 280, 150],
    qty: [2, 1, 3, 1],
  });

  const customers = df({ customer_id: ["c1", "c2"], name: ["Asha Rao", "Ben Chen"], city: ["Pune", "Delhi"] });
  const products = df({ product_id: ["p1", "p2", "p3"], name: ["Latte", "Mocha", "Chai"], price: [280, 320, 150] });
  const orders = df({
    order_id: ["A-1", "A-2", "A-3", "A-4"],
    customer_id: ["c1", "c2", "c1", "c1"],
    product_id: ["p1", "p2", "p1", "p3"],
    qty: [2, 1, 3, 1],
  });

  const dupHl: HighlightMap = {};
  [0, 2, 3].forEach((r) => { dupHl[`${r}:1`] = "changed"; dupHl[`${r}:2`] = "changed"; });

  const typoHl: HighlightMap = { "3:1": "drop" };

  const steps: Step[] = [
    {
      id: "flat", label: "The flat export",
      views: [{ frame: FLAT, title: "orders_export.csv", badge: "everything in one table" }],
      explain: "One row per order with every detail attached. This is what a CSV export or a spreadsheet hands you, and it is perfectly usable - right up until you need to change something.",
    },
    {
      id: "repetition", label: "The same facts, repeated",
      views: [{ frame: FLAT, title: "orders_export.csv", highlights: dupHl, badge: "Asha's details, 3 times" }],
      explain: "Asha's name and city are stored three times, once per order. The customer has one city; the file has three copies of it. That redundancy is not just wasted space - it is three places for the truth to disagree.",
    },
    {
      id: "anomaly", label: "And they already do",
      views: [{ frame: FLAT, title: "orders_export.csv", highlights: typoHl, badge: "trailing space" }],
      explain: "Row A-4 has 'Asha Rao ' with a trailing space. groupby now reports two customers where there is one, and every per-customer number is wrong. This is an update anomaly, and it is the whole reason normalization exists.",
      variables: [{ name: "df['customer_name'].nunique()", type: "int", preview: "3  (should be 2)" }],
    },
    {
      id: "entities", label: "1. Find the entities",
      views: [{ frame: FLAT, title: "orders_export.csv", highlights: hlMerge(hlCols([1, 2], 4, "group-a"), hlCols([3, 4], 4, "group-b"), hlCols([0, 5], 4, "group-c")), badge: "3 entities hiding here" }],
      explain: "Group the columns by what they describe. Name and city describe a CUSTOMER. Product and price describe a PRODUCT. Order id and qty describe the ORDER itself. Three entities tangled into one table - that grouping is the entire design step.",
    },
    {
      id: "customers", label: "2. Extract customers",
      views: [{ frame: customers, title: "customers", highlights: hlMerge(hlCols([0], 2, "new"), hlHeaders([0], "new")), badge: "one row per customer" }],
      explain: "drop_duplicates on the customer columns, then assign a surrogate key. Clean the values BEFORE de-duplicating - str.strip() here, or the trailing space gives you two Ashas and defeats the whole exercise.",
    },
    {
      id: "products", label: "3. Extract products",
      views: [{ frame: products, title: "products", highlights: hlMerge(hlCols([0], 3, "new"), hlHeaders([0], "new")), badge: "one row per product" }],
      explain: "Same move for products. Price lives here, with the product - which also means a price change is one edit in one row, instead of a search-and-replace across every historical order.",
    },
    {
      id: "facts", label: "4. Replace details with IDs",
      views: [{ frame: orders, title: "orders", highlights: hlMerge(hlCols([1, 2], 4, "match"), hlHeaders([1, 2], "match")), badge: "6 columns down to 4" }],
      explain: "The order table keeps only what is genuinely about the order, plus foreign keys pointing at the other two. Each fact is now stored exactly once, in exactly one place.",
    },
    {
      id: "rejoin", label: "Rebuild the flat view on demand",
      views: [{ frame: FLAT, title: "orders.merge(customers).merge(products)", badge: "back to where we started" }],
      explain: "Normalizing loses nothing - two merges reconstruct the original view whenever you need it. What you gain is a single source of truth for each fact. Normalize to store and edit; denormalize to read and report.",
    },
  ];

  return (
    <PageShell meta={PAGES["normalize"]}>
      <StepRunner runId="normalize" steps={steps} code={`# Clean BEFORE de-duplicating, or the typos become extra entities
flat["customer_name"] = flat["customer_name"].str.strip()

# 1-2. Extract each entity, give it a surrogate key
customers = (flat[["customer_name", "customer_city"]]
             .drop_duplicates().reset_index(drop=True))
customers["customer_id"] = "c" + (customers.index + 1).astype(str)

products = (flat[["product", "price"]]
            .drop_duplicates().reset_index(drop=True))
products["product_id"] = "p" + (products.index + 1).astype(str)

# 3. Replace the repeated detail with foreign keys
orders = (flat.merge(customers, on=["customer_name", "customer_city"])
              .merge(products, on=["product", "price"])
              [["order_id", "customer_id", "product_id", "qty"]])

# Rebuild the flat view any time you need it
orders.merge(customers, on="customer_id").merge(products, on="product_id")`} />
    </PageShell>
  );
}

// 30. Fact + Dimension Tables

export function FactDimPage() {
  const facts = df({
    sale_id: ["s1", "s2", "s3", "s4"],
    date_id: ["2024-03-01", "2024-03-01", "2024-03-02", "2024-03-02"],
    product_id: ["p1", "p2", "p1", "p3"],
    store_id: ["st1", "st2", "st1", "st2"],
    qty: [2, 1, 3, 1],
    revenue: [560, 320, 840, 150],
  });

  const dimProduct = df({
    product_id: ["p1", "p2", "p3"],
    name: ["Latte", "Mocha", "Chai"],
    category: ["Coffee", "Coffee", "Tea"],
  });

  const dimStore = df({
    store_id: ["st1", "st2"],
    city: ["Pune", "Delhi"],
    region: ["West", "North"],
  });

  const joined = df({
    sale_id: ["s1", "s2", "s3", "s4"],
    category: ["Coffee", "Coffee", "Coffee", "Tea"],
    region: ["West", "North", "West", "North"],
    revenue: [560, 320, 840, 150],
  });

  const answer = withIndex(
    df({ revenue: [880, 320, 150] }),
    [["Coffee", "West"], ["Coffee", "North"], ["Tea", "North"]],
    ["category", "region"],
  );

  const steps: Step[] = [
    {
      id: "fact", label: "The fact table: events",
      views: [{ frame: facts, title: "fact_sales", highlights: hlMerge(hlCols([4, 5], 4, "new"), hlHeaders([4, 5], "new")), badge: "measures + foreign keys" }],
      explain: "A fact table holds things that HAPPENED, one row per event. Two kinds of column: numeric measures you will sum (qty, revenue) and foreign keys pointing at the dimensions. It is long and narrow, and it grows forever.",
    },
    {
      id: "keys", label: "Nothing but keys",
      views: [{ frame: facts, title: "fact_sales", highlights: hlMerge(hlCols([1, 2, 3], 4, "match"), hlHeaders([1, 2, 3], "match")), badge: "no descriptions" }],
      explain: "Notice what is missing: no product name, no city, no category. Storing 'Latte' on ten million sale rows is ten million copies of a fact that belongs in one row somewhere else. The fact table stores keys, not descriptions.",
    },
    {
      id: "dim-product", label: "A dimension: product",
      views: [{ frame: dimProduct, title: "dim_product", badge: "one row per product" }],
      explain: "Dimensions describe things that EXIST rather than things that happened. Short, wide, slow-changing, and full of the text you group and filter by. One row per product, no matter how many times it sells.",
    },
    {
      id: "dim-store", label: "Another: store",
      views: [{ frame: dimStore, title: "dim_store", highlights: hlMerge(hlCols([2], 2, "group-b"), hlHeaders([2], "group-b")), badge: "city rolls up to region" }],
      explain: "Dimensions carry hierarchies: store to city to region, product to category to department. That is what lets one fact table answer questions at any level of zoom without storing the answers separately.",
    },
    {
      id: "star", label: "Why it is called a star",
      views: [{ frame: facts, title: "one fact, many dimensions", highlights: hlMerge(hlCols([1, 2, 3], 4, "match"), hlHeaders([1, 2, 3], "match")), badge: "fact in the middle" }],
      explain: "Draw it and you get a star: the fact table at the centre, each dimension hanging off one foreign key. Every dimension joins directly to the fact, never to each other - which is why any combination of filters works without planning for it in advance.",
    },
    {
      id: "join", label: "Joining the star",
      views: [{ frame: joined, title: "facts.merge(dim_product).merge(dim_store)", highlights: hlMerge(hlCols([1, 2], 4, "new"), hlHeaders([1, 2], "new")), badge: "keys swapped for labels" }],
      explain: "Chain a merge per dimension you need, always from the fact table outward. Each one is many-to-one, so the row count must not change - validate='m:1' on every hop turns a broken dimension into an error instead of an inflated total.",
    },
    {
      id: "answer", label: "Now ask anything",
      views: [{ frame: answer, title: "groupby(['category','region'])['revenue'].sum()", badge: "the actual question" }],
      explain: "Revenue by category and region, from a fact table that stores neither. That is the payoff: the dimensions supply the vocabulary, the fact table supplies the numbers, and questions nobody anticipated are still answerable.",
    },
    {
      id: "practice", label: "In practice",
      views: [{ frame: facts, title: "fact_sales", badge: "filter first, then join" }],
      explain: "Two habits. Filter the fact table BEFORE joining - narrowing ten million rows to a week's worth first makes every join cheaper. And join only the dimensions you actually need; a star schema tempts you into joining all of them out of habit.",
    },
  ];

  return (
    <PageShell meta={PAGES["fact-dim"]}>
      <StepRunner runId="fact-dim" steps={steps} code={`# Facts = events (long, numeric, foreign keys). Dimensions = things (short, descriptive).

report = (fact_sales
          .query("date_id >= '2024-03-01'")            # filter FIRST, it is the big table
          .merge(dim_product, on="product_id", validate="m:1")
          .merge(dim_store,   on="store_id",   validate="m:1"))

report.groupby(["category", "region"])["revenue"].sum()

# Every dimension joins to the FACT table, never to each other - that is the star.
# validate="m:1" on each hop: a broken dimension should raise, not inflate totals.`} />
    </PageShell>
  );
}
