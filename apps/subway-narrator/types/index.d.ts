export type Caption = string;

declare module "claude-code" {
  interface PluginState {
    "subway-narrator": { caption: Caption; isRunning: boolean; isMuted: boolean };
  }
}
