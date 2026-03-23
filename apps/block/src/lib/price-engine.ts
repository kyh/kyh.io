export type PricePoint = {
  time: number;
  price: number;
};

export type PriceEngineConfig = {
  /** Starting price (e.g. S&P ~5200) */
  startPrice: number;
  /** Volatility factor - higher = more movement */
  volatility: number;
  /** Drift/trend bias (-1 to 1, 0 = neutral) */
  drift: number;
  /** Tick interval in ms */
  tickInterval: number;
};

const DEFAULT_CONFIG: PriceEngineConfig = {
  startPrice: 5200,
  volatility: 0.3,
  drift: 0.02,
  tickInterval: 200,
};

/**
 * Simulated price engine using geometric Brownian motion.
 * Produces realistic S&P 500-like price movements.
 * Designed to be easily swapped with a real data feed.
 */
export class PriceEngine {
  private config: PriceEngineConfig;
  private currentPrice: number;
  private history: PricePoint[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(point: PricePoint) => void> = new Set();
  private startTime: number;

  constructor(config: Partial<PriceEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentPrice = this.config.startPrice;
    this.startTime = Date.now();
  }

  /** Subscribe to price updates */
  subscribe(listener: (point: PricePoint) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Start generating price data */
  start() {
    if (this.intervalId) return;

    // Generate initial history (60 seconds of data)
    const now = Date.now();
    const historyPoints = 300; // 60s / 200ms
    for (let i = historyPoints; i > 0; i--) {
      const time = now - i * this.config.tickInterval;
      this.tick(time, false);
    }

    this.intervalId = setInterval(() => {
      this.tick(Date.now(), true);
    }, this.config.tickInterval);
  }

  /** Stop generating price data */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(time: number, notify: boolean) {
    // Geometric Brownian motion
    const dt = this.config.tickInterval / 1000;
    const randomComponent = this.gaussianRandom() * this.config.volatility * Math.sqrt(dt);
    const driftComponent = this.config.drift * dt;
    const change = this.currentPrice * (driftComponent + randomComponent);
    this.currentPrice += change;

    // Add some occasional jumps for excitement
    if (Math.random() < 0.005) {
      const jumpSize = this.currentPrice * (Math.random() - 0.5) * 0.003;
      this.currentPrice += jumpSize;
    }

    const point: PricePoint = { time, price: this.currentPrice };
    this.history.push(point);

    // Keep last 5 minutes of data
    const cutoff = time - 5 * 60 * 1000;
    while (this.history.length > 0 && this.history[0]!.time < cutoff) {
      this.history.shift();
    }

    if (notify) {
      for (const listener of this.listeners) {
        listener(point);
      }
    }
  }

  private gaussianRandom(): number {
    // Box-Muller transform
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  getHistory(): PricePoint[] {
    return [...this.history];
  }

  getCurrentPrice(): number {
    return this.currentPrice;
  }

  getStartTime(): number {
    return this.startTime;
  }
}
