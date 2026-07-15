// Geocoding for member locations (city, country -> [lng, lat]).
// A curated lookup of world cities — enough for a members' network.
// Falls back gracefully when a city isn't found.

export type Coords = [number, number]; // [lng, lat]

// Keyed by "City, Country" and also by city alone (first match wins).
const CITIES: Record<string, Coords> = {
  // Europe
  "Vienna, Austria": [16.37, 48.21],
  "Wien, Austria": [16.37, 48.21],
  "Paris, France": [2.35, 48.85],
  "London, United Kingdom": [-0.12, 51.5],
  "London, England": [-0.12, 51.5],
  "Berlin, Germany": [13.4, 52.52],
  "Munich, Germany": [11.58, 48.13],
  "Rome, Italy": [12.49, 41.9],
  "Milan, Italy": [9.19, 45.46],
  "Madrid, Spain": [-3.7, 40.41],
  "Barcelona, Spain": [2.17, 41.38],
  "Lisbon, Portugal": [-9.13, 38.72],
  "Amsterdam, Netherlands": [4.9, 52.37],
  "Brussels, Belgium": [4.35, 50.85],
  "Zurich, Switzerland": [8.54, 47.37],
  "Geneva, Switzerland": [6.14, 46.2],
  "Stockholm, Sweden": [18.07, 59.33],
  "Copenhagen, Denmark": [12.57, 55.68],
  "Oslo, Norway": [10.75, 59.91],
  "Helsinki, Finland": [24.94, 60.17],
  "Dublin, Ireland": [-6.26, 53.35],
  "Prague, Czech Republic": [14.42, 50.07],
  "Warsaw, Poland": [21.01, 52.23],
  "Budapest, Hungary": [19.04, 47.5],
  "Athens, Greece": [23.73, 37.98],
  "Belgrade, Serbia": [20.46, 44.81],

  // Türkiye + Middle East
  "Istanbul, Türkiye": [28.98, 41.01],
  "Istanbul, Turkey": [28.98, 41.01],
  "Ankara, Türkiye": [32.86, 39.93],
  "Dubai, United Arab Emirates": [55.27, 25.2],
  "Doha, Qatar": [51.53, 25.29],
  "Riyadh, Saudi Arabia": [46.68, 24.69],
  "Tel Aviv, Israel": [34.78, 32.08],
  "Jerusalem, Israel": [35.21, 31.77],

  // Americas
  "New York, United States": [-74.0, 40.71],
  "New York, USA": [-74.0, 40.71],
  "Los Angeles, United States": [-118.24, 34.05],
  "San Francisco, United States": [-122.42, 37.77],
  "Chicago, United States": [-87.63, 41.88],
  "Miami, United States": [-80.19, 25.76],
  "Austin, United States": [-97.74, 30.27],
  "Boston, United States": [-71.06, 42.36],
  "Toronto, Canada": [-79.38, 43.65],
  "Vancouver, Canada": [-123.12, 49.28],
  "Montreal, Canada": [-73.57, 45.5],
  "Mexico City, Mexico": [-99.13, 19.43],
  "São Paulo, Brazil": [-46.63, -23.55],
  "Sao Paulo, Brazil": [-46.63, -23.55],
  "Rio de Janeiro, Brazil": [-43.17, -22.91],
  "Buenos Aires, Argentina": [-58.38, -34.61],
  "Santiago, Chile": [-70.65, -33.45],
  "Bogotá, Colombia": [-74.07, 4.71],
  "Lima, Peru": [-77.04, -12.05],

  // Asia-Pacific
  "Tokyo, Japan": [139.69, 35.69],
  "Osaka, Japan": [135.5, 34.69],
  "Singapore, Singapore": [103.82, 1.35],
  "Hong Kong, Hong Kong": [114.17, 22.32],
  "Seoul, South Korea": [126.98, 37.57],
  "Shanghai, China": [121.47, 31.23],
  "Beijing, China": [116.41, 39.9],
  "Bangkok, Thailand": [100.5, 13.75],
  "Kuala Lumpur, Malaysia": [101.69, 3.14],
  "Jakarta, Indonesia": [106.85, -6.21],
  "Manila, Philippines": [120.98, 14.6],
  "Mumbai, India": [72.88, 19.08],
  "Delhi, India": [77.21, 28.61],
  "Bengaluru, India": [77.59, 12.97],
  "Sydney, Australia": [151.21, -33.87],
  "Melbourne, Australia": [144.96, -37.81],
  "Auckland, New Zealand": [174.76, -36.85],

  // Africa
  "Cairo, Egypt": [31.24, 30.04],
  "Cape Town, South Africa": [18.42, -33.92],
  "Johannesburg, South Africa": [28.04, -26.2],
  "Nairobi, Kenya": [36.82, -1.29],
  "Lagos, Nigeria": [3.38, 6.52],
  "Casablanca, Morocco": [-7.59, 33.57],
  "Marrakech, Morocco": [-7.99, 31.63],
};

const byCity: Record<string, Coords> = {};
for (const [k, v] of Object.entries(CITIES)) {
  const city = k.split(",")[0];
  if (!(city in byCity)) byCity[city] = v;
}

export function geocode(city: string | null, country: string | null): Coords | null {
  if (!city) return null;
  const c = city.trim();
  const cc = (country ?? "").trim();
  const fullKey = `${c}, ${cc}`;
  if (fullKey in CITIES) return CITIES[fullKey];
  if (c in byCity) return byCity[c];
  // try case-insensitive
  const lower = c.toLowerCase();
  for (const [k, v] of Object.entries(CITIES)) {
    if (k.split(",")[0].toLowerCase() === lower) return v;
  }
  return null;
}
