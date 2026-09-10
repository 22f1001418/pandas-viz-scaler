import { Suspense, useEffect } from "react";
import { useStore, applyTheme } from "@/store/useStore";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { TopicNav } from "@/components/TopicNav";
import { IMPLEMENTED, prefetchTopic } from "@/pages";
import { StubPage } from "@/pages/StubPage";
import { TopicSkeleton } from "@/components/TopicSkeleton";
import { neighbours, pageFromHash, writeHash } from "@/lib/routing";
import { isTyping } from "@/lib/keys";

export default function App() {
  const page = useStore((s) => s.page);
  const theme = useStore((s) => s.theme);
  const setPage = useStore((s) => s.setPage);
  const syncPageFromHash = useStore((s) => s.syncPageFromHash);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const requestSearchFocus = useStore((s) => s.requestSearchFocus);
  const Cmp = IMPLEMENTED[page];

  useEffect(() => applyTheme(theme), [theme]);

  // Normalise the URL on first load (bare "/" → "#/series-vs-df") and follow
  // back/forward navigation afterwards.
  useEffect(() => {
    writeHash(pageFromHash(), true);
    const onHash = () => syncPageFromHash(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [syncPageFromHash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        requestSearchFocus();
        return;
      }
      if (e.key === "t" || e.key === "T") {
        toggleTheme();
        return;
      }
      if (e.key !== "[" && e.key !== "]") return;
      const { prev, next } = neighbours(page);
      const target = e.key === "[" ? prev : next;
      if (target) setPage(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, setPage, toggleTheme, requestSearchFocus]);

  // Send focus and scroll back to the top of the new topic on every change.
  useEffect(() => {
    document.getElementById("topic-main")?.scrollTo({ top: 0 });
  }, [page]);

  // Topic chunks load on demand, so warm the two a student is most likely to
  // ask for next. Deferred to idle time so it never competes with the chunk
  // actually being rendered.
  useEffect(() => {
    const { prev, next } = neighbours(page);
    const warm = () => { prefetchTopic(next); prefetchTopic(prev); };
    if (!window.requestIdleCallback) {
      const t = window.setTimeout(warm, 400);
      return () => clearTimeout(t);
    }
    const handle = window.requestIdleCallback(warm, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }, [page]);

  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main id="topic-main" className="flex-1 overflow-y-auto">
          <div key={page}>
            <Suspense fallback={<TopicSkeleton pageId={page} />}>
              {Cmp ? <Cmp /> : <StubPage pageId={page} />}
            </Suspense>
          </div>
          <TopicNav />
        </main>
      </div>
    </div>
  );
}
