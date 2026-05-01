import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AUTODS_API_KEY = Deno.env.get("AUTODS_API_KEY");
const AUTODS_BASE_URL = "https://api.autods.com/v2";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!AUTODS_API_KEY) {
      return Response.json({ error: 'AUTODS_API_KEY not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const { autods_order_id } = body;

    if (!autods_order_id) {
      return Response.json({ error: 'autods_order_id is required' }, { status: 400 });
    }

    const trackRes = await fetch(`${AUTODS_BASE_URL}/orders/${autods_order_id}`, {
      headers: {
        'Authorization': `Bearer ${AUTODS_API_KEY}`
      }
    });

    if (!trackRes.ok) {
      const errText = await trackRes.text();
      return Response.json({ error: `AutoDS tracking error: ${errText}` }, { status: trackRes.status });
    }

    const trackData = await trackRes.json();

    return Response.json({
      success: true,
      autods_order_id,
      status: trackData.status,
      tracking_number: trackData.tracking_number || null,
      tracking_url: trackData.tracking_url || null,
      carrier: trackData.carrier || null,
      estimated_delivery: trackData.estimated_delivery || null,
      supplier_order_id: trackData.supplier_order_id || null
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});