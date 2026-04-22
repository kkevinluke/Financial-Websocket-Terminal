window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.utils = window.TerminalApp.utils || {};

(function (ns) {
  function symbolKey(item) {
    return `${String(item.market || "").toUpperCase()}:${String(item.symbol || "").toUpperCase()}`;
  }

  function normalizeSymbol(text) {
    return String(text || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function normalizeMarket(text) {
    return String(text || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatTime(epochMs) {
    if (!epochMs) return "—";
    const date = new Date(epochMs);
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function formatDateTime(epochMs) {
    if (!epochMs) return "—";
    const date = new Date(epochMs);
    return `${date.toLocaleDateString()} ${formatTime(epochMs)}`;
  }

  function formatPrice(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    const decimals = Math.abs(value) >= 100 ? 2 : 4;
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatVolume(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${Math.round(value)}`;
  }

  function safeJsonParse(raw) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function now() {
    return Date.now();
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function toEpochMs(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value < 10_000_000_000 ? value * 1000 : value;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  ns.format = {
    symbolKey,
    normalizeSymbol,
    normalizeMarket,
    clamp,
    formatTime,
    formatDateTime,
    formatPrice,
    formatVolume,
    safeJsonParse,
    now,
    randomBetween,
    toEpochMs
  };
})(window.TerminalApp.utils);
