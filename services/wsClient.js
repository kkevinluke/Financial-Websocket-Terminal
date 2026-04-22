window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.services = window.TerminalApp.services || {};

(function (services, utils, config) {
  const fmt = utils.format;

  function WebSocketClient(options) {
    this.adapter = options.adapter;
    this.onTick = options.onTick;
    this.onInfo = options.onInfo;
    this.onError = options.onError;
    this.onStatus = options.onStatus;

    this.socket = null;
    this.heartbeatId = null;
    this.mockTimer = null;
    this.reconnectTimer = null;

    this.manualClose = false;
    this.mode = config.defaultMode;
    this.retryCount = 0;

    this.subscriptions = new Map();
    this.mockState = {};
  }

  // ---------------- MODE ----------------

  WebSocketClient.prototype.setMode = function (mode) {
    this.mode = mode === "live" ? "live" : "mock";
    this.onStatus({ kind: "mode", mode: this.mode });
  };

  WebSocketClient.prototype.setLiveConfig = function (liveConfig) {
    config.live.endpoint = liveConfig.endpoint;
    config.live.protocol = liveConfig.protocol;
  };

  WebSocketClient.prototype.getSubscriptionCount = function () {
    return this.subscriptions.size;
  };

  // ---------------- START / STOP ----------------

  WebSocketClient.prototype.start = function () {
    if (this.mode === "mock") {
      this.startMock();
    } else {
      this.connectLive();
    }
  };

  WebSocketClient.prototype.stop = function () {
    this.manualClose = true;
    this.clearTimers();

    if (this.socket) {
      try {
        this.socket.close(1000, "manual disconnect");
      } catch (error) {
        this.onError(`Socket close failed: ${error.message}`);
      }
      this.socket = null;
    }

    this.onStatus({
      kind: "connection",
      status: "disconnected",
      retryCount: this.retryCount
    });
  };

  WebSocketClient.prototype.restart = function () {
    this.manualClose = false;
    this.clearTimers();

    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        this.onError(`Socket reset failed: ${error.message}`);
      }
      this.socket = null;
    }

    this.start();
  };

  // ---------------- TIMERS ----------------

  WebSocketClient.prototype.clearTimers = function () {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatId);
    clearInterval(this.mockTimer);

    this.reconnectTimer = null;
    this.heartbeatId = null;
    this.mockTimer = null;
  };

  // ---------------- SUBSCRIPTIONS ----------------

  WebSocketClient.prototype.addSubscription = function (item) {
    const normalized = {
      market: fmt.normalizeMarket(item.market),
      symbol: fmt.normalizeSymbol(item.symbol)
    };

    const key = fmt.symbolKey(normalized);
    this.subscriptions.set(key, normalized);

    if (this.mode === "live" && this.socket?.readyState === WebSocket.OPEN) {
      this.sendFrame(this.adapter.buildSubscribe(normalized, config.live));
    }
  };

  WebSocketClient.prototype.removeSubscription = function (item) {
    const normalized = {
      market: fmt.normalizeMarket(item.market),
      symbol: fmt.normalizeSymbol(item.symbol)
    };

    const key = fmt.symbolKey(normalized);
    this.subscriptions.delete(key);

    if (this.mode === "live" && this.socket?.readyState === WebSocket.OPEN) {
      this.sendFrame(this.adapter.buildUnsubscribe(normalized, config.live));
    }
  };

  WebSocketClient.prototype.flushSubscriptions = function () {
    Array.from(this.subscriptions.values()).forEach((item) => {
      this.sendFrame(this.adapter.buildSubscribe(item, config.live));
    });

    this.onStatus({
      kind: "subscriptions",
      count: this.subscriptions.size
    });
  };

  // ---------------- SEND ----------------

  WebSocketClient.prototype.sendFrame = function (frame) {
    if (!frame || !this.socket) return;

    try {
      this.socket.send(frame);
      this.onInfo(`SEND → ${frame}`);
    } catch (error) {
      this.onError(`Send failed: ${error.message}`);
    }
  };

  // ---------------- LIVE CONNECTION ----------------

  WebSocketClient.prototype.connectLive = function () {
    this.clearTimers();
    this.manualClose = false;

    let endpoint = config.live.endpoint;

    if (!endpoint) {
      this.onError("No WebSocket endpoint configured");
      return;
    }

    // 🔐 Upgrade ws → wss automatically if on HTTPS
    if (location.protocol === "https:" && endpoint.startsWith("ws://")) {
      endpoint = endpoint.replace("ws://", "wss://");
    }

    try {
      this.onStatus({
        kind: "connection",
        status: "connecting",
        retryCount: this.retryCount
      });

      this.socket = new WebSocket(endpoint, config.live.subprotocols || []);
    } catch (error) {
      this.onError(`WebSocket creation failed: ${error.message}`);
      this.scheduleReconnect();
      return;
    }

    // -------- OPEN --------
    this.socket.onopen = () => {
      this.retryCount = 0;

      this.onInfo(`CONNECTED → ${endpoint}`);
      this.onInfo(`Origin → ${location.origin}`);

      this.onStatus({
        kind: "connection",
        status: "connected",
        retryCount: this.retryCount
      });

      this.flushSubscriptions();
      this.startHeartbeat();
    };

    // -------- MESSAGE --------
    this.socket.onmessage = (event) => {
      const parsed = this.adapter.parseIncoming(event.data);

      parsed.info.forEach((msg) => this.onInfo(msg));
      parsed.errors.forEach((err) => this.onError(err));

      parsed.quotes.forEach((q) => this.onTick(q));

      if (parsed.malformed && !parsed.quotes.length) {
        this.onError(`Malformed payload → ${String(event.data).slice(0, 200)}`);
      }
    };

    // -------- ERROR --------
    this.socket.onerror = () => {
      this.onError("WebSocket error, check endpoint / protocol / auth / origin");
      this.onStatus({
        kind: "connection",
        status: "error",
        retryCount: this.retryCount
      });
    };

    // -------- CLOSE --------
    this.socket.onclose = (event) => {
      this.onInfo(`CLOSED code=${event.code} reason=${event.reason || "n/a"}`);

      this.onStatus({
        kind: "connection",
        status: "disconnected",
        retryCount: this.retryCount
      });

      if (!this.manualClose && this.mode === "live") {
        this.scheduleReconnect();
      }
    };
  };

  // ---------------- HEARTBEAT ----------------

  WebSocketClient.prototype.startHeartbeat = function () {
    clearInterval(this.heartbeatId);

    if (!config.live.heartbeat.enabled) return;

    this.heartbeatId = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

      const frame = this.adapter.buildHeartbeat(config.live);
      if (frame) this.sendFrame(frame);
    }, config.live.heartbeat.intervalMs);
  };

  // ---------------- RECONNECT ----------------

  WebSocketClient.prototype.scheduleReconnect = function () {
    this.clearTimers();

    const r = config.live.reconnect;

    const delay =
      Math.min(
        r.maxDelayMs,
        r.initialDelayMs * Math.pow(r.multiplier, this.retryCount)
      ) + Math.random() * r.jitterMs;

    this.retryCount++;

    this.onInfo(`RECONNECT in ${Math.round(delay)}ms`);

    this.onStatus({
      kind: "reconnect",
      status: "waiting",
      retryCount: this.retryCount,
      delayMs: delay
    });

    this.reconnectTimer = setTimeout(() => {
      if (!this.manualClose && this.mode === "live") {
        this.connectLive();
      }
    }, delay);
  };

  // ---------------- MOCK MODE ----------------

  WebSocketClient.prototype.startMock = function () {
    this.clearTimers();

    this.onStatus({
      kind: "connection",
      status: "connected",
      retryCount: 0
    });

    this.onInfo("MOCK STREAM ACTIVE");

    this.mockTimer = setInterval(() => {
      const list = Array.from(this.subscriptions.values());
      if (!list.length) return;

      list.forEach((item) => {
        const key = fmt.symbolKey(item);

        const base =
          this.mockState[key] ||
          config.mock.basePrices?.[key] ||
          fmt.randomBetween(10, 1000);

        const move = base * fmt.randomBetween(-0.004, 0.004);
        const next = Math.max(0.0001, base + move);

        this.mockState[key] = next;

        this.onTick({
          market: item.market,
          symbol: item.symbol,
          price: next,
          volume: Math.round(fmt.randomBetween(100, 500000)),
          time: Date.now()
        });
      });
    }, config.mock.tickIntervalMs);
  };

  services.WebSocketClient = WebSocketClient;
})(window.TerminalApp.services, window.TerminalApp.utils, window.TerminalApp.CONFIG);
