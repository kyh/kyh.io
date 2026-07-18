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
 * The player as stored on the connection, carrying a liveness timestamp the
 * clients never see. It lives in the connection's attachment (serialized onto
 * the socket) rather than an instance field on purpose — see the class comment.
 */
type StoredPlayer = Player & { seenAt: number };

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

  /**
   * Liveness is tracked per connection, in the connection's own attachment,
   * NOT in an instance field. partyserver runs on Cloudflare's WebSocket
   * Hibernation API: an idle Durable Object is evicted and its instance
   * destroyed, but the open sockets — and their serialized attachments —
   * survive. An in-memory `lastSeen` map was therefore silently emptied on
   * every hibernation, which broke the sweep two ways: it either found everyone
   * "fresh" and reaped nothing, or (because the reschedule was gated on the now
   * empty map) let the ping loop stall until a live idle visitor aged past the
   * timeout and got reaped by mistake, only to reconnect — the churn that
   * surfaced as phantom visitors. Storing `seenAt` on the connection keeps it
   * alive across hibernation, exactly like the player data already was.
   */
  private toPlayer(stored: StoredPlayer): Player {
    return { id: stored.id, color: stored.color, hue: stored.hue, state: stored.state };
  }

  /**
   * Players are derived from the open connections rather than tracked in a
   * parallel map: a connection that dies mid-flight can then never leave a
   * ghost player behind. Each player lives in its own connection's state.
   */
  private getPlayers(excludeId?: string): PlayerMap {
    const players: PlayerMap = {};
    for (const connection of this.getConnections<StoredPlayer>()) {
      if (connection.id === excludeId) continue;
      const stored = connection.state;
      if (stored) players[connection.id] = this.toPlayer(stored);
    }
    return players;
  }

  /** Records that a connection was just heard from, for the idle sweep. */
  private touch(connection: Connection<StoredPlayer>, now: number) {
    const stored = connection.state;
    if (!stored) return;
    connection.setState({ ...stored, seenAt: now });
  }

  /**
   * Keeps the current host if it is still connected, otherwise promotes the
   * oldest remaining connection. Returns null only when the room is empty.
   */
  private resolveHost(): string | null {
    let fallback: string | null = null;
    for (const connection of this.getConnections<StoredPlayer>()) {
      if (connection.id === this.hostId) return this.hostId;
      fallback ??= connection.id;
    }
    this.hostId = fallback;
    return fallback;
  }

  onConnect(connection: Connection<StoredPlayer>) {
    const { color, hue } = getColorById(connection.id);
    const stored: StoredPlayer = {
      id: connection.id,
      color,
      hue,
      state: {},
      seenAt: Date.now(),
    };
    connection.setState(stored);
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
      data: this.toPlayer(stored),
    };
    this.broadcast(JSON.stringify(joinedMessage), [connection.id]);
  }

  onMessage(sender: Connection<StoredPlayer>, rawMessage: string): void | Promise<void> {
    try {
      const message = JSON.parse(rawMessage) as ClientMessage;
      const now = Date.now();

      switch (message.type) {
        case "player_state_patch": {
          const stored = sender.state;
          if (!stored) return;

          // Folds the liveness bump into the same write as the state patch.
          const next: StoredPlayer = {
            ...stored,
            state: { ...stored.state, ...message.data },
            seenAt: now,
          };
          sender.setState(next);

          const updateMessage: ServerMessage = {
            type: "player_state",
            data: { id: sender.id, state: next.state },
          };
          this.broadcast(JSON.stringify(updateMessage), [sender.id]);
          break;
        }
        case "state_patch": {
          this.touch(sender, now);
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
        case "emit": {
          this.touch(sender, now);
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
          // `pong` (and any other message) is proof enough that the peer lives.
          this.touch(sender, now);
          break;
      }
    } catch (error) {
      console.error("Error handling message", error);
    }
  }

  onClose(connection: Connection<StoredPlayer>) {
    this.removePlayer(connection);
  }

  /**
   * partyserver routes a clean disconnect to `onClose` but a mid-connection
   * transport failure (dropped wifi, sleeping laptop, lost mobile radio) to
   * `onError`. Both tear the connection down, so both must reap the player.
   */
  onError(connection: Connection<StoredPlayer>) {
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
    const stale: Connection<StoredPlayer>[] = [];

    // Collect first: reaping mutates the connection set, so it cannot happen
    // while we are still iterating it.
    for (const connection of this.getConnections<StoredPlayer>()) {
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

  private removePlayer(connection: Connection<StoredPlayer>) {
    // `player_left` is idempotent on the client (deleting an absent id is a
    // no-op), so the sweep's explicit removal and a trailing `onClose` for the
    // same connection can both run harmlessly. No in-memory dedupe guard —
    // hibernation would wipe it anyway, and a duplicate leave costs nothing.
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
