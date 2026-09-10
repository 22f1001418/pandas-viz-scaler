import { create } from "zustand";
import { pageFromHash, writeHash } from "@/lib/routing";

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

export type Theme = "light" | "dark";

const THEME_KEY = "pv-theme";

/** Stored choice wins; otherwise follow the OS. */
function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode / blocked storage — fall through to the OS preference */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
}

interface S {
  page: PageId;
  sidebarOpen: boolean;
  theme: Theme;
  /** Bumped by `/` to ask the sidebar to focus its search box. */
  searchFocusToken: number;
  setPage: (p: PageId) => void;
  /** Page change coming from the URL — must not write the hash back. */
  syncPageFromHash: (p: PageId) => void;
  toggleSidebar: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  requestSearchFocus: () => void;
}

export const useStore = create<S>((set, get) => ({
  page: pageFromHash(),
  sidebarOpen: true,
  theme: initialTheme(),
  searchFocusToken: 0,
  setPage: (p) => {
    writeHash(p);
    set({ page: p });
  },
  syncPageFromHash: (p) => set({ page: p }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setTheme: (t) => {
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* persistence is a convenience — the in-memory theme still applies */
    }
    applyTheme(t);
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  requestSearchFocus: () => set({ searchFocusToken: get().searchFocusToken + 1 }),
}));
