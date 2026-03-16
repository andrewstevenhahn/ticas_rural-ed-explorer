// import assets, libraries and custom styles
import 'bootstrap/dist/css/bootstrap.min.css';
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Chart from "chart.js/auto"
import './styles.css';
import logo from './assets/Books-UC-ORANGE.png';

// import geojson data
import countyData from "./data/corrected_county_num.geojson";
import czData from "./data/corrected_county_num_3.geojson";
import instData from "./data/institution_j.geojson";

// import countyData from "./data/county.geojson";
// import czData from "./data/cz.geojson";
// import instData from "./data/inst.geojson";

// define DOM elements
const popRangeIn = document.getElementById('populationRange');
const rurRangeIn = document.getElementById('ruralRange');
const rurRangeVal = document.getElementById('ruralRangeValue');
const popRangeVal = document.getElementById('populationRangeValue');
const resetButton = document.getElementById("reset-button");
const applyButton = document.getElementById("applyChanges")
const tiles = document.getElementsByClassName("chart-tile");
const instCheck = document.getElementById("showInst")
const instLegend = document.getElementById("inst-legend")
const chartArea = document.getElementById("chartArea")
const chartAreaWarning = document.getElementById("chartAreaWarning")
const chartPanel = document.getElementById("chart-panel")
const mapControls = document.getElementById("map-controls")
const logoImg = document.querySelector('.navbar-brand img');

let countyRuralChart = null;

// set logo from asset
logoImg.src = logo;

// Initalize map with open source tiles 
// const map = new maplibregl.Map({
//   container: "map",
//   style: {
//     version: 8,
//     sources: {
//       "osm-tiles": {
//         type: "raster",
//         tiles: [
//           "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
//         ],
//         tileSize: 256,
//         attribution: "© OpenStreetMap contributors"
//       }
//     },
//     layers: [
//       {
//         id: "osm-tiles",
//         type: "raster",
//         source: "osm-tiles",
//         minzoom: 0,
//         maxzoom: 19
//       }
//     ],
//     glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
//   },
//   center: [-95.5795, 39.8283],
//   zoom: 3,
//   cooperativeGestures: true
// });

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [-98.5, 39.5], // centered on the US
  zoom: 3.5,
  cooperativeGestures: true,
  attributionControl: false
});

map.addControl(new maplibregl.AttributionControl(), 'bottom-left');

//TODO: style the basemap


// handle events

// initialization
map.on("load", () => {

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
        0, '#ffffcc',
        0.2, '#a1dab4',
        0.4, '#41b6c4',
        0.6, '#2c7fb8',
        0.8, '#253494'
      ],
      'fill-opacity': 0.7
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
        0, '#ffffcc',
        0.2, '#a1dab4',
        0.4, '#41b6c4',
        0.6, '#2c7fb8',
        0.8, '#253494'
      ],
      'fill-opacity': 0.7
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

// Add zoom/rotation controls
map.addControl(new maplibregl.NavigationControl());

// Add fullscreen control
map.addControl(new maplibregl.FullscreenControl(), "top-right");

// show loading animation until all map layers have loaded
map.once("idle", () => {
  document.getElementById("spinner").classList.add("hidden");
});

// Create a popup, but don't add it to the map yet
const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false
});

// handle mouse movement
let currentFeatureId = undefined;

map.on('mousemove', 'institution', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];
  console.log(feature.properties)
  currentFeatureId = feature.properties.institution;
  popup.remove(); 
  map.getCanvas().style.cursor = 'pointer';

  let instname = feature.properties.institution;
  let inststate = feature.properties.state;
  let instlevel = feature.properties.level;
  let instsector = feature.properties.sector;

  const instTooltip = 
  '<div class="map-tooltip">'+
  '<h7><strong>' + instname + '(' + inststate + ')' + '</strong></h7>' +
  '<p>' + instsector + " " + instlevel +'</p>' +
  '</div>'

  // Use the mouse position instead of polygon coordinates
  popup.setLngLat(e.lngLat).setHTML(instTooltip).addTo(map);
});

map.on('mouseleave', 'instituiton', () => {
  currentFeatureId = undefined;
  map.getCanvas().style.cursor = '';
  popup.remove();
});

