import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { askClaudeForJson } from '../_lib/anthropic.js';
import { damageAnalysis } from '../_lib/damageAnalysis.js';

// Consolidates several AI-flavored functions the frontend calls
// (translateChatMessage, getAIDisputeResolution, smartTripPlanner,
// analyzeFinancials, generatePersonalizedOffers, analyzeUserPreferences,
// damage-report analysis for reportCarDamage) behind one endpoint, all
// using the Anthropic key that's already configured. Where the action
// makes a factual/numeric claim (financial analysis, personalized offers),
// the real numbers are computed from the user's own data first and only
// the narrative/insight text comes from Claude — never invented figures.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { action } = req.body || {};
  const admin = getSupabaseAdmin();

  try {
    switch (action) {
      case 'translate': return res.status(200).json(await translate(req.body));
      case 'dispute_resolution': return res.status(200).json(await disputeResolution(admin, req.body));
      case 'trip_planner': return res.status(200).json(await tripPlanner(req.body));
      case 'financial_analysis': return res.status(200).json(await financialAnalysis(admin, user, req.body));
      case 'personalized_offers': return res.status(200).json(await personalizedOffers(admin, user));
      case 'user_preferences': return res.status(200).json(await userPreferences(admin, req.body));
      case 'damage_analysis': return res.status(200).json(await damageAnalysis(req.body));
      default: return res.status(400).json({ error: `Unknown action "${action}"` });
    }
  } catch (err) {
    console.error('ai-assist error:', action, err);
    return res.status(200).json({ success: false, error: err.message });
  }
}

async function translate({ message, targetLanguage }) {
  const result = await askClaudeForJson({
    systemPrompt: `Translate the user's message into the language with code "${targetLanguage}". Return {"translation": "...", "detected_language": "..."}.`,
    prompt: message,
  });
  return { success: true, translation: result.translation, detected_language: result.detected_language };
}

async function disputeResolution(admin, { orderId, disputeReason, userRole }) {
  const { data: order } = await admin.from('p2p_orders').select('*').eq('id', orderId).single();
  const result = await askClaudeForJson({
    systemPrompt:
      'You are a neutral P2P marketplace dispute mediator. Given the order details and dispute reason, analyze the situation and suggest a fair resolution. Return {"summary": "...", "recommendation": "...", "suggested_action": "release_to_buyer" | "return_to_seller" | "manual_review", "confidence": "low"|"medium"|"high"}.',
    prompt: JSON.stringify({ order, disputeReason, requestedBy: userRole }),
  });
  return { success: true, analysis: result };
}

async function tripPlanner({ query, user_location, check_in_date, check_out_date }) {
  const schema = {
    destination: 'string',
    dates: { arrival: 'ISO date', departure: 'ISO date', duration_days: 'number' },
    recommendations: {
      flight: { airline: 'string', departure: 'string', arrival: 'string', duration: 'string', price: 'number' },
      hotel: { name: 'string', category: 'string', price_per_night: 'number', total_price: 'number', rating: 'number', amenities: ['string'] },
      car_rental: { company: 'string', model: 'string', price_per_day: 'number', total_price: 'number' },
      restaurants: [{ name: 'string', cuisine: 'string', rating: 'number', price_level: '$ to $$$$', avg_cost: 'number' }],
      experiences: [{ name: 'string', price: 'number', rating: 'number', duration_hours: 'number', group_size: 'number' }],
      local_events: [{ name: 'string', type: 'string' }],
    },
    estimated_budget: { flights: 'number', hotel: 'number', car_rental: 'number', activities_and_food: 'number' },
  };
  const itinerary = await askClaudeForJson({
    systemPrompt:
      `You are a travel planning assistant. Build a plausible, realistically-priced illustrative trip itinerary (this is a suggestion to inspire the user, not a real booking) matching this exact JSON shape: ${JSON.stringify(schema)}. Traveler is located in ${user_location}. Trip dates: ${check_in_date} to ${check_out_date}.`,
    prompt: query,
  });
  return { itinerary };
}

async function financialAnalysis(admin, user, { analysis_type, time_period }) {
  const days = Number(time_period) || 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: transactions } = await admin
    .from('wallet_transactions')
    .select('*')
    .or(`user_email.eq.${user.email},counterparty_email.eq.${user.email}`)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const rows = transactions || [];
  const totalIn = rows.filter((t) => t.user_email === user.email && t.direction === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = rows.filter((t) => t.user_email === user.email && t.direction === 'debit').reduce((s, t) => s + Number(t.amount), 0);
  const byType = {};
  rows.forEach((t) => { byType[t.reference_type || 'other'] = (byType[t.reference_type || 'other'] || 0) + Number(t.amount); });

  const insight = await askClaudeForJson({
    systemPrompt:
      'You are a personal finance assistant. Given these REAL computed totals (do not invent different numbers, only comment on them), write 2-4 short, specific insight sentences and one actionable tip. Return {"insights": ["...", ...], "tip": "..."}.',
    prompt: JSON.stringify({ analysis_type, days, totalIn, totalOut, net: totalIn - totalOut, byType }),
  }).catch(() => ({ insights: [], tip: '' }));

  return { total_in: totalIn, total_out: totalOut, net: totalIn - totalOut, by_category: byType, transaction_count: rows.length, ...insight };
}

async function personalizedOffers(admin, user) {
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
  const { data: recentOrders } = await admin
    .from('orders')
    .select('item_title, provider_email')
    .eq('customer_email', user.email)
    .order('created_at', { ascending: false })
    .limit(10);

  const result = await askClaudeForJson({
    systemPrompt:
      'You generate short promotional offer blurbs for a lifestyle marketplace app based on a user\'s recent order history. Return {"offers": [{"title": "...", "description": "...", "category": "..."}]} with at most 3 offers. If there is no order history, suggest generally popular categories instead.',
    prompt: JSON.stringify({ interests: profile?.interests || [], recentOrders: recentOrders || [] }),
  }).catch(() => ({ offers: [] }));

  return { offers: result.offers || [] };
}

async function userPreferences(admin, { userEmail, userInterests }) {
  const { data: recentPosts } = await admin
    .from('user_interactions')
    .select('interaction_type, target_id')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(30);

  const result = await askClaudeForJson({
    systemPrompt:
      'Infer content preferences from a user\'s stated interests and recent interaction types (for a feed personalization engine). Return {"preferences": {"top_categories": ["..."], "content_types": ["..."]}}.',
    prompt: JSON.stringify({ userInterests, recentInteractions: recentPosts || [] }),
  }).catch(() => ({ preferences: { top_categories: userInterests || [], content_types: [] } }));

  return { preferences: result.preferences };
}
