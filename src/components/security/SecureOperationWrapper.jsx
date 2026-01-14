import { useEffect } from 'react';

export default function SecureOperationWrapper({ children }) {
  useEffect(() => {
    // Enforce HTTPS in production
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      window.location.href = window.location.href.replace('http:', 'https:');
      return;
    }

    // Set secure headers via meta tags
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "upgrade-insecure-requests";
    document.head.appendChild(csp);

    // Prevent clickjacking
    if (window.self !== window.top) {
      window.top.location = window.self.location;
    }

    // Secure storage check
    try {
      localStorage.setItem('security_check', 'ok');
      localStorage.removeItem('security_check');
    } catch (e) {
      console.warn('Storage access restricted - this is normal in some browsers');
    }

    // Override insecure methods
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')) {
        args[0] = url.replace('http://', 'https://');
      }
      return originalFetch.apply(this, args);
    };

  }, []);

  return children;
}