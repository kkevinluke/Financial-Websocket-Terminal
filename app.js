window.TerminalApp = window.TerminalApp || {};

(function (app, config, services, ui, utils) {

  const fmt = utils.format;

  app.state = {
    watchlist: config.defaults.watchlist,
    quotes: {},
    ticks: [],
    chartSeries: {},
    terminalLines: [],
    errorLines: [],
    streamLines: [],
    selectedKey: "",
    mode: config.defaultMode
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

    app.state.watchlist.push(item);
    app.client.addSubscription(item);

    app.render();
  };

  app.removeSymbol = function (symbol) {
    app.state.watchlist =
      app.state.watchlist.filter(x => x.symbol !== symbol);

    app.render();
  };

  app.select = function (key) {
    app.state.selectedKey = key;
    app.render();
  };

  app.setMode = function (mode) {
    app.state.mode = mode;
    app.client.setMode(mode);
    app.client.restart();
  };

  app.connect = function () {
    app.client.start();
  };

  app.disconnect = function () {
    app.client.stop();
  };

  app.handleTick = function (q) {
    const key = fmt.symbolKey(q);

    app.state.quotes[key] = q;

    app.state.chartSeries[key] =
      app.state.chartSeries[key] || [];

    app.state.chartSeries[key].push(q);
    app.state.chartSeries[key] =
      app.state.chartSeries[key].slice(-60);

    app.state.streamLines.unshift({
      text: `${q.symbol} ${q.price}`
    });

    app.render();
  };

  app.render = function () {
    ui.watchlist.render(
      app.refs.watchlist,
      app.state,
      {
        remove: app.removeSymbol,
        select: app.select
      }
    );

    ui.terminal.render(app.refs.terminal, app.state.terminalLines);
    ui.terminal.renderErrors(app.refs.errors, app.state.errorLines);
    ui.terminal.renderStream(app.refs.stream, app.state.streamLines);

    const series =
      app.state.chartSeries[app.state.selectedKey] || [];

    ui.chart.render(
      app.refs.chart,
      series,
      app.state.selectedKey
    );
  };

  app.init = function () {
    app.refs = {
      watchlist: document.getElementById("watchlistContainer"),
      terminal: document.getElementById("terminalOutput"),
      errors: document.getElementById("errorLog"),
      stream: document.getElementById("streamLog"),
      chart: document.getElementById("chartCanvas")
    };

    app.client = new services.WebSocketClient({
      adapter: services.dataAdapter,
      onTick: app.handleTick,
      onInfo: (m) => app.addTerminalLine(m),
      onError: (e) => app.state.errorLines.push({ text: e }),
      onStatus: () => {}
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
