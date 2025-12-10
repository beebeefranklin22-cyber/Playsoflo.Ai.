import { useEffect } from 'react';
import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_ueRfpmLRVAzikNZ8d3t48jfYSdVQkBSYYHwURuuPDcM';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export function PostHogProvider({ children, user }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog loaded');
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (user) {
      posthog.identify(user.email, {
        email: user.email,
        name: user.full_name,
        role: user.role
      });
    }
  }, [user]);

  return children;
}

export { posthog };