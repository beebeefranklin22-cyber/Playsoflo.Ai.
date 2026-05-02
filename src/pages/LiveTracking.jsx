import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Package, Car, MapPin, MessageCircle, RefreshCw, Clock, CheckCircle, Truck, User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingChatModal from '@/components/tracking/BookingChatModal';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const REFRESH_INTERVAL_MS = 6000; // 6 seconds for snappier updates

const STATUS_COLORS = {
  accepted: 'text-blue-400',
  en_route: 'text-yellow-400',
  arrived: 'text-orange-400',
  in_progress: 'text-green-400',
  driver_assigned: 'text-blue-400',
  en_route_pickup: 'text-yellow-400',
  picked_up: 'text-orange-400',
  in_transit: 'text-green-400',
  out_for_delivery: 'text-cyan-400',
  confirmed: 'text-blue-400',
  active: 'text-green-400',
};

const TAB_CONFIG = [
  { id: 'rides', label: 'Rides', icon: Navigation },
  { id: 'deliveries', label: 'Deliveries', icon: Package },
  { id: 'rentals', label: 'Rentals', icon: Car },
];

const ACTIVE_RIDE_STATUSES = ['accepted', 'en_route', 'arrived', 'in_progress'];
const ACTIVE_DELIVERY_STATUSES = ['driver_assigned', 'en_route_pickup', 'picked_up', 'in_transit', 'out_for_delivery'];
const ACTIVE_RENTAL_STATUSES = ['confirmed', 'active'];

// Car SVG marker for driver
const CAR_MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="22" fill="#7C3AED" stroke="white" stroke-width="3"/>
  <path d="M14 26l2-6h16l2 6" fill="none" stroke="white" stroke-width="1.5"/>
  <rect x="11" y="26" width="26" height="8" rx="3" fill="white"/>
  <circle cx="16" cy="35" r="3" fill="#7C3AED"/>
  <circle cx="32" cy="35" r="3" fill="#7C3AED"/>
