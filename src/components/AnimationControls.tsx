import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";

interface Props {
  step: number; totalSteps: number; isPlaying: boolean;
  onPlay: () => void; onPause: () => void; onNext: () => void;
  onPrev: () => void; onReset: () => void; onSeek: (i: number) => void;
  stepLabels?: string[];
}

export function AnimationControls({ step, totalSteps, isPlaying, onPlay, onPause, onNext, onPrev, onReset, onSeek, stepLabels }: Props) {
  return (
    <div className="card px-3 py-2.5 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <button className="btn btn-ghost" onClick={onReset} aria-label="Reset"><RotateCcw size={14} /></button>
        <button className="btn btn-ghost" onClick={onPrev} disabled={step === 0} aria-label="Previous"><SkipBack size={14} /></button>
        {isPlaying
          ? <button className="btn btn-primary" onClick={onPause} aria-label="Pause"><Pause size={14} /> Pause</button>
          : <button className="btn btn-primary" onClick={onPlay} aria-label="Play"><Play size={14} /> {step === totalSteps - 1 ? "Replay" : "Play"}</button>}
        <button className="btn btn-ghost" onClick={onNext} disabled={step >= totalSteps - 1} aria-label="Next"><SkipForward size={14} /></button>
      </div>
      <div className="flex-1 min-w-[160px] flex flex-col gap-1">
        <input type="range" className="scrubber" min={0} max={Math.max(totalSteps - 1, 0)} value={step} onChange={(e) => onSeek(Number(e.target.value))} aria-label="Step scrubber" />
        <div className="flex items-center justify-between text-[11px] text-fg-muted font-mono">
          <span>Step {step + 1} / {totalSteps}</span>
          {stepLabels?.[step] && <span className="text-accent truncate ml-2 max-w-[60%]">{stepLabels[step]}</span>}
        </div>
      </div>
    </div>
  );
}
