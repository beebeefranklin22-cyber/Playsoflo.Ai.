import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Music, Home, Wallet, User, Search, Brain, MessageCircle, Bell, Globe, Sparkles, ChevronRight, Menu, X, Package, DollarSign, Store, TrendingUp, Users, Truck, Headphones, Compass, Ticket } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import usePresence from "./components/chat/usePresence";
import { PostHogProvider } from "./components/analytics/PostHogProvider";
import OfflineManager from "./components/OfflineManager";
import OfflineDataCache from "./components/OfflineDataCache";
import ServiceWorkerManager from "./components/ServiceWorkerManager";
import AdvancedOfflineSync from "./components/AdvancedOfflineSync";
import OfflineMediaPlayer from "./components/OfflineMediaPlayer";
import RealtimeDataManager from "./components/RealtimeDataManager";
import CustomerSupportChat from "./components/support/CustomerSupportChat";
import ErrorBoundary from "./components/ErrorBoundary";
import SystemHealthMonitor from "./components/SystemHealthMonitor";
import ProactiveMonitor from "./components/ProactiveMonitor";
import SmartTooltip from "./components/onboarding/SmartTooltip";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Redirect to onboarding if not completed
        if (user && !user.onboarding_completed && location.pathname !== createPageUrl("SmartOnboarding")) {
          navigate(createPageUrl("SmartOnboarding"));
        }
      } catch (error) {
        console.log("User not authenticated or error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Track user presence for online status
  usePresence(currentUser);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      if (!currentUser) return 0;
      try {
        const notifications = await base44.entities.Notification.filter({ read: false });
        const requests = await base44.entities.FollowRequest.filter({ 
          to_email: currentUser.email, 
          status: 'pending' 
        });
        return notifications.length + requests.length;
      } catch {
        return 0;
      }
    },
    enabled: !!currentUser,
    refetchInterval: 30000
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
    navigate(createPageUrl(path));
    setTimeout(() => setIsNavigating(false), 100);
  };

  const navItems = [
    { icon: Brain, label: "Beebee", path: "RonronAI" },
    { icon: Home, label: "Home", path: "Home" },
    { icon: Compass, label: "Universe", path: "Universe" },
    { icon: Wallet, label: "Wallet", path: "Wallet" },
    { icon: User, label: "Profile", path: "Profile" },
  ];

  const sidebarSections = [
    { icon: Store, label: "Marketplace", path: "Marketplace" },
    { icon: Truck, label: "Package Delivery", path: "PackageDelivery" },
    { icon: Home, label: "Real Estate", path: "RealEstate" },
    { icon: TrendingUp, label: "Ads Manager", path: "AdsManager" },
    { icon: Store, label: "Restaurant Hub", path: "RestaurantOwnerHub" },
    { icon: Package, label: "Orders", path: "FoodOrderTracking" },
    { icon: TrendingUp, label: "Menu", path: "FoodDelivery" },
    { icon: DollarSign, label: "Earnings", path: "RestaurantOwnerHub" },
    { icon: MessageCircle, label: "Messages", path: "Messages" },
    { icon: Home, label: "My Bookings", path: "MyPropertyBookings" },
  ];

  // Add support dashboard for admins
  if (currentUser?.role === 'admin' || currentUser?.is_support_agent) {
    sidebarSections.push({ icon: Headphones, label: "Support", path: "SupportDashboard" });
  }

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

  const showSidebar = !isFullScreen && (
    currentPageName === "RestaurantOwnerHub" ||
    currentPageName === "FoodOrderTracking" ||
    currentPageName === "FoodDelivery" ||
    currentPageName === "RestaurantMenu" ||
    currentPageName === "FoodCart"
  );

  return (
    <ErrorBoundary>
    <PostHogProvider user={currentUser}>
      <ServiceWorkerManager />
      <OfflineManager />
      <OfflineDataCache />
      <AdvancedOfflineSync />
      <OfflineMediaPlayer />
      <RealtimeDataManager />
      <SystemHealthMonitor />
      <ProactiveMonitor />
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
        <div className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            {showSidebar && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex-shrink-0 lg:hidden p-2 hover:bg-white/10 rounded-lg transition"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            )}

            <button
              onClick={() => navigate(createPageUrl("Profile"))}
              className="flex-shrink-0"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {currentUser?.full_name?.[0] || "U"}
              </div>
            </button>

            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search experiences, services, people..."
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </form>

            {/* Notifications Bell */}
            <button
              onClick={() => navigate(createPageUrl("Notifications"))}
              className="relative flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition"
            >
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

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

      {/* Sidebar for Desktop */}
      {showSidebar && (
        <>
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed top-16 left-0 bottom-20 lg:bottom-0 w-64 z-40 glass-effect border-r border-white/10 transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6 lg:hidden">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <nav className="space-y-2">
                {sidebarSections.map((item) => {
                  const isActive = location.pathname === createPageUrl(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
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
              </nav>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-2">Quick Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Today's Orders</span>
                      <span className="font-bold text-white">12</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Revenue</span>
                      <span className="font-bold text-green-400">$456</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <main className={`${isFullScreen ? "pb-0" : "pt-16 pb-20"} ${showSidebar ? 'lg:pl-64' : ''}`}>
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

        {children}
      </main>

      {!isFullScreen && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 glass-effect border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-around py-3">
              {navItems.map((item) => {
                const isActive = location.pathname === createPageUrl(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    disabled={isNavigating}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'text-gray-400 hover:text-white'
                    } ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <item.icon className="w-5 h-5" />
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
          className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        >
          <Headphones className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Support Chat Modal */}
      {showSupportChat && currentUser && (
        <CustomerSupportChat
          currentUser={currentUser}
          onClose={() => setShowSupportChat(false)}
        />
      )}

      {/* Smart AI Tooltips */}
      {currentUser && currentUser.onboarding_completed && !isFullScreen && (
        <SmartTooltip currentUser={currentUser} currentPage={currentPageName} />
      )}
      </div>
      </PostHogProvider>
      </ErrorBoundary>
      );
      }