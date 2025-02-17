import { routePartykitRequest, Server } from "partyserver";

import type { Connection } from "partyserver";
import type { Cursor } from "../src/lib/cursor";
import { getColorById } from "../src/lib/color";

type Env = {
  KyhServer: DurableObjectNamespace<KyhServer>;
};

export class KyhServer extends Server {
  onConnect(connection: Connection<Cursor>) {
    const color = getColorById(connection.id);

    console.log("[connect]", connection.id);

    connection.setState({
      id: connection.id,
      color: color.color,
      hue: color.hue,
    });

    // On connect, send a "sync" message to the new connection
    // Pull the cursor from all connection attachments
    const cursors: Record<string, Cursor> = {};
    for (const ws of this.getConnections<Cursor>()) {
      const id = ws.id;
      const cursor = ws.state;
      if (
        id !== connection.id &&
        cursor?.x !== undefined &&
        cursor.y !== undefined
      ) {
        cursors[id] = cursor;
      }
    }

    connection.send(
      JSON.stringify({
        type: "sync",
        cursors: cursors,
      }),
    );
  }

  onMessage(
    sender: Connection<Cursor>,
    message: string
  ): void | Promise<void> {
      const cursor = JSON.parse(message) as Cursor;
      const prevCursor = this.getCursor(sender);
  
      const newCursor: Cursor = {
        id: sender.id,
        lastUpdate: Date.now(),
        x: cursor.x,
        y: cursor.y,
        pointer: cursor.pointer,
        pathname: cursor.pathname ?? prevCursor?.pathname,
        color: prevCursor?.color,
        hue: prevCursor?.hue,
      };
  
      this.setCursor(sender, newCursor);
  
      if (newCursor.x !== undefined && newCursor.y !== undefined) { 
        this.broadcast(
          JSON.stringify({
            type: "update",
            ...newCursor,
          }),
          [sender.id],
        );
      } else {
        this.broadcast(
          JSON.stringify({
            type: "remove",
            id: sender.id,
          }),
          [sender.id],
        );
      }
    }
  
    onClose(connection: Connection<Cursor>) {
      console.log(
        "[disconnect]",
        connection.id,
        connection.readyState,
      );
  
      this.broadcast(
        JSON.stringify({
          type: "remove",
          id: connection.id,
        }),
        [],
      );
    }
  
    getCursor(connection: Connection<Cursor>) {  
      return connection.state;
    }
  
    setCursor(connection: Connection<Cursor>, cursor: Cursor) {
      const prevCursor = connection.state;
  
      // throttle writing to attachment to once every 50ms
      if (
        !prevCursor?.lastUpdate ||
        (cursor.lastUpdate && cursor.lastUpdate - prevCursor.lastUpdate > 50)
      ) {
        connection.setState({
          ...cursor,
        });
      }
    }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;