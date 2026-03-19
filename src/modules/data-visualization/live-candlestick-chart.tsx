"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  LineStyle,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import {
  BINANCE_INITIAL_LIMIT,
  type CandlePoint,
  type FeedState,
} from "./use-binance-kline-feed";

const VISIBLE_CANDLE_WINDOW = BINANCE_INITIAL_LIMIT;
const CHART_HEIGHT_PX = 640;
const PRICE_SCALE_TOP_MARGIN = 0.03;
const PRICE_SCALE_BOTTOM_MARGIN = 0.03;
const TIME_SCALE_BORDER_COMPENSATION_PX = 1;

type ChartApi = ReturnType<typeof createChart>;
type SeriesApi = ReturnType<ChartApi["addSeries"]>;
type PriceLineApi = ReturnType<SeriesApi["createPriceLine"]>;

type EmaPoint = {
  time: UTCTimestamp;
  value: number;
};

type CsvLevel = {
  id: string;
  rangeLow: number;
  rangeHigh: number;
  center: number;
  score: number;
  levelKind: string;
};

type ZoneOverlay = {
  id: string;
  topPx: number;
  heightPx: number;
};

type ZoneOverlayFrame = {
  rightPx: number;
  bottomPx: number;
};

type LiveCandlestickChartProps = {
  symbol: string;
  interval: string;
  feedState: FeedState;
  errorText: string;
  lastPrice: number | null;
  candles: CandlePoint[];
  secondaryCandles: CandlePoint[];
};

