import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id, memo, amount, reference_type } = await req.json();

    // Use AI to intelligently categorize the transaction
    const prompt = `Categorize this financial transaction into the most appropriate category:

Transaction Details:
- Type: ${reference_type}
- Amount: $${amount}
- Description: ${memo || 'No description'}

Available categories:
- Food & Dining (restaurants, groceries, food delivery)
- Transportation (rides, gas, parking, car rentals)
- Entertainment (movies, games, music, events)
- Shopping (retail, online purchases, general shopping)
- Bills & Utilities (recurring bills, utilities, subscriptions)
- Healthcare (medical, wellness, pharmacy)
- Travel (hotels, flights, vacation expenses)
- Services (professional services, home services, personal care)
- Transfer (peer-to-peer transfers, wallet top-ups)
- Investment (crypto, savings, deposits)
- Income (earnings, payments received, refunds)
- Other (miscellaneous expenses)

Consider the transaction type and description to make the best categorization.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: { type: "string" },
          subcategory: { type: "string" },
          confidence: { type: "number" },
          emoji: { type: "string" },
          color: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      transaction_id,
      category: result.category,
      subcategory: result.subcategory,
      confidence: result.confidence,
      emoji: result.emoji,
      color: result.color
    });

  } catch (error) {
    console.error('Transaction categorization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});