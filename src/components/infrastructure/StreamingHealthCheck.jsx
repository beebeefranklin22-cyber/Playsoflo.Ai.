import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { safeSessionStorage } from '../utils/SafeStorage';

export default function StreamingHealthCheck() {
  const healthCheckRef = useRef(null);

  useEffect(() => {
    // Validate Agora streaming setup
    const validateStreaming = async () => {
      try {
        // Check if Agora SDK is loaded
        if (typeof window.AgoraRTC === 'undefined') {
          console.warn('⚠️ Agora SDK not loaded - attempting reload');
          await loadAgoraSDK();
        }

        // Test token generation
        const tokenTest = await base44.functions.invoke('generateAgoraToken', {
          channelName: 'health-check',
          uid: 0,
          role: 'audience'
        }).catch(() => null);

        if (!tokenTest) {
          console.error('❌ Agora token generation failed');
          await repairAgoraConfig();
        } else {
          console.log('✅ Streaming infrastructure healthy');
        }

        // Validate WebRTC support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('⚠️ WebRTC not supported - fallback mode enabled');
          safeSessionStorage.setItem('webrtc_fallback', 'true');
        }

      } catch (error) {
        console.error('Streaming health check failed:', error);
      }
    };

    validateStreaming();

    // Re-validate every 5 minutes
    healthCheckRef.current = setInterval(validateStreaming, 5 * 60 * 1000);

    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
      }
    };
  }, []);

  const loadAgoraSDK = async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/agora-rtc-sdk-ng@latest/dist/AgoraRTC_N.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const repairAgoraConfig = async () => {
    console.log('🔧 Repairing Agora configuration');
    safeSessionStorage.removeItem('agora_client');
    safeSessionStorage.removeItem('agora_token');
  };

  return null;
}