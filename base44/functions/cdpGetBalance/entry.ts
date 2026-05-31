import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { CdpClient } from 'npm:@coinbase/cdp-sdk@1.40.0';

const NETWORK = "base-sepolia";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallets = await base44.entities.CryptoWallet.filter({
      user_email: user.email,
      currency: "USDC"
    });
    if (wallets.length === 0 || !wallets[0].cdp_account_name) {
      return Response.json({ error: 'No wallet found. Create one first.' }, { status: 404 });
    }
    const wallet = wallets[0];

    const cdp = new CdpClient({
      apiKeyId: Deno.env.get("CDP_API_KEY_ID"),
      apiKeySecret: Deno.env.get("CDP_API_KEY_SECRET"),
      walletSecret: Deno.env.get("CDP_WALLET_SECRET"),
    });

    const account = await cdp.evm.getOrCreateAccount({ name: wallet.cdp_account_name });
    const result = await account.listTokenBalances({ network: wallet.network || NETWORK });

    // Find USDC balance
    let usdc = 0;
    for (const tb of (result.balances || [])) {
      const sym = tb.token?.symbol?.toUpperCase();
      if (sym === "USDC") {
        const decimals = Number(tb.token?.decimals ?? 6);
        usdc = Number(tb.amount?.amount ?? 0) / Math.pow(10, decimals);
      }
    }

    // Keep stored balance in sync
    await base44.entities.CryptoWallet.update(wallet.id, { balance: usdc });

    return Response.json({
      address: wallet.wallet_address,
      network: wallet.network || NETWORK,
      usdc_balance: usdc
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});