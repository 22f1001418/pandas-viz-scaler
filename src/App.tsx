import { useStore } from "@/store/useStore";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

import { SeriesVsDfPage, SelectionPage, ComprehensionsPage, LambdaMapFilterPage, FilteringPage } from "@/pages/Foundations1";
import { SortingTopNPage, BasicAggPage, DatesPage, MissingBasicsPage, ChainingPage } from "@/pages/Foundations2";
import { CutQcutPage, VectorizationPage, LoopVsVecPage } from "@/pages/Vectorization";
import { StubPage } from "@/pages/StubPage";

import type { PageId } from "@/store/useStore";

const IMPLEMENTED: Record<string, React.ComponentType> = {
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

export default function App() {
  const page = useStore((s) => s.page);
  const Cmp = IMPLEMENTED[page];

  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto" key={page}>
          {Cmp ? <Cmp /> : <StubPage pageId={page as PageId} />}
        </main>
      </div>
    </div>
  );
}
