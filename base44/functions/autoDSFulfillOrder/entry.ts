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
      return Response.json({ error: 'AUTODS_API_KEY not configured. Please add it in Settings → Environment Variables.' }, { status: 500 });
    }

    const body = await req.json();
    const { order_id, autods_product_id, quantity, shipping_address, variant_id } = body;

    if (!order_id || !autods_product_id || !shipping_address) {
      return Response.json({ error: 'Missing required fields: order_id, autods_product_id, shipping_address' }, { status: 400 });
    }

    // Push order to AutoDS for supplier fulfillment
    const fulfillRes = await fetch(`${AUTODS_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTODS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: autods_product_id,
        variant_id: variant_id || null,
        quantity: quantity || 1,
        shipping_address: {
          full_name: shipping_address.full_name,
          address_line1: shipping_address.address_line1,
          address_line2: shipping_address.address_line2 || "",
          city: shipping_address.city,
          state: shipping_address.state,
          zip: shipping_address.zip,
          country: shipping_address.country || "US",
          phone: shipping_address.phone || ""
        },
        reference_id: order_id
      })
    });

    if (!fulfillRes.ok) {
      const errText = await fulfillRes.text();
      return Response.json({ error: `AutoDS fulfillment error: ${errText}` }, { status: fulfillRes.status });
    }

    const fulfillData = await fulfillRes.json();

    // Update the order in the database with AutoDS order reference
    await base44.asServiceRole.entities.Order.update(order_id, {
      status: 'processing',
      autods_order_id: fulfillData.order_id || fulfillData.id,
      fulfillment_status: 'submitted_to_supplier',
      supplier: 'AutoDS'
    });

    // Notify the customer
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: "Your order is being processed!",
      body: `Great news! Your order #${order_id} has been submitted to our supplier and is being processed. You'll receive tracking information soon.`
    });

    return Response.json({
      success: true,
      autods_order_id: fulfillData.order_id || fulfillData.id,
      status: 'submitted_to_supplier',
      message: 'Order successfully submitted to AutoDS for fulfillment'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});