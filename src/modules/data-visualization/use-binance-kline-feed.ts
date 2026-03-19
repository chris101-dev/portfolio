"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UTCTimestamp } from "lightweight-charts";

export const BINANCE_SYMBOL = "BTCUSDC";
export const BINANCE_INTERVAL = "15m";
export const BINANCE_INITIAL_LIMIT = 200;

// Keep two rolling windows: 200 visible candles + 200 hidden feature candles.
const PRIMARY_BUFFER_CANDLES = BINANCE_INITIAL_LIMIT;
const SECONDARY_BUFFER_CANDLES = 200;
const TOTAL_BUFFER_CANDLES =
  PRIMARY_BUFFER_CANDLES + SECONDARY_BUFFER_CANDLES;
const REST_ENDPOINT = `https://api.binance.com/api/v3/klines?symbol=${BINANCE_SYMBOL}&interval=${BINANCE_INTERVAL}&limit=${TOTAL_BUFFER_CANDLES}`;
const STREAM_SYMBOL = BINANCE_SYMBOL.toLowerCase();
const WS_ENDPOINT = `wss://stream.binance.com:9443/stream?streams=${STREAM_SYMBOL}@kline_${BINANCE_INTERVAL}/${STREAM_SYMBOL}@aggTrade`;
const MAX_TELEMETRY_POINTS = BINANCE_INITIAL_LIMIT;
const MAX_HEARTBEAT_POINTS = 300;
const HEARTBEAT_AVERAGE_WINDOW_MS = 60_000;
const TELEMETRY_EMIT_INTERVAL_MS = 250;

export type FeedState = "loading" | "live" | "reconnecting" | "error";

type RestKlineEntry = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type KlineStreamPayload = {
  e?: "kline";
  E?: number;
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
  };
};

type AggTradeStreamPayload = {
  e?: "aggTrade";
  E?: number;
};

type StreamPayload = KlineStreamPayload | AggTradeStreamPayload;

type StreamMessageEnvelope = {
  stream?: string;
  data?: StreamPayload;
};

type HeartbeatSample = {
  arrivalTimeMs: number;
  interArrivalMs: number;
};

export type CandlePoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type FeedTelemetryPoint = {
  arrivalTimeMs: number;
  ingestionLatencyMs: number | null;
  interArrivalMs: number | null;
};

export type FeedTelemetry = {
  lastArrivalTimestampMs: number | null;
  lastIngestionLatencyMs: number | null;
  averageIngestionLatencyMs: number | null;
  maxIngestionLatencyMs: number | null;
  lastInterArrivalMs: number | null;
  averageInterArrivalMs: number | null;
  lastKlineInterArrivalMs: number | null;
  lastAggTradeInterArrivalMs: number | null;
  oneMinuteAggTradeInterArrivalMs: number | null;
  timeline: FeedTelemetryPoint[];
};

const INITIAL_FEED_TELEMETRY: FeedTelemetry = {
  lastArrivalTimestampMs: null,
  lastIngestionLatencyMs: null,
  averageIngestionLatencyMs: null,
  maxIngestionLatencyMs: null,
  lastInterArrivalMs: null,
  averageInterArrivalMs: null,
  lastKlineInterArrivalMs: null,
  lastAggTradeInterArrivalMs: null,
  oneMinuteAggTradeInterArrivalMs: null,
  timeline: [],
};

function toCandlePoint(
  openTimeMs: number,
  open: string,
  high: string,
  low: string,
  close: string,
): CandlePoint {
  return {
    time: Math.floor(openTimeMs / 1000) as UTCTimestamp,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
  };
}

function trimTotalBuffer(candles: CandlePoint[]): CandlePoint[] {
  if (candles.length <= TOTAL_BUFFER_CANDLES) {
    return candles;
  }

  return candles.slice(candles.length - TOTAL_BUFFER_CANDLES);
}

function splitRollingBuffers(candles: CandlePoint[]): {
  primaryBuffer: CandlePoint[];
  secondaryBuffer: CandlePoint[];
} {
  if (candles.length === 0) {
    return {
      primaryBuffer: [],
      secondaryBuffer: [],
    };
  }

  const primaryStartIndex = Math.max(0, candles.length - PRIMARY_BUFFER_CANDLES);
  const secondaryStartIndex = Math.max(
    0,
    primaryStartIndex - SECONDARY_BUFFER_CANDLES,
  );

  return {
    primaryBuffer: candles.slice(primaryStartIndex),
    secondaryBuffer: candles.slice(secondaryStartIndex, primaryStartIndex),
  };
}

function trimTelemetry(points: FeedTelemetryPoint[]): FeedTelemetryPoint[] {
  if (points.length <= MAX_TELEMETRY_POINTS) {
    return points;
  }

  return points.slice(points.length - MAX_TELEMETRY_POINTS);
}

