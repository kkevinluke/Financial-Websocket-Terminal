window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.ui = window.TerminalApp.ui || {};

(function (ui, utils) {
  const fmt = utils.format;

  function getVar(name, fallback) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
  }

  ui.chart = {
    resize(canvas) {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
    },

    render(canvas, points, label) {
      if (!canvas) return;

      this.resize(canvas);

      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const pad = 30;

      ctx.clearRect(0, 0, w, h);

      if (!points || points.length < 2) {
        ctx.fillStyle = "#888";
        ctx.fillText("Waiting for data...", 20, h / 2);
        return;
      }

      const prices = points.map(p => p.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 1;

      const coords = points.map((p, i) => {
        return {
          x: pad + (i / (points.length - 1)) * (w - pad * 2),
          y: h - pad - ((p.price - min) / range) * (h - pad * 2)
        };
      });

      ctx.strokeStyle = getVar("--accent-2", "#4aa8ff");
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].y);
      coords.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      ctx.fillStyle = getVar("--muted", "#aaa");
      ctx.fillText(label || "", 10, 15);
      ctx.fillText(`High ${fmt.formatPrice(max)}`, w - 120, 20);
      ctx.fillText(`Low ${fmt.formatPrice(min)}`, w - 120, 40);
    }
  };
})(window.TerminalApp.ui, window.TerminalApp.utils);
