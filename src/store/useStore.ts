import { create } from "zustand";

export type PageId =
  | "series-vs-df" | "selection" | "comprehensions" | "lambda-map-filter"
  | "filtering" | "sorting-topn" | "basic-agg" | "dates" | "missing-basics"
  | "chaining" | "cut-qcut" | "vectorization" | "loop-vs-vec"
  | "groupby-mental" | "agg-patterns" | "transform-apply-filter"
  | "multi-groupby" | "window-groups" | "resample" | "rolling"
  | "shift-lag" | "pivot-table" | "crosstab" | "melt"
  | "cohort" | "join-types" | "merge-join-concat" | "merge-mechanics"
  | "normalize" | "fact-dim" | "concat-patterns" | "json-df"
  | "funnel" | "chunking" | "parquet-csv" | "eval-query"
  | "index-speed" | "mcar-mar-mnar" | "viz-missing" | "imputation"
  | "duplicates" | "str-accessor" | "regex-extract" | "outliers";

interface S {
  page: PageId;
  sidebarOpen: boolean;
  setPage: (p: PageId) => void;
  toggleSidebar: () => void;
}

export const useStore = create<S>((set, get) => ({
  page: "series-vs-df",
  sidebarOpen: true,
  setPage: (p) => set({ page: p }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));
