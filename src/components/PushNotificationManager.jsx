import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Package, Car, Users, DollarSign, AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PushNotificationManager({ currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [lastChecked, setLastChecked] = useState(Date.now());
  
  const preferences = currentUser?.notification_push_preferences || {
    ride_requests: true,
    delivery_orders: true,
    service_bookings: true,
    food_orders: true,
    enable_sound: true,
    enable_vibration: true
  };

  const acceptRideMutation = useMutation({
    mutationFn: async (rideId) => {
      await base44.entities.RideRequest.update(rideId, {
        driver_email: currentUser.email,
        driver_status: 'accepted',
        status: 'accepted'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-ride-requests'] });
      toast.success('✅ Ride accepted!');
    }
  });

  const acceptDeliveryMutation = useMutation({
    mutationFn: async (deliveryId) => {
      await base44.entities.DeliveryOrder.update(deliveryId, {
        driver_email: currentUser.email,
        status: 'driver_assigned'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-deliveries'] });
      toast.success('✅ Delivery accepted!');
    }
  });

  const playNotificationSound = () => {
    if (!preferences.enable_sound) return;
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQg==');
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default' && currentUser) {
      const requestPermission = async () => {
        try {
          const result = await Notification.requestPermission();
          setPermission(result);
        } catch (error) {
          console.log('Notification permission error:', error);
        }
      };
      // Ask after 3 seconds to not be intrusive
      const timer = setTimeout(requestPermission, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Check for new ride requests (for drivers)
  const { data: newRideRequests = [] } = useQuery({
    queryKey: ['new-ride-requests', currentUser?.email, lastChecked],
    queryFn: async () => {
      if (!currentUser?.is_driver || !preferences.ride_requests) return [];
      
      const requests = await base44.entities.RideRequest.filter({
        driver_status: 'pending',
        status: 'requested'
      });
      
      return requests.filter(r => 
        new Date(r.created_date).getTime() > lastChecked - 10000
      );
    },
    enabled: !!currentUser?.is_driver && preferences.ride_requests,
    refetchInterval: 3000
  });

  // Check for new delivery orders (for delivery drivers)
  const { data: newDeliveries = [] } = useQuery({
    queryKey: ['new-deliveries', currentUser?.email, lastChecked],
    queryFn: async () => {
      if (!currentUser?.is_delivery_driver || !preferences.delivery_orders) return [];
      
      const orders = await base44.entities.DeliveryOrder.filter({
        status: 'pending'
      });
      
      return orders.filter(o => 
        new Date(o.created_date).getTime() > lastChecked - 10000
      );
    },
    enabled: !!currentUser?.is_delivery_driver && preferences.delivery_orders,
    refetchInterval: 3000
  });

  // Check for new service bookings (for service providers)
  const { data: newBookings = [] } = useQuery({
    queryKey: ['new-bookings', currentUser?.email, lastChecked],
    queryFn: async () => {
      if (!currentUser?.is_provider || !preferences.service_bookings) return [];
      
      const bookings = await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email,
        status: 'pending'
      });
      
      return bookings.filter(b => 
        new Date(b.created_date).getTime() > lastChecked - 10000
      );
    },
    enabled: !!currentUser?.is_provider && preferences.service_bookings,
    refetchInterval: 3000
  });

  // Check for new food orders (for restaurant owners)
  const { data: newFoodOrders = [] } = useQuery({
    queryKey: ['new-food-orders', currentUser?.email, lastChecked],
    queryFn: async () => {
      if (!currentUser?.is_restaurant_owner || !preferences.food_orders) return [];
      
      const orders = await base44.entities.FoodOrder.filter({
        restaurant_email: currentUser.email,
        status: 'pending'
      });
      
      return orders.filter(o => 
        new Date(o.created_date).getTime() > lastChecked - 10000
      );
    },
    enabled: !!currentUser?.is_restaurant_owner && preferences.food_orders,
    refetchInterval: 3000
  });

  // Notify on new ride requests
  useEffect(() => {
    if (newRideRequests.length > 0 && permission === 'granted') {
      newRideRequests.forEach(request => {
        const notification = new Notification('🚗 New Ride Request!', {
          body: `From ${request.pickup_address} to ${request.dropoff_address}`,
          icon: '/icon.png',
          tag: `ride-${request.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
          navigate(createPageUrl("DriverHub"));
          notification.close();
        };

        // Also show in-app toast
        toast.success('🚗 New Ride Request!', {
          description: `${request.pickup_address} → ${request.dropoff_address}`,
          action: {
            label: 'View',
            onClick: () => navigate(createPageUrl("DriverHub"))
          },
          duration: 10000
        });

        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQgsRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPO');
          audio.play().catch(() => {});
        } catch (e) {}
      });
      
      setLastChecked(Date.now());
    }
  }, [newRideRequests, permission, navigate]);

  // Notify on new deliveries
  useEffect(() => {
    if (newDeliveries.length > 0 && permission === 'granted') {
      newDeliveries.forEach(order => {
        const notification = new Notification('📦 New Delivery Order!', {
          body: `Pickup: ${order.pickup_address}`,
          icon: '/icon.png',
          tag: `delivery-${order.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
          navigate(createPageUrl("DeliveryDriverHub"));
          notification.close();
        };

        toast.success('📦 New Delivery Order!', {
          description: `From ${order.pickup_address}`,
          action: {
            label: 'View',
            onClick: () => navigate(createPageUrl("DeliveryDriverHub"))
          },
          duration: 10000
        });

        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQgsRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPO');
          audio.play().catch(() => {});
        } catch (e) {}
      });
      
      setLastChecked(Date.now());
    }
  }, [newDeliveries, permission, navigate]);

  // Notify on new service bookings
  useEffect(() => {
    if (newBookings.length > 0 && permission === 'granted') {
      newBookings.forEach(booking => {
        const notification = new Notification('📅 New Service Booking!', {
          body: `New ${booking.service_title} booking request`,
          icon: '/icon.png',
          tag: `booking-${booking.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
          navigate(createPageUrl("ProviderHub"));
          notification.close();
        };

        toast.success('📅 New Service Booking!', {
          description: booking.service_title,
          action: {
            label: 'View',
            onClick: () => navigate(createPageUrl("ProviderHub"))
          },
          duration: 10000
        });

        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQgsRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPO');
          audio.play().catch(() => {});
        } catch (e) {}
      });
    }
  }, [newRideRequests, permission, navigate]);

  // Notify on new deliveries
  useEffect(() => {
    if (newDeliveries.length > 0 && permission === 'granted') {
      newDeliveries.forEach(order => {
        const notification = new Notification('📦 New Delivery!', {
          body: `${order.package_type} - ${order.pickup_address}`,
          icon: '/icon.png',
          tag: `delivery-${order.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
          navigate(createPageUrl("DeliveryDriverHub"));
          notification.close();
        };

        toast.success('📦 New Delivery!', {
          description: `${order.package_type} from ${order.pickup_address}`,
          action: {
            label: 'Accept',
            onClick: () => navigate(createPageUrl("DeliveryDriverHub"))
          },
          duration: 10000
        });

        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQgsRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPO');
          audio.play().catch(() => {});
        } catch (e) {}
      });
      
      setLastChecked(Date.now());
    }
  }, [newDeliveries, permission, navigate]);

  // Notify on new bookings
  useEffect(() => {
    if (newBookings.length > 0 && permission === 'granted') {
      newBookings.forEach(booking => {
        const notification = new Notification('📅 New Booking Request!', {
          body: `${booking.service_title} - ${booking.booking_date}`,
          icon: '/icon.png',
          tag: `booking-${booking.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
          navigate(createPageUrl("ProviderHub"));
          notification.close();
        };

        toast.success('📅 New Booking!', {
          description: `${booking.service_title}`,
          action: {
            label: 'View',
            onClick: () => navigate(createPageUrl("ProviderHub"))
          },
          duration: 10000
        });

        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQgsRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPO');
          audio.play().catch(() => {});
        } catch (e) {}
      });
      
      setLastChecked(Date.now());
    }
  }, [newBookings, permission, navigate]);

  // Notify on new food orders
  useEffect(() => {
    if (newFoodOrders.length > 0 && permission === 'granted') {
      newFoodOrders.forEach(order => {
        const notification = new Notification('🍽️ New Food Order!', {
          body: `Order #${order.order_number || order.id.slice(0, 8)}`,
          icon: '/icon.png',
          tag: `food-${order.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
          navigate(createPageUrl("RestaurantOwnerHub"));
          notification.close();
        };

        toast.success('🍽️ New Food Order!', {
          description: `Order #${order.order_number || order.id.slice(0, 8)}`,
          action: {
            label: 'View',
            onClick: () => navigate(createPageUrl("RestaurantOwnerHub"))
          },
          duration: 10000
        });

        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+ihUhELTqXh8bllHAg2jdXzzn0vBSh+zPDclkILElyz6OyrWRQLSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8858LgUof8zw3JZCCxJctOjsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfC4FKH/M8NyWQgsRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPOfS4FKH/M8NyWQgoRW7Tn7KtZFQxIoN/ywW4kBS6Ez/PYiTYJFmK46+ihUhELTKXh8bhmHAg5jtTzzn0uBSh/zPDclkIKEVu05+yrWRUMSKDf8sFuJAUuhM/z2Ik2CRZiuOvooVIRC0yl4fG4ZhwIOY7U8859LgUof8zw3JZCChFbtOfsq1kVDEig3/LBbiQFLoTP89iJNgkWYrjr6KFSEQtMpeHxuGYcCDmO1PPO');
          audio.play().catch(() => {});
        } catch (e) {}
      });
      
      setLastChecked(Date.now());
    }
  }, [newFoodOrders, permission, navigate]);

  // Show permission request reminder if not granted
  if (permission === 'default' && currentUser && (currentUser.is_driver || currentUser.is_delivery_driver || currentUser.is_provider || currentUser.is_restaurant_owner)) {
    return (
      <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-2xl border border-white/20">
        <div className="flex items-start gap-3">
          <Bell className="w-6 h-6 text-white flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-white font-bold mb-1">Enable Notifications</h4>
            <p className="text-white/90 text-sm mb-3">
              Get instant alerts for new orders, rides, and bookings
            </p>
            <Button
              onClick={async () => {
                const result = await Notification.requestPermission();
                setPermission(result);
              }}
              className="bg-white text-purple-600 hover:bg-white/90 w-full"
            >
              Enable Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}