export type CellValue = number | string | boolean | null;
export type Dtype = "int64" | "float64" | "object" | "bool" | "datetime64";

export interface Column { name: string; dtype: Dtype; }

export interface DataFrame {
  columns: Column[];
  index: (number | string)[];
  /** Row-major. data[i][j] = value at index[i], columns[j]. */
  data: CellValue[][];
}

export type HighlightKind =
  | "none" | "match" | "drop" | "new" | "changed" | "null"
  | "mask-true" | "mask-false"
  | "group-a" | "group-b" | "group-c" | "group-d" | "group-e";

/** "r:c" → highlight. Wildcards: "r:*" (whole row), "*:c" (whole col). */
export type HighlightMap = Record<string, HighlightKind>;

export interface FrameView {
  frame: DataFrame;
  title?: string;
  highlights?: HighlightMap;
  note?: string;
  badge?: string;
}

export interface VariableSnapshot { name: string; type: string; preview: string; }

export interface Step {
  id: string;
  label: string;
  code?: string;
  views: FrameView[];
  explain?: string;
  variables?: VariableSnapshot[];
  /** Optional SVG diagram key rendered by StepRunner. */
  diagram?: string;
}

export interface PageMeta {
  id: string;
  title: string;
  blurb: string;
  icon: string;
  section: string;
  context: { what: string; why: string; how: string; };
}
