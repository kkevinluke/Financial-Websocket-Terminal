window.TerminalApp = window.TerminalApp || {};

(function (app, config, services, ui, utils) {

  const fmt = utils.format;

  app.state = {
    watchlist: config.defaults.watchlist,
    watchlistFilter: "",
    quotes: {},
    ticks: [],
    chartSeries: {},
    terminalLines: [],
    errorLines: [],
    streamLines: [],
    selectedKey: config.defaults.selected,
    mode: config.defaultMode,
    connection: { status: "idle", retryCount: 0 }
  };

  app.refs = {};
  app.client = null;

  app.addTerminalLine = function (t, lvl) {
    app.state.terminalLines.push({ text: t, level: lvl });
    app.render();
  };

  app.addSymbol = function (symbol, market) {
    const item = {
      symbol: fmt.normalizeSymbol(symbol),
      market: fmt.normalizeMarket(market)
    };

    if (!item.symbol || !item.market) return;

    // Avoid duplicates
    const key = fmt.symbolKey(item);
    const exists = app.state.watchlist.some(x => fmt.symbolKey(x) === key);
    if (exists) return;

    app.state.watchlist.push(item);
    app.client.addSubscription(item);

    app.render();
  };

  app.removeSymbol = function (symbol) {
    const norm = fmt.normalizeSymbol(symbol);
    const item = app.state.watchlist.find(x => x.symbol === norm);

    if (item) {
      app.client.removeSubscription(item);
      app.state.watchlist = app.state.watchlist.filter(x => x.symbol !== norm);

      const key = fmt.symbolKey(item);
      if (app.state.selectedKey === key) {
        app.state.selectedKey = "";
      }
    }

    app.render();
  };

  app.select = function (key) {
    app.state.selectedKey = key;
    app.render();
  };

  app.setMode = function (mode) {
    app.state.mode = mode === "live" ? "live" : "mock";
    app.client.setMode(app.state.mode);
    app.client.restart();
    app.render();
  };

  app.connect = function () {
    app.client.start();
  };

  app.disconnect = function () {
    app.client.stop();
  };

  app.updateSearch = function (val) {
    app.state.watchlistFilter = val;
    app.render();
  };

  app.handleTick = function (q) {
    const key = fmt.symbolKey(q);

    app.state.quotes[key] = q;

    // Add to ticks table
    app.state.ticks.unshift(q);
    app.state.ticks = app.state.ticks.slice(0, 50);

    app.state.chartSeries[key] =
      app.state.chartSeries[key] || [];

    app.state.chartSeries[key].push(q);
    app.state.chartSeries[key] =
      app.state.chartSeries[key].slice(-60);

    app.state.streamLines.unshift({
      text: `[${fmt.formatTime(q.time)}] ${q.market}:${q.symbol} @ ${fmt.formatPrice(q.price)}`
    });
    app.state.streamLines = app.state.streamLines.slice(0, config.ui.maxLogLines);

    app.render();
  };

  app.render = function () {
    // 1. Watchlist
    ui.watchlist.render(
      app.refs.watchlist,
      app.state,
      {
        remove: app.removeSymbol,
        select: app.select
      }
    );

    // 2. Summary Cards
    const selected = app.state.quotes[app.state.selectedKey];
    app.refs.selectedSymbol.textContent = app.state.selectedKey || "No symbol selected";
    app.refs.selectedPrice.textContent = selected ? fmt.formatPrice(selected.price) : "—";
    app.refs.selectedTime.textContent = selected ? fmt.formatTime(selected.time) : "—";
    app.refs.selectedVolume.textContent = selected ? `Volume ${fmt.formatVolume(selected.volume)}` : "Volume —";

    // 3. Status Pill & Meta
    const conn = app.state.connection;
    app.refs.connectionPill.className = `status-pill ${conn.status}`;
    app.refs.connectionText.textContent = conn.status;
    app.refs.modeLabel.textContent = `MODE: ${app.state.mode.toUpperCase()}`;
    app.refs.subscriptionCount.textContent = `SUBS: ${app.client.getSubscriptionCount()}`;
    app.refs.reconnectInfo.textContent = `RETRY: ${conn.retryCount || 0}`;

    // 4. Endpoint info
    if (app.state.mode === "mock") {
      app.refs.endpointLabel.textContent = "mock://local-stream";
      app.refs.protocolLabel.textContent = "Protocol adapter: mock";
    } else {
      app.refs.endpointLabel.textContent = config.live.endpoint || "wss://PENDING";
      app.refs.protocolLabel.textContent = `Protocol adapter: ${config.live.protocol}`;
    }

    // 5. Logs & Terminal
    ui.terminal.render(app.refs.terminal, app.state.terminalLines);
    ui.terminal.renderErrors(app.refs.errors, app.state.errorLines);
    ui.terminal.renderStream(app.refs.stream, app.state.streamLines);

    // 6. Ticks Table
    app.refs.ticksBody.innerHTML = "";
    app.state.ticks.forEach(t => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${fmt.formatTime(t.time)}</td>
        <td>${t.market}</td>
        <td>${t.symbol}</td>
        <td>${fmt.formatPrice(t.price)}</td>
        <td>${fmt.formatVolume(t.volume)}</td>
      `;
      app.refs.ticksBody.appendChild(row);
    });

    // 7. Chart
    const series =
      app.state.chartSeries[app.state.selectedKey] || [];

    ui.chart.render(
      app.refs.chart,
      series,
      app.state.selectedKey
    );

    // 8. Footer
    app.refs.footerConnection.textContent = `Status: ${conn.status}`;
    app.refs.footerSubscriptions.textContent = `Active subscriptions: ${app.client.getSubscriptionCount()}`;
    app.refs.footerSelected.textContent = `Selected: ${app.state.selectedKey || "—"}`;
  };

  app.init = function () {
    app.refs = {
      watchlist: document.getElementById("watchlistContainer"),
      terminal: document.getElementById("terminalOutput"),
      errors: document.getElementById("errorLog"),
      stream: document.getElementById("streamLog"),
      chart: document.getElementById("chartCanvas"),

      addForm: document.getElementById("addForm"),
      marketSelect: document.getElementById("marketSelect"),
      symbolInput: document.getElementById("symbolInput"),
      connectButton: document.getElementById("connectButton"),
      disconnectButton: document.getElementById("disconnectButton"),
      modeToggle: document.getElementById("modeToggle"),
      watchlistSearch: document.getElementById("watchlistSearch"),

      selectedSymbol: document.getElementById("selectedSymbolLabel"),
      selectedPrice: document.getElementById("selectedPriceLabel"),
      selectedTime: document.getElementById("selectedTimeLabel"),
      selectedVolume: document.getElementById("selectedVolumeLabel"),

      connectionPill: document.getElementById("connectionStatusPill"),
      connectionText: document.getElementById("connectionStatusText"),
      modeLabel: document.getElementById("modeLabel"),
      subscriptionCount: document.getElementById("subscriptionCount"),
      reconnectInfo: document.getElementById("reconnectInfo"),

      endpointLabel: document.getElementById("endpointLabel"),
      protocolLabel: document.getElementById("protocolLabel"),

      ticksBody: document.getElementById("ticksTableBody"),
      commandForm: document.getElementById("commandForm"),
      commandInput: document.getElementById("commandInput"),

      footerConnection: document.getElementById("footerConnection"),
      footerSubscriptions: document.getElementById("footerSubscriptions"),
      footerSelected: document.getElementById("footerSelected")
    };

    app.client = new services.WebSocketClient({
      adapter: services.dataAdapter,
      onTick: app.handleTick,
      onInfo: (m) => app.addTerminalLine(m),
      onError: (e) => {
        app.state.errorLines.unshift({ text: e });
        app.state.errorLines = app.state.errorLines.slice(0, config.ui.maxErrorLines);
        app.render();
      },
      onStatus: (s) => {
        if (s.kind === "connection") {
          app.state.connection = s;
        }
        app.render();
      }
    });

    // Event Listeners
    app.refs.addForm.onsubmit = (e) => {
      e.preventDefault();
      app.addSymbol(app.refs.symbolInput.value, app.refs.marketSelect.value);
      app.refs.symbolInput.value = "";
    };

    app.refs.connectButton.onclick = () => app.connect();
    app.refs.disconnectButton.onclick = () => app.disconnect();

    app.refs.modeToggle.onchange = (e) => {
      app.setMode(e.target.checked ? "live" : "mock");
    };

    app.refs.watchlistSearch.oninput = (e) => {
      app.updateSearch(e.target.value);
    };

    app.refs.commandForm.onsubmit = (e) => {
      e.preventDefault();
      const val = app.refs.commandInput.value;
      if (val) {
        ui.terminal.execute(app, val);
        app.refs.commandInput.value = "";
      }
    };

    // Populate suggestions
    const suggestions = document.getElementById("symbolSuggestions");
    (window.TerminalApp.SYMBOL_SUGGESTIONS || []).forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.symbol;
      opt.textContent = `${s.market}: ${s.symbol}`;
      suggestions.appendChild(opt);
    });

    app.client.start();
    app.render();
  };

  window.addEventListener("DOMContentLoaded", app.init);

})(window.TerminalApp,
   window.TerminalApp.CONFIG,
   window.TerminalApp.services,
   window.TerminalApp.ui,
   window.TerminalApp.utils);
