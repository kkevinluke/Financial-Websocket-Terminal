window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.ui = window.TerminalApp.ui || {};

(function (ui) {

  function tokenize(cmd) {
    return cmd.trim().split(/\s+/);
  }

  ui.terminal = {
    render(container, lines) {
      container.innerHTML = "";

      lines.forEach(l => {
        const row = document.createElement("div");
        row.className = `term-line ${l.level || "info"}`;
        row.textContent = l.text;
        container.appendChild(row);
      });

      container.scrollTop = container.scrollHeight;
    },

    renderErrors(container, lines) {
      container.innerHTML = "";

      lines.forEach(l => {
        const row = document.createElement("div");
        row.className = "err-line";
        row.textContent = l.text;
        container.appendChild(row);
      });
    },

    renderStream(container, lines) {
      container.innerHTML = "";

      lines.forEach(l => {
        const row = document.createElement("div");
        row.className = "log-line";
        row.textContent = l.text;
        container.appendChild(row);
      });
    },

    execute(app, input) {
      const t = tokenize(input);
      const cmd = t[0]?.toLowerCase();

      app.addTerminalLine(`$ ${input}`);

      switch (cmd) {
        case "help":
          app.addTerminalLine("add NASDAQ AAPL");
          app.addTerminalLine("remove AAPL");
          app.addTerminalLine("mode live");
          app.addTerminalLine("connect");
          break;

        case "add":
          app.addSymbol(t[2], t[1]);
          break;

        case "remove":
          app.removeSymbol(t[1]);
          break;

        case "mode":
          app.setMode(t[1]);
          break;

        case "connect":
          app.connect();
          break;

        case "disconnect":
          app.disconnect();
          break;

        default:
          app.addTerminalLine("Unknown command", "error");
      }
    }
  };
})(window.TerminalApp.ui);
