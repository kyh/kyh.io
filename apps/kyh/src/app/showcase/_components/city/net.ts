// The city's room on the vibedgames party server, so everyone looking at the
// town sees the same one. Each browser steps the town itself (world.ts is
// deterministic); the room carries only what can't be worked out alone: a
// recent snapshot for whoever arrives, who is holding what, where things were
// set down, and where everyone's pointer is. With no server in reach the city
// plays on alone, down the same code path.
import type { JsonRecord, JsonValue } from "@vibedgames/multiplayer";
import { FixedRate, Interpolator, lerp, MultiplayerClient } from "@vibedgames/multiplayer";

import { PARTY, PARTY_HOST } from "@/lib/party";
import { parseActorKey } from "./world";

/** How often whoever hosts the room puts up a snapshot of the town (ms). */
const SNAPSHOT_EVERY = 8000;
/** A hold lapses this long after it was last renewed, so a holder who vanishes lets go (ms). */
const HOLD_TTL = 12_000;
const RENEW_EVERY = 4000;
/** Everyone's pointer, and what they hold, goes out this many times a second. */
const SEND_RATE = 15;
/** Pointers are on the island or near it: anything else is noise. */
const REACH = 140;

export interface Spot {
  x: number;
  y: number;
  z: number;
}

/** Someone let go of something: where from, and exactly where it lands. */
export interface Drop {
  key: string;
  state: number[];
  from: Spot;
}

export interface Remote {
  id: string;
  color: string;
  hue: string;
  /** Their pointer in the town, drawn a beat behind; null while it's off the town. */
  at: Spot | null;
  holding: string | null;
}

interface NetOptions {
  room: string;
  /** Who holds `key` now: a player, or nobody. */
  onHold: (key: string, owner: string | null) => void;
  /** Someone else set something down. */
  onDrop: (drop: Drop) => void;
}

const finite = (value: JsonValue | undefined) => (Number.isFinite(value) ? Number(value) : null);

const asRecord = (value: JsonValue | undefined) =>
  value instanceof Object && !Array.isArray(value) ? value : null;

/** A dropped thing from the wire, or null for anything a real client wouldn't send. */
export const readDrop = (payload: JsonValue): Drop | null => {
  const record = asRecord(payload);
  const from = asRecord(record?.from);
  const key = record?.key;
  const state = record?.state;
  if (!record || !from || String(key) !== key || !parseActorKey(key) || !Array.isArray(state)) {
    return null;
  }
  const numbers = state.map(finite);
  const x = finite(from.x);
  const y = finite(from.y);
  const z = finite(from.z);
  if (numbers.length > 16 || x === null || y === null || z === null) {
    return null;
  }
  const values = numbers.filter((value) => value !== null);
  return values.length === numbers.length ? { from: { x, y, z }, key, state: values } : null;
};

/** A player's pointer from their state, and when they sent it; null while it's off the town. */
const readPointer = (state: JsonRecord) => {
  const t = finite(state.t);
  const x = finite(state.x);
  const y = finite(state.y);
  const z = finite(state.z);
  if (state.on !== 1 || t === null || x === null || y === null || z === null) {
    return null;
  }
  const near = Math.abs(x) < REACH && Math.abs(z) < REACH && Math.abs(y) < 10;
  return near ? { spot: { x, y, z }, t } : null;
};

/** What a player says they're holding, if it names something in town. */
const readHolding = (state: JsonRecord) =>
  String(state.h) === state.h && parseActorKey(state.h) ? state.h : null;

const lerpSpot = (a: Spot, b: Spot, k: number): Spot => ({
  x: lerp(a.x, b.x, k),
  y: lerp(a.y, b.y, k),
  z: lerp(a.z, b.z, k),
});

