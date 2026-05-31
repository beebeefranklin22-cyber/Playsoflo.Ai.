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

    const { to_address, amount } = await req.json();

    if (!to_address || !/^0x[a-fA-F0-9]{40}$/.test(to_address)) {
      return Response.json({ error: 'Invalid recipient address' }, { status: 400 });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const wallets = await base44.entities.CryptoWallet.filter({
      user_email: user.email,
      currency: "USDC"
    });
    if (wallets.length === 0 || !wallets[0].cdp_account_name) {
      return Response.json({ error: 'No wallet found. Create one first.' }, { status: 404 });
    }
    const wallet = wallets[0];
    const network = wallet.network || NETWORK;

    const cdp = new CdpClient({
      apiKeyId: Deno.env.get("CDP_API_KEY_ID"),
      apiKeySecret: Deno.env.get("CDP_API_KEY_SECRET"),
      walletSecret: Deno.env.get("CDP_WALLET_SECRET"),
    });

    const account = await cdp.evm.getOrCreateAccount({ name: wallet.cdp_account_name });

    // Check on-chain USDC balance before sending
    const balResult = await account.listTokenBalances({ network });
    let usdc = 0;
    for (const tb of (balResult.balances || [])) {
      if (tb.token?.symbol?.toUpperCase() === "USDC") {
        const decimals = Number(tb.token?.decimals ?? 6);
        usdc = Number(tb.amount?.amount ?? 0) / Math.pow(10, decimals);
      }
    }
    if (usdc < amt) {
      return Response.json({ error: `Insufficient funds. Balance: ${usdc} USDC` }, { status: 400 });
    }

    // Send USDC (amount in base units, 6 decimals)
    const amountBaseUnits = BigInt(Math.round(amt * 1e6));
    const result = await account.transfer({
      to: to_address,
      amount: amountBaseUnits,
      token: "usdc",
      network
    });

    const txHash = result.transactionHash || result.transaction_hash || result;

    // Log the transaction
    await base44.entities.CryptoTransaction.create({
      user_email: user.email,
      transaction_type: "send",
      from_currency: "USDC",
      to_currency: "USDC",
      from_amount: amt,
      status: "completed",
      recipient_address: to_address,
      blockchain_tx_hash: typeof txHash === "string" ? txHash : JSON.stringify(txHash)
    }).catch(() => {});

    return Response.json({
      success: true,
      tx_hash: txHash,
      network,
      new_balance: usdc - amt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});