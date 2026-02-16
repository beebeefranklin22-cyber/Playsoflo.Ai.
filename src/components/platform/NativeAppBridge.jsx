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

    // Initialize native features when Capacitor plugins are available
    const initNativeFeatures = async () => {
      try {
        const { Capacitor } = window;
        
        // Check if Capacitor plugins are actually installed
        if (!window.Capacitor.Plugins) {
          console.log('Capacitor plugins not available - running in PWA mode');
          return;
        }

        // Access plugins from Capacitor.Plugins (they're already loaded if app is built with Capacitor)
        const { StatusBar, SplashScreen, App, Keyboard } = window.Capacitor.Plugins;

        if (StatusBar && Capacitor.getPlatform() !== 'web') {
          // Configure status bar
          if (Capacitor.getPlatform() === 'ios') {
            await StatusBar.setStyle({ style: 'DARK' });
          } else if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#07131A' });
            await StatusBar.setStyle({ style: 'DARK' });
          }
        }

        // Hide splash screen
        if (SplashScreen) {
          await SplashScreen.hide();
        }

        // Handle app state changes
        if (App) {
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
            const url = new URL(data.url);
            const path = url.pathname;
            if (path) {
              window.location.href = path;
            }
          });
        }

        // Handle keyboard (mobile)
        if (platform.isMobile && Keyboard) {
          Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-visible');
          });

          Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-visible');
          });
        }

        // Expose haptic feedback function globally
        window.NativeAppBridge = {
          triggerHaptic: async (type = 'light') => {
            try {
              const { Haptics } = window.Capacitor.Plugins;
              if (!Haptics) return;

              const impactMap = {
                light: 'LIGHT',
                medium: 'MEDIUM',
                heavy: 'HEAVY'
              };

              const notificationMap = {
                success: 'SUCCESS',
                warning: 'WARNING',
                error: 'ERROR'
              };

              if (impactMap[type]) {
                await Haptics.impact({ style: impactMap[type] });
              } else if (notificationMap[type]) {
                await Haptics.notification({ type: notificationMap[type] });
              } else {
                await Haptics.impact({ style: 'LIGHT' });
              }
            } catch (error) {
              console.log('Haptics not available:', error.message);
            }
          }
        };

        console.log('Native app features initialized');
      } catch (error) {
        console.log('Native features not available:', error.message);
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