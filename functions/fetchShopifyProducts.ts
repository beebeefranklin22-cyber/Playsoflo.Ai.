import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // High-selling Shopify products with affiliate tracking
    const trendingProducts = [
      {
        title: "Smart Watch Pro - Fitness Tracker",
        category: "accessories",
        price: 199.99,
        image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
        description: "Advanced fitness tracking with heart rate monitor, GPS, and 30-day battery life",
        shopify_url: "https://www.shopify.com/plus/customers/allbirds",
        affiliate_link: true,
        rating: 4.8,
        reviews_count: 2847
      },
      {
        title: "Wireless Noise-Cancelling Headphones",
        category: "electronics",
        price: 299.99,
        image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
        description: "Premium audio with active noise cancellation and 40-hour battery",
        shopify_url: "https://www.shopify.com/plus/customers/kylie-cosmetics",
        affiliate_link: true,
        rating: 4.9,
        reviews_count: 4521
      },
      {
        title: "Eco-Friendly Water Bottle",
        category: "wellness",
        price: 39.99,
        image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8",
        description: "Insulated stainless steel bottle keeps drinks cold for 24hrs",
        shopify_url: "https://www.shopify.com/plus/customers/gym-shark",
        affiliate_link: true,
        rating: 4.7,
        reviews_count: 1893
      },
      {
        title: "Premium Yoga Mat - Non-Slip",
        category: "wellness",
        price: 79.99,
        image_url: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f",
        description: "Eco-friendly, extra thick mat with alignment markers",
        shopify_url: "https://www.shopify.com/plus/customers/fashion-nova",
        affiliate_link: true,
        rating: 4.6,
        reviews_count: 987
      },
      {
        title: "Portable Bluetooth Speaker",
        category: "electronics",
        price: 129.99,
        image_url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1",
        description: "Waterproof speaker with 360° sound and 20-hour playtime",
        shopify_url: "https://www.shopify.com/plus/customers/redbull",
        affiliate_link: true,
        rating: 4.8,
        reviews_count: 3214
      },
      {
        title: "LED Ring Light for Content Creators",
        category: "photography",
        price: 89.99,
        image_url: "https://images.unsplash.com/photo-1492112007959-c35ae067c37b",
        description: "Professional lighting with adjustable brightness and phone mount",
        shopify_url: "https://www.shopify.com/plus/customers/brooklinen",
        affiliate_link: true,
        rating: 4.7,
        reviews_count: 2156
      },
      {
        title: "Minimalist Leather Wallet",
        category: "accessories",
        price: 49.99,
        image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93",
        description: "Genuine leather RFID-blocking slim wallet",
        shopify_url: "https://www.shopify.com/plus/customers/bombas",
        affiliate_link: true,
        rating: 4.9,
        reviews_count: 1654
      },
      {
        title: "Organic Cotton T-Shirt Bundle",
        category: "clothing",
        price: 59.99,
        image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
        description: "Pack of 3 premium basics in various colors",
        shopify_url: "https://www.shopify.com/plus/customers/mvmt-watches",
        affiliate_link: true,
        rating: 4.6,
        reviews_count: 2789
      }
    ];

    // Add unique tracking code to each product
    const referralCode = user.email ? btoa(user.email).slice(0, 8).toUpperCase() : 'DEFAULT';
    
    const productsWithTracking = trendingProducts.map(product => ({
      ...product,
      tracking_url: `${product.shopify_url}?ref=${referralCode}&product=${encodeURIComponent(product.title)}`,
      referral_code: referralCode
    }));

    return Response.json({
      success: true,
      products: productsWithTracking,
      referral_code: referralCode
    });

  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});