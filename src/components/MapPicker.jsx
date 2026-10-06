import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TILE_LAYERS = {
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

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

// Keeps the pin in view. The map's `center` prop is only read once on mount,
// so when the device GPS arrives AFTER the map has rendered (or the user taps
// "Use my current GPS"), the pin used to be placed far outside the visible
// area. This focuses the map on the first real position, and afterwards pans
// only if the pin ends up off-screen (so dragging/tapping isn't disturbed).
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

export default function MapPicker({ lat, lng, onChange, height = 260, readOnly = false }) {
  const [view, setView] = useState('satellite');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const debounceRef = useRef(null);

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

  // Type debounce  Nominatim search call
  useEffect(() => {
    if (readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data || []);
        setShowResults(true);
      } catch (err) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, readOnly]);

  const pickResult = (place) => {
    const la = parseFloat(place.lat);
    const ln = parseFloat(place.lon);
    setFlyTarget({ lat: la, lng: ln });
    setShowResults(false);
    setQuery(place.display_name);
    onChange && onChange(la, ln, place.display_name);
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
          {showResults && results.length > 0 && (
            <div style={{ position: 'absolute', left: 8, right: 8, top: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 6, maxHeight: 180, overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
              {results.map((place) => (
                <div
                  key={place.place_id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickResult(place)}
                  style={{ padding: '8px 10px', fontSize: 12.5, cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                >
                  {place.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map area: zoom +/- (top-left) and fullscreen toggle (top-right) */}
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
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!readOnly}
        >
          <TileLayer url={layer.url} attribution={layer.attribution} />
          <FlyTo target={flyTarget} />
          <ResizeFix trigger={isFullscreen} />
          <FollowPosition position={hasPosition ? position : null} />
          {hasPosition && (
            <Marker
              position={position}
              draggable={!readOnly}
              eventHandlers={
                readOnly
                  ? undefined
                  : {
                      dragend: (e) => {
                        const p = e.target.getLatLng();
                        onChange && onChange(p.lat, p.lng);
                      },
                    }
              }
            />
          )}
          {!readOnly && <ClickToPlace onPick={(la, ln) => onChange && onChange(la, ln)} />}
        </MapContainer>

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
          Tap the map to drop a pin or search above, or drag the marker to fine-tune it.
        </p>
      )}
    </div>
  );
}