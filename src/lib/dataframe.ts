import type { CellValue, Column, ColumnGroup, DataFrame, Dtype, HighlightKind, HighlightMap, IndexEntry } from "@/types";

export function df(
  cols: Record<string, CellValue[]>,
  opts?: { index?: (number | string)[]; dtypes?: Record<string, Dtype> },
): DataFrame {
  const names = Object.keys(cols);
  const rowCount = names.length ? (cols[names[0]]?.length ?? 0) : 0;
  const columns: Column[] = names.map((n) => ({
    name: n,
    dtype: opts?.dtypes?.[n] ?? inferDtype(cols[n]),
  }));
  const data: CellValue[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: CellValue[] = [];
    for (const n of names) row.push(cols[n][r]);
    data.push(row);
  }
  return { columns, index: opts?.index ?? Array.from({ length: rowCount }, (_, i) => i), data };
}

function inferDtype(values: CellValue[]): Dtype {
  let hasFloat = false, hasInt = false, hasString = false, hasBool = false;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") hasBool = true;
    else if (typeof v === "number") { if (Number.isInteger(v)) hasInt = true; else hasFloat = true; }
    else if (typeof v === "string") hasString = true;
  }
  if (hasString) return "object";
  if (hasFloat) return "float64";
  if (hasInt) return "int64";
  if (hasBool) return "bool";
  return "object";
}

export function cloneFrame(f: DataFrame): DataFrame {
  return { columns: f.columns.map((c) => ({ ...c })), index: [...f.index], data: f.data.map((r) => [...r]) };
}
export function colIndex(f: DataFrame, name: string): number {
  const i = f.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`Column not found: ${name}`);
  return i;
}
export function formatCell(v: CellValue, dtype: Dtype): string {
  if (v === null || v === undefined) return "NaN";
  if (typeof v === "number") {
    if (dtype === "float64" || !Number.isInteger(v)) return (Math.round(v * 100) / 100).toString();
    return String(v);
  }
  if (typeof v === "boolean") return v ? "True" : "False";
  return String(v);
}
export function isStringCol(c: Column): boolean { return c.dtype === "object" || c.dtype === "datetime64"; }
export function takeRows(f: DataFrame, idxs: number[]): DataFrame {
  return { columns: f.columns.map((c) => ({ ...c })), index: idxs.map((i) => f.index[i]), data: idxs.map((i) => [...f.data[i]]) };
}
export function takeCols(f: DataFrame, names: string[]): DataFrame {
  const ci = names.map((n) => colIndex(f, n));
  return { columns: ci.map((i) => ({ ...f.columns[i] })), index: [...f.index], data: f.data.map((row) => ci.map((i) => row[i])) };
}
export const hk = (r: number | "*", c: number | "*") => `${r}:${c}`;

/** Build a HighlightMap for specific rows, all columns. */
export function hlRows(rows: number[], ncols: number, kind: import("@/types").HighlightKind = "match"): import("@/types").HighlightMap {
  const m: import("@/types").HighlightMap = {};
  rows.forEach((r) => { for (let c = 0; c < ncols; c++) m[`${r}:${c}`] = kind; });
  return m;
}

/** Build a HighlightMap for specific columns, all rows. */
export function hlCols(cols: number[], nrows: number, kind: import("@/types").HighlightKind = "match"): import("@/types").HighlightMap {
  const m: import("@/types").HighlightMap = {};
  cols.forEach((c) => { for (let r = 0; r < nrows; r++) m[`${r}:${c}`] = kind; });
  return m;
}

/** Merge two highlight maps (second wins on conflict). */
export function hlMerge(...maps: import("@/types").HighlightMap[]): import("@/types").HighlightMap {
  return Object.assign({}, ...maps);
}

/**
 * A one-column frame rendered as a pandas Series. `name` becomes the
 * `Name:` line in the repr, so pass the column name the Series would carry.
 */
export function series(
  name: string,
  values: CellValue[],
  opts?: { index?: IndexEntry[]; dtype?: Dtype },
): DataFrame {
  const f = df({ [name]: values }, opts?.dtype ? { dtypes: { [name]: opts.dtype } } : undefined);
  return opts?.index ? { ...f, index: opts.index } : f;
}

/** Attach a MultiIndex (one tuple per row) and name its levels. */
export function withIndex(f: DataFrame, index: IndexEntry[], names?: string[]): DataFrame {
  return { ...f, index, indexNames: names };
}

/** Attach a spanning header row above the columns. */
export function withColumnGroups(f: DataFrame, groups: ColumnGroup[]): DataFrame {
  return { ...f, columnGroups: groups };
}

/** Highlight column headers. */
export function hlHeaders(cols: number[], kind: HighlightKind = "match"): HighlightMap {
  const m: HighlightMap = {};
  cols.forEach((c) => { m[`h:${c}`] = kind; });
  return m;
}

/** Highlight index cells. */
export function hlIndex(rows: number[], kind: HighlightKind = "match"): HighlightMap {
  const m: HighlightMap = {};
  rows.forEach((r) => { m[`i:${r}`] = kind; });
  return m;
}

/** Assign one group colour per distinct key, cycling through the five slots. */
export function hlByGroup(keys: (string | number)[], ncols: number): HighlightMap {
  const tones: HighlightKind[] = ["group-a", "group-b", "group-c", "group-d", "group-e"];
  const seen = new Map<string, HighlightKind>();
  const m: HighlightMap = {};
  keys.forEach((k, r) => {
    const s = String(k);
    if (!seen.has(s)) seen.set(s, tones[seen.size % tones.length]);
    const tone = seen.get(s)!;
    for (let c = 0; c < ncols; c++) m[`${r}:${c}`] = tone;
    m[`i:${r}`] = tone;
  });
  return m;
}
