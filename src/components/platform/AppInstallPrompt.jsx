import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Tablet, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/Android/.test(userAgent)) {
      setPlatform('android');
    } else if (/AppleTV/.test(userAgent)) {
      setPlatform('tvos');
    } else {
      setPlatform('desktop');
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user has dismissed prompt before
      const dismissed = localStorage.getItem('installPromptDismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowPrompt(true); // Show iOS instructions
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
    
    // Reset after 7 days
    setTimeout(() => {
      localStorage.removeItem('installPromptDismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  const getIcon = () => {
    switch (platform) {
      case 'ios': return <Smartphone className="w-8 h-8" />;
      case 'android': return <Smartphone className="w-8 h-8" />;
      case 'tvos': return <Tv className="w-8 h-8" />;
      default: return <Download className="w-8 h-8" />;
    }
  };

  const getInstructions = () => {
    if (platform === 'ios') {
      return (
        <div className="space-y-3">
          <p className="text-gray-300 text-sm">To install PlaySoFlo on your iPhone or iPad:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
            <li>Tap the <span className="font-semibold">Share</span> button in Safari</li>
            <li>Scroll down and tap <span className="font-semibold">"Add to Home Screen"</span></li>
            <li>Tap <span className="font-semibold">"Add"</span> in the top right</li>
          </ol>
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-300">
              💡 The app icon will appear on your home screen for quick access!
            </p>
          </div>
        </div>
      );
    }

    if (platform === 'android') {
      return (
        <p className="text-gray-300 text-sm">
          Install PlaySoFlo for quick access, offline features, and a native app experience!
        </p>
      );
    }

    return (
      <p className="text-gray-300 text-sm">
        Install PlaySoFlo as an app for the best experience with offline access and faster performance.
      </p>
    );
  };

  if (!showPrompt && !deferredPrompt && platform !== 'ios') return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
        >
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-full transition"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-white">
                {getIcon()}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-2">
                  Install PlaySoFlo
                </h3>
                {getInstructions()}

                {platform !== 'ios' && deferredPrompt && (
                  <Button
                    onClick={handleInstallClick}
                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}