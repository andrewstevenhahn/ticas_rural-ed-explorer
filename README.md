# TICAS Rural Reconnect Explorer

An interactive map tool for exploring rural education data across U.S. commuting zones and counties, developed by [The Institute for College Access and Success (TICAS)](https://ticas.org/) in partnership with [MDRC](https://www.mdrc.org/).

> **Status:** Beta — actively under development

---

## About

<!--
  What is this tool? Who is it for? What questions is it meant to answer?
  e.g. "This tool allows researchers, policymakers, and the public to explore..."
-->

---

## Features

- Interactive choropleth map of U.S. commuting zones colored by rural population share
- Filter commuting zones by population and rural percentage
- Search by city or county name to locate a zone
- Click a commuting zone to view:
  - Name, population, % rural, states covered, and commuting containment metric
  - County-level rural breakdown (click a bar to drill into that county)
  - Race/ethnicity demographics
  - Educational attainment
  - Median income by education level
  - Local institutions (public and private non-profit)
- Click a county on the map or in the chart to drill down to county-level data
- "Return to Commuting Zone" and "Reset Map" buttons in the data panel for navigation
- Table of local higher education institutions (scoped to the selected zone or county)
- Filter charts to a specific age group or racial/ethnic group ("Focus on a Group" control)
- Map controls panel hides when a region is selected to maximize map space
- Data download (coming soon)

---

## Data Sources

<!--
  List each dataset used, its source, year, and any relevant notes.
  e.g.:
  - **Commuting Zone boundaries** — [IPUMS](https://usa.ipums.org/), 2020
  - **Rural population estimates** — U.S. Census Bureau, 2020
  - **Institutions** — IPEDS, [year]
  - **Population estimates** — U.S. Census Bureau, 2024
-->

---

## Tech Stack

- [MapLibre GL JS](https://maplibre.org/) — map rendering
- [Chart.js](https://www.chartjs.org/) — data charts
- [D3](https://d3js.org/) — geospatial utilities (bounding box, point-in-polygon)
- [Bootstrap 5](https://getbootstrap.com/) — UI layout and components
- [Webpack 5](https://webpack.js.org/) — bundling
- [Photon (Komoot)](https://photon.komoot.io/) — geocoding (no API key required)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm start
```

Opens a development server at `http://localhost:8080` with hot reload.

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

### Deploy to GitHub Pages

```bash
npm run deploy
```

---

## Deployment

`npm run deploy` builds and publishes `dist/` to the `gh-pages` branch via
[`gh-pages`](https://www.npmjs.com/package/gh-pages). The build emits **two** pages that
share the same JS bundle:

- **Standalone / prototype:** `https://andrewstevenhahn.github.io/ticas_rural-ed-explorer/`
  — full page with navbar, "About" section, and footer.
- **Embed (WordPress):** `https://andrewstevenhahn.github.io/ticas_rural-ed-explorer/embed.html`
  — graphic only (map + chart panel), sized to fill its container. This is the URL to iframe.

---

## Embedding in WordPress

The graphic is embedded into a prebuilt WordPress page via an `<iframe>` pointing at the
`embed.html` page above. An iframe is used deliberately: the app loads Bootstrap CSS globally
and applies `!important` font rules to base elements, so an iframe fully isolates it from
(and protects it from) the WordPress theme's styles and scripts.

### Quick start — Custom HTML block

Paste this into a **Custom HTML** block in the page's graphic placeholder:

```html
<iframe
  src="https://andrewstevenhahn.github.io/ticas_rural-ed-explorer/embed.html"
  title="TICAS Rural Completion Explorer"
  width="100%"
  height="800"
  frameborder="0"
  allowfullscreen></iframe>
```

Notes:
- **Size via the `width`/`height` HTML attributes, not inline `style`.** WordPress's `wp_kses`
  sanitizer strips `style` (and `sandbox`, `loading`, wrapper `<div>`s) from content-block
  iframes on many enterprise sites — leaving only `src`/`title`, so a `style`-sized iframe
  collapses to the browser default ~300×150px. `width`/`height` attributes survive the
  allow-list. `height` must be a pixel integer (percent/`vh` are invalid on that attribute).
- The embed page is a fixed-height, self-contained layout: the chart panel scrolls **inside**
  the iframe, so a fixed pixel height is fine and no cross-origin height messaging is needed.
  Adjust `height` to taste.
- GitHub Pages sends no `X-Frame-Options` header, so framing from the WordPress domain works.
- All resources (gh-pages, OpenFreeMap tiles) are served over HTTPS — no mixed-content issues
  on an HTTPS WordPress site.

### Full-width / responsive — shortcode (recommended for this site)

The plain Custom HTML iframe is stuck at the width of whatever theme column the placeholder
lives in (on the TICAS test page that is a `col-md-7` prose column, ~58% wide), and the
sanitizer strips any `style`/`class` we'd use to break out. The fix is a **server-rendered
shortcode** — its output bypasses content `wp_kses`, so it can carry a full-bleed breakout
wrapper and responsive CSS that survive intact.

The canonical code lives in [`wordpress/ticas-rural-explorer.php`](wordpress/ticas-rural-explorer.php).
It renders an edge-to-edge (`100vw`) iframe with a fixed desktop pixel height and a `vh`-based
height under 768px. Usage once installed:

```
[ticas_rural_explorer]
[ticas_rural_explorer height="900" mobile_height="80vh"]
```

Place it in a **Shortcode block** (a Custom HTML block will *not* run shortcodes).

**Installing via WPCode** (no file access needed):
1. WordPress admin → **Code Snippets (WPCode)** → **+ Add Snippet** → **Add Your Custom Code
   (New Snippet)** → hover the blank box → **Use snippet**.
2. Set the code type to **PHP Snippet**. Give it a title (e.g. "TICAS Rural Explorer shortcode").
3. Paste the code from `wordpress/ticas-rural-explorer.php` **between** the
   `=== WPCODE: COPY FROM HERE ===` and `=== WPCODE: COPY TO HERE ===` markers (the function +
   `add_shortcode` line — no `<?php` tag, no plugin header).
4. Under **Insertion**, choose **Auto Insert**, Location **Run Everywhere**.
5. Toggle the switch to **Active** (top right) and **Save Snippet**.
6. Edit the page: replace the Custom HTML block in the placeholder with a **Shortcode** block
   containing `[ticas_rural_explorer]`. Update the page.

Alternatively the same file works as a standalone uploadable plugin (see its header comment).

> Note on full-bleed: `100vw` can introduce a small horizontal scrollbar on themes that don't
> set `overflow-x: hidden` on the page. If that happens, either add that rule to the theme or
> switch the wrapper from `100vw` to the theme container width.

---

## Project Structure

```
src/
  index.js          # Main application logic
  styles.css        # Custom styles
  assets/           # Static assets (logo, etc.)
  data/             # GeoJSON source files
public/
  index.html        # Standalone app shell (navbar, about, footer)
  embed.html        # Graphic-only shell for the WordPress iframe
dist/               # Production build output (generated)
```

---

## Known Limitations / Roadmap

- [ ] Data download buttons not yet wired up
- [ ] Institution overlay behavior under investigation (known bug)
- [ ] Institution data and filtering logic needs review across all states
- [ ] Accessibility audit pending

---

## Contact

<!--
  Who should people contact with questions or issues?
  e.g. "For questions about the data or tool, contact [name] at [org]."
-->
