import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icons reference image files that don't resolve
// correctly through most bundlers — point them at the CDN copies instead.
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

// A small, self-contained location picker with a Map / Satellite toggle,
// a draggable pin, and click-to-place. Free tiles (OpenStreetMap + Esri
// World Imagery) — no Google Maps API key needed.
export default function MapPicker({ lat, lng, onChange, height = 260, readOnly = false }) {
  const [view, setView] = useState('satellite');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const hasPosition = lat !== '' && lng !== '' && lat !== undefined && lng !== undefined && !Number.isNaN(Number(lat));
  const position = hasPosition ? [Number(lat), Number(lng)] : [17.6868, 83.2185]; // Visakhapatnam fallback center

  const layer = TILE_LAYERS[view];

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
        <button
          type="button"
          onClick={() => setView('map')}
          style={{
            flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: view === 'map' ? '#1a73e8' : '#f5f5f5',
            color: view === 'map' ? '#fff' : '#444',
          }}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setView('satellite')}
          style={{
            flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: view === 'satellite' ? '#1a73e8' : '#f5f5f5',
            color: view === 'satellite' ? '#fff' : '#444',
          }}
        >
          Satellite
        </button>
      </div>
      <MapContainer
        key={view /* force re-mount so the new tile layer paints cleanly */}
        center={position}
        zoom={hasPosition ? 17 : 12}
        style={{ height, width: '100%' }}
        scrollWheelZoom={!readOnly}
      >
        <TileLayer url={layer.url} attribution={layer.attribution} />
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
          Tap the map to drop a pin, or drag the marker to fine-tune it.
        </p>
      )}
    </div>
  );
}
