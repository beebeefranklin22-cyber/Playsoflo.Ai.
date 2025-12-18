import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { campaign_id, event_type } = body;

    if (!campaign_id || !event_type) {
      return Response.json({ error: 'campaign_id and event_type required' }, { status: 400 });
    }

    const campaigns = await base44.asServiceRole.entities.AdCampaign.filter({ id: campaign_id });
    if (campaigns.length === 0) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaigns[0];

    // Update metrics based on event
    let updates = {};
    
    if (event_type === 'impression') {
      updates.impressions = (campaign.impressions || 0) + 1;
      
      // Calculate spend based on CPM
      const costPerImpression = campaign.cpm / 1000;
      updates.spend = (campaign.spend || 0) + costPerImpression;
      
      // Check if budget exceeded
      if (updates.spend >= campaign.budget_amount && campaign.budget_type === 'lifetime') {
        updates.status = 'completed';
      }
    } else if (event_type === 'click') {
      updates.clicks = (campaign.clicks || 0) + 1;
      
      // Calculate CTR
      const totalImpressions = campaign.impressions || 1;
      const totalClicks = (campaign.clicks || 0) + 1;
      updates.ctr = (totalClicks / totalImpressions) * 100;
    } else if (event_type === 'conversion') {
      updates.conversions = (campaign.conversions || 0) + 1;
    }

    await base44.asServiceRole.entities.AdCampaign.update(campaign_id, updates);

    return Response.json({ success: true, updates });

  } catch (error) {
    console.error('Error updating ad metrics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});