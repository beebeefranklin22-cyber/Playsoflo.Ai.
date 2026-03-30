import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { car_id, car_details } = await req.json();

    if (!car_id) {
      return Response.json({ error: 'car_id is required' }, { status: 400 });
    }

    // Get all rentals for this car
    const rentals = await base44.asServiceRole.entities.CarRental.filter({
      car_model: car_details.model,
      status: { $in: ['completed', 'active'] }
    });

    // Calculate total usage
    const totalMiles = rentals.reduce((sum, r) => {
      const milesDriven = (r.odometer_end || 0) - (r.odometer_start || 0);
      return sum + milesDriven;
    }, 0);

    const totalRentals = rentals.length;
    const avgRentalDuration = rentals.reduce((sum, r) => {
      const days = Math.ceil(
        (new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0) / (totalRentals || 1);

    // Get damage history
    const damageHistory = rentals
      .filter(r => r.damages_reported && r.damages_reported.length > 0)
      .flatMap(r => r.damages_reported);

    // AI Predictive Maintenance Analysis
    const maintenancePrompt = `You are an expert automotive maintenance specialist with deep knowledge of luxury and exotic vehicles.

VEHICLE INFORMATION:
Make: ${car_details.make}
Model: ${car_details.model}
Year: ${car_details.year || 'Unknown'}
Type: Exotic/Luxury rental car

USAGE DATA:
- Total miles driven: ${totalMiles}
- Total rental sessions: ${totalRentals}
- Average rental duration: ${avgRentalDuration.toFixed(1)} days
- Damage incidents reported: ${damageHistory.length}

RECENT DAMAGE HISTORY:
${damageHistory.length > 0 ? damageHistory.slice(-5).map(d => 
  `- ${d.description} (Est. cost: $${d.estimated_cost})`
).join('\n') : 'No damage history'}

TASK: Predict upcoming maintenance needs and potential issues for this vehicle.

Provide:
1. Immediate maintenance needs (within 1 month)
2. Upcoming maintenance needs (1-3 months)
3. Potential issues based on usage patterns
4. Estimated costs for each maintenance item
5. Priority level (high/medium/low)
6. Recommended preventive actions
7. Impact on rental availability if deferred

Consider:
- Typical maintenance schedules for exotic vehicles
- Impact of rental usage patterns
- Wear and tear from multiple drivers
- Historical damage patterns
- Manufacturer recommendations`;

    const predictions = await base44.integrations.Core.InvokeLLM({
      prompt: maintenancePrompt,
      response_json_schema: {
        type: "object",
        properties: {
          immediate_needs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                estimated_cost: { type: "number" },
                priority: { type: "string" },
                due_in_miles: { type: "number" },
                impact_if_deferred: { type: "string" }
              }
            }
          },
          upcoming_needs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                estimated_cost: { type: "number" },
                timeframe: { type: "string" }
              }
            }
          },
          potential_issues: {
            type: "array",
            items: { type: "string" }
          },
          total_estimated_cost: { type: "number" },
          overall_vehicle_health: { type: "string" },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Notify provider if there are immediate high-priority needs
    const highPriorityNeeds = predictions.immediate_needs?.filter(n => n.priority === 'high') || [];
    
    if (highPriorityNeeds.length > 0) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'system_alert',
        title: '⚠️ Urgent Maintenance Needed',
        message: `AI has detected ${highPriorityNeeds.length} high-priority maintenance need(s) for your ${car_details.make} ${car_details.model}:\n\n${highPriorityNeeds.map(n => `• ${n.item} - $${n.estimated_cost}`).join('\n')}`,
        reference_type: 'user',
        reference_id: car_id
      });
    }

    return Response.json({
      success: true,
      predictions,
      usage_summary: {
        total_miles: totalMiles,
        total_rentals: totalRentals,
        avg_rental_duration: avgRentalDuration,
        damage_incidents: damageHistory.length
      },
      high_priority_count: highPriorityNeeds.length
    });

  } catch (error) {
    console.error('Maintenance prediction error:', error);
    return Response.json({ 
      error: error.message || 'Failed to predict maintenance' 
    }, { status: 500 });
  }
});