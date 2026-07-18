import type { Connection } from "partyserver";
import { routePartykitRequest, Server } from "partyserver";

import { getColorById } from "./color";

// Schema
export type Player = {
  id: string;
  color: string;
  hue: string;
  state: Record<string, unknown>;
};

export type PlayerMap = Record<string, Player>;

/**
 * Durable presence: identity plus a single liveness timestamp, kept in the
 * connection's attachment so it survives Cloudflare's WebSocket hibernation
 * (which evicts the Durable Object instance but keeps the sockets). It is
 * deliberately tiny and bounded — never the cursor snapshot, which changes every
 * frame and could brush the 2KB attachment cap.
 */
type Presence = { id: string; color: string; hue: string; seenAt: number };

// Messages from client
export type ClientMessage =
  | { type: "state_patch"; data: Record<string, unknown> }
  | { type: "player_state_patch"; data: Record<string, unknown> }
  | { type: "emit"; data: { event: string; payload: unknown } }
  | { type: "pong" };

// Messages from server
export type ServerMessage =
  | { type: "sync"; data: { players: PlayerMap; state: Record<string, unknown>; hostId: string } }
  | { type: "player_joined"; data: Player }
  | { type: "player_left"; data: { id: string } }
  | { type: "state_patch"; data: Record<string, unknown> }
  | { type: "player_state"; data: { id: string; state: Record<string, unknown> } }
  | { type: "event"; data: { event: string; payload: unknown; from: string } }
  | { type: "host"; data: { id: string } }
  | { type: "ping" };

type Env = {
  KyhServer: DurableObjectNamespace<KyhServer>;
};

/**
 * A websocket whose peer vanished without a close handshake — a slept laptop, a
 * dropped radio, a force-quit tab — stays OPEN on the server until TCP finally
 * gives up, which can take the better part of an hour. Cloudflare exposes no
 * server-initiated protocol ping and partysocket sends no heartbeat of its own,
 * so the only way to tell a live idle visitor from a dead socket is to ask:
 * ping every live connection, and reap the ones that stop answering.
 */
const PING_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 75_000; // tolerates two dropped pings before reaping

export class KyhServer extends Server {
  private shared: Record<string, unknown> = {};
  private hostId: string | null = null;

  /**
   * Per-player cursor snapshot — the high-frequency, drop-tolerant channel in
   * game-netcode terms. Kept in memory, broadcast every tick, never persisted:
   * it self-heals (a client re-announces on (re)connect, and the room only
   * hibernates when nobody is moving), so at worst a joiner sees one frame of
   * stale cursors after a hibernation. Who is *present* lives in the durable
   * attachment (Presence); where their cursor is does not.
   */
  private snapshots = new Map<string, Record<string, unknown>>();

  private toPlayer(presence: Presence): Player {
    return {
      id: presence.id,
      color: presence.color,
      hue: presence.hue,
      state: this.snapshots.get(presence.id) ?? {},
    };
  }

  /**
   * Players are derived from the open connections rather than a parallel map, so
   * a connection that dies mid-flight can never leave a ghost behind. Identity
   * comes from the durable attachment; cursor state from the in-memory snapshot.
   */
  private getPlayers(excludeId?: string): PlayerMap {
    const players: PlayerMap = {};
    for (const connection of this.getConnections<Presence>()) {
      if (connection.id === excludeId) continue;
      const presence = connection.state;
      if (presence) players[connection.id] = this.toPlayer(presence);
    }
    return players;
  }

  /** Mark a connection heard-from, on the low-frequency keepalive channel. */
  private touch(connection: Connection<Presence>) {
    const presence = connection.state;
    if (!presence) return;
    connection.setState({ ...presence, seenAt: Date.now() });
  }

  /**
   * Keeps the current host if it is still connected, otherwise promotes the
   * oldest remaining connection. Returns null only when the room is empty.
   */
  private resolveHost(): string | null {
    let fallback: string | null = null;
    for (const connection of this.getConnections<Presence>()) {
      if (connection.id === this.hostId) return this.hostId;
      fallback ??= connection.id;
    }
    this.hostId = fallback;
    return fallback;
  }

  onConnect(connection: Connection<Presence>) {
    const { color, hue } = getColorById(connection.id);
    const presence: Presence = { id: connection.id, color, hue, seenAt: Date.now() };
    connection.setState(presence);
    this.snapshots.set(connection.id, {});
    void this.scheduleSweep();

    // The connection is already open, so this elects it host if the room was empty.
    const hostId = this.resolveHost() ?? connection.id;

    const syncMessage: ServerMessage = {
      type: "sync",
      data: {
        players: this.getPlayers(connection.id),
        state: this.shared,
        hostId,
      },
    };
    connection.send(JSON.stringify(syncMessage));

    const joinedMessage: ServerMessage = {
      type: "player_joined",
      data: this.toPlayer(presence),
    };
    this.broadcast(JSON.stringify(joinedMessage), [connection.id]);
  }