export const createNet = ({ onDrop, onHold, room: roomId }: NetOptions) => {
  let client: MultiplayerClient | null = null;
  client = new MultiplayerClient({
    // A dead server shouldn't hold up the town: after a few seconds it plays alone.
    fallbackMs: 6000,
    host: PARTY_HOST,
    maxPlayers: 32,
    onClaim: (key, owner) => {
      if (parseActorKey(key)) {
        onHold(key, owner);
      }
    },
    onEvent: (event, payload, from) => {
      const drop = event === "drop" && from !== client?.playerId ? readDrop(payload) : null;
      if (drop) {
        onDrop(drop);
      }
    },
    party: PARTY,
    room: roomId,
  });
  const sending = new FixedRate(SEND_RATE);
  const remotes = new Map<string, Interpolator<Spot>>();
  let pointer: Spot | null = null;
  let holding: string | null = null;
  let renewedAt = 0;
  let publishedAt = Number.NEGATIVE_INFINITY;

  const live = () => client ?? null;

  return {
    destroy: () => {
      client?.destroy();
      client = null;
    },
    /** Tell everyone else where it landed. */
    drop: (drop: Drop) => {
      const room = live();
      const me = room?.playerId;
      room?.sendEvent(
        "drop",
        { from: { ...drop.from }, key: drop.key, state: [...drop.state] },
        me ? { except: me } : undefined,
      );
    },
    /** Ask for `key`: first come, first served; `onHold` says who got it. */
    hold: (key: string) => {
      holding = key;
      renewedAt = performance.now();
      live()?.claim(key, { ttlMs: HOLD_TTL });
    },
    get isHost() {
      return live()?.isHost ?? true;
    },
    letGo: (key: string) => {
      if (holding === key) {
        holding = null;
      }
      live()?.release(key);
    },
    get me() {
      return live()?.playerId ?? null;
    },
    /** Milliseconds on the room's clock once it's measured, the local one until then. */
    now: () => {
      const room = live();
      return room && Number.isFinite(room.rtt) ? room.serverNow() : Date.now();
    },
    ownerOf: (key: string) => live()?.ownerOf(key) ?? null,
    get people() {
      return Object.keys(live()?.players ?? {}).length;
    },
    /** Where this player's pointer is in the town, or null when it's elsewhere. */
    point: (spot: Spot | null) => {
      pointer = spot;
    },
    /** Put up the town as it stands, if it's ours to put up and time for another. */
    publish: (pack: () => string, force = false) => {
      const room = live();
      const now = performance.now();
      if (
        room?.isHost &&
        room.connectionStatus === "connected" &&
        (force || now - publishedAt > SNAPSHOT_EVERY)
      ) {
        publishedAt = now;
        room.updateSharedState({ town: pack() });
      }
    },
    /** Everyone else in the room, with their pointers smoothed. */
    remotes: (): Remote[] => {
      const room = live();
      const players = room?.players ?? {};
      const others: Remote[] = [];
      for (const [id, player] of Object.entries(players)) {
        if (id !== room?.playerId && player.connected !== false) {
          const state = player.state ?? {};
          const sent = readPointer(state);
          let smooth = remotes.get(id);
          if (!smooth) {
            smooth = new Interpolator<Spot>({ delayMs: 120, lerp: lerpSpot });
            remotes.set(id, smooth);
          }
          if (sent) {
            smooth.push(sent.t, sent.spot);
          }
          others.push({
            at: sent ? (smooth.sample() ?? null) : null,
            color: player.color ?? "hsl(206, 100%, 50%)",
            holding: readHolding(state),
            hue: player.hue ?? "hsl(208, 77.5%, 76.9%)",
            id,
          });
        }
      }
      for (const id of remotes.keys()) {
        if (!(id in players)) {
          remotes.delete(id);
        }
      }
      return others;
    },
    /** The latest snapshot of the town the room holds, if any. */
    get snapshot() {
      const town = live()?.sharedState.town;
      return String(town) === town ? town : null;
    },
    get status() {
      return live()?.connectionStatus ?? "offline";
    },
    /** In the room, on its clock: what a snapshot's ticks need to mean the same here. */
    get synced() {
      const room = live();
      return room?.connectionStatus === "connected" && Number.isFinite(room.rtt);
    },
    /** Each frame: send this player's pointer on a steady clock, and keep holds alive. */
    update: (deltaMs: number) => {
      const room = live();
      if (!room) {
        return;
      }
      const now = performance.now();
      if (holding && now - renewedAt > RENEW_EVERY) {
        renewedAt = now;
        room.claim(holding, { ttlMs: HOLD_TTL });
      }
      if (sending.due(deltaMs)) {
        room.updateMyState({
          h: holding ?? "",
          on: pointer ? 1 : 0,
          t: Math.round(room.serverNow()),
          x: pointer ? Math.round(pointer.x * 1000) / 1000 : 0,
          y: pointer ? Math.round(pointer.y * 1000) / 1000 : 0,
          z: pointer ? Math.round(pointer.z * 1000) / 1000 : 0,
        });
      }
    },
  };
};

export type CityNet = ReturnType<typeof createNet>;
