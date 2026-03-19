"use client";

import { useMemo } from "react";
import type { QualityScoringRules } from "./quality-rules";
import {
  BINANCE_INITIAL_LIMIT,
  type CandlePoint,
  type FeedTelemetry,
  type FeedState,
} from "./use-binance-kline-feed";

type DataQualityVisualizationProjectProps = {
  symbol: string;
  interval: string;
  feedState: FeedState;
  candles: CandlePoint[];
  telemetry: FeedTelemetry;
  rules: QualityScoringRules;
};

type SeverityLevel = "info" | "warn" | "error";

type QualityCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: SeverityLevel;
};

type QualityIncident = {
  id: string;
  title: string;
  detail: string;
  severity: SeverityLevel;
};

type QualityTimelinePoint = {
  time: CandlePoint["time"];
  score: number;
};

type QualityWindow = {
  missingIntervals: number;
  duplicateTimestamps: number;
  invalidOhlcRows: number;
  score: number;
};

type QualityMetrics = {
  sampleSize: number;
  freshnessLagMs: number | null;
  missingIntervals: number;
  duplicateTimestamps: number;
  invalidOhlcRows: number;
  qualityScore: number;
  checks: QualityCheck[];
  incidents: QualityIncident[];
  timeline: QualityTimelinePoint[];
};

const EXPECTED_SAMPLE_SIZE = BINANCE_INITIAL_LIMIT;

