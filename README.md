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
  - County-level rural breakdown
  - Race/ethnicity demographics
  - Educational attainment
  - Median income by education level
  - Local institutions (public and private non-profit)
- Click a county within a commuting zone to drill down to county-level data
- "Return to Commuting Zone" button to navigate back up from county view
- Overlay of higher education institutions
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

<!--
  Describe how this is deployed and where it lives.
  e.g. "Deployed to GitHub Pages at [url]. Embedded in the TICAS WordPress site via iframe."
  Note any known quirks with the WordPress embedding or iframe sizing.
-->

---

## Project Structure

```
src/
  index.js          # Main application logic
  styles.css        # Custom styles
  assets/           # Static assets (logo, etc.)
  data/             # GeoJSON source files
public/
  index.html        # App shell
dist/               # Production build output (generated)
```

---

## Known Limitations / Roadmap

- [ ] Data download buttons not yet wired up
<!--
  What's not done yet? What's intentionally out of scope for now?
  e.g.:
  - [ ] County-level chart view still under development
  - [ ] Accessibility audit pending
-->

---

## Contact

<!--
  Who should people contact with questions or issues?
  e.g. "For questions about the data or tool, contact [name] at [org]."
-->
