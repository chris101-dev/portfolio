"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const binanceFeed = useBinanceKlineFeed();

  const selectedProjectId = searchParams.get("project");

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

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const isKnownProject = visualizationProjects.some(
      (project) => project.id === selectedProjectId,
    );

    if (isKnownProject) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("project", defaultVisualizationProjectId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, selectedProjectId]);

  const handleProjectSwitch = (projectId: string) => {
    if (projectId === activeProject.id) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("project", projectId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <section
      aria-label="Data visualization placeholder"
      className="backdrop-blur"
    >
      <div className="space-y-4 p-5">
        <div className="terminal-panel-soft p-5">
          <label
            htmlFor="visualization-project-select"
            className="font-data block text-[10px] tracking-[0.22em] text-white"
          >
            Project Selection
          </label>

          <div className="relative mt-3">
            <select
              id="visualization-project-select"
              value={activeProject.id}
              onChange={(event) => handleProjectSwitch(event.target.value)}
              className="terminal-select terminal-button terminal-button-static font-ui h-12 w-full appearance-none border-white bg-black/70 px-4 pr-12 text-xs font-semibold text-white"
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

        <div className="terminal-panel-soft flex flex-col items-start gap-3 p-5">
          <div>
            <p className="font-data text-xs tracking-[0.28em] text-cyan-300/90">
              Interactive Data Layer
            </p>
            <h2 className="font-ui mt-2 text-lg font-semibold text-white">
              {activeProject.title}
            </h2>
          </div>
          <span className="terminal-chip font-ui px-3 py-1 text-xs font-medium text-white">
            {activeProject.status}
          </span>
        </div>

        {/* Shared feed stays mounted so project switches reuse the same websocket data. */}
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

        <div className="terminal-panel-soft p-5">
          <div className="grid gap-3 text-xs text-white">
            {activeProject.pipelineStages.map((stage) => (
              <article key={stage.id} className="terminal-panel-soft p-4">
                <p className="font-data tracking-wider text-white">{stage.label}</p>
                <p className="mt-2">{stage.value}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
