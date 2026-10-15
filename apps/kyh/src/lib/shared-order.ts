// The order of a sortable grid (the homepage's side quests, each folder), shared
// by everyone in the site's room for as long as the room lives. A drag sends the
// host a "reorder" intent; the host bounds it and writes it into shared state
// under `orders`; every client reads it back against the tiles it actually has.
// Everything here crossed a JSON wire, so nothing in it is trusted.
import type { JsonRecord, JsonValue } from "@vibedgames/multiplayer";

export const REORDER = "reorder";

/** Generous bounds: the real grids hold a dozen tiles with short slugs. */
const MAX_GRIDS = 16;
const MAX_TILES = 64;
const MAX_KEY = 80;

/** A grid's order as the room holds it: who set it last, and their nth reorder. */
export interface SharedOrder {
  order: string[];
  by: string;
  n: number;
}

export interface ReorderIntent {
  grid: string;
  order: string[];
  n: number;
}

const asRecord = (value: JsonValue | undefined) =>
  value instanceof Object && !Array.isArray(value) ? value : null;

/** Keys that would reach an object's prototype instead of naming a grid or tile. */
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const asKey = (value: JsonValue | undefined) =>
  String(value) === value &&
  value.length > 0 &&
  value.length <= MAX_KEY &&
  !PROTOTYPE_KEYS.has(value)
    ? value
    : null;

const asCount = (value: JsonValue | undefined) =>
  Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;

/** A list of distinct, short keys, or null. */
const keyList = (value: JsonValue | undefined) => {
  if (!Array.isArray(value) || value.length > MAX_TILES) {
    return null;
  }
  const keys = value.flatMap((item) => asKey(item) ?? []);
  return keys.length === value.length && new Set(keys).size === keys.length ? keys : null;
};

/** What a guest asked the host for, if it's the right shape. */
export const parseReorder = (payload: JsonValue): ReorderIntent | null => {
  const record = asRecord(payload);
  const grid = asKey(record?.grid);
  const order = keyList(record?.order);
  const n = asCount(record?.n);
  return grid && order && n !== null ? { grid, n, order } : null;
};

/**
 * The room's `orders` with `intent` applied, from `by`; null when the room is
 * full of other grids already. Rebuilt from what parses, so nothing malformed
 * survives a write.
 */
export const applyReorder = (
  orders: JsonValue | undefined,
  intent: ReorderIntent,
  by: string,
): JsonRecord | null => {
  const next: JsonRecord = {};
  for (const [grid, entry] of Object.entries(asRecord(orders) ?? {})) {
    if (Object.keys(next).length < MAX_GRIDS && asKey(grid) && asRecord(entry)) {
      next[grid] = entry;
    }
  }
  if (!Object.hasOwn(next, intent.grid) && Object.keys(next).length >= MAX_GRIDS) {
    return null;
  }
  next[intent.grid] = { by, n: intent.n, order: intent.order };
  return next;
};

/**
 * A grid's shared order laid over the tiles this page has: keys it doesn't
 * know are dropped, and tiles the room didn't mention keep their place at the end.
 */
export const readSharedOrder = (
  entry: JsonValue | undefined,
  keys: string[],
): SharedOrder | null => {
  const record = asRecord(entry);
  const by = asKey(record?.by);
  const order = keyList(record?.order);
  const n = asCount(record?.n);
  if (!by || !order || n === null) {
    return null;
  }
  const known = new Set(keys);
  const kept = order.filter((key) => known.has(key));
  return { by, n, order: [...new Set([...kept, ...keys])] };
};

/** The grid's entry in the room's shared state. */
export const ordersEntry = (shared: JsonRecord | undefined, grid: string) =>
  asRecord(shared?.orders)?.[grid];