function trimHeartbeat(
  points: HeartbeatSample[],
  nowMs: number,
): HeartbeatSample[] {
  const minArrivalTimeMs = nowMs - HEARTBEAT_AVERAGE_WINDOW_MS;
  const withinWindow = points.filter(
    (sample) => sample.arrivalTimeMs >= minArrivalTimeMs,
  );

  if (withinWindow.length <= MAX_HEARTBEAT_POINTS) {
    return withinWindow;
  }

  return withinWindow.slice(withinWindow.length - MAX_HEARTBEAT_POINTS);
}

function average(values: Array<number | null>): number | null {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) {
    return null;
  }

  const sum = validValues.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / validValues.length);
}

function maxValue(values: Array<number | null>): number | null {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) {
    return null;
  }

  return Math.max(...validValues);
}

function toFeedTelemetry(
  points: FeedTelemetryPoint[],
  heartbeatSamples: HeartbeatSample[],
  lastKlineInterArrivalMs: number | null,
  lastAggTradeInterArrivalMs: number | null,
  lastArrivalTimestampMs: number | null,
): FeedTelemetry {
  const lastPoint = points[points.length - 1] ?? null;
  const ingestionSeries = points.map((point) => point.ingestionLatencyMs);
  const heartbeatSeries = heartbeatSamples.map((sample) => sample.interArrivalMs);
  const oneMinuteAggTradeInterArrivalMs = average(heartbeatSeries);

  return {
    lastArrivalTimestampMs,
    lastIngestionLatencyMs: lastPoint?.ingestionLatencyMs ?? null,
    averageIngestionLatencyMs: average(ingestionSeries),
    maxIngestionLatencyMs: maxValue(ingestionSeries),
    lastInterArrivalMs: lastAggTradeInterArrivalMs,
    averageInterArrivalMs: oneMinuteAggTradeInterArrivalMs,
    lastKlineInterArrivalMs,
    lastAggTradeInterArrivalMs,
    oneMinuteAggTradeInterArrivalMs,
    timeline: points,
  };
}

function extractPayload(
  message: StreamPayload | StreamMessageEnvelope,
): StreamPayload | null {
  if ("data" in message || "stream" in message) {
    return message.data ?? null;
  }

  return message as StreamPayload;
}

function mergeIncomingCandle(
  current: CandlePoint[],
  incoming: CandlePoint,
): CandlePoint[] {
  if (current.length === 0) {
    return [incoming];
  }

  const last = current[current.length - 1];
  if (last.time === incoming.time) {
    return [...current.slice(0, -1), incoming];
  }

  return trimTotalBuffer([...current, incoming]);
}

