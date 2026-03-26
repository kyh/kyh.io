export type BlockStatus = "active" | "locked" | "won" | "lost";

export type Block = {
  id: string;
  /** Price level (center of block) */
  priceLevel: number;
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
};

export type GameState = {
  balance: number;
  blocks: Block[];
  totalWins: number;
  totalLosses: number;
  totalProfit: number;
};

export const INITIAL_BALANCE = 1000;
export const DEFAULT_BET = 10;
/** Price height of each block in price units */
export const BLOCK_PRICE_HEIGHT = 20;
/** Grid cell width in seconds — must match chart grid */
export const GRID_CELL_SECONDS = 5;
/** How many seconds before target time a block locks */
export const LOCK_SECONDS = 10;
/** Minimum time into the future a block can be placed (seconds) */
export const MIN_FUTURE_SECONDS = 15;

export function createInitialState(): GameState {
  return {
    balance: INITIAL_BALANCE,
    blocks: [],
    totalWins: 0,
    totalLosses: 0,
    totalProfit: 0,
  };
}

/**
 * Calculate multiplier based on distance from current price.
 * Further from current price = higher multiplier.
 */
export function calculateMultiplier(
  currentPrice: number,
  targetPrice: number,
): number {
  const distance = Math.abs(targetPrice - currentPrice);
  const percentDistance = (distance / currentPrice) * 100;

  // Base multiplier starts at 1.2x for close bets, scales up
  // Max around 20x for very distant predictions
  if (percentDistance < 0.2) return 1.2;
  if (percentDistance < 0.4) return 1.5;
  if (percentDistance < 0.8) return 2.0;
  if (percentDistance < 1.2) return 3.5;
  if (percentDistance < 2.0) return 5.0;
  if (percentDistance < 3.0) return 8.0;
  if (percentDistance < 5.0) return 12.0;
  return 18.0;
}

/**
 * Place a new block on the chart.
 */
export function placeBlock(
  state: GameState,
  currentPrice: number,
  priceLevel: number,
  targetTime: number,
): GameState {
  const now = Date.now();

  // Validate
  if (state.balance < DEFAULT_BET) return state;
  if (targetTime - now < MIN_FUTURE_SECONDS * 1000) return state;
  const occupied = state.blocks.some(
    (b) => b.priceLevel === priceLevel && b.targetTime === targetTime,
  );
  if (occupied) return state;

  const multiplier = calculateMultiplier(currentPrice, priceLevel);

  const block: Block = {
    id: crypto.randomUUID(),
    priceLevel,
    targetTime,
    amount: DEFAULT_BET,
    multiplier,
    status: "active",
    placedAt: now,
    touched: false,
    resolvedAt: null,
  };

  return {
    ...state,
    balance: state.balance - DEFAULT_BET,
    blocks: [...state.blocks, block],
  };
}

/**
 * Update block statuses based on current time and price history.
 */
export function updateBlocks(
  state: GameState,
  currentPrice: number,
  currentTime: number,
  priceHistory?: readonly { time: number; price: number }[],
): GameState {
  if (state.blocks.length === 0) return state;

  let balanceChange = 0;
  let wins = 0;
  let losses = 0;
  let changed = false;

  const halfColumnMs = (GRID_CELL_SECONDS * 1000) / 2;
  const halfH = BLOCK_PRICE_HEIGHT / 2;

  const updatedBlocks = state.blocks.map((block) => {
    if (block.status === "won" || block.status === "lost") return block;

    const priceTop = block.priceLevel + halfH;
    const priceBottom = block.priceLevel - halfH;

    // Check if any price point crossed through the block during its time window
    let nowTouched = block.touched;
    if (!nowTouched && priceHistory) {
      const windowStart = block.targetTime - halfColumnMs;
      const windowEnd = block.targetTime + halfColumnMs;
      for (let i = priceHistory.length - 1; i >= 0; i--) {
        const p = priceHistory[i]!;
        if (p.time < windowStart) break;
        if (p.time > windowEnd) continue;
        if (p.price >= priceBottom && p.price <= priceTop) {
          nowTouched = true;
          break;
        }
      }
    }

    // Lock blocks that are close to resolution
    if (
      block.status === "active" &&
      block.targetTime - currentTime < LOCK_SECONDS * 1000
    ) {
      changed = true;
      return { ...block, status: "locked" as const, touched: nowTouched };
    }

    // Resolve blocks after their time column has fully passed
    if (currentTime >= block.targetTime + halfColumnMs) {
      changed = true;

      if (nowTouched) {
        const payout = block.amount * block.multiplier;
        balanceChange += payout;
        wins++;
        return { ...block, status: "won" as const, touched: true, resolvedAt: block.resolvedAt ?? currentTime };
      } else {
        losses++;
        return { ...block, status: "lost" as const, touched: false, resolvedAt: block.resolvedAt ?? currentTime };
      }
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
    if (block.status !== "won" && block.status !== "lost") return true;
    const keep = block.resolvedAt === null || currentTime - block.resolvedAt < 1000;
    if (!keep) changed = true;
    return keep;
  });

  if (!changed) return state;

  return {
    ...state,
    balance: state.balance + balanceChange,
    blocks: filteredBlocks,
    totalWins: state.totalWins + wins,
    totalLosses: state.totalLosses + losses,
    totalProfit: state.totalProfit + balanceChange,
  };
}
