import type { QualityRulePresetId } from "./quality-rules";

export type PipelineStage = {
  id: string;
  label: string;
  value: string;
};

export type VisualizationProject = {
  id: string;
  label: string;
  title: string;
  status: string;
  type: "live" | "quality" | "dummy";
  qualityRulePresetId?: QualityRulePresetId;
  summary: string;
  pipelineStages: PipelineStage[];
};

export const visualizationProjects: VisualizationProject[] = [
  {
    id: "btc-usdc-live",
    label: "Binance Live",
    title: "Binance BTCUSDC Candlestick Feed",
    status: "15m Interval",
    type: "live",
    summary:
      "Streams real-time 15m Binance klines with a fixed 200-candle viewport and EMA features.",
    pipelineStages: [
      {
        id: "source",
        label: "source",
        value: "REST seed (400 candles) + multiplex WebSocket stream (kline_15m + aggTrade)",
      },
      {
        id: "processing",
        label: "processing",
        value: "Dual rolling buffers (200 visible + 200 hidden), EMA50/EMA100/EMA200 feature engineering, plus CSV levels derived from 1,922 15m candles via a custom touch algorithm",
      },
      {
        id: "output",
        label: "output",
        value: "TradingView candlesticks with EMA overlays and fixed 200-candle viewport",
      },
    ],
  },
  {
    id: "data-quality-monitor-dummy",
    label: "Data Quality",
    title: "Realtime Data Quality Monitor",
    status: "Prototype",
    type: "quality",
    qualityRulePresetId: "default",
    summary:
      "Profiles feed reliability with aggTrade heartbeat intervals, latency, and OHLC integrity checks.",
    pipelineStages: [
      {
        id: "source",
        label: "source",
        value: "REST kline seed + multiplex WebSocket stream (kline_15m + aggTrade)",
      },
      {
        id: "processing",
        label: "processing",
        value: "aggTrade inter-arrival heartbeat + kline transport latency + quality scoring and OHLC integrity checks",
      },
      {
        id: "output",
        label: "output",
        value: "Quality and latency timelines with incidents for heartbeat degradation, stale packets, and structural gaps",
      },
    ],
  },
  {
    id: "stream-anomaly-dummy",
    label: "Anomaly Stream",
    title: "Streaming Anomaly Detection",
    status: "Coming Soon",
    type: "dummy",
    summary: "Placeholder project slot for future anomaly detection visuals.",
    pipelineStages: [
      { id: "source", label: "source", value: "TBD" },
      { id: "processing", label: "processing", value: "TBD" },
      { id: "output", label: "output", value: "TBD" },
    ],
  },
  {
    id: "batch-optimizer-dummy",
    label: "Batch Optimizer",
    title: "Batch Pipeline Optimizer",
    status: "Coming Soon",
    type: "dummy",
    summary: "Placeholder project slot for future batch optimization insights.",
    pipelineStages: [
      { id: "source", label: "source", value: "TBD" },
      { id: "processing", label: "processing", value: "TBD" },
      { id: "output", label: "output", value: "TBD" },
    ],
  },
];

export const defaultVisualizationProjectId = "btc-usdc-live";
