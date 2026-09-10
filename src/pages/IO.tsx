import { PageShell } from "@/components/PageShell";
import { StepRunner } from "@/components/StepRunner";
import { PAGES } from "./registry";
import { df, hlCols, hlHeaders, hlMerge, hlRows, withIndex } from "@/lib/dataframe";
import type { HighlightMap, Step } from "@/types";

// 32. JSON to DataFrame

export function JsonDfPage() {
  const flat = df({
    order_id: ["A-1", "A-2"],
    customer: ["Asha", "Ben"],
    total: [560, 320],
  });

  const naive = df({
    order_id: ["A-1", "A-2"],
    customer: ["Asha", "Ben"],
    items: ["[{...}, {...}]", "[{...}]"],
  });

  const normalized = df({
    sku: ["p1", "p3", "p2"],
    qty: [2, 1, 1],
    price: [280, 150, 320],
  });

  const withMeta = df({
    order_id: ["A-1", "A-1", "A-2"],
    customer: ["Asha", "Asha", "Ben"],
    sku: ["p1", "p3", "p2"],
    qty: [2, 1, 1],
    price: [280, 150, 320],
  });

  const dotted = df({
    order_id: ["A-1", "A-2"],
    "shipping.city": ["Pune", "Delhi"],
    "shipping.pin": ["411001", "110001"],
  });

  const steps: Step[] = [
    {
      id: "shape", label: "APIs return nested JSON",
      views: [{ frame: flat, title: "the flat part", badge: "one row per order" }],
      explain: "A typical order payload has scalar fields at the top level - id, customer, total - and those map cleanly onto columns. The trouble is everything underneath them.",
    },
    {
      id: "naive", label: "read_json leaves nesting alone",
      views: [{ frame: naive, title: "pd.read_json(payload)", highlights: hlMerge(hlCols([2], 2, "drop"), hlHeaders([2], "drop")), badge: "a column of Python lists" }],
      explain: "The items column now holds actual list-of-dict objects. It looks like a column, but you cannot filter, group, or sum it - every operation on it falls back to slow Python. Dicts and lists inside cells are a shape to escape, not a shape to work in.",
      variables: [{ name: "type(df['items'][0])", type: "class", preview: "list" }],
    },
    {
      id: "record-path", label: "record_path picks the list to explode",
      views: [{ frame: normalized, title: "pd.json_normalize(data, record_path='items')", highlights: { "*:*": "new" }, badge: "one row per ITEM" }],
      explain: "record_path names the nested list to turn into rows. The grain changes: you asked for orders and got line items. Three items across two orders means three rows - deciding what one row should represent is the real decision here.",
    },
    {
      id: "meta", label: "meta carries the parent fields down",
      views: [{ frame: withMeta, title: "record_path='items', meta=['order_id','customer']", highlights: hlMerge(hlCols([0, 1], 3, "match"), hlHeaders([0, 1], "match")), badge: "parent + child on every row" }],
      explain: "Without meta you get line items with no idea which order they belong to. meta lists the parent fields to repeat onto every child row - order_id appears twice because order A-1 had two items. That repetition is correct: it is the join key.",
    },
    {
      id: "dots", label: "Nested objects flatten with dots",
      views: [{ frame: dotted, title: "shipping.city, shipping.pin", highlights: hlHeaders([1, 2], "new"), badge: "dot-separated names" }],
      explain: "A nested OBJECT (not a list) becomes dotted column names - shipping.city, shipping.pin - without changing the row count. Only lists create rows. Pass sep='_' if dots in column names annoy you, and they will the first time you try df.shipping.city.",
    },
    {
      id: "missing", label: "Missing keys become NaN",
      views: [{ frame: dotted, title: "records with different keys", highlights: { "1:2": "null" }, badge: "ragged payloads" }],
      explain: "JSON records are not obliged to share a schema. json_normalize takes the union of every key it sees and fills the gaps with NaN, so an optional field simply arrives mostly empty. Check isna() rates on new API data before trusting a column.",
    },
    {
      id: "explode", label: "explode for simple lists",
      views: [{ frame: normalized, title: "df.explode('tags')", badge: "one row per element" }],
      explain: "When a cell holds a plain list of scalars rather than dicts - tags, ids - .explode() is simpler: one row per element, other columns repeated. json_normalize is for structure; explode is for a single list column you already have.",
    },
    {
      id: "recipe", label: "The working order",
      views: [{ frame: withMeta, title: "flat, typed, ready", badge: "then treat it as normal data" }],
      explain: "Normalize to the grain you want, name the meta fields, convert types (JSON has no dates - they arrive as strings), and only then start analysing. Everything you learned about grouping and merging applies from that point; the flattening is a one-time entry fee.",
    },
  ];

  return (
    <PageShell meta={PAGES["json-df"]}>
      <StepRunner runId="json-df" steps={steps} code={`import json
data = json.load(open("orders.json"))

pd.read_json("orders.json")     # nested lists stay as Python objects (unusable)

# record_path picks the list that becomes rows; meta repeats parent fields
items = pd.json_normalize(
    data,
    record_path="items",
    meta=["order_id", "customer"],
)

# Nested OBJECTS flatten to dotted names, no extra rows
pd.json_normalize(data)         # -> shipping.city, shipping.pin
pd.json_normalize(data, sep="_")

# A plain list column you already have
df.explode("tags")

# JSON has no date type - always convert after loading
items["ordered_at"] = pd.to_datetime(items["ordered_at"])`} />
    </PageShell>
  );
}

