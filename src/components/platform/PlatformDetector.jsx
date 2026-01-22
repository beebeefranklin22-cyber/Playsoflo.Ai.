import { useEffect, useState } from 'react';

export const usePlatform = () => {
  const [platform, setPlatform] = useState({
    isIOS: false,
    isAndroid: false,
    isTVOS: false,
    isPWA: false,
    isTablet: false,
    isMobile: false,
    isDesktop: false,
    isTouch: false,
    hasNotch: false,
    deviceType: 'unknown'
  });

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    
    // Android detection
    const isAndroid = /android/i.test(userAgent);
    
    // tvOS detection (Apple TV)
    const isTVOS = /AppleTV/.test(userAgent) || 
                   (userAgent.includes('AppleWebKit') && userAgent.includes('Safari') && 
                    !userAgent.includes('Mobile') && window.screen && window.screen.width >= 1920);
    
    // PWA detection
    const isPWA = standalone || window.matchMedia('(display-mode: fullscreen)').matches;
    
    // Tablet detection
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent.toLowerCase());
    
    // Mobile detection
    const isMobile = /iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && !isTablet;
    
    // Desktop detection
    const isDesktop = !isMobile && !isTablet && !isTVOS;
    
    // Touch detection
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Notch detection (iPhone X+)
    const hasNotch = isIOS && (
      window.screen.height === 812 || // iPhone X, XS, 11 Pro
      window.screen.height === 896 || // iPhone XR, XS Max, 11, 11 Pro Max
      window.screen.height === 844 || // iPhone 12, 12 Pro, 13, 13 Pro
      window.screen.height === 926 || // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
      window.screen.height === 852 || // iPhone 14 Pro
      window.screen.height === 932    // iPhone 14 Pro Max
    );

    // Device type
    let deviceType = 'unknown';
    if (isTVOS) deviceType = 'tv';
    else if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';
    else if (isDesktop) deviceType = 'desktop';

    setPlatform({
      isIOS,
      isAndroid,
      isTVOS,
      isPWA,
      isTablet,
      isMobile,
      isDesktop,
      isTouch,
      hasNotch,
      deviceType
    });

    // Set CSS classes
    const classes = [];
    if (isIOS) classes.push('platform-ios');
    if (isAndroid) classes.push('platform-android');
    if (isTVOS) classes.push('platform-tvos');
    if (isPWA) classes.push('pwa-mode');
    if (isTablet) classes.push('platform-tablet');
    if (isMobile) classes.push('platform-mobile');
    if (isDesktop) classes.push('platform-desktop');
    if (isTouch) classes.push('touch-device');
    if (hasNotch) classes.push('has-notch');

    document.documentElement.classList.add(...classes);

    // Set CSS variables for safe areas
    if (isIOS && hasNotch) {
      document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 44px)');
      document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 34px)');
    }

    // Set viewport height variable
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      document.documentElement.classList.remove(...classes);
    };
  }, []);

  return platform;
};

export default function PlatformDetector({ children }) {
  const platform = usePlatform();

  return (
    <>
      {children}
    </>
  );
}