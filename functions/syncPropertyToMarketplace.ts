import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id } = await req.json();

    if (!property_id) {
      return Response.json({ error: 'Missing property_id' }, { status: 400 });
    }

    // Get property
    const properties = await base44.entities.Property.filter({ id: property_id });
    if (properties.length === 0) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = properties[0];

    // Check if marketplace item already exists
    const existingItems = await base44.entities.MarketplaceItem.filter({
      title: property.title,
      created_by: property.created_by
    });

    let marketplaceItem;

    // Determine price and price type
    let price = 0;
    let priceType = 'per_day';

    if (property.listing_type === 'short_term' && property.price_per_night) {
      price = property.price_per_night;
      priceType = 'per_day';
    } else if (property.listing_type === 'for_rent' && property.price_per_month) {
      price = property.price_per_month;
      priceType = 'per_month';
    } else if (property.listing_type === 'for_sale' && property.sale_price) {
      price = property.sale_price;
      priceType = 'fixed';
    }

    const marketplaceData = {
      title: property.title,
      category: 'property_rental',
      description: property.description || `${property.property_type} in ${property.location}`,
      provider_name: property.host_name || user.full_name,
      price_type: priceType,
      price: price,
      image_url: property.main_image,
      rating: property.rating || 4.5,
      reviews_count: property.reviews_count || 0,
      availability: 'available',
      instant_booking: property.instant_book || false,
      verified_provider: property.verified_host || false,
      location: property.location,
      portfolio_images: property.images || []
    };

    if (existingItems.length > 0) {
      // Update existing
      marketplaceItem = await base44.entities.MarketplaceItem.update(
        existingItems[0].id,
        marketplaceData
      );
    } else {
      // Create new
      marketplaceItem = await base44.entities.MarketplaceItem.create(marketplaceData);
    }

    return Response.json({
      success: true,
      marketplace_item_id: marketplaceItem.id
    });

  } catch (error) {
    console.error('Error syncing property to marketplace:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});