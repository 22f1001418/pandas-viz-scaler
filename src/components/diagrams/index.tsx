import type { ReactNode } from "react";
import { Venn } from "./Venn";
import { SplitApplyCombine } from "./SplitApplyCombine";
import { RollingWindow } from "./RollingWindow";
import { ShiftLag } from "./ShiftLag";
import { Funnel } from "./Funnel";

/**
 * Diagrams are addressed by string so a Step stays plain data. Set
 * `diagram: "venn-inner"` on a step and StepRunner draws it — no wiring
 * per page. Unknown keys render nothing rather than throwing.
 */
export const DIAGRAMS: Record<string, () => ReactNode> = {
  "venn-inner": () => <Venn mode="inner" />,
  "venn-left": () => <Venn mode="left" />,
  "venn-right": () => <Venn mode="right" />,
  "venn-outer": () => <Venn mode="outer" />,
  "venn-cross": () => <Venn mode="cross" />,
  "split-apply-combine": () => <SplitApplyCombine />,
  "rolling-window": () => <RollingWindow />,
  "shift-lag": () => <ShiftLag />,
  "funnel": () => <Funnel />,
};

export function Diagram({ name }: { name: string }) {
  const D = DIAGRAMS[name];
  return D ? <>{D()}</> : null;
}
