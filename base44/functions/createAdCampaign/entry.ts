import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      campaign_name, objective, ad_format, media_urls, headline, description,
      call_to_action, destination_url, targeting, budget_type, budget_amount,
      schedule, bid_strategy, placements 
    } = body;

    if (!campaign_name || !objective) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Admins get free ad placement — skip payment entirely
    if (user.role === 'admin') {
      const campaign = await base44.asServiceRole.entities.AdCampaign.create({
        advertiser_email: user.email,
        campaign_name,
        objective,
        status: 'active',
        ad_format,
        placements: placements || ['feed', 'stories'],
        media_urls: media_urls || [],
        headline,
        description,
        call_to_action: call_to_action || 'learn_more',
        destination_url,
        targeting: targeting || {},
        budget_type: budget_type || 'lifetime',
        budget_amount: 0,
        bid_strategy: bid_strategy || 'lowest_cost',
        schedule: schedule || { run_continuously: true },
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0
      });
      return Response.json({ success: true, campaign, admin_free: true });
    }

    // AI calculates pricing and reach
    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert digital advertising analyst. Calculate pricing for this ad campaign:

Campaign Details:
- Objective: ${objective}
- Format: ${ad_format}
- Budget: $${budget_amount} ${budget_type}
- Target Age: ${targeting?.age_min || 18}-${targeting?.age_max || 65}
- Locations: ${targeting?.locations?.join(', ') || 'All'}
- Interests: ${targeting?.interests?.join(', ') || 'General'}

Industry Context:
- Instagram CPM: $5-10
- Instagram CPC: $0.50-$2.00
- Our target: 20-30% cheaper than Instagram

Calculate and return:
1. Estimated daily reach (be realistic based on budget and targeting)
2. Cost per 1000 impressions (CPM) - make it 20-30% cheaper than Instagram
3. Cost per click (CPC)
4. Audience quality score (0-100)
5. Suggested minimum daily budget for this targeting
6. Estimated impressions for the budget
7. Estimated clicks (based on average 2-4% CTR)`,
      response_json_schema: {
        type: "object",
        properties: {
          estimated_daily_reach: { type: "number" },
          cpm: { type: "number" },
          cpc: { type: "number" },
          audience_score: { type: "number" },
          suggested_daily_budget: { type: "number" },
          estimated_impressions: { type: "number" },
          estimated_clicks: { type: "number" },
          pricing_notes: { type: "string" }
        }
      }
    });

    // Create campaign in draft state
    const campaign = await base44.asServiceRole.entities.AdCampaign.create({
      advertiser_email: user.email,
      campaign_name,
      objective,
      status: 'pending_payment',
      ad_format,
      placements: placements || ['feed', 'stories'],
      media_urls: media_urls || [],
      headline,
      description,
      call_to_action: call_to_action || 'learn_more',
      destination_url,
      targeting: targeting || {},
      budget_type,
      budget_amount,
      bid_strategy: bid_strategy || 'lowest_cost',
      schedule: schedule || { run_continuously: true },
      ai_optimized: true,
      ai_audience_score: aiAnalysis.audience_score,
      ai_suggested_budget: aiAnalysis.suggested_daily_budget,
      estimated_reach: aiAnalysis.estimated_daily_reach,
      cpm: aiAnalysis.cpm,
      cpc: aiAnalysis.cpc,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      ctr: 0
    });

    // Calculate total charge (initial budget amount)
    const initialCharge = budget_type === 'daily' 
      ? budget_amount * 7 // Charge for 7 days upfront
      : budget_amount;

    // Create Stripe checkout session for platform account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Ad Campaign: ${campaign_name}`,
            description: `${objective} campaign • ${budget_type} budget $${budget_amount}`,
            images: media_urls && media_urls.length > 0 ? [media_urls[0]] : []
          },
          unit_amount: Math.round(initialCharge * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/AdsManager?payment=success&campaign_id=${campaign.id}`,
      cancel_url: `${req.headers.get('origin')}/AdsManager?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        campaign_id: campaign.id,
        advertiser_email: user.email,
        budget_type,
        daily_budget: budget_amount.toString()
      }
    });

    return Response.json({
      success: true,
      campaign,
      checkout_url: session.url,
      ai_insights: {
        estimated_reach: aiAnalysis.estimated_daily_reach,
        estimated_impressions: aiAnalysis.estimated_impressions,
        estimated_clicks: aiAnalysis.estimated_clicks,
        audience_score: aiAnalysis.audience_score,
        cpm: aiAnalysis.cpm,
        cpc: aiAnalysis.cpc,
        pricing_notes: aiAnalysis.pricing_notes
      }
    });

  } catch (error) {
    console.error('Error creating ad campaign:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});