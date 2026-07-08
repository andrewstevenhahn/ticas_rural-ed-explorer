//TODO: Implement a "feature of interest" mechanism to update the charts

//TODO: Add institution points
//TODO: Accessibility check
//TODO: Mobile check

// import assets, libraries and custom styles
import 'bootstrap/dist/css/bootstrap.min.css';
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { geoContains, geoBounds } from 'd3';
import Chart from "chart.js/auto"
import './styles.css';
import logo from './assets/Books-UC-ORANGE.png';

// import geojson data
import countyData from "./data/corrected_county_num.geojson";
import czData from "./data/corrected_county_num_3.geojson";
import instData from "./data/institution_j.geojson";

// define DOM elements
const popRangeIn = document.getElementById('populationRange');
const rurRangeIn = document.getElementById('ruralRange');
const rurRangeVal = document.getElementById('ruralRangeValue');
const popRangeVal = document.getElementById('populationRangeValue');
const resetButton = document.getElementById("reset-button");
const tiles = document.getElementsByClassName("chart-tile");
const chartArea = document.getElementById("chartArea")

const chartPanel = document.getElementById("chart-panel")
const mapControls = document.getElementById("map-controls")
const mapControlsWrapper = document.getElementById("map-controls-wrapper")
const logoImg = document.querySelector('.navbar-brand img');
const czSearchInput = document.getElementById('czSearch');
const returnToCZBtn = document.getElementById('return-to-cz-btn');
const returnToCZContainer = document.getElementById('return-to-cz-container');
const titleCardActions = document.getElementById('title-card-actions');
const regionTitle = document.getElementById('region-title');
const regionType = document.getElementById('region-type');
const regionMeta = document.getElementById('region-meta');
const downloadRegionName = document.getElementById('download-region-name');
const foiMetricSelect = document.getElementById('foi-metric');
const foiCategorySelect = document.getElementById('foi-category');

let countyRuralChart = null;
let selectedCZFeature = null;
let selectedCountyFeature = null;
let instAllFeatures = null; // lazily populated on first selection
let foiMetric = 'none';
let foiCategory = null;

// set logo from asset (navbar is absent in the embed template)
if (logoImg) logoImg.src = logo;


const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [-98.5, 39.5], // centered on the US
  zoom: 3.5,
  cooperativeGestures: true,
  attributionControl: false,
  dragRotate: false,
  touchPitch: false
});

map.addControl(new maplibregl.AttributionControl(), 'bottom-left');

// handle events

// initialization
map.on("load", () => {

  // basemap style overrides
  map.setPaintProperty('background', 'background-color', '#fafafa');
  map.setPaintProperty('water', 'fill-color', '#dadfe1');

  // label zoom ranges
  ['label_country_1', 'label_country_2', 'label_country_3', 'label_city_capital', 'label_city'].forEach(id => {
    map.setLayerZoomRange(id, 5, 24);
  });

  // add source data

  map.addSource("cz20", { //commuting zones
    type: "geojson",
    data: czData
  });

  map.addSource("county", { // counties
    type: "geojson",
    data: countyData
  });

  map.addSource("institution", { // institutions
    type: "geojson",
    data: instData
  });

  // render commuting zones
  //TODO: filter the institutions on county view. 

  map.addLayer({
    id: "cz20",
    type: "fill",
    source: "cz20",
    paint: {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'pct_rural'],
        0, '#f6eff7',
        0.2, '#bdc9e1',
        0.4, '#67a9cf',
        0.6, '#1c9099',
        0.8, '#016c59'
      ],
      'fill-opacity': 0.9
    }
  });

  //render counties
  map.addLayer({
    id: "county",
    type: "fill",
    source: "county",
    paint: {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'pct_rural'],
        0, '#f6eff7',
        0.2, '#bdc9e1',
        0.4, '#67a9cf',
        0.6, '#1c9099',
        0.8, '#016c59'
      ],
      'fill-opacity': 0.9
    }
  })

  // hide supplemental layers until toggled
  map.setLayoutProperty("county", 'visibility', 'none')
});

// Add zoom controls (compass hidden since rotation is disabled)
map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

// Search box — fetch top Photon result on Enter
let searchMarker = null;
let czBounds = null; // lazily computed on first search

