import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlMerge, withIndex } from "@/lib/dataframe";
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
