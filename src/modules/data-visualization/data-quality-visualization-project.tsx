"use client";

import { useMemo } from "react";
import type { QualityScoringRules } from "./quality-rules";
import type { CandlePoint, FeedState } from "./use-binance-kline-feed";

type DataQualityVisualizationProjectProps = {
  symbol: string;
  interval: string;
  feedState: FeedState;
  candles: CandlePoint[];
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
  freshnessSeconds: number | null;
  missingIntervals: number;
  duplicateTimestamps: number;
  invalidOhlcRows: number;
  qualityScore: number;
  checks: QualityCheck[];
  incidents: QualityIncident[];
  timeline: QualityTimelinePoint[];
};

function formatElapsed(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) {
    return "--";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
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
  freshnessSeconds: number | null,
  rules: QualityScoringRules,
): SeverityLevel {
  if (freshnessSeconds === null) {
    return "error";
  }

  if (freshnessSeconds <= rules.freshness.passLimitSeconds) {
    return "info";
  }

  if (freshnessSeconds <= rules.freshness.warnLimitSeconds) {
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
  rules: QualityScoringRules,
): QualityMetrics {
  if (candles.length === 0) {
    return {
      sampleSize: 0,
      freshnessSeconds: null,
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
  const nowSeconds = Math.floor(Date.now() / 1000);
  const freshnessSeconds = Math.max(
    0,
    nowSeconds - Number(sorted[sorted.length - 1].time),
  );

  const overallWindow = evaluateQualityWindow(sorted, freshnessSeconds, rules);

  const freshnessLevel = freshnessSeverity(freshnessSeconds, rules);
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
      passed: freshnessSeconds <= rules.freshness.passLimitSeconds,
      detail: `Current lag: ${formatElapsed(freshnessSeconds)}`,
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
    freshnessSeconds,
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
  if (score >= 90) {
    return "text-emerald-300";
  }

  if (score >= 70) {
    return "text-amber-300";
  }

  return "text-rose-300";
}

function severityBadgeClass(severity: SeverityLevel): string {
  if (severity === "info") {
    return "border-emerald-300/60 bg-emerald-300/10 text-emerald-200";
  }

  if (severity === "warn") {
    return "border-amber-300/60 bg-amber-300/10 text-amber-200";
  }

  return "border-rose-300/60 bg-rose-300/10 text-rose-200";
}

function timelineBarClass(score: number | null): string {
  if (score === null) {
    return "bg-white/25";
  }

  if (score >= 90) {
    return "bg-emerald-300/95";
  }

  if (score >= 70) {
    return "bg-amber-300/95";
  }

  return "bg-rose-300/95";
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

export function DataQualityVisualizationProject({
  symbol,
  interval,
  feedState,
  candles,
  rules,
}: DataQualityVisualizationProjectProps) {
  const metrics = useMemo(() => evaluateQuality(candles, rules), [candles, rules]);

  const timelineSlotCount = Math.max(1, rules.timelineSlotCount);

  const timelineSlots = useMemo(
    () => buildTimelineSlots(metrics.timeline, timelineSlotCount),
    [metrics.timeline, timelineSlotCount],
  );

  const filledTimelineSlotCount = useMemo(
    () => timelineSlots.filter((score) => score !== null).length,
    [timelineSlots],
  );

  return (
    <div className="terminal-panel-soft py-5">
      <div className="mb-4 flex flex-col items-start gap-3 px-5">
        <p className="font-ui text-xs text-white/70">
          {symbol} · {interval} · shared feed quality checks
        </p>
        <div className="terminal-chip font-ui px-3 py-1 text-xs text-white">
          {feedStateLabel(feedState)}
        </div>
      </div>

      <div className="grid gap-3 px-5">
        <article className="terminal-panel-soft px-4 py-3">
          <p className="font-data text-[10px] tracking-wider text-white/55">quality score</p>
          <p
            className={`mt-2 font-ui text-2xl font-semibold ${qualityScoreColor(
              metrics.qualityScore,
            )}`}
          >
            {metrics.qualityScore}
          </p>
        </article>

        <article className="terminal-panel-soft px-4 py-3">
          <p className="font-data text-[10px] tracking-wider text-white/55">freshness lag</p>
          <p className="mt-2 font-ui text-2xl font-semibold text-white">
            {formatElapsed(metrics.freshnessSeconds)}
          </p>
        </article>

        <article className="terminal-panel-soft px-4 py-3">
          <p className="font-data text-[10px] tracking-wider text-white/55">missing intervals</p>
          <p className="mt-2 font-ui text-2xl font-semibold text-white">
            {metrics.missingIntervals}
          </p>
        </article>

        <article className="terminal-panel-soft px-4 py-3">
          <p className="font-data text-[10px] tracking-wider text-white/55">sample size</p>
          <p className="mt-2 font-ui text-2xl font-semibold text-white">
            {metrics.sampleSize}
          </p>
        </article>
      </div>

      <article className="terminal-panel-soft mx-5 mt-4 px-4 py-4">
        <p className="font-data text-[10px] tracking-wider text-cyan-300/90">
          Rolling Quality Score Timeline
        </p>

        <div className="mt-3 border border-white/15 bg-black/45 p-2">
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
        </div>

        <div className="mt-2 flex flex-col items-start gap-1 text-[10px] text-white/55">
          <span>Oldest</span>
          <span>
            Filled: {filledTimelineSlotCount}/{timelineSlotCount} | Window: {rules.rollingWindowSize}
          </span>
          <span>Latest</span>
        </div>
      </article>

      <div className="mt-4 grid gap-3 px-5">
        <article className="terminal-panel-soft px-4 py-4">
          <p className="font-data text-[10px] tracking-wider text-cyan-300/90">Check Matrix</p>
          <ul className="mt-3 space-y-2">
            {metrics.checks.map((check) => (
              <li
                key={check.id}
                className="terminal-panel-soft flex flex-col items-start gap-3 px-3 py-2"
              >
                <div>
                  <p className="font-ui text-xs text-white">{check.label}</p>
                  <p className="mt-1 text-[11px] text-white/60">{check.detail}</p>
                </div>
                <span
                  className={`terminal-chip px-2 py-1 text-[10px] font-semibold ${
                    check.passed
                      ? "border-emerald-300/60 bg-emerald-300/10 text-emerald-200"
                      : severityBadgeClass(check.severity)
                  }`}
                >
                  {check.passed ? "PASS" : check.severity.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="terminal-panel-soft px-4 py-4">
          <p className="font-data text-[10px] tracking-wider text-cyan-300/90">
            Recent Incidents
          </p>
          {metrics.incidents.length === 0 ? (
            <p className="mt-3 text-xs text-emerald-200">No quality incidents detected.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {metrics.incidents.slice(0, 6).map((incident) => (
                <li
                  key={incident.id}
                  className="terminal-panel-soft flex flex-col items-start gap-3 px-3 py-2 text-[11px]"
                >
                  <div>
                    <p className="font-ui text-xs text-white">{incident.title}</p>
                    <p className="mt-1 text-white/65">{incident.detail}</p>
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
