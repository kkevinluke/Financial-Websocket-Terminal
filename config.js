window.TerminalApp = window.TerminalApp || {};

(function () {
  const isGitHubPages =
    location.hostname.includes("github.io");

  window.TerminalApp.CONFIG = {
    appName: "Browser Financial Terminal",

    environment: {
      isGitHubPages,
      origin: location.origin,
      protocol: location.protocol
    },

    storageKeys: {
      watchlist: "bft.watchlist",
      theme: "bft.theme",
      mode: "bft.mode",
      endpoint: "bft.endpoint",
      protocol: "bft.protocol",
      selected: "bft.selected"
    },

    defaultMode: "mock",

    defaults: {
      theme: "dark",
      market: "NASDAQ",

      // safer default for hosted environment
      endpoint: isGitHubPages ? "" : "wss://PATCH_ME",
      protocol: "json-command",

      selected: "NASDAQ:AAPL",

      watchlist: [
        { market: "NASDAQ", symbol: "AAPL" },
        { market: "NASDAQ", symbol: "MSFT" },
        { market: "FX", symbol: "EURUSD" }
      ]
    },

    live: {
      endpoint: "",
      subprotocols: [],
      protocol: "json-command",

      reconnect: {
        initialDelayMs: 1200,
        maxDelayMs: 15000,
        multiplier: 1.8,
        jitterMs: 300
      },

      heartbeat: {
        enabled: false,
        intervalMs: 25000
      }
    },

    mock: {
      enabled: true,
      tickIntervalMs: 900
    },

    ui: {
      maxTicks: 120,
      maxLogLines: 160,
      maxErrorLines: 80,
      chartHistory: 80,
      renderThrottleMs: 90
    }
  };
})();
