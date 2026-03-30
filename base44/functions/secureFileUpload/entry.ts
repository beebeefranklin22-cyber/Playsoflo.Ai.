import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const fileType = formData.get('type'); // 'image', 'document', 'video'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      video: ['video/mp4', 'video/quicktime', 'video/x-msvideo']
    };

    const validTypes = fileType ? allowedTypes[fileType] : [...allowedTypes.image, ...allowedTypes.document, ...allowedTypes.video];

    if (!validTypes.includes(file.type)) {
      return Response.json({ error: `Invalid file type. Allowed: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Sanitize filename
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const sanitizedName = `${user.id}_${timestamp}_${originalName}`;

    // Upload using Core integration
    const { file_url } = await base44.integrations.Core.UploadFile({ 
      file: file 
    });

    // Log upload for audit trail
    console.log(`File uploaded: ${sanitizedName} by ${user.email}`);

    return Response.json({ 
      file_url,
      original_name: file.name,
      size: file.size,
      type: file.type,
      uploaded_by: user.email,
      uploaded_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Secure file upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});