async function performSearch() {
  const query = czSearchInput.value.trim();
  if (!query) return;

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en&bbox=-180,18,-66,72`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.features.length) return;

  const center = data.features[0].geometry.coordinates;

  if (searchMarker) searchMarker.remove();
  searchMarker = new maplibregl.Marker().setLngLat(center).addTo(map);

  if (!czBounds) {
    const czSource = map.getSource("cz20");
    if (!czSource || !czSource._data) return;
    czBounds = czSource._data.features.map(f => {
      const [[w, s], [e, n]] = geoBounds(f);
      return { feature: f, w, s, e, n };
    });
  }
  const [lng, lat] = center;
  const candidates = czBounds.filter(b => lng >= b.w && lng <= b.e && lat >= b.s && lat <= b.n);
  const czFeature = candidates.map(b => b.feature).find(f => geoContains(f, center));
  if (!czFeature) return;
  selectCZ(czFeature);
}

czSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
document.getElementById('czSearchBtn').addEventListener('click', performSearch);


// show loading animation until all map layers have loaded
map.once("idle", () => {
  document.getElementById("map-overlay").classList.add("hidden");
});

// Create a popup, but don't add it to the map yet
const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false
});

// handle mouse movement
map.on('mousemove', 'cz20', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];

  map.getCanvas().style.cursor = 'pointer';

  const pop_num = feature.properties.pop2024;
  const rur_num = feature.properties.pct_rural;
  const pop_str = pop_num ? pop_num.toLocaleString() : "N/A";
  const rur_str = rur_num ? (rur_num * 100).toFixed(0) + '%' : "N/A";

  const description =
    `<div class="map-tooltip">` +
    `<strong>${feature.properties.CZName}</strong>` +
    `<p>Population 2024: ${pop_str}</p>` +
    `<p>Percent Rural: ${rur_str}</p>` +
    `<p><em>Click for more details</em></p>` +
    `</div>`;

  popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
});

map.on('mouseleave', 'cz20', () => {
  map.getCanvas().style.cursor = '';
  popup.remove();
});

map.on('mousemove', 'county', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];

  map.getCanvas().style.cursor = 'pointer';

  const description =
    `<div class="map-tooltip">` +
    `<strong>${feature.properties.county_name} County, ${feature.properties['commuting-zones-2020_StateName']}</strong>` +
    `<p>Population 2024: ${feature.properties.pop2024.toLocaleString()}</p>` +
    `<p>Percent Rural: ${(feature.properties.pct_rural * 100).toFixed(0)}%</p>` +
    `<p><em>Click for more details</em></p>` +
    `</div>`;

  popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
});

map.on('mouseleave', 'county', () => {
  map.getCanvas().style.cursor = '';
  popup.remove();
});

// handle clicks
function selectCZ(czFeature) {
  selectedCZFeature = czFeature;
  selectedCountyFeature = null;
  titleCardActions.classList.remove('hidden');
  mapControlsWrapper.classList.add('hidden');
  returnToCZContainer.classList.add('hidden');
  popRangeIn.disabled = true;
  rurRangeIn.disabled = true;

  const selectedValue = czFeature.properties.CZ2020;

  if (!instAllFeatures) {
    const instSrc = map.getSource("institution");
    if (instSrc && instSrc._data) instAllFeatures = instSrc._data.features.slice();
  }

  map.setLayoutProperty('cz20', 'visibility', 'none');
  map.setLayoutProperty('county', 'visibility', 'visible');
  map.setFilter('county', ['==', ['get', 'CZ20'], selectedValue]);

  const czInstitutions = instAllFeatures ? instAllFeatures.filter(f => f.properties.j_CZ20 === selectedValue) : [];
  const [[w, s], [e, n]] = geoBounds(czFeature);
  map.fitBounds([[w, s], [e, n]], { padding: 40, essential: true });

  chartPanel.classList.remove("hidden");
  chartArea.classList.remove("hidden");

  updateCZTitleCard(czFeature);

  const countySource = map.getSource("county");
  if (countySource && countySource._data) {
    const counties = countySource._data.features.filter(f => f.properties.CZ20 == selectedValue);
    const labels = counties.map(f => f.properties.county_name);
    const values = counties.map(f => f.properties.pct_rural);
    document.getElementById("cz-title").textContent = czFeature.properties.CZName;
    countyRuralChart = updateBarChart(labels, values, "countyChart", countyRuralChart);
  }
  renderInstitutionTable(czInstitutions);
  updateRaceDonutChart(czFeature);
  updateIncomeBarChart(czFeature);
  updateAttainmentChart(czFeature);
}

map.on('click', 'cz20', (e) => {
  if (!e.features.length) return;
  selectCZ(e.features[0]);
});

function selectCounty(countyFeature) {
  selectedCountyFeature = countyFeature;
  const selectedValue = countyFeature.properties.GEOID;
  map.setFilter('county', ['==', ['get', 'GEOID'], selectedValue]);

  const countyInstitutions = instAllFeatures ? instAllFeatures.filter(f => f.properties.GEOID === selectedValue) : [];

  const [[cw, cs], [ce, cn]] = geoBounds(countyFeature);
  map.fitBounds([[cw, cs], [ce, cn]], { padding: 40, essential: true });
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].classList.remove("hidden");
  }
  updateCountyTitleCard(countyFeature);
  highlightBar(countyRuralChart, countyFeature.properties.county_name);
  updateRaceDonutChart(countyFeature);
  updateIncomeBarChart(countyFeature);
  updateAttainmentChart(countyFeature);
  renderInstitutionTable(countyInstitutions);
  returnToCZContainer.classList.remove('hidden');
}

map.on('click', 'county', (e) => {
  if (!e.features.length) return;
  if (searchMarker) { searchMarker.remove(); searchMarker = null; czSearchInput.value = ''; }
  selectCounty(e.features[0]);
});

// return to commuting zone button
returnToCZBtn.addEventListener('click', () => {
  if (!selectedCZFeature) return;
  const selectedValue = selectedCZFeature.properties.CZ2020;
  map.setFilter('county', ['==', ['get', 'CZ20'], selectedValue]);

  const czInstitutions = instAllFeatures ? instAllFeatures.filter(f => f.properties.j_CZ20 === selectedValue) : [];

  const [[w, s], [e, n]] = geoBounds(selectedCZFeature);
  map.fitBounds([[w, s], [e, n]], { padding: 40, essential: true });

  const dataset = countyRuralChart.data.datasets[0];
  dataset.backgroundColor = countyRuralChart.data.labels.map(() => TICAS_COLORS.teal);
  countyRuralChart.update();

  updateCZTitleCard(selectedCZFeature);
  updateRaceDonutChart(selectedCZFeature);
  updateIncomeBarChart(selectedCZFeature);
  updateAttainmentChart(selectedCZFeature);
  renderInstitutionTable(czInstitutions);

  selectedCountyFeature = null; // back at CZ view — keep state in sync for downloads/charts
  returnToCZContainer.classList.add('hidden');
});

// reset button
resetButton.addEventListener("click", function() {
  if (searchMarker) { searchMarker.remove(); searchMarker = null; czSearchInput.value = ''; }
  selectedCZFeature = null;
  selectedCountyFeature = null;
  foiMetric = 'none';
  foiCategory = null;
  foiMetricSelect.value = 'none';
  foiCategorySelect.innerHTML = '<option value="">— select a metric first —</option>';
  foiCategorySelect.disabled = true;
  returnToCZContainer.classList.add('hidden');
  titleCardActions.classList.add('hidden');
  popRangeIn.disabled = false;
  rurRangeIn.disabled = false;
  map.setLayoutProperty('cz20', 'visibility', 'visible')
  map.setLayoutProperty('county', 'visibility', 'none')
  mapControls.classList.remove('show')
  mapControlsWrapper.classList.remove('hidden')
  map.flyTo({
    center: [-95.5795, 39.8283],
    zoom: 3,
    essential: true
  });

  chartPanel.classList.add("hidden")
  chartArea.classList.add("hidden")


  popRangeIn.value = popRangeIn.defaultValue;
  rurRangeIn.value = rurRangeIn.defaultValue;
  popRangeVal.textContent = sliderToPop(popRangeIn.defaultValue).toLocaleString();
  rurRangeVal.textContent = '0';

  map.setFilter('cz20', null)

  });

function applyFilters() {
  map.setFilter("cz20", [
    "all",
    ["<=", ["get", "pop2024"], sliderToPop(popRangeIn.value)],
    [">=", ["get", "pct_rural"], Number(rurRangeIn.value) / 100]
  ]);
}

const sliderToPop = v => Math.round(Math.pow(10, Number(v)));

// Update on slider move
popRangeIn.addEventListener('input', () => {
  popRangeVal.textContent = sliderToPop(popRangeIn.value).toLocaleString();
  applyFilters();
});

rurRangeIn.addEventListener('input', () => {
  rurRangeVal.textContent = rurRangeIn.value;
  applyFilters();
});



// ── Title card helpers ────────────────────────────────────────────────────────

function updateCZTitleCard(czFeature) {
  const p = czFeature.properties;
  regionTitle.textContent = p.CZName;
  regionType.textContent = 'Commuting Zone';
  downloadRegionName.textContent = p.CZName;

  let statesText = '';
  const src = map.getSource('county');
  if (src && src._data) {
    const states = [...new Set(
      src._data.features
        .filter(f => f.properties.CZ20 == p.CZ2020)
        .map(f => f.properties['commuting-zones-2020_StateName'])
    )].sort().join(', ');
    statesText = states;
  }

  regionMeta.innerHTML =
    `<li>Population (2024): <strong>${p.pop2024.toLocaleString()}</strong></li>` +
    `<li>Percent rural: <strong>${(p.pct_rural * 100).toFixed(0)}%</strong></li>` +
    (statesText ? `<li>States: <strong>${statesText}</strong></li>` : '') +
    `<li>On average, <strong>${p.CZAvgContainment.toFixed(1)}%</strong> of residents who live within these counties commute to work within this zone.</li>`;
}

function updateCountyTitleCard(countyFeature) {
  const p = countyFeature.properties;
  const countyDisplayName = `${p.county_name} County, ${p['commuting-zones-2020_StateName']}`;
  regionTitle.textContent = countyDisplayName;
  regionType.textContent = 'County';
  downloadRegionName.textContent = countyDisplayName;
  regionMeta.innerHTML =
    `<li>Population (2024): <strong>${p.pop2024.toLocaleString()}</strong></li>` +
    `<li>Percent rural: <strong>${(p.pct_rural * 100).toFixed(0)}%</strong></li>` +
    `<li>In this county, <strong>${p['commuting-zones-2020_CZContainment'].toFixed(1)}%</strong> of residents commute to work within this commuting zone.</li>`;
}

// create and update charts


function updateBarChart(labels, values, chartId, chartObject) {
  const canvas = document.getElementById(chartId);
  const wrapper = document.getElementById(chartId + 'Wrapper');
  if (wrapper) wrapper.style.height = Math.max(180, labels.length * 32) + 'px';
  const ctx = canvas.getContext("2d");
  if (chartObject) chartObject.destroy();

  const pctValues = values.map(v => +(v * 100).toFixed(1));

  chartObject = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: 'Percent rural',
        data: pctValues,
        backgroundColor: TICAS_COLORS.teal,
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(1)}% rural` }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#e8dfc8' },
          ticks: { callback: v => `${v}%` }
        },
        y: { grid: { display: false } }
      },
      onHover: (e, elements) => {
        const cursor = elements.length ? 'pointer' : 'default';
        if (e.native.target.style.cursor !== cursor) e.native.target.style.cursor = cursor;
      },
      onClick: (_e, elements) => {
        if (!elements.length) return;
        const countyName = chartObject.data.labels[elements[0].index];
        const src = map.getSource('county');
        if (!src || !src._data) return;
        const czValue = selectedCZFeature && selectedCZFeature.properties.CZ2020;
        const feature = src._data.features.find(
          f => f.properties.county_name === countyName && f.properties.CZ20 == czValue
        );
        if (feature) selectCounty(feature);
      }
    }
  });

  return chartObject;
}




