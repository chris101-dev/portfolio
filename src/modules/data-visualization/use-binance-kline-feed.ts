"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UTCTimestamp } from "lightweight-charts";

export const BINANCE_SYMBOL = "BTCUSDC";
export const BINANCE_INTERVAL = "1m";
export const BINANCE_INITIAL_LIMIT = 60;

// Keep a strict rolling window: 59 closed candles + the current active candle.
const MAX_BUFFER_CANDLES = BINANCE_INITIAL_LIMIT;
const REST_ENDPOINT = `https://api.binance.com/api/v3/klines?symbol=${BINANCE_SYMBOL}&interval=${BINANCE_INTERVAL}&limit=${BINANCE_INITIAL_LIMIT}`;
const WS_ENDPOINT = `wss://stream.binance.com:9443/ws/${BINANCE_SYMBOL.toLowerCase()}@kline_${BINANCE_INTERVAL}`;

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

type StreamMessage = {
  e?: string;
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
  };
};

export type CandlePoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
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

function trimBuffer(candles: CandlePoint[]): CandlePoint[] {
  if (candles.length <= MAX_BUFFER_CANDLES) {
    return candles;
  }

  return candles.slice(candles.length - MAX_BUFFER_CANDLES);
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

  return trimBuffer([...current, incoming]);
}

export function useBinanceKlineFeed() {
  const candleCacheRef = useRef<CandlePoint[]>([]);

  const [feedState, setFeedState] = useState<FeedState>("loading");
  const [errorText, setErrorText] = useState<string>("");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<CandlePoint[]>([]);

  const subtitle = useMemo(
    () => `${BINANCE_SYMBOL} · ${BINANCE_INTERVAL} · shared feed`,
    [],
  );

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;
    const abortController = new AbortController();

    const applyCandles = (nextCandles: CandlePoint[]) => {
      const buffered = trimBuffer(nextCandles);
      candleCacheRef.current = buffered;
      setCandles(buffered);

      if (buffered.length > 0) {
        setLastPrice(buffered[buffered.length - 1].close);
      }
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

        const message = JSON.parse(event.data) as StreamMessage;
        if (message.e !== "kline" || !message.k) {
          return;
        }

        const nextCandle = toCandlePoint(
          message.k.t,
          message.k.o,
          message.k.h,
          message.k.l,
          message.k.c,
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
  };
}