map.on('mousemove', 'cz20', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];
  console.log(feature.properties)


  // Use feature.id to detect changes instead of coordinates
  // if (currentFeatureId !== feature.properties.CZ20) {
  currentFeatureId = feature.properties.CZ2020;

  // Change the cursor
  map.getCanvas().style.cursor = 'pointer';

  let pop_str
  let rur_str
  const pop_num = feature.properties.pop2024
  const rur_num = feature.properties.pct_rural
  if (pop_num) {
    pop_str = feature.properties.pop2024.toLocaleString()
  } else {
    pop_str = "N/A"
  }

  if (rur_num) {
    rur_str = (feature.properties.pct_rural *100).toFixed(0) +'%'
  } else {
    rur_str = "N/A"
  }

  const description = 
  '<div class="map-tooltip">'+
  '<h7><strong>Commuting Zone ' + feature.properties.CZ2020 + '</strong></h7>' +
  '<p>Population 2020: ' + pop_str +'</p>' +
  '<p>Percent Rural: '+ rur_str + '</p>' +
  '<p><em>Click for more details</em></p>'+
  '</div>'

  // Use the mouse position instead of polygon coordinates
  popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
  
});

map.on('mouseleave', 'cz20', () => {
  currentFeatureId = undefined;
  map.getCanvas().style.cursor = '';
  popup.remove();
});

map.on('mousemove', 'county', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];

  // Use feature.id to detect changes instead of coordinates
  currentFeatureId = feature.properties.GEOID;

  // Change the cursor
  map.getCanvas().style.cursor = 'pointer';

  const description = 
  '<div class="map-tooltip">'+
  '<h7><strong>' + feature.properties.county_name + ", " + feature.properties.state + '</strong></h7>' +
  '<p>Population 2020: ' + feature.properties.pop2024.toLocaleString()+'</p>' +
  '<p>Percent Rural: ' + (feature.properties.pct_rural *100).toFixed(0) +'%</p>' +
  '<p><em>Click for more details</em></p>'+
  '</div>'

  // Use the mouse position instead of polygon coordinates
  popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
  
});

map.on('mouseleave', 'cz20', () => {
  currentFeatureId = undefined;
  map.getCanvas().style.cursor = '';
  popup.remove();
});

// handle clicks
map.on('click', 'cz20', (e) => {
  const clickedCoordinates = e.lngLat;
  if(!e.features.length) return;
  const selectedValue = e.features[0].properties.CZ2020;
  map.setLayoutProperty('cz20', 'visibility', 'none')
  map.setLayoutProperty('county', 'visibility', 'visible')
  
  if (instCheck.checked) {
    map.setLayoutProperty("institution", 'visibility', 'visible')
    map.setLayoutProperty("institution_labels", 'visibility', 'visible');
    instLegend.classList.remove('hidden')
  }
  map.setFilter('county', ['==', ['get', 'CZ20'], selectedValue])
  map.flyTo({
    center: clickedCoordinates,
    essential: true,
    zoom: 8
  });
  
  chartPanel.classList.remove("hidden")
  chartArea.classList.remove("hidden")
  chartAreaWarning.classList.add("hidden")

  const countySource = map.getSource("county");
  const instSource = map.getSource("institution");
  if (countySource && countySource._data) {
    const counties = countySource._data.features.filter(
      f => f.properties.CZ20 == selectedValue
    );

    // update tile 1
    const labels = counties.map(f => f.properties.county_name); 
    const values = counties.map(f => f.properties.pct_rural);
    document.getElementById("cz-title").textContent = `Commuting Zone ${selectedValue}`
    countyRuralChart = updateBarChart(labels, values, "countyChart", countyRuralChart)
  }

  if (instSource && instSource._data) {
    const institutions = instSource._data.features.filter(
      f => f.properties.j_CZ20 === selectedValue
    )
    renderInstitutionTable(institutions)
  }

  updateRaceDonutChart(e.features[0])
  updateIncomeBarChart(e.features[0])
  updateAttainmentChart(e.features[0])

});

map.on('click', 'county', (e) => {
  const clickedCoordinates = e.lngLat;
  if(!e.features.length) return;
  const selectedValue = e.features[0].properties.GEOID;
  map.setLayoutProperty("institution_labels", 'visibility', 'visible')
  map.setLayoutProperty("institution", 'visibility', 'visible')
  instLegend.classList.remove('hidden')
  map.setFilter('county', ['==', ['get', 'GEOID'], selectedValue])
  map.flyTo({
    center: clickedCoordinates,
    essential: true,
    zoom: 9
  })
  for (let i=0; i<tiles.length; i++) {
    tiles[i].classList.remove("hidden")
  }

  // chartArea.scrollIntoView({behavior: 'smooth'})

  // update tile 1
  highlightBar(countyRuralChart, e.features[0].properties.county_name)
  updateRaceDonutChart(e.features[0])
  updateIncomeBarChart(e.features[0])
  updateAttainmentChart(e.features[0])

  // chartAreaWarning.classList.remove('hidden')
  // chartArea.classList.add('hidden')
});

