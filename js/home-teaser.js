/**
 * home-teaser.js
 * -----------------------------------------------------------------------
 * Populates the small "Live once CONTRACT_ADDRESS is set" preview on the
 * homepage (index.html → .dash-teaser__preview) once a contract address
 * is configured. This is a lightweight one-way readout — the full
 * interactive dashboard with chart/security/DEX links lives on
 * dashboard.html and is handled by dashboard.js instead.
 *
 * Depends on: config.js, api.js (both must load before this file).
 * No-ops safely if this page has no .dash-teaser__preview section.
 * -----------------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".dash-teaser__preview");
  if (!preview || !window.CONFIG || !window.API) return;

  const priceEl = preview.querySelector('[data-teaser-metric="price"]');
  const mcapEl = preview.querySelector('[data-teaser-metric="marketcap"]');
  const liqEl = preview.querySelector('[data-teaser-metric="liquidity"]');
  const holdersEl = preview.querySelector('[data-teaser-metric="holders"]');
  const noteEl = preview.querySelector("[data-teaser-note]");

  if (!CONFIG.hasContract()) {
    // Nothing configured yet — leave the placeholders/note exactly as-is.
    return;
  }

  function fmtUsd(value) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: Math.abs(value) >= 1000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2
    }).format(value);
  }

  function fmtNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  }

  async function refresh() {
    const result = await API.getTokenData();

    if (result.status === "ok" || result.status === "stale") {
      const d = result.data;
      if (priceEl) priceEl.textContent = fmtUsd(d.priceUsd);
      if (mcapEl) mcapEl.textContent = fmtUsd(d.marketCap);
      if (liqEl) liqEl.textContent = fmtUsd(d.liquidityUsd);
      // Holders come from the GoPlus security check, which only covers
      // EVM chains — stays "—" on Solana and other unsupported chains.
      if (holdersEl) holdersEl.textContent = fmtNumber(d.security?.holderCount);

      if (noteEl) {
        noteEl.innerHTML = result.status === "ok"
          ? '<span class="hero__ticker-dot" style="display:inline-block;margin-right:8px;vertical-align:middle;"></span>Live — updates every 30s'
          : "Showing last known data — retrying…";
      }
    } else if (result.status === "error" && noteEl) {
      noteEl.textContent = "Couldn't load live data yet — check back shortly.";
    }
  }

  refresh();
  setInterval(refresh, (CONFIG.API && CONFIG.API.REFRESH_INTERVAL_MS) || 30000);
});
