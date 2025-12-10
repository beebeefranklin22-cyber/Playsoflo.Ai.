import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const contentData = JSON.parse(formData.get('contentData') || '{}');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload file (optimized by platform for large files)
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Create streaming content entry
    const content = await base44.asServiceRole.entities.StreamingContent.create({
      title: contentData.title || 'Untitled',
      type: contentData.type || 'movie',
      category: contentData.category || 'entertainment',
      description: contentData.description || '',
      thumbnail_url: contentData.thumbnail_url || file_url,
      duration: contentData.duration || 'N/A',
      rating: 0,
      is_live: false,
      requires_subscription: false,
      betting_available: false
    });

    return Response.json({ 
      success: true, 
      file_url,
      content_id: content.id,
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 });
  }
});