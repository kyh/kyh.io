export type Position = {
  x: number;
  y: number;
  pointer: "mouse" | "touch";
  pathname?: string;
};

export type Cursor = Partial<Position> & {
  id: string;
  // these are set upon connection
  hue?: string;
  color?: string;
  lastUpdate?: number;
};

export type UpdateMessage = {
  type: "update";
  id: string;
} & Cursor;

export type SyncMessage = {
  type: "sync";
  cursors: Record<string, Cursor>;
};

export type RemoveMessage = {
  type: "remove";
  id: string;
};