// 34. Reading Large Files

export function ChunkingPage() {
  const chunk1 = df({ order_id: ["A-1", "A-2"], category: ["Coffee", "Tea"], amount: [560, 150] });
  const chunk2 = df({ order_id: ["A-3", "A-4"], category: ["Coffee", "Coffee"], amount: [320, 840] });

  const part1 = withIndex(df({ amount: [560, 150] }), ["Coffee", "Tea"], ["category"]);
  const part2 = withIndex(df({ amount: [1160] }), ["Coffee"], ["category"]);
  const combined = withIndex(df({ amount: [1720, 150] }), ["Coffee", "Tea"], ["category"]);

  const steps: Step[] = [
    {
      id: "problem", label: "The file does not fit",
      views: [{ frame: chunk1, title: "sales.csv", badge: "10 GB on disk" }],
      explain: "pd.read_csv loads everything into memory at once, and a parsed DataFrame typically needs several times the file size in RAM. A 10 GB CSV on a 16 GB laptop does not just run slowly - the process is killed.",
      bars: {
        title: "Memory needed",
        bars: [
          { label: "file on disk", value: 10, display: "10 GB", tone: "neutral" },
          { label: "read_csv", value: 32, display: "~32 GB", tone: "slow" },
          { label: "available RAM", value: 16, display: "16 GB", tone: "fast" },
        ],
        note: "The parsed frame is bigger than the file. This read cannot complete.",
      },
    },
    {
      id: "chunksize", label: "chunksize returns an iterator",
      views: [{ frame: chunk1, title: "chunk 1", badge: "100k rows" }, { frame: chunk2, title: "chunk 2", badge: "100k rows" }],
      explain: "chunksize turns read_csv into an iterator of DataFrames instead of one frame. Each chunk is an ordinary DataFrame - everything you know still applies - and only one is in memory at a time.",
      variables: [{ name: "pd.read_csv(f, chunksize=100_000)", type: "TextFileReader", preview: "an iterator, not a frame" }],
    },
    {
      id: "reduce", label: "Aggregate each chunk",
      views: [
        { frame: part1, title: "chunk 1 grouped", badge: "partial" },
        { frame: part2, title: "chunk 2 grouped", badge: "partial" },
      ],
      explain: "Reduce each chunk to something small immediately - a groupby sum, a filtered subset, a count. Never append raw chunks to a list, or you have simply rebuilt the frame that did not fit in the first place.",
    },
    {
      id: "combine", label: "Combine the partials",
      views: [{ frame: combined, title: "pd.concat(parts).groupby(level=0).sum()", highlights: { "0:0": "new" }, badge: "the real answer" }],
      explain: "Coffee appeared in both chunks, so its partial sums must be added: concat the partials, then group again. The second groupby is the step people forget, and it silently gives you duplicate index labels instead of totals.",
    },
    {
      id: "decomposable", label: "Which aggregations survive chunking",
      views: [{ frame: combined, title: "sum works. median does not.", highlights: { "*:*": "match" }, badge: "know the difference" }],
      explain: "sum, count, min and max decompose - a total of totals is the total. Mean needs sum and count carried separately, then divided at the end. Median, quantiles and nunique do NOT decompose: the median of chunk medians is not the median. For those, aggregate to a smaller grain first or use a tool built for it.",
    },
    {
      id: "usecols", label: "Read less in the first place",
      views: [{ frame: chunk1, title: "usecols + dtype", highlights: hlMerge(hlCols([0, 2], 2, "new"), hlHeaders([0, 2], "new")), badge: "fewer columns, smaller types" }],
      explain: "Before reaching for chunking, read less: usecols to skip columns you never touch, dtype to load int32 instead of int64, and category for low-cardinality strings. A repeated-string column as category routinely cuts memory by 90%, and often the file fits after that.",
      bars: {
        title: "Same file, different read",
        bars: [
          { label: "naive", value: 32, display: "32 GB", tone: "slow" },
          { label: "usecols", value: 12, display: "12 GB", tone: "neutral" },
          { label: "+ dtypes", value: 4, display: "4 GB", tone: "fast" },
        ],
        note: "Reading fewer columns with the right dtypes often removes the need to chunk at all.",
      },
    },
    {
      id: "filter-early", label: "Filter inside the loop",
      views: [{ frame: chunk2, title: "keep only what you need", highlights: hlRows([0], 3, "mask-true"), badge: "discard early" }],
      explain: "If you only want one region, filter each chunk as it arrives and keep the survivors. The peak memory is one chunk plus the accumulated matches, so a query that returns 1% of a 10 GB file runs comfortably.",
    },
    {
      id: "beyond", label: "When to stop fighting",
      views: [{ frame: combined, title: "convert once, then move on", badge: "Parquet, DuckDB, Polars" }],
      explain: "Chunking is for a one-off pass over an oversized CSV. If you are reading the same file repeatedly, convert it to Parquet once - columnar, typed, compressed, and readable a column at a time. Past that, DuckDB or Polars will query it out of core without the loop.",
    },
  ];

  return (
    <PageShell meta={PAGES["chunking"]}>
      <StepRunner runId="chunking" steps={steps} code={`# 1. Try to read LESS before you read in pieces
df = pd.read_csv("sales.csv",
                 usecols=["date", "category", "amount"],
                 dtype={"category": "category", "amount": "int32"})

# 2. Still too big? Reduce each chunk as it arrives.
parts = []
for chunk in pd.read_csv("sales.csv", chunksize=100_000):
    parts.append(chunk.groupby("category")["amount"].sum())

total = pd.concat(parts).groupby(level=0).sum()   # the second groupby matters

# sum / count / min / max decompose. mean needs sum + count kept separately.
# median / quantile / nunique do NOT decompose across chunks.

# 3. Reading it more than once? Convert once, then stop chunking.
df.to_parquet("sales.parquet")`} />
    </PageShell>
  );
}

