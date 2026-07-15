// Precompute land dots as 3D cartesian points on a unit sphere from world-110m.json.
// Output: client/src/data/globe-points.json — an array of [x, y, z] triples.
// This avoids doing point-in-polygon tests in the browser.
const fs = require("fs");
const path = require("path");
const topojson = require("topojson-client");

const dataDir = path.join(__dirname, "..", "client", "src", "data");
const topo = JSON.parse(fs.readFileSync(path.join(dataDir, "world-110m.json"), "utf8"));
const land = topojson.feature(topo, topo.objects.countries); // FeatureCollection of Polygons/MultiPolygons

// Flatten all polygon rings into an array of polygons (array of [lng,lat] rings)
const polygons = [];
for (const feat of land.features) {
  const geom = feat.geometry;
  if (!geom) continue;
  const rings = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of rings) {
    // poly[0] = outer ring, poly[1+] = holes
    polygons.push({ outer: poly[0], holes: poly.slice(1) });
  }
}

// Ray-casting point-in-polygon for a single ring
function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isLand(lng, lat) {
  let inside = false;
  for (const p of polygons) {
    if (inRing(lng, lat, p.outer)) {
      // in outer ring; check it's not in a hole
      let inHole = false;
      for (const h of p.holes) {
        if (inRing(lng, lat, h)) { inHole = true; break; }
      }
      if (!inHole) inside = true;
    }
  }
  return inside;
}

// lat/lng (degrees) -> cartesian on unit sphere
function toCartesian(lng, lat) {
  const phi = (90 - lat) * (Math.PI / 180);     // polar angle from +Y
  const theta = (lng + 180) * (Math.PI / 180);  // azimuth
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

const points = [];
// Step in degrees. ~2.5deg gives ~2,500 land dots after filtering.
const step = 2.5;
for (let lat = -88; lat <= 88; lat += step) {
  // adjust lng step by latitude to keep dot density roughly even
  const lngStep = step / Math.max(Math.cos(lat * Math.PI / 180), 0.25);
  for (let lng = -180; lng < 180; lng += lngStep) {
    if (isLand(lng, lat)) {
      points.push(toCartesian(lng, lat));
    }
  }
}

const out = {
  count: points.length,
  points, // flat-ish: array of [x,y,z]
};

const dest = path.join(dataDir, "globe-points.json");
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`Wrote ${points.length} land dots to ${dest}`);
