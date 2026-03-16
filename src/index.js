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
const instCheck = document.getElementById("showInst")
const instLegend = document.getElementById("inst-legend")
const chartArea = document.getElementById("chartArea")
const chartAreaWarning = document.getElementById("chartAreaWarning")
const chartPanel = document.getElementById("chart-panel")
const mapControls = document.getElementById("map-controls")
const logoImg = document.querySelector('.navbar-brand img');
const czSearchInput = document.getElementById('czSearch');
const returnToCZBtn = document.getElementById('return-to-cz-btn');
const returnToCZContainer = document.getElementById('return-to-cz-container');

let countyRuralChart = null;
let selectedCZFeature = null;

// set logo from asset
logoImg.src = logo;


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

//TODO: style the basemap
//TODO: update all the text in windows and in tooltips
//TODO: style the charts
//TODO: Implement a "feature of interest" mechanism to update the charts
//TODO: Add options to download the data

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
  //TODO: change the colors to work with the basemap
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

  // render institutions
  map.addLayer({
    id:"institution",
    type: "circle",
    source: "institution",
    paint: {
      "circle-stroke-width": 1,
      "circle-stroke-color": "#fff",
      "circle-color": [
      'match', ['get', 'level'],
      'Public', '#fa634b',
      'Private non-profit', 'rgb(52, 66, 115)',
      '#999999' // default
    ],
      "circle-radius": 4
    }
  });

  // render inst labels 
    map.addLayer({
    id:"institution_labels",
    type: "symbol",
    source: "institution",
    layout: {
      'text-field': ['get', 'institution'],
      'text-size': 12,
      'text-offset': [0,1.2],
      'text-anchor': 'top',
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 2
    }
  });

  // hide supplemental layers until toggled
  map.setLayoutProperty("institution", 'visibility', 'none');
  map.setLayoutProperty("institution_labels", 'visibility', 'none');
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
map.on('mousemove', 'institution', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];
  popup.remove();
  map.getCanvas().style.cursor = 'pointer';

  const instname = feature.properties.institution;
  const inststate = feature.properties.state;
  const instlevel = feature.properties.level;
  const instsector = feature.properties.sector;

  const instTooltip =
    `<div class="map-tooltip">` +
    `<strong>${instname} (${inststate})</strong>` +
    `<p>${instsector} ${instlevel}</p>` +
    `</div>`;

  popup.setLngLat(e.lngLat).setHTML(instTooltip).addTo(map);
});

map.on('mouseleave', 'institution', () => {
  map.getCanvas().style.cursor = '';
  popup.remove();
});

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
    `<strong>Commuting Zone ${feature.properties.CZ2020}</strong>` +
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
    `<strong>${feature.properties.county_name}, ${feature.properties.state}</strong>` +
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
  returnToCZContainer.classList.add('hidden');
  popRangeIn.disabled = true;
  rurRangeIn.disabled = true;

  const selectedValue = czFeature.properties.CZ2020;
  map.setLayoutProperty('cz20', 'visibility', 'none');
  map.setLayoutProperty('county', 'visibility', 'visible');
  if (instCheck.checked) {
    map.setLayoutProperty("institution", 'visibility', 'visible');
    map.setLayoutProperty("institution_labels", 'visibility', 'visible');
    instLegend.classList.remove('hidden');
  }
  map.setFilter('county', ['==', ['get', 'CZ20'], selectedValue]);
  const [[w, s], [e, n]] = geoBounds(czFeature);
  map.fitBounds([[w, s], [e, n]], { padding: 40, essential: true });

  chartPanel.classList.remove("hidden");
  chartArea.classList.remove("hidden");
  chartAreaWarning.classList.add("hidden");

  const countySource = map.getSource("county");
  const instSource = map.getSource("institution");
  if (countySource && countySource._data) {
    const counties = countySource._data.features.filter(f => f.properties.CZ20 == selectedValue);
    const labels = counties.map(f => f.properties.county_name);
    const values = counties.map(f => f.properties.pct_rural);
    document.getElementById("cz-title").textContent = `Commuting Zone ${selectedValue}`;
    countyRuralChart = updateBarChart(labels, values, "countyChart", countyRuralChart);
  }
  if (instSource && instSource._data) {
    const institutions = instSource._data.features.filter(f => f.properties.j_CZ20 === selectedValue);
    renderInstitutionTable(institutions);
  }
  updateRaceDonutChart(czFeature);
  updateIncomeBarChart(czFeature);
  updateAttainmentChart(czFeature);
}

