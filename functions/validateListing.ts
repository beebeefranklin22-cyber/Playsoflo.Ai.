import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_type, data } = await req.json();

    if (!listing_type || !data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const errors = [];

    // Common validations
    if (data.title && (data.title.length < 5 || data.title.length > 200)) {
      errors.push('Title must be between 5 and 200 characters');
    }

    if (data.description && data.description.length > 5000) {
      errors.push('Description too long (max 5000 characters)');
    }

    // Price validations based on listing type
    if (listing_type === 'property') {
      if (data.price_per_night !== undefined && (data.price_per_night < 0 || data.price_per_night > 100000)) {
        errors.push('Price per night must be between $0 and $100,000');
      }
      if (data.price_per_month !== undefined && (data.price_per_month < 0 || data.price_per_month > 1000000)) {
        errors.push('Monthly price must be between $0 and $1,000,000');
      }
      if (data.sale_price !== undefined && (data.sale_price < 0 || data.sale_price > 100000000)) {
        errors.push('Sale price must be between $0 and $100,000,000');
      }

      // Validate required fields based on listing type
      if (data.listing_type === 'short_term' && !data.price_per_night) {
        errors.push('Price per night required for short-term rentals');
      }
      if (data.listing_type === 'for_rent' && !data.price_per_month) {
        errors.push('Monthly price required for rentals');
      }
      if (data.listing_type === 'for_sale' && !data.sale_price) {
        errors.push('Sale price required');
      }

      if (!data.location || data.location.length < 3) {
        errors.push('Valid location required');
      }

      if (data.bedrooms !== undefined && (data.bedrooms < 0 || data.bedrooms > 100)) {
        errors.push('Bedrooms must be between 0 and 100');
      }
    }

    if (listing_type === 'experience') {
      if (!data.price || data.price < 0 || data.price > 1000000) {
        errors.push('Experience price must be between $0 and $1,000,000');
      }

      if (data.duration_minutes && (data.duration_minutes < 1 || data.duration_minutes > 10080)) {
        errors.push('Duration must be between 1 minute and 1 week');
      }

      if (data.ticket_types) {
        for (const ticket of data.ticket_types) {
          if (ticket.price < 0 || ticket.price > 100000) {
            errors.push(`Ticket type "${ticket.type}" has invalid price`);
          }
          if (ticket.available < 0 || ticket.available > 1000000) {
            errors.push(`Ticket type "${ticket.type}" has invalid quantity`);
          }
        }
      }

      if (data.total_capacity && (data.total_capacity < 0 || data.total_capacity > 1000000)) {
        errors.push('Total capacity must be between 0 and 1,000,000');
      }
    }

    if (listing_type === 'marketplace') {
      if (!data.price || data.price < 0 || data.price > 1000000) {
        errors.push('Item price must be between $0 and $1,000,000');
      }

      if (data.is_rental && data.rental_details) {
        const rd = data.rental_details;
        if (rd.security_deposit && (rd.security_deposit < 0 || rd.security_deposit > 100000)) {
          errors.push('Security deposit must be between $0 and $100,000');
        }
        if (rd.delivery_fee && (rd.delivery_fee < 0 || rd.delivery_fee > 10000)) {
          errors.push('Delivery fee must be between $0 and $10,000');
        }
      }
    }

    // Image validation
    if (data.image_url || data.main_image) {
      const imageUrl = data.image_url || data.main_image;
      if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        errors.push('Invalid image URL format');
      }
    }

    if (data.images || data.gallery_images) {
      const images = data.images || data.gallery_images;
      if (images.length > 50) {
        errors.push('Maximum 50 images allowed');
      }
    }

    // Sanitize string inputs
    const sanitizedData = { ...data };
    if (sanitizedData.title) {
      sanitizedData.title = sanitizedData.title.trim().slice(0, 200);
    }
    if (sanitizedData.description) {
      sanitizedData.description = sanitizedData.description.trim().slice(0, 5000);
    }

    if (errors.length > 0) {
      return Response.json({ 
        valid: false, 
        errors,
        data: null
      }, { status: 400 });
    }

    return Response.json({ 
      valid: true, 
      errors: [],
      sanitized_data: sanitizedData
    });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});