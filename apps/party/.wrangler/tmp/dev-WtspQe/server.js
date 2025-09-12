var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-hsNFVR/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// ../../node_modules/partyserver/dist/index.js
import { DurableObject } from "cloudflare:workers";

// ../../node_modules/partyserver/node_modules/nanoid/url-alphabet/index.js
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// ../../node_modules/partyserver/node_modules/nanoid/index.browser.js
var nanoid = /* @__PURE__ */ __name((size = 21) => {
  let id = "";
  let bytes = crypto.getRandomValues(new Uint8Array(size |= 0));
  while (size--) {
    id += urlAlphabet[bytes[size] & 63];
  }
  return id;
}, "nanoid");

// ../../node_modules/partyserver/dist/index.js
if (!("OPEN" in WebSocket)) {
  const WebSocketStatus = {
    // @ts-expect-error
    CONNECTING: WebSocket.READY_STATE_CONNECTING,
    // @ts-expect-error
    OPEN: WebSocket.READY_STATE_OPEN,
    // @ts-expect-error
    CLOSING: WebSocket.READY_STATE_CLOSING,
    // @ts-expect-error
    CLOSED: WebSocket.READY_STATE_CLOSED
  };
  Object.assign(WebSocket, WebSocketStatus);
  Object.assign(WebSocket.prototype, WebSocketStatus);
}
var AttachmentCache = class {
  static {
    __name(this, "AttachmentCache");
  }
  #cache = /* @__PURE__ */ new WeakMap();
  get(ws) {
    let attachment = this.#cache.get(ws);
    if (!attachment) {
      attachment = WebSocket.prototype.deserializeAttachment.call(
        ws
      );
      if (attachment !== void 0) {
        this.#cache.set(ws, attachment);
      } else {
        throw new Error(
          "Missing websocket attachment. This is most likely an issue in PartyServer, please open an issue at https://github.com/threepointone/partyserver/issues"
        );
      }
    }
    return attachment;
  }
  set(ws, attachment) {
    this.#cache.set(ws, attachment);
    WebSocket.prototype.serializeAttachment.call(ws, attachment);
  }
};
var attachments = new AttachmentCache();
var connections = /* @__PURE__ */ new WeakSet();
var isWrapped = /* @__PURE__ */ __name((ws) => {
  return connections.has(ws);
}, "isWrapped");
var createLazyConnection = /* @__PURE__ */ __name((ws) => {
  if (isWrapped(ws)) {
    return ws;
  }
  let initialState = void 0;
  if ("state" in ws) {
    initialState = ws.state;
    delete ws.state;
  }
  const connection = Object.defineProperties(ws, {
    id: {
      get() {
        return attachments.get(ws).__pk.id;
      }
    },
    server: {
      get() {
        return attachments.get(ws).__pk.server;
      }
    },
    socket: {
      get() {
        return ws;
      }
    },
    state: {
      get() {
        return ws.deserializeAttachment();
      }
    },
    setState: {
      value: /* @__PURE__ */ __name(function setState(setState) {
        let state;
        if (setState instanceof Function) {
          state = setState(this.state);
        } else {
          state = setState;
        }
        ws.serializeAttachment(state);
        return state;
      }, "setState")
    },
    deserializeAttachment: {
      value: /* @__PURE__ */ __name(function deserializeAttachment() {
        const attachment = attachments.get(ws);
        return attachment.__user ?? null;
      }, "deserializeAttachment")
    },
    serializeAttachment: {
      value: /* @__PURE__ */ __name(function serializeAttachment(attachment) {
        const setting = {
          ...attachments.get(ws),
          __user: attachment ?? null
        };
        attachments.set(ws, setting);
      }, "serializeAttachment")
    }
  });
  if (initialState) {
    connection.setState(initialState);
  }
  connections.add(connection);
  return connection;
}, "createLazyConnection");
var HibernatingConnectionIterator = class {
  static {
    __name(this, "HibernatingConnectionIterator");
  }
  constructor(state, tag) {
    this.state = state;
    this.tag = tag;
  }
  index = 0;
  sockets;
  [Symbol.iterator]() {
    return this;
  }
  next() {
    const sockets = (
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      this.sockets ?? (this.sockets = this.state.getWebSockets(this.tag))
    );
    let socket;
    while (socket = sockets[this.index++]) {
      if (socket.readyState === WebSocket.READY_STATE_OPEN) {
        const value = createLazyConnection(socket);
        return { done: false, value };
      }
    }
    return { done: true, value: void 0 };
  }
};
var InMemoryConnectionManager = class {
  static {
    __name(this, "InMemoryConnectionManager");
  }
  #connections = /* @__PURE__ */ new Map();
  tags = /* @__PURE__ */ new WeakMap();
  getCount() {
    return this.#connections.size;
  }
  getConnection(id) {
    return this.#connections.get(id);
  }
  *getConnections(tag) {
    if (!tag) {
      yield* this.#connections.values().filter(
        (c) => c.readyState === WebSocket.READY_STATE_OPEN
      );
      return;
    }
    for (const connection of this.#connections.values()) {
      const connectionTags = this.tags.get(connection) ?? [];
      if (connectionTags.includes(tag)) {
        yield connection;
      }
    }
  }
  accept(connection, options) {
    connection.accept();
    this.#connections.set(connection.id, connection);
    this.tags.set(connection, [
      // make sure we have id tag
      connection.id,
      ...options.tags.filter((t) => t !== connection.id)
    ]);
    const removeConnection = /* @__PURE__ */ __name(() => {
      this.#connections.delete(connection.id);
      connection.removeEventListener("close", removeConnection);
      connection.removeEventListener("error", removeConnection);
    }, "removeConnection");
    connection.addEventListener("close", removeConnection);
    connection.addEventListener("error", removeConnection);
    return connection;
  }
};
var HibernatingConnectionManager = class {
  static {
    __name(this, "HibernatingConnectionManager");
  }
  constructor(controller) {
    this.controller = controller;
  }
  getCount() {
    return Number(this.controller.getWebSockets().length);
  }
  getConnection(id) {
    const sockets = this.controller.getWebSockets(id);
    if (sockets.length === 0) return void 0;
    if (sockets.length === 1)
      return createLazyConnection(sockets[0]);
    throw new Error(
      `More than one connection found for id ${id}. Did you mean to use getConnections(tag) instead?`
    );
  }
  getConnections(tag) {
    return new HibernatingConnectionIterator(this.controller, tag);
  }
  accept(connection, options) {
    const tags = [
      connection.id,
      ...options.tags.filter((t) => t !== connection.id)
    ];
    if (tags.length > 10) {
      throw new Error(
        "A connection can only have 10 tags, including the default id tag."
      );
    }
    for (const tag of tags) {
      if (typeof tag !== "string") {
        throw new Error(`A connection tag must be a string. Received: ${tag}`);
      }
      if (tag === "") {
        throw new Error("A connection tag must not be an empty string.");
      }
      if (tag.length > 256) {
        throw new Error("A connection tag must not exceed 256 characters");
      }
    }
    this.controller.acceptWebSocket(connection, tags);
    connection.serializeAttachment({
      __pk: {
        id: connection.id,
        server: options.server
      },
      __user: null
    });
    return createLazyConnection(connection);
  }
};
var serverMapCache = /* @__PURE__ */ new WeakMap();
function camelCaseToKebabCase(str) {
  if (str === str.toUpperCase() && str !== str.toLowerCase()) {
    return str.toLowerCase().replace(/_/g, "-");
  }
  let kebabified = str.replace(
    /[A-Z]/g,
    (letter) => `-${letter.toLowerCase()}`
  );
  kebabified = kebabified.startsWith("-") ? kebabified.slice(1) : kebabified;
  return kebabified.replace(/_/g, "-").replace(/-$/, "");
}
__name(camelCaseToKebabCase, "camelCaseToKebabCase");
async function routePartykitRequest(req, env, options) {
  if (!serverMapCache.has(env)) {
    serverMapCache.set(
      env,
      Object.entries(env).reduce((acc, [k, v]) => {
        if (v && typeof v === "object" && "idFromName" in v && typeof v.idFromName === "function") {
          Object.assign(acc, { [camelCaseToKebabCase(k)]: v });
          return acc;
        }
        return acc;
      }, {})
    );
  }
  const map = serverMapCache.get(env);
  const prefix = options?.prefix || "parties";
  const prefixParts = prefix.split("/");
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const prefixMatches = prefixParts.every(
    (part, index) => parts[index] === part
  );
  if (!prefixMatches || parts.length < prefixParts.length + 2) {
    return null;
  }
  const namespace = parts[prefixParts.length];
  const name = parts[prefixParts.length + 1];
  if (name && namespace) {
    if (!map[namespace]) {
      if (namespace === "main") {
        console.warn(
          "You appear to be migrating a PartyKit project to PartyServer."
        );
        console.warn(`PartyServer doesn't have a "main" party by default. Try adding this to your PartySocket client:
 
party: "${camelCaseToKebabCase(Object.keys(map)[0])}"`);
      } else {
        console.error(`The url ${req.url} does not match any server namespace. 
Did you forget to add a durable object binding to the class in your wrangler.toml?`);
      }
    }
    let doNamespace = map[namespace];
    if (options?.jurisdiction) {
      doNamespace = doNamespace.jurisdiction(options.jurisdiction);
    }
    const id = doNamespace.idFromName(name);
    const stub = doNamespace.get(id, options);
    req = new Request(req);
    req.headers.set("x-partykit-room", name);
    req.headers.set("x-partykit-namespace", namespace);
    if (options?.jurisdiction) {
      req.headers.set("x-partykit-jurisdiction", options.jurisdiction);
    }
    if (req.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      if (options?.onBeforeConnect) {
        const reqOrRes = await options.onBeforeConnect(req, {
          party: namespace,
          name
        });
        if (reqOrRes instanceof Request) {
          req = reqOrRes;
        } else if (reqOrRes instanceof Response) {
          return reqOrRes;
        }
      }
    } else {
      if (options?.onBeforeRequest) {
        const reqOrRes = await options.onBeforeRequest(req, {
          party: namespace,
          name
        });
        if (reqOrRes instanceof Request) {
          req = reqOrRes;
        } else if (reqOrRes instanceof Response) {
          return reqOrRes;
        }
      }
    }
    return stub.fetch(req);
  } else {
    return null;
  }
}
__name(routePartykitRequest, "routePartykitRequest");
var Server = class extends DurableObject {
  static {
    __name(this, "Server");
  }
  static options = {
    hibernate: false
  };
  #status = "zero";
  #ParentClass = Object.getPrototypeOf(this).constructor;
  #connectionManager = this.#ParentClass.options.hibernate ? new HibernatingConnectionManager(this.ctx) : new InMemoryConnectionManager();
  /**
   * Execute SQL queries against the Server's database
   * @template T Type of the returned rows
   * @param strings SQL query template strings
   * @param values Values to be inserted into the query
   * @returns Array of query results
   */
  sql(strings, ...values) {
    let query = "";
    try {
      query = strings.reduce(
        (acc, str, i) => acc + str + (i < values.length ? "?" : ""),
        ""
      );
      return [...this.ctx.storage.sql.exec(query, ...values)];
    } catch (e) {
      console.error(`failed to execute sql query: ${query}`, e);
      throw this.onException(e);
    }
  }
  // biome-ignore lint/complexity/noUselessConstructor: <explanation>
  constructor(ctx, env) {
    super(ctx, env);
  }
  /**
   * Handle incoming requests to the server.
   */
  async fetch(request) {
    if (!this.#_name) {
      const room = request.headers.get("x-partykit-room");
      if (
        // !namespace ||
        !room
      ) {
        throw new Error(`Missing namespace or room headers when connecting to ${this.#ParentClass.name}.
Did you try connecting directly to this Durable Object? Try using getServerByName(namespace, id) instead.`);
      }
      await this.setName(room);
    }
    try {
      const url = new URL(request.url);
      if (url.pathname === "/cdn-cgi/partyserver/set-name/") {
        return Response.json({ ok: true });
      }
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return await this.onRequest(request);
      } else {
        const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair();
        let connectionId = url.searchParams.get("_pk");
        if (!connectionId) {
          connectionId = nanoid();
        }
        let connection = Object.assign(serverWebSocket, {
          id: connectionId,
          server: this.name,
          state: null,
          setState(setState) {
            let state;
            if (setState instanceof Function) {
              state = setState(this.state);
            } else {
              state = setState;
            }
            this.state = state;
            return this.state;
          }
        });
        const ctx = { request };
        const tags = await this.getConnectionTags(connection, ctx);
        connection = this.#connectionManager.accept(connection, {
          tags,
          server: this.name
        });
        if (!this.#ParentClass.options.hibernate) {
          this.#attachSocketEventHandlers(connection);
        }
        await this.onConnect(connection, ctx);
        return new Response(null, { status: 101, webSocket: clientWebSocket });
      }
    } catch (err) {
      console.error(
        `Error in ${this.#ParentClass.name}:${this.name} fetch:`,
        err
      );
      if (!(err instanceof Error)) throw err;
      if (request.headers.get("Upgrade") === "websocket") {
        const pair = new WebSocketPair();
        pair[1].accept();
        pair[1].send(JSON.stringify({ error: err.stack }));
        pair[1].close(1011, "Uncaught exception during session setup");
        return new Response(null, { status: 101, webSocket: pair[0] });
      } else {
        return new Response(err.stack, { status: 500 });
      }
    }
  }
  async webSocketMessage(ws, message) {
    const connection = createLazyConnection(ws);
    await this.setName(connection.server);
    if (this.#status !== "started") {
      await this.#initialize();
    }
    return this.onMessage(connection, message);
  }
  async webSocketClose(ws, code, reason, wasClean) {
    const connection = createLazyConnection(ws);
    await this.setName(connection.server);
    if (this.#status !== "started") {
      await this.#initialize();
    }
    return this.onClose(connection, code, reason, wasClean);
  }
  async webSocketError(ws, error) {
    const connection = createLazyConnection(ws);
    await this.setName(connection.server);
    if (this.#status !== "started") {
      await this.#initialize();
    }
    return this.onError(connection, error);
  }
  async #initialize() {
    await this.ctx.blockConcurrencyWhile(async () => {
      this.#status = "starting";
      await this.onStart();
      this.#status = "started";
    });
  }
  #attachSocketEventHandlers(connection) {
    const handleMessageFromClient = /* @__PURE__ */ __name((event) => {
      this.onMessage(connection, event.data)?.catch((e) => {
        console.error("onMessage error:", e);
      });
    }, "handleMessageFromClient");
    const handleCloseFromClient = /* @__PURE__ */ __name((event) => {
      connection.removeEventListener("message", handleMessageFromClient);
      connection.removeEventListener("close", handleCloseFromClient);
      this.onClose(connection, event.code, event.reason, event.wasClean)?.catch(
        (e) => {
          console.error("onClose error:", e);
        }
      );
    }, "handleCloseFromClient");
    const handleErrorFromClient = /* @__PURE__ */ __name((e) => {
      connection.removeEventListener("message", handleMessageFromClient);
      connection.removeEventListener("error", handleErrorFromClient);
      this.onError(connection, e.error)?.catch((e2) => {
        console.error("onError error:", e2);
      });
    }, "handleErrorFromClient");
    connection.addEventListener("close", handleCloseFromClient);
    connection.addEventListener("error", handleErrorFromClient);
    connection.addEventListener("message", handleMessageFromClient);
  }
  // Public API
  #_name;
  #_longErrorAboutNameThrown = false;
  /**
   * The name for this server. Write-once-only.
   */
  get name() {
    if (!this.#_name) {
      if (!this.#_longErrorAboutNameThrown) {
        this.#_longErrorAboutNameThrown = true;
        throw new Error(
          `Attempting to read .name on ${this.#ParentClass.name} before it was set. The name can be set by explicitly calling .setName(name) on the stub, or by using routePartyKitRequest(). This is a known issue and will be fixed soon. Follow https://github.com/cloudflare/workerd/issues/2240 for more updates.`
        );
      } else {
        throw new Error(
          `Attempting to read .name on ${this.#ParentClass.name} before it was set.`
        );
      }
    }
    return this.#_name;
  }
  // We won't have an await inside this function
  // but it will be called remotely,
  // so we need to mark it as async
  async setName(name) {
    if (!name) {
      throw new Error("A name is required.");
    }
    if (this.#_name && this.#_name !== name) {
      throw new Error("This server already has a name.");
    }
    this.#_name = name;
    if (this.#status !== "started") {
      await this.ctx.blockConcurrencyWhile(async () => {
        await this.#initialize();
      });
    }
  }
  #sendMessageToConnection(connection, message) {
    try {
      connection.send(message);
    } catch (_e) {
      connection.close(1011, "Unexpected error");
    }
  }
  /** Send a message to all connected clients, except connection ids listed in `without` */
  broadcast(msg, without) {
    for (const connection of this.#connectionManager.getConnections()) {
      if (!without || !without.includes(connection.id)) {
        this.#sendMessageToConnection(connection, msg);
      }
    }
  }
  /** Get a connection by connection id */
  getConnection(id) {
    return this.#connectionManager.getConnection(id);
  }
  /**
   * Get all connections. Optionally, you can provide a tag to filter returned connections.
   * Use `Server#getConnectionTags` to tag the connection on connect.
   */
  getConnections(tag) {
    return this.#connectionManager.getConnections(tag);
  }
  /**
   * You can tag a connection to filter them in Server#getConnections.
   * Each connection supports up to 9 tags, each tag max length is 256 characters.
   */
  getConnectionTags(connection, context) {
    return [];
  }
  // Implemented by the user
  /**
   * Called when the server is started for the first time.
   */
  onStart() {
  }
  /**
   * Called when a new connection is made to the server.
   */
  onConnect(connection, ctx) {
    console.log(
      `Connection ${connection.id} connected to ${this.#ParentClass.name}:${this.name}`
    );
  }
  /**
   * Called when a message is received from a connection.
   */
  onMessage(connection, message) {
    console.log(
      `Received message on connection ${this.#ParentClass.name}:${connection.id}`
    );
    console.info(
      `Implement onMessage on ${this.#ParentClass.name} to handle this message.`
    );
  }
  /**
   * Called when a connection is closed.
   */
  onClose(connection, code, reason, wasClean) {
  }
  /**
   * Called when an error occurs on a connection.
   */
  onError(connection, error) {
    console.error(
      `Error on connection ${connection.id} in ${this.#ParentClass.name}:${this.name}:`,
      error
    );
    console.info(
      `Implement onError on ${this.#ParentClass.name} to handle this error.`
    );
  }
  /**
   * Called when a request is made to the server.
   */
  onRequest(request) {
    console.warn(
      `onRequest hasn't been implemented on ${this.#ParentClass.name}:${this.name} responding to ${request.url}`
    );
    return new Response("Not implemented", { status: 404 });
  }
  /**
   * Called when an exception occurs.
   * @param error - The error that occurred.
   */
  onException(error) {
    console.error(
      `Exception in ${this.#ParentClass.name}:${this.name}:`,
      error
    );
    console.info(
      `Implement onException on ${this.#ParentClass.name} to handle this error.`
    );
  }
  onAlarm() {
    console.log(
      `Implement onAlarm on ${this.#ParentClass.name} to handle alarms.`
    );
  }
  async alarm() {
    if (this.#status !== "started") {
      await this.#initialize();
    }
    await this.onAlarm();
  }
};

