import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/LiveMap.css";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const driverIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366F1'%3E%3Cpath d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/%3E%3C/svg%3E",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const deliveryIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310B981'%3E%3Cpath d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const pickupIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B'%3E%3Cpath d='M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z'/%3E%3C/svg%3E",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface LiveMapProps {
  driverLocation?: { lat: number; lng: number } | null;
  deliveryLocation?: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number } | null;
  showDeliveryZone?: boolean;
  deliveryZoneRadius?: number;
}

// Component to auto-fit bounds
function AutoFitBounds({ 
  driverLocation, 
  deliveryLocation, 
  pickupLocation 
}: { 
  driverLocation?: { lat: number; lng: number } | null;
  deliveryLocation?: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  
  useEffect(() => {
    const bounds: [number, number][] = [];
    
    if (driverLocation) bounds.push([driverLocation.lat, driverLocation.lng]);
    if (deliveryLocation) bounds.push([deliveryLocation.lat, deliveryLocation.lng]);
    if (pickupLocation) bounds.push([pickupLocation.lat, pickupLocation.lng]);
    
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 15 });
    }
  }, [driverLocation, deliveryLocation, pickupLocation, map]);
  
  return null;
}

export default function LiveMap({
  driverLocation,
  deliveryLocation,
  pickupLocation,
  showDeliveryZone = false,
  deliveryZoneRadius = 500,
}: LiveMapProps) {
  const mapRef = useRef<any>(null);

  // Calculate default center
  const defaultCenter: [number, number] = 
    driverLocation ? [driverLocation.lat, driverLocation.lng] :
    deliveryLocation ? [deliveryLocation.lat, deliveryLocation.lng] :
    pickupLocation ? [pickupLocation.lat, pickupLocation.lng] :
    [28.6139, 77.2090]; // Default to Delhi

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Calculate ETA (assuming average speed of 30 km/h in city)
  const calculateETA = (distanceInMeters: number): string => {
    const speedKmh = 30;
    const speedMs = speedKmh * 1000 / 3600;
    const timeSeconds = distanceInMeters / speedMs;
    const minutes = Math.round(timeSeconds / 60);
    
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const distance = driverLocation && deliveryLocation
    ? calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        deliveryLocation.lat,
        deliveryLocation.lng
      )
    : null;

  const eta = distance ? calculateETA(distance) : null;

  // Create polyline between driver and delivery
  const routePositions: [number, number][] = [];
  if (pickupLocation && driverLocation) {
    routePositions.push([pickupLocation.lat, pickupLocation.lng]);
    routePositions.push([driverLocation.lat, driverLocation.lng]);
  }
  if (driverLocation && deliveryLocation) {
    if (routePositions.length === 0) {
      routePositions.push([driverLocation.lat, driverLocation.lng]);
    }
    routePositions.push([deliveryLocation.lat, deliveryLocation.lng]);
  }

  return (
    <div className="live-map-container">
      {distance !== null && (
        <div className="map-info-overlay">
          <div className="map-info-card">
            <div className="map-info-item">
              <span className="map-info-icon">📍</span>
              <div>
                <div className="map-info-label">Distance</div>
                <div className="map-info-value">
                  {distance < 1000
                    ? `${Math.round(distance)} m`
                    : `${(distance / 1000).toFixed(2)} km`}
                </div>
              </div>
            </div>
            {eta && (
              <div className="map-info-item">
                <span className="map-info-icon">⏱️</span>
                <div>
                  <div className="map-info-label">ETA</div>
                  <div className="map-info-value">{eta}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={13}
        ref={mapRef}
        className="leaflet-map"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds
          driverLocation={driverLocation}
          deliveryLocation={deliveryLocation}
          pickupLocation={pickupLocation}
        />

        {/* Pickup Location Marker */}
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
            <Popup>
              <div className="map-popup">
                <strong>🏪 Pickup Location</strong>
                <p>Seller's Store</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Location Marker */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>
              <div className="map-popup">
                <strong>🚗 Driver Location</strong>
                <p>Live tracking active</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery Location Marker */}
        {deliveryLocation && (
          <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={deliveryIcon}>
            <Popup>
              <div className="map-popup">
                <strong>🏠 Delivery Location</strong>
                <p>Your destination</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery Zone Circle */}
        {showDeliveryZone && deliveryLocation && (
          <Circle
            center={[deliveryLocation.lat, deliveryLocation.lng]}
            radius={deliveryZoneRadius}
            pathOptions={{
              color: "#10B981",
              fillColor: "#10B981",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5",
            }}
          />
        )}

        {/* Route Line */}
        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#6366F1",
              weight: 4,
              opacity: 0.7,
              dashArray: "10, 10",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