  onMessage(sender: Connection<Presence>, rawMessage: string): void | Promise<void> {
    try {
      // Admission gate: presence lives in the attachment, so a connection that
      // survived hibernation is still admitted even though its in-memory
      // snapshot was wiped — the next patch just re-fills it.
      const presence = sender.state;
      if (!presence) return;

      const message = JSON.parse(rawMessage) as ClientMessage;

      switch (message.type) {
        case "player_state_patch": {
          // Hot path: snapshot + broadcast only, no attachment write. Liveness
          // rides the keepalive (pong) channel below.
          const next = { ...(this.snapshots.get(sender.id) ?? {}), ...message.data };
          this.snapshots.set(sender.id, next);

          const updateMessage: ServerMessage = {
            type: "player_state",
            data: { id: sender.id, state: next },
          };
          this.broadcast(JSON.stringify(updateMessage), [sender.id]);
          break;
        }
        case "state_patch": {
          this.touch(sender);
          this.shared = {
            ...this.shared,
            ...message.data,
          };
          const broadcastMessage: ServerMessage = {
            type: "state_patch",
            data: message.data,
          };
          this.broadcast(JSON.stringify(broadcastMessage), [sender.id]);
          break;
        }
        case "emit": {
          this.touch(sender);
          const eventMessage: ServerMessage = {
            type: "event",
            data: {
              event: message.data.event,
              payload: message.data.payload,
              from: sender.id,
            },
          };
          this.broadcast(JSON.stringify(eventMessage), []);
          break;
        }
        default:
          // `pong` (the keepalive channel) proves the peer is alive.
          this.touch(sender);
          break;
      }
    } catch (error) {
      console.error("Error handling message", error);
    }
  }

  onClose(connection: Connection<Presence>) {
    this.removePlayer(connection);
  }

  /**
   * partyserver routes a clean disconnect to `onClose` but a mid-connection
   * transport failure (dropped wifi, sleeping laptop, lost mobile radio) to
   * `onError`. Both tear the connection down, so both must reap the player.
   */
  onError(connection: Connection<Presence>) {
    this.removePlayer(connection);
  }

  /**
   * Pings every live connection and drops the ones that have gone quiet past
   * the timeout. Reschedules itself until the room is empty, at which point the
   * alarm stops and the Durable Object is free to shut down.
   */
  async onAlarm() {
    const now = Date.now();
    const pingMessage = JSON.stringify({ type: "ping" } satisfies ServerMessage);
    const stale: Connection<Presence>[] = [];

    // Collect first: reaping mutates the connection set, so it cannot happen
    // while we are still iterating it.
    for (const connection of this.getConnections<Presence>()) {
      const seenAt = connection.state?.seenAt ?? now;
      if (now - seenAt > IDLE_TIMEOUT_MS) {
        stale.push(connection);
        continue;
      }
      try {
        connection.send(pingMessage);
      } catch {
        // Sending to a socket whose peer is already gone throws — reap it, and
        // don't let one dead connection abort the sweep (and its reschedule).
        stale.push(connection);
      }
    }

    for (const connection of stale) {
      // Closing may not fire `onClose` for a peer that is already gone, so reap
      // explicitly. `removePlayer` is idempotent if the close event does land.
      try {
        connection.close(1001, "idle");
      } catch {
        /* already gone */
      }
      this.removePlayer(connection);
    }

    await this.scheduleSweep();
  }

  private async scheduleSweep() {
    // Reschedule while any connection is still open. Read that from the socket
    // set (restored across hibernation) rather than an in-memory count, so the
    // ping loop can never stall and starve live idle clients of their pings.
    let hasConnections = false;
    for (const _connection of this.getConnections()) {
      hasConnections = true;
      break;
    }
    if (!hasConnections) return;

    const pending = await this.ctx.storage.getAlarm();
    if (pending !== null) return;
    await this.ctx.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
  }

  private removePlayer(connection: Connection<Presence>) {
    this.snapshots.delete(connection.id);

    // `player_left` is idempotent on the client (deleting an absent id is a
    // no-op), so the sweep's explicit removal and a trailing `onClose` for the
    // same connection can both run harmlessly.
    const leftMessage: ServerMessage = {
      type: "player_left",
      data: { id: connection.id },
    };
    this.broadcast(JSON.stringify(leftMessage), [connection.id]);

    if (this.hostId !== connection.id) return;

    this.hostId = null;
    const hostId = this.resolveHost();
    if (!hostId) return;

    const hostMessage: ServerMessage = {
      type: "host",
      data: { id: hostId },
    };
    this.broadcast(JSON.stringify(hostMessage), [connection.id]);
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (await routePartykitRequest(request, env)) || new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
