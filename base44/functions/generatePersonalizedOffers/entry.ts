import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's purchase/order history
    const [orders, bookings, carRentals] = await Promise.all([
      base44.entities.Order.filter({ user_email: user.email }, '-created_date', 20),
      base44.entities.TravelBooking.filter({ customer_email: user.email }, '-created_date', 10),
      base44.entities.CarRental.filter({ renter_email: user.email }, '-created_date', 10),
    ]);

    // Extract user behavior patterns
    const userBehavior = {
      orderHistory: orders.map(o => ({ category: o.category || o.product_name, amount: o.total_amount, date: o.created_date })),
      travelBookings: bookings.map(b => ({ category: b.category, amount: b.total_amount, date: b.created_date })),
      carRentals: carRentals.map(c => ({ car: `${c.car_make} ${c.car_model}`, amount: c.total_amount, date: c.created_date })),
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / orders.length : 0,
      preferredCategories: [...new Set(orders.map(o => o.category || 'marketplace'))],
      totalSpent: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      isFrequentUser: orders.length + bookings.length + carRentals.length > 5,
    };

    // Use AI to analyze and generate personalized bundle recommendations
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert e-commerce strategist. Analyze this user's purchasing behavior and generate 3-4 highly relevant, limited-time bundle offers designed to maximize conversion and average order value.

User Profile:
- Preferred Categories: ${userBehavior.preferredCategories.join(', ')}
- Average Order Value: $${userBehavior.avgOrderValue.toFixed(2)}
- Total Spent: $${userBehavior.totalSpent.toFixed(2)}
- Frequent User: ${userBehavior.isFrequentUser}
- Recent Orders: ${userBehavior.orderHistory.slice(0, 3).map(o => o.category).join(', ')}
- Travel Bookings: ${userBehavior.travelBookings.length > 0 ? 'Yes' : 'No'}
- Car Rentals: ${userBehavior.carRentals.length > 0 ? 'Yes' : 'No'}

Generate bundles that are:
1. Cross-category (e.g., travel + car rental + experience)
2. Complementary (services that naturally go together)
3. Time-sensitive (limited-time urgency)
4. Discount-driven (15-35% savings)

Return ONLY a valid JSON object with this exact structure:
{
  "offers": [
    {
      "name": "Bundle Name",
      "description": "What's included and why it's perfect for this user",
      "services": ["Service 1", "Service 2", "Service 3"],
      "originalPrice": 150,
      "bundlePrice": 99,
      "discountPercent": 34,
      "hoursValid": 24,
      "urgencyMessage": "Only 2 bundles left at this price!"
    }
  ]
}

Return ONLY the JSON object, no other text.`,
      response_json_schema: {
        type: 'object',
        properties: {
          offers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                services: { type: 'array', items: { type: 'string' } },
                originalPrice: { type: 'number' },
                bundlePrice: { type: 'number' },
                discountPercent: { type: 'number' },
                hoursValid: { type: 'number' },
                urgencyMessage: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // Enhance offers with timestamps and tracking
    const offers = aiResponse?.offers || [];
    const enrichedOffers = offers.map((offer, idx) => ({
      id: `offer_${user.email}_${Date.now()}_${idx}`,
      userId: user.email,
      ...offer,
      expiresAt: new Date(Date.now() + offer.hoursValid * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      displayed: false,
    }));

    return Response.json({ offers: enrichedOffers, userBehavior });
  } catch (error) {
    console.error('Error generating offers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});