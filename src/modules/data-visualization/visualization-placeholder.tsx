"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DataQualityVisualizationProject } from "./data-quality-visualization-project";
import { DummyVisualizationProject } from "./dummy-visualization-project";
import { LiveCandlestickChart } from "./live-candlestick-chart";
import { getQualityScoringRules } from "./quality-rules";
import { useBinanceKlineFeed } from "./use-binance-kline-feed";
import {
  defaultVisualizationProjectId,
  visualizationProjects,
} from "./visualization-mock";

export function VisualizationPlaceholder() {
  const binanceFeed = useBinanceKlineFeed();
  const [selectedProjectId, setSelectedProjectId] = useState(
    defaultVisualizationProjectId,
  );
  const dynamicProjectShellRef = useRef<HTMLDivElement | null>(null);
  const heightReleaseTimerRef = useRef<number | null>(null);
  const [dynamicProjectShellHeight, setDynamicProjectShellHeight] = useState<
    number | null
  >(null);

  const activeProject = useMemo(() => {
    return (
      visualizationProjects.find((project) => project.id === selectedProjectId) ??
      visualizationProjects.find(
        (project) => project.id === defaultVisualizationProjectId,
      ) ??
      visualizationProjects[0]
    );
  }, [selectedProjectId]);

  const activeQualityRules = useMemo(
    () => getQualityScoringRules(activeProject.qualityRulePresetId),
    [activeProject.qualityRulePresetId],
  );

  useLayoutEffect(() => {
    if (dynamicProjectShellHeight === null || !dynamicProjectShellRef.current) {
      return;
    }

    const shellElement = dynamicProjectShellRef.current;
    const rafId = requestAnimationFrame(() => {
      setDynamicProjectShellHeight(shellElement.scrollHeight);
    });

    if (heightReleaseTimerRef.current !== null) {
      window.clearTimeout(heightReleaseTimerRef.current);
    }

    heightReleaseTimerRef.current = window.setTimeout(() => {
      setDynamicProjectShellHeight(null);
      heightReleaseTimerRef.current = null;
    }, 1000);

    return () => cancelAnimationFrame(rafId);
  }, [activeProject.id, dynamicProjectShellHeight]);

  useEffect(() => {
    return () => {
      if (heightReleaseTimerRef.current !== null) {
        window.clearTimeout(heightReleaseTimerRef.current);
      }
    };
  }, []);

  const handleProjectSwitch = (projectId: string) => {
    if (projectId === activeProject.id) {
      return;
    }

    if (dynamicProjectShellRef.current) {
      setDynamicProjectShellHeight(
        dynamicProjectShellRef.current.getBoundingClientRect().height,
      );
    }

    setSelectedProjectId(projectId);
  };

  return (
    <section
      aria-label="Data visualization placeholder"
      className="backdrop-blur"
    >
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="terminal-panel-soft terminal-panel-outer-triple-shadow terminal-sequence-row h-full p-5">
            <label
              htmlFor="visualization-project-select"
              className="font-data block text-[10px] tracking-[0.22em]"
            >
              Project Selection
            </label>

            <div className="relative mt-3">
              <select
                id="visualization-project-select"
                value={activeProject.id}
                onChange={(event) => handleProjectSwitch(event.target.value)}
                className="terminal-select terminal-button terminal-button-static font-ui h-12 w-full appearance-none bg-black/70 px-4 pr-12 text-xs font-semibold"
              >
                {visualizationProjects.map((project) => {
                  const optionText = `${project.label} - ${project.status}`;
                  return (
                    <option key={project.id} value={project.id}>
                      {optionText}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="terminal-panel-soft terminal-panel-outer-triple-shadow terminal-sequence-row flex h-full flex-col items-start gap-3 p-5">
            <div>
              <p className="font-data text-xs tracking-[0.28em] opacity-90">
                Interactive Data Layer
              </p>
              <h2 className="font-ui mt-2 text-lg font-semibold">
                {activeProject.title}
              </h2>
            </div>
            <span className="terminal-chip font-ui px-3 py-1 text-xs font-medium">
              {activeProject.status}
            </span>
          </div>
        </div>

        {/* Shared feed stays mounted so project switches reuse the same websocket data. */}
        <div
          ref={dynamicProjectShellRef}
          className="transition-[height] duration-[1000ms] ease-out [overflow-anchor:none] motion-reduce:transition-none"
          style={
            dynamicProjectShellHeight === null
              ? undefined
              : {
                  height: `${dynamicProjectShellHeight}px`,
                  overflow: "hidden",
                }
          }
        >
          {activeProject.type === "live" ? (
            <LiveCandlestickChart
              key={activeProject.id}
              symbol={binanceFeed.symbol}
              interval={binanceFeed.interval}
              feedState={binanceFeed.feedState}
              errorText={binanceFeed.errorText}
              lastPrice={binanceFeed.lastPrice}
              candles={binanceFeed.candles}
            />
          ) : activeProject.type === "quality" ? (
            <DataQualityVisualizationProject
              key={activeProject.id}
              symbol={binanceFeed.symbol}
              interval={binanceFeed.interval}
              feedState={binanceFeed.feedState}
              candles={binanceFeed.candles}
              rules={activeQualityRules}
            />
          ) : (
            <DummyVisualizationProject key={activeProject.id} project={activeProject} />
          )}
        </div>

        <div className="terminal-panel-soft terminal-panel-outer-triple-shadow terminal-sequence-row p-5">
          <div className="grid grid-cols-1 gap-3 text-xs lg:grid-cols-3">
            {activeProject.pipelineStages.map((stage) => (
              <article key={stage.id} className="terminal-panel-soft p-4">
                <p className="font-data tracking-wider">{stage.label}</p>
                <p className="mt-2">{stage.value}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
