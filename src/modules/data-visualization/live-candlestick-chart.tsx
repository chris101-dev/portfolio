"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import type { CandlePoint, FeedState } from "./use-binance-kline-feed";

const VISIBLE_CANDLE_WINDOW = 60;

type ChartApi = ReturnType<typeof createChart>;
type CandlestickSeriesApi = ReturnType<ChartApi["addSeries"]>;

type LiveCandlestickChartProps = {
  symbol: string;
  interval: string;
  feedState: FeedState;
  errorText: string;
  lastPrice: number | null;
  candles: CandlePoint[];
};

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
}: LiveCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartApi | null>(null);
  const seriesRef = useRef<CandlestickSeriesApi | null>(null);
  const visibleCandlesRef = useRef<CandlePoint[]>([]);

  const visibleCandles = useMemo(
    () => candles.slice(-VISIBLE_CANDLE_WINDOW),
    [candles],
  );

  const subtitle = useMemo(
    () => `${symbol} · ${interval} · ${VISIBLE_CANDLE_WINDOW} visible candles`,
    [interval, symbol],
  );

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
      height: 320,
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

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !chartRef.current) {
        return;
      }

      chartRef.current.applyOptions({
        width: Math.max(entry.contentRect.width, 280),
      });

      lockVisibleCandleWindow(chartRef.current, visibleCandlesRef.current);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || visibleCandles.length === 0) {
      return;
    }

    seriesRef.current.setData(visibleCandles);
    lockVisibleCandleWindow(chartRef.current, visibleCandles);
  }, [visibleCandles]);

  return (
    <div className="terminal-panel-soft terminal-panel-outer-triple-shadow p-5">
      <div className="mb-4 flex flex-col items-start gap-3">
        <p className="font-ui text-xs text-white">{subtitle}</p>
        <div
          className={`terminal-chip font-ui px-3 py-1 text-xs text-white ${feedStateClass(feedState)}`}
        >
          {feedStateLabel(feedState)}
        </div>
      </div>

      <div ref={chartContainerRef} className="h-[320px] w-full" />

      <div className="mt-4 flex flex-col items-start gap-2 text-xs text-white">
        <p>{errorText || "Connected to shared Binance feed."}</p>
        <p className="font-ui text-cyan-200">
          Last: {lastPrice !== null ? lastPrice.toFixed(4) : "--"}
        </p>
      </div>
    </div>
  );
}
