// Crypto and FX rates from free, keyless public APIs — CoinGecko's simple
// price endpoint and exchangerate-api.com's open endpoint. A server route
// (rather than calling these directly from the browser) sidesteps any CORS
// restrictions and keeps the upstream API choice swappable later.
const COINGECKO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', SOL: 'solana', BNB: 'binancecoin' };

export default async function handler(req, res) {
  const { type } = req.query;

  try {
    if (type === 'crypto') return res.status(200).json({ prices: await fetchCryptoPrices() });
    if (type === 'fx') return res.status(200).json({ rates: await fetchExchangeRates() });
    return res.status(400).json({ error: 'type must be "crypto" or "fx"' });
  } catch (err) {
    console.error('prices error:', err);
    return res.status(502).json({ error: err.message });
  }
}

async function fetchCryptoPrices() {
  const ids = Object.values(COINGECKO_IDS).join(',');
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
  if (!response.ok) throw new Error(`CoinGecko error (${response.status})`);
  const raw = await response.json();

  const prices = {};
  for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
    if (raw[id]) {
      prices[symbol] = { usd: raw[id].usd, usd_24h_change: raw[id].usd_24h_change ?? 0 };
    }
  }
  return prices;
}

async function fetchExchangeRates() {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!response.ok) throw new Error(`Exchange rate API error (${response.status})`);
  const data = await response.json();
  if (data.result !== 'success') throw new Error('Exchange rate API returned an error');
  return data.rates;
}
