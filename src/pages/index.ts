import type { ComponentType } from "react";
import type { PageId } from "@/store/useStore";

import { SeriesVsDfPage, SelectionPage, ComprehensionsPage, LambdaMapFilterPage, FilteringPage } from "./Foundations1";
import { SortingTopNPage, BasicAggPage, DatesPage, MissingBasicsPage, ChainingPage } from "./Foundations2";
import { CutQcutPage, VectorizationPage, LoopVsVecPage } from "./Vectorization";

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
};

export const isImplemented = (id: PageId): boolean => id in IMPLEMENTED;
