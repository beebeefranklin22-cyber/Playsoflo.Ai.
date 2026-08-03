// This file used to connect to Base44. The app has been migrated to
// Supabase + Vercel. This file now bridges the old base44.* calls that
// components still use to the real Supabase-backed implementations in
// entities.js and integrations.js, plus the custom backend functions in
// src/functions/*.js.

import * as entities from './entities';
import { Core as integrationsCore } from './integrations';

const { User } = entities;

// Auto-collect every named export from src/functions/*.js so
// base44.functions.invoke('name', args) can find and call it.
const functionModules = import.meta.glob('/src/functions/*.js', { eager: true });
const functionsMap = {};
for (const path in functionModules) {
  const mod = functionModules[path];
  for (const key in mod) {
    if (typeof mod[key] === 'function') functionsMap[key] = mod[key];
  }
}

export const base44 = {
  auth: {
    me: () => User.me(),
    updateMe: (data) => User.updateMyProfile(data),
    login: (creds) => User.login(creds),
    logout: () => User.logout(),
  },

  // Best-effort page-view logging. Not critical to app function, so
  // any failure here should never break navigation.
  appLogs: {
    logUserInApp: async (pageName) => {
      try {
        console.log('[appLogs] page view:', pageName);
      } catch {
        // never let logging break the app
      }
      return null;
    },
  },

  // base44.entities.Booking, base44.entities.User, etc.
  entities,

  // The original Base44 SDK used this for elevated-privilege writes
  // (e.g. updating another user's balance when tipping). We do NOT
  // use a real service-role key here — that key must never be exposed
  // to the browser. This works today only because your current RLS
  // policies allow any logged-in user to write to any row. Once RLS
  // is tightened to per-user ownership, these specific actions will
  // need to move into secure backend functions instead.
  asServiceRole: {
    entities,
  },

  integrations: {
    Core: {
      ...integrationsCore,

      // Fix: components expect { file_url }, the base implementation
      // returns a plain URL string.
      UploadFile: async (args) => {
        const url = await integrationsCore.UploadFile(args);
        return { file_url: url };
      },

      // Not implemented in integrations.js yet — wire to the existing
      // Stripe PaymentIntent endpoint.
      ProcessPayment: async ({ amount, currency = 'usd', ...rest }) => {
        const res = await fetch('/api/stripe-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(Number(amount) * 100),
            currency,
            metadata: rest,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'ProcessPayment failed');
        }
        return res.json();
      },
    },
  },

  functions: {
    invoke: async (name, args) => {
      const fn = functionsMap[name];
      if (!fn) {
        throw new Error(
          `base44.functions.invoke("${name}") has no backend implementation yet. ` +
          `This feature still needs to be built.`
        );
      }
      return fn(args);
    },
  },
};
