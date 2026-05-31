import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { CdpClient } from 'npm:@coinbase/cdp-sdk@1.40.0';

// Flip to "base-mainnet" when ready for real money.
const NETWORK = "base-sepolia";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return existing USDC wallet if the user already has one
    const existing = await base44.entities.CryptoWallet.filter({
      user_email: user.email,
      currency: "USDC"
    });
    if (existing.length > 0 && existing[0].wallet_address) {
      return Response.json({
        address: existing[0].wallet_address,
        network: existing[0].network || NETWORK,
        existing: true
      });
    }

    const cdp = new CdpClient({
      apiKeyId: Deno.env.get("CDP_API_KEY_ID"),
      apiKeySecret: Deno.env.get("CDP_API_KEY_SECRET"),
      walletSecret: Deno.env.get("CDP_WALLET_SECRET"),
    });

    // Create (or get) a named EVM account for this user
    const accountName = `user-${user.id}`;
    const account = await cdp.evm.getOrCreateAccount({ name: accountName });

    let walletId;
    if (existing.length > 0) {
      await base44.entities.CryptoWallet.update(existing[0].id, {
        wallet_address: account.address,
        cdp_account_name: accountName,
        network: NETWORK,
        is_active: true
      });
      walletId = existing[0].id;
    } else {
      const created = await base44.entities.CryptoWallet.create({
        user_email: user.email,
        currency: "USDC",
        balance: 0,
        wallet_address: account.address,
        cdp_account_name: accountName,
        network: NETWORK,
        is_active: true
      });
      walletId = created.id;
    }

    return Response.json({
      address: account.address,
      network: NETWORK,
      wallet_id: walletId,
      existing: false
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});