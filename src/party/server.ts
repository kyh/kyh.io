import type * as Party from "partykit/server";
import { getColorById } from "../lib/color";
import type { Cursor } from "../lib/cursor";

type ConnectionWithCursor = Party.Connection & { cursor?: Cursor };

// server.ts
export default class CursorServer implements Party.Server {
  constructor(public party: Party.Party) {}
  options: Party.ServerOptions = {
    hibernate: true,
  };

  onConnect(websocket: Party.Connection): void | Promise<void> {
    const color = getColorById(websocket.id);

    websocket.serializeAttachment({
      ...websocket.deserializeAttachment(),
      color: color.color,
      hue: color.hue,
    });

    console.log("[connect]", this.party.id, websocket.id);

    // On connect, send a "sync" message to the new connection
    // Pull the cursor from all websocket attachments
    let cursors: { [id: string]: Cursor } = {};
    for (const ws of this.party.getConnections() as ConnectionWithCursor[]) {
      const id = ws.id;
      let cursor = ws.cursor ?? ws.deserializeAttachment();
      if (
        id !== websocket.id &&
        cursor !== null &&
        cursor.x !== undefined &&
        cursor.y !== undefined
      ) {
        cursors[id] = cursor;
      }
    }

    websocket.send(
      JSON.stringify({
        type: "sync",
        cursors: cursors,
      })
    );
  }

  onMessage(
    message: string,
    websocket: Party.Connection
  ): void | Promise<void> {
    const position = JSON.parse(message);
    const prevCursor = this.getCursor(websocket);

    const cursor: Cursor = {
      id: websocket.id,
      lastUpdate: Date.now(),
      x: position.x,
      y: position.y,
      pointer: position.pointer,
      pathname: position.pathname ?? prevCursor?.pathname,
      color: prevCursor?.color,
      hue: prevCursor?.hue,
    };

    this.setCursor(websocket, cursor);

    if (position.x && position.y) {
      this.party.broadcast(
        JSON.stringify({
          type: "update",
          ...cursor,
        }),
        [websocket.id]
      );
    } else {
      this.party.broadcast(
        JSON.stringify({
          type: "remove",
          id: websocket.id,
        }),
        [websocket.id]
      );
    }
  }

  onClose(websocket: Party.Connection) {
    console.log(
      "[disconnect]",
      this.party.id,
      websocket.id,
      websocket.readyState
    );

    this.party.broadcast(
      JSON.stringify({
        type: "remove",
        id: websocket.id,
      }),
      []
    );
  }

  getCursor(connection: ConnectionWithCursor) {
    if (!connection.cursor) {
      connection.cursor = connection.deserializeAttachment();
    }

    return connection.cursor;
  }

  setCursor(connection: ConnectionWithCursor, cursor: Cursor) {
    let prevCursor = connection.cursor;
    connection.cursor = cursor;

    // throttle writing to attachment to once every 50ms
    if (
      !prevCursor ||
      !prevCursor.lastUpdate ||
      (cursor.lastUpdate && cursor.lastUpdate - prevCursor.lastUpdate > 50)
    ) {
      // Stash the cursor in the websocket attachment
      connection.serializeAttachment({
        ...cursor,
      });
    }
  }
}

CursorServer satisfies Party.Worker;