// 35. Parquet vs CSV

export function ParquetCsvPage() {
  const compare = df({
    aspect: ["File size", "Full read", "3 of 40 columns", "Dtypes preserved", "Human readable"],
    csv: ["1.2 GB", "48 s", "48 s", "No", "Yes"],
    parquet: ["180 MB", "3.1 s", "0.4 s", "Yes", "No"],
  });

  const typed = df({
    column: ["order_date", "qty", "category", "is_paid"],
    from_csv: ["object", "int64", "object", "object"],
    from_parquet: ["datetime64", "int32", "category", "bool"],
  });

  const steps: Step[] = [
    {
      id: "csv", label: "What a CSV actually is",
      views: [{ frame: compare, title: "csv vs parquet", highlights: hlMerge(hlCols([1], 5, "drop"), hlHeaders([1], "drop")), badge: "text, row by row" }],
      explain: "A CSV is untyped text stored one row at a time. Every read re-parses every character and re-guesses every type. It is universal and human readable, and it pays for that on every single load.",
    },
    {
      id: "size", label: "Size on disk",
      views: [{ frame: compare, title: "csv vs parquet", highlights: hlRows([0], 3, "match"), badge: "1.2 GB vs 180 MB" }],
      explain: "Parquet stores each column together, so a column of repeated categories compresses to almost nothing. Roughly 7x smaller here - which matters most when the file is crossing a network.",
      bars: {
        title: "Same data on disk",
        bars: [
          { label: "CSV", value: 1200, display: "1.2 GB", tone: "slow" },
          { label: "Parquet", value: 180, display: "180 MB", tone: "fast" },
        ],
      },
    },
    {
      id: "read", label: "Full read",
      views: [{ frame: compare, title: "csv vs parquet", highlights: hlRows([1], 3, "match"), badge: "48 s vs 3.1 s" }],
      explain: "No text parsing and no type inference - Parquet already knows every column's type, so reading is close to just moving bytes into memory.",
      bars: {
        title: "Reading every column",
        bars: [
          { label: "read_csv", value: 48, display: "48 s", tone: "slow" },
          { label: "read_parquet", value: 3.1, display: "3.1 s", tone: "fast" },
        ],
      },
    },
    {
      id: "columns", label: "The columnar payoff",
      views: [{ frame: compare, title: "csv vs parquet", highlights: hlRows([2], 3, "new"), badge: "48 s vs 0.4 s" }],
      explain: "This is the real difference. Reading 3 of 40 columns from a CSV still costs a full scan, because rows are interleaved and you cannot reach a column without passing every other one. Parquet reads only the three column blocks - over 100x faster, and the gap widens as tables get wider.",
      bars: {
        title: "Reading 3 of 40 columns",
        bars: [
          { label: "read_csv", value: 48, display: "48 s", tone: "slow" },
          { label: "read_parquet", value: 0.4, display: "0.4 s", tone: "fast" },
        ],
        note: "CSV cannot skip columns. Parquet reads only the blocks you asked for.",
      },
    },
    {
      id: "dtypes", label: "Types survive the round trip",
      views: [{ frame: typed, title: "after a round trip", highlights: hlMerge(hlCols([1], 4, "drop"), hlCols([2], 4, "new"), hlHeaders([1], "drop"), hlHeaders([2], "new")), badge: "the quiet win" }],
      explain: "Write a datetime column to CSV and read it back and it is a string again. Every load repeats the same to_datetime and astype calls, and any one that gets skipped is a bug. Parquet stores the schema alongside the data, so what you wrote is what you get.",
    },
    {
      id: "pushdown", label: "Filters can skip whole blocks",
      views: [{ frame: compare, title: "predicate pushdown", badge: "read even less" }],
      explain: "Parquet records min and max per column chunk, so a reader can skip blocks that cannot match your filter. pd.read_parquet(f, filters=[('region','==','West')]) may never touch most of the file - impossible with CSV, where the only way to know is to read it.",
    },
    {
      id: "cost", label: "What you give up",
      views: [{ frame: compare, title: "csv vs parquet", highlights: hlRows([4], 3, "changed"), badge: "not human readable" }],
      explain: "Parquet is binary: no head, no grep, no opening it in a spreadsheet, and it needs pyarrow installed. It is also poor for appending - the format wants whole files written at once. CSV remains the right answer for small files, handoffs to non-technical people, and anything a human should be able to open.",
    },
    {
      id: "rule", label: "The working rule",
      views: [{ frame: compare, title: "csv vs parquet", highlights: hlMerge(hlCols([2], 5, "new"), hlHeaders([2], "new")), badge: "convert once" }],
      explain: "If you will read a file more than twice, convert it once and read Parquet after that. The conversion costs one slow CSV read and repays it immediately. Keep CSV at the boundaries of your system, use Parquet everywhere inside it.",
    },
  ];

  return (
    <PageShell meta={PAGES["parquet-csv"]}>
      <StepRunner runId="parquet-csv" steps={steps} code={`df.to_parquet("sales.parquet")          # needs pyarrow (or fastparquet)
pd.read_parquet("sales.parquet")

# The columnar win: read only what you need
pd.read_parquet("sales.parquet", columns=["date", "amount"])

# Skip row groups that cannot match, without reading them
pd.read_parquet("sales.parquet", filters=[("region", "==", "West")])

# Dtypes survive - no re-parsing on every load
df.to_parquet("s.parquet"); pd.read_parquet("s.parquet").dtypes   # datetime64
df.to_csv("s.csv");         pd.read_csv("s.csv").dtypes           # object (!)

# Rule of thumb: reading it more than twice? Convert once.`} />
    </PageShell>
  );
}

