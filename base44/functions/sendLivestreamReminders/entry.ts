import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find scheduled streams starting in the next 24 hours that haven't sent reminders
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const scheduledStreams = await base44.asServiceRole.entities.LivestreamSchedule.filter({
      status: 'scheduled',
      reminder_sent: false,
      scheduled_time: { $lte: tomorrow.toISOString() }
    });

    const results = [];

    for (const stream of scheduledStreams) {
      // Get creator's followers
      const followers = await base44.asServiceRole.entities.Follow.filter({
        following_email: stream.creator_email
      });

      // Get creator's members
      const members = await base44.asServiceRole.entities.MembershipSubscription.filter({
        creator_email: stream.creator_email,
        status: 'active'
      });

      const uniqueRecipients = new Set([
        ...followers.map(f => f.follower_email),
        ...members.map(m => m.user_email)
      ]);

      // Send notifications
      for (const email of uniqueRecipients) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: 'livestream_reminder',
          title: 'Livestream Starting Soon!',
          message: `${stream.title} starts ${new Date(stream.scheduled_time).toLocaleString()}`,
          related_id: stream.id,
          read: false
        });
      }

      // Mark reminder as sent
      await base44.asServiceRole.entities.LivestreamSchedule.update(stream.id, {
        reminder_sent: true,
        reminder_sent_at: new Date().toISOString()
      });

      results.push({
        stream_id: stream.id,
        title: stream.title,
        notifications_sent: uniqueRecipients.size
      });
    }

    return Response.json({ 
      success: true, 
      reminders_sent: results.length,
      details: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});