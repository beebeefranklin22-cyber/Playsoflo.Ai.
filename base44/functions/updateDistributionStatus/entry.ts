import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Starting distribution status update...');

    const distributions = await base44.asServiceRole.entities.MusicDistribution.list();

    let submittedCount = 0;
    let liveCount = 0;
    let errorCount = 0;

    const now = new Date();

    for (const dist of distributions) {
      try {
        // Check if should be submitted (48 hours after processing)
        if (dist.status === 'processing' && dist.submission_date) {
          const submissionTime = new Date(dist.submission_date);
          const hoursSinceSubmission = (now - submissionTime) / (1000 * 60 * 60);

          if (hoursSinceSubmission >= 48) {
            await base44.asServiceRole.entities.MusicDistribution.update(dist.id, {
              status: 'submitted'
            });
            submittedCount++;

            console.log(`Distribution ${dist.id} marked as submitted`);

            // Notify artist
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: dist.artist_email,
              type: "system_alert",
              title: "🎵 Music Submitted to Platforms",
              message: `Your track has been submitted to ${dist.platforms?.length || 0} streaming platforms. Release date: ${new Date(dist.release_date).toLocaleDateString()}`,
              read: false,
              action_url: "/MusicStudio"
            });
          }
        }

        // Check if should be live (release date reached)
        if ((dist.status === 'submitted' || dist.status === 'processing') && dist.release_date) {
          const releaseTime = new Date(dist.release_date);
          
          if (now >= releaseTime) {
            // Generate realistic platform links
            const trackId = dist.isrc_code?.replace(/[^a-zA-Z0-9]/g, '') || dist.track_id;
            const platformLinks = {};
            
            if (dist.platforms?.includes('spotify')) {
              platformLinks.spotify = `https://open.spotify.com/track/${trackId}`;
            }
            if (dist.platforms?.includes('apple_music')) {
              platformLinks.apple_music = `https://music.apple.com/us/album/${trackId}`;
            }
            if (dist.platforms?.includes('youtube_music')) {
              platformLinks.youtube_music = `https://music.youtube.com/watch?v=${trackId}`;
            }
            if (dist.platforms?.includes('amazon_music')) {
              platformLinks.amazon_music = `https://music.amazon.com/albums/${trackId}`;
            }
            if (dist.platforms?.includes('tidal')) {
              platformLinks.tidal = `https://tidal.com/browse/track/${trackId}`;
            }
            if (dist.platforms?.includes('deezer')) {
              platformLinks.deezer = `https://www.deezer.com/track/${trackId}`;
            }

            await base44.asServiceRole.entities.MusicDistribution.update(dist.id, {
              status: 'live',
              live_date: now.toISOString(),
              platform_links: platformLinks
            });
            liveCount++;

            console.log(`Distribution ${dist.id} marked as live with platform links`);

            // Notify artist
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: dist.artist_email,
              type: "system_alert",
              title: "🚀 Your Music is Now Live!",
              message: `Your music is now streaming on ${dist.platforms?.length || 0} platforms! Check your Music Studio for links.`,
              read: false,
              action_url: "/MusicStudio"
            });
          }
        }
      } catch (error) {
        console.error(`Error processing distribution ${dist.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Status update complete: ${submittedCount} submitted, ${liveCount} live, ${errorCount} errors`);

    return Response.json({
      success: true,
      total_processed: distributions.length,
      submitted: submittedCount,
      live: liveCount,
      errors: errorCount,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error updating distributions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});