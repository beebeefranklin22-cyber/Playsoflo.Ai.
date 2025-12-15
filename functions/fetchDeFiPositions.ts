import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletAddress, protocols } = await req.json();

    // Simulate DeFi position fetching (in production, integrate with actual DeFi APIs)
    // This would normally call DeBank API, Zapper API, or protocol-specific APIs

    const mockPositions = [
      {
        protocol: 'uniswap',
        position_type: 'liquidity_pool',
        pool_name: 'ETH/USDC',
        tokens: [
          { symbol: 'ETH', amount: 0.5, value_usd: 1200 },
          { symbol: 'USDC', amount: 1200, value_usd: 1200 }
        ],
        total_value_usd: 2400,
        initial_investment_usd: 2000,
        current_apy: 15.5,
        rewards_earned: 45.50,
        impermanent_loss: -25.00,
        entry_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        protocol: 'aave',
        position_type: 'lending',
        pool_name: 'USDC Lending',
        tokens: [
          { symbol: 'USDC', amount: 5000, value_usd: 5000 }
        ],
        total_value_usd: 5000,
        initial_investment_usd: 5000,
        current_apy: 4.2,
        rewards_earned: 12.30,
        impermanent_loss: 0,
        entry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      }
    ];

    // Save or update positions in database
    for (const position of mockPositions) {
      const existing = await base44.asServiceRole.entities.DeFiPosition.filter({
        user_email: user.email,
        protocol: position.protocol,
        pool_name: position.pool_name,
        status: 'active'
      });

      const positionData = {
        user_email: user.email,
        ...position,
        last_apy_update: new Date().toISOString(),
        apy_history: [{
          date: new Date().toISOString(),
          apy: position.current_apy
        }]
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.DeFiPosition.update(existing[0].id, positionData);
      } else {
        await base44.asServiceRole.entities.DeFiPosition.create(positionData);
      }
    }

    return Response.json({ 
      success: true, 
      positions: mockPositions 
    });
  } catch (error) {
    console.error('DeFi positions fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});