import type { JsonRecord, JsonValue } from "@vibedgames/multiplayer";
import { FixedRate, Interpolator, lerp, MultiplayerClient } from "@vibedgames/multiplayer";

import type { Chat } from "@/lib/chat";
import { draftState, readChat, sayState } from "@/lib/chat";
import { lookOf, ownColorName } from "@/lib/color";
import { PARTY, PARTY_HOST } from "@/lib/party";
import { parseActorKey } from "./world";
import { asFinite, asRecord, isText } from "@/lib/wire";

const SNAPSHOT_EVERY = 8000;
const HOLD_TTL = 12_000;
const RENEW_EVERY = 4000;
const SEND_RATE = 15;
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
  chat: Chat;
}

interface NetOptions {
  room: string;
  /** Who holds `key` now: a player, or nobody. */
  onHold: (key: string, owner: string | null) => void;
  /** Someone else set something down. */
  onDrop: (drop: Drop) => void;
}

/** A dropped thing from the wire, or null for anything a real client wouldn't send. */
export const readDrop = (payload: JsonValue) => {
  const record = asRecord(payload);
  const from = asRecord(record?.from);
  const key = record?.key;
  const state = record?.state;

  if (!record || !from || !isText(key) || !parseActorKey(key) || !Array.isArray(state)) {
    return null;
  }

  const numbers = state.map(asFinite);
  const x = asFinite(from.x);
  const y = asFinite(from.y);
  const z = asFinite(from.z);

  if (numbers.length > 16 || x === null || y === null || z === null) {
    return null;
  }

  const values = numbers.filter((value) => value !== null);

  return (
    values.length === numbers.length ? { from: { x, y, z }, key, state: values } : null
  ) satisfies Drop | null;
};

const readPointer = (state: JsonRecord) => {
  const t = asFinite(state.t);
  const x = asFinite(state.x);
  const y = asFinite(state.y);
  const z = asFinite(state.z);

  if (state.on !== 1 || t === null || x === null || y === null || z === null) {
    return null;
  }

  const near = Math.abs(x) < REACH && Math.abs(z) < REACH && Math.abs(y) < 10;

  return near ? { spot: { x, y, z }, t } : null;
};

const readHolding = (state: JsonRecord) =>
  isText(state.h) && parseActorKey(state.h) ? state.h : null;

const lerpSpot = (a: Spot, b: Spot, k: number) =>
  ({
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k),
    z: lerp(a.z, b.z, k),
  }) satisfies Spot;

export const createNet = ({ onDrop, onHold, room: roomId }: NetOptions) => {
  let client: MultiplayerClient | null = null;
  client = new MultiplayerClient({
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
    drop: (drop: Drop) => {
      const room = live();
      const me = room?.playerId;
      room?.sendEvent(
        "drop",
        { from: { ...drop.from }, key: drop.key, state: [...drop.state] },
        me !== undefined && me !== null && me !== "" ? { except: me } : undefined,
      );
    },
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
    now: () => {
      const room = live();

      return room && Number.isFinite(room.rtt) ? room.serverNow() : Date.now();
    },
    ownerOf: (key: string) => live()?.ownerOf(key) ?? null,
    get people() {
      return Object.keys(live()?.players ?? {}).length;
    },
    point: (spot: Spot | null) => {
      pointer = spot;
    },
    publish: (pack: () => string, force = false) => {
      const room = live();
      const now = performance.now();

      if (
        room?.isHost === true &&
        room.connectionStatus === "connected" &&
        (force || now - publishedAt > SNAPSHOT_EVERY)
      ) {
        publishedAt = now;
        room.updateSharedState({ town: pack() });
      }
    },
    remotes: () => {
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
            chat: readChat(state, room?.serverNow() ?? Date.now()),
            ...lookOf(state, player),
            holding: readHolding(state),
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
    say: (text: string) => {
      const room = live();
      room?.updateMyState(sayState(text, room.serverNow()));
    },
    get snapshot() {
      const town = live()?.sharedState.town;

      return isText(town) ? town : null;
    },
    get status() {
      return live()?.connectionStatus ?? "offline";
    },
    get synced() {
      const room = live();

      return room?.connectionStatus === "connected" && Number.isFinite(room.rtt);
    },
    type: (draft: string | null) => {
      live()?.updateMyState(draftState(draft));
    },
    update: (deltaMs: number) => {
      const room = live();

      if (!room) {
        return;
      }

      const now = performance.now();

      if (holding !== null && holding !== "" && now - renewedAt > RENEW_EVERY) {
        renewedAt = now;
        room.claim(holding, { ttlMs: HOLD_TTL });
      }

      if (sending.due(deltaMs)) {
        room.updateMyState({
          h: holding ?? "",
          look: ownColorName(),
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
