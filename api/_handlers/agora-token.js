import agoraAccessToken from 'agora-access-token';
import { requireUser } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

const { RtcTokenBuilder, RtcRole } = agoraAccessToken;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { channelName, uid = 0, role: requestedRole = 'publisher' } = req.body;
  if (!channelName) return res.status(400).json({ error: 'channelName required' });
  const appId = process.env.AGORA_APP_ID;
  if (!appId) return res.status(500).json({ error: 'AGORA_APP_ID not configured' });

  // Publishing was previously gated purely on a `?broadcaster=true` URL
  // param the viewer's own browser controlled -- this endpoint accepted
  // whatever `role` the caller sent and minted a real publisher token for
  // it, so any signed-in user who knew (or looked up, since it's returned
  // in the plain, publicly-queryable stream record) a stream's channel
  // name could join as a publisher and hijack/disrupt someone else's live
  // broadcast. Publisher access now requires actually being the stream's
  // owner or an accepted, broadcast-approved co-host (co_stream_participants,
  // the same table CoHostManager.jsx already manages); everyone else is
  // forced to subscriber/audience regardless of what they asked for. The
  // resolved role is returned below so the client can also be corrected to
  // stop trusting its own URL param for anything but a UI hint.
  let role = 'audience';
  if (requestedRole !== 'audience') {
    const admin = getSupabaseAdmin();
    const { data: stream } = await admin
      .from('streaming_contents')
      .select('id, created_by')
      .eq('agora_channel_name', channelName)
      .maybeSingle();

    if (stream?.created_by === user.email) {
      role = 'publisher';
    } else if (stream) {
      const { data: coHost } = await admin
        .from('co_stream_participants')
        .select('id')
        .eq('stream_id', stream.id)
        .eq('participant_email', user.email)
        .eq('status', 'accepted')
        .eq('can_broadcast', true)
        .maybeSingle();
      if (coHost) role = 'publisher';
    }
  }

  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const expireTs = Math.floor(Date.now() / 1000) + 3600;

  // Without an App Certificate, Agora projects run in test mode and accept a
  // null token. Once a certificate is set on the Agora project, it MUST be
  // used to sign a real token or every join() call is rejected.
  if (!appCertificate) {
    return res.status(200).json({ appId, channelName, uid, expireTs, token: null, role });
  }

  const rtcRole = role === 'audience' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    expireTs
  );

  return res.status(200).json({ appId, channelName, uid, expireTs, token, role });
}
