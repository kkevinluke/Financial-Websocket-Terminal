window.TerminalApp = window.TerminalApp || {};

window.TerminalApp.CONFIG = {
  appName: "Browser Financial Terminal",
  storageKeys: {
    watchlist: "bft.watchlist",
    theme: "bft.theme",
    mode: "bft.mode",
    endpoint: "bft.endpoint",
    protocol: "bft.protocol",
    selected: "bft.selected"
  },

  defaultMode: "mock",

  ui: {
    maxTicks: 120,
    maxLogLines: 160,
    maxErrorLines: 80,
    chartHistory: 80,
    renderThrottleMs: 90
  },

  defaults: {
    theme: "dark",
    market: "NASDAQ",
    endpoint: "wss://PATCH_ME",
    protocol: "json-command",
    selected: "NASDAQ:AAPL",
    watchlist: [
      { market: "NASDAQ", symbol: "AAPL" },
      { market: "NASDAQ", symbol: "MSFT" },
      { market: "NYSE", symbol: "GS" },
      { market: "FX", symbol: "EURUSD" }
    ]
  },

  live: {
    endpoint: "wss://PATCH_ME",
    subprotocols: [],
    protocol: "json-command",

    /*
      This repo clearly shows market/symbol CLI inputs and sample output shape,
      but it does not clearly publish a browser-ready websocket URL, subscribe frame,
      unsubscribe frame, auth flow, or heartbeat details in the visible README.
      Keep all protocol assumptions inside services/dataAdapter.js.
    */
    protocolNotes: {
      connectionUrl: "UNKNOWN_FROM_REPO",
      auth: "UNKNOWN_FROM_REPO",
      subscribeShape: "ASSUMED_IN_DATA_ADAPTER",
      unsubscribeShape: "ASSUMED_IN_DATA_ADAPTER",
      heartbeat: "ASSUMED_DISABLED_UNLESS_ENABLED"
    },

    reconnect: {
      initialDelayMs: 1200,
      maxDelayMs: 15000,
      multiplier: 1.8,
      jitterMs: 350
    },

    heartbeat: {
      enabled: false,
      intervalMs: 25000
    }
  },

  mock: {
    enabled: true,
    tickIntervalMs: 900,
    basePrices: {
      "NASDAQ:AAPL": 191.22,
      "NASDAQ:MSFT": 423.14,
      "NASDAQ:NVDA": 968.18,
      "NYSE:GS": 469.54,
      "NYSE:JPM": 204.77,
      "FX:EURUSD": 1.0864,
      "FX:GBPUSD": 1.2765,
      "FX:USDJPY": 154.21
    }
  }
};
