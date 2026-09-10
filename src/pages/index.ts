import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { PageId } from "@/store/useStore";

/**
 * Topic modules are loaded on demand. Every topic file pulls in its own data
 * arrays and step scripts, so importing all 44 up front cost ~1.4 MB to render
 * the one topic actually on screen. Each entry below names the module that
 * holds a topic and the export inside it; `import()` per module means the nine
 * topic files become nine chunks that arrive only when a student opens one.
 */
type TopicModule = Record<string, ComponentType>;
type Loader = () => Promise<TopicModule>;

const Foundations1: Loader = () => import("./Foundations1");
const Foundations2: Loader = () => import("./Foundations2");
const Vectorization: Loader = () => import("./Vectorization");
const GroupBy: Loader = () => import("./GroupBy");
const TimeSeries: Loader = () => import("./TimeSeries");
const Reshaping: Loader = () => import("./Reshaping");
const Joins: Loader = () => import("./Joins");
const Patterns: Loader = () => import("./Patterns");
const IO: Loader = () => import("./IO");
const Quality: Loader = () => import("./Quality");

/**
 * The one place a topic graduates from stub to built: module loader + export
 * name. App renders from it and the sidebar reads its keys for the progress
 * dots, so the two can't drift — and reading the keys costs no network.
 */
const SOURCES: Partial<Record<PageId, [Loader, string]>> = {
  "series-vs-df": [Foundations1, "SeriesVsDfPage"],
  "selection": [Foundations1, "SelectionPage"],
  "comprehensions": [Foundations1, "ComprehensionsPage"],
  "lambda-map-filter": [Foundations1, "LambdaMapFilterPage"],
  "filtering": [Foundations1, "FilteringPage"],
  "sorting-topn": [Foundations2, "SortingTopNPage"],
  "basic-agg": [Foundations2, "BasicAggPage"],
  "dates": [Foundations2, "DatesPage"],
  "missing-basics": [Foundations2, "MissingBasicsPage"],
  "chaining": [Foundations2, "ChainingPage"],
  "cut-qcut": [Vectorization, "CutQcutPage"],
  "vectorization": [Vectorization, "VectorizationPage"],
  "loop-vs-vec": [Vectorization, "LoopVsVecPage"],
  "groupby-mental": [GroupBy, "GroupByMentalPage"],
  "agg-patterns": [GroupBy, "AggPatternsPage"],
  "transform-apply-filter": [GroupBy, "TransformApplyFilterPage"],
  "multi-groupby": [GroupBy, "MultiGroupByPage"],
  "window-groups": [GroupBy, "WindowGroupsPage"],
  "resample": [TimeSeries, "ResamplePage"],
  "rolling": [TimeSeries, "RollingPage"],
  "shift-lag": [TimeSeries, "ShiftLagPage"],
  "pivot-table": [Reshaping, "PivotTablePage"],
  "crosstab": [Reshaping, "CrosstabPage"],
  "melt": [Reshaping, "MeltPage"],
  "cohort": [Patterns, "CohortPage"],
  "funnel": [Patterns, "FunnelPage"],
  "normalize": [Patterns, "NormalizePage"],
  "fact-dim": [Patterns, "FactDimPage"],
  "join-types": [Joins, "JoinTypesPage"],
  "merge-join-concat": [Joins, "MergeJoinConcatPage"],
  "merge-mechanics": [Joins, "MergeMechanicsPage"],
  "concat-patterns": [Joins, "ConcatPatternsPage"],
  "json-df": [IO, "JsonDfPage"],
  "chunking": [IO, "ChunkingPage"],
  "parquet-csv": [IO, "ParquetCsvPage"],
  "eval-query": [IO, "EvalQueryPage"],
  "index-speed": [IO, "IndexSpeedPage"],
  "mcar-mar-mnar": [Quality, "McarMarMnarPage"],
  "viz-missing": [Quality, "VizMissingPage"],
  "imputation": [Quality, "ImputationPage"],
  "duplicates": [Quality, "DuplicatesPage"],
  "str-accessor": [Quality, "StrAccessorPage"],
  "regex-extract": [Quality, "RegexExtractPage"],
  "outliers": [Quality, "OutliersPage"],
};

/** id → suspense-ready component. `lazy` records the loader; it doesn't run it. */
export const IMPLEMENTED = Object.fromEntries(
  Object.entries(SOURCES).map(([id, [load, exportName]]) => [
    id,
    lazy(async () => ({ default: (await load())[exportName] })),
  ]),
) as Partial<Record<PageId, LazyExoticComponent<ComponentType>>>;

export const isImplemented = (id: PageId): boolean => id in SOURCES;

/**
 * Warm a topic's chunk without rendering it. Module loads are cached by the
 * browser, so calling this for the prev/next topic makes the common
 * walk-the-curriculum path feel as instant as the old single bundle did.
 */
export function prefetchTopic(id: PageId | null): void {
  if (!id) return;
  void SOURCES[id]?.[0]().catch(() => {
    /* A failed prefetch is not a user-visible error; the real render retries. */
  });
}
