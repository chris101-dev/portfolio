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
    status: "1m Interval",
    type: "live",
    summary: "Streams real-time Binance klines with a fixed 60-candle window.",
    pipelineStages: [
      { id: "source", label: "source", value: "WebSocket + REST API" },
      {
        id: "processing",
        label: "processing",
        value: "Normalization + OHLC mapping for Lightweight Charts",
      },
      {
        id: "output",
        label: "output",
        value: "TradingView Lightweight Charts",
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
      "Profiles feed reliability with freshness, null-rate, duplicate, and range checks.",
    pipelineStages: [
      {
        id: "source",
        label: "source",
        value: "Binance REST seed + WebSocket stream",
      },
      {
        id: "processing",
        label: "processing",
        value: "Freshness, null-rate, duplicate-key, and OHLC range checks",
      },
      {
        id: "output",
        label: "output",
        value: "Quality score timeline + anomaly flags",
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
