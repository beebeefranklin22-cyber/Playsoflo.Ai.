import { callSecureApi } from '@/lib/apiClient';

// api/_handlers/agora-token.js requires a signed-in caller (closed off this
// session — it used to mint a token for any channel/role with zero auth).
// This wrapper previously called it with a plain fetch and no bearer token
// at all, so every join() — hosting or just watching a stream — started
// failing "Not authenticated" the moment that endpoint was locked down.
// callSecureApi attaches the current Supabase session's access token.
export async function generateAgoraToken(data) {
  try {
    // Flat return ({appId, channelName, uid, token}), matching the endpoint's
    // own response shape -- GameStreamViewer.jsx and ScreenShareStreamer.jsx
    // destructure `token` straight off this, with no `.data` wrapper.
    return await callSecureApi('/api/agora-token', data);
  } catch (error) {
    console.error('generateAgoraToken error:', error);
    throw error;
  }
}
