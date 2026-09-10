import type { ComponentType } from "react";
import type { PageId } from "@/store/useStore";

import { SeriesVsDfPage, SelectionPage, ComprehensionsPage, LambdaMapFilterPage, FilteringPage } from "./Foundations1";
import { SortingTopNPage, BasicAggPage, DatesPage, MissingBasicsPage, ChainingPage } from "./Foundations2";
import { CutQcutPage, VectorizationPage, LoopVsVecPage } from "./Vectorization";
import { GroupByMentalPage, MultiGroupByPage, AggPatternsPage, TransformApplyFilterPage, WindowGroupsPage } from "./GroupBy";
import { RollingPage, ShiftLagPage, ResamplePage } from "./TimeSeries";
import { PivotTablePage, CrosstabPage, MeltPage } from "./Reshaping";
import { JoinTypesPage, MergeJoinConcatPage, MergeMechanicsPage, ConcatPatternsPage } from "./Joins";
import { FunnelPage, CohortPage, NormalizePage, FactDimPage } from "./Patterns";
import { JsonDfPage, ChunkingPage, ParquetCsvPage, EvalQueryPage, IndexSpeedPage } from "./IO";
import { McarMarMnarPage, VizMissingPage, ImputationPage, DuplicatesPage, StrAccessorPage, RegexExtractPage, OutliersPage } from "./Quality";

/**
 * The one place a topic graduates from stub to built. App renders from it and
 * the sidebar reads its keys for the progress dots, so the two can't drift.
 */
export const IMPLEMENTED: Partial<Record<PageId, ComponentType>> = {
  "series-vs-df": SeriesVsDfPage,
  "selection": SelectionPage,
  "comprehensions": ComprehensionsPage,
  "lambda-map-filter": LambdaMapFilterPage,
  "filtering": FilteringPage,
  "sorting-topn": SortingTopNPage,
  "basic-agg": BasicAggPage,
  "dates": DatesPage,
  "missing-basics": MissingBasicsPage,
  "chaining": ChainingPage,
  "cut-qcut": CutQcutPage,
  "vectorization": VectorizationPage,
  "loop-vs-vec": LoopVsVecPage,
  "groupby-mental": GroupByMentalPage,
  "agg-patterns": AggPatternsPage,
  "transform-apply-filter": TransformApplyFilterPage,
  "multi-groupby": MultiGroupByPage,
  "window-groups": WindowGroupsPage,
  "resample": ResamplePage,
  "rolling": RollingPage,
  "shift-lag": ShiftLagPage,
  "pivot-table": PivotTablePage,
  "crosstab": CrosstabPage,
  "melt": MeltPage,
  "cohort": CohortPage,
  "funnel": FunnelPage,
  "normalize": NormalizePage,
  "fact-dim": FactDimPage,
  "join-types": JoinTypesPage,
  "merge-join-concat": MergeJoinConcatPage,
  "merge-mechanics": MergeMechanicsPage,
  "concat-patterns": ConcatPatternsPage,
  "json-df": JsonDfPage,
  "chunking": ChunkingPage,
  "parquet-csv": ParquetCsvPage,
  "eval-query": EvalQueryPage,
  "index-speed": IndexSpeedPage,
  "mcar-mar-mnar": McarMarMnarPage,
  "viz-missing": VizMissingPage,
  "imputation": ImputationPage,
  "duplicates": DuplicatesPage,
  "str-accessor": StrAccessorPage,
  "regex-extract": RegexExtractPage,
  "outliers": OutliersPage,
};

export const isImplemented = (id: PageId): boolean => id in IMPLEMENTED;
