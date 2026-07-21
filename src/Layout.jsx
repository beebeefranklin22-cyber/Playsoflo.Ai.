import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Music, Home, Wallet, User, Search, Brain, MessageCircle, Bell, Globe, Sparkles, ChevronRight, Menu, X, Package, DollarSign, Store, TrendingUp, Users, Truck, Headphones, Compass, Ticket, Calendar, ShoppingCart, Navigation, UserPlus, MapPin, BookOpen, FileText } from "lucide-react";
import CitySelector from "./components/location/CitySelector";
import NavSearchSuggestions from "./components/search/NavSearchSuggestions";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import usePresence from "./components/chat/usePresence";
import { PostHogProvider } from "./components/analytics/PostHogProvider";
import ServiceWorkerManager from "./components/ServiceWorkerManager";
import CustomerSupportChat from "./components/support/CustomerSupportChat";
import { ThemeProvider } from "./components/ui/ThemeProvider";

import SmartTooltip from "./components/onboarding/SmartTooltip";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import RealtimeNotificationManager from "./components/notifications/RealtimeNotificationManager";
import RideNotificationHandler from "./components/notifications/RideNotificationHandler";
import DeliveryNotificationHandler from "./components/notifications/DeliveryNotificationHandler";
import PaymentRequestHandler from "./components/notifications/PaymentRequestHandler";
import TVNavigationHandler from "./components/platform/TVNavigationHandler";
import SafeErrorHandler from "./components/SafeErrorHandler";
import PlatformDetector from "./components/platform/PlatformDetector";
import AppInstallPrompt from "./components/platform/AppInstallPrompt";
import NativeAppBridge from "./components/platform/NativeAppBridge";
import ErrorBoundary from "./components/ErrorBoundary";
import PullToRefresh from "./components/PullToRefresh";
import ToastListener from "./components/ui/ToastListener";
import LiveOrderTracker from "./components/tracking/LiveOrderTracker";
import OrderTrackerBridge from "./components/tracking/OrderTrackerBridge";
import AIErrorReporter from "./components/errors/AIErrorReporter";
import LanguageSwitcher from "./components/i18n/LanguageSwitcher";
import ExperienceBookingsStatus from "./components/profile/ExperienceBookingsStatus";
import SidebarQuickStats from "./components/provider/SidebarQuickStats";
import LoginModal from "./components/auth/LoginModal";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCitySelectorModal, setShowCitySelectorModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState(null);
  const [trackedOrderType, setTrackedOrderType] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const searchRef = useRef(null);
  const [direction, setDirection] = useState(0);
  const prevPathRef = useRef(location.pathname);
  const queryClient = useQueryClient();

  // Tab-based navigation stacks
  const tabStacks = useRef({
    home: [createPageUrl("Home")],
    universe: [createPageUrl("Universe")],
    wallet: [createPageUrl("Wallet")],
    profile: [createPageUrl("Profile")],
    ronronai: [createPageUrl("RonronAI")]
  });
  
  const tabScrollPositions = useRef({});
  const currentPath = location.pathname;
  const [activeTab, setActiveTab] = useState(
    currentPath === createPageUrl("RonronAI") ? "ronronai" :
    currentPath === createPageUrl("Universe") ? "universe" :
    currentPath === createPageUrl("Wallet") ? "wallet" :
    currentPath === createPageUrl("Profile") ? "profile" :
    "home"
  );
  
  const rootPaths = [
    createPageUrl("Home"),
    createPageUrl("Universe"),
    createPageUrl("Wallet"),
    createPageUrl("Profile"),
    createPageUrl("RonronAI")
  ];
  
  const isRootPath = rootPaths.includes(currentPath);
  const wasRootPath = rootPaths.includes(prevPathRef.current);

  // Save scroll position when leaving a page
  useEffect(() => {
    return () => {
      tabScrollPositions.current[currentPath] = window.scrollY;
    };
  }, [currentPath]);

  // Restore scroll position when returning to a page
  useEffect(() => {
    const savedPosition = tabScrollPositions.current[currentPath];
    if (savedPosition !== undefined) {
      setTimeout(() => window.scrollTo(0, savedPosition), 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [currentPath]);

  useEffect(() => {
    // Determine slide direction
    if (isRootPath && !wasRootPath) {
      setDirection(-1); // Slide from left (back)
    } else if (!isRootPath && wasRootPath) {
      setDirection(1); // Slide from right (forward)
    }
    
    // Update tab stacks
    const currentTab = 
      currentPath === createPageUrl("RonronAI") ? "ronronai" :
      currentPath === createPageUrl("Universe") ? "universe" :
      currentPath === createPageUrl("Wallet") ? "wallet" :
      currentPath === createPageUrl("Profile") ? "profile" :
      currentPath.startsWith(createPageUrl("Home")) ? "home" : null;
    
    if (currentTab) {
      const stack = tabStacks.current[currentTab];
      if (!stack.includes(currentPath)) {
        tabStacks.current[currentTab] = [...stack, currentPath];
      }
      setActiveTab(currentTab);
    }
    
    prevPathRef.current = currentPath;
  }, [currentPath]);

  const fetchUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      // Sync timezone from profile to localStorage so all time displays are correct
      if (user?.timezone) {
        try { localStorage.setItem('user_timezone', user.timezone); } catch {}
      }
      // Show onboarding for new users
      if (user && !user.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.log("User not authenticated or error fetching user:", error);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Track user presence for online status
  usePresence(currentUser);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      if (!currentUser) return 0;
      try {
        const notifications = await base44.entities.Notification.filter({ 
          recipient_email: currentUser.email,
          read: false 
        });
        const requests = await base44.entities.FollowRequest.filter({ 
          to_email: currentUser.email, 
          status: 'pending' 
        });
        return notifications.length + requests.length;
      } catch (error) {
        console.error("Notification check error:", error);
        return 0;
      }
    },
    enabled: !!currentUser,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: false
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl("UniversalSearch") + `?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleNavigation = (path) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    // Trigger haptic feedback
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('light');
    }
    
    const targetPath = createPageUrl(path);
    const targetTab = 
      path === "RonronAI" ? "ronronai" :
      path === "Universe" ? "universe" :
      path === "Wallet" ? "wallet" :
      path === "Profile" ? "profile" :
      "home";
    
    // If tapping the already active tab, reset to root
    if (targetTab === activeTab && !rootPaths.includes(currentPath)) {
      tabStacks.current[targetTab] = [targetPath];
      navigate(targetPath);
    }
    // If switching to a tab we've visited, go to the last page in that tab's stack
    else if (targetTab !== activeTab && tabStacks.current[targetTab]) {
      const lastPage = tabStacks.current[targetTab][tabStacks.current[targetTab].length - 1];
      navigate(lastPage);
    } else {
      navigate(targetPath);
    }
    
    setTimeout(() => setIsNavigating(false), 100);
  };

  const handleRefresh = async () => {
    // Trigger query refetch for current page
    queryClient.invalidateQueries();
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('medium');
    }
  };

  const navItems = [
    { icon: Brain, label: "Beebee", path: "RonronAI", id: "nav-ronronai" },
    { icon: Home, label: "Home", path: "Home", id: "nav-home" },
    { icon: Compass, label: "Universe", path: "Universe", id: "nav-universe" },
    { icon: Wallet, label: "Wallet", path: "Wallet", id: "nav-wallet" },
    { icon: User, label: "Profile", path: "Profile", id: "nav-profile" },
  ];

  const sidebarSections = [
    { icon: MessageCircle, label: "Messages", path: "Messages" },
    { icon: Calendar, label: "My Bookings", path: "CustomerBookings" },
    { icon: Store, label: "Marketplace", path: "Marketplace" },
    { icon: Navigation, label: "Rides", path: "Travel" },
    { icon: Package, label: "Food Delivery", path: "FoodDelivery" },
    { icon: Package, label: "Food Orders", path: "FoodOrderTracking" },
    { icon: Truck, label: "Package Delivery", path: "PackageDelivery" },
    { icon: MapPin, label: "Live Tracking", path: "LiveTracking" },
    { icon: Home, label: "Real Estate", path: "RealEstate" },
    { icon: Home, label: "Property Bookings", path: "MyPropertyBookings" },
    { icon: FileText, label: "Lease Portal", path: "LeasePortal" },
    { icon: Package, label: "Inventory", path: "InventoryManager" },
    { icon: Store, label: "Restaurant Hub", path: "RestaurantOwnerHub" },
    { icon: TrendingUp, label: "Ads Manager", path: "AdsManager" },
    { icon: DollarSign, label: "Earnings Summary", path: "ProviderEarningsSummary" },
  ];

  // Add support dashboard for admins
  if (currentUser?.role === 'admin' || currentUser?.is_support_agent) {
    sidebarSections.push({ icon: Headphones, label: "Support", path: "SupportDashboard" });
  }
  
  // Add Help link for all users
  sidebarSections.push({ icon: BookOpen, label: "Help & Tutorials", path: "Help" });

  const breadcrumbMap = {
    "Home": ["Home"],
    "Profile": ["Home", "Profile"],
    "Wallet": ["Home", "Wallet"],
    "Messages": ["Home", "Messages"],
    "RestaurantOwnerHub": ["Home", "Restaurant Hub"],
    "FoodDelivery": ["Home", "Food Delivery"],
    "FoodCart": ["Home", "Food Delivery", "Cart"],
    "RestaurantMenu": ["Home", "Food Delivery", "Menu"],
    "FoodOrderTracking": ["Home", "Orders"],
    "Universe": ["Universe"],
    "Vibe": ["Home", "Music"],
    "RonronAI": ["Home", "Beebee AI"],
  };

  const breadcrumbs = breadcrumbMap[currentPageName] || [currentPageName];

  const isFullScreen = location.pathname === createPageUrl("Universe") || 
                         location.pathname === createPageUrl("explore");

  return (
    <ErrorBoundary resetKey={location.pathname}>
    <ThemeProvider>
    <PlatformDetector>
    <TVNavigationHandler>
    <PostHogProvider user={currentUser}>
      <AIErrorReporter>
      <SafeErrorHandler />
      <ServiceWorkerManager />
      <NativeAppBridge />
      <AppInstallPrompt />
      <ToastListener />
      <div className="min-h-screen bg-gradient-to-br from-cyan-950 via-fuchsia-950 to-sky-950">
      <style>{`
        :root {
          --primary: #00E0E0;
          --secondary: #FF5EA6;
          --accent: #00F0FF;
          --background: #07131A;
          --surface: #0E1C2A;
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .glow-effect {
          box-shadow:
            0 0 30px rgba(0, 224, 224, 0.25),
            0 0 60px rgba(255, 94, 166, 0.1);
        }

        * {
          -webkit-tap-highlight-color: transparent;
        }
        
        button {
          touch-action: manipulation;
          -webkit-user-select: none;
          user-select: none;
        }
      `}</style>

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,224,224,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(255,94,166,0.10),transparent_55%)]" />
        <img
          src="https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=1600"
          alt=""
          className="absolute -bottom-10 -left-10 w-[55vw] max-w-[900px] opacity-10 saturate-150 blur-[1px] object-cover"
          style={{ transform: 'rotate(0.5deg)' }}
        />
        <img
          src="https://images.unsplash.com/photo-1544551763-7ef420b3cc90?w=1600"
          alt=""
          className="absolute bottom-0 -right-10 w-[50vw] max-w-[820px] opacity-10 blur-[0.5px] object-cover"
          style={{ transform: 'scale(1.02)' }}
        />
      </div>

      {!isFullScreen && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10" style={{ paddingTop: 'var(--safe-area-top)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4" style={{ paddingLeft: 'max(1rem, var(--safe-area-left))', paddingRight: 'max(1rem, var(--safe-area-right))' }}>
            {location.pathname !== createPageUrl("Home") && 
             location.pathname !== createPageUrl("Universe") && 
             location.pathname !== createPageUrl("Wallet") && 
             location.pathname !== createPageUrl("Profile") && 
             location.pathname !== createPageUrl("RonronAI") ? (
              <button
                onClick={() => {
                  if (window.NativeAppBridge?.triggerHaptic) {
                    window.NativeAppBridge.triggerHaptic('medium');
                  }
                  const stack = tabStacks.current[activeTab];
                  if (stack && stack.length > 1) {
                    // Go to previous page in current tab's stack
                    tabStacks.current[activeTab] = stack.slice(0, -1);
                    navigate(stack[stack.length - 2]);
                  } else {
                    navigate(-1);
                  }
                }}
                className="flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ChevronRight className="w-6 h-6 text-white rotate-180" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.NativeAppBridge?.triggerHaptic) {
                    window.NativeAppBridge.triggerHaptic('light');
                  }
                  if (!currentUser) {
                    setShowLoginModal(true);
                  } else {
                    setSidebarOpen(!sidebarOpen);
                  }
                }}
                className="flex-shrink-0 active:scale-95 transition-transform"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {currentUser?.profile_picture ? (
                  <img 
                    src={currentUser.profile_picture} 
                    alt={currentUser.full_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20 hover:border-purple-500/50 transition"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold hover:scale-105 transition">
                    {currentUser?.full_name?.[0] || "U"}
                  </div>
                )}
              </button>
            )}

            <form onSubmit={handleSearch} className="flex-1" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearchSuggestions(true); }}
                  onFocus={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('light');
                    }
                    setShowSearchSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 150)}
                  placeholder="Search experiences, services, people..."
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition min-h-[44px]"
                  style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
                />
                {showSearchSuggestions && (
                  <NavSearchSuggestions
                    query={searchQuery}
                    onClose={() => { setShowSearchSuggestions(false); setSearchQuery(''); }}
                    onSelect={() => setShowSearchSuggestions(false)}
                  />
                )}
              </div>
            </form>

            {/* Cart Button */}
            <button
              onClick={() => {
                if (window.NativeAppBridge?.triggerHaptic) {
                  window.NativeAppBridge.triggerHaptic('light');
                }
                navigate(createPageUrl("Cart"));
              }}
              className="relative flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <ShoppingCart className="w-6 h-6 text-white" />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => {
                if (window.NativeAppBridge?.triggerHaptic) {
                  window.NativeAppBridge.triggerHaptic('light');
                }
                navigate(createPageUrl("Notifications"));
              }}
              className="relative flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <LanguageSwitcher className="flex-shrink-0 hidden sm:block" />

            {currentUser?.current_music && (
              <button
                onClick={() => navigate(createPageUrl("Vibe"))}
                className="flex-shrink-0 hidden md:flex items-center gap-2 px-4 py-2 glass-effect rounded-full hover:bg-white/10 transition group"
              >
                <Music className="w-4 h-4 text-purple-400 animate-pulse" />
                <div className="text-left max-w-[200px]">
                  <p className="text-white text-xs font-medium line-clamp-1">{currentUser.current_music}</p>
                  <p className="text-gray-400 text-[10px] opacity-0 group-hover:opacity-100 transition">Tap to open music</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </button>
            )}
          </div>
        </div>
      )}

      {currentUser?.current_music && !isFullScreen && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="md:hidden fixed top-16 left-1/2 -translate-x-1/2 z-40 glass-effect rounded-full px-3 py-2 flex items-center gap-2 max-w-[90vw]"
          onClick={() => navigate(createPageUrl("Vibe"))}
        >
          <Music className="w-4 h-4 text-purple-400 animate-pulse flex-shrink-0" />
          <div className="text-xs flex-1 min-w-0">
            <p className="text-white font-medium truncate">{currentUser.current_music}</p>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
        </motion.div>
      )}

      {/* Sidebar - Always Available */}
      {!isFullScreen && (
        <>
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setSidebarOpen(false)}
              style={{ touchAction: 'none' }}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed top-16 left-0 bottom-20 lg:bottom-0 w-64 z-[60] glass-effect border-r border-white/10 transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-6 h-6 text-gray-400 hover:text-white transition" />
                </button>
              </div>

              <nav className="space-y-2">
                {sidebarSections.map((item, idx) => {
                  const isActive = location.pathname === createPageUrl(item.path);
                  return (
                    <button
                      key={`${item.path}-${idx}`}
                      onClick={() => {
                        if (window.NativeAppBridge?.triggerHaptic) {
                          window.NativeAppBridge.triggerHaptic('light');
                        }
                        handleNavigation(item.path);
                        setSidebarOpen(false);
                      }}
                      disabled={isNavigating}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      } ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}

                {/* City / Timezone */}
                <button
                  onClick={() => {
                    setShowCitySelectorModal(true);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{currentUser?.city ? `📍 ${currentUser.city}` : "Set My City"}</span>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('medium');
                    }
                    if (confirm('Are you sure you want to sign out?')) {
                      base44.auth.logout();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:text-white hover:bg-white/5 border-t border-white/10 mt-4 pt-4"
                >
                  <X className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>

                {/* Delete Account Button */}
                <button
                  onClick={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('medium');
                    }
                    setSidebarOpen(false);
                    navigate(createPageUrl("Profile"));
                    setTimeout(() => {
                      const deleteButton = document.querySelector('[data-delete-account]');
                      if (deleteButton) {
                        deleteButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        deleteButton.classList.add('ring-4', 'ring-red-500/50', 'animate-pulse');
                        setTimeout(() => {
                          deleteButton.classList.remove('ring-4', 'ring-red-500/50', 'animate-pulse');
                        }, 3000);
                      }
                    }, 500);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <UserPlus className="w-5 h-5 rotate-45" />
                  <span className="font-medium">Delete Account</span>
                </button>
              </nav>

              {/* Experience Bookings Status */}
              {currentUser && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2 px-1">
                    <Ticket className="w-4 h-4 text-purple-400" />
                    My Bookings
                  </h3>
                  <ExperienceBookingsStatus currentUser={currentUser} compact />
                </div>
              )}

              {currentUser && (currentUser.is_restaurant_owner || currentUser.is_driver || currentUser.is_provider) && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-2">Quick Stats</h3>
                    <SidebarQuickStats currentUser={currentUser} />
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      <main
        className="overflow-x-hidden"
        style={{
          paddingTop: isFullScreen ? 0 : 'calc(4rem + var(--safe-area-top, 0px))',
          paddingBottom: isFullScreen ? 0 : 'calc(5rem + var(--safe-area-bottom, 0px))',
          minHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: 'block',
          position: 'relative',
        }}
      >
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Breadcrumbs */}
          {!isFullScreen && breadcrumbs.length > 1 && (
            <div className="glass-effect border-b border-white/10 px-4 py-3">
              <div className="max-w-7xl mx-auto">
                <nav className="flex items-center gap-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
                      <span
                        className={`${
                          index === breadcrumbs.length - 1
                            ? 'text-white font-medium'
                            : 'text-gray-400 hover:text-white cursor-pointer'
                        }`}
                      >
                        {crumb}
                      </span>
                    </React.Fragment>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPath}
              custom={direction}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
              style={{ width: '100%', display: 'block' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>

      {!isFullScreen && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-t border-white/10" style={{ touchAction: 'manipulation', paddingBottom: 'max(0.75rem, var(--safe-area-bottom))' }}>
          <div className="max-w-7xl mx-auto px-4" style={{ paddingLeft: 'max(1rem, var(--safe-area-left))', paddingRight: 'max(1rem, var(--safe-area-right))' }}>
            <div className="flex items-center justify-around py-4">
              {navItems.map((item) => {
                const isActive = location.pathname === createPageUrl(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    disabled={isNavigating}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all active:scale-95 min-w-[56px] min-h-[56px] ${
                      isActive 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'text-gray-400 hover:text-white active:text-white'
                    } ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* Support Chat Button */}
      {!isFullScreen && currentUser && (
        <button
          onClick={() => setShowSupportChat(true)}
          className="fixed right-6 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform min-w-[44px] min-h-[44px]"
          style={{ bottom: 'calc(8rem + var(--safe-area-bottom))' }}
        >
          <Headphones className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Sign In / Sign Up */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={fetchUser}
      />

      {/* Support Chat Modal */}
      {showSupportChat && currentUser && (
        <CustomerSupportChat
          currentUser={currentUser}
          onClose={() => setShowSupportChat(false)}
        />
      )}

      {/* City / Timezone Selector */}
      {showCitySelectorModal && (
        <CitySelector
          user={currentUser}
          onClose={() => setShowCitySelectorModal(false)}
          onSaved={async () => {
            setShowCitySelectorModal(false);
            try {
              const updated = await base44.auth.me();
              setCurrentUser(updated);
            } catch {}
          }}
        />
      )}

      {/* Smart AI Tooltips */}
      {currentUser && currentUser.onboarding_completed && !isFullScreen && (
        <SmartTooltip currentUser={currentUser} currentPage={currentPageName} />
      )}

      {/* Real-time Notification Manager */}
      <RealtimeNotificationManager currentUser={currentUser} />

      {/* Ride Status Notification Handler */}
      <RideNotificationHandler currentUser={currentUser} />

      {/* Payment Request Handler (request money / refund popups) */}
      <PaymentRequestHandler currentUser={currentUser} />

      {/* Live Order Tracker Modal */}
      {showOrderTracker && (
        <LiveOrderTracker
          orderId={trackedOrderId}
          orderType={trackedOrderType}
          onClose={() => {
            setShowOrderTracker(false);
            setTrackedOrderId(null);
            setTrackedOrderType(null);
          }}
        />
      )}

      {/* Expose order tracking to global scope for sidebar usage */}
      <OrderTrackerBridge
        onOpen={(orderId, orderType) => {
          setTrackedOrderId(orderId);
          setTrackedOrderType(orderType);
          setShowOrderTracker(true);
        }}
      />

      {/* Onboarding Flow for New Users */}
      <AnimatePresence>
        {showOnboarding && currentUser && (
          <OnboardingFlow
            currentUser={currentUser}
            onComplete={() => {
              setShowOnboarding(false);
              setCurrentUser({ ...currentUser, onboarding_completed: true });
            }}
          />
        )}
      </AnimatePresence>
      </div>
      </AIErrorReporter>
      </PostHogProvider>
      </TVNavigationHandler>
      </PlatformDetector>
      </ThemeProvider>
      </ErrorBoundary>
      );
      }
