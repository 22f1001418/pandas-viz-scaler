import { useCallback, useEffect, useRef, useState } from "react";

interface Opts { totalSteps: number; interval?: number; resetKey?: unknown; }

export function useStepAnimation({ totalSteps, interval = 1200, resetKey }: Opts) {
  const [step, setStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const clear = () => { if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null; } };

  useEffect(() => () => clear(), []);
  useEffect(() => { clear(); setStep(0); setPlaying(false); }, [resetKey]);
  useEffect(() => {
    if (!isPlaying) { clear(); return; }
    timer.current = window.setInterval(() => {
      setStep((s) => { if (s >= totalSteps - 1) { setPlaying(false); return s; } return s + 1; });
    }, interval);
    return clear;
  }, [isPlaying, interval, totalSteps]);

  return {
    step, isPlaying,
    play: useCallback(() => { if (step >= totalSteps - 1) setStep(0); setPlaying(true); }, [step, totalSteps]),
    pause: useCallback(() => setPlaying(false), []),
    reset: useCallback(() => { setPlaying(false); setStep(0); }, []),
    next: useCallback(() => { setPlaying(false); setStep((s) => Math.min(s + 1, totalSteps - 1)); }, [totalSteps]),
    prev: useCallback(() => { setPlaying(false); setStep((s) => Math.max(s - 1, 0)); }, []),
    goTo: useCallback((i: number) => { setPlaying(false); setStep(Math.max(0, Math.min(i, totalSteps - 1))); }, [totalSteps]),
  };
}