</svg>`;

const carMarkerIcon = () => ({
  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(CAR_MARKER_SVG),
  scaledSize: new window.google.maps.Size(48, 48),
  anchor: new window.google.maps.Point(24, 24),
});

export default function LiveTracking() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('rides');
  const [rides, setRides] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [chatModal, setChatModal] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [driverEta, setDriverEta] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const intervalRef = useRef(null);
  const selectedItemRef = useRef(null);

  // Keep ref in sync for interval callback
  useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchActiveItems();
      intervalRef.current = setInterval(fetchActiveItems, REFRESH_INTERVAL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [currentUser]);

  // Re-render map whenever selected item changes or map becomes ready
  useEffect(() => {
    if (mapLoaded && selectedItem) {
      initOrUpdateMap(selectedItem);
    }
  }, [selectedItem, mapLoaded]);

  const loadGoogleMaps = () => {
    if (window.google?.maps) { setMapLoaded(true); return; }
    if (document.querySelector('#gmap-script')) return;
    const script = document.createElement('script');
    script.id = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  };

  const fetchActiveItems = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [rideData, deliveryData, rentalData] = await Promise.all([
        base44.entities.RideRequest.filter({ created_by: currentUser.email }),
        base44.entities.DeliveryOrder.filter({ sender_email: currentUser.email }),
        base44.entities.CarRental.filter({ renter_email: currentUser.email }),
      ]);

      const activeRides = rideData.filter(r => ACTIVE_RIDE_STATUSES.includes(r.status));
      const activeDeliveries = deliveryData.filter(d => ACTIVE_DELIVERY_STATUSES.includes(d.status));
      const activeRentals = rentalData.filter(r => ACTIVE_RENTAL_STATUSES.includes(r.status));

      setRides(activeRides);
      setDeliveries(activeDeliveries);
      setRentals(activeRentals);
      setLastRefresh(new Date());

      setSelectedItem(prev => {
        const all = [...activeRides, ...activeDeliveries, ...activeRentals];
        if (prev) {
          const updated = all.find(i => i.id === prev.id);
          if (updated) {
            // Smoothly animate the driver marker to new location if map is ready
            if (mapLoaded && window.google) {
              smoothMoveDriverMarker(updated);
            }
            return updated;
          }
          return prev;
        }
        return activeRides[0] || activeDeliveries[0] || activeRentals[0] || null;
      });
    } catch (err) {
      console.error('Failed to fetch active items:', err);
    }
  }, [currentUser, mapLoaded]);

  // ── Map initialization ──────────────────────────────────────────────────────
  const initOrUpdateMap = (item) => {
    if (!mapRef.current || !window.google) return;

    const driverLoc = getProviderLocation(item);
    const pickupLoc = getPickupCoords(item);
    const destLoc = getDestinationCoords(item);
    const center = driverLoc || pickupLoc || destLoc || { lat: 25.7617, lng: -80.1918 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center,
        styles: darkMapStyles,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    } else {
      mapInstanceRef.current.panTo(center);
    }

    // ── Pickup marker (green pin) ────────────────────────────────────
    if (pickupLoc) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new window.google.maps.Marker({
          position: pickupLoc,
          map: mapInstanceRef.current,
          title: 'Pickup',
          icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
          zIndex: 10,
        });
        new window.google.maps.InfoWindow({ content: '<div style="color:#111;font-weight:bold;font-size:12px;">📍 Pickup</div>' })
          .open(mapInstanceRef.current, pickupMarkerRef.current);
      } else {
        pickupMarkerRef.current.setPosition(pickupLoc);
      }
    }

    // ── Destination marker (red pin) ─────────────────────────────────
    if (destLoc) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = new window.google.maps.Marker({
          position: destLoc,
          map: mapInstanceRef.current,
          title: 'Destination',
          icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
          zIndex: 10,
        });
        new window.google.maps.InfoWindow({ content: '<div style="color:#111;font-weight:bold;font-size:12px;">🏁 Destination</div>' })
          .open(mapInstanceRef.current, destMarkerRef.current);
      } else {
        destMarkerRef.current.setPosition(destLoc);
      }
    }

    // ── Driver marker (animated car SVG) ─────────────────────────────
    if (driverLoc) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: driverLoc,
          map: mapInstanceRef.current,
          title: item.driver_name || 'Driver',
          icon: carMarkerIcon(),
          zIndex: 20,
          animation: window.google.maps.Animation.DROP,
        });
        const driverInfo = new window.google.maps.InfoWindow({
          content: `<div style="color:#111;font-size:12px;"><strong>🚗 ${item.driver_name || 'Your Driver'}</strong>${item.estimated_arrival_time ? `<br/>ETA: ${item.estimated_arrival_time} min` : ''}</div>`
        });
        driverMarkerRef.current.addListener('click', () => driverInfo.open(mapInstanceRef.current, driverMarkerRef.current));
      } else {
        smoothMoveDriverMarker(item);
      }

      // Compute ETA
      if (item.estimated_arrival_time) setDriverEta(item.estimated_arrival_time);
    } else {
      // No driver location yet — clear marker
      if (driverMarkerRef.current) { driverMarkerRef.current.setMap(null); driverMarkerRef.current = null; }
    }

    // ── Route polyline (directions API) ──────────────────────────────
    if (pickupLoc && destLoc) {
      drawRoute(pickupLoc, destLoc);
    }

    // Fit bounds to show all markers
    fitBoundsToMarkers(driverLoc, pickupLoc, destLoc);
  };

  // Smooth driver marker animation (interpolated movement)
  const smoothMoveDriverMarker = (item) => {
    if (!driverMarkerRef.current || !window.google) return;
    const newPos = getProviderLocation(item);
    if (!newPos) return;

    const STEPS = 30;
    const current = driverMarkerRef.current.getPosition();
    if (!current) { driverMarkerRef.current.setPosition(newPos); return; }

    const latStep = (newPos.lat - current.lat()) / STEPS;
    const lngStep = (newPos.lng - current.lng()) / STEPS;
    let step = 0;

    const animate = () => {
      if (step >= STEPS) return;
      step++;
      driverMarkerRef.current?.setPosition({
        lat: current.lat() + latStep * step,
        lng: current.lng() + lngStep * step,
      });
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const drawRoute = (origin, destination) => {
    if (!window.google || !mapInstanceRef.current) return;
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#7C3AED', strokeWeight: 5, strokeOpacity: 0.8 },
    });
    directionsRenderer.setMap(mapInstanceRef.current);
    directionsService.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK') directionsRenderer.setDirections(result);
      }
    );
    if (routePolylineRef.current) routePolylineRef.current.setMap(null);
    routePolylineRef.current = directionsRenderer;
  };

  const fitBoundsToMarkers = (driver, pickup, dest) => {
    if (!mapInstanceRef.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    [driver, pickup, dest].forEach(loc => { if (loc) bounds.extend(loc); });
    if (!bounds.isEmpty()) mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getProviderLocation = (item) => {
    if (!item) return null;
    const loc = item.driver_location;
    if (Array.isArray(loc) && loc.length === 2) return { lat: loc[0], lng: loc[1] };
    if (loc?.latitude && loc?.longitude) return { lat: loc.latitude, lng: loc.longitude };
    return null;
  };

  const getDestinationCoords = (item) => {
    if (!item) return null;
    if (item.dropoff_coords?.length === 2) return { lat: item.dropoff_coords[0], lng: item.dropoff_coords[1] };
    if (item.delivery_coords?.length === 2) return { lat: item.delivery_coords[0], lng: item.delivery_coords[1] };
    return null;
  };

  const getPickupCoords = (item) => {
    if (!item) return null;
    if (item.pickup_coords?.length === 2) return { lat: item.pickup_coords[0], lng: item.pickup_coords[1] };
    return null;
  };

  const getItemType = (item) => {
    if (item?.ride_type) return 'ride';
    if (item?.package_type) return 'delivery';
    return 'rental';
  };

  const getProviderEmail = (item) => item?.driver_email || item?.provider_email || '';
  const getProviderName = (item) => item?.driver_name || (item?.car_make ? `${item.car_make} ${item.car_model} Owner` : item?.driver_email || 'Provider');
  const getItemLabel = (item) => {
    if (item?.ride_type) return `${item.ride_type.charAt(0).toUpperCase() + item.ride_type.slice(1)} Ride`;
    if (item?.package_type) return `${item.package_type.replace(/_/g, ' ')} Delivery`;
    return `${item?.car_make || ''} ${item?.car_model || ''} Rental`.trim();
  };
  const getStatusText = (item) => (item?.status || '').replace(/_/g, ' ');

  const currentItems = activeTab === 'rides' ? rides : activeTab === 'deliveries' ? deliveries : rentals;

  const openChat = (item) => {
    const providerEmail = getProviderEmail(item);
    if (!providerEmail) return;
    setChatModal({ item, providerEmail, providerName: getProviderName(item), contextType: getItemType(item), contextId: item.id });
  };

  // Reset map refs when selecting a new item
  const selectItem = (item) => {
    if (selectedItem?.id !== item.id) {
      [driverMarkerRef, pickupMarkerRef, destMarkerRef].forEach(ref => {
        if (ref.current) { ref.current.setMap(null); ref.current = null; }
      });
      if (routePolylineRef.current) { routePolylineRef.current.setMap(null); routePolylineRef.current = null; }
      setDriverEta(null);
    }
    setSelectedItem(item);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-950 via-fuchsia-950 to-sky-950">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Navigation className="w-7 h-7 text-cyan-400" />
              Live Tracking
            </h1>
            {lastRefresh && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-green-400" />
                Live · Updated {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchActiveItems} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TAB_CONFIG.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {(tab.id === 'rides' ? rides : tab.id === 'deliveries' ? deliveries : rentals).length > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {(tab.id === 'rides' ? rides : tab.id === 'deliveries' ? deliveries : rentals).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar List */}
          <div className="lg:col-span-1 space-y-3">
            {currentItems.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">{activeTab === 'rides' ? '🚗' : activeTab === 'deliveries' ? '📦' : '🚙'}</div>
                <p className="text-gray-400 text-sm">No active {activeTab} right now</p>
              </div>
            ) : (
              currentItems.map(item => (
                <motion.div key={item.id} layout onClick={() => selectItem(item)}
                  className={`bg-white/5 border rounded-2xl p-4 cursor-pointer transition-all ${
                    selectedItem?.id === item.id ? 'border-purple-500/60 bg-purple-500/10' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{getItemLabel(item)}</p>
                    <span className={`text-xs font-medium capitalize ${STATUS_COLORS[item.status] || 'text-gray-400'}`}>
                      {getStatusText(item)}
                    </span>
                  </div>

                  {item.pickup_address && (
                    <p className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-green-400 flex-shrink-0" />
                      {item.pickup_address}
                    </p>
                  )}
                  {(item.dropoff_address || item.delivery_address) && (
                    <p className="text-gray-400 text-xs flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                      {item.dropoff_address || item.delivery_address}
                    </p>
                  )}

                  {getProviderEmail(item) && (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.driver_name || getProviderEmail(item)}
                      </p>
                      <Button size="sm" variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openChat(item); }}
                        className="text-xs h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />Chat
                      </Button>
                    </div>
                  )}

                  {/* Live GPS pulse */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {getProviderLocation(item) ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-400 text-xs">Live GPS</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-600 rounded-full" />
                        <span className="text-gray-500 text-xs">Awaiting GPS</span>
                      </div>
                    )}
                    {selectedItem?.id === item.id && driverEta && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-semibold">{driverEta} min away</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Map Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative" style={{ height: '540px' }}>
              {selectedItem ? (
                <>
                  {/* Legend bar */}
                  <div className="flex items-center gap-4 px-4 py-2 bg-black/40 border-b border-white/10 text-xs text-gray-400 absolute top-0 left-0 right-0 z-10">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />Driver</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Pickup</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Destination</span>
                    <span className="flex items-center gap-1.5 ml-auto">
                      <Zap className="w-3 h-3 text-green-400 animate-pulse" />
                      Updates every 6s
                    </span>
                  </div>
                  <div ref={mapRef} style={{ width: '100%', height: '100%', paddingTop: '36px' }} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Navigation className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400">Select an active booking to track your driver in real-time</p>
                </div>
              )}
            </div>

            {/* Selected item detail bar */}
            <AnimatePresence>
              {selectedItem && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{getItemLabel(selectedItem)}</p>
                      <p className={`text-sm capitalize ${STATUS_COLORS[selectedItem.status] || 'text-gray-400'}`}>
                        {getStatusText(selectedItem)}
                        {driverEta ? ` · ${driverEta} min ETA` : ''}
                      </p>
                    </div>
                    {getProviderEmail(selectedItem) && (
                      <Button onClick={() => openChat(selectedItem)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white" size="sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />Message Driver
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {chatModal && currentUser && (
        <BookingChatModal
          currentUser={currentUser}
          providerEmail={chatModal.providerEmail}
          providerName={chatModal.providerName}
          contextType={chatModal.contextType}
          contextId={chatModal.contextId}
          onClose={() => setChatModal(null)}
        />
      )}
    </div>
  );
}

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0c1118' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];