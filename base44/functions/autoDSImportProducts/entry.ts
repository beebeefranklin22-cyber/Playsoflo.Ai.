import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AUTODS_API_KEY = Deno.env.get("AUTODS_API_KEY");
const AUTODS_BASE_URL = "https://api.autods.com/v2";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!AUTODS_API_KEY) {
      return Response.json({ error: 'AUTODS_API_KEY not configured. Please add it in Settings → Environment Variables.' }, { status: 500 });
    }

    const body = await req.json();
    const { query = "", category = "", limit = 20, page = 1 } = body;

    // Search AutoDS marketplace for products
    const searchRes = await fetch(`${AUTODS_BASE_URL}/products/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTODS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        category,
        limit,
        page,
        country: "US"
      })
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return Response.json({ error: `AutoDS API error: ${errText}` }, { status: searchRes.status });
    }

    const data = await searchRes.json();
    const products = data.products || data.items || data.data || [];

    return Response.json({
      success: true,
      products: products.map(p => ({
        autods_id: p.id || p.product_id,
        title: p.title || p.name,
        description: p.description || "",
        image_url: p.image || p.main_image || p.images?.[0] || "",
        images: p.images || [],
        supplier_price: p.price || p.cost_price || 0,
        suggested_retail_price: Math.round((p.price || 0) * 2.5 * 100) / 100, // 150% markup
        category: p.category || category,
        supplier: p.supplier || p.source || "AutoDS",
        shipping_time: p.shipping_time || "7-14 days",
        stock: p.stock || p.quantity || 999,
        rating: p.rating || 0,
        reviews_count: p.reviews_count || 0,
        sku: p.sku || p.id
      })),
      total: data.total || products.length,
      page,
      limit
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});