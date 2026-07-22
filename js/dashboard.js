/**
 * dashboard.js
 * -----------------------------------------------------------------------
 * Renders the live token dashboard (dashboard.html) using data from
 * api.js. Handles three states:
 *   1. "no-contract" — CONFIG.TOKEN.CONTRACT_ADDRESS is still empty
 *   2. "ok" / "stale" — data available (stale = last good cache after
 *      a failed refresh, shown with a warning badge)
 *   3. "error" — no data available at all yet
 *
 * Auto-refreshes on CONFIG.API.REFRESH_INTERVAL_MS (default 30s).
 * -----------------------------------------------------------------------
 */

const Dashboard = (function () {

  let refreshTimer = null;
  let sessionHigh = null; // session-tracked ATH fallback
  let sessionLow = null;  // session-tracked ATL fallback

  // -----------------------------------------------------------------
  // Formatting helpers
  // -----------------------------------------------------------------
  function fmtUsd(value, opts = {}) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    const { compact = true, decimals } = opts;

    if (compact && Math.abs(value) >= 1000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2
      }).format(value);
    }

    const dp = decimals !== undefined ? decimals : (Math.abs(value) < 1 ? 6 : 2);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: dp,
      maximumFractionDigits: dp
    }).format(value);
  }

  function fmtNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  }

  function fmtPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((el) => (el.textContent = value));
  }

  function setPercentClass(el, value) {
    el.classList.remove("is-up", "is-down", "is-flat");
    if (value === null || value === undefined || isNaN(value)) {
      el.classList.add("is-flat");
    } else if (value > 0) {
      el.classList.add("is-up");
    } else if (value < 0) {
      el.classList.add("is-down");
    } else {
      el.classList.add("is-flat");
    }
  }

  // -----------------------------------------------------------------
  // State views
  // -----------------------------------------------------------------
  function showState(state) {
    document.querySelectorAll("[data-dash-state]").forEach((el) => {
      el.classList.toggle("is-visible", el.getAttribute("data-dash-state") === state);
    });
  }

  // -----------------------------------------------------------------
  // Render the "no contract configured yet" placeholder
  // -----------------------------------------------------------------
  function renderNoContract() {
    showState("no-contract");
    stopAutoRefresh();
  }

  // -----------------------------------------------------------------
  // Render an error state (first load failed, nothing cached)
  // -----------------------------------------------------------------
  function renderError(message) {
    showState("error");
    const el = document.querySelector("[data-error-message]");
    if (el) el.textContent = message || "Unable to load live token data right now.";
  }

  // -----------------------------------------------------------------
  // Render the full dashboard from normalized API data
  // -----------------------------------------------------------------
  function renderData(data, isStale) {
    showState("data");

    const staleBadge = document.querySelector("[data-stale-badge]");
    if (staleBadge) staleBadge.classList.toggle("is-visible", !!isStale);

    // Track session high/low as an ATH/ATL fallback since DexScreener's
    // public endpoint doesn't expose true all-time figures.
    if (data.priceUsd) {
      sessionHigh = sessionHigh === null ? data.priceUsd : Math.max(sessionHigh, data.priceUsd);
      sessionLow = sessionLow === null ? data.priceUsd : Math.min(sessionLow, data.priceUsd);
    }

    // Price + change
    setText("[data-metric='price']", fmtUsd(data.priceUsd, { compact: false }));

    document.querySelectorAll("[data-metric='change24h']").forEach((el) => {
      el.textContent = fmtPercent(data.priceChange24h);
      setPercentClass(el, data.priceChange24h);
    });
    document.querySelectorAll("[data-metric='change1h']").forEach((el) => {
      el.textContent = fmtPercent(data.priceChange1h);
      setPercentClass(el, data.priceChange1h);
    });
    document.querySelectorAll("[data-metric='change6h']").forEach((el) => {
      el.textContent = fmtPercent(data.priceChange6h);
      setPercentClass(el, data.priceChange6h);
    });

    // Market metrics
    setText("[data-metric='marketcap']", fmtUsd(data.marketCap));
    setText("[data-metric='fdv']", fmtUsd(data.fdv));
    setText("[data-metric='liquidity']", fmtUsd(data.liquidityUsd));
    setText("[data-metric='volume24h']", fmtUsd(data.volume24h));

    // Buys / sells
    setText("[data-metric='buys24h']", fmtNumber(data.buys24h));
    setText("[data-metric='sells24h']", fmtNumber(data.sells24h));
    renderBuySellBar(data.buys24h, data.sells24h);

    // Holders (from security payload if available)
    const holders = data.security?.holderCount ?? null;
    setText("[data-metric='holders']", holders ? fmtNumber(holders) : "—");

    // Supply
    setText("[data-metric='circulating']", data.circulatingSupply ? fmtNumber(data.circulatingSupply) : "—");
    setText("[data-metric='totalsupply']", data.totalSupply ? fmtNumber(data.totalSupply) : "—");
    setText("[data-metric='maxsupply']", data.maxSupply ? fmtNumber(data.maxSupply) : "—");

    // ATH / ATL (session-tracked fallback, clearly labeled in dashboard.html)
    setText("[data-metric='ath']", fmtUsd(data.ath ?? sessionHigh, { compact: false }));
    setText("[data-metric='atl']", fmtUsd(data.atl ?? sessionLow, { compact: false }));

    // Pair info
    setText("[data-metric='dex']", data.dexId || "—");
    setText("[data-metric='pair']", data.baseToken && data.quoteToken ? `${data.baseToken}/${data.quoteToken}` : "—");
    setText("[data-metric='chain']", data.chainId || CONFIG.TOKEN.CHAIN);

    // DEX link buttons
    document.querySelectorAll("[data-dex-link]").forEach((link) => {
      if (data.dexUrl) {
        link.href = data.dexUrl;
        link.classList.remove("is-disabled");
      } else {
        link.classList.add("is-disabled");
      }
    });

    // Chart embed
    renderChart(data);

    // Security panel
    renderSecurity(data.security);

    // Last updated
    setText("[data-last-updated]", new Date(data.fetchedAt).toLocaleTimeString());
  }

  // -----------------------------------------------------------------
  // Buy/sell ratio bar
  // -----------------------------------------------------------------
  function renderBuySellBar(buys, sells) {
    const bar = document.querySelector("[data-buysell-bar]");
    if (!bar) return;

    const buyEl = bar.querySelector("[data-buysell-fill='buys']");
    const sellEl = bar.querySelector("[data-buysell-fill='sells']");
    if (!buyEl || !sellEl) return;

    const total = (buys || 0) + (sells || 0);
    if (total === 0) {
      buyEl.style.width = "50%";
      sellEl.style.width = "50%";
      return;
    }
    const buyPct = ((buys || 0) / total) * 100;
    buyEl.style.width = `${buyPct}%`;
    sellEl.style.width = `${100 - buyPct}%`;
  }

  // -----------------------------------------------------------------
  // Chart iframe embed (DexScreener)
  // -----------------------------------------------------------------
  function renderChart(data) {
    const frame = document.querySelector("[data-chart-frame]");
    if (!frame) return;

    if (data.pairAddress && data.chainId) {
      const url = API.getChartEmbedUrl(data.pairAddress, data.chainId);
      if (frame.getAttribute("src") !== url) {
        frame.setAttribute("src", url);
      }
      frame.classList.remove("is-hidden");
    } else {
      frame.classList.add("is-hidden");
    }
  }

  // -----------------------------------------------------------------
  // Security status panel
  // -----------------------------------------------------------------
  function renderSecurity(security) {
    const panel = document.querySelector("[data-security-panel]");
    if (!panel) return;

    if (!security) {
      panel.classList.add("is-unavailable");
      const note = panel.querySelector("[data-security-note]");
      if (note) note.textContent = "Security data unavailable for this chain/pair.";
      return;
    }

    panel.classList.remove("is-unavailable");

    const rows = {
      honeypot: security.isHoneypot,
      "open-source": security.isOpenSource,
      renounced: security.ownerRenounced,
      mintable: security.isMintable
    };

    Object.entries(rows).forEach(([key, value]) => {
      const el = panel.querySelector(`[data-security-flag='${key}']`);
      if (!el) return;
      el.classList.remove("is-good", "is-bad", "is-neutral");

      // "Good" mapping differs per flag (e.g. honeypot=false is good,
      // renounced=true is good)
      const goodWhenTrue = key === "open-source" || key === "renounced";
      const isGood = goodWhenTrue ? value === true : value === false;

      el.classList.add(value === null || value === undefined ? "is-neutral" : (isGood ? "is-good" : "is-bad"));
      el.textContent = value === null || value === undefined ? "N/A" : (value ? "Yes" : "No");
    });

    setText("[data-metric='buytax']", security.buyTax !== null ? `${security.buyTax.toFixed(1)}%` : "—");
    setText("[data-metric='selltax']", security.sellTax !== null ? `${security.sellTax.toFixed(1)}%` : "—");
  }

  // -----------------------------------------------------------------
  // Fetch + render cycle
  // -----------------------------------------------------------------
  async function refresh() {
    const result = await API.getTokenData();

    if (result.status === "no-contract") {
      renderNoContract();
      return;
    }
    if (result.status === "ok") {
      renderData(result.data, false);
      return;
    }
    if (result.status === "stale") {
      renderData(result.data, true);
      return;
    }
    // status === "error" with nothing cached yet
    renderError(result.error);
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    const interval = (window.CONFIG && CONFIG.API.REFRESH_INTERVAL_MS) || 30000;
    refreshTimer = setInterval(refresh, interval);
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  // -----------------------------------------------------------------
  // Init — only runs meaningful work if dashboard markup is present
  // -----------------------------------------------------------------
  function init() {
    if (!document.querySelector("[data-dash-state]")) return; // not on dashboard.html
    if (!window.CONFIG || !window.API) return;

    if (!CONFIG.hasContract()) {
      renderNoContract();
      return;
    }

    refresh();
    startAutoRefresh();

    // Pause refresh when tab is hidden, resume when visible again
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else if (CONFIG.hasContract()) {
        refresh();
        startAutoRefresh();
      }
    });

    // Manual refresh button, if present
    document.querySelectorAll("[data-refresh-now]").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.add("is-spinning");
        refresh().finally(() => {
          setTimeout(() => btn.classList.remove("is-spinning"), 500);
        });
      });
    });
  }

  return { init, refresh };
})();

document.addEventListener("DOMContentLoaded", Dashboard.init);
