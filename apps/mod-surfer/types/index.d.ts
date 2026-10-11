export type Caption = string;

// What the pane shows where the game goes; `live` once a frame of this size
// and form is in.
export type View =
  | { kind: "starting" }
  | { kind: "failed"; reason: string }
  | { kind: "live"; mode: "image" | "cells"; columns: number; rows: number };

export interface Tally {
  score: number;
  coins: number;
}

declare module "claude-code" {
  interface PluginState {
    "mod-surfer": { caption: Caption; isRunning: boolean; view: View; tally: Tally };
  }
}
