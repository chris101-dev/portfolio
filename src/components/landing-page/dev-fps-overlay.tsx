"use client";

import { useEffect, useMemo, useState } from "react";

const FPS_SAMPLE_WINDOW_MS = 1000;

function formatFps(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}`;
}

export function DevFpsOverlay() {
  const isDev = process.env.NODE_ENV === "development";

  const [averageFps, setAverageFps] = useState<number | null>(null);
  const [lowFps, setLowFps] = useState<number | null>(null);

  useEffect(() => {
    if (!isDev) {
      return;
    }

    let rafId = 0;
    let frameCount = 0;
    let sampleStart = performance.now();
    let lastFrameTime = sampleStart;
    let sampleLowFps = Number.POSITIVE_INFINITY;

    const loop = (now: number) => {
      frameCount += 1;

      const deltaMs = Math.max(1, now - lastFrameTime);
      const instantFps = 1000 / deltaMs;
      sampleLowFps = Math.min(sampleLowFps, instantFps);
      lastFrameTime = now;

      const elapsedMs = now - sampleStart;
      if (elapsedMs >= FPS_SAMPLE_WINDOW_MS) {
        const sampledAverageFps = (frameCount * 1000) / Math.max(1, elapsedMs);
        setAverageFps(sampledAverageFps);
        setLowFps(Number.isFinite(sampleLowFps) ? sampleLowFps : sampledAverageFps);

        frameCount = 0;
        sampleStart = now;
        sampleLowFps = Number.POSITIVE_INFINITY;
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isDev]);

  const statusClassName = useMemo(() => {
    if (averageFps === null) {
      return "text-white";
    }

    if (averageFps >= 58) {
      return "text-emerald-200";
    }

    if (averageFps >= 50) {
      return "text-amber-200";
    }

    return "text-rose-200";
  }, [averageFps]);

  if (!isDev) {
    return null;
  }

  return (
    <aside className="pointer-events-none fixed right-3 top-3 z-[70]" aria-live="polite">
      <div
        className={`terminal-panel-soft bg-black/85 px-3 py-2 text-[10px] leading-tight ${statusClassName}`}
      >
        <p className="font-data tracking-[0.16em]">dev fps</p>
        <p className="font-ui mt-1">avg: {formatFps(averageFps)} fps</p>
        <p className="font-ui">low: {formatFps(lowFps)} fps</p>
      </div>
    </aside>
  );
}
