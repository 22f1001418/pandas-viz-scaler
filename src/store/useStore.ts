import { create } from "zustand";

export type Theme = "dark" | "light";

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
  theme: Theme;
  sidebarOpen: boolean;
  setPage: (p: PageId) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

const initTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const s = localStorage.getItem("pv-theme");
  if (s === "light" || s === "dark") return s;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const apply = (t: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(t);
  localStorage.setItem("pv-theme", t);
};

export const useStore = create<S>((set, get) => ({
  page: "series-vs-df",
  theme: initTheme(),
  sidebarOpen: true,
  setPage: (p) => set({ page: p }),
  toggleTheme: () => { const n = get().theme === "dark" ? "light" : "dark"; apply(n); set({ theme: n }); },
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));

if (typeof document !== "undefined") apply(initTheme());
