import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { endpoint, data, user_email } = payload;

    // Rate limiting check
    const recentRequests = await base44.asServiceRole.entities.Payment.filter({
      payer_email: user_email,
      created_date: { $gte: new Date(Date.now() - 60000).toISOString() }
    });

    if (recentRequests.length > 10) {
      return Response.json({
        valid: false,
        error: 'Rate limit exceeded - too many requests',
        retry_after: 60
      }, { status: 429 });
    }

    // Input validation
    const validationRules = {
      payment: {
        required: ['amount', 'payer_email'],
        amount: { min: 0.5, max: 10000 }
      },
      booking: {
        required: ['service_id', 'customer_email', 'booking_date'],
        price: { min: 0, max: 50000 }
      },
      ticket: {
        required: ['experience_id', 'buyer_email', 'price_paid'],
        quantity: { min: 1, max: 20 }
      }
    };

    const rules = validationRules[endpoint];
    if (rules) {
      // Check required fields
      const missingFields = rules.required.filter(field => !data[field]);
      if (missingFields.length > 0) {
        return Response.json({
          valid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        }, { status: 400 });
      }

      // Validate amounts
      if (data.amount && rules.amount) {
        if (data.amount < rules.amount.min || data.amount > rules.amount.max) {
          return Response.json({
            valid: false,
            error: `Amount must be between $${rules.amount.min} and $${rules.amount.max}`
          }, { status: 400 });
        }
      }
    }

    // SQL injection prevention
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi;
    const stringData = JSON.stringify(data);
    if (sqlPattern.test(stringData)) {
      return Response.json({
        valid: false,
        error: 'Invalid characters detected in input'
      }, { status: 400 });
    }

    // XSS prevention
    const xssPattern = /<script|javascript:|onerror=|onclick=/gi;
    if (xssPattern.test(stringData)) {
      return Response.json({
        valid: false,
        error: 'Potential security threat detected'
      }, { status: 400 });
    }

    return Response.json({
      valid: true,
      sanitized_data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      valid: false,
      error: 'Validation failed: ' + error.message 
    }, { status: 500 });
  }
});