// A visitor as the site draws them: their color and whatever they share
// (where their pointer is, which page they're on). Everything here crossed a
// JSON wire, so JSON values are the precise contract for their state.
import type { JsonRecord } from "@vibedgames/multiplayer";

export type { JsonValue } from "@vibedgames/multiplayer";

export interface Player {
  id: string;
  color: string;
  hue: string;
  state: JsonRecord;
}

export type PlayerMap = Record<string, Player>;

/** A visitor as the avatar row draws them: who, their colors, and which page they're on. */
export interface Visitor {
  id: string;
  color: string;
  hue: string;
  pathname: string;
}
