import { getCryptoPrices } from './getCryptoPrices';

// Grounded in the real current market price (not an LLM guess, which
// can't reliably know today's price) plus a typical P2P margin: sellers
// price slightly above market, buyers' asks sit slightly below.
const MARGIN = 0.02;

export async function getAIPriceSuggestion({ cryptoCurrency, cryptoAmount, orderType } = {}) {
  const { data } = await getCryptoPrices();
  const marketPrice = data?.prices?.[cryptoCurrency]?.usd;
  if (!marketPrice) {
    return { data: { success: false, error: `No market price available for ${cryptoCurrency}` } };
  }

  const multiplier = orderType === 'sell' ? 1 + MARGIN : 1 - MARGIN;
  const recommended_price = Math.round(marketPrice * multiplier * 100) / 100;

  return {
    data: {
      success: true,
      suggestion: {
        recommended_price,
        market_price: marketPrice,
        margin_percent: orderType === 'sell' ? MARGIN * 100 : -MARGIN * 100,
        total_value: Math.round(recommended_price * (cryptoAmount || 0) * 100) / 100,
      },
    },
  };
}
