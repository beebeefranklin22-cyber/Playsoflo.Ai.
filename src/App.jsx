import './App.css'
import VODPlayer from './pages/VODPlayer'
import LiveTracking from './pages/LiveTracking'
import InventoryManager from './pages/InventoryManager'
import CreatorChannel from './pages/CreatorChannel'
import CreatorDashboard from './pages/CreatorDashboard'
import TravelCategoryHub from './pages/TravelCategoryHub'
import AmazonStore from './pages/AmazonStore'
import AmazonOrders from './pages/AmazonOrders'
import SavedJobs from './pages/SavedJobs'
import ApplicationTracker from './pages/ApplicationTracker'
import { Toaster } from "@/components/ui/toaster"
import Discover from './pages/Discover'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

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
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App