// Everything here crosses a JSON.stringify/JSON.parse wire, so JSON values are
// the precise contract for player state. Mirrors apps/party/src/server.ts.
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

// Schema
export type Player = {
  id: string;
  color: string;
  hue: string;
  state: JsonObject;
};

export type PlayerMap = Record<string, Player>;

// Messages from client
export type ClientMessage =
  | { type: "state_patch"; data: JsonObject }
  | { type: "player_state_patch"; data: JsonObject }
  | { type: "emit"; data: { event: string; payload: JsonValue | undefined } }
  | { type: "pong" };

// Messages from server
export type ServerMessage =
  | { type: "sync"; data: { players: PlayerMap; state: JsonObject; hostId: string } }
  | { type: "player_joined"; data: Player }
  | { type: "player_left"; data: { id: string } }
  | { type: "state_patch"; data: JsonObject }
  | { type: "player_state"; data: { id: string; state: JsonObject } }
  | { type: "event"; data: { event: string; payload: JsonValue | undefined; from: string } }
  | { type: "host"; data: { id: string } }
  | { type: "ping" };