map.on('click', 'cz20', (e) => {
  if (!e.features.length) return;
  selectCZ(e.features[0]);
});

map.on('click', 'county', (e) => {
  const clickedCoordinates = e.lngLat;
  if (!e.features.length) return;
  if (searchMarker) { searchMarker.remove(); searchMarker = null; czSearchInput.value = ''; }
  const selectedValue = e.features[0].properties.GEOID;
  map.setLayoutProperty("institution_labels", 'visibility', 'visible');
  map.setLayoutProperty("institution", 'visibility', 'visible');
  instLegend.classList.remove('hidden');
  map.setFilter('county', ['==', ['get', 'GEOID'], selectedValue]);
  map.flyTo({
    center: clickedCoordinates,
    essential: true,
    zoom: 9
  });
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].classList.remove("hidden");
  }

  highlightBar(countyRuralChart, e.features[0].properties.county_name);
  updateRaceDonutChart(e.features[0]);
  updateIncomeBarChart(e.features[0]);
  updateAttainmentChart(e.features[0]);

  returnToCZContainer.classList.remove('hidden');
});

// return to commuting zone button
returnToCZBtn.addEventListener('click', () => {
  if (!selectedCZFeature) return;
  const selectedValue = selectedCZFeature.properties.CZ2020;
  map.setFilter('county', ['==', ['get', 'CZ20'], selectedValue]);

  const [[w, s], [e, n]] = geoBounds(selectedCZFeature);
  map.fitBounds([[w, s], [e, n]], { padding: 40, essential: true });

  const dataset = countyRuralChart.data.datasets[0];
  dataset.backgroundColor = countyRuralChart.data.labels.map(() => 'rgba(54, 162, 235, 0.6)');
  countyRuralChart.update();

  updateRaceDonutChart(selectedCZFeature);
  updateIncomeBarChart(selectedCZFeature);
  updateAttainmentChart(selectedCZFeature);

  returnToCZContainer.classList.add('hidden');
});

// reset button
resetButton.addEventListener("click", function() {
  if (searchMarker) { searchMarker.remove(); searchMarker = null; czSearchInput.value = ''; }
  selectedCZFeature = null;
  returnToCZContainer.classList.add('hidden');
  popRangeIn.disabled = false;
  rurRangeIn.disabled = false;
  map.setLayoutProperty('cz20', 'visibility', 'visible')
  map.setLayoutProperty('county', 'visibility', 'none')
  map.setLayoutProperty("institution", 'visibility', 'none')
  map.setLayoutProperty("institution_labels", 'visibility', 'none');
  instLegend.classList.add('hidden')
  mapControls.classList.remove('show')
  map.flyTo({
    center: [-95.5795, 39.8283],
    zoom: 3,
    essential: true
  });

  chartPanel.classList.add("hidden")
  chartArea.classList.add("hidden")
  chartAreaWarning.classList.add('hidden')

  popRangeIn.value = popRangeIn.defaultValue;
  rurRangeIn.value = rurRangeIn.defaultValue;
  popRangeVal.textContent = sliderToPop(popRangeIn.defaultValue).toLocaleString();
  rurRangeVal.textContent = '0';

  map.setFilter('cz20', null)

  instCheck.value = instCheck.defaultValue
  instCheck.checked = false;
  });

