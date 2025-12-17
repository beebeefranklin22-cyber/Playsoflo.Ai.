import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { time_period = '90' } = await req.json();

    // Fetch user's recent transactions
    const payments = await base44.entities.Payment.filter({
      created_by: user.email
    });

    // Sort by date and limit to recent transactions
    const recentTransactions = payments
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, parseInt(time_period));

    // Batch categorize using AI
    const transactionSummary = recentTransactions.map(t => ({
      id: t.id,
      type: t.reference_type,
      amount: t.amount_usd,
      memo: t.memo || 'No description',
      date: t.created_date
    }));

    const prompt = `Analyze and categorize these financial transactions. For each transaction, provide a category, subcategory, emoji, and color theme.

Transactions:
${JSON.stringify(transactionSummary, null, 2)}

Categories available: Food & Dining, Transportation, Entertainment, Shopping, Bills & Utilities, Healthcare, Travel, Services, Transfer, Investment, Income, Other

For each transaction, determine:
1. Primary category
2. Specific subcategory
3. Appropriate emoji
4. Color (red for spending, green for income, blue for transfers, purple for investments)`;

    const categorizedData = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          categorized_transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                transaction_id: { type: "string" },
                category: { type: "string" },
                subcategory: { type: "string" },
                emoji: { type: "string" },
                color: { type: "string" }
              }
            }
          },
          spending_summary: {
            type: "object",
            properties: {
              top_category: { type: "string" },
              total_spent: { type: "number" },
              category_breakdown: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    amount: { type: "number" },
                    percentage: { type: "number" }
                  }
                }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: categorizedData,
      transaction_count: recentTransactions.length
    });

  } catch (error) {
    console.error('Batch categorization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});