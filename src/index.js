// import assets, libraries and custom styles
import 'bootstrap/dist/css/bootstrap.min.css';
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import './styles.css';
import logo from './assets/Books-UC-ORANGE.png';

// import geojson data
import countyData from "./data/county_simp_num.geojson";
import czData from "./data/cz20_simp_num.geojson";
import instData from "./data/institution.geojson";

// set logo from asset
const logoImg = document.querySelector('.navbar-brand img');
logoImg.src = logo;

// Initalize map with open source tiles 
const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: [
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  center: [-95.5795, 39.8283],
  zoom: 3,
  cooperativeGestures: true
});

//handle events
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

  map.setLayoutProperty("county", 'visibility', 'none')

  // render institutions
  map.addLayer({
    id:"institution",
    type: "circle",
    source: "institution",
    paint: {
      "circle-color": [
      'match', ['get', 'level'],
      'Public', '#e41a1c',
      'Private non-profit', '#377eb8',
      '#999999' // default
    ],
      "circle-radius": 4
    }
  });

  map.setLayoutProperty("institution", 'visibility', 'none')
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

let currentFeatureId = undefined;

map.on('mousemove', 'cz20', (e) => {
  if (!e.features || e.features.length === 0) return;
  const feature = e.features[0];

  // Use feature.id to detect changes instead of coordinates
  // if (currentFeatureId !== feature.properties.CZ20) {
  currentFeatureId = feature.properties.CZ20;

  // Change the cursor
  map.getCanvas().style.cursor = 'pointer';

  const description = 
  '<div class="map-tooltip">'+
  '<h7><strong>Commuting Zone ' + feature.properties.CZ20 + '</strong></h7>' +
  '<p>Population 2020: ' + feature.properties.pop2020.toLocaleString()+'</p>' +
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
  '<p>Population 2020: ' + feature.properties.pop2020.toLocaleString()+'</p>' +
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

map.on('click', 'cz20', (e) => {
  const clickedCoordinates = e.lngLat;
  if(!e.features.length) return;
  const selectedValue = e.features[0].properties.CZ20;
  map.setLayoutProperty('cz20', 'visibility', 'none')
  map.setLayoutProperty('county', 'visibility', 'visible')
  map.setLayoutProperty("institution", 'visibility', 'visible')
  map.setFilter('county', ['==', ['get', 'CZ20'], selectedValue])
  map.flyTo({
    center: clickedCoordinates,
    essential: true,
    zoom: 8
  })
});

map.on('click', 'county', (e) => {
  const clickedCoordinates = e.lngLat;
  if(!e.features.length) return;
  const selectedValue = e.features[0].properties.GEOID;
  map.setFilter('county', ['==', ['get', 'GEOID'], selectedValue])
  map.flyTo({
    center: clickedCoordinates,
    essential: true,
    zoom: 9
  })
});

const resetButton = document.getElementById("reset-button")
resetButton.addEventListener("click", function() {
  map.setLayoutProperty('cz20', 'visibility', 'visible')
  map.setLayoutProperty('county', 'visibility', 'none')
  map.setLayoutProperty("institution", 'visibility', 'none')
  map.flyTo({
    center: [-95.5795, 39.8283],
    zoom: 3,
    essential: true
  })
});
