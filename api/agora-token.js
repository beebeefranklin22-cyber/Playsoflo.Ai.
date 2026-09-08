import agoraAccessToken from 'agora-access-token';

const { RtcTokenBuilder, RtcRole } = agoraAccessToken;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { channelName, uid = 0, role = 'publisher' } = req.body;
  if (!channelName) return res.status(400).json({ error: 'channelName required' });
  const appId = process.env.AGORA_APP_ID;
  if (!appId) return res.status(500).json({ error: 'AGORA_APP_ID not configured' });

  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const expireTs = Math.floor(Date.now() / 1000) + 3600;

  // Without an App Certificate, Agora projects run in test mode and accept a
  // null token. Once a certificate is set on the Agora project, it MUST be
  // used to sign a real token or every join() call is rejected.
  if (!appCertificate) {
    return res.status(200).json({ appId, channelName, uid, expireTs, token: null });
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

  return res.status(200).json({ appId, channelName, uid, expireTs, token });
}