// Function to render the institution table
function renderInstitutionTable(features) {
  if (!features.length) {
    document.getElementById('institutionTableContainer').innerHTML =
      '<p class="text-muted">No institutions found for this CZ.</p>';
    return;
  }

  let html = `
    <table class="table table-striped table-sm">
      <thead>
        <tr>
          <th>Institution</th>
          <th>County</th>
          <th>State</th>
          <th>Level</th>
          <th>Sector</th>
        </tr>
      </thead>
      <tbody>
  `;

  features.forEach(f => {
    html += `
      <tr>
        <td>${f.properties.institution || ''}</td>
        <td>${f.properties.j_county_name || ''}</td>
        <td>${f.properties.state || ''}</td>
        <td>${f.properties.level || ''}</td>
        <td>${f.properties.sector || ''}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  document.getElementById('institutionTableContainer').innerHTML = html;
}

// ── TICAS brand palette ────────────────────────────────────────────────────────

const TICAS_COLORS = {
  purple:     '#344273',
  orange:     '#fa634b',
  magenta:    '#9e508a',
  teal:       '#7ec7b8',
  salmon:     '#fdbcab',
  bluePurple: '#5a7bc4',
  lavender:   '#c98fd4',
};

Chart.defaults.font.family = "'Quasimoda', sans-serif";

// ── Chart configs ─────────────────────────────────────────────────────────────
// To change labels, data fields, or colors, edit only these objects.

const RACE_CHART = {
  elementId: "raceDonutChart",
  labels: ["Asian", "Black", "Hispanic", "White", "American Indian", "Multiracial", "Other"],
  fields: ["pct_asian", "pct_black", "pct_hispanic", "pct_white", "pct_amind", "pct_multirace", "pct_otherrace"],
  colors: [TICAS_COLORS.teal, TICAS_COLORS.purple, TICAS_COLORS.orange, TICAS_COLORS.bluePurple, TICAS_COLORS.magenta, TICAS_COLORS.salmon, TICAS_COLORS.lavender]
};

const ATTAINMENT_CHART = {
  elementId: "attainmentChart",
  labels: ["No HS Diploma/GED", "High School Diploma/GED", "Some College", "College Degree"],
  fields: ["pct_less_hs", "pct_hs", "pct_scnd", "pct_coll"],
  colors: [TICAS_COLORS.purple, TICAS_COLORS.orange, TICAS_COLORS.teal, TICAS_COLORS.magenta]
};

const INCOME_CHART = {
  elementId: "incomeBarChart",
  labels: ["High School Diploma/GED", "Some College but No Degree", "College Degree"],
  fields: ["mdn_inc_hs", "mdn_inc_scnd", "mdn_inc_coll"],
  color: TICAS_COLORS.purple,
  borderColor: TICAS_COLORS.purple
};

// ── Feature of Interest ────────────────────────────────────────────────────────

const FOI_AGE_OPTIONS = [
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_54', label: '45–54' },
  { value: '55_64', label: '55–64' },
];

const FOI_RACE_OPTIONS = [
  { value: 'asian',    label: 'Asian' },
  { value: 'black',    label: 'Black' },
  { value: 'hispanic', label: 'Hispanic' },
  { value: 'white',    label: 'White' },
];

function getAttainmentConfig() {
  if (foiMetric === 'none' || !foiCategory) return ATTAINMENT_CHART;
  return {
    ...ATTAINMENT_CHART,
    fields: ['pct_less_hs', `pct_hs_${foiCategory}`, `pct_scnd_${foiCategory}`, `pct_coll_${foiCategory}`],
    colors: ['#cccccc', TICAS_COLORS.orange, TICAS_COLORS.teal, TICAS_COLORS.magenta]
  };
}

function getFoiLabel() {
  if (foiMetric === 'none' || !foiCategory) return null;
  const options = foiMetric === 'age' ? FOI_AGE_OPTIONS : FOI_RACE_OPTIONS;
  const opt = options.find(o => o.value === foiCategory);
  return opt ? opt.label : null;
}

function getIncomeConfig() {
  if (foiMetric === 'race' && foiCategory) {
    return {
      ...INCOME_CHART,
      fields: [`mdn_inc_hs_${foiCategory}`, `mdn_inc_scnd_${foiCategory}`, `mdn_inc_coll_${foiCategory}`]
    };
  }
  return INCOME_CHART;
}

function refreshChartsForCurrentFeature() {
  const feature = selectedCountyFeature || selectedCZFeature;
  if (!feature) return;
  updateRaceDonutChart(feature);
  updateAttainmentChart(feature);
  updateIncomeBarChart(feature);
}

foiMetricSelect.addEventListener('change', () => {
  foiMetric = foiMetricSelect.value;
  foiCategory = null;

  if (foiMetric === 'none') {
    foiCategorySelect.disabled = true;
    foiCategorySelect.innerHTML = '<option value="">— select a metric first —</option>';
  } else {
    const options = foiMetric === 'age' ? FOI_AGE_OPTIONS : FOI_RACE_OPTIONS;
    foiCategorySelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    foiCategorySelect.disabled = false;
    foiCategory = options[0].value;
  }

  refreshChartsForCurrentFeature();
});

foiCategorySelect.addEventListener('change', () => {
  foiCategory = foiCategorySelect.value;
  refreshChartsForCurrentFeature();
});

// ── Shared renderers ───────────────────────────────────────────────────────────

function renderDoughnut(config, chartRef, feature) {
  if (chartRef) chartRef.destroy();
  const values = config.fields.map(f => Number(feature.properties[f] || 0));
  return new Chart(document.getElementById(config.elementId), {
    type: "doughnut",
    data: {
      labels: config.labels,
      datasets: [{ data: values, backgroundColor: config.colors, borderWidth: 0 }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${(ctx.parsed * 100).toFixed(1)}%`
          }
        }
      }
    }
  });
}

