import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reset balances
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    
    let resetCount = 0;
    for (const u of users) {
      if (u.usd_balance > 0 || u.soflo_coins > 0) {
        await base44.asServiceRole.entities.User.update(u.id, {
          usd_balance: 0,
          soflo_coins: 0
        });
        resetCount++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Reset ${resetCount} user balances to zero`,
      resetCount
    });

  } catch (error) {
    console.error('Error resetting balances:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});