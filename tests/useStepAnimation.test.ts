import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStepAnimation } from "@/hooks/useStepAnimation";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (totalSteps = 4, resetKey: unknown = "a") =>
  renderHook(({ k }) => useStepAnimation({ totalSteps, interval: 100, resetKey: k }), {
    initialProps: { k: resetKey },
  });

describe("useStepAnimation", () => {
  it("starts paused on the first step", () => {
    const { result } = setup();
    expect(result.current.step).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("steps forward and back, clamped at both ends", () => {
    const { result } = setup(3);
    act(() => result.current.prev());
    expect(result.current.step).toBe(0);
    act(() => { result.current.next(); result.current.next(); result.current.next(); });
    expect(result.current.step).toBe(2);
    act(() => result.current.prev());
    expect(result.current.step).toBe(1);
  });

  it("seeks with goTo, clamping out-of-range targets", () => {
    const { result } = setup(4);
    act(() => result.current.goTo(2));
    expect(result.current.step).toBe(2);
    act(() => result.current.goTo(99));
    expect(result.current.step).toBe(3);
    act(() => result.current.goTo(-5));
    expect(result.current.step).toBe(0);
  });

  it("advances one step per interval while playing", () => {
    const { result } = setup(4);
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.step).toBe(1);
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.step).toBe(3);
  });

  it("stops playing when it reaches the last step", () => {
    const { result } = setup(2);
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.step).toBe(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("replays from the start when play is pressed at the end", () => {
    const { result } = setup(3);
    act(() => result.current.goTo(2));
    act(() => result.current.play());
    expect(result.current.step).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it("pauses, and stops advancing once paused", () => {
    const { result } = setup(4);
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.pause());
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.step).toBe(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("stepping manually pauses playback", () => {
    const { result } = setup(4);
    act(() => result.current.play());
    act(() => result.current.next());
    expect(result.current.isPlaying).toBe(false);
  });

  it("reset returns to the first step and pauses", () => {
    const { result } = setup(4);
    act(() => { result.current.goTo(3); result.current.play(); });
    act(() => result.current.reset());
    expect(result.current.step).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  // Switching topics reuses the same StepRunner, so a new runId has to rewind
  // it — otherwise the new topic opens halfway through its own steps.
  it("rewinds and pauses when resetKey changes", () => {
    const { result, rerender } = setup(4, "a");
    act(() => { result.current.goTo(3); result.current.play(); });
    rerender({ k: "b" });
    expect(result.current.step).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    // and the old run's timer is gone, so it can't advance the new one
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.step).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not rewind when resetKey is unchanged", () => {
    const { result, rerender } = setup(4, "a");
    act(() => result.current.goTo(2));
    rerender({ k: "a" });
    expect(result.current.step).toBe(2);
  });

  it("stops its timer on unmount", () => {
    const { result, unmount } = setup(4);
    act(() => result.current.play());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
