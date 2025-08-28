// import bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import './styles.css';
import logo from './assets/Books-UC-ORANGE.png';

const logoImg = document.querySelector('.navbar-brand img');
logoImg.src = logo;

// Initalize map
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
  center: [-95.5795, 39.8283], // New York City
  zoom: 3
});


map.on("load", () => {
  map.addSource("states", {
    type: "geojson",
    data: "/data/CZ.geojson"
  });

  // Add a line layer to render state outlines
  map.addLayer({
    id: "state-borders",
    type: "line",
    source: "states",
    paint: {
      "line-color": "#0000FF", // blue outlines
      "line-width": 2
    }
  });
});


// Add zoom/rotation controls
map.addControl(new maplibregl.NavigationControl());

// Add fullscreen control
map.addControl(new maplibregl.FullscreenControl(), "top-right");

map.once("idle", () => {
  document.getElementById("spinner").classList.add("hidden");
});

console.log("Success")