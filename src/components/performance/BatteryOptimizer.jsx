import { useEffect, useState } from "react";
import { toast } from "sonner";

// Battery-conscious performance optimizer
export default function BatteryOptimizer({ children }) {
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(true);
  const [powerSaveMode, setPowerSaveMode] = useState(false);

  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        // Initial state
        setBatteryLevel(battery.level * 100);
        setIsCharging(battery.charging);

        // Enable power save mode if battery is low and not charging
        if (battery.level < 0.2 && !battery.charging) {
          enablePowerSaveMode();
        }

        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100);
          if (battery.level < 0.2 && !battery.charging && !powerSaveMode) {
            enablePowerSaveMode();
          } else if ((battery.level > 0.3 || battery.charging) && powerSaveMode) {
            disablePowerSaveMode();
          }
        });

        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
          if (battery.charging && powerSaveMode) {
            disablePowerSaveMode();
          }
        });
      });
    }
  }, []);

  const enablePowerSaveMode = () => {
    setPowerSaveMode(true);
    document.body.classList.add('low-power-mode');
    
    toast.info('Battery Saver Enabled', {
      description: 'Reducing animations and background activity to conserve battery.'
    });
  };

  const disablePowerSaveMode = () => {
    setPowerSaveMode(false);
    document.body.classList.remove('low-power-mode');
  };

  // Apply power save optimizations
  useEffect(() => {
    if (powerSaveMode) {
      // Reduce animation durations
      const style = document.createElement('style');
      style.id = 'power-save-styles';
      style.innerHTML = `
        * {
          animation-duration: 0.3s !important;
          transition-duration: 0.2s !important;
        }
        .animate-spin {
          animation: none !important;
        }
        .animate-pulse {
          animation: none !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const styleElement = document.getElementById('power-save-styles');
        if (styleElement) styleElement.remove();
      };
    }
  }, [powerSaveMode]);

  return children;
}

// Hook for battery-conscious features
export function useBatteryOptimization() {
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(true);

  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(battery.level * 100);
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100);
        });

        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      });
    }
  }, []);

  return {
    batteryLevel,
    isCharging,
    isLowBattery: batteryLevel < 20,
    shouldReduceQuality: batteryLevel < 20 && !isCharging
  };
}