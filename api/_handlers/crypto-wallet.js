import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import crypto from 'crypto';

// Testnet only, deliberately -- Base Sepolia ETH/USDC have no real
// monetary value, which is what makes it safe to hand every signed-in
// user a real on-chain custodial account with no KYC/compliance work.
// Never point this at "base" (mainnet) without a full security review.
const NETWORK = 'base-sepolia';
const USDC_DECIMALS = 6;
// Coinbase's own faucet already rate-limits per address; this is a second,
// looser guard so one buggy client retry-loop can't burn through the
// shared project faucet quota that every user's wallet draws from.
const FAUCET_COOLDOWN_MS = 60 * 1000;

let cdpClient = null;
function getCdp() {
  if (cdpClient) return cdpClient;
  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
    const err = new Error('Crypto wallet is not configured on this server yet');
    err.statusCode = 503;
    throw err;
  }
  cdpClient = new CdpClient();
  return cdpClient;
}

// CDP account names must start with a letter and be alphanumeric. Deriving
// one deterministically from the user's Supabase id means the same user
// always resolves to the same on-chain account via getOrCreateAccount --
// Coinbase is the source of truth for "does this wallet exist", the
// cdp_wallets row we keep is only a display cache, never authoritative.
function accountNameFor(userId) {
  const hash = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 30);
  return `w${hash}`;
}

function isValidAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// Converts a decimal amount (e.g. 1.5) to a bigint in the token's base
// units (e.g. 1500000n at 6 decimals) via string manipulation -- avoids
// the float rounding error that amount * 10**decimals can introduce.
function toBaseUnits(amount, decimals) {
  const [whole, frac = ''] = String(amount).split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole + fracPadded);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const admin = getSupabaseAdmin();
  const { action } = req.body || {};

  try {
    const cdp = getCdp();
    if (action === 'create') return res.status(200).json(await handleCreate(cdp, admin, user));
    if (action === 'balance') return res.status(200).json(await handleBalance(cdp, user));
    if (action === 'send') return res.status(200).json(await handleSend(cdp, user, req.body));
    if (action === 'faucet') return res.status(200).json(await handleFaucet(cdp, admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('crypto-wallet action error:', action, err);
    // Matches this API's convention for money-adjacent endpoints (see
    // wallet.js and car-damage.js): a recoverable/business-level failure
    // comes back as 200 + {error} rather than a thrown HTTP error, since
    // the client's inline-error UI reads response.data.error instead of
    // catching an exception for expected cases like "wallet not found" or
    // "insufficient balance".
    return res.status(200).json({ error: err.message || 'Crypto wallet request failed' });
  }
}

async function handleCreate(cdp, admin, user) {
  const account = await cdp.evm.getOrCreateAccount({ name: accountNameFor(user.id) });

  const { error } = await admin.from('cdp_wallets').upsert(
    { user_id: user.id, user_email: user.email, address: account.address, network: NETWORK },
    { onConflict: 'user_id' }
  );
  if (error) throw error;

  return { address: account.address };
}

async function handleBalance(cdp, user) {
  let account;
  try {
    account = await cdp.evm.getAccount({ name: accountNameFor(user.id) });
  } catch {
    return { error: 'No wallet found yet — create one to get started.' };
  }

  const { balances } = await account.listTokenBalances({ network: NETWORK });
  const usdc = balances.find(b => b.token.symbol === 'USDC');
  const eth = balances.find(b => b.token.symbol === 'ETH');
  const toDecimal = (bal) => (bal ? Number(bal.amount.amount) / 10 ** bal.amount.decimals : 0);

  return {
    address: account.address,
    usdc_balance: toDecimal(usdc),
    eth_balance: toDecimal(eth),
    network: NETWORK,
  };
}

async function handleSend(cdp, user, body) {
  const to = body.to_address?.trim();
  const amount = Number(body.amount);
  if (!isValidAddress(to)) throw new Error('Enter a valid recipient address (0x followed by 40 hex characters)');
  if (!amount || amount <= 0 || !Number.isFinite(amount)) throw new Error('Amount must be a positive number');
  // Testnet balances are faucet-funded and meant to be small; capping the
  // send has no real financial purpose here, it just keeps a typo (an
  // extra zero) from being confusing to debug later.
  if (amount > 1000) throw new Error('Amount exceeds the testnet send limit (1000 USDC)');

  let account;
  try {
    account = await cdp.evm.getAccount({ name: accountNameFor(user.id) });
  } catch {
    throw new Error('No wallet found yet — create one to get started.');
  }

  const { transactionHash } = await account.transfer({
    to,
    amount: toBaseUnits(amount, USDC_DECIMALS),
    token: 'usdc',
    network: NETWORK,
  });

  return { tx_hash: transactionHash };
}

// Testnet ETH/USDC have no real value, so this can be self-serve for any
// signed-in user -- the cooldown exists purely to protect the shared
// project faucet quota from a buggy client, not as a security boundary.
async function handleFaucet(cdp, admin, user, body) {
  const token = body.token === 'eth' ? 'eth' : 'usdc';

  const { data: existing } = await admin
    .from('cdp_wallets')
    .select('last_faucet_at')
    .eq('user_id', user.id)
    .single();
  if (existing?.last_faucet_at && Date.now() - new Date(existing.last_faucet_at).getTime() < FAUCET_COOLDOWN_MS) {
    throw new Error('Please wait a moment before requesting more testnet funds.');
  }

  const account = await cdp.evm.getOrCreateAccount({ name: accountNameFor(user.id) });
  const { transactionHash } = await cdp.evm.requestFaucet({ address: account.address, network: NETWORK, token });

  // Upsert, not update -- handleFaucet can be the very first call for a
  // user (the button only shows once a wallet exists in the UI, but
  // nothing stops a direct API call), and an update against a row that
  // doesn't exist yet silently affects zero rows, which would make the
  // cooldown never actually persist.
  await admin.from('cdp_wallets').upsert(
    { user_id: user.id, user_email: user.email, address: account.address, network: NETWORK, last_faucet_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  return { tx_hash: transactionHash, token };
}
