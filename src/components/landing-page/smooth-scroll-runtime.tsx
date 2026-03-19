"use client";

import { useEffect } from "react";
import Lenis from "lenis";

const FPS_SAMPLE_DURATION_MS = 1600;
const LOW_FPS_THRESHOLD = 55;

type LenisWindow = Window & {
  __lenis?: Lenis;
};

export function SmoothScrollRuntime() {
  useEffect(() => {
    const rootElement = document.documentElement;
    rootElement.classList.add("lenis", "lenis-smooth");

    const lenis = new Lenis({
      smoothWheel: true,
      lerp: 0.08,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
      infinite: false,
    });

    (window as LenisWindow).__lenis = lenis;

    let animationFrameId = 0;
    let fpsSampleRafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      animationFrameId = window.requestAnimationFrame(raf);
    };

    const runFpsSample = () => {
      let startTime = 0;
      let frameCount = 0;

      const sample = (now: number) => {
        if (startTime === 0) {
          startTime = now;
        }

        frameCount += 1;
        const elapsedMs = now - startTime;
        if (elapsedMs >= FPS_SAMPLE_DURATION_MS) {
          const fps = (frameCount * 1000) / Math.max(1, elapsedMs);
          rootElement.classList.toggle("performance-lite", fps < LOW_FPS_THRESHOLD);
          return;
        }

        fpsSampleRafId = window.requestAnimationFrame(sample);
      };

      fpsSampleRafId = window.requestAnimationFrame(sample);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (fpsSampleRafId !== 0) {
        window.cancelAnimationFrame(fpsSampleRafId);
      }

      runFpsSample();
    };

    const handleUserScrollIntent = () => {
      if (fpsSampleRafId !== 0) {
        window.cancelAnimationFrame(fpsSampleRafId);
      }

      runFpsSample();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("wheel", handleUserScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleUserScrollIntent, {
      passive: true,
    });
    animationFrameId = window.requestAnimationFrame(raf);
    runFpsSample();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("wheel", handleUserScrollIntent);
      window.removeEventListener("touchmove", handleUserScrollIntent);

      if (fpsSampleRafId !== 0) {
        window.cancelAnimationFrame(fpsSampleRafId);
      }

      window.cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      delete (window as LenisWindow).__lenis;
      rootElement.classList.remove("performance-lite");
      rootElement.classList.remove("lenis", "lenis-smooth", "lenis-stopped");
    };
  }, []);

  return null;
}
