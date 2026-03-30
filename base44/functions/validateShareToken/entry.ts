import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ 
        success: false, 
        error: 'Token required' 
      }, { status: 400 });
    }

    // Find document with this token
    const documents = await base44.asServiceRole.entities.CollaborativeDocument.filter({
      share_token: token
    });

    if (documents.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid share link' 
      }, { status: 404 });
    }

    const document = documents[0];

    // Check if link has expired
    if (document.share_expires_at) {
      const expiryDate = new Date(document.share_expires_at);
      if (expiryDate < new Date()) {
        return Response.json({ 
          success: false, 
          error: 'Share link has expired' 
        }, { status: 403 });
      }
    }

    // Return document info (without sensitive data)
    return Response.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        document_type: document.document_type,
        owner_email: document.owner_email,
        allow_comments: document.allow_comments
      }
    });

  } catch (error) {
    console.error('Share token validation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});