function formatMilliseconds(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}ms`;
}

function formatHeartbeat(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function clampScore(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return value;
}

function computeScore(
  missingIntervals: number,
  duplicateTimestamps: number,
  invalidOhlcRows: number,
  freshnessSeconds: number,
  rules: QualityScoringRules,
): number {
  let qualityScore = 100;
  qualityScore -= Math.min(
    rules.penalties.missingIntervals.maxPenalty,
    missingIntervals * rules.penalties.missingIntervals.pointsPerOccurrence,
  );
  qualityScore -= Math.min(
    rules.penalties.duplicateTimestamps.maxPenalty,
    duplicateTimestamps * rules.penalties.duplicateTimestamps.pointsPerOccurrence,
  );
  qualityScore -= Math.min(
    rules.penalties.invalidOhlcRows.maxPenalty,
    invalidOhlcRows * rules.penalties.invalidOhlcRows.pointsPerOccurrence,
  );

  if (freshnessSeconds > rules.freshness.passLimitSeconds) {
    const freshnessDelay = freshnessSeconds - rules.freshness.passLimitSeconds;
    const penaltyStepSeconds = Math.max(1, rules.freshness.penaltyStepSeconds);

    qualityScore -= Math.min(
      rules.freshness.maxPenalty,
      Math.floor(freshnessDelay / penaltyStepSeconds) *
        rules.freshness.penaltyStepPoints +
        rules.freshness.basePenaltyPoints,
    );
  }

  return clampScore(qualityScore);
}

function evaluateQualityWindow(
  candles: CandlePoint[],
  freshnessSeconds: number,
  rules: QualityScoringRules,
): QualityWindow {
  if (candles.length === 0) {
    return {
      missingIntervals: 0,
      duplicateTimestamps: 0,
      invalidOhlcRows: 0,
      score: 0,
    };
  }

  const duplicateCountMap = new Map<number, number>();
  let invalidOhlcRows = 0;

  for (const candle of candles) {
    const timeValue = Number(candle.time);
    duplicateCountMap.set(timeValue, (duplicateCountMap.get(timeValue) ?? 0) + 1);

    const isFiniteRow =
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close);

    const hasValidBounds =
      candle.low <= candle.open &&
      candle.low <= candle.close &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.high >= candle.low;

    if (!isFiniteRow || !hasValidBounds) {
      invalidOhlcRows += 1;
    }
  }

  let missingIntervals = 0;
  for (let index = 1; index < candles.length; index += 1) {
    const delta = Number(candles[index].time) - Number(candles[index - 1].time);
    if (delta > rules.intervalSeconds) {
      missingIntervals += Math.floor(delta / rules.intervalSeconds) - 1;
    }
  }

  const duplicateTimestamps = Array.from(duplicateCountMap.values()).reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );

  return {
    missingIntervals,
    duplicateTimestamps,
    invalidOhlcRows,
    score: computeScore(
      missingIntervals,
      duplicateTimestamps,
      invalidOhlcRows,
      freshnessSeconds,
      rules,
    ),
  };
}

function freshnessSeverity(
  freshnessLagMs: number | null,
  rules: QualityScoringRules,
): SeverityLevel {
  if (freshnessLagMs === null) {
    return "error";
  }

  if (freshnessLagMs <= rules.freshness.passLimitSeconds * 1000) {
    return "info";
  }

  if (freshnessLagMs <= rules.freshness.warnLimitSeconds * 1000) {
    return "warn";
  }

  return "error";
}

function countSeverity(value: number, warnUpperBound: number): SeverityLevel {
  if (value === 0) {
    return "info";
  }

  if (value <= Math.max(0, warnUpperBound)) {
    return "warn";
  }

  return "error";
}

function formatIntervalLabel(intervalSeconds: number): string {
  if (intervalSeconds % 60 === 0) {
    return `${intervalSeconds / 60}m`;
  }

  return `${intervalSeconds}s`;
}

function evaluateQuality(
  candles: CandlePoint[],
  freshnessLagMsSource: number | null,
  rules: QualityScoringRules,
): QualityMetrics {
  if (candles.length === 0) {
    return {
      sampleSize: 0,
      freshnessLagMs: null,
      missingIntervals: 0,
      duplicateTimestamps: 0,
      invalidOhlcRows: 0,
      qualityScore: 0,
      checks: [
        {
          id: "feed-data",
          label: "Feed data available",
          passed: false,
          detail: "No candles received yet.",
          severity: "error",
        },
      ],
      incidents: [
        {
          id: "feed-data",
          title: "Feed data available",
          detail: "No candles received yet.",
          severity: "error",
        },
      ],
      timeline: [],
    };
  }

  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const freshnessLagMs =
    freshnessLagMsSource === null
      ? null
      : Math.max(0, freshnessLagMsSource);
  const freshnessSecondsForScore =
    freshnessLagMs === null
      ? rules.freshness.warnLimitSeconds + rules.freshness.penaltyStepSeconds
      : freshnessLagMs / 1000;

  const overallWindow = evaluateQualityWindow(
    sorted,
    freshnessSecondsForScore,
    rules,
  );

  const freshnessLevel = freshnessSeverity(freshnessLagMs, rules);
  const duplicateLevel = countSeverity(
    overallWindow.duplicateTimestamps,
    rules.penalties.duplicateTimestamps.warnUpperBound,
  );
  const gapLevel = countSeverity(
    overallWindow.missingIntervals,
    rules.penalties.missingIntervals.warnUpperBound,
  );
  const ohlcLevel = countSeverity(
    overallWindow.invalidOhlcRows,
    rules.penalties.invalidOhlcRows.warnUpperBound,
  );

  const checks: QualityCheck[] = [
    {
      id: "freshness",
      label: `Freshness <= ${rules.freshness.passLimitSeconds}s`,
      passed:
        freshnessLagMs !== null &&
        freshnessLagMs <= rules.freshness.passLimitSeconds * 1000,
      detail: `Current lag: ${formatMilliseconds(freshnessLagMs)}`,
      severity: freshnessLevel,
    },
    {
      id: "duplicates",
      label: "No duplicate timestamps",
      passed: overallWindow.duplicateTimestamps === 0,
      detail: `${overallWindow.duplicateTimestamps} duplicate entries detected`,
      severity: duplicateLevel,
    },
    {
      id: "interval-gaps",
      label: `No missing ${formatIntervalLabel(rules.intervalSeconds)} intervals`,
      passed: overallWindow.missingIntervals === 0,
      detail: `${overallWindow.missingIntervals} missing intervals detected`,
      severity: gapLevel,
    },
    {
      id: "ohlc-range",
      label: "Valid OHLC range",
      passed: overallWindow.invalidOhlcRows === 0,
      detail: `${overallWindow.invalidOhlcRows} invalid OHLC rows`,
      severity: ohlcLevel,
    },
  ];

  const incidents = checks
    .filter((check) => !check.passed)
    .map((check) => ({
      id: check.id,
      title: check.label,
      detail: check.detail,
      severity: check.severity,
    }));

  if (sorted.length !== EXPECTED_SAMPLE_SIZE) {
    incidents.unshift({
      id: "sample-size-window",
      title: "Rolling sample window mismatch",
      detail: `Sample size ${sorted.length} detected, expected ${EXPECTED_SAMPLE_SIZE}.`,
      severity: "warn",
    });
  }

  const timeline: QualityTimelinePoint[] = sorted.map((_, index) => {
    const rollingWindowSize = Math.max(1, rules.rollingWindowSize);
    const startIndex = Math.max(0, index - rollingWindowSize + 1);
    const windowCandles = sorted.slice(startIndex, index + 1);
    const windowMetrics = evaluateQualityWindow(windowCandles, 0, rules);

    return {
      time: sorted[index].time,
      score: windowMetrics.score,
    };
  });

  return {
    sampleSize: sorted.length,
    freshnessLagMs,
    missingIntervals: overallWindow.missingIntervals,
    duplicateTimestamps: overallWindow.duplicateTimestamps,
    invalidOhlcRows: overallWindow.invalidOhlcRows,
    qualityScore: overallWindow.score,
    checks,
    incidents,
    timeline,
  };
}

function feedStateLabel(state: FeedState): string {
  switch (state) {
    case "loading":
      return "Loading";
    case "live":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Error";
    default:
      return "Loading";
  }
}

function qualityScoreColor(score: number): string {
  if (score === 100) {
    return "text-emerald-300";
  }

  if (score < 90) {
    return "text-rose-300";
  }

  if (score < 100) {
    return "text-amber-300";
  }

  return "text-emerald-300";
}

function qualityScoreDotClass(score: number): string {
  if (score === 100) {
    return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]";
  }

  if (score < 90) {
    return "bg-rose-300 shadow-[0_0_8px_rgba(251,113,133,0.8)]";
  }

  return "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]";
}

function severityBadgeClass(severity: SeverityLevel): string {
  if (severity === "info") {
    return "border-white bg-emerald-300/10 text-emerald-200";
  }

  if (severity === "warn") {
    return "border-white bg-amber-300/10 text-amber-200";
  }

  return "border-white bg-rose-300/10 text-rose-200";
}

function latencySeverity(
  latencyMs: number | null,
  rules: QualityScoringRules,
): SeverityLevel {
  if (latencyMs === null) {
    return "error";
  }

  if (latencyMs <= rules.telemetry.healthyLatencyMs) {
    return "info";
  }

  if (latencyMs <= rules.telemetry.warnLatencyMs) {
    return "warn";
  }

  return "error";
}

function latencyDotClass(
  latencyMs: number | null,
  rules: QualityScoringRules,
): string {
  const severity = latencySeverity(latencyMs, rules);

  if (severity === "info") {
    return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]";
  }

  if (severity === "warn") {
    return "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]";
  }

  return "bg-rose-300 shadow-[0_0_8px_rgba(251,113,133,0.8)]";
}

function latencyTimelineBarClass(
  latencyMs: number | null,
  rules: QualityScoringRules,
): string {
  if (latencyMs === null) {
    return "bg-white/25";
  }

  if (latencyMs <= rules.telemetry.healthyLatencyMs) {
    return "bg-emerald-300/90";
  }

  if (latencyMs <= rules.telemetry.warnLatencyMs) {
    return "bg-amber-300/90";
  }

  return "bg-rose-300/90";
}

function latencyTimelineBarHeight(
  latencyMs: number | null,
  axisMaxLatencyMs: number,
): string {
  if (latencyMs === null) {
    return "8%";
  }

  const normalized = Math.min(latencyMs, axisMaxLatencyMs) / axisMaxLatencyMs;
  return `${Math.max(8, Math.round(normalized * 100))}%`;
}

function calculateLatencyAxisMax(
  values: Array<number | null>,
  fallbackMaxMs: number,
): number {
  const validValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return Math.max(1, fallbackMaxMs);
  }

  const observedMax = Math.max(...validValues);
  if (observedMax <= 0) {
    return 10;
  }

  const paddedMax = observedMax * 1.2;
  const roundingStep = paddedMax <= 100 ? 5 : paddedMax <= 500 ? 10 : 50;
  return Math.max(10, Math.ceil(paddedMax / roundingStep) * roundingStep);
}

function timelineBarClass(score: number | null): string {
  if (score === null) {
    return "bg-white/25";
  }

  if (score >= 90) {
    return "bg-emerald-300/90";
  }

  if (score >= 70) {
    return "bg-amber-300/90";
  }

  return "bg-rose-300/90";
}

function buildTimelineSlots(
  points: QualityTimelinePoint[],
  slotCount: number,
): Array<number | null> {
  const latest = points.slice(-slotCount).map((point) => point.score);
  const slots = new Array<number | null>(slotCount).fill(null);
  const offset = slotCount - latest.length;

  latest.forEach((score, index) => {
    slots[offset + index] = score;
  });

  return slots;
}

function buildLatencyTimelineSlots(
  values: Array<number | null>,
  slotCount: number,
): Array<number | null> {
  const latest = values.slice(-slotCount);
  const slots = new Array<number | null>(slotCount).fill(null);
  const offset = slotCount - latest.length;

  latest.forEach((value, index) => {
    slots[offset + index] = value;
  });

  return slots;
}

function formatScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}`;
}

