import type { CSSProperties } from "react";

export interface LivelinePoint {
  /** unix seconds */
  time: number;
  value: number;
}

export type Momentum = "up" | "down" | "flat";
export type ThemeMode = "light" | "dark";
export type WindowStyle = "default" | "rounded" | "text";
export type BadgeVariant = "default" | "minimal";

export interface ReferenceLine {
  value: number;
  label?: string;
}

export interface HoverPoint {
  time: number;
  value: number;
  x: number;
  y: number;
}

export interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface WindowOption {
  label: string;
  secs: number;
}

export interface OrderbookData {
  /** [price, size][] */
  bids: [number, number][];
  /** [price, size][] */
  asks: [number, number][];
}

export interface DegenOptions {
  /** Multiplier for particle count and size (default 1) */
  scale?: number;
  /** Show particles on down-momentum swings (default false) */
  downMomentum?: boolean;
}

export interface LivelineSeries {
  id: string;
  data: LivelinePoint[];
  value: number;
  color: string;
  label?: string;
}

export interface LivelineProps {
  data: LivelinePoint[];
  value: number;

  // Multi-series mode — when provided, overrides data/value/color
  series?: LivelineSeries[];

  // Appearance
  theme?: ThemeMode;
  color?: string;

  // Time
  window?: number;

  // Feature flags
  grid?: boolean;
  badge?: boolean;
  momentum?: boolean | Momentum;
  fill?: boolean;
  /** Show loading animation — breathing line (default: false) */
  loading?: boolean;
  /** Pause chart scrolling (default: false) */
  paused?: boolean;
  /** Text shown in the empty state (default: 'No data to display') */
  emptyText?: string;
  /** Enable crosshair scrubbing on hover (default: true) */
  scrub?: boolean;
  /** Tight Y-axis range — small moves fill chart height (default: false) */
  exaggerate?: boolean;
  /** Show live value as DOM text overlay (default: false) */
  showValue?: boolean;
  /** Color the value text by momentum — green/red (default: false) */
  valueMomentumColor?: boolean;
  /** Degen mode — burst particles + chart shake on momentum swings (default: false) */
  degen?: boolean | DegenOptions;
  /** Show pointed tail on badge pill (default: true) */
  badgeTail?: boolean;

  // Time window buttons
  windows?: WindowOption[];
  onWindowChange?: (secs: number) => void;
  windowStyle?: WindowStyle;

  // Badge
  /** Badge visual style: 'default' (accent) or 'minimal' (white + grey text) */
  badgeVariant?: BadgeVariant;

  // Crosshair
  /** Vertical offset for crosshair tooltip text (default: 14) */
  tooltipY?: number;
  /** Stroke outline around crosshair tooltip text for readability (default: true) */
  tooltipOutline?: boolean;

  // Orderbook
  orderbook?: OrderbookData;

  // Y-axis range override — when both provided, disables auto-ranging
  minValue?: number;
  maxValue?: number;

  // Optional
  referenceLine?: ReferenceLine;
  formatValue?: (v: number) => string;
  formatTime?: (t: number) => string;
  lerpSpeed?: number;
  padding?: Padding;
  onHover?: (point: HoverPoint | null) => void;
  /** CSS cursor on hover (default: 'crosshair') */
  cursor?: string;
  /** Pulsing ring on live dot (default: true) */
  pulse?: boolean;
  /** Stroke width of the main line in px (default: 2) */
  lineWidth?: number;

  // Candlestick mode
  /** Chart type (default: 'line') */
  mode?: "line" | "candle";
  /** OHLC candle data (required when mode='candle') */
  candles?: CandlePoint[];
  /** Seconds per candle (required when mode='candle') */
  candleWidth?: number;
  /** Current live candle with real-time OHLC */
  liveCandle?: CandlePoint;
  /** Morph candles into line display */
  lineMode?: boolean;
  /** Tick-level data for density transition */
  lineData?: LivelinePoint[];
  /** Current tick value for density transition */
  lineValue?: number;
  /** Built-in toggle callback */
  onModeChange?: (mode: "line" | "candle") => void;
  /** Multi-series toggle callback */
  onSeriesToggle?: (id: string, visible: boolean) => void;
  /** Show only colored dots (no labels) in series toggle (default: false) */
  seriesToggleCompact?: boolean;

  className?: string;
  style?: CSSProperties;
}

export interface CandlePoint {
  /** unix seconds — candle open time */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface LivelinePalette {
  // Line
  line: string;
  lineWidth: number;

  // Fill gradient
  fillTop: string;
  fillBottom: string;

  // Grid
  gridLine: string;
  gridLabel: string;

  // Dot
  dotUp: string;
  dotDown: string;
  dotFlat: string;
  glowUp: string;
  glowDown: string;
  glowFlat: string;

  // Badge
  badgeOuterBg: string;
  badgeOuterShadow: string;
  badgeBg: string;
  badgeText: string;

  // Dash line
  dashLine: string;

  // Reference line
  refLine: string;
  refLabel: string;

  // Time axis
  timeLabel: string;

  // Crosshair
  crosshairLine: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;

  // Background (for color fading — labels fade toward bg instead of alpha)
  bgRgb: [number, number, number];

  // Fonts
  labelFont: string;
  valueFont: string;
  badgeFont: string;
}

export interface ChartLayout {
  w: number;
  h: number;
  pad: Required<Padding>;
  chartW: number;
  chartH: number;
  leftEdge: number;
  rightEdge: number;
  minVal: number;
  maxVal: number;
  valRange: number;
  toX: (t: number) => number;
  toY: (v: number) => number;
}
