export type CellValue = number | string | boolean | null;
export type Dtype = "int64" | "float64" | "object" | "bool" | "datetime64";

export interface Column { name: string; dtype: Dtype; }

export type IndexValue = number | string;
/** A plain label, or a tuple of labels for a MultiIndex row. */
export type IndexEntry = IndexValue | IndexValue[];

/** A spanning header cell drawn above the column names (pivot_table, crosstab). */
export interface ColumnGroup { label: string; span: number; }

export interface DataFrame {
  columns: Column[];
  index: IndexEntry[];
  /** Row-major. data[i][j] = value at index[i], columns[j]. */
  data: CellValue[][];
  /** Names of the index levels — one per level of a MultiIndex. */
  indexNames?: string[];
  /** Optional upper header row spanning groups of columns. */
  columnGroups?: ColumnGroup[];
}

export type HighlightKind =
  | "none" | "match" | "drop" | "new" | "changed" | "null"
  | "mask-true" | "mask-false" | "window"
  | "group-a" | "group-b" | "group-c" | "group-d" | "group-e";

/**
 * Cell address → highlight.
 *   "r:c"  a body cell          "r:*" whole row        "*:c" whole column
 *   "h:c"  a column header      "h:*" every header
 *   "i:r"  an index cell        "i:*" every index cell
 */
export type HighlightMap = Record<string, HighlightKind>;

export interface FrameView {
  frame: DataFrame;
  title?: string;
  highlights?: HighlightMap;
  note?: string;
  badge?: string;
  /** Draw as a pandas Series repr instead of a table. Frame must be 1 column. */
  render?: "table" | "series";
}

/** One bar in a timing / magnitude comparison. */
export interface Bar {
  label: string;
  value: number;
  /** Rendered after the value, e.g. "ms". */
  unit?: string;
  /** Formatted value; overrides `value` + `unit` for display. */
  display?: string;
  tone?: "slow" | "fast" | "neutral";
}

export interface BarChart {
  title?: string;
  bars: Bar[];
  note?: string;
}

export interface VariableSnapshot { name: string; type: string; preview: string; }

export interface Step {
  id: string;
  label: string;
  code?: string;
  views: FrameView[];
  explain?: string;
  variables?: VariableSnapshot[];
  /** Key into the diagram registry (src/components/diagrams). */
  diagram?: string;
  /** Optional magnitude comparison drawn beneath the frames. */
  bars?: BarChart;
}

export interface PageMeta {
  id: string;
  title: string;
  blurb: string;
  icon: string;
  section: string;
  context: { what: string; why: string; how: string; };
}
