export type View =
  | { kind: "starting" }
  | { kind: "failed"; reason: string }
  | { kind: "live"; mode: "image" | "cells"; columns: number; rows: number };

declare module "claude-code" {
  interface PluginState {
    "commuting-clawders": { view: View; status: string };
  }
}