export function useBinanceKlineFeed() {
  const candleCacheRef = useRef<CandlePoint[]>([]);
  const telemetryCacheRef = useRef<FeedTelemetryPoint[]>([]);
  const heartbeatCacheRef = useRef<HeartbeatSample[]>([]);
  const lastEventArrivalTimestampRef = useRef<number | null>(null);
  const lastKlineArrivalTimestampRef = useRef<number | null>(null);
  const lastAggTradeArrivalTimestampRef = useRef<number | null>(null);
  const lastKlineInterArrivalMsRef = useRef<number | null>(null);
  const lastAggTradeInterArrivalMsRef = useRef<number | null>(null);
  const lastTelemetryEmitTimestampRef = useRef<number>(0);

  const [feedState, setFeedState] = useState<FeedState>("loading");
  const [errorText, setErrorText] = useState<string>("");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<CandlePoint[]>([]);
  const [secondaryCandles, setSecondaryCandles] = useState<CandlePoint[]>([]);
  const [telemetry, setTelemetry] = useState<FeedTelemetry>(INITIAL_FEED_TELEMETRY);

  const subtitle = useMemo(
    () => `${BINANCE_SYMBOL} | ${BINANCE_INTERVAL} | shared feed`,
    [],
  );

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;
    const abortController = new AbortController();

    const applyCandles = (nextCandles: CandlePoint[]) => {
      const buffered = trimTotalBuffer(nextCandles);
      candleCacheRef.current = buffered;

      const { primaryBuffer, secondaryBuffer } = splitRollingBuffers(buffered);
      setCandles(primaryBuffer);
      setSecondaryCandles(secondaryBuffer);

      if (primaryBuffer.length > 0) {
        setLastPrice(primaryBuffer[primaryBuffer.length - 1].close);
      }
    };

    // aggTrade can be very high-frequency; throttle React state commits.
    const emitTelemetry = (force = false) => {
      const nowMs = Date.now();
      if (
        !force &&
        nowMs - lastTelemetryEmitTimestampRef.current < TELEMETRY_EMIT_INTERVAL_MS
      ) {
        return;
      }

      const trimmedHeartbeatSamples = trimHeartbeat(heartbeatCacheRef.current, nowMs);
      heartbeatCacheRef.current = trimmedHeartbeatSamples;

      lastTelemetryEmitTimestampRef.current = nowMs;
      setTelemetry(
        toFeedTelemetry(
          telemetryCacheRef.current,
          trimmedHeartbeatSamples,
          lastKlineInterArrivalMsRef.current,
          lastAggTradeInterArrivalMsRef.current,
          lastEventArrivalTimestampRef.current,
        ),
      );
    };

    const applyLatencyTelemetry = (
      arrivalTimeMs: number,
      ingestionLatencyMs: number | null,
      klineInterArrivalMs: number | null,
    ) => {
      const nextTimeline = trimTelemetry([
        ...telemetryCacheRef.current,
        {
          arrivalTimeMs,
          ingestionLatencyMs,
          interArrivalMs: klineInterArrivalMs,
        },
      ]);

      telemetryCacheRef.current = nextTimeline;
      emitTelemetry(true);
    };

    const applyHeartbeatTelemetry = (arrivalTimeMs: number) => {
      if (lastAggTradeArrivalTimestampRef.current !== null) {
        const interArrivalMs = Math.max(
          0,
          arrivalTimeMs - lastAggTradeArrivalTimestampRef.current,
        );

        lastAggTradeInterArrivalMsRef.current = interArrivalMs;
        heartbeatCacheRef.current = trimHeartbeat([
          ...heartbeatCacheRef.current,
          {
            arrivalTimeMs,
            interArrivalMs,
          },
        ], arrivalTimeMs);
      }

      lastAggTradeArrivalTimestampRef.current = arrivalTimeMs;
      emitTelemetry();
    };

    const connectWebSocket = () => {
      if (!isActive) {
        return;
      }

      socket = new WebSocket(WS_ENDPOINT);

      socket.onopen = () => {
        if (!isActive) {
          return;
        }

        setFeedState("live");
        setErrorText("");
      };

      socket.onmessage = (event) => {
        if (!isActive) {
          return;
        }

        let rawMessage: StreamPayload | StreamMessageEnvelope;
        try {
          rawMessage = JSON.parse(event.data) as StreamPayload | StreamMessageEnvelope;
        } catch {
          return;
        }

        const payload = extractPayload(rawMessage);
        if (!payload || typeof payload.e !== "string") {
          return;
        }

        const nowMs = Date.now();
        lastEventArrivalTimestampRef.current = nowMs;

        if (payload.e === "aggTrade") {
          applyHeartbeatTelemetry(nowMs);
          return;
        }

        if (payload.e !== "kline" || !payload.k) {
          return;
        }

        const klineInterArrivalMs =
          lastKlineArrivalTimestampRef.current === null
            ? null
            : Math.max(0, nowMs - lastKlineArrivalTimestampRef.current);
        lastKlineArrivalTimestampRef.current = nowMs;
        if (klineInterArrivalMs !== null) {
          lastKlineInterArrivalMsRef.current = klineInterArrivalMs;
        }

        const ingestionLatencyMs =
          typeof payload.E === "number" ? Math.max(0, nowMs - payload.E) : null;
        applyLatencyTelemetry(nowMs, ingestionLatencyMs, klineInterArrivalMs);

        const nextCandle = toCandlePoint(
          payload.k.t,
          payload.k.o,
          payload.k.h,
          payload.k.l,
          payload.k.c,
        );

        const merged = mergeIncomingCandle(candleCacheRef.current, nextCandle);
        applyCandles(merged);
      };

      socket.onerror = () => {
        if (!isActive) {
          return;
        }

        setFeedState("error");
        setErrorText("WebSocket stream failed. Attempting to reconnect.");
      };

      socket.onclose = () => {
        if (!isActive) {
          return;
        }

        setFeedState("reconnecting");
        reconnectTimer = setTimeout(() => {
          connectWebSocket();
        }, 1800);
      };
    };

    const loadInitialCandles = async () => {
      try {
        setFeedState("loading");
        setErrorText("");

        const response = await fetch(REST_ENDPOINT, {
          signal: abortController.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`REST seed request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as RestKlineEntry[];
        const initialCandles = payload.map((entry) =>
          toCandlePoint(entry[0], entry[1], entry[2], entry[3], entry[4]),
        );

        applyCandles(initialCandles);
        setFeedState("live");
        connectWebSocket();
      } catch (error) {
        if (!isActive || abortController.signal.aborted) {
          return;
        }

        setFeedState("error");
        setErrorText(
          error instanceof Error ? error.message : "Unknown REST seed error.",
        );
      }
    };

    loadInitialCandles();

    return () => {
      isActive = false;
      abortController.abort();

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (socket) {
        socket.close();
      }
    };
  }, []);

  return {
    symbol: BINANCE_SYMBOL,
    interval: BINANCE_INTERVAL,
    initialLimit: BINANCE_INITIAL_LIMIT,
    subtitle,
    feedState,
    errorText,
    lastPrice,
    candles,
    secondaryCandles,
    telemetry,
  };
}
