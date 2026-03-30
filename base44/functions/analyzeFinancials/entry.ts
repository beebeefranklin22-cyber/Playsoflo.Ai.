import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysis_type, time_period = '30' } = await req.json();

    // Fetch user's financial data
    const payments = await base44.entities.Payment.filter({
      created_by: user.email
    });

    const bookings = await base44.entities.Booking.filter({
      user_email: user.email
    });

    const orders = await base44.entities.Order.filter({
      created_by: user.email
    });

    // Calculate metrics
    const totalSpent = payments
      .filter(p => ['sent', 'withdrawal', 'order'].includes(p.reference_type))
      .reduce((sum, p) => sum + (p.amount_usd || 0), 0);

    const totalReceived = payments
      .filter(p => ['deposit', 'received'].includes(p.reference_type))
      .reduce((sum, p) => sum + (p.amount_usd || 0), 0);

    const recentTransactions = payments
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 50);

    // Prepare data for AI analysis
    const financialSummary = {
      total_spent: totalSpent,
      total_received: totalReceived,
      net_balance: totalReceived - totalSpent,
      transaction_count: payments.length,
      recent_transactions: recentTransactions.map(t => ({
        amount: t.amount_usd,
        type: t.reference_type,
        date: t.created_date,
        memo: t.memo
      })),
      booking_count: bookings.length,
      order_count: orders.length
    };

    let prompt = '';
    let responseSchema = {};

    switch(analysis_type) {
      case 'spending_insights':
        prompt = `Analyze this user's spending patterns and provide actionable insights:

${JSON.stringify(financialSummary, null, 2)}

Provide:
1. Top spending categories
2. Spending trends (increasing/decreasing)
3. Unusual patterns or anomalies
4. Money-saving recommendations
5. Budget suggestions`;

        responseSchema = {
          type: "object",
          properties: {
            top_categories: { type: "array", items: { type: "object", properties: { category: { type: "string" }, amount: { type: "number" }, percentage: { type: "number" } } } },
            trend: { type: "string" },
            trend_percentage: { type: "number" },
            anomalies: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            suggested_budget: { type: "number" },
            savings_potential: { type: "number" }
          }
        };
        break;

      case 'earning_forecast':
        prompt = `Based on this user's financial activity, forecast their earning potential:

${JSON.stringify(financialSummary, null, 2)}

Provide:
1. Projected monthly earnings for next 3 months
2. Growth opportunities
3. Income diversification suggestions
4. Optimal pricing recommendations`;

        responseSchema = {
          type: "object",
          properties: {
            monthly_forecast: { type: "array", items: { type: "object", properties: { month: { type: "string" }, projected_amount: { type: "number" }, confidence: { type: "number" } } } },
            growth_opportunities: { type: "array", items: { type: "string" } },
            diversification_tips: { type: "array", items: { type: "string" } },
            pricing_recommendations: { type: "string" }
          }
        };
        break;

      case 'financial_health':
        prompt = `Assess this user's overall financial health and provide a comprehensive report:

${JSON.stringify(financialSummary, null, 2)}

Provide:
1. Financial health score (0-100)
2. Strengths and weaknesses
3. Risk assessment
4. Improvement plan`;

        responseSchema = {
          type: "object",
          properties: {
            health_score: { type: "number" },
            score_label: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            risk_level: { type: "string" },
            improvement_plan: { type: "array", items: { type: "string" } }
          }
        };
        break;

      case 'cashflow_forecast':
        prompt = `Analyze cash flow patterns and forecast future liquidity:

${JSON.stringify(financialSummary, null, 2)}

Provide:
1. Cash flow trend analysis
2. Predicted balance for next 90 days
3. Liquidity warnings
4. Cash management tips`;

        responseSchema = {
          type: "object",
          properties: {
            current_trend: { type: "string" },
            daily_forecast: { type: "array", items: { type: "object", properties: { day: { type: "number" }, predicted_balance: { type: "number" } } } },
            liquidity_warnings: { type: "array", items: { type: "string" } },
            cash_tips: { type: "array", items: { type: "string" } }
          }
        };
        break;

      default:
        return Response.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

    // Get AI analysis
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema
    });

    return Response.json({
      success: true,
      analysis_type,
      data: analysis,
      summary: financialSummary
    });

  } catch (error) {
    console.error('Financial analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});