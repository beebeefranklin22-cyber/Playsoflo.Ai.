import { lazy } from "react";

const Discover = lazy(() => import("../pages/Discover"));
const CreatorDashboard = lazy(() => import("../pages/CreatorDashboard"));
const CreatorChannel = lazy(() => import("../pages/CreatorChannel"));
const Events = lazy(() => import("../pages/Events"));
const VODPlayer = lazy(() => import("../pages/VODPlayer"));
const TravelCategoryHub = lazy(() => import("../pages/TravelCategoryHub"));
const AmazonStore = lazy(() => import("../pages/AmazonStore"));
const AmazonOrders = lazy(() => import("../pages/AmazonOrders"));
const SavedJobs = lazy(() => import("../pages/SavedJobs"));
const ApplicationTracker = lazy(() => import("../pages/ApplicationTracker"));
const LiveTracking = lazy(() => import("../pages/LiveTracking"));
const InventoryManager = lazy(() => import("../pages/InventoryManager"));
const Reels = lazy(() => import("../pages/Reels"));
const Help = lazy(() => import("../pages/Help"));
const UnifiedBooking = lazy(() => import("../pages/UnifiedBooking"));
const AdManager = lazy(() => import("../pages/AdManager"));
const LeasePortal = lazy(() => import("../pages/LeasePortal"));
const SavedProperties = lazy(() => import("../pages/SavedProperties"));
const ProviderEarningsSummary = lazy(() => import("../pages/ProviderEarningsSummary"));
const DropshippingDashboard = lazy(() => import("../pages/DropshippingDashboard"));


export const appRoutes = [
{
path:"/",
element:Discover
},

{
path:"/creator-dashboard",
element:CreatorDashboard
},

{
path:"/creator-channel",
element:CreatorChannel
},

{
path:"/events",
element:Events
},

{
path:"/vod-player",
element:VODPlayer
},

{
path:"/travel",
element:TravelCategoryHub
},

{
path:"/amazon-store",
element:AmazonStore
},

{
path:"/amazon-orders",
element:AmazonOrders
},

{
path:"/jobs",
element:SavedJobs
},

{
path:"/application-tracker",
element:ApplicationTracker
},

{
path:"/live-tracking",
element:LiveTracking
},

{
path:"/inventory",
element:InventoryManager
},

{
path:"/reels",
element:Reels
},

{
path:"/help",
element:Help
},

{
path:"/booking",
element:UnifiedBooking
},

{
path:"/ads",
element:AdManager
},

{
path:"/dropshipping",
element:DropshippingDashboard
},

{
path:"/leases",
element:LeasePortal
},

{
path:"/properties",
element:SavedProperties
},

{
path:"/earnings",
element:ProviderEarningsSummary
}
];
