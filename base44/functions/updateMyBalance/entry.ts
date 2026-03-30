import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { soflo_coins, usd_balance } = await req.json();

    const updateData = {};
    if (soflo_coins !== undefined) updateData.soflo_coins = soflo_coins;
    if (usd_balance !== undefined) updateData.usd_balance = usd_balance;

    await base44.auth.updateMe(updateData);

    return Response.json({ 
      success: true, 
      message: 'Balance updated',
      updated: updateData
    });

  } catch (error) {
    console.error('Balance update error:', error);
    return Response.json({ 
      error: error.message || 'Failed to update balance'
    }, { status: 500 });
  }
});