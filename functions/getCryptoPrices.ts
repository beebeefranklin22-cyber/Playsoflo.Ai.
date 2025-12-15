import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CoinGecko API (free, no key needed)
    const coins = 'bitcoin,ethereum,tether,usd-coin,solana';
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }

    const data = await response.json();

    // Transform to our format
    const prices = {
      BTC: {
        usd: data.bitcoin.usd,
        change_24h: data.bitcoin.usd_24h_change
      },
      ETH: {
        usd: data.ethereum.usd,
        change_24h: data.ethereum.usd_24h_change
      },
      USDT: {
        usd: data.tether.usd,
        change_24h: data.tether.usd_24h_change
      },
      USDC: {
        usd: data['usd-coin'].usd,
        change_24h: data['usd-coin'].usd_24h_change
      },
      SOL: {
        usd: data.solana.usd,
        change_24h: data.solana.usd_24h_change
      },
      SoFloCoin: {
        usd: 2.45,
        change_24h: 0
      }
    };

    return Response.json({ prices });

  } catch (error) {
    console.error('Crypto prices error:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch prices' 
    }, { status: 500 });
  }
});