export function DataQualityVisualizationProject({
  symbol,
  interval,
  feedState,
  candles,
  telemetry,
  rules,
}: DataQualityVisualizationProjectProps) {
  const metrics = useMemo(
    () => evaluateQuality(candles, telemetry.lastAggTradeInterArrivalMs, rules),
    [candles, telemetry.lastAggTradeInterArrivalMs, rules],
  );

  const timelineSlotCount = Math.max(1, rules.timelineSlotCount);

  const timelineSlots = useMemo(
    () => buildTimelineSlots(metrics.timeline, timelineSlotCount),
    [metrics.timeline, timelineSlotCount],
  );

  const filledTimelineSlotCount = useMemo(
    () => timelineSlots.filter((score) => score !== null).length,
    [timelineSlots],
  );

  const oldestTimelineScore = useMemo(() => {
    for (const score of timelineSlots) {
      if (score !== null) {
        return score;
      }
    }

    return null;
  }, [timelineSlots]);

  const latestTimelineScore = useMemo(() => {
    for (let index = timelineSlots.length - 1; index >= 0; index -= 1) {
      const score = timelineSlots[index];
      if (score !== null) {
        return score;
      }
    }

    return null;
  }, [timelineSlots]);

  const latencySeries = useMemo(
    () => telemetry.timeline.map((point) => point.ingestionLatencyMs),
    [telemetry.timeline],
  );

  const latencyTimelineSlots = useMemo(
    () => buildLatencyTimelineSlots(latencySeries, timelineSlotCount),
    [latencySeries, timelineSlotCount],
  );

  const filledLatencySlotCount = useMemo(
    () => latencyTimelineSlots.filter((latency) => latency !== null).length,
    [latencyTimelineSlots],
  );

  const latestLatency = telemetry.lastIngestionLatencyMs;
  const avgLatency = telemetry.averageIngestionLatencyMs;
  const maxLatency = telemetry.maxIngestionLatencyMs;
  const klineFreshness = telemetry.lastKlineInterArrivalMs;
  const aggTradeFreshness = telemetry.lastAggTradeInterArrivalMs;
  const heartbeatOneMinuteAvg = telemetry.oneMinuteAggTradeInterArrivalMs;

  const latencyAxisMaxMs = useMemo(
    () =>
      calculateLatencyAxisMax(
        latencyTimelineSlots,
        rules.telemetry.chartMaxLatencyMs,
      ),
    [latencyTimelineSlots, rules.telemetry.chartMaxLatencyMs],
  );

  const streamAgeMs = useMemo(() => {
    if (telemetry.lastArrivalTimestampMs === null) {
      return null;
    }

    return Math.max(0, Date.now() - telemetry.lastArrivalTimestampMs);
  }, [telemetry.lastArrivalTimestampMs]);

  const heartbeatLevel = useMemo(() => {
    if (heartbeatOneMinuteAvg === null) {
      return "--";
    }

    return heartbeatOneMinuteAvg > rules.telemetry.heartbeatWarnMs
      ? "degraded"
      : "stable";
  }, [heartbeatOneMinuteAvg, rules.telemetry.heartbeatWarnMs]);

  const latencyIncident = useMemo(() => {
    if (latestLatency === null || latestLatency <= rules.telemetry.incidentLatencyMs) {
      return null;
    }

    return {
      id: "ingestion-latency-spike",
      title: "Ingestion latency spike detected",
      detail: `Current transport latency ${formatMilliseconds(latestLatency)} exceeds ${formatMilliseconds(
        rules.telemetry.incidentLatencyMs,
      )}.`,
      severity: "error" as const,
    };
  }, [latestLatency, rules.telemetry.incidentLatencyMs]);

  const mergedIncidents = useMemo(() => {
    if (!latencyIncident) {
      return metrics.incidents;
    }

    return [latencyIncident, ...metrics.incidents];
  }, [latencyIncident, metrics.incidents]);

  return (
    <div className="terminal-panel-soft terminal-panel-outer-triple-shadow p-5">
      <div className="mb-4 flex flex-col items-start gap-3">
        <p className="font-ui text-xs text-white">
          {symbol} · {interval} · shared feed quality checks
        </p>
        <div className="terminal-chip font-ui px-3 py-1 text-xs text-white">
          {feedStateLabel(feedState)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article className="terminal-panel-soft p-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${qualityScoreDotClass(
                metrics.qualityScore,
              )}`}
            />
            <p className="font-data text-[10px] tracking-wider text-white">quality score</p>
          </div>
          <p
            className={`mt-3 font-ui text-5xl font-semibold leading-none sm:text-6xl ${qualityScoreColor(
              metrics.qualityScore,
            )}`}
          >
            {metrics.qualityScore}
          </p>
        </article>

        <article className="terminal-panel-soft p-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${latencyDotClass(
                latestLatency,
                rules,
              )}`}
            />
            <p className="font-data text-[10px] tracking-wider text-white">
              Latency
            </p>
          </div>
          <p className="mt-2 font-ui text-2xl font-semibold text-white">
            {formatMilliseconds(latestLatency)}
          </p>
          <div className="mt-2 space-y-1 text-[11px] text-white">
            <p>Freshness (kline): {formatHeartbeat(klineFreshness)}</p>
            <p>Freshness (aggTrade): {formatHeartbeat(aggTradeFreshness)}</p>
            <p>
              Market heartbeat (1m): {formatHeartbeat(heartbeatOneMinuteAvg)} avg ({heartbeatLevel})
            </p>
            <p>Last packet age: {formatHeartbeat(streamAgeMs)}</p>
          </div>
        </article>
      </div>

      <article className="terminal-panel-soft mt-4 p-4">
        <p className="font-data text-[10px] tracking-wider text-cyan-300/90">
          Rolling Quality Score Timeline
        </p>

        <div className="relative mt-4 border border-white bg-black/70 p-2">
          <div
            className="grid h-24 items-end gap-px"
            style={{
              gridTemplateColumns: `repeat(${timelineSlotCount}, minmax(0, 1fr))`,
            }}
          >
            {timelineSlots.map((score, index) => (
              <div
                key={`timeline-slot-${index}`}
                className={`${timelineBarClass(score)} w-full`}
                style={{ height: `${Math.max(8, score ?? 0)}%` }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[120%]">
            <span className="border border-current bg-black px-2 py-0.5 font-data text-[8px] tracking-[0.12em] text-[color:var(--terminal-rainbow-color)]">
              100
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[120%]">
            <span className="border border-current bg-black px-2 py-0.5 font-data text-[8px] tracking-[0.12em] text-[color:var(--terminal-rainbow-color)]">
              0
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start gap-1 text-[10px] text-white">
          <span>Oldest: {formatScore(oldestTimelineScore)}</span>
          <span>
            Filled: {filledTimelineSlotCount}/{timelineSlotCount} | Window: {rules.rollingWindowSize} candles
          </span>
          <span>Latest: {formatScore(latestTimelineScore)}</span>
        </div>
      </article>

      <article className="terminal-panel-soft mt-4 p-4">
        <p className="font-data text-[10px] tracking-wider text-cyan-300/90">
          Ingestion Latency Timeline
        </p>

        <div className="relative mt-4 border border-white bg-black/70 p-2">
          <div
            className="grid h-24 items-end gap-px"
            style={{
              gridTemplateColumns: `repeat(${timelineSlotCount}, minmax(0, 1fr))`,
            }}
          >
            {latencyTimelineSlots.map((latencyMs, index) => (
              <div
                key={`latency-timeline-slot-${index}`}
                className={`${latencyTimelineBarClass(latencyMs, rules)} w-full`}
                style={{ height: latencyTimelineBarHeight(latencyMs, latencyAxisMaxMs) }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[120%]">
            <span className="border border-current bg-black px-2 py-0.5 font-data text-[8px] tracking-[0.12em] text-[color:var(--terminal-rainbow-color)]">
              {Math.round(latencyAxisMaxMs)}ms
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[120%]">
            <span className="border border-current bg-black px-2 py-0.5 font-data text-[8px] tracking-[0.12em] text-[color:var(--terminal-rainbow-color)]">
              0ms
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start gap-1 text-[10px] text-white">
          <span>
            Filled: {filledLatencySlotCount}/{timelineSlotCount} | Thresholds: &lt;=
            {rules.telemetry.healthyLatencyMs}ms ok / &lt;={rules.telemetry.warnLatencyMs}ms warn
          </span>
          <span>
            Last: {formatMilliseconds(latestLatency)} | Avg: {formatMilliseconds(avgLatency)} |
            Peak: {formatMilliseconds(maxLatency)}
          </span>
        </div>
      </article>

      <div className="mt-4 grid gap-3">
        <article className="terminal-panel-soft p-4">
          <p className="font-data text-[10px] tracking-wider text-cyan-300/90">
            Recent Incidents
          </p>
          {mergedIncidents.length === 0 ? (
            <p className="mt-3 text-xs text-emerald-200">No quality incidents detected.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mergedIncidents.slice(0, 6).map((incident) => (
                <li
                  key={incident.id}
                  className="terminal-panel-soft flex flex-col items-start gap-3 p-3 text-[11px]"
                >
                  <div>
                    <p className="font-ui text-xs text-white">{incident.title}</p>
                    <p className="mt-1 text-white">{incident.detail}</p>
                  </div>
                  <span
                    className={`terminal-chip px-2 py-1 text-[10px] font-semibold ${severityBadgeClass(
                      incident.severity,
                    )}`}
                  >
                    {incident.severity.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
