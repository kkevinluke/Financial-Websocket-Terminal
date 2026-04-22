window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.services = window.TerminalApp.services || {};

(function (services) {
  const memoryFallback = {};

  function canUseLocalStorage() {
    try {
      const testKey = "__bft_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  const enabled = canUseLocalStorage();

  function getRaw(key) {
    return enabled ? window.localStorage.getItem(key) : memoryFallback[key] || null;
  }

  function setRaw(key, value) {
    if (enabled) {
      window.localStorage.setItem(key, value);
    } else {
      memoryFallback[key] = value;
    }
  }

  function remove(key) {
    if (enabled) {
      window.localStorage.removeItem(key);
    } else {
      delete memoryFallback[key];
    }
  }

  function getJson(key, fallbackValue) {
    const raw = getRaw(key);
    if (!raw) return fallbackValue;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function setJson(key, value) {
    setRaw(key, JSON.stringify(value));
  }

  services.storage = {
    enabled,
    getRaw,
    setRaw,
    getJson,
    setJson,
    remove
  };
})(window.TerminalApp.services);
