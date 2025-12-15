import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function runs periodically via cron or manual trigger
    // Fetch all active DeFi positions
    const positions = await base44.asServiceRole.entities.DeFiPosition.filter({
      status: 'active'
    });

    const alerts = [];

    for (const position of positions) {
      // Simulate APY update (in production, fetch from protocol APIs)
      const previousAPY = position.current_apy;
      const newAPY = previousAPY + (Math.random() - 0.5) * 10; // Random change for simulation

      const apyChange = Math.abs(newAPY - previousAPY);
      const changePercentage = (apyChange / previousAPY) * 100;

      // Check if change exceeds threshold
      if (changePercentage >= (position.alert_threshold || 5)) {
        alerts.push({
          user_email: position.user_email,
          position_id: position.id,
          protocol: position.protocol,
          pool_name: position.pool_name,
          old_apy: previousAPY,
          new_apy: newAPY,
          change_percentage: changePercentage
        });

        // Send notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: position.user_email,
          type: 'defi_alert',
          title: `DeFi APY Alert: ${position.protocol}`,
          message: `APY for ${position.pool_name} changed from ${previousAPY.toFixed(2)}% to ${newAPY.toFixed(2)}% (${changePercentage.toFixed(1)}% change)`,
          read: false,
          action_url: '/Wallet'
        });
      }

      // Update position with new APY
      const updatedHistory = [
        ...(position.apy_history || []),
        { date: new Date().toISOString(), apy: newAPY }
      ].slice(-30); // Keep last 30 records

      await base44.asServiceRole.entities.DeFiPosition.update(position.id, {
        current_apy: newAPY,
        last_apy_update: new Date().toISOString(),
        apy_history: updatedHistory
      });
    }

    return Response.json({ 
      success: true, 
      positions_updated: positions.length,
      alerts_sent: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('DeFi APY tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});