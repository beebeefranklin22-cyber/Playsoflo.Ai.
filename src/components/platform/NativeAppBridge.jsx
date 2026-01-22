import { useEffect } from 'react';
import { usePlatform } from './PlatformDetector';

/**
 * Bridge for native app features (Capacitor)
 * Only active when running as native iOS/Android/tvOS app
 */
export default function NativeAppBridge() {
  const platform = usePlatform();

  useEffect(() => {
    // Check if running in Capacitor native app
    const isCapacitor = window.Capacitor !== undefined;
    
    if (!isCapacitor) {
      console.log('Running as web app (not Capacitor native)');
      return;
    }

    console.log('Running as native app via Capacitor');

    // Import Capacitor plugins dynamically (only in native context)
    const initNativeFeatures = async () => {
      try {
        const { Capacitor } = window;
        const { StatusBar } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { App } = await import('@capacitor/app');
        const { Keyboard } = await import('@capacitor/keyboard');

        // Configure status bar
        if (Capacitor.getPlatform() === 'ios') {
          await StatusBar.setStyle({ style: 'dark' });
          await StatusBar.setBackgroundColor({ color: '#07131A' });
        } else if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#07131A' });
          await StatusBar.setStyle({ style: 'dark' });
        }

        // Hide splash screen after app is ready
        await SplashScreen.hide();

        // Handle app state changes
        App.addListener('appStateChange', ({ isActive }) => {
          console.log('App state changed. Is active?', isActive);
        });

        // Handle back button (Android)
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });

        // Handle deep links
        App.addListener('appUrlOpen', (data) => {
          console.log('App opened with URL:', data.url);
          // Parse and handle deep links
          const url = new URL(data.url);
          const path = url.pathname;
          if (path) {
            window.location.href = path;
          }
        });

        // Handle keyboard (mobile)
        if (platform.isMobile) {
          Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-visible');
          });

          Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-visible');
          });
        }

        console.log('Native app features initialized');
      } catch (error) {
        console.error('Error initializing native features:', error);
      }
    };

    initNativeFeatures();

    // Cleanup
    return () => {
      if (window.Capacitor) {
        // Remove listeners if needed
      }
    };
  }, [platform]);

  return null;
}