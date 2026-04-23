import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("does not update the value before the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    rerender({ value: "updated", delay: 300 });

    // Advance time by less than the delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("initial");
  });

  it("updates the value after the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    rerender({ value: "updated", delay: 300 });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe("updated");
  });

  it("resets the timer when value changes again before delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    rerender({ value: "first", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Change again before 300ms — should reset the timer
    rerender({ value: "second", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Only 200ms have passed since the last change, so still "initial"
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Now 300ms have passed since the last change
    expect(result.current).toBe("second");
  });

  it("works with numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 500 } }
    );

    rerender({ value: 42, delay: 500 });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(42);
  });

  it("works with object values", () => {
    const initial = { name: "Alice" };
    const updated = { name: "Bob" };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initial, delay: 200 } }
    );

    rerender({ value: updated, delay: 200 });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toEqual({ name: "Bob" });
  });

  it("respects different delay values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 1000 } }
    );

    rerender({ value: "updated", delay: 1000 });

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe("updated");
  });
});
