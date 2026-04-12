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
  | { type: "emit"; data: { event: string; payload: unknown } };

// Messages from server
export type ServerMessage =
  | { type: "sync"; data: { players: PlayerMap; state: Record<string, unknown>; hostId: string } }
  | { type: "player_joined"; data: Player }
  | { type: "player_left"; data: { id: string } }
  | { type: "state_patch"; data: Record<string, unknown> }
  | { type: "player_state"; data: { id: string; state: Record<string, unknown> } }
  | { type: "event"; data: { event: string; payload: unknown; from: string } }
  | { type: "host"; data: { id: string } };

type Env = {
  KyhServer: DurableObjectNamespace<KyhServer>;
};

type RoomState = {
  sharedState: Record<string, unknown>;
  players: PlayerMap;
  hostId: string | null;
};

export class KyhServer extends Server {
  private room: RoomState = {
    sharedState: {},
    players: {},
    hostId: null,
  };

  onConnect(connection: Connection<Player>) {
    const { color, hue } = getColorById(connection.id);
    const player: Player = {
      id: connection.id,
      color,
      hue,
      state: {},
    };

    this.room.players[connection.id] = player;
    if (!this.room.hostId) {
      this.room.hostId = connection.id;
    }

    const syncMessage: ServerMessage = {
      type: "sync",
      data: {
        players: this.room.players,
        state: this.room.sharedState,
        hostId: this.room.hostId!,
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

      switch (message.type) {
        case "state_patch": {
          this.room.sharedState = {
            ...this.room.sharedState,
            ...message.data,
          };
          const broadcastMessage: ServerMessage = {
            type: "state_patch",
            data: message.data,
          };
          this.broadcast(JSON.stringify(broadcastMessage), []);
          break;
        }
        case "player_state_patch": {
          const player = this.room.players[sender.id];
          if (!player) return;

          player.state = { ...player.state, ...message.data };
          this.room.players[sender.id] = player;

          const updateMessage: ServerMessage = {
            type: "player_state",
            data: { id: sender.id, state: player.state },
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
    delete this.room.players[connection.id];

    const leftMessage: ServerMessage = {
      type: "player_left",
      data: { id: connection.id },
    };
    this.broadcast(JSON.stringify(leftMessage), []);

    if (this.room.hostId === connection.id) {
      const remainingIds = Object.keys(this.room.players);
      this.room.hostId = remainingIds[0] ?? null;
      if (this.room.hostId) {
        const hostMessage: ServerMessage = {
          type: "host",
          data: { id: this.room.hostId },
        };
        this.broadcast(JSON.stringify(hostMessage), []);
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (await routePartykitRequest(request, env)) || new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
