export type BlockStatus = "active" | "locked" | "won" | "lost";

export type Block = {
  id: string;
  /** Price level (center of block) */
  priceLevel: number;
  /** Price range the block covers */
  priceTop: number;
  priceBottom: number;
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
};

export type GameState = {
  balance: number;
  blocks: Block[];
  totalWins: number;
  totalLosses: number;
  totalProfit: number;
};

const INITIAL_BALANCE = 1000;
const DEFAULT_BET = 10;
/** Price height of each block in price units */
const BLOCK_PRICE_HEIGHT = 2;
/** How many seconds before target time a block locks */
const LOCK_SECONDS = 10;
/** Minimum time into the future a block can be placed (seconds) */
const MIN_FUTURE_SECONDS = 15;

export function createInitialState(): GameState {
  return {
    balance: INITIAL_BALANCE,
    blocks: [],
    totalWins: 0,
    totalLosses: 0,
    totalProfit: 0,
  };
}

let nextId = 0;

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
  if (percentDistance < 0.01) return 1.2;
  if (percentDistance < 0.02) return 1.5;
  if (percentDistance < 0.05) return 2.0;
  if (percentDistance < 0.1) return 3.5;
  if (percentDistance < 0.15) return 5.0;
  if (percentDistance < 0.2) return 8.0;
  if (percentDistance < 0.3) return 12.0;
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

  const multiplier = calculateMultiplier(currentPrice, priceLevel);
  const halfHeight = BLOCK_PRICE_HEIGHT / 2;

  const block: Block = {
    id: `block-${nextId++}`,
    priceLevel,
    priceTop: priceLevel + halfHeight,
    priceBottom: priceLevel - halfHeight,
    targetTime,
    amount: DEFAULT_BET,
    multiplier,
    status: "active",
    placedAt: now,
  };

  return {
    ...state,
    balance: state.balance - DEFAULT_BET,
    blocks: [...state.blocks, block],
  };
}

/**
 * Update block statuses based on current time and price.
 */
export function updateBlocks(
  state: GameState,
  currentPrice: number,
  currentTime: number,
): GameState {
  let balanceChange = 0;
  let wins = 0;
  let losses = 0;

  const updatedBlocks = state.blocks.map((block) => {
    if (block.status === "won" || block.status === "lost") return block;

    // Lock blocks that are close to resolution
    if (
      block.status === "active" &&
      block.targetTime - currentTime < LOCK_SECONDS * 1000
    ) {
      return { ...block, status: "locked" as const };
    }

    // Resolve blocks whose time has passed
    if (currentTime >= block.targetTime) {
      // Check if price is within the block's range
      const hit =
        currentPrice >= block.priceBottom && currentPrice <= block.priceTop;

      if (hit) {
        const payout = block.amount * block.multiplier;
        balanceChange += payout;
        wins++;
        return { ...block, status: "won" as const };
      } else {
        losses++;
        return { ...block, status: "lost" as const };
      }
    }

    return block;
  });

  // Remove resolved blocks after 5 seconds
  const filteredBlocks = updatedBlocks.filter((block) => {
    if (block.status !== "won" && block.status !== "lost") return true;
    return currentTime - block.targetTime < 5000;
  });

  return {
    ...state,
    balance: state.balance + balanceChange,
    blocks: filteredBlocks,
    totalWins: state.totalWins + wins,
    totalLosses: state.totalLosses + losses,
    totalProfit:
      state.totalProfit +
      balanceChange -
      losses * DEFAULT_BET +
      (balanceChange > 0 ? 0 : 0),
  };
}

export { DEFAULT_BET, BLOCK_PRICE_HEIGHT, LOCK_SECONDS, MIN_FUTURE_SECONDS };
