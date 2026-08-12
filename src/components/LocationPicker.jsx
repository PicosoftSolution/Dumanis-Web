import React, { useState, useEffect } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LocationPicker({ onLocationSelect, initialLocation, readOnly }) {
  const [location, setLocation] = useState(initialLocation || { lat: '', lng: '', address: '' });
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentLocation = () => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: ''
          };
          setLocation(newLocation);
          
          // Get address from coordinates
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLocation.lat}&lon=${newLocation.lng}`);
            const data = await response.json();
            newLocation.address = data.display_name;
            setLocation(newLocation);
          } catch (error) {
            console.error('Error getting address:', error);
          }
          
          if (onLocationSelect) onLocationSelect(newLocation);
          toast.success('Location captured successfully');
          setIsLoading(false);
        },
        (error) => {
          toast.error('Unable to get location. Please check permissions.');
          setIsLoading(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setIsLoading(false);
    }
  };

  const updateAddress = (address) => {
    const newLocation = { ...location, address };
    setLocation(newLocation);
    if (onLocationSelect) onLocationSelect(newLocation);
  };

  const updateCoordinates = (field, value) => {
    const newLocation = { ...location, [field]: parseFloat(value) || '' };
    setLocation(newLocation);
    if (onLocationSelect) onLocationSelect(newLocation);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Location</label>
        {!readOnly && (
          <button type="button" onClick={getCurrentLocation} disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            <span>Get Current Location</span>
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Address</label>
        <input type="text" value={location.address} onChange={(e) => updateAddress(e.target.value)}
          placeholder="Search or enter address..."
          readOnly={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Latitude</label>
          <input type="text" value={location.lat} onChange={(e) => updateCoordinates('lat', e.target.value)}
            placeholder="0.000000" readOnly={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Longitude</label>
          <input type="text" value={location.lng} onChange={(e) => updateCoordinates('lng', e.target.value)}
            placeholder="0.000000" readOnly={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      {/* Map Preview */}
      {location.lat && location.lng && (
        <div className="mt-2">
          <iframe
            title="Location Map"
            width="100%"
            height="200"
            frameBorder="0"
            style={{ border: 0, borderRadius: '8px' }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng-0.01},${location.lat-0.01},${location.lng+0.01},${location.lat+0.01}&layer=mapnik&marker=${location.lat},${location.lng}`}
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}