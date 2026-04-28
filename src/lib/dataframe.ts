import type { CellValue, Column, DataFrame, Dtype } from "@/types";

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
    else if (typeof v === "number") { Number.isInteger(v) ? (hasInt = true) : (hasFloat = true); }
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
