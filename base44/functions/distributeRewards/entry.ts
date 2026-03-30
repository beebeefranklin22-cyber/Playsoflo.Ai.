import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trigger_type, reference_id, user_email } = await req.json();

    let rewardAmount = 0;
    let rewardCurrency = 'SoFloCoin';
    let actionDescription = '';

    // Calculate rewards based on trigger
    switch (trigger_type) {
      case 'referral':
        rewardAmount = 10;
        actionDescription = 'Referred a new user';
        break;
      
      case 'first_defi':
        rewardAmount = 5;
        actionDescription = 'First DeFi participation';
        break;
      
      case 'staking_milestone':
        rewardAmount = 2;
        actionDescription = 'Staking milestone reached';
        break;
      
      case 'trading_volume':
        rewardAmount = 0.5;
        actionDescription = 'Trading volume bonus';
        break;
      
      case 'p2p_trade_completed':
        rewardAmount = 1;
        actionDescription = 'P2P trade completed';
        break;

      case 'asset_holding':
        rewardAmount = 0.1;
        actionDescription = 'Weekly holding reward';
        break;

      default:
        return Response.json({ error: 'Invalid trigger type' }, { status: 400 });
    }

    // Create reward
    const reward = await base44.asServiceRole.entities.CryptoReward.create({
      user_email: user_email || user.email,
      reward_type: trigger_type,
      action_description: actionDescription,
      reward_currency: rewardCurrency,
      reward_amount: rewardAmount,
      reward_value_usd: rewardAmount * 2.45, // SFC price
      status: 'pending',
      reference_id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });

    // Send notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user_email || user.email,
      type: 'payment_received',
      title: '🎁 New Crypto Reward!',
      message: `You earned ${rewardAmount} ${rewardCurrency} for ${actionDescription}`,
      read: false,
      action_url: '/Wallet'
    });

    return Response.json({ success: true, reward });
  } catch (error) {
    console.error('Reward distribution error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});