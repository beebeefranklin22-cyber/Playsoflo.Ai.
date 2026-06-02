import './App.css'
import VODPlayer from './pages/VODPlayer'
import AdManager from './pages/AdManager'
import DropshippingDashboard from './pages/DropshippingDashboard'
import LeasePortal from './pages/LeasePortal'
import SavedProperties from './pages/SavedProperties'
import LiveTracking from './pages/LiveTracking'
import InventoryManager from './pages/InventoryManager'
import Reels from './pages/Reels'
import CreatorChannel from './pages/CreatorChannel'
import CreatorDashboard from './pages/CreatorDashboard'
import TravelCategoryHub from './pages/TravelCategoryHub'
import Help from './pages/Help'
import UnifiedBooking from './pages/UnifiedBooking'
import AmazonStore from './pages/AmazonStore'
import AmazonOrders from './pages/AmazonOrders'
import SavedJobs from './pages/SavedJobs'
import ApplicationTracker from './pages/ApplicationTracker'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import Discover from './pages/Discover'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProfilePictureGate from '@/components/onboarding/ProfilePictureGate';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, user, checkAppState, refreshUser } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Show onboarding gate for new users who haven't set a username or profile picture
  if (isAuthenticated && user && (!user.username || !user.profile_picture)) {
    return <ProfilePictureGate user={user} onComplete={refreshUser} />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Discover" element={<LayoutWrapper currentPageName="Discover"><Discover /></LayoutWrapper>} />
      <Route path="/VODPlayer" element={<LayoutWrapper currentPageName="VODPlayer"><VODPlayer /></LayoutWrapper>} />
      <Route path="/CreatorChannel" element={<LayoutWrapper currentPageName="CreatorChannel"><CreatorChannel /></LayoutWrapper>} />
      <Route path="/CreatorDashboard" element={<LayoutWrapper currentPageName="CreatorDashboard"><CreatorDashboard /></LayoutWrapper>} />
      <Route path="/TravelCategoryHub" element={<LayoutWrapper currentPageName="TravelCategoryHub"><TravelCategoryHub /></LayoutWrapper>} />
      <Route path="/AmazonStore" element={<LayoutWrapper currentPageName="AmazonStore"><AmazonStore /></LayoutWrapper>} />
      <Route path="/AmazonOrders" element={<LayoutWrapper currentPageName="AmazonOrders"><AmazonOrders /></LayoutWrapper>} />
      <Route path="/SavedJobs" element={<LayoutWrapper currentPageName="SavedJobs"><SavedJobs /></LayoutWrapper>} />
      <Route path="/ApplicationTracker" element={<LayoutWrapper currentPageName="ApplicationTracker"><ApplicationTracker /></LayoutWrapper>} />
      <Route path="/LiveTracking" element={<LayoutWrapper currentPageName="LiveTracking"><LiveTracking /></LayoutWrapper>} />
      <Route path="/InventoryManager" element={<LayoutWrapper currentPageName="InventoryManager"><InventoryManager /></LayoutWrapper>} />
      <Route path="/Reels" element={<Reels />} />
      <Route path="/Help" element={<LayoutWrapper currentPageName="Help"><Help /></LayoutWrapper>} />
      <Route path="/UnifiedBooking" element={<LayoutWrapper currentPageName="UnifiedBooking"><UnifiedBooking /></LayoutWrapper>} />
      <Route path="/AdManager" element={<LayoutWrapper currentPageName="AdManager"><AdManager /></LayoutWrapper>} />
      <Route path="/DropshippingDashboard" element={<LayoutWrapper currentPageName="DropshippingDashboard"><DropshippingDashboard /></LayoutWrapper>} />
      <Route path="/LeasePortal" element={<LayoutWrapper currentPageName="LeasePortal"><LeasePortal /></LayoutWrapper>} />
      <Route path="/SavedProperties" element={<LayoutWrapper currentPageName="SavedProperties"><SavedProperties /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="bottom-center" richColors closeButton />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App