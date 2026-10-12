// What the pane shows where the game goes; `live` once a frame of this size
// and form is in.
export type View =
  | { kind: "starting" }
  | { kind: "failed"; reason: string }
  | { kind: "live"; mode: "image" | "cells"; columns: number; rows: number };

declare module "claude-code" {
  interface PluginState {
    // `status` is the line under the game: the run, its tokens and coins.
    "mod-surfer": { view: View; status: string };
  }
}
