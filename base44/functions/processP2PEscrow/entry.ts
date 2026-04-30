import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, escrow_id, order_id } = await req.json();

    if (action === 'lock_crypto') {
      // Lock seller's crypto in escrow
      const order = await base44.asServiceRole.entities.P2POrder.filter({ id: order_id });
      if (!order[0]) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      const sellerWallets = await base44.asServiceRole.entities.CryptoWallet.filter({
        user_email: order[0].seller_email,
        currency: order[0].crypto_currency
      });

      if (!sellerWallets[0] || sellerWallets[0].balance < order[0].crypto_amount) {
        return Response.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      // Deduct from seller wallet
      await base44.asServiceRole.entities.CryptoWallet.update(sellerWallets[0].id, {
        balance: sellerWallets[0].balance - order[0].crypto_amount
      });

      // Update escrow
      await base44.asServiceRole.entities.P2PEscrow.update(escrow_id, {
        status: 'crypto_locked',
        crypto_locked_at: new Date().toISOString()
      });

      return Response.json({ success: true, message: 'Crypto locked in escrow' });
    }

    if (action === 'release_escrow') {
      const escrow = await base44.asServiceRole.entities.P2PEscrow.filter({ id: escrow_id });
      if (!escrow[0]) {
        return Response.json({ error: 'Escrow not found' }, { status: 404 });
      }

      // Transfer crypto to buyer
      const buyerWallets = await base44.asServiceRole.entities.CryptoWallet.filter({
        user_email: escrow[0].buyer_email,
        currency: escrow[0].crypto_currency
      });

      if (buyerWallets[0]) {
        await base44.asServiceRole.entities.CryptoWallet.update(buyerWallets[0].id, {
          balance: buyerWallets[0].balance + escrow[0].crypto_amount
        });
      } else {
        await base44.asServiceRole.entities.CryptoWallet.create({
          user_email: escrow[0].buyer_email,
          currency: escrow[0].crypto_currency,
          balance: escrow[0].crypto_amount,
          wallet_address: `${escrow[0].crypto_currency}_${Date.now()}`,
          is_active: true
        });
      }

      // Transfer fiat to seller (minus platform fee)
      const platformFee = escrow[0].fiat_amount * (escrow[0].platform_fee / 100);
      const sellerAmount = escrow[0].fiat_amount - platformFee;

      const seller = await base44.asServiceRole.entities.User.filter({ email: escrow[0].seller_email });
      if (seller[0]) {
        await base44.asServiceRole.entities.User.update(seller[0].id, {
          usd_balance: (seller[0].usd_balance || 0) + sellerAmount
        });
      }

      // Update escrow
      await base44.asServiceRole.entities.P2PEscrow.update(escrow_id, {
        status: 'released',
        released_at: new Date().toISOString()
      });

      // Distribute rewards
      await base44.asServiceRole.functions.invoke('distributeRewards', {
        trigger_type: 'p2p_trade_completed',
        user_email: escrow[0].buyer_email,
        reference_id: escrow_id
      });

      await base44.asServiceRole.functions.invoke('distributeRewards', {
        trigger_type: 'p2p_trade_completed',
        user_email: escrow[0].seller_email,
        reference_id: escrow_id
      });

      return Response.json({ success: true, message: 'Escrow released' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('P2P escrow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});