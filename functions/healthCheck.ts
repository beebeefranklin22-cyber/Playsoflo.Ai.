import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
    responseTime: 0
  };

  try {
    const base44 = createClientFromRequest(req);

    // 1. Database connectivity
    try {
      await base44.asServiceRole.entities.User.list('', 1);
      results.checks.database = { status: 'healthy', responseTime: Date.now() - startTime };
    } catch (e) {
      results.checks.database = { status: 'failed', error: e.message };
      results.status = 'degraded';
    }

    // 2. Stripe integration
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        results.checks.stripe = { status: 'configured' };
      } else {
        results.checks.stripe = { status: 'not_configured' };
      }
    } catch (e) {
      results.checks.stripe = { status: 'failed', error: e.message };
    }

    // 3. Google Maps API
    try {
      const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      if (mapsKey) {
        results.checks.maps = { status: 'configured' };
      } else {
        results.checks.maps = { status: 'not_configured' };
      }
    } catch (e) {
      results.checks.maps = { status: 'failed', error: e.message };
    }

    // 4. Core integrations
    try {
      const testResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: 'Test: respond with "OK"'
      });
      results.checks.ai = { status: testResult ? 'healthy' : 'degraded' };
    } catch (e) {
      results.checks.ai = { status: 'failed', error: e.message };
      results.status = 'degraded';
    }

    // 5. Memory usage
    if (Deno.memoryUsage) {
      const mem = Deno.memoryUsage();
      results.checks.memory = {
        status: mem.heapUsed < 200000000 ? 'healthy' : 'warning',
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024)
      };
    }

    results.responseTime = Date.now() - startTime;
    return Response.json(results);

  } catch (error) {
    results.status = 'critical';
    results.error = error.message;
    results.responseTime = Date.now() - startTime;
    return Response.json(results, { status: 500 });
  }
});