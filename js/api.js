/**
 * api.js
 * -----------------------------------------------------------------------
 * All network calls for live token data live here. Nothing in this file
 * touches the DOM — it only fetches and normalizes data. dashboard.js
 * consumes what this file returns.
 * -----------------------------------------------------------------------
 */

const API = (function () {

  let lastGoodData = null;   // simple in-memory cache to fall back on
  let retryCount = 0;

  // -----------------------------------------------------------------
  // Low-level fetch helper with timeout + retry
  // -----------------------------------------------------------------
  async function fetchWithRetry(url, options = {}, attempt = 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeout);

      if (attempt < CONFIG.API.MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, CONFIG.API.RETRY_DELAY_MS));
        return fetchWithRetry(url, options, attempt + 1);
      }
      throw err;
    }
  }

  // -----------------------------------------------------------------
  // DexScreener: token → best pair
  // -----------------------------------------------------------------
  async function fetchDexscreenerToken(contractAddress) {
    const url = `${CONFIG.API.DEXSCREENER_TOKEN}${contractAddress}`;
    const data = await fetchWithRetry(url);

    if (!data || !Array.isArray(data.pairs) || data.pairs.length === 0) {
      throw new Error("No trading pairs found for this contract yet.");
    }

    // Pick the pair with the highest liquidity as the "primary" pair
    const sorted = [...data.pairs].sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );
    return sorted[0];
  }

  // -----------------------------------------------------------------
  // DexScreener: specific pair by pair address (optional direct path)
  // -----------------------------------------------------------------
  async function fetchDexscreenerPair(chainId, pairAddress) {
    const url = `${CONFIG.API.DEXSCREENER_PAIR}${chainId}/${pairAddress}`;
    const data = await fetchWithRetry(url);
    if (!data || !Array.isArray(data.pairs) || data.pairs.length === 0) {
      throw new Error("Pair not found.");
    }
    return data.pairs[0];
  }

  // -----------------------------------------------------------------
  // GoPlus security check (best-effort; chain-dependent)
  // -----------------------------------------------------------------
  async function fetchSecurity(contractAddress, chainId) {
    // GoPlus expects numeric chain ids for EVM chains; skip gracefully
    // for non-EVM chains (e.g. Solana) where this endpoint doesn't apply.
    const evmChainIds = {
      ethereum: "1",
      bsc: "56",
      base: "8453",
      arbitrum: "42161",
      polygon: "137"
    };
    const numericId = evmChainIds[chainId];
    if (!numericId) return null;

    try {
      const url = `${CONFIG.API.GOPLUS_SECURITY}${numericId}?contract_addresses=${contractAddress}`;
      const data = await fetchWithRetry(url);
      const result = data?.result?.[contractAddress.toLowerCase()];
      if (!result) return null;

      return {
        isHoneypot: result.is_honeypot === "1",
        isOpenSource: result.is_open_source === "1",
        isMintable: result.is_mintable === "1",
        ownerRenounced: result.owner_address === "0x0000000000000000000000000000000000000000",
        buyTax: parseFloat(result.buy_tax || "0") * 100,
        sellTax: parseFloat(result.sell_tax || "0") * 100,
        holderCount: result.holder_count ? parseInt(result.holder_count, 10) : null
      };
    } catch (err) {
      console.warn("Security check unavailable:", err.message);
      return null;
    }
  }

  // -----------------------------------------------------------------
  // Normalize raw DexScreener pair data into the shape dashboard.js wants
  // -----------------------------------------------------------------
  function normalize(pair, security) {
    const priceUsd = parseFloat(pair.priceUsd || "0");
    const priceChange = pair.priceChange || {};
    const volume = pair.volume || {};
    const txns = pair.txns || {};

    return {
      // Core price info
      priceUsd,
      priceNative: parseFloat(pair.priceNative || "0"),
      priceChange1h: priceChange.h1 ?? null,
      priceChange6h: priceChange.h6 ?? null,
      priceChange24h: priceChange.h24 ?? null,

      // Market metrics
      marketCap: pair.marketCap ?? pair.fdv ?? null,
      fdv: pair.fdv ?? null,
      liquidityUsd: pair.liquidity?.usd ?? null,

      // Volume
      volume24h: volume.h24 ?? null,
      volume6h: volume.h6 ?? null,
      volume1h: volume.h1 ?? null,

      // Buys / sells (24h)
      buys24h: txns.h24?.buys ?? null,
      sells24h: txns.h24?.sells ?? null,

      // Supply (from config if hardcoded, otherwise null until a supply
      // API is wired up — DexScreener doesn't reliably return this)
      circulatingSupply: CONFIG.TOKEN.TOTAL_SUPPLY,
      totalSupply: CONFIG.TOKEN.TOTAL_SUPPLY,
      maxSupply: CONFIG.TOKEN.MAX_SUPPLY,

      // ATH/ATL — DexScreener does not expose these directly; left null
      // here and computed client-side over time in dashboard.js by
      // tracking the highest/lowest priceUsd seen per session, or wired
      // to a paid API later.
      ath: null,
      atl: null,

      // Chart
      chartUrl: pair.url || null,
      pairAddress: pair.pairAddress || null,
      dexId: pair.dexId || null,
      chainId: pair.chainId || null,
      quoteToken: pair.quoteToken?.symbol || null,
      baseToken: pair.baseToken?.symbol || null,

      // Security
      security: security || null,

      // Links
      dexUrl: pair.url || null,
      pairCreatedAt: pair.pairCreatedAt || null,

      // Freshness
      fetchedAt: Date.now()
    };
  }

  // -----------------------------------------------------------------
  // Public: get full dashboard payload for the configured contract
  // -----------------------------------------------------------------
  async function getTokenData() {
    if (!CONFIG.hasContract()) {
      return { status: "no-contract" };
    }

    try {
      const pair = await fetchDexscreenerToken(CONFIG.TOKEN.CONTRACT_ADDRESS);
      const security = await fetchSecurity(
        CONFIG.TOKEN.CONTRACT_ADDRESS,
        pair.chainId || CONFIG.TOKEN.CHAIN
      );

      const normalized = normalize(pair, security);
      lastGoodData = normalized;
      retryCount = 0;

      return { status: "ok", data: normalized };
    } catch (err) {
      retryCount += 1;
      console.error("API.getTokenData failed:", err.message);

      if (lastGoodData) {
        return { status: "stale", data: lastGoodData, error: err.message };
      }
      return { status: "error", error: err.message };
    }
  }

  // -----------------------------------------------------------------
  // Public: build a DexScreener chart embed URL for iframe usage
  // -----------------------------------------------------------------
  function getChartEmbedUrl(pairAddress, chainId) {
    if (!pairAddress || !chainId) return null;
    return `https://dexscreener.com/${chainId}/${pairAddress}?embed=1&theme=dark&trades=0&info=0`;
  }

  return {
    getTokenData,
    getChartEmbedUrl,
    fetchDexscreenerToken,
    fetchDexscreenerPair
  };
})();

if (typeof window !== "undefined") window.API = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;