// 36. eval() and query()

export function EvalQueryPage() {
  const data = df({
    product: ["Latte", "Mocha", "Chai", "Cold Brew"],
    category: ["Coffee", "Coffee", "Tea", "Coffee"],
    price: [280, 320, 150, 300],
    qty: [45, 31, 42, 38],
  });

  const filtered = df({ product: ["Mocha", "Cold Brew"], category: ["Coffee", "Coffee"], price: [320, 300], qty: [31, 38] });

  const evaluated = df({
    product: ["Latte", "Mocha", "Chai", "Cold Brew"],
    price: [280, 320, 150, 300],
    qty: [45, 31, 42, 38],
    revenue: [12600, 9920, 6300, 11400],
  });

  const maskHl: HighlightMap = {};
  [0, 1, 2, 3].forEach((r) => {
    const keep = (data.data[r][2] as number) > 250 && data.data[r][1] === "Coffee";
    for (let c = 0; c < 4; c++) maskHl[`${r}:${c}`] = keep ? "mask-true" : "mask-false";
  });

  const steps: Step[] = [
    {
      id: "bracket", label: "The bracket version",
      views: [{ frame: data, title: "df[(df['price'] > 250) & (df['category'] == 'Coffee')]", highlights: maskHl, badge: "verbose" }],
      explain: "The standard filter. It works, and it repeats the frame name for every condition - which is what makes long filters hard to read and easy to get wrong.",
    },
    {
      id: "query", label: "query reads like a sentence",
      views: [{ frame: filtered, title: "df.query('price > 250 and category == Coffee')", badge: "same rows" }],
      explain: "Identical result. Inside the string, column names are plain names - no df prefix, no brackets - and you can write and/or instead of &/| with no parentheses puzzle. On a five-condition filter the difference is substantial.",
    },
    {
      id: "at", label: "@ reaches Python variables",
      views: [{ frame: filtered, title: "df.query('price > @threshold')", highlights: hlCols([2], 2, "match"), badge: "@ escapes the string" }],
      explain: "Bare names inside the string mean columns. Prefix with @ to mean a Python variable instead. Forgetting the @ gives an UndefinedVariableError, which is at least a loud failure rather than a wrong answer.",
      variables: [{ name: "threshold", type: "int", preview: "250" }],
    },
    {
      id: "backticks", label: "Awkward column names",
      views: [{ frame: data, title: "df.query('`unit price` > 250')", highlights: hlHeaders([2], "changed"), badge: "backticks" }],
      explain: "Columns with spaces or reserved words need backticks: `unit price`. This is also a fair argument for not having such columns - df.columns.str.replace(' ', '_') early in a pipeline pays for itself.",
    },
    {
      id: "eval", label: "eval assigns columns",
      views: [{ frame: evaluated, title: "df.eval('revenue = price * qty', inplace=True)", highlights: hlMerge(hlCols([3], 4, "new"), hlHeaders([3], "new")), badge: "new column from a string" }],
      explain: "eval is query's counterpart for computing rather than filtering. Multi-line strings can define several columns at once, each able to reference the ones defined above it - which reads well for a block of derived metrics.",
    },
    {
      id: "memory", label: "Where the speed comes from",
      views: [{ frame: evaluated, title: "no intermediate arrays", badge: "fewer temporaries" }],
      explain: "The bracket form materialises a full boolean array per condition, then combines them - several temporary arrays the size of your data. eval and query compile the whole expression and evaluate it in one pass, so those temporaries never exist.",
      bars: {
        title: "Filtering 10M rows, two conditions",
        bars: [
          { label: "df[mask & mask]", value: 310, display: "310 ms", tone: "slow" },
          { label: "df.query(...)", value: 180, display: "180 ms", tone: "fast" },
        ],
        note: "The gain comes from skipping intermediate arrays, so it only shows up on large frames.",
      },
    },
    {
      id: "small", label: "On small frames it is slower",
      views: [{ frame: data, title: "4 rows", highlights: { "*:*": "drop" }, badge: "parsing overhead dominates" }],
      explain: "Parsing the expression costs a fixed amount of time. Below roughly 100k rows that overhead is larger than anything it saves, so query is slower than brackets. Choose it for readability at small sizes, for speed at large ones.",
      bars: {
        title: "Filtering 1000 rows",
        bars: [
          { label: "df[mask]", value: 0.09, display: "0.09 ms", tone: "fast" },
          { label: "df.query(...)", value: 1.2, display: "1.2 ms", tone: "slow" },
        ],
        note: "Same call, reversed result. Fixed parsing cost with nothing to amortise it over.",
      },
    },
    {
      id: "limits", label: "What it cannot do",
      views: [{ frame: data, title: "plain pandas still needed", badge: "no .str, no .dt, no apply" }],
      explain: "The expression language is arithmetic and comparison only. No .str.contains, no .dt.year, no function calls, no lambdas. Mixed pipelines end up doing both, which is fine - query the numeric conditions, bracket the rest.",
    },
  ];

  return (
    <PageShell meta={PAGES["eval-query"]}>
      <StepRunner runId="eval-query" steps={steps} code={`# Same filter, three ways
df[(df["price"] > 250) & (df["category"] == "Coffee")]
df.query('price > 250 and category == "Coffee"')

threshold = 250
df.query("price > @threshold")        # @ = Python variable, bare = column
df.query("\`unit price\` > 250")        # backticks for awkward names

# eval computes instead of filtering
df.eval("revenue = price * qty", inplace=True)
df.eval('''
    revenue = price * qty
    margin  = revenue - cost
''', inplace=True)

# Faster on millions of rows (no intermediate arrays), SLOWER below ~100k.
# Arithmetic and comparison only: no .str, no .dt, no function calls.`} />
    </PageShell>
  );
}

