// Boundary helpers. The boundary polygon of the picked place is fetched from
// OpenStreetMap (Nominatim), drawn manually, or imported from a .kml file,
// and stored with the project.
//
// An "Area of Interest" (AOI) looks like:  { name: 'Kukatpally', rings: [ [[lat,lng],...], ... ] }

// When the picked place has no polygon of its own, try bigger and bigger
// containing areas (Nominatim zoom: 14 locality, 13 suburb, 12 town/mandal, 10 city)
const BOUNDARY_ZOOMS = [14, 13, 12, 10];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GeoJSON Polygon / MultiPolygon -> rings of [lat,lng]  (outer boundaries only)
export const geojsonToRings = (g) => {
  if (!g) return [];
  const toRing = (coords) => coords.map(([lng, lat]) => [lat, lng]);
  if (g.type === 'Polygon') return [toRing(g.coordinates[0])];
  if (g.type === 'MultiPolygon') return g.coordinates.map((p) => toRing(p[0]));
  return [];
};

// Polygon of ONE selected search result (a light request, only for the chosen place).
// `place` is an item from the Nominatim search (has osm_type + osm_id).
// Returns rings ([] when OSM has no polygon for it, e.g. the place is only a point).
export async function fetchPlacePolygon(place) {
  const t = { node: 'N', way: 'W', relation: 'R' }[place?.osm_type];
  if (!t || !place.osm_id) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${t}${place.osm_id}&format=json&polygon_geojson=1&polygon_threshold=0.0005`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return geojsonToRings(data?.[0]?.geojson);
  } catch (err) {
    console.error('Place polygon fetch failed:', err);
    return [];
  }
}

// Finds a REAL boundary polygon around (lat,lng) from OpenStreetMap.
// Tries locality -> suburb -> town/mandal -> city and returns the first one that
// has a polygon. Returns { name, rings } or null when none exists.
export async function fetchBoundary(lat, lng) {
  for (let i = 0; i < BOUNDARY_ZOOMS.length; i++) {
    if (i > 0) await sleep(1100); // Nominatim allows ~1 request / second
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&polygon_geojson=1&polygon_threshold=0.0005&zoom=${BOUNDARY_ZOOMS[i]}&lat=${lat}&lon=${lng}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const rings = geojsonToRings(data.geojson);
      if (rings.length > 0) {
        const name = data.name || (data.display_name || '').split(',')[0] || 'Selected area';
        return { name, rings, source: 'osm' };
      }
    } catch (err) {
      console.error('Boundary fetch failed:', err);
    }
  }
  return null;
}

// Ray-casting point-in-polygon. ring = [[lat,lng], ...]
const inRing = (lat, lng, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

export const pointInRings = (lat, lng, rings = []) =>
  rings.some((r) => inRing(Number(lat), Number(lng), r));

// Is this point inside the project's Area of Interest?
// Project has no AOI -> everything allowed.
export const isInsideAOI = (lat, lng, aoi) =>
  !aoi || !aoi.rings || aoi.rings.length === 0 || pointInRings(lat, lng, aoi.rings);

// ─────────────────────────────────────────────────────────────
// KML import
// ─────────────────────────────────────────────────────────────
// KML file text -> { name, rings, source: 'kml' }
// Reads every <Polygon> outer boundary (KML coordinates are lng,lat[,alt]).
// Throws an Error with a readable message when nothing usable is found.
const MAX_POINTS_PER_RING = 3000; // keeps the project payload small

export function parseKml(text, fallbackName = '') {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('This is not a valid KML file');
  }

  const rings = [];
  const polygons = Array.from(doc.getElementsByTagNameNS('*', 'Polygon'));

  polygons.forEach((poly) => {
    const outer = poly.getElementsByTagNameNS('*', 'outerBoundaryIs')[0];
    const coordNode = outer?.getElementsByTagNameNS('*', 'coordinates')[0];
    if (!coordNode) return;

    let ring = coordNode.textContent
      .trim()
      .split(/\s+/)
      .map((c) => c.split(',').map(Number))
      .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([lng, lat]) => [lat, lng]);

    if (ring.length < 3) return;

    // thin out very detailed rings
    if (ring.length > MAX_POINTS_PER_RING) {
      const step = Math.ceil(ring.length / MAX_POINTS_PER_RING);
      ring = ring.filter((_, i) => i % step === 0);
    }

    // close the ring
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);

    rings.push(ring);
  });

  if (rings.length === 0) {
    throw new Error('No polygon found in this KML file (only Polygon boundaries are supported)');
  }

  const nameNode =
    doc.getElementsByTagNameNS('*', 'Placemark')[0]?.getElementsByTagNameNS('*', 'name')[0] ||
    doc.getElementsByTagNameNS('*', 'Document')[0]?.getElementsByTagNameNS('*', 'name')[0];
  const name = (nameNode?.textContent || '').trim() || fallbackName || 'Imported area';

  return { name, rings, source: 'kml' };
}