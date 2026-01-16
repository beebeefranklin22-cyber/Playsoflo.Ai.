import { useEffect, useRef } from 'react';

export default function AdaptiveBitrateManager({ videoTrack, quality, deviceCapabilities }) {
  const appliedQualityRef = useRef(null);

  useEffect(() => {
    if (!videoTrack) return;

    // Detect device capabilities
    const capabilities = deviceCapabilities || detectDeviceCapabilities();
    
    // Apply quality settings
    applyQualitySettings(videoTrack, quality, capabilities);
    appliedQualityRef.current = quality;

  }, [videoTrack, quality]);

  const detectDeviceCapabilities = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency <= 4;
    const hasSlowConnection = navigator.connection?.effectiveType === '2g' || 
                               navigator.connection?.effectiveType === '3g';

    return {
      isMobile,
      isLowEnd,
      hasSlowConnection,
      maxResolution: isMobile ? '720p' : '1080p',
      maxFrameRate: isLowEnd ? 24 : 30
    };
  };

  const applyQualitySettings = async (track, quality, capabilities) => {
    try {
      let config = {};

      switch (quality) {
        case 'low':
          config = {
            width: capabilities.isMobile ? 480 : 640,
            height: capabilities.isMobile ? 360 : 480,
            frameRate: 15,
            bitrateMin: 150,
            bitrateMax: 400
          };
          break;

        case 'medium':
          config = {
            width: capabilities.isMobile ? 640 : 960,
            height: capabilities.isMobile ? 480 : 540,
            frameRate: 24,
            bitrateMin: 400,
            bitrateMax: 800
          };
          break;

        case 'high':
          config = {
            width: capabilities.isMobile ? 960 : 1280,
            height: capabilities.isMobile ? 540 : 720,
            frameRate: capabilities.maxFrameRate,
            bitrateMin: 800,
            bitrateMax: 2000
          };
          break;

        default:
          config = {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 800,
            bitrateMax: 2000
          };
      }

      // Apply encoder configuration
      await track.setEncoderConfiguration({
        width: { ideal: config.width },
        height: { ideal: config.height },
        frameRate: { ideal: config.frameRate },
        bitrateMin: config.bitrateMin,
        bitrateMax: config.bitrateMax
      });

      console.log(`Applied ${quality} quality settings:`, config);

    } catch (error) {
      console.error('Failed to apply quality settings:', error);
    }
  };

  return null;
}

// Helper hook for quality detection
export function useDeviceCapabilities() {
  const capabilities = useRef(null);

  if (!capabilities.current) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isTablet = /(iPad|Android(?!.*Mobile))/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency <= 4;
    const memory = navigator.deviceMemory || 4;
    const connection = navigator.connection?.effectiveType || '4g';
    
    capabilities.current = {
      isMobile,
      isTablet,
      isLowEnd,
      memory,
      connection,
      recommendedQuality: getRecommendedQuality(isMobile, isLowEnd, connection, memory)
    };
  }

  return capabilities.current;
}

function getRecommendedQuality(isMobile, isLowEnd, connection, memory) {
  // Low-end device or slow connection
  if (isLowEnd || memory < 3 || connection === '2g' || connection === 'slow-2g') {
    return 'low';
  }
  
  // Mobile on 3G
  if (isMobile && connection === '3g') {
    return 'medium';
  }
  
  // Everything else
  return 'high';
}