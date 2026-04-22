import React, { useState, useEffect } from "react";
import { MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function LocationPermissionManager({ onPermissionGranted }) {
  const [permissionState, setPermissionState] = useState('idle');

  useEffect(() => {
    // Only silently check via Permissions API — do NOT prompt on mount
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setPermissionState('granted');
          onPermissionGranted?.();
        }
        // If 'denied' or 'prompt', do nothing — let navigation request trigger it
      }).catch(() => {});
    }
  }, []);

  // Component renders nothing — it only silently checks permission in background
  return null;
}