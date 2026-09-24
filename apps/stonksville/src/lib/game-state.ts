export type BlockStatus = "active" | "locked" | "won" | "lost";

export interface Block {
  id: string;
  /** Grid row this block sits on — see `levelToPrice` */
  level: number;
  /** Price band the row covers */
  priceLow: number;
  priceHigh: number;
  /** Time column this block targets */
  targetTime: number;
  /** Bet amount in dollars */
  amount: number;
  /** Multiplier based on distance from current price at placement */
  multiplier: number;
  /** Current status */
  status: BlockStatus;
  /** Timestamp when block was placed */
  placedAt: number;
  /** Whether the price line touched this block during its time window */
  touched: boolean;
  /** Timestamp when block was resolved (won/lost) */
  resolvedAt: number | null;
}

export interface GameState {
  balance: number;
  blocks: Block[];
  totalWins: number;
  totalLosses: number;
  totalProfit: number;
}

export const INITIAL_BALANCE = 1000;
export const DEFAULT_BET = 10;
/**
 * Height of each grid row as a percent of price. Rows are geometric, so the
 * grid means the same thing whether the index prints 17 (1928) or 7,700 (2026).
 */
export const ROW_PCT = 0.4;
/** Grid cell width in seconds — one trading day of history plays per cell */
export const GRID_CELL_SECONDS = 5;
/** How many seconds before target time a block locks */
export const LOCK_SECONDS = 10;
/** Minimum time into the future a block can be placed (seconds) */
export const MIN_FUTURE_SECONDS = 15;

const LEVEL_STEP = Math.log(1 + ROW_PCT / 100);

/** Continuous grid-row coordinate of a price (row `k` is centred on `levelToPrice(k)`) */
export const priceToLevel = (price: number): number => Math.log(price) / LEVEL_STEP;

export const levelToPrice = (level: number): number => Math.exp(level * LEVEL_STEP);

export const createInitialState = (): GameState => ({
  balance: INITIAL_BALANCE,
  blocks: [],
  totalLosses: 0,
  totalProfit: 0,
  totalWins: 0,
});

/**
 * Calculate multiplier based on distance from current price.
 * Further from current price = higher multiplier.
 */
export const calculateMultiplier = (currentPrice: number, targetPrice: number): number => {
  const distance = Math.abs(targetPrice - currentPrice);
  const percentDistance = (distance / currentPrice) * 100;

  // Base multiplier starts at 1.2x for close bets, scales up
  // Max around 20x for very distant predictions
  if (percentDistance < 0.2) {
    return 1.2;
  }
  if (percentDistance < 0.4) {
    return 1.5;
  }
  if (percentDistance < 0.8) {
    return 2;
  }
  if (percentDistance < 1.2) {
    return 3.5;
  }
  if (percentDistance < 2) {
    return 5;
  }
  if (percentDistance < 3) {
    return 8;
  }
  if (percentDistance < 5) {
    return 12;
  }
  return 18;
};

/**
 * Place a new block on the chart.
 */
export const placeBlock = (
  state: GameState,
  currentPrice: number,
  level: number,
  targetTime: number,
): GameState => {
  const now = Date.now();

  // Validate
  if (state.balance < DEFAULT_BET) {
    return state;
  }
  if (targetTime - now < MIN_FUTURE_SECONDS * 1000) {
    return state;
  }
  const occupied = state.blocks.some((b) => b.level === level && b.targetTime === targetTime);
  if (occupied) {
    return state;
  }

  const multiplier = calculateMultiplier(currentPrice, levelToPrice(level));

  const block: Block = {
    amount: DEFAULT_BET,
    id: crypto.randomUUID(),
    level,
    multiplier,
    placedAt: now,
    priceHigh: levelToPrice(level + 0.5),
    priceLow: levelToPrice(level - 0.5),
    resolvedAt: null,
    status: "active",
    targetTime,
    touched: false,
  };

  return {
    ...state,
    balance: state.balance - DEFAULT_BET,
    blocks: [...state.blocks, block],
  };
};

/**
 * Whether the price path crossed the band [low, high] inside the time window.
 * Checks the segment between consecutive ticks, so a fast move through the
 * band counts even if no single tick landed inside it.
 */
const crossedBand = (
  history: readonly { time: number; price: number }[],
  windowStart: number,
  windowEnd: number,
  low: number,
  high: number,
): boolean => {
  for (let i = history.length - 1; i > 0; i -= 1) {
    const p = history[i];
    if (p.time < windowStart) {
      break;
    }
    if (p.time > windowEnd) {
      continue;
    }
    const q = history[i - 1];
    if (Math.max(p.price, q.price) >= low && Math.min(p.price, q.price) <= high) {
      return true;
    }
  }
  return false;
};

/**
 * Update block statuses based on current time and price history.
 */
export const updateBlocks = (
  state: GameState,
  currentPrice: number,
  currentTime: number,
  priceHistory?: readonly { time: number; price: number }[],
): GameState => {
  if (state.blocks.length === 0) {
    return state;
  }

  let balanceChange = 0;
  let wins = 0;
  let losses = 0;
  let changed = false;

  const halfColumnMs = (GRID_CELL_SECONDS * 1000) / 2;

  const updatedBlocks = state.blocks.map((block) => {
    if (block.status === "won" || block.status === "lost") {
      return block;
    }

    // Check if the price path crossed through the block during its time window
    let nowTouched = block.touched;
    if (!nowTouched && priceHistory) {
      nowTouched = crossedBand(
        priceHistory,
        block.targetTime - halfColumnMs,
        block.targetTime + halfColumnMs,
        block.priceLow,
        block.priceHigh,
      );
    }

    // Lock blocks that are close to resolution
    if (block.status === "active" && block.targetTime - currentTime < LOCK_SECONDS * 1000) {
      changed = true;
      return { ...block, status: "locked" as const, touched: nowTouched };
    }

    // Resolve blocks after their time column has fully passed
    if (currentTime >= block.targetTime + halfColumnMs) {
      changed = true;

      if (nowTouched) {
        const payout = block.amount * block.multiplier;
        balanceChange += payout;
        wins += 1;
        return {
          ...block,
          resolvedAt: block.resolvedAt ?? currentTime,
          status: "won" as const,
          touched: true,
        };
      }
      losses += 1;
      return {
        ...block,
        resolvedAt: block.resolvedAt ?? currentTime,
        status: "lost" as const,
        touched: false,
      };
    }

    // Update touched flag if changed
    if (nowTouched !== block.touched) {
      changed = true;
      return { ...block, touched: nowTouched };
    }

    return block;
  });

  // Remove resolved blocks after fade completes
  const filteredBlocks = updatedBlocks.filter((block) => {
    if (block.status !== "won" && block.status !== "lost") {
      return true;
    }
    const keep = block.resolvedAt === null || currentTime - block.resolvedAt < 1000;
    if (!keep) {
      changed = true;
    }
    return keep;
  });

  if (!changed) {
    return state;
  }

  return {
    ...state,
    balance: state.balance + balanceChange,
    blocks: filteredBlocks,
    totalLosses: state.totalLosses + losses,
    totalProfit: state.totalProfit + balanceChange,
    totalWins: state.totalWins + wins,
  };
};
