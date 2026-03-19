"use client";

import { useMemo, useState } from "react";
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

  const liveProjectId = useMemo(() => {
    return (
      visualizationProjects.find((project) => project.type === "live")?.id ??
      defaultVisualizationProjectId
    );
  }, []);

  const qualityProjectId = useMemo(() => {
    return (
      visualizationProjects.find((project) => project.type === "quality")?.id ??
      defaultVisualizationProjectId
    );
  }, []);

  const handleProjectSwitch = (projectId: string) => {
    if (projectId === activeProject.id) {
      return;
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
          <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={activeProject.id === liveProjectId}
              onClick={() => handleProjectSwitch(liveProjectId)}
              className="terminal-panel-soft terminal-panel-outer-triple-shadow terminal-sequence-row terminal-lift-button font-ui h-full min-h-[120px] p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
            >
              <span className="block text-sm font-semibold sm:text-base">
                Binance Live Data
              </span>
              <span className="mt-1 block text-xs opacity-85">15m Interval</span>
            </button>

            <button
              type="button"
              aria-pressed={activeProject.id === qualityProjectId}
              onClick={() => handleProjectSwitch(qualityProjectId)}
              className="terminal-panel-soft terminal-panel-outer-triple-shadow terminal-sequence-row terminal-lift-button font-ui h-full min-h-[120px] p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
            >
              <span className="block text-sm font-semibold sm:text-base">
                Data Quality
              </span>
              <span className="mt-1 block text-xs opacity-85">Quality Monitoring</span>
            </button>
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
        <div className="[overflow-anchor:none]">
          {activeProject.type === "live" ? (
            <LiveCandlestickChart
              key={activeProject.id}
              symbol={binanceFeed.symbol}
              interval={binanceFeed.interval}
              feedState={binanceFeed.feedState}
              errorText={binanceFeed.errorText}
              lastPrice={binanceFeed.lastPrice}
              candles={binanceFeed.candles}
              secondaryCandles={binanceFeed.secondaryCandles}
            />
          ) : activeProject.type === "quality" ? (
            <DataQualityVisualizationProject
              key={activeProject.id}
              symbol={binanceFeed.symbol}
              interval={binanceFeed.interval}
              feedState={binanceFeed.feedState}
              candles={binanceFeed.candles}
              telemetry={binanceFeed.telemetry}
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
