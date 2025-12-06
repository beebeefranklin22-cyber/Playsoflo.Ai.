import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, amount, destination } = await req.json();

    // Get or create Stripe account for user
    if (!user.stripe_account_id) {
      return Response.json({ 
        error: 'No Stripe account connected. Please complete provider onboarding first.' 
      }, { status: 400 });
    }

    const accountId = user.stripe_account_id;

    switch (action) {
      case 'get_balance': {
        const balance = await stripe.balance.retrieve({
          stripeAccount: accountId
        });
        
        return Response.json({
          available: balance.available.map(b => ({
            amount: b.amount / 100,
            currency: b.currency
          })),
          pending: balance.pending.map(b => ({
            amount: b.amount / 100,
            currency: b.currency
          }))
        });
      }

      case 'list_payouts': {
        const payouts = await stripe.payouts.list(
          { limit: 50 },
          { stripeAccount: accountId }
        );
        
        return Response.json({
          payouts: payouts.data.map(p => ({
            id: p.id,
            amount: p.amount / 100,
            currency: p.currency,
            status: p.status,
            arrival_date: p.arrival_date,
            created: p.created,
            method: p.method,
            type: p.type,
            description: p.description
          }))
        });
      }

      case 'get_payout_details': {
        const { payout_id } = await req.json();
        const payout = await stripe.payouts.retrieve(
          payout_id,
          { stripeAccount: accountId }
        );

        // Get transactions for this payout
        const transactions = await stripe.balanceTransactions.list(
          { payout: payout_id, limit: 100 },
          { stripeAccount: accountId }
        );

        return Response.json({
          payout: {
            id: payout.id,
            amount: payout.amount / 100,
            currency: payout.currency,
            status: payout.status,
            arrival_date: payout.arrival_date,
            created: payout.created,
            method: payout.method,
            description: payout.description
          },
          transactions: transactions.data.map(t => ({
            id: t.id,
            amount: t.amount / 100,
            currency: t.currency,
            created: t.created,
            description: t.description,
            fee: t.fee / 100,
            net: t.net / 100,
            type: t.type,
            status: t.status
          }))
        });
      }

      case 'create_payout': {
        if (!amount || amount <= 0) {
          return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const balance = await stripe.balance.retrieve({
          stripeAccount: accountId
        });

        const availableAmount = balance.available[0]?.amount || 0;
        if (amount * 100 > availableAmount) {
          return Response.json({ 
            error: 'Insufficient balance',
            available: availableAmount / 100
          }, { status: 400 });
        }

        const payout = await stripe.payouts.create(
          {
            amount: Math.round(amount * 100),
            currency: 'usd',
            description: 'Manual payout',
            method: 'standard'
          },
          { stripeAccount: accountId }
        );

        // Create notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'payout_initiated',
          title: '💰 Payout Initiated',
          message: `Your payout of $${amount.toFixed(2)} is on the way!`,
          reference_type: 'payout',
          reference_id: payout.id
        });

        return Response.json({
          success: true,
          payout: {
            id: payout.id,
            amount: payout.amount / 100,
            arrival_date: payout.arrival_date
          }
        });
      }

      case 'update_payout_schedule': {
        const { interval, delay_days } = await req.json();
        
        const account = await stripe.accounts.update(
          accountId,
          {
            settings: {
              payouts: {
                schedule: {
                  interval: interval || 'daily',
                  delay_days: delay_days || 2
                }
              }
            }
          }
        );

        return Response.json({
          success: true,
          schedule: account.settings.payouts.schedule
        });
      }

      case 'get_payout_schedule': {
        const account = await stripe.accounts.retrieve(accountId);
        
        return Response.json({
          schedule: account.settings?.payouts?.schedule || {
            interval: 'daily',
            delay_days: 2
          }
        });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});