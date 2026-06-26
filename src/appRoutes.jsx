import React, { lazy } from 'react';

// lazy load pages (important for speed)
const Discover = lazy(() => import('../pages/Discover'));
const CreatorDiscovery = lazy(() => import('../pages/CreatorDiscovery'));
const Events = lazy(() => import('../pages/Events'));
const VODPlayer = lazy(() => import('../pages/VODPlayer'));
const CreatorChannel = lazy(() => import('../pages/CreatorChannel'));
const CreatorDashboard = lazy(() => import('../pages/CreatorDashboard'));
const TravelCategoryHub = lazy(() => import('../pages/TravelCategoryHub'));
const AmazonStore = lazy(() => import('../pages/AmazonStore'));
const AmazonOrders = lazy(() => import('../pages/AmazonOrders'));
const SavedJobs = lazy(() => import('../pages/SavedJobs'));
const ApplicationTracker = lazy(() => import('../pages/ApplicationTracker'));
const LiveTracking = lazy(() => import('../pages/LiveTracking'));
const InventoryManager = lazy(() => import('../pages/InventoryManager'));
const Reels = lazy(() => import('../pages/Reels'));
const Help = lazy(() => import('../pages/Help'));
const UnifiedBooking = lazy(() => import('../pages/UnifiedBooking'));
const AdManager = lazy(() => import('../pages/AdManager'));
const LeasePortal = lazy(() => import('../pages/LeasePortal'));
const SavedProperties = lazy(() => import('../pages/SavedProperties'));
const ProviderEarningsSummary = lazy(() => import('../pages/ProviderEarningsSummary'));
const DropshippingDashboard = lazy(() => import('../pages/DropshippingDashboard'));

export const appRoutes = [
  { path: '/', element: Discover, layout: true },
  { path: '/discover', element: Discover, layout: true },
  { path: '/creator-discovery', element: CreatorDiscovery, layout: true },
  { path: '/events', element: Events, layout: true },

  { path: '/vod-player', element: VODPlayer, layout: true },
  { path: '/creator-channel', element: CreatorChannel, layout: true },
  { path: '/creator-dashboard', element: CreatorDashboard, layout: true },

  { path: '/travel', element: TravelCategoryHub, layout: true },

  { path: '/amazon-store', element: AmazonStore, layout: true },
  { path: '/amazon-orders', element: AmazonOrders, layout: true },

  { path: '/jobs/saved', element: SavedJobs, layout: true },
  { path: '/jobs/tracker', element: ApplicationTracker, layout: true },

  { path: '/live-tracking', element: LiveTracking, layout: true },
  { path: '/inventory', element: InventoryManager, layout: true },

  { path: '/reels', element: Reels, layout: false },

  { path: '/help', element: Help, layout: true },
  { path: '/booking', element: UnifiedBooking, layout: true },

  { path: '/ads', element: AdManager, layout: true },
  { path: '/dropshipping', element: DropshippingDashboard, layout: true },

  { path: '/leases', element: LeasePortal, layout: true },
  { path: '/properties', element: SavedProperties, layout: true },

  { path: '/earnings', element: ProviderEarningsSummary, layout: true },
];