// reset button
resetButton.addEventListener("click", function() {
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

  popRangeIn.value = popRangeIn.defaultValue
  rurRangeIn.value = rurRangeIn.defaultValue
  popRangeVal.textContent = '46,000,000'
  rurRangeVal.textContent = '0'

  map.setFilter('cz20', null)

  instCheck.value = instCheck.defaultValue
  instCheck.checked = false;
  });

// apply button
applyButton.addEventListener("click", function() {
    map.setFilter("cz20", [
      "all",
      ["<=", ["get", "pop2024"], Number(popRangeIn.value)],
      [">=", ["get", "pct_rural"], Number(rurRangeIn.value)/100]
    ]);
    if (instCheck.checked) {
      map.setLayoutProperty("institution", 'visibility', 'visible')
      instLegend.classList.remove('hidden')
    } else {
      map.setLayoutProperty("institution", 'visibility', 'none');
      map.setLayoutProperty("institution_labels", 'visibility', 'none');
      instLegend.classList.add('hidden')
    }

    if (instCheck.checked && map.getZoom() > 5) {
      map.setLayoutProperty("institution_labels", 'visibility', 'visible');
    }
    mapControls.classList.remove('show')
});

// show instructions once everything is loaded
document.addEventListener('DOMContentLoaded', () => {
  const introModal = new bootstrap.Modal(document.getElementById('introModal'), {
    backdrop: 'static',
    keyboard: true
  });
  introModal.show();
});

// Update on slider move
popRangeIn.addEventListener('input', () => {
  popRangeVal.textContent = Number(popRangeIn.value).toLocaleString();
});

rurRangeIn.addEventListener('input', () => {
  rurRangeVal.textContent = rurRangeIn.value;
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




function updateCountyChart(labels, values, czValue) {
  document.getElementById("cz-title").textContent = `Commuting Zone ${czValue}`
  const ctx = document.getElementById("countyChart").getContext("2d");

  if (countyChart) {
    countyChart.destroy();
  }

  console.log(labels)
  console.log(values)

  countyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Percent in rural areas for CZ ${czValue}`,
          data: values,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y'
    }
  });
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

let raceDonutChart = null;

function updateRaceDonutChart(czFeature) {
  // Extract race/ethnicity columns
  const raceCategories = ["Asian", "Black", "Hispanic", "White", "American Indian", "Multiracial", "Other"];
  const labels = raceCategories;
  const raceFields = ["pct_asian",	"pct_black",	"pct_hispanic",	"pct_white",	"pct_amind",	"pct_multirace",	"pct_otherrace"]
  const values = raceFields.map(cat => Number(czFeature.properties[cat] || 0));
  const ctx = document.getElementById("raceDonutChart").getContext("2d");

  if (raceDonutChart) {
    raceDonutChart.destroy();
  }

  raceDonutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#007bff",
          "#dc3545",
          "#28a745",
          "#ffc107",
          "#6c757d"
        ],
        borderWidth: 1
      }]
    },
    options: {
      // responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

let attainmentChart = null;

function updateAttainmentChart(czFeature) {
  // Extract race/ethnicity columns
  const attLabels = ["No HS Diploma/GED", "High School Diploma/GED", "Some College", "College Degree"];
  const labels = attLabels;
  const attFields = ["pct_less_hs",	"pct_hs",	"pct_scnd",	"pct_coll"]
  const values = attFields.map(cat => Number(czFeature.properties[cat] || 0));
  const ctx = document.getElementById("attainmentChart").getContext("2d");

  if (attainmentChart) {
    attainmentChart.destroy();
  }

  attainmentChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#007bff",
          "#dc3545",
          "#28a745",
          "#ffc107",
          "#6c757d"
        ],
        borderWidth: 1
      }]
    },
    options: {
      // responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}



let incomeBarChart = null;

function updateIncomeBarChart(czFeature) {

  // const raceCategories = ["Asian", "Black", "Hispanic", "White", "American Indian", "Multiracial", "Other"];
  // const labels = raceCategories;
  // const values = raceFields.map(cat => Number(czFeature.properties[cat] || 0));

  // Define education categories
  const eduCategories = ["High School Diploma/GED", "Some College but No Degree", "College Degree"];
  const incFields = ["mdn_inc_hs",	"mdn_inc_scnd",	"mdn_inc_coll"]

  // Extract values
  const values = incFields.map(cat => Number(czFeature.properties[cat]));

  const ctx = document.getElementById("incomeBarChart").getContext("2d");

  // Destroy previous chart if it exists
  if (incomeBarChart) {
    incomeBarChart.destroy();
  }

  incomeBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: eduCategories,
      datasets: [{
        label: "Median Income ($)",
        data: values,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: "y", // horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `$${context.parsed.x.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: value => `$${value.toLocaleString()}`
          }
        },
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

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

function getAttrs(obj) {


}

function barChart() {

}

function donutChart() {

}