window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.ui = window.TerminalApp.ui || {};

(function (ui, utils) {
  const fmt = utils.format;

  ui.watchlist = {
    render(container, state, actions) {
      container.innerHTML = "";

      const filter = fmt.normalizeSymbol(state.watchlistFilter || "");

      const list = state.watchlist.filter(item => {
        return !filter ||
          item.symbol.includes(filter) ||
          item.market.includes(filter);
      });

      if (!list.length) {
        container.innerHTML = `<div class="empty-state">No symbols</div>`;
        return;
      }

      list.forEach(item => {
        const key = fmt.symbolKey(item);
        const q = state.quotes[key];

        const el = document.createElement("div");
        el.className = "watch-item";

        if (state.selectedKey === key) el.classList.add("active");

        el.innerHTML = `
          <div class="watch-item-top">
            <strong>${item.symbol}</strong>
            <span>${item.market}</span>
            <button data-remove="${key}">✕</button>
          </div>
          <div class="watch-item-bottom">
            <span>${q ? fmt.formatPrice(q.price) : "--"}</span>
            <span>${q ? fmt.formatTime(q.time) : ""}</span>
          </div>
        `;

        el.onclick = (e) => {
          if (e.target.dataset.remove) {
            e.stopPropagation();
            actions.remove(item.symbol, item.market);
          } else {
            actions.select(key);
          }
        };

        container.appendChild(el);
      });
    }
  };
})(window.TerminalApp.ui, window.TerminalApp.utils);
