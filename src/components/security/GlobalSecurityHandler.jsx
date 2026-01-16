import { useEffect } from 'react';

export default function GlobalSecurityHandler() {
  useEffect(() => {
    // Global handler for SecurityError
    const handleSecurityError = (event) => {
      if (event.error?.name === 'SecurityError' || 
          event.message?.includes('SecurityError') ||
          event.message?.includes('insecure')) {
        
        console.warn('SecurityError caught and handled:', event.message);
        
        // Prevent the error from propagating
        event.preventDefault();
        event.stopPropagation();
        
        return true;
      }
    };

    // Catch all unhandled errors
    window.addEventListener('error', handleSecurityError, true);
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.name === 'SecurityError' || 
          event.reason?.message?.includes('SecurityError') ||
          event.reason?.message?.includes('insecure')) {
        
        console.warn('SecurityError in promise caught and handled:', event.reason);
        event.preventDefault();
        return true;
      }
    });

    // Wrap localStorage and sessionStorage globally
    if (typeof window !== 'undefined') {
      const createSafeStorage = (storage, storageName) => {
        const fallbackStore = new Map();
        
        return {
          getItem: (key) => {
            try {
              return storage.getItem(key);
            } catch (e) {
              console.warn(`${storageName}.getItem failed, using fallback`);
              return fallbackStore.get(key) || null;
            }
          },
          setItem: (key, value) => {
            try {
              storage.setItem(key, value);
            } catch (e) {
              console.warn(`${storageName}.setItem failed, using fallback`);
              fallbackStore.set(key, value);
            }
          },
          removeItem: (key) => {
            try {
              storage.removeItem(key);
            } catch (e) {
              console.warn(`${storageName}.removeItem failed, using fallback`);
              fallbackStore.delete(key);
            }
          },
          clear: () => {
            try {
              storage.clear();
            } catch (e) {
              console.warn(`${storageName}.clear failed, using fallback`);
              fallbackStore.clear();
            }
          },
          get length() {
            try {
              return storage.length;
            } catch (e) {
              return fallbackStore.size;
            }
          },
          key: (index) => {
            try {
              return storage.key(index);
            } catch (e) {
              return Array.from(fallbackStore.keys())[index] || null;
            }
          }
        };
      };

      // Override global storage objects
      try {
        Object.defineProperty(window, 'localStorage', {
          value: createSafeStorage(window.localStorage, 'localStorage'),
          writable: false,
          configurable: true
        });
      } catch (e) {
        console.warn('Could not override localStorage');
      }

      try {
        Object.defineProperty(window, 'sessionStorage', {
          value: createSafeStorage(window.sessionStorage, 'sessionStorage'),
          writable: false,
          configurable: true
        });
      } catch (e) {
        console.warn('Could not override sessionStorage');
      }
    }

    return () => {
      window.removeEventListener('error', handleSecurityError, true);
    };
  }, []);

  return null;
}