function renderHorizontalBar(config, chartRef, feature) {
  if (chartRef) chartRef.destroy();
  const values = config.fields.map(f => Number(feature.properties[f] || 0));
  return new Chart(document.getElementById(config.elementId), {
    type: "bar",
    data: {
      labels: config.labels,
      datasets: [{
        label: "Median Income ($)",
        data: values,
        backgroundColor: config.color,
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` $${ctx.parsed.x.toLocaleString()}` }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#e8dfc8' },
          ticks: { callback: v => `$${v.toLocaleString()}` }
        },
        y: { grid: { display: false } }
      }
    }
  });
}

// ── Chart state + update functions ────────────────────────────────────────────

let raceDonutChart = null;
let attainmentChart = null;
let incomeBarChart = null;

function updateRaceDonutChart(feature) {
  raceDonutChart = renderDoughnut(RACE_CHART, raceDonutChart, feature);
  document.getElementById('race-age-note').classList.toggle('hidden', foiMetric !== 'age');
}

function updateAttainmentChart(feature) {
  attainmentChart = renderDoughnut(getAttainmentConfig(), attainmentChart, feature);
  const label = getFoiLabel();
  const prefix = foiMetric === 'age' ? 'Ages ' : '';
  document.getElementById('attainment-chart-title').textContent =
    label ? `Educational Attainment: ${prefix}${label}` : 'Educational Attainment';
}

