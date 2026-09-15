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

export default function MapPicker({ lat, lng, onChange, height = 260, readOnly = false }) {
  const [view, setView] = useState('satellite');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
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

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
        <button type="button" onClick={() => setView('map')} style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: view === 'map' ? '#1a73e8' : '#f5f5f5', color: view === 'map' ? '#fff' : '#444' }}>Map</button>
        <button type="button" onClick={() => setView('satellite')} style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: view === 'satellite' ? '#1a73e8' : '#f5f5f5', color: view === 'satellite' ? '#fff' : '#444' }}>Satellite</button>
      </div>

      {!readOnly && (
        <div style={{ position: 'relative', padding: 8, borderBottom: '1px solid #eee', background: '#fff' }}>
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

      <MapContainer
        key={view}
        center={position}
        zoom={hasPosition ? 17 : 12}
        style={{ height, width: '100%' }}
        scrollWheelZoom={!readOnly}
      >
        <TileLayer url={layer.url} attribution={layer.attribution} />
        <FlyTo target={flyTarget} />
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
      {!isOnline && (
        <p style={{ fontSize: 11, color: '#e65100', padding: '6px 10px', margin: 0, background: '#fff3e0', borderTop: '1px solid #ffe0b2' }}>
          📴 Offline — map imagery may not load, but your GPS coordinates are still captured and will sync when you're back online.
        </p>
      )}
      {!readOnly && (
        <p style={{ fontSize: 11, color: '#888', padding: '6px 10px', margin: 0, background: '#fafafa' }}>
          Tap the map to drop a pin or search above, or drag the marker to fine-tune it.
        </p>
      )}
    </div>
  );
}