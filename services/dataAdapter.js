window.TerminalApp = window.TerminalApp || {};
window.TerminalApp.services = window.TerminalApp.services || {};

(function (services, utils, config) {
  const fmt = utils.format;

  function normalizeQuote(input, fallback) {
    if (!input || typeof input !== "object") return null;

    const market = fmt.normalizeMarket(
      input.market ||
      input.exchange ||
      input.venue ||
      (fallback && fallback.market) ||
      ""
    );

    const symbol = fmt.normalizeSymbol(
      input.symbol ||
      input.stock ||
      input.ticker ||
      input.pair ||
      (fallback && fallback.symbol) ||
      ""
    );

    const priceCandidates = [
      input.price,
      input.last,
      input.lastPrice,
      input.tradePrice,
      input.close,
      input.bid,
      input.ask,
      input.value
    ];

    const volumeCandidates = [
      input.volume,
      input.size,
      input.qty,
      input.tradeSize,
      input.totalVolume
    ];

    const rawPrice = priceCandidates.find((value) => typeof value === "number" || typeof value === "string");
    const rawVolume = volumeCandidates.find((value) => typeof value === "number" || typeof value === "string");
    const price = Number(rawPrice);
    const volume = Number(rawVolume || 0);

    if (!symbol || !market || !Number.isFinite(price)) {
      return null;
    }

    return {
      symbol,
      market,
      price,
      volume: Number.isFinite(volume) ? volume : 0,
      time: fmt.toEpochMs(
        input.time ||
        input.timestamp ||
        input.ts ||
        input.datetime ||
        input.date ||
        Date.now()
      )
    };
  }

  function parseStructuredEnvelope(payload) {
    const output = {
      quotes: [],
      info: [],
      errors: [],
      malformed: false
    };

    if (Array.isArray(payload)) {
      payload.forEach((item) => {
        const quote = normalizeQuote(item);
        if (quote) {
          output.quotes.push(quote);
        }
      });
      return output;
    }

    if (!payload || typeof payload !== "object") {
      output.malformed = true;
      output.errors.push("Unsupported non-object payload");
      return output;
    }

    const direct = normalizeQuote(payload);
    if (direct) {
      output.quotes.push(direct);
      return output;
    }

    const candidateCollections = [
      payload.data,
      payload.payload,
      payload.message,
      payload.messages,
      payload.tick,
      payload.ticks,
      payload.quote,
      payload.quotes,
      payload.result,
      payload.results
    ];

    for (let index = 0; index < candidateCollections.length; index += 1) {
      const candidate = candidateCollections[index];
      if (!candidate) continue;

      if (Array.isArray(candidate)) {
        candidate.forEach((item) => {
          const quote = normalizeQuote(item, payload);
          if (quote) output.quotes.push(quote);
        });
      } else {
        const quote = normalizeQuote(candidate, payload);
        if (quote) output.quotes.push(quote);
      }
    }

    if (payload.type || payload.event || payload.status) {
      output.info.push(
        `Envelope: ${payload.type || payload.event || payload.status}`
      );
    }

    if (payload.error || payload.reason || payload.message === "error") {
      output.errors.push(
        String(payload.error || payload.reason || "Remote error")
      );
    }

    if (!output.quotes.length && !output.info.length && !output.errors.length) {
      output.malformed = true;
      output.errors.push("Message shape not recognized by adapter");
    }

    return output;
  }

  function parseTextPayload(raw) {
    const output = {
      quotes: [],
      info: [],
      errors: [],
      malformed: false
    };

    const trimmed = String(raw || "").trim();
    if (!trimmed) {
      output.malformed = true;
      output.errors.push("Empty text payload");
      return output;
    }

    const lines = trimmed.split(/\n+/);

    lines.forEach((line) => {
      const pieces = line.trim().split(/\s+/);
      if (pieces.length >= 4) {
        const
