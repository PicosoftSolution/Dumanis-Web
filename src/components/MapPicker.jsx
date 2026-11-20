import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pointInRings } from '../utils/geo';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// MapTiler key comes from .env  ->  VITE_MAPTILER_KEY=your_key
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

// Highest zoom the map allows (tiles are stretched beyond maxNativeZoom)
const MAP_MAX_ZOOM = 22;

// Free fallback (used when there is no MapTiler key)
const ESRI_SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
  maxNativeZoom: 19,
  maxZoom: MAP_MAX_ZOOM,
};

const MAPTILER_SATELLITE = {
  url: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
  attribution:
    '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> &copy; OpenStreetMap contributors',
  maxNativeZoom: 20,
  maxZoom: MAP_MAX_ZOOM,
};

const TILE_LAYERS = {
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
    maxZoom: MAP_MAX_ZOOM,
  },
  satellite: MAPTILER_KEY ? MAPTILER_SATELLITE : ESRI_SATELLITE,
};

const NO_BOUNDARY = []; // stable reference so effects don't re-run

function ClickToPlace({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Search result select
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 17);
  }, [target, map]);
  return null;
}

// Leaflet needs to recalculate its size when the container changes
// (entering / leaving fullscreen), otherwise tiles look cut off or grey.
function ResizeFix({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

// Keeps the pin in view (first real position -> focus, later -> pan only if off-screen)
function FollowPosition({ position }) {
  const map = useMap();
  const firstFocus = useRef(true);
  const la = position ? position[0] : null;
  const ln = position ? position[1] : null;

  useEffect(() => {
    if (la === null || ln === null) return;
    const pos = [la, ln];
    if (firstFocus.current) {
      firstFocus.current = false;
      map.setView(pos, Math.max(map.getZoom(), 17));
      return;
    }
    if (!map.getBounds().contains(pos)) {
      map.setView(pos, map.getZoom());
    }
  }, [la, ln, map]);

  return null;
}

// Zooms to show the whole red boundary (only when the boundary changes)
function FitBoundary({ boundary }) {
  const map = useMap();
  const sig = boundary.length ? `${boundary.length}-${boundary[0].length}-${boundary[0][0]}` : '';
  useEffect(() => {
    if (sig) map.fitBounds(boundary.flat(), { padding: [20, 20] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, map]);
  return null;
}

const MaximizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/**
 * Props
 *  lat, lng     current pin
 *  onChange     (lat, lng, address?, { place }?) => void   (place = selected search result)
 *  readOnly     no editing
 *  boundary     red KML boundary: array of rings [[lat,lng],...]
 *  restrict     true  -> pins OUTSIDE the boundary are rejected (survey / entry page)
 *               false -> any location can be picked (project creation)
 *  fitBoundary  true  -> zoom to show the whole boundary
 *  outsideMessage  text of the red warning shown when a pin is rejected
 *  onOutside    () => void  called every time a pin is rejected (e.g. to show a toast)
 *  drawing      true -> draw-boundary mode: taps add polygon corners instead of moving the pin
 *  onDrawFinish (points) => void   points = [[lat,lng],...] (at least 3)
 *  onDrawCancel () => void
 */
export default function MapPicker({
  lat,
  lng,
  onChange,
  height = 260,
  readOnly = false,
  boundary = NO_BOUNDARY,
  restrict = false,
  fitBoundary = false,
  outsideMessage = '⚠ This location is outside the project Area of Interest (red boundary).',
  onOutside,
  drawing = false,
  onDrawFinish,
  onDrawCancel,
}) {
  const [view, setView] = useState('satellite');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [outsideMsg, setOutsideMsg] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const debounceRef = useRef(null);

  // each time draw mode starts, begin with an empty polygon
  useEffect(() => {
    if (drawing) setDrawPoints([]);
  }, [drawing]);

  const isOutside = (la, ln) => restrict && boundary.length > 0 && !pointInRings(la, ln, boundary);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // While fullscreen: lock page scroll and let Esc close it
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen]);

  // Typing debounce -> Nominatim search
  useEffect(() => {
    if (readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      setSearchMsg('');
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error('Search failed ' + res.status);
        const data = await res.json();
        setResults(data || []);
        setShowResults(true);
        setSearchMsg(data && data.length ? '' : 'No results found. Try a different name.');
      } catch (err) {
        console.error('Location search error:', err);
        setResults([]);
        setSearchMsg('Search failed. Check your internet and try again.');
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, readOnly]);

  const warnOutside = () => {
    onOutside && onOutside();
    setOutsideMsg(true);
    setTimeout(() => setOutsideMsg(false), 3000);
  };

  // EVERY pin change (click / drag) goes through here.
  // With `restrict`, a point outside the red boundary is rejected.
  const safeChange = (la, ln, address, extra) => {
    if (isOutside(la, ln)) {
      warnOutside();
      return;
    }
    onChange && onChange(la, ln, address, extra);
  };

  const pickResult = (place) => {
    const la = parseFloat(place.lat);
    const ln = parseFloat(place.lon);
    setShowResults(false);
    setQuery(place.display_name);
    if (isOutside(la, ln)) {
      warnOutside();
      return;
    }
    setFlyTarget({ lat: la, lng: ln });
    // 4th argument: the selected search result (parent fetches its polygon)
    onChange && onChange(la, ln, place.display_name, { place });
  };

  const hasPosition = lat !== '' && lng !== '' && lat !== undefined && lng !== undefined && !Number.isNaN(Number(lat));
  const position = hasPosition ? [Number(lat), Number(lng)] : [17.6868, 83.2185];

  const layer = TILE_LAYERS[view];

  const wrapperStyle = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : { borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' };

  return (
    <div style={wrapperStyle}>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', flexShrink: 0 }}>
        <button type="button" onClick={() => setView('map')} style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: view === 'map' ? '#1a73e8' : '#f5f5f5', color: view === 'map' ? '#fff' : '#444' }}>Map</button>
        <button type="button" onClick={() => setView('satellite')} style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: view === 'satellite' ? '#1a73e8' : '#f5f5f5', color: view === 'satellite' ? '#fff' : '#444' }}>Satellite</button>
      </div>

      {!readOnly && (
        <div style={{ position: 'relative', padding: 8, borderBottom: '1px solid #eee', background: '#fff', flexShrink: 0 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search for a place or address..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, outline: 'none' }}
          />
          {searching && (
            <span style={{ position: 'absolute', right: 18, top: 18, fontSize: 11, color: '#999' }}>Searching...</span>
          )}
          {searchMsg && !searching && (
            <p style={{ margin: '6px 2px 0', fontSize: 11.5, color: '#c62828' }}>{searchMsg}</p>
          )}
          {showResults && results.length > 0 && (
            <div style={{ position: 'absolute', left: 8, right: 8, top: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 6, maxHeight: 180, overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              {results.map((place) => (
                <div
                  key={place.place_id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickResult(place)}
                  style={{ padding: '8px 10px', fontSize: 12.5, cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                >
                  <span
                    title={place.osm_type === 'node' ? 'Point only' : 'Has an area boundary'}
                    style={{ float: 'right', marginLeft: 8, fontSize: 10, fontWeight: 600, color: place.osm_type === 'node' ? '#999' : '#2e7d32' }}
                  >
                    {place.osm_type === 'node' ? 'point' : 'area'}
                  </span>
                  {place.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          ...(isFullscreen ? { flex: 1, minHeight: 0 } : { height }),
        }}
      >
        <MapContainer
          key={view}
          center={position}
          zoom={hasPosition ? 17 : 12}
          maxZoom={MAP_MAX_ZOOM}
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!readOnly}
        >
          <TileLayer
            url={layer.url}
            attribution={layer.attribution}
            maxNativeZoom={layer.maxNativeZoom}
            maxZoom={layer.maxZoom}
          />
          <FlyTo target={flyTarget} />
          <ResizeFix trigger={isFullscreen} />
          <FollowPosition position={hasPosition ? position : null} />

          {/* Red KML boundary */}
          {boundary.map((ring, i) => (
            <Polygon
              key={i}
              positions={ring}
              interactive={false}
              pathOptions={{ color: '#ff0000', weight: 3, fillOpacity: 0.04 }}
            />
          ))}
          {fitBoundary && <FitBoundary boundary={boundary} />}

          {/* Polygon being drawn */}
          {drawing && drawPoints.length >= 3 && (
            <Polygon positions={drawPoints} interactive={false} pathOptions={{ color: '#ff0000', weight: 3, dashArray: '6 6', fillOpacity: 0.08 }} />
          )}
          {drawing && drawPoints.length === 2 && (
            <Polyline positions={drawPoints} interactive={false} pathOptions={{ color: '#ff0000', weight: 3, dashArray: '6 6' }} />
          )}
          {drawing && drawPoints.map((pt, i) => (
            <CircleMarker key={i} center={pt} radius={5} interactive={false} pathOptions={{ color: '#ff0000', fillColor: '#fff', fillOpacity: 1, weight: 2 }} />
          ))}

          {hasPosition && (
            <Marker
              key={`${position[0]}-${position[1]}`}
              position={position}
              draggable={!readOnly && !drawing}
              eventHandlers={
                readOnly
                  ? undefined
                  : {
                      dragend: (e) => {
                        const p = e.target.getLatLng();
                        safeChange(p.lat, p.lng);
                      },
                    }
              }
            />
          )}
          {!readOnly && (
            <ClickToPlace
              onPick={(la, ln) =>
                drawing ? setDrawPoints((pts) => [...pts, [la, ln]]) : safeChange(la, ln)
              }
            />
          )}
        </MapContainer>

        {outsideMsg && (
          <div style={{ position: 'absolute', left: 10, right: 54, bottom: 10, zIndex: 1000, background: '#ffebee', color: '#c62828', fontSize: 12, fontWeight: 600, padding: '8px 10px', borderRadius: 6, border: '1px solid #ef9a9a' }}>
            {outsideMessage}
          </div>
        )}

        {drawing && (
          <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 1000, display: 'flex', gap: 6 }}>
            <button
              type="button"
              disabled={drawPoints.length < 3}
              onClick={() => onDrawFinish && onDrawFinish(drawPoints)}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: drawPoints.length < 3 ? 'not-allowed' : 'pointer', background: drawPoints.length < 3 ? '#9e9e9e' : '#2e7d32', color: '#fff' }}
            >
              Finish ({drawPoints.length})
            </button>
            <button
              type="button"
              disabled={drawPoints.length === 0}
              onClick={() => setDrawPoints((pts) => pts.slice(0, -1))}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#333' }}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => onDrawCancel && onDrawCancel()}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #ef9a9a', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#c62828' }}
            >
              Cancel
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            color: '#333',
            border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 4,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
        </button>
      </div>

      {!isOnline && (
        <p style={{ fontSize: 11, color: '#e65100', padding: '6px 10px', margin: 0, background: '#fff3e0', borderTop: '1px solid #ffe0b2', flexShrink: 0 }}>
          📴 Offline — map imagery may not load, but your GPS coordinates are still captured and will sync when you're back online.
        </p>
      )}
      {!readOnly && (
        <p style={{ fontSize: 11, color: '#888', padding: '6px 10px', margin: 0, background: '#fafafa', flexShrink: 0 }}>
          {drawing
            ? 'Tap on the map to add the corner points of the boundary (at least 3), then press Finish.'
            : restrict && boundary.length > 0
            ? 'The pin is locked inside the red boundary. Tap inside it or drag the marker to fine-tune.'
            : 'Tap the map to drop a pin or search above, or drag the marker to fine-tune it.'}
        </p>
      )}
    </div>
  );
}