// 37. Indexing for Speed

export function IndexSpeedPage() {
  const users = df({
    user_id: ["u001", "u002", "u003", "u004"],
    city: ["Pune", "Delhi", "Pune", "Mumbai"],
    spend: [1200, 890, 2400, 1500],
  });

  const indexed = withIndex(
    df({ city: ["Pune", "Delhi", "Pune", "Mumbai"], spend: [1200, 890, 2400, 1500] }),
    ["u001", "u002", "u003", "u004"], ["user_id"],
  );

  const scanHl: HighlightMap = {};
  [0, 1, 2, 3].forEach((r) => { for (let c = 0; c < 3; c++) scanHl[`${r}:${c}`] = r === 2 ? "match" : "mask-false"; });

  const steps: Step[] = [
    {
      id: "scan", label: "A filter is a full scan",
      views: [{ frame: users, title: "df[df['user_id'] == 'u003']", highlights: scanHl, badge: "every row tested" }],
      explain: "A boolean filter builds a True/False value for EVERY row, then keeps the True ones. Finding one user in ten million means ten million comparisons. Fine once; painful in a loop.",
    },
    {
      id: "set-index", label: "set_index builds a hash table",
      views: [{ frame: indexed, title: "df.set_index('user_id')", highlights: { "i:*": "match" }, badge: "user_id is the index" }],
      explain: "set_index moves the column into the index and builds a hash table over it. That construction costs one pass over the data - which you pay once, then amortise over every lookup that follows.",
    },
    {
      id: "lookup", label: "Now lookups are constant time",
      views: [{ frame: indexed, title: "df.loc['u003']", highlights: { "2:*": "match", "i:2": "match" }, badge: "hash lookup" }],
      explain: "df.loc['u003'] jumps straight to the row. No scan, no comparisons - the same O(1) lookup a Python dict does. The larger the frame, the more dramatic the difference.",
      bars: {
        title: "One lookup in 10M rows",
        bars: [
          { label: "boolean filter", value: 95, display: "95 ms", tone: "slow" },
          { label: ".loc on index", value: 0.09, display: "0.09 ms", tone: "fast" },
        ],
        note: "Roughly 1000x. Repeat this in a loop and it is the difference between minutes and seconds.",
      },
    },
    {
      id: "amortise", label: "When it pays for itself",
      views: [{ frame: indexed, title: "one build, many lookups", badge: "the break-even" }],
      explain: "Indexing is not free - it costs about one scan to build. One lookup and you have gained nothing. Two or three and you are ahead; a thousand and it is transformative. Index when you will look up repeatedly by the same key.",
      bars: {
        title: "1000 lookups in 10M rows",
        bars: [
          { label: "filter each time", value: 95000, display: "95 s", tone: "slow" },
          { label: "set_index + .loc", value: 480, display: "0.5 s", tone: "fast" },
        ],
      },
    },
    {
      id: "sorted", label: "Sorted indexes go further",
      views: [{ frame: indexed, title: "df.sort_index()", highlights: { "i:*": "new" }, badge: "enables range slicing" }],
      explain: "A sorted index supports binary search, so RANGE queries get fast too - df.loc['2024-01':'2024-03'] on a sorted DatetimeIndex is a binary search plus a slice rather than a scan. pandas warns about performance on unsorted MultiIndex lookups for exactly this reason.",
    },
    {
      id: "merge", label: "Joins benefit too",
      views: [{ frame: indexed, title: "left.join(right)", highlights: { "i:*": "match" }, badge: "no key to hash" }],
      explain: "merge hashes the join keys every time it runs. If both frames are already indexed on the key, .join reuses those indexes and skips the work. On repeated joins against the same lookup table, indexing the lookup once is free speed.",
    },
    {
      id: "cost", label: "What it costs you",
      views: [{ frame: indexed, title: "the index is no longer a column", highlights: hlHeaders([0, 1], "changed"), badge: "mind the shape" }],
      explain: "The indexed column is gone from df.columns - groupby('user_id') now fails, and to_csv writes it differently unless you ask. It also uses memory. reset_index() undoes it, and drop=False keeps a copy as a column if you need both.",
    },
    {
      id: "when", label: "When not to bother",
      views: [{ frame: users, title: "a single pass", highlights: { "*:*": "mask-false" }, badge: "just filter" }],
      explain: "For one filter, or a scan you run once, plain boolean indexing is simpler and no slower. Reach for set_index when the same key is queried again and again - user_id in a lookup loop, a date index you slice by repeatedly, a dimension table joined on every request.",
    },
  ];

  return (
    <PageShell meta={PAGES["index-speed"]}>
      <StepRunner runId="index-speed" steps={steps} code={`df[df["user_id"] == "u003"]        # scans EVERY row - O(n)

df = df.set_index("user_id")        # one pass to build a hash table
df.loc["u003"]                      # O(1) - like a dict lookup

df = df.sort_index()                # sorted -> binary search
df.loc["2024-01":"2024-03"]         # fast RANGE queries too

left.join(right)                    # reuses existing indexes, skips hashing

df = df.reset_index()               # undo
df.set_index("user_id", drop=False) # index AND keep the column

# Worth it when you look up the same key repeatedly.
# For one filter, plain boolean indexing is simpler and just as fast.`} />
    </PageShell>
  );
}
