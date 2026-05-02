import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, streamId, channelName } = body;

    if (action === 'health_check') {
      // Validate the stream is healthy
      if (!streamId) return Response.json({ error: 'streamId required' }, { status: 400 });
      const streams = await base44.asServiceRole.entities.StreamingContent.filter({ id: streamId });
      const stream = streams[0];
      if (!stream) return Response.json({ healthy: false, reason: 'Stream not found' });
      return Response.json({
        healthy: stream.is_live,
        status: stream.status,
        channel: stream.agora_channel_name,
        started_at: stream.stream_started_at,
      });
    }

    if (action === 'start') {
      // Create or verify a stream record
      const { title, description, category, thumbnail_url, source_type } = body;
      if (!title) return Response.json({ error: 'title required' }, { status: 400 });

      const channel = `livestream_${Date.now()}_${user.id?.substring(0, 8) || user.email.substring(0, 8)}`;

      const stream = await base44.asServiceRole.entities.StreamingContent.create({
        title,
        description: description || '',
        category: category || 'entertainment',
        thumbnail_url: thumbnail_url || null,
        type: 'live_event',
        is_live: true,
        status: 'live',
        agora_channel_name: channel,
        creator_email: user.email,
        creator_username: user.username || user.full_name,
        rating: 0,
        requires_subscription: false,
        betting_available: false,
        stream_started_at: new Date().toISOString(),
        source_type: source_type || 'phone', // 'phone', 'irl_camera', 'desktop'
      });

      // Notify followers
      const [followers, subscribers] = await Promise.all([
        base44.asServiceRole.entities.Follow.filter({ following_email: user.email }),
        base44.asServiceRole.entities.UserSubscription.filter({ creator_email: user.email, status: 'active' }).catch(() => []),
      ]);

      const recipients = new Set([
        ...followers.map(f => f.follower_email),
        ...subscribers.map(s => s.subscriber_email),
      ]);

      await Promise.all([...recipients].map(email =>
        base44.asServiceRole.entities.Notification.create({
          recipient_email: email,
          type: 'live',
          title: `🔴 ${user.full_name || 'Someone you follow'} is LIVE!`,
          message: `"${title}" — Watch now`,
          sender_email: user.email,
          sender_name: user.full_name,
          action_url: `/LivestreamViewer?id=${stream.id}`,
          read: false,
        }).catch(() => {})
      ));

      return Response.json({ stream, channel });
    }

    if (action === 'end') {
      if (!streamId) return Response.json({ error: 'streamId required' }, { status: 400 });
      await base44.asServiceRole.entities.StreamingContent.update(streamId, {
        is_live: false,
        status: 'ended',
        stream_ended_at: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    if (action === 'save_multistream') {
      // Save RTMP multistream destinations to the stream record
      // destinations: [{ platform_id, rtmp_url, stream_key, enabled }]
      const { streamId, destinations } = body;
      if (!streamId) return Response.json({ error: 'streamId required' }, { status: 400 });

      const streams = await base44.asServiceRole.entities.StreamingContent.filter({ id: streamId });
      const stream = streams[0];
      if (!stream) return Response.json({ error: 'Stream not found' }, { status: 404 });
      if (stream.creator_email !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // Strip stream keys before logging — store securely on the entity
      const sanitized = (destinations || []).filter(d => d.enabled && d.stream_key).map(d => ({
        platform_id: d.platform_id,
        rtmp_url: d.rtmp_url,
        stream_key: d.stream_key, // stored on entity, never logged
        enabled: true,
      }));

      await base44.asServiceRole.entities.StreamingContent.update(streamId, {
        multistream_destinations: sanitized,
        multistream_enabled: sanitized.length > 0,
      });

      return Response.json({
        success: true,
        active_destinations: sanitized.map(d => d.platform_id),
        rtmp_instructions: sanitized.map(d => ({
          platform: d.platform_id,
          rtmp_url: d.rtmp_url,
          // Return RTMP push info so client/OBS can use it
          full_rtmp_push: `${d.rtmp_url}/${d.stream_key}`,
          note: `To push externally via OBS: set Server=${d.rtmp_url} and Stream Key=${d.stream_key}`,
        })),
      });
    }

    if (action === 'get_multistream_status') {
      const { streamId } = body;
      if (!streamId) return Response.json({ error: 'streamId required' }, { status: 400 });
      const streams = await base44.asServiceRole.entities.StreamingContent.filter({ id: streamId });
      const stream = streams[0];
      if (!stream) return Response.json({ error: 'Stream not found' }, { status: 404 });

      const destinations = (stream.multistream_destinations || []).map(d => ({
        platform_id: d.platform_id,
        rtmp_url: d.rtmp_url,
        enabled: d.enabled,
        has_key: !!d.stream_key,
      }));

      return Response.json({ multistream_enabled: stream.multistream_enabled || false, destinations });
    }

    if (action === 'list_devices') {
      // Returns info about expected IRL camera brands and RTMP/USB tips
      return Response.json({
        supported_irl_cameras: [
          { name: 'GoPro Hero (USB)', method: 'usb_webcam', notes: 'Connect via USB, select as video device in browser' },
          { name: 'Sony ZV-1 / ZV-E10', method: 'usb_webcam', notes: 'Use Sony Imaging Edge Webcam app or USB Video Class mode' },
          { name: 'OBSBOT Tiny Pro', method: 'usb_webcam', notes: 'Plug in USB-C, auto-detected as webcam' },
          { name: 'DJI Action 4', method: 'usb_webcam', notes: 'Use DJI USB Webcam mode or USB-C cable' },
          { name: 'Insta360', method: 'usb_webcam', notes: 'Connect via USB, appears as a webcam device' },
          { name: 'Any HDMI Camera', method: 'capture_card', notes: 'Use an HDMI capture card (e.g. Elgato Cam Link)' },
          { name: 'Phone Camera', method: 'phone', notes: 'Native camera via browser getUserMedia' },
          { name: 'Desktop / Laptop Camera', method: 'phone', notes: 'Built-in or external webcam via browser' },
        ],
        notes: 'IRL cameras that support USB Video Class (UVC) are automatically detected by the browser as video devices. For HDMI cameras, use an HDMI capture card.',
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});