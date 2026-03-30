import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { car_details, current_price } = await req.json();

    if (!car_details) {
      return Response.json({ error: 'car_details is required' }, { status: 400 });
    }

    // Get historical booking data
    const allRentals = await base44.asServiceRole.entities.CarRental.list();
    const similarCars = allRentals.filter(r => 
      r.car_make === car_details.make || r.car_model === car_details.model
    );

    // Calculate demand metrics
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentRentals = similarCars.filter(r => 
      new Date(r.created_date) >= last30Days
    );

    const avgPricePaid = similarCars.reduce((sum, r) => sum + (r.price_per_unit || 0), 0) / (similarCars.length || 1);
    const bookingRate = (recentRentals.length / 30) * 100; // Bookings per day

    // Current date info for seasonality
    const now = new Date();
    const month = now.getMonth() + 1;
    const isHighSeason = month >= 11 || month <= 4; // Winter months in Florida = high season

    // AI Dynamic Pricing Analysis
    const pricingPrompt = `You are an expert pricing analyst specializing in luxury car rentals with real-time market knowledge.

VEHICLE DETAILS:
Make: ${car_details.make}
Model: ${car_details.model}
Year: ${car_details.year || 'Unknown'}
Current Price: $${current_price || 'Not set'}/day

HISTORICAL PERFORMANCE:
- Total rentals: ${similarCars.length}
- Recent bookings (30 days): ${recentRentals.length}
- Average price paid: $${avgPricePaid.toFixed(2)}/day
- Booking rate: ${bookingRate.toFixed(1)}% per day

MARKET CONTEXT:
- Current date: ${now.toLocaleDateString()}
- Season: ${isHighSeason ? 'High (Winter in Florida)' : 'Low (Summer in Florida)'}
- Location: South Florida market

TASK: Using your knowledge of current exotic car rental rates and market trends, provide optimal pricing recommendations.

Search the internet for current competitor rates for similar vehicles (${car_details.make} ${car_details.model} rentals in Miami/Fort Lauderdale area).

Provide:
1. Recommended daily rate optimized for bookings and revenue
2. Recommended hourly rate
3. Recommended weekly rate (with discount)
4. Competitor price range you found
5. Reasoning for your recommendations
6. Demand forecast (low/medium/high)
7. Pricing strategy (premium/competitive/value)
8. Seasonal adjustments needed

Consider:
- Current market rates for similar vehicles
- Seasonal demand patterns
- Vehicle prestige and uniqueness
- Competitor pricing
- Optimal revenue vs. booking volume balance`;

    const pricingAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: pricingPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_daily_rate: { type: "number" },
          recommended_hourly_rate: { type: "number" },
          recommended_weekly_rate: { type: "number" },
          competitor_price_range: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              average: { type: "number" }
            }
          },
          reasoning: { type: "string" },
          demand_forecast: { type: "string" },
          pricing_strategy: { type: "string" },
          seasonal_adjustments: { type: "string" },
          expected_booking_increase: { type: "number" },
          confidence_score: { type: "number" }
        }
      }
    });

    // Calculate potential revenue impact
    const currentMonthlyRevenue = current_price * bookingRate * 30;
    const projectedMonthlyRevenue = pricingAnalysis.recommended_daily_rate * bookingRate * 
                                     (1 + (pricingAnalysis.expected_booking_increase || 0) / 100) * 30;
    const revenueImpact = projectedMonthlyRevenue - currentMonthlyRevenue;

    return Response.json({
      success: true,
      pricing_analysis: pricingAnalysis,
      current_metrics: {
        current_price: current_price,
        avg_historical_price: avgPricePaid,
        booking_rate: bookingRate,
        total_rentals: similarCars.length,
        is_high_season: isHighSeason
      },
      revenue_projection: {
        current_monthly_revenue: currentMonthlyRevenue.toFixed(2),
        projected_monthly_revenue: projectedMonthlyRevenue.toFixed(2),
        potential_increase: revenueImpact.toFixed(2),
        percentage_change: ((revenueImpact / currentMonthlyRevenue) * 100).toFixed(1)
      },
      recommendation_summary: `Based on market analysis, we recommend ${
        pricingAnalysis.recommended_daily_rate > current_price ? 'increasing' : 'decreasing'
      } your daily rate to $${pricingAnalysis.recommended_daily_rate} for optimal revenue.`
    });

  } catch (error) {
    console.error('Pricing suggestion error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate pricing suggestions' 
    }, { status: 500 });
  }
});