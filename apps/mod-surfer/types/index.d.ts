export type Caption = string;

declare module "claude-code" {
  interface PluginState {
    "mod-surfer": { caption: Caption; isRunning: boolean };
  }
}
