import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      pickup_coords, 
      delivery_coords, 
      package_type, 
      package_weight = 0,
      package_value = 0,
      delivery_type = 'standard',
      urgency_level = 'normal'
    } = await req.json();

    if (!pickup_coords || !delivery_coords) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Calculate distance using Haversine formula
    const toRad = (deg) => deg * (Math.PI / 180);
    const R = 3959; // Earth radius in miles
    
    const lat1 = pickup_coords[0];
    const lon1 = pickup_coords[1];
    const lat2 = delivery_coords[0];
    const lon2 = delivery_coords[1];
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Pricing algorithm
    let basePrice = 3.50; // Base fee

    // Distance-based pricing
    if (distance <= 5) {
      basePrice += distance * 1.25; // $1.25/mile for short trips
    } else if (distance <= 15) {
      basePrice += 6.25 + ((distance - 5) * 1.05); // $1.05/mile mid-range
    } else {
      basePrice += 16.75 + ((distance - 15) * 0.95); // $0.95/mile long distance
    }

    // No package type surcharge
    const packageSurcharge = 0;

    // Weight surcharge (over 50 lbs)
    let weightSurcharge = 0;
    if (package_weight > 50) {
      weightSurcharge = (package_weight - 50) * 0.35;
    }

    // Delivery type pricing (flat fees, reasonable)
    const deliveryPricing = {
      standard: 0,
      express: 2.00,
      same_day: 0,
      scheduled: -1.00 // $1 discount for flexible scheduling
    };
    const deliveryTypeSurcharge = deliveryPricing[delivery_type] ?? 0;

    // Urgency surcharge
    const urgencySurcharge = {
      normal: 0,
      urgent: 2,
      critical: 5
    }[urgency_level] || 0;

    // Insurance (1% of declared value, min $1)
    const insuranceFee = package_value > 0 ? Math.max(1, package_value * 0.01) : 0;

    // No surge pricing
    const surgeFee = 0;
    const surgeMultiplier = 1.0;

    // Calculate totals
    const subtotal = basePrice + weightSurcharge +
                     deliveryTypeSurcharge + urgencySurcharge + insuranceFee;

    const platformFee = subtotal * 0.15; // 15% platform fee
    const totalPrice = subtotal + platformFee;

    // Driver gets 85% of the subtotal (excluding insurance & platform fee)
    const driverBase = basePrice + weightSurcharge + deliveryTypeSurcharge + urgencySurcharge;
    const driverEarnings = parseFloat((driverBase * 0.85).toFixed(2));

    // Estimated time (35 mph average + 5 min pickup + 5 min dropoff)
    const estimatedMinutes = Math.ceil((distance / 35) * 60) + 10;

    // Compare with Uber pricing (simulated - Uber is typically 30-50% more expensive)
    const uberEstimate = totalPrice * 1.4;
    const savings = uberEstimate - totalPrice;
    const savingsPercentage = ((savings / uberEstimate) * 100).toFixed(0);

    return Response.json({
      success: true,
      pricing: {
        distance_miles: parseFloat(distance.toFixed(2)),
        estimated_duration_minutes: estimatedMinutes,
        base_price: parseFloat(basePrice.toFixed(2)),
        package_surcharge: parseFloat(packageSurcharge.toFixed(2)),
        weight_surcharge: parseFloat(weightSurcharge.toFixed(2)),
        delivery_type_surcharge: parseFloat(deliveryTypeSurcharge.toFixed(2)),
        urgency_surcharge: parseFloat(urgencySurcharge.toFixed(2)),
        insurance_fee: parseFloat(insuranceFee.toFixed(2)),
        surge_fee: surgeFee,
        surge_multiplier: surgeMultiplier,
        platform_fee: parseFloat(platformFee.toFixed(2)),
        total_price: parseFloat(totalPrice.toFixed(2)),
        driver_earnings: driverEarnings,
        uber_comparison: {
          uber_estimate: parseFloat(uberEstimate.toFixed(2)),
          your_savings: parseFloat(savings.toFixed(2)),
          savings_percentage: savingsPercentage
        }
      }
    });

  } catch (error) {
    console.error('Price calculation error:', error);
    return Response.json({ 
      error: 'Failed to calculate price',
      details: error.message 
    }, { status: 500 });
  }
});