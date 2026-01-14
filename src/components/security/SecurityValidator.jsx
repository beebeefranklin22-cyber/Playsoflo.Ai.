import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SecurityValidator({ children }) {
  useEffect(() => {
    // Enforce HTTPS
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      window.location.href = window.location.href.replace('http:', 'https:');
      return;
    }

    // Enhanced Content Security Policy with upgrade-insecure-requests
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "upgrade-insecure-requests; block-all-mixed-content;";
    document.head.appendChild(meta);

    // Referrer Policy
    const referrer = document.createElement('meta');
    referrer.name = 'referrer';
    referrer.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrer);

    // Secure all fetch/XHR requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      let url = args[0];
      if (typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
        args[0] = url;
      }
      return originalFetch.apply(this, args);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
      }
      return originalXHROpen.call(this, method, url, ...rest);
    };

    // Session validation every 5 minutes
    const validateSession = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth && window.location.pathname !== '/') {
          toast.error('Session expired. Please log in again.');
          setTimeout(() => base44.auth.redirectToLogin(), 2000);
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    };

    const sessionInterval = setInterval(validateSession, 5 * 60 * 1000);

    // Detect and prevent clickjacking
    if (window.self !== window.top) {
      window.top.location = window.self.location;
    }

    // Prevent drag-and-drop XSS
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Sanitize clipboard paste
    document.addEventListener('paste', (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const sanitized = paste.replace(/<script|javascript:|onerror=/gi, '');
        if (paste !== sanitized) {
          e.preventDefault();
          target.value = sanitized;
          toast.warning('Potentially unsafe content was removed from paste');
        }
      }
    });

    return () => {
      clearInterval(sessionInterval);
      meta.remove();
      referrer.remove();
    };
  }, []);

  return children;
}