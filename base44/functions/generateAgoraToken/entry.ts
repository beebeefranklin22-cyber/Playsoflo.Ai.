import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { RtcTokenBuilder, RtcRole } from 'npm:agora-access-token@2.0.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelName, role, uid } = await req.json();

    if (!channelName) {
      return Response.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      return Response.json({ error: 'Agora credentials not configured' }, { status: 500 });
    }

    // Always use a random UID to avoid UID_CONFLICT when rejoining
    const userUid = Math.floor(Math.random() * 2000000) + 1;

    // Token expires in 24 hours
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Role: 1 = publisher (broadcaster), 2 = subscriber (viewer)
    const tokenRole = role === 'broadcaster' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      userUid,
      tokenRole,
      privilegeExpiredTs
    );

    return Response.json({
      token,
      uid: userUid,
      appId,
      channelName,
      expiresAt: privilegeExpiredTs
    });

  } catch (error) {
    console.error('Error generating Agora token:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate token' 
    }, { status: 500 });
  }
});