// src/color.ts
var colors = {
  tomato: {
    color: "hsl(10, 78%, 54%)",
    hue: "hsl(10, 77.3%, 79.5%)"
  },
  crimson: {
    color: "hsl(336, 80%, 57.8%)",
    hue: "hsl(335, 63.5%, 80.4%)"
  },
  pink: {
    color: "hsl(322, 65%, 54.5%)",
    hue: "hsl(323, 62%, 80.1%)"
  },
  plum: {
    color: "hsl(292, 45%, 51%)",
    hue: "hsl(295, 48.2%, 78.9%)"
  },
  indigo: {
    color: "hsl(226, 70%, 55.5%)",
    hue: "hsl(225, 77.4%, 82.1%)"
  },
  blue: {
    color: "hsl(206, 100%, 50%)",
    hue: "hsl(208, 77.5%, 76.9%)"
  },
  cyan: {
    color: "hsl(190, 95%, 39%)",
    hue: "hsl(189, 60.3%, 52.5%)"
  },
  green: {
    color: "hsl(151, 55%, 41.5%)",
    hue: "hsl(146, 38.5%, 69%)"
  },
  orange: {
    color: "hsl(24, 94%, 50%)",
    hue: "hsl(24, 100%, 75.3%)"
  }
};
var colorValues = Object.values(colors);
var getColorById = /* @__PURE__ */ __name((id) => {
  return colorValues[hashCode(id, colorValues.length)];
}, "getColorById");
var hashCode = /* @__PURE__ */ __name((string, mod) => {
  let hash = 0;
  if (!string || string.length === 0) return hash;
  for (let i = 0; i < string.length; i++) {
    const chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  if (mod) return Math.abs(hash % mod);
  return hash;
}, "hashCode");

// src/server.ts
var VgServer = class extends Server {
  static {
    __name(this, "VgServer");
  }
  gameConfig = {};
  gameState = { players: {}, gameData: {} };
  // Global game state (shared across all players)
  onConnect(connection) {
    const currentPlayerCount = Object.keys(this.gameState.players).length;
    if (this.gameConfig.maxPlayers && currentPlayerCount > this.gameConfig.maxPlayers) {
      connection.close(1e3, "Game is full");
      return;
    }
    const { color, hue } = getColorById(connection.id);
    const newPlayer = {
      id: connection.id,
      color,
      hue,
      lastUpdate: Date.now(),
      state: {},
      metadata: {}
    };
    this.gameState.players[connection.id] = newPlayer;
    const existingPlayers = {};
    Object.entries(this.gameState.players).forEach(([id, player]) => {
      if (id !== connection.id) {
        existingPlayers[id] = player;
      }
    });
    const syncMessage = {
      type: "game_sync",
      data: {
        players: existingPlayers,
        gameState: this.gameState.gameData
      },
      timestamp: Date.now()
    };
    connection.send(JSON.stringify(syncMessage));
    const joinMessage = {
      type: "player_joined",
      data: newPlayer,
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(joinMessage), [connection.id]);
  }
  onMessage(sender, message) {
    try {
      const clientMessage = JSON.parse(message);
      const player = this.gameState.players[sender.id];
      if (!player) return;
      switch (clientMessage.type) {
        case "player_state_update":
          this.handlePlayerStateUpdate(
            sender,
            clientMessage
          );
          break;
        case "game_state_update":
          this.handleGameStateUpdate(
            sender,
            clientMessage
          );
          break;
        case "game_action":
          this.handleGameAction(
            sender,
            clientMessage
          );
          break;
        case "join_game":
          this.handleJoinGame(
            sender,
            clientMessage
          );
          break;
        case "leave_game":
          this.handleLeaveGame(sender);
          break;
        case "custom":
          this.handleCustomMessage(sender, clientMessage);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }
  onClose(connection) {
    delete this.gameState.players[connection.id];
    const message = {
      type: "player_left",
      data: {
        id: connection.id
      },
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(message), []);
  }
  // Handler methods
  handlePlayerStateUpdate(sender, message) {
    const prevPlayer = this.gameState.players[sender.id];
    if (!prevPlayer) return;
    const updatedPlayer = {
      ...prevPlayer,
      state: {
        ...typeof prevPlayer.state === "object" && prevPlayer.state !== null ? prevPlayer.state : {},
        ...typeof message.data === "object" && message.data !== null ? message.data : {}
      },
      lastUpdate: Date.now()
    };
    this.gameState.players[sender.id] = updatedPlayer;
    const updateMessage = {
      type: "player_updated",
      data: updatedPlayer,
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(updateMessage), [sender.id]);
  }
  handleGameStateUpdate(sender, message) {
    this.gameState.gameData = { ...this.gameState.gameData, ...message.data };
    const syncMessage = {
      type: "game_sync",
      data: {
        players: this.gameState.players,
        gameState: this.gameState.gameData
      },
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(syncMessage), []);
  }
  handleGameAction(sender, message) {
    const eventMessage = {
      type: "game_event",
      data: {
        event: "player_action",
        payload: message.data,
        from: sender.id
      },
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(eventMessage), []);
  }
  handleJoinGame(sender, message) {
    if (message.data.config) {
      this.gameConfig = { ...this.gameConfig, ...message.data.config };
    }
    const prevPlayer = this.gameState.players[sender.id];
    if (prevPlayer && message.data.metadata) {
      const updatedPlayer = {
        ...prevPlayer,
        metadata: { ...prevPlayer.metadata, ...message.data.metadata },
        lastUpdate: Date.now()
      };
      this.gameState.players[sender.id] = updatedPlayer;
    }
  }
  handleLeaveGame(sender) {
    sender.close(1e3, "Player left game");
  }
  handleCustomMessage(sender, message) {
    const eventMessage = {
      type: "game_event",
      data: {
        event: "custom_message",
        payload: message.data,
        from: sender.id
      },
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(eventMessage), []);
  }
  // Utility methods
  getPlayer(playerId) {
    return this.gameState.players[playerId];
  }
  // Global game state management
  getGameState() {
    return this.gameState;
  }
  getPlayersMap() {
    return this.gameState.players;
  }
  setGameConfig(config) {
    this.gameConfig = { ...this.gameConfig, ...config };
  }
  getGameConfig() {
    return this.gameConfig;
  }
};
var server_default = {
  async fetch(request, env) {
    return await routePartykitRequest(request, env) || new Response("Not Found", { status: 404 });
  }
};

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-hsNFVR/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = server_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-hsNFVR/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  VgServer,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=server.js.map
