import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactions } = await req.json();

    if (!transactions || !Array.isArray(transactions)) {
      return Response.json({ error: 'Invalid transactions data' }, { status: 400 });
    }

    // Use AI to categorize transactions
    const prompt = `Analyze these cryptocurrency transactions and categorize each for tax purposes. 
    
Categories:
- capital_gain: Selling crypto for profit
- capital_loss: Selling crypto at a loss
- income: Received as payment, staking rewards, mining
- expense: Used to purchase goods/services
- transfer: Moving between own wallets
- gift: Received as gift or donation
- trade: Exchanging one crypto for another

Transactions:
${JSON.stringify(transactions, null, 2)}

Return JSON array with same order, each with: {original_index, category, confidence, reasoning}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          categorized_transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                original_index: { type: "number" },
                category: { type: "string" },
                confidence: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    const categorized = aiResponse.categorized_transactions || [];

    return Response.json({ 
      success: true, 
      categorized_transactions: categorized 
    });
  } catch (error) {
    console.error('Transaction categorization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});