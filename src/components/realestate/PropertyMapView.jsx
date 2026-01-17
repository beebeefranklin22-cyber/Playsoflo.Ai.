import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { DollarSign, Bed, Bath, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icon based on price
const createCustomIcon = (property) => {
  const price = property.listing_type === "short_term" ? property.price_per_night :
                property.listing_type === "for_rent" ? property.price_per_month :
                property.sale_price;
  
  const priceLabel = property.listing_type === "short_term" ? `$${price}/nt` :
                     property.listing_type === "for_rent" ? `$${price}/mo` :
                     `$${(price / 1000).toFixed(0)}k`;
  
  const color = property.listing_type === "for_sale" ? "#10b981" :
                property.listing_type === "for_rent" ? "#3b82f6" : "#8b5cf6";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 12px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${priceLabel}
      </div>
    `,
    iconSize: [60, 30],
    iconAnchor: [30, 30],
  });
};

function MapController({ center, zoom, onBoundsChange }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        center: map.getCenter(),
        zoom: map.getZoom()
      });
    }
  });
  
  return null;
}

export default function PropertyMapView({ properties, onPropertyClick, searchCenter, searchZoom, onSearchThisArea }) {
  const [mapCenter, setMapCenter] = useState([25.7617, -80.1918]); // Miami default
  const [mapZoom, setMapZoom] = useState(11);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [currentBounds, setCurrentBounds] = useState(null);

  useEffect(() => {
    if (searchCenter && searchZoom) {
      setMapCenter(searchCenter);
      setMapZoom(searchZoom);
      setShowSearchButton(false);
    } else if (properties.length > 0) {
      // Center on properties
      const validProperties = properties.filter(p => p.latitude && p.longitude);
      if (validProperties.length > 0) {
        const avgLat = validProperties.reduce((sum, p) => sum + p.latitude, 0) / validProperties.length;
        const avgLng = validProperties.reduce((sum, p) => sum + p.longitude, 0) / validProperties.length;
        setMapCenter([avgLat, avgLng]);
      }
    }
  }, [properties, searchCenter, searchZoom]);

  const handleBoundsChange = (bounds) => {
    setCurrentBounds(bounds);
    setShowSearchButton(true);
  };

  const handleSearchThisArea = () => {
    if (currentBounds && onSearchThisArea) {
      onSearchThisArea(currentBounds);
      setShowSearchButton(false);
    }
  };

  const getPrice = (property) => {
    if (property.listing_type === "short_term" && property.price_per_night) {
      return `$${property.price_per_night}/night`;
    } else if (property.listing_type === "for_rent" && property.price_per_month) {
      return `$${property.price_per_month.toLocaleString()}/mo`;
    } else if (property.listing_type === "for_sale" && property.sale_price) {
      return `$${property.sale_price.toLocaleString()}`;
    }
    return "Contact for price";
  };

  const validProperties = properties.filter(p => p.latitude && p.longitude);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden">
      {showSearchButton && onSearchThisArea && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <Button
            onClick={handleSearchThisArea}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Search className="w-4 h-4 mr-2" />
            Search This Area
          </Button>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <MapController center={mapCenter} zoom={mapZoom} onBoundsChange={handleBoundsChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validProperties.map((property) => (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
            icon={createCustomIcon(property)}
          >
            <Popup>
              <div className="w-64">
                <img
                  src={property.main_image}
                  alt={property.title}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                <h3 className="font-bold text-base mb-1 line-clamp-2">{property.title}</h3>
                <div className="flex items-center gap-2 text-gray-600 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{property.location}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-700 mb-2">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg text-emerald-600">
                    {getPrice(property)}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full capitalize">
                    {property.listing_type.replace('_', ' ')}
                  </span>
                </div>
                
                <Button
                  onClick={() => onPropertyClick(property)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {validProperties.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
          <div className="text-center text-white">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No properties with location data</p>
          </div>
        </div>
      )}
    </div>
  );
}