function applyFilters() {
  map.setFilter("cz20", [
    "all",
    ["<=", ["get", "pop2024"], sliderToPop(popRangeIn.value)],
    [">=", ["get", "pct_rural"], Number(rurRangeIn.value) / 100]
  ]);
  if (instCheck.checked) {
    map.setLayoutProperty("institution", 'visibility', 'visible');
    instLegend.classList.remove('hidden');
    if (map.getZoom() > 5) {
      map.setLayoutProperty("institution_labels", 'visibility', 'visible');
    }
  } else {
    map.setLayoutProperty("institution", 'visibility', 'none');
    map.setLayoutProperty("institution_labels", 'visibility', 'none');
    instLegend.classList.add('hidden');
  }
}

// show instructions once everything is loaded
document.addEventListener('DOMContentLoaded', () => {
  const introModal = new bootstrap.Modal(document.getElementById('introModal'), {
    backdrop: 'static',
    keyboard: true
  });
  introModal.show();
});

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

instCheck.addEventListener('change', () => {
  applyFilters();
});

// create and update charts 


function updateBarChart(labels, values, chartId, chartObject) {
  const ctx = document.getElementById(chartId).getContext("2d");
  if (chartObject) {
    chartObject.destroy()
  }

  chartObject = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Percent in rural areas`,
          data: values,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          highlightFill: "rgba(151,187,205,0.75)",
          highlightStroke: "rgba(220,220,220,1)",
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y'
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

// ── Chart configs ─────────────────────────────────────────────────────────────
// To change labels, data fields, or colors, edit only these objects.

const RACE_CHART = {
  elementId: "raceDonutChart",
  labels: ["Asian", "Black", "Hispanic", "White", "American Indian", "Multiracial", "Other"],
  fields: ["pct_asian", "pct_black", "pct_hispanic", "pct_white", "pct_amind", "pct_multirace", "pct_otherrace"],
  colors: ["#007bff", "#dc3545", "#28a745", "#ffc107", "#6c757d", "#fd7e14", "#20c997"]
};

const ATTAINMENT_CHART = {
  elementId: "attainmentChart",
  labels: ["No HS Diploma/GED", "High School Diploma/GED", "Some College", "College Degree"],
  fields: ["pct_less_hs", "pct_hs", "pct_scnd", "pct_coll"],
  colors: ["#007bff", "#dc3545", "#28a745", "#ffc107"]
};

const INCOME_CHART = {
  elementId: "incomeBarChart",
  labels: ["High School Diploma/GED", "Some College but No Degree", "College Degree"],
  fields: ["mdn_inc_hs", "mdn_inc_scnd", "mdn_inc_coll"],
  color: "rgba(75, 192, 192, 0.6)",
  borderColor: "rgba(75, 192, 192, 1)"
};

// ── Shared renderers ───────────────────────────────────────────────────────────

function renderDoughnut(config, chartRef, feature) {
  if (chartRef) chartRef.destroy();
  const values = config.fields.map(f => Number(feature.properties[f] || 0));
  return new Chart(document.getElementById(config.elementId), {
    type: "doughnut",
    data: {
      labels: config.labels,
      datasets: [{ data: values, backgroundColor: config.colors, borderWidth: 1 }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
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
        borderColor: config.borderColor,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `$${ctx.parsed.x.toLocaleString()}` }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: v => `$${v.toLocaleString()}` } },
        y: { beginAtZero: false }
      }
    }
  });
}

// ── Chart state + update functions ────────────────────────────────────────────

let raceDonutChart = null;
let attainmentChart = null;
let incomeBarChart = null;

function updateRaceDonutChart(feature)  { raceDonutChart  = renderDoughnut(RACE_CHART,       raceDonutChart,  feature); }
function updateAttainmentChart(feature) { attainmentChart = renderDoughnut(ATTAINMENT_CHART, attainmentChart, feature); }
function updateIncomeBarChart(feature)  { incomeBarChart  = renderHorizontalBar(INCOME_CHART, incomeBarChart, feature); }

function highlightBar(chart, idValue) {
  // this clears off any tooltip highlights
  chart.update();

  const dataset = chart.data.datasets[0]
  const labels = chart.data.labels

  dataset.backgroundColor = labels.map(() => "rgba(75, 192, 192, 0.6)");
  const index = labels.indexOf(idValue)
  dataset.backgroundColor[index] = "rgba(255, 99, 132, 0.8)";



  chart.update();
}