function updateIncomeBarChart(feature) {
  incomeBarChart = renderHorizontalBar(getIncomeConfig(), incomeBarChart, feature);
  document.getElementById('income-age-note').classList.toggle('hidden', foiMetric !== 'age');
  const label = getFoiLabel();
  document.getElementById('income-chart-title').textContent =
    (foiMetric === 'race' && label) ? `Income by Educational Attainment: ${label}` : 'Income by Educational Attainment';
}

function highlightBar(chart, idValue) {
  // this clears off any tooltip highlights
  chart.update();

  const dataset = chart.data.datasets[0]
  const labels = chart.data.labels

  dataset.backgroundColor = labels.map(() => TICAS_COLORS.teal);
  const index = labels.indexOf(idValue)
  dataset.backgroundColor[index] = TICAS_COLORS.orange;



  chart.update();
}

// ── Data download (CSV + data dictionary) ───────────────────────────────────────
// EXPORT_SCHEMA is the single source of truth for the exported columns, so the data
// CSV and the dictionary CSV can never drift. Descriptions are the authoritative
// definitions from the project's "FINAL DATA.xlsx" Data Dictionary tab, with two
// source copy-paste errors (pct_coll_18_24 / pct_coll_25_34, which read "high school
// diploma" upstream) and two spacing typos corrected. Field names are the actual data
// field names — note the dictionary tab labels these pop2020 / pct_in_coll, but the
// data (and this tool) use pop2024 / pct_enroll.

