import React, { useState, useEffect } from "react";
import { MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function LocationPermissionManager({ onPermissionGranted }) {
  const [permissionState, setPermissionState] = useState('checking');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setPermissionState('unsupported');
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      if (result.state === 'granted') {
        setPermissionState('granted');
        setShowPrompt(false);
        onPermissionGranted?.();
        return;
      } else if (result.state === 'prompt') {
        setPermissionState('prompt');
        setShowPrompt(true);
      } else {
        setPermissionState('denied');
        setShowPrompt(true);
      }

      result.onchange = () => {
        if (result.state === 'granted') {
          setPermissionState('granted');
          setShowPrompt(false);
          onPermissionGranted?.();
        }
      };
    } catch {
      // Fallback: try to get location directly
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionState('granted');
          setShowPrompt(false);
          onPermissionGranted?.();
        },
        () => {
          setPermissionState('prompt');
          setShowPrompt(true);
        },
        { timeout: 3000 }
      );
    }
  };

  const requestLocationDirectly = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionState('granted');
        setShowPrompt(false);
        onPermissionGranted?.();
      },
      (error) => {
        if (error.code === 1) { // Permission denied
          setPermissionState('denied');
          setShowPrompt(true);
        } else {
          // Other errors (timeout, unavailable) - try again
          setPermissionState('granted');
          setShowPrompt(false);
          onPermissionGranted?.();
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleRequestPermission = () => {
    requestLocationDirectly();
  };

  if (permissionState === 'granted' || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4">
            {permissionState === 'denied' ? (
              <AlertCircle className="w-8 h-8 text-red-400" />
            ) : (
              <MapPin className="w-8 h-8 text-purple-400" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {permissionState === 'denied' ? 'Location Access Blocked' : 'Enable Location'}
          </h2>

          <p className="text-gray-400 text-center mb-6">
            {permissionState === 'denied' 
              ? 'Location access is required for navigation and nearby services. Please enable it in your browser settings.'
              : 'We need your location to provide accurate directions, find nearby services, and enhance your experience.'
            }
          </p>

          {permissionState === 'denied' ? (
            <div className="space-y-3">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-400">
                <p className="font-semibold mb-1">How to enable:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Click the lock icon in your address bar</li>
                  <li>Find "Location" permissions</li>
                  <li>Change to "Allow"</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Refresh Page
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleRequestPermission} 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Allow Location Access
            </Button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}