function computeEmaSeries(candles: CandlePoint[], period: number): EmaPoint[] {
  if (candles.length < period || period <= 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let rollingSum = 0;

  for (let index = 0; index < period; index += 1) {
    rollingSum += candles[index].close;
  }

  let emaValue = rollingSum / period;
  const points: EmaPoint[] = [
    {
      time: candles[period - 1].time,
      value: emaValue,
    },
  ];

  for (let index = period; index < candles.length; index += 1) {
    emaValue = candles[index].close * multiplier + emaValue * (1 - multiplier);
    points.push({
      time: candles[index].time,
      value: emaValue,
    });
  }

  return points;
}

function filterEmaByVisibleStart(
  points: EmaPoint[],
  visibleStart: UTCTimestamp | null,
): EmaPoint[] {
  if (visibleStart === null) {
    return [];
  }

  return points.filter((point) => point.time >= visibleStart);
}

function lockVisibleCandleWindow(chart: ChartApi, candles: CandlePoint[]): void {
  if (candles.length === 0) {
    return;
  }

  chart.timeScale().setVisibleRange({
    from: candles[0].time,
    to: candles[candles.length - 1].time,
  });
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

function feedStateClass(state: FeedState): string {
  if (state === "live") {
    return "bg-emerald-300/12";
  }

  if (state === "reconnecting") {
    return "bg-amber-300/12";
  }

  if (state === "error") {
    return "bg-rose-300/12";
  }

  return "bg-cyan-300/12";
}

export function LiveCandlestickChart({
  symbol,
  interval,
  feedState,
  errorText,
  lastPrice,
  candles,
  secondaryCandles,
}: LiveCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartApi | null>(null);
  const seriesRef = useRef<SeriesApi | null>(null);
  const ema50SeriesRef = useRef<SeriesApi | null>(null);
  const ema100SeriesRef = useRef<SeriesApi | null>(null);
  const ema200SeriesRef = useRef<SeriesApi | null>(null);
  const levelLinesRef = useRef<PriceLineApi[]>([]);
  const visibleCandlesRef = useRef<CandlePoint[]>([]);
  const clearLevelLinesRef = useRef<() => void>(() => {});
  const updateLevelRenderingRef = useRef<() => void>(() => {});
  const [csvLevels, setCsvLevels] = useState<CsvLevel[]>([]);
  const [zoneOverlays, setZoneOverlays] = useState<ZoneOverlay[]>([]);
  const [zoneOverlayFrame, setZoneOverlayFrame] = useState<ZoneOverlayFrame>({
    rightPx: 0,
    bottomPx: 0,
  });

  const featureCandles = useMemo(
    () => [...secondaryCandles, ...candles],
    [secondaryCandles, candles],
  );

  const visibleCandles = useMemo(
    () => candles.slice(-VISIBLE_CANDLE_WINDOW),
    [candles],
  );

  const visibleStartTime = visibleCandles[0]?.time ?? null;

  const ema50Data = useMemo(
    () => filterEmaByVisibleStart(computeEmaSeries(featureCandles, 50), visibleStartTime),
    [featureCandles, visibleStartTime],
  );

  const ema100Data = useMemo(
    () => filterEmaByVisibleStart(computeEmaSeries(featureCandles, 100), visibleStartTime),
    [featureCandles, visibleStartTime],
  );

  const ema200Data = useMemo(
    () => filterEmaByVisibleStart(computeEmaSeries(featureCandles, 200), visibleStartTime),
    [featureCandles, visibleStartTime],
  );

  const subtitle = useMemo(
    () => `${symbol} · ${interval} · ${VISIBLE_CANDLE_WINDOW} visible candles`,
    [interval, symbol],
  );

  useEffect(() => {
    let isActive = true;

    const loadLevels = async () => {
      try {
        const response = await fetch("/api/levels", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { levels?: CsvLevel[] };
        if (!isActive || !Array.isArray(payload.levels)) {
          return;
        }

        const filteredLevels = payload.levels.filter((level) => {
          return (
            Number.isFinite(level.rangeLow) &&
            Number.isFinite(level.rangeHigh) &&
            Number.isFinite(level.center)
          );
        });

        setCsvLevels(filteredLevels);
      } catch {
        if (isActive) {
          setCsvLevels([]);
        }
      }
    };

    loadLevels();

    return () => {
      isActive = false;
    };
  }, []);

  const clearLevelLines = useCallback(() => {
    if (!seriesRef.current || levelLinesRef.current.length === 0) {
      return;
    }

    for (const line of levelLinesRef.current) {
      seriesRef.current.removePriceLine(line);
    }

    levelLinesRef.current = [];
  }, []);

  const updateLevelRendering = useCallback(() => {
    clearLevelLines();

    if (
      !seriesRef.current ||
      !chartRef.current ||
      !chartContainerRef.current ||
      csvLevels.length === 0
    ) {
      setZoneOverlays([]);
      return;
    }

    const priceScaleWidthPx = Math.max(0, seriesRef.current.priceScale().width());
    const timeScaleHeightPx = Math.max(0, chartRef.current.timeScale().height());
    const zoneBottomInsetPx = Math.max(
      0,
      timeScaleHeightPx - TIME_SCALE_BORDER_COMPENSATION_PX,
    );

    setZoneOverlayFrame((current) => {
      if (
        current.rightPx === priceScaleWidthPx &&
        current.bottomPx === zoneBottomInsetPx
      ) {
        return current;
      }

      return {
        rightPx: priceScaleWidthPx,
        bottomPx: zoneBottomInsetPx,
      };
    });

    const visiblePriceRange = seriesRef.current.priceScale().getVisibleRange();
    if (!visiblePriceRange) {
      setZoneOverlays([]);
      return;
    }

    const minPrice = Math.min(visiblePriceRange.from, visiblePriceRange.to);
    const maxPrice = Math.max(visiblePriceRange.from, visiblePriceRange.to);
    if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || maxPrice <= minPrice) {
      setZoneOverlays([]);
      return;
    }

    const plotHeightPx = Math.max(
      1,
      chartContainerRef.current.clientHeight - zoneBottomInsetPx,
    );
    const nextZones: ZoneOverlay[] = [];

    for (const level of csvLevels) {
      const centerInVisibleRange =
        level.center >= minPrice && level.center <= maxPrice;

      if (centerInVisibleRange) {
        const priceLine = seriesRef.current.createPriceLine({
          price: level.center,
          color: "rgba(255, 255, 255, 0.72)",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        levelLinesRef.current.push(priceLine);
      }

      const intersectsVisibleScale =
        level.rangeHigh >= minPrice && level.rangeLow <= maxPrice;
      if (!intersectsVisibleScale) {
        continue;
      }

      const topCoordinate = seriesRef.current.priceToCoordinate(level.rangeHigh);
      const bottomCoordinate = seriesRef.current.priceToCoordinate(level.rangeLow);

      const zoneTopPx =
        topCoordinate !== null
          ? topCoordinate
          : level.rangeHigh > maxPrice
            ? 0
            : level.rangeHigh < minPrice
              ? plotHeightPx
              : null;

      const zoneBottomPx =
        bottomCoordinate !== null
          ? bottomCoordinate
          : level.rangeLow < minPrice
            ? plotHeightPx
            : level.rangeLow > maxPrice
              ? 0
              : null;

      if (zoneTopPx === null || zoneBottomPx === null) {
        continue;
      }

      const normalizedTop = Math.min(zoneTopPx, zoneBottomPx);
      const normalizedBottom = Math.max(zoneTopPx, zoneBottomPx);
      const clampedTop = Math.max(0, Math.min(plotHeightPx, normalizedTop));
      const clampedBottom = Math.max(0, Math.min(plotHeightPx, normalizedBottom));
      const zoneHeightPx = Math.max(1, clampedBottom - clampedTop);

      nextZones.push({
        id: level.id,
        topPx: clampedTop,
        heightPx: zoneHeightPx,
      });
    }

    setZoneOverlays(nextZones);
  }, [clearLevelLines, csvLevels]);

  useEffect(() => {
    clearLevelLinesRef.current = clearLevelLines;
    updateLevelRenderingRef.current = updateLevelRendering;
  }, [clearLevelLines, updateLevelRendering]);

  useEffect(() => {
    updateLevelRendering();
  }, [updateLevelRendering]);

  useEffect(() => {
    visibleCandlesRef.current = visibleCandles;
  }, [visibleCandles]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 280),
      height: CHART_HEIGHT_PX,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "transparent",
        },
        textColor: "#f5f5f5",
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: "rgba(255, 255, 255, 0.08)",
        },
        horzLines: {
          color: "rgba(255, 255, 255, 0.08)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.2)",
        scaleMargins: {
          top: PRICE_SCALE_TOP_MARGIN,
          bottom: PRICE_SCALE_BOTTOM_MARGIN,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.2)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      crosshair: {
        vertLine: {
          color: "rgba(103, 232, 249, 0.45)",
          width: 1,
        },
        horzLine: {
          color: "rgba(103, 232, 249, 0.45)",
          width: 1,
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: false,
          price: false,
        },
        mouseWheel: false,
        pinch: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#4ade80",
      downColor: "#f87171",
      borderUpColor: "#4ade80",
      borderDownColor: "#f87171",
      wickUpColor: "#4ade80",
      wickDownColor: "#f87171",
      priceLineColor: "#67e8f9",
      lastValueVisible: true,
    });

    const ema50Series = chart.addSeries(LineSeries, {
      color: "#fbbf24",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema100Series = chart.addSeries(LineSeries, {
      color: "#67e8f9",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema200Series = chart.addSeries(LineSeries, {
      color: "#a3e635",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    ema50SeriesRef.current = ema50Series;
    ema100SeriesRef.current = ema100Series;
    ema200SeriesRef.current = ema200Series;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !chartRef.current) {
        return;
      }

      chartRef.current.applyOptions({
        width: Math.max(entry.contentRect.width, 280),
      });

      lockVisibleCandleWindow(chartRef.current, visibleCandlesRef.current);
      updateLevelRenderingRef.current();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      clearLevelLinesRef.current();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      ema50SeriesRef.current = null;
      ema100SeriesRef.current = null;
      ema200SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !seriesRef.current ||
      !ema50SeriesRef.current ||
      !ema100SeriesRef.current ||
      !ema200SeriesRef.current ||
      !chartRef.current ||
      visibleCandles.length === 0
    ) {
      return;
    }

    seriesRef.current.setData(visibleCandles);
    ema50SeriesRef.current.setData(ema50Data);
    ema100SeriesRef.current.setData(ema100Data);
    ema200SeriesRef.current.setData(ema200Data);
    lockVisibleCandleWindow(chartRef.current, visibleCandles);
    updateLevelRendering();
  }, [visibleCandles, ema50Data, ema100Data, ema200Data, updateLevelRendering]);

  return (
    <div className="terminal-panel-soft terminal-panel-outer-triple-shadow p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-xs text-white">{subtitle}</p>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          <div
            className={`terminal-chip font-ui px-3 py-1 text-xs text-white ${feedStateClass(feedState)}`}
          >
            {feedStateLabel(feedState)}
          </div>

          <div className="font-ui flex flex-wrap items-center justify-end gap-2 text-[10px] text-white">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[4px] w-5 rounded-full bg-[#fbbf24]" />
              EMA50
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[4px] w-5 rounded-full bg-[#67e8f9]" />
              EMA100
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[4px] w-5 rounded-full bg-[#a3e635]" />
              EMA200
            </span>
          </div>
        </div>
      </div>

      <div className="relative h-[640px] w-full">
        <div ref={chartContainerRef} className="h-[640px] w-full" />

        <div
          className="pointer-events-none absolute left-0 top-0 overflow-hidden"
          style={{
            right: `${zoneOverlayFrame.rightPx}px`,
            bottom: `${zoneOverlayFrame.bottomPx}px`,
          }}
        >
          {zoneOverlays.map((zone) => (
            <div
              key={zone.id}
              className="absolute left-0 right-0 border border-white/25 bg-white/10"
              style={{
                top: `${zone.topPx}px`,
                height: `${zone.heightPx}px`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-start gap-2 text-xs text-white">
        <p>{errorText || "Connected to shared Binance feed."}</p>
        <p className="font-ui text-cyan-200">
          Last: {lastPrice !== null ? lastPrice.toFixed(4) : "--"}
        </p>
        <p className="font-ui text-white/85">
          Features: EMA50 / EMA100 / EMA200 (using 400-candle rolling context)
        </p>
      </div>
    </div>
  );
}
