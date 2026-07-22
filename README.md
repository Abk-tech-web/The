# $INVENTO — The Little Elon

> Innovation is the real currency.

A premium, futuristic crypto marketing site for **$INVENTO ("The Little Elon")** — built with modular HTML/CSS/JS, a live on-chain dashboard, and a purple/blue neon glassmorphism aesthetic. Deployable as-is to **GitHub Pages** or **Vercel**, no build step required.

---

## 📁 Project structure

```
invento-website/
│
├── index.html              Homepage — hero, pillars, dashboard teaser, about teaser, CTA
├── about.html               Story, vision/mission, roadmap
├── dashboard.html            Live token dashboard
│
├── css/
│   ├── style.css              Design tokens, layout, components
│   ├── animations.css          Keyframes, entrance reveal, ambient motion
│   └── responsive.css          Breakpoints (mobile → large desktop)
│
├── js/
│   ├── config.js               ⚙️ Single source of truth — edit this file to go live
│   ├── app.js                  Loader, navbar, particles, parallax, scroll animations, socials
│   ├── api.js                  DexScreener / security API calls + caching + retry logic
│   └── dashboard.js             Renders the live dashboard from api.js data
│
├── assets/
│   ├── images/
│   │   └── invento-character.png   Character-only art (hero watermark, about page)
│   ├── logo/
│   │   ├── invento-banner.png       Full banner artwork (OG image)
│   │   └── invento-mark.png          Square mark (navbar / footer / loader)
│   └── icons/
│       ├── favicon.png
│       └── favicon.ico
│
├── robots.txt
├── sitemap.xml
├── manifest.json
└── README.md
```

---

## 🚀 Going live: setting the contract address

Every dashboard feature is gated on one value. Open **`js/config.js`** and set:

```js
TOKEN: {
  CONTRACT_ADDRESS: "YOUR_CONTRACT_ADDRESS_HERE",
  CHAIN: "solana",   // or "ethereum", "bsc", "base", "arbitrum", etc.
}
```

The moment that's set, `dashboard.html` automatically starts pulling live price, market cap, FDV, liquidity, volume, buys/sells, holders, supply, ATH/ATL, security status, and DEX links from DexScreener — refreshed every 30 seconds. No other file needs to change.

### Other things to update in `config.js`
| Setting | Where it shows up |
|---|---|
| `SOCIALS.X` | Enables the X icon (shown as an inert placeholder until set) |
| `SOCIALS.DISCORD` / `SOCIALS.WEBSITE` | Hidden entirely until a URL is set |
| `TOKEN.TOTAL_SUPPLY` / `TOKEN.MAX_SUPPLY` | Hardcode if not returned reliably by the API |
| `THEME.*` | Global color tokens — also read directly by `css/style.css` |
| `UX.WATERMARK_OPACITY` | Hero watermark opacity (spec: 5–10%) |

---

## 🖥️ Local preview

No build tools needed — it's static HTML/CSS/JS. Either:

- Open `index.html` directly in a browser, **or**
- Serve it locally to avoid any `file://` fetch restrictions:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8080
  ```

---

## 🌐 Deployment

### GitHub Pages
1. Push this folder to a GitHub repository.
2. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)`.
3. Save — your site publishes at `https://<username>.github.io/<repo>/`.

### Vercel
1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Other** (static site, no build command needed).
3. Deploy — Vercel serves the root directory as-is.

> After deploying, update the domain placeholders in `robots.txt`, `sitemap.xml`, and the Open Graph tags in each HTML `<head>` to match your live URL.

---

## 🎨 Design system

- **Palette:** neon purple `#8B5CF6` → electric blue `#3B82F6`, on a near-black `#0A0A0F` background
- **Type:** Space Grotesk (display) + Inter (body) + JetBrains Mono (data/labels)
- **Effects:** glassmorphism panels, canvas particle background, parallax hero watermark, GSAP scroll-triggered entrances, Lenis smooth scroll

All tokens live at the top of `css/style.css` as CSS custom properties (`:root`) and mirror `CONFIG.THEME` in `js/config.js` — change one, keep the other in sync.

---

## 🔒 Notes

- `js/config.js` freezes its objects at runtime — the dashboard/UI always reads a consistent snapshot.
- The dashboard shows one of three states automatically: **no contract set**, **error** (no cached data), or **live data** — no manual toggling required.
- This is not financial advice. Always verify contract addresses independently before trading.

---

© 2026 The Little Elon ($INVENTO)
