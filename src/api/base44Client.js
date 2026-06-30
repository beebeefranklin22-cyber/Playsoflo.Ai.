// This file used to connect to Base44. The app has been migrated to
// Supabase + Vercel, but many components still import "base44" from here.
// This stub prevents those old imports from crashing the build.
export const base44 = {
  auth: {},
  entities: {},
  integrations: {},
  functions: {},
};
