import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const errorData = await req.json();

    // Log error to console for monitoring
    console.error('Frontend Error:', {
      error: errorData.error,
      timestamp: errorData.timestamp,
      type: errorData.type,
      url: errorData.url
    });

    // Try to get user context (if available)
    let userEmail = 'anonymous';
    try {
      const user = await base44.auth.me();
      userEmail = user?.email || 'anonymous';
    } catch (e) {
      // User not authenticated
    }

    // Store error in database for analysis
    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        error_message: errorData.error?.substring(0, 500) || 'Unknown error',
        error_stack: errorData.stack?.substring(0, 1000),
        error_type: errorData.type || 'unknown',
        user_email: userEmail,
        url: errorData.url,
        user_agent: errorData.userAgent,
        timestamp: errorData.timestamp || new Date().toISOString(),
        component_stack: errorData.componentStack?.substring(0, 1000)
      });
    } catch (dbError) {
      // Database write failed - just log it
      console.warn('Failed to store error in DB:', dbError);
    }

    return Response.json({ 
      success: true, 
      message: 'Error logged successfully' 
    });

  } catch (error) {
    console.error('Error in logError function:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to log error' 
    }, { status: 500 });
  }
});