const csvStat = (field, description) => ({ field, description, cz: field, county: field });

const EXPORT_AGE_GROUPS = [
  ['18_24', 'age 18-24'], ['25_34', 'age 25-34'], ['35_44', 'age 35-44'],
  ['45_54', 'age 45-54'], ['55_64', 'age 55-64'],
];
const EXPORT_RACE_GROUPS = [
  ['asian', 'Asian'], ['black', 'Black'], ['hispanic', 'Hispanic/Latino'], ['white', 'White'],
];
const PCT_ATTAIN = {
  hs:   'a high school diploma or GED',
  scnd: 'some college but no degree and not currently enrolled',
  coll: 'a college degree',
};
const INC_ATTAIN = {
  hs:   'a high school diploma or GED',
  scnd: 'some college but no degree',
  coll: 'a college degree',
};

const EXPORT_SCHEMA = [
  { field: 'geography_type', description: 'Row type: "Commuting Zone" summary or an individual "County"',
    cz: () => 'Commuting Zone', county: () => 'County' },
  { field: 'cz',          description: 'Commuting Zone ID',   cz: 'CZ2020', county: 'CZ20' },
  { field: 'cz_name',     description: 'Commuting Zone name', cz: 'CZName', county: 'commuting-zones-2020_CZName' },
  { field: 'county',      description: 'County ID',           cz: null,     county: 'GEOID' },
  { field: 'county_name', description: 'County name',         cz: null,     county: 'county_name' },
  { field: 'state',       description: 'State name',          cz: null,     county: 'state' },
  csvStat('pop2024',      'Population estimate'),
  csvStat('pct_rural',    'Proportion of 2020 population living in a rural area'),
  csvStat('pct_asian',    'Proportion of population (Asian)'),
  csvStat('pct_black',    'Proportion of population (Black)'),
  csvStat('pct_hispanic', 'Proportion of population (Hispanic/Latino)'),
  csvStat('pct_white',    'Proportion of population (White)'),
  csvStat('pct_amind',    'Proportion of population (American Indian/Alaska Native)'),
  csvStat('pct_multirace','Proportion of population (Two or more races)'),
  csvStat('pct_otherrace','Proportion of population (Other race)'),
  csvStat('pct_in_hs',    'Proportion of population currently enrolled in high school'),
  csvStat('pct_enroll',   'Proportion of population currently enrolled in postsecondary education'),
  csvStat('pct_less_hs',  'Proportion of population without a high school diploma or GED and not currently enrolled'),
  csvStat('pct_hs',       'Proportion of population with a high school diploma or GED'),
  csvStat('pct_scnd',     'Proportion of population with some college but no degree and not currently enrolled'),
  csvStat('pct_coll',     'Proportion of population with a college degree'),
  // attainment broken out by age then by race, for each attainment level
  ...['hs', 'scnd', 'coll'].flatMap(attain => [
    ...EXPORT_AGE_GROUPS.map(([code, label]) =>
      csvStat(`pct_${attain}_${code}`, `Proportion of population ${label} with ${PCT_ATTAIN[attain]}`)),
    ...EXPORT_RACE_GROUPS.map(([code, label]) =>
      csvStat(`pct_${attain}_${code}`, `Proportion of ${label} population with ${PCT_ATTAIN[attain]}`)),
  ]),
  // median income overall, then by race
  ...['hs', 'scnd', 'coll'].map(attain =>
    csvStat(`mdn_inc_${attain}`, `Median income of the population with ${INC_ATTAIN[attain]}`)),
  ...EXPORT_RACE_GROUPS.flatMap(([code, label]) =>
    ['hs', 'scnd', 'coll'].map(attain =>
      csvStat(`mdn_inc_${attain}_${code}`, `Median income of the ${label} population with ${INC_ATTAIN[attain]}`))),
];

