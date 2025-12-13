import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This should be called by admin or scheduled job
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all processing distributions
    const distributions = await base44.asServiceRole.entities.MusicDistribution.list();
    
    const now = new Date();
    let updated = 0;

    for (const dist of distributions) {
      const submissionDate = new Date(dist.submission_date);
      const releaseDate = new Date(dist.release_date);
      const hoursSinceSubmission = (now - submissionDate) / (1000 * 60 * 60);

      // After 48 hours, mark as submitted
      if (dist.status === 'processing' && hoursSinceSubmission >= 48) {
        await base44.asServiceRole.entities.MusicDistribution.update(dist.id, {
          status: 'submitted'
        });

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: dist.artist_email,
          type: "payment_received",
          title: "Music Submitted to Platforms",
          message: `Your music has been submitted to streaming platforms. It will go live on ${releaseDate.toLocaleDateString()}`,
          read: false,
          action_url: "/MusicStudio"
        });
        updated++;
      }

      // On release date, mark as live and generate platform links
      if (dist.status === 'submitted' && now >= releaseDate) {
        // Generate simulated platform links (in production, these would be real links)
        const platformLinks = {
          spotify: `https://open.spotify.com/track/${dist.isrc_code}`,
          apple_music: `https://music.apple.com/us/album/${dist.isrc_code}`,
          youtube_music: `https://music.youtube.com/watch?v=${dist.isrc_code}`,
          amazon_music: `https://music.amazon.com/albums/${dist.isrc_code}`,
          tidal: `https://tidal.com/browse/track/${dist.isrc_code}`,
          deezer: `https://www.deezer.com/track/${dist.isrc_code}`
        };

        await base44.asServiceRole.entities.MusicDistribution.update(dist.id, {
          status: 'live',
          live_date: now.toISOString(),
          platform_links: platformLinks
        });

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: dist.artist_email,
          type: "payment_received",
          title: "🎉 Your Music is Live!",
          message: `Your music is now live on all platforms! Check your distribution dashboard for links.`,
          read: false,
          action_url: "/MusicStudio"
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      distributions_updated: updated
    });

  } catch (error) {
    console.error('Error updating distributions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});