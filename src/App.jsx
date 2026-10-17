import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { wagmiConfig } from '@/lib/wagmiConfig'
import { queryClientInstance } from '@/lib/query-client'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import ReferralCapture from '@/lib/ReferralCapture'
import ProfilePictureGate from '@/components/onboarding/ProfilePictureGate'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'
import AuthGateScreen from '@/components/auth/AuthGateScreen'
import { pagesConfig } from './pages.config'
import PageNotFound from '@/lib/PageNotFound'

// Import individual page components
import VODPlayer from './pages/VODPlayer'
import ProviderEarningsSummary from './pages/ProviderEarningsSummary'
import AdManager from './pages/AdManager'
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
import Discover from './pages/Discover'
import CreatorDiscovery from './pages/CreatorDiscovery'
import Events from './pages/Events'
const { Pages, Layout, mainPage } = pagesConfig
const mainPageKey = mainPage ?? Object.keys(Pages)[0]
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>

// Everything except these requires a signed-in account. Keeping this an
// allowlist (rather than a blocklist of ~140 protected pages) means a new
// page is protected by default, and a visitor always has somewhere to land
// (the main menu + legal) before being asked to sign in -- the rest of the
// app funnels into AuthGateScreen instead of rendering real content.
const PUBLIC_PAGES = new Set(['Universe', 'Home', 'TermsOfService'])

const gated = (isAuthenticated, pageKey, element) =>
  isAuthenticated || PUBLIC_PAGES.has(pageKey) ? element : <AuthGateScreen />

const AuthenticatedApp = () => {
  const [skipGate, setSkipGate] = React.useState(false)
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, user, refreshUser } = useAuth()

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />
    } else if (authError.type === 'auth_required') {
      navigateToLogin()
      return null
    }
  }

  if (isAuthenticated && user && !user.username && !skipGate) {
    return <ProfilePictureGate user={user} onComplete={async () => { await refreshUser(); setSkipGate(true) }} />
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          {gated(isAuthenticated, mainPageKey, <MainPage />)}
        </LayoutWrapper>
      } />

      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              {gated(isAuthenticated, path, <Page />)}
            </LayoutWrapper>
          }
        />
      ))}

      <Route path="/Discover" element={<LayoutWrapper currentPageName="Discover">{gated(isAuthenticated, "Discover", <Discover />)}</LayoutWrapper>} />
      <Route path="/CreatorDiscovery" element={<LayoutWrapper currentPageName="CreatorDiscovery">{gated(isAuthenticated, "CreatorDiscovery", <CreatorDiscovery />)}</LayoutWrapper>} />
      <Route path="/Events" element={<LayoutWrapper currentPageName="Events">{gated(isAuthenticated, "Events", <Events />)}</LayoutWrapper>} />
      <Route path="/VODPlayer" element={<LayoutWrapper currentPageName="VODPlayer">{gated(isAuthenticated, "VODPlayer", <VODPlayer />)}</LayoutWrapper>} />
      <Route path="/CreatorChannel" element={<LayoutWrapper currentPageName="CreatorChannel">{gated(isAuthenticated, "CreatorChannel", <CreatorChannel />)}</LayoutWrapper>} />
      <Route path="/CreatorDashboard" element={<LayoutWrapper currentPageName="CreatorDashboard">{gated(isAuthenticated, "CreatorDashboard", <CreatorDashboard />)}</LayoutWrapper>} />
      <Route path="/TravelCategoryHub" element={<LayoutWrapper currentPageName="TravelCategoryHub">{gated(isAuthenticated, "TravelCategoryHub", <TravelCategoryHub />)}</LayoutWrapper>} />
      <Route path="/AmazonStore" element={<LayoutWrapper currentPageName="AmazonStore">{gated(isAuthenticated, "AmazonStore", <AmazonStore />)}</LayoutWrapper>} />
      <Route path="/AmazonOrders" element={<LayoutWrapper currentPageName="AmazonOrders">{gated(isAuthenticated, "AmazonOrders", <AmazonOrders />)}</LayoutWrapper>} />
      <Route path="/SavedJobs" element={<LayoutWrapper currentPageName="SavedJobs">{gated(isAuthenticated, "SavedJobs", <SavedJobs />)}</LayoutWrapper>} />
      <Route path="/ApplicationTracker" element={<LayoutWrapper currentPageName="ApplicationTracker">{gated(isAuthenticated, "ApplicationTracker", <ApplicationTracker />)}</LayoutWrapper>} />
      <Route path="/LiveTracking" element={<LayoutWrapper currentPageName="LiveTracking">{gated(isAuthenticated, "LiveTracking", <LiveTracking />)}</LayoutWrapper>} />
      <Route path="/InventoryManager" element={<LayoutWrapper currentPageName="InventoryManager">{gated(isAuthenticated, "InventoryManager", <InventoryManager />)}</LayoutWrapper>} />
      <Route path="/Reels" element={gated(isAuthenticated, "Reels", <Reels />)} />
      <Route path="/Help" element={<LayoutWrapper currentPageName="Help">{gated(isAuthenticated, "Help", <Help />)}</LayoutWrapper>} />
      <Route path="/UnifiedBooking" element={<LayoutWrapper currentPageName="UnifiedBooking">{gated(isAuthenticated, "UnifiedBooking", <UnifiedBooking />)}</LayoutWrapper>} />
      <Route path="/AdManager" element={<LayoutWrapper currentPageName="AdManager">{gated(isAuthenticated, "AdManager", <AdManager />)}</LayoutWrapper>} />
      <Route path="/LeasePortal" element={<LayoutWrapper currentPageName="LeasePortal">{gated(isAuthenticated, "LeasePortal", <LeasePortal />)}</LayoutWrapper>} />
      <Route path="/SavedProperties" element={<LayoutWrapper currentPageName="SavedProperties">{gated(isAuthenticated, "SavedProperties", <SavedProperties />)}</LayoutWrapper>} />
      <Route path="/ProviderEarningsSummary" element={<LayoutWrapper currentPageName="ProviderEarningsSummary">{gated(isAuthenticated, "ProviderEarningsSummary", <ProviderEarningsSummary />)}</LayoutWrapper>} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClientInstance}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#9333ea' })}>
          <AuthProvider>
            <Router>
              <NavigationTracker />
              <ReferralCapture />
              <ErrorBoundary>
                <AuthenticatedApp />
              </ErrorBoundary>
            </Router>
            <Toaster />
            <SonnerToaster position="bottom-center" richColors closeButton />
            <VisualEditAgent />
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
