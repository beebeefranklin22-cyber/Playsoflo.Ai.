import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch exchange rates from free API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();

    const rates = {
      USD: 1,
      EUR: data.rates.EUR || 0.92,
      GBP: data.rates.GBP || 0.79,
      JPY: data.rates.JPY || 149.50,
      CAD: data.rates.CAD || 1.36,
      AUD: data.rates.AUD || 1.53,
      CHF: data.rates.CHF || 0.88,
      CNY: data.rates.CNY || 7.24,
      INR: data.rates.INR || 83.25,
      BRL: data.rates.BRL || 4.97,
      last_updated: new Date().toISOString()
    };

    return Response.json({ success: true, rates });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    // Return fallback rates
    return Response.json({ 
      success: true, 
      rates: {
        USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.50,
        CAD: 1.36, AUD: 1.53, CHF: 0.88, CNY: 7.24,
        INR: 83.25, BRL: 4.97,
        last_updated: new Date().toISOString()
      }
    });
  }
});