function toCSV(columns, rows) {
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [columns, ...rows].map(row => row.map(esc).join(',')).join('\r\n');
}

function triggerDownload(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime }); // BOM so Excel reads UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Rows for the geography currently shown: a single county row in county view, or a
// CZ summary row followed by one row per county in commuting-zone view.
function currentExportRows() {
  const toRow = (feat, geo) => EXPORT_SCHEMA.map(c => {
    const src = c[geo];
    if (typeof src === 'function') return src(feat);
    return src == null ? '' : feat.properties[src];
  });
  if (selectedCountyFeature) return [toRow(selectedCountyFeature, 'county')];
  if (!selectedCZFeature) return [];
  const czVal = selectedCZFeature.properties.CZ2020;
  const src = map.getSource('county');
  const counties = (src && src._data ? src._data.features : []).filter(f => f.properties.CZ20 == czVal);
  return [toRow(selectedCZFeature, 'cz'), ...counties.map(f => toRow(f, 'county'))];
}

function regionSlug() {
  const name = (regionTitle.textContent || 'region').trim().toLowerCase();
  return name.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'region';
}

document.getElementById('download-csv-btn').addEventListener('click', () => {
  if (!selectedCZFeature && !selectedCountyFeature) return;
  const header = EXPORT_SCHEMA.map(c => c.field);
  triggerDownload(`ticas_${regionSlug()}_data.csv`, toCSV(header, currentExportRows()));
});

document.getElementById('download-dict-btn').addEventListener('click', () => {
  const rows = EXPORT_SCHEMA.map(c => [c.field, c.description]);
  triggerDownload('ticas_data_dictionary.csv', toCSV(['field', 'description'], rows));
});

