import { useEffect, useMemo } from "react";
import { useStepAnimation } from "@/hooks/useStepAnimation";
import { AnimationControls } from "./AnimationControls";
import { CodeCell } from "./CodeCell";
import { DataFrameView } from "./DataFrameView";
import { Inspector } from "./Inspector";
import type { Step } from "@/types";
import type { ReactNode } from "react";
import { isActivatable, isTyping } from "@/lib/keys";

interface Props {
  runId: string;
  code: string;
  activeLineByStep?: number[];
  steps: Step[];
  layoutId?: string;
  interval?: number;
  /** Optional SVG diagram renderer per step. */
  renderDiagram?: (step: Step, index: number) => ReactNode;
}

export function StepRunner({ runId, code, activeLineByStep, steps, layoutId = "dfl", interval = 1300, renderDiagram }: Props) {
  const { step, isPlaying, play, pause, next, prev, reset, goTo } =
    useStepAnimation({ totalSteps: steps.length, resetKey: runId, interval });

  // Step through with the keyboard: ← → step, Space plays, R restarts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === " ") {
        if (isActivatable(e.target)) return; // the focused button handles it
        e.preventDefault();
        isPlaying ? pause() : play();
      } else if (e.key === "r" || e.key === "R") { reset(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, play, pause, next, prev, reset]);

  const current = steps[step] ?? steps[0];
  const activeLine = activeLineByStep?.[step];
  const stepLabels = useMemo(() => steps.map((s) => s.label), [steps]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="flex flex-col gap-3 min-w-0">
        <CodeCell code={code} count={1} kind="in" activeLine={activeLine} active />

        {/* Optional diagram */}
        {renderDiagram && current.diagram && (
          <div className="diagram-wrap">{renderDiagram(current, step)}</div>
        )}

        {/* Output frames */}
        <div className="nb-cell nb-cell--output">
          <div className="nb-cell__gutter nb-cell__prompt-out">Out[1]:</div>
          <div className="nb-cell__body flex flex-col gap-4">
            {/* Arrow between before/after frames */}
            {current.views.length > 1 && (
              <div className={`grid gap-3 ${current.views.length > 1 ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                {current.views.map((v, i) => (
                  <DataFrameView key={`${runId}-${step}-${i}`} frame={v.frame} title={v.title} badge={v.badge}
                    highlights={v.highlights} note={v.note} layoutId={`${layoutId}-${i}`} maxHeight={420} />
                ))}
              </div>
            )}
            {current.views.length === 1 && (
              <DataFrameView key={`${runId}-${step}-0`} frame={current.views[0].frame} title={current.views[0].title}
                badge={current.views[0].badge} highlights={current.views[0].highlights}
                note={current.views[0].note} layoutId={`${layoutId}-0`} maxHeight={420} />
            )}
          </div>
        </div>

        <AnimationControls step={step} totalSteps={steps.length} isPlaying={isPlaying}
          onPlay={play} onPause={pause} onNext={next} onPrev={prev} onReset={reset} onSeek={goTo}
          stepLabels={stepLabels} />
      </div>

      <div className="lg:sticky lg:top-4 self-start">
        <Inspector explain={current.explain} variables={current.variables} stepLabel={current.label} stepKey={step} />
      </div>
    </div>
  );
}
