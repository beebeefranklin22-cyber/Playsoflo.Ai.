import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Authenticate User
    // ============================================
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // STEP 2: Parse Request Data
    // ============================================
    const { cryptoCurrency, cryptoAmount, orderType } = await req.json();

    if (!cryptoCurrency || !cryptoAmount || !orderType) {
      return Response.json({ 
        error: 'Missing required fields: cryptoCurrency, cryptoAmount, orderType' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 3: Fetch Recent Market Data
    // ============================================
    // Get recent P2P orders to understand market conditions
    const recentOrders = await base44.asServiceRole.entities.P2POrder.filter({
      crypto_currency: cryptoCurrency,
      status: { $in: ['active', 'matched', 'completed'] }
    });

    // Sort by most recent and get last 20 orders
    const marketOrders = recentOrders
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 20);

    // ============================================
    // STEP 4: Prepare Market Context for AI
    // ============================================
    const marketContext = marketOrders.map(order => ({
      type: order.order_type,
      crypto_amount: order.crypto_amount,
      price_per_unit: order.price_per_unit,
      total_amount: order.total_amount,
      payment_methods: order.payment_methods,
      created_date: order.created_date
    }));

    // ============================================
    // STEP 5: Call AI for Price Suggestion
    // ============================================
    // Use InvokeLLM with structured JSON output for price analysis
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a cryptocurrency P2P trading expert. Analyze the following market data and provide pricing recommendations.

User wants to ${orderType === 'sell' ? 'SELL' : 'BUY'} ${cryptoAmount} ${cryptoCurrency}.

Recent market orders (last 20):
${JSON.stringify(marketContext, null, 2)}

Based on this data, provide:
1. Recommended price per unit (in USD)
2. Competitive range (min and max prices to stay competitive)
3. Market trend (bullish/bearish/stable)
4. Confidence level (high/medium/low)
5. Brief reasoning for your recommendation

Consider:
- Current market liquidity
- Recent price trends
- Payment method preferences
- Order sizes
- Time of day/week patterns`,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_price: { type: "number", description: "Recommended price per unit in USD" },
          competitive_range: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" }
            }
          },
          market_trend: { 
            type: "string", 
            enum: ["bullish", "bearish", "stable"],
            description: "Overall market trend"
          },
          confidence_level: { 
            type: "string", 
            enum: ["high", "medium", "low"],
            description: "Confidence in recommendation"
          },
          reasoning: { type: "string", description: "Brief explanation" },
          risk_assessment: { type: "string", description: "Potential risks" }
        }
      }
    });

    // ============================================
    // STEP 6: Calculate Total Amount
    // ============================================
    const totalAmount = cryptoAmount * aiResponse.recommended_price;

    // ============================================
    // STEP 7: Return AI Suggestion
    // ============================================
    return Response.json({
      success: true,
      suggestion: {
        ...aiResponse,
        total_amount: totalAmount,
        crypto_currency: cryptoCurrency,
        crypto_amount: cryptoAmount,
        order_type: orderType
      },
      market_data: {
        orders_analyzed: marketOrders.length,
        avg_price: marketOrders.length > 0 
          ? marketOrders.reduce((sum, o) => sum + o.price_per_unit, 0) / marketOrders.length 
          : 0
      }
    });

  } catch (error) {
    console.error('Error getting AI price suggestion:', error);
    return Response.json({ 
      error: error.message || 'Failed to get price suggestion',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});