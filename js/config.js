/**
 * config.js
 * -----------------------------------------------------------------------
 * Central configuration for The Little Elon ($INVENTO) website.
 * Update CONTRACT_ADDRESS once the token is deployed/launched — every
 * other module (api.js, dashboard.js, app.js) reads from this file only.
 * -----------------------------------------------------------------------
 */

const CONFIG = {

  // ---------------------------------------------------------------------
  // TOKEN
  // ---------------------------------------------------------------------
  TOKEN: {
    NAME: "The Little Elon",
    SYMBOL: "$INVENTO",
    // Leave empty until the token launches. Every dashboard feature below
    // checks this value before attempting to fetch live data.
    CONTRACT_ADDRESS: "8gj1mT6aAm4wviexnNMJ1sjybCyXTMXrMD4MzKoGpump",
    // Chain the CA lives on. Used to build DexScreener / explorer URLs.
    // Common values: "ethereum", "solana", "bsc", "base", "arbitrum"
    CHAIN: "solana",
    DECIMALS: 9,
    TAGLINE: "Innovation is the real currency",
    TOTAL_SUPPLY: null,   // fetched live once CA is set, or hardcode a number
    MAX_SUPPLY: null      // fetched live once CA is set, or hardcode a number
  },

  // ---------------------------------------------------------------------
  // SOCIAL / EXTERNAL LINKS
  // ---------------------------------------------------------------------
  SOCIALS: {
    TELEGRAM: "https://t.me/TheLittleElon",
    // Placeholder — swap in the real profile URL when available.
    // Until then the X icon renders but links nowhere (handled in app.js).
    X: "",
    // Optional extras — leave blank to auto-hide the icon in the navbar/footer
    DISCORD: "",
    WEBSITE: ""
  },

  // ---------------------------------------------------------------------
  // API ENDPOINTS
  // ---------------------------------------------------------------------
  API: {
    DEXSCREENER_TOKEN: "https://api.dexscreener.com/latest/dex/tokens/",
    DEXSCREENER_PAIR: "https://api.dexscreener.com/latest/dex/pairs/",
    DEXSCREENER_SEARCH: "https://api.dexscreener.com/latest/dex/search/?q=",
    // Optional secondary sources for holders / security data.
    // These require no key for basic public endpoints; add key-based
    // providers here later (e.g. Birdeye, Moralis, GoPlus) if desired.
    GOPLUS_SECURITY: "https://api.gopluslabs.io/api/v1/token_security/",
    // Refresh cadence for the live dashboard, in milliseconds
    REFRESH_INTERVAL_MS: 30000,
    // How many retries on a failed fetch before showing an error state
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000
  },

  // ---------------------------------------------------------------------
  // THEME
  // ---------------------------------------------------------------------
  THEME: {
    PRIMARY: "#8B5CF6",     // neon purple
    PRIMARY_LIGHT: "#A78BFA",
    ACCENT: "#3B82F6",      // electric blue
    BG_DARK: "#0A0A0F",
    BG_PANEL: "rgba(255,255,255,0.04)",
    GLOW: "rgba(139, 92, 246, 0.45)",
    SUCCESS: "#22C55E",
    DANGER: "#EF4444"
  },

  // ---------------------------------------------------------------------
  // ASSET PATHS
  // ---------------------------------------------------------------------
  ASSETS: {
    LOGO_BANNER: "assets/logo/invento-banner.png",
    LOGO_MARK: "assets/logo/invento-mark.png",
    WATERMARK_CHARACTER: "assets/images/invento-character.png",
    FAVICON: "assets/icons/favicon.png"
  },

  // ---------------------------------------------------------------------
  // ANIMATION / UX TOGGLES
  // ---------------------------------------------------------------------
  UX: {
    WATERMARK_OPACITY: 0.08,       // 5-10% per spec
    ENABLE_PARALLAX: true,
    ENABLE_PARTICLES: true,
    ENABLE_LENIS_SMOOTH_SCROLL: true,
    LOADING_SCREEN_MIN_MS: 1200    // minimum time loader stays visible
  }
};

// Helper: is a real contract address configured yet?
CONFIG.hasContract = function () {
  return typeof CONFIG.TOKEN.CONTRACT_ADDRESS === "string" &&
         CONFIG.TOKEN.CONTRACT_ADDRESS.trim().length > 0;
};

// Freeze one level deep so nothing accidentally mutates shared config at runtime
Object.keys(CONFIG).forEach((key) => {
  if (typeof CONFIG[key] === "object" && CONFIG[key] !== null) {
    Object.freeze(CONFIG[key]);
  }
});

// Expose globally (non-module script tags) and via CommonJS/ESM if bundled later
if (typeof window !== "undefined") window.CONFIG = CONFIG;
if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
