import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Package, Car, MapPin, MessageCircle, RefreshCw, Clock, CheckCircle, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingChatModal from '@/components/tracking/BookingChatModal';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const REFRESH_INTERVAL_MS = 10000; // 10 seconds

const STATUS_COLORS = {
  // Rides
  accepted: 'text-blue-400',
  en_route: 'text-yellow-400',
  arrived: 'text-orange-400',
  in_progress: 'text-green-400',
  // Deliveries
  driver_assigned: 'text-blue-400',
  en_route_pickup: 'text-yellow-400',
  picked_up: 'text-orange-400',
  in_transit: 'text-green-400',
  out_for_delivery: 'text-cyan-400',
  // Rentals
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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const intervalRef = useRef(null);

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

  useEffect(() => {
    if (mapLoaded && selectedItem) {
      renderMap(selectedItem);
    }
  }, [selectedItem, mapLoaded]);

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }
    const script = document.createElement('script');
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

      // Auto-select first item if none selected
      setSelectedItem(prev => {
        if (prev) {
          // Refresh the selected item with latest data
          const all = [...activeRides, ...activeDeliveries, ...activeRentals];
          return all.find(i => i.id === prev.id) || prev;
        }
        return activeRides[0] || activeDeliveries[0] || activeRentals[0] || null;
      });
    } catch (err) {
      console.error('Failed to fetch active items:', err);
    }
  }, [currentUser]);

  const renderMap = (item) => {
    if (!mapRef.current || !window.google) return;

    const providerLoc = getProviderLocation(item);
    const destLoc = getDestinationCoords(item);
    const center = providerLoc || destLoc || { lat: 25.7617, lng: -80.1918 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center,
        styles: darkMapStyles,
        disableDefaultUI: false,
        zoomControl: true,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Provider marker (driver/owner)
    if (providerLoc) {
      const marker = new window.google.maps.Marker({
        position: providerLoc,
        map: mapInstanceRef.current,
        title: 'Provider',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });
      markersRef.current.push(marker);
    }

    // Destination marker
    if (destLoc) {
      const marker = new window.google.maps.Marker({
        position: destLoc,
        map: mapInstanceRef.current,
        title: 'Destination',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });
      markersRef.current.push(marker);
    }

    // Pickup marker
    const pickupLoc = getPickupCoords(item);
    if (pickupLoc) {
      const marker = new window.google.maps.Marker({
        position: pickupLoc,
        map: mapInstanceRef.current,
        title: 'Pickup',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });
      markersRef.current.push(marker);
    }
  };

  const getProviderLocation = (item) => {
    if (!item) return null;
    const loc = item.driver_location;
    if (loc && loc.length === 2) return { lat: loc[0], lng: loc[1] };
    return null;
  };

  const getDestinationCoords = (item) => {
    if (!item) return null;
    if (item.dropoff_coords && item.dropoff_coords.length === 2)
      return { lat: item.dropoff_coords[0], lng: item.dropoff_coords[1] };
    if (item.delivery_coords && item.delivery_coords.length === 2)
      return { lat: item.delivery_coords[0], lng: item.delivery_coords[1] };
    return null;
  };

  const getPickupCoords = (item) => {
    if (!item) return null;
    if (item.pickup_coords && item.pickup_coords.length === 2)
      return { lat: item.pickup_coords[0], lng: item.pickup_coords[1] };
    return null;
  };

  const getItemType = (item) => {
    if (item?.ride_type) return 'ride';
    if (item?.package_type) return 'delivery';
    return 'rental';
  };

  const getProviderEmail = (item) => {
    return item?.driver_email || item?.provider_email || '';
  };

  const getProviderName = (item) => {
    return item?.driver_name || item?.car_make
      ? `${item.car_make} ${item.car_model} Owner`
      : item?.driver_email || 'Provider';
  };

  const getItemLabel = (item) => {
    if (item?.ride_type) return `${item.ride_type} Ride`;
    if (item?.package_type) return `${item.package_type.replace('_', ' ')} Delivery`;
    return `${item?.car_make || ''} ${item?.car_model || ''} Rental`.trim();
  };

  const getStatusText = (item) => {
    return (item?.status || '').replace(/_/g, ' ');
  };

  const currentItems = activeTab === 'rides' ? rides : activeTab === 'deliveries' ? deliveries : rentals;

  const openChat = (item) => {
    const providerEmail = getProviderEmail(item);
    if (!providerEmail) return;
    setChatModal({
      item,
      providerEmail,
      providerName: getProviderName(item),
      contextType: getItemType(item),
      contextId: item.id,
    });
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
                <RefreshCw className="w-3 h-3" />
                Updated {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActiveItems}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
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
          {/* Item List */}
          <div className="lg:col-span-1 space-y-3">
            {currentItems.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">
                  {activeTab === 'rides' ? '🚗' : activeTab === 'deliveries' ? '📦' : '🚙'}
                </div>
                <p className="text-gray-400 text-sm">No active {activeTab} right now</p>
              </div>
            ) : (
              currentItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white/5 border rounded-2xl p-4 cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'border-purple-500/60 bg-purple-500/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{getItemLabel(item)}</p>
                    <span className={`text-xs font-medium capitalize ${STATUS_COLORS[item.status] || 'text-gray-400'}`}>
                      {getStatusText(item)}
                    </span>
                  </div>

                  {/* Addresses */}
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

                  {/* Provider info */}
                  {getProviderEmail(item) && (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.driver_name || getProviderEmail(item)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openChat(item); }}
                        className="text-xs h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Chat
                      </Button>
                    </div>
                  )}

                  {/* Location pulse if active */}
                  {getProviderLocation(item) && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-400 text-xs">Live GPS active</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Map Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ height: '520px' }}>
              {selectedItem ? (
                <>
                  {/* Map legend */}
                  <div className="flex items-center gap-4 px-4 py-2 bg-black/30 border-b border-white/10 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Provider</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Pickup</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Destination</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Refreshes every 10s</span>
                  </div>
                  <div ref={mapRef} style={{ width: '100%', height: 'calc(100% - 36px)' }} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Navigation className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400">Select an active booking to view its location on the map</p>
                </div>
              )}
            </div>

            {/* Selected item detail */}
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
                      </p>
                    </div>
                    {getProviderEmail(selectedItem) && (
                      <Button
                        onClick={() => openChat(selectedItem)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        size="sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message Provider
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
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

// Dark map styles for Google Maps
const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0c1118' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];