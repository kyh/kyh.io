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
  private sharedState: Record<string, unknown> = {};
  private hostId: string | null = null;
  /** Last time each live connection was heard from, for the idle sweep. */
  private lastSeen = new Map<string, number>();

  /**
   * Players are derived from the open connections rather than tracked in a
   * parallel map: a connection that dies mid-flight can then never leave a
   * ghost player behind. Each player lives in its own connection's state.
   */
  private getPlayers(excludeId?: string): PlayerMap {
    const players: PlayerMap = {};
    for (const connection of this.getConnections<Player>()) {
      if (connection.id === excludeId) continue;
      const player = connection.state;
      if (player) players[connection.id] = player;
    }
    return players;
  }

  /**
   * Keeps the current host if it is still connected, otherwise promotes the
   * oldest remaining connection. Returns null only when the room is empty.
   */
  private resolveHost(): string | null {
    let fallback: string | null = null;
    for (const connection of this.getConnections<Player>()) {
      if (connection.id === this.hostId) return this.hostId;
      fallback ??= connection.id;
    }
    this.hostId = fallback;
    return fallback;
  }

  onConnect(connection: Connection<Player>) {
    const { color, hue } = getColorById(connection.id);
    const player: Player = {
      id: connection.id,
      color,
      hue,
      state: {},
    };
    connection.setState(player);
    this.lastSeen.set(connection.id, Date.now());
    void this.scheduleSweep();

    // The connection is already open, so this elects it host if the room was empty.
    const hostId = this.resolveHost() ?? connection.id;

    const syncMessage: ServerMessage = {
      type: "sync",
      data: {
        players: this.getPlayers(connection.id),
        state: this.sharedState,
        hostId,
      },
    };
    connection.send(JSON.stringify(syncMessage));

    const joinedMessage: ServerMessage = {
      type: "player_joined",
      data: player,
    };
    this.broadcast(JSON.stringify(joinedMessage), [connection.id]);
  }

  onMessage(sender: Connection<Player>, rawMessage: string): void | Promise<void> {
    try {
      const message = JSON.parse(rawMessage) as ClientMessage;

      // Any message proves the peer is alive, so `pong` needs no case of its own.
      this.lastSeen.set(sender.id, Date.now());

      switch (message.type) {
        case "state_patch": {
          this.sharedState = {
            ...this.sharedState,
            ...message.data,
          };
          const broadcastMessage: ServerMessage = {
            type: "state_patch",
            data: message.data,
          };
          this.broadcast(JSON.stringify(broadcastMessage), [sender.id]);
          break;
        }
        case "player_state_patch": {
          const player = sender.state;
          if (!player) return;

          const next: Player = {
            ...player,
            state: { ...player.state, ...message.data },
          };
          sender.setState(next);

          const updateMessage: ServerMessage = {
            type: "player_state",
            data: { id: sender.id, state: next.state },
          };
          this.broadcast(JSON.stringify(updateMessage), [sender.id]);
          break;
        }
        case "emit": {
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
          break;
      }
    } catch (error) {
      console.error("Error handling message", error);
    }
  }

  onClose(connection: Connection<Player>) {
    this.removePlayer(connection);
  }

  /**
   * partyserver routes a clean disconnect to `onClose` but a mid-connection
   * transport failure (dropped wifi, sleeping laptop, lost mobile radio) to
   * `onError`. Both tear the connection down, so both must reap the player.
   */
  onError(connection: Connection<Player>) {
    this.removePlayer(connection);
  }

  /**
   * Pings every live connection and drops the ones that have gone quiet past
   * the timeout. Reschedules itself until the room is empty, at which point the
   * alarm stops and the Durable Object is free to shut down.
   */
  async onAlarm() {
    const now = Date.now();
    const pingMessage: ServerMessage = { type: "ping" };
    const stale: Connection<Player>[] = [];

    // Collect first: reaping mutates the connection set, so it cannot happen
    // while we are still iterating it.
    for (const connection of this.getConnections<Player>()) {
      const seenAt = this.lastSeen.get(connection.id) ?? now;
      if (now - seenAt > IDLE_TIMEOUT_MS) stale.push(connection);
      else connection.send(JSON.stringify(pingMessage));
    }

    for (const connection of stale) {
      // Closing may not fire `onClose` for a peer that is already gone, so reap
      // explicitly. `removePlayer` is idempotent if the close event does land.
      connection.close(1001, "idle");
      this.removePlayer(connection);
    }

    await this.scheduleSweep();
  }

  private async scheduleSweep() {
    if (this.lastSeen.size === 0) return;
    const pending = await this.ctx.storage.getAlarm();
    if (pending !== null) return;
    await this.ctx.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
  }

  private removePlayer(connection: Connection<Player>) {
    // Doubles as the idempotency guard: a connection reaped by the sweep may
    // still deliver a close event afterwards, and must not be announced twice.
    if (!this.lastSeen.delete(connection.id)) return;

    // The connection is already out of `getConnections()` by the time we run.
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
