import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Top 25 high-selling products with real affiliate opportunities
const shopifyProducts = [
  {
    id: "airpods-pro",
    title: "Apple AirPods Pro (2nd Gen)",
    description: "Active Noise Cancellation, Adaptive Audio, Personalized Spatial Audio",
    price: 249.99,
    image: "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/airpods-pro"
  },
  {
    id: "iphone-15-pro",
    title: "iPhone 15 Pro Max",
    description: "Titanium Design, A17 Pro chip, 5x Telephoto Camera",
    price: 1199.99,
    image: "https://images.unsplash.com/photo-1678652197950-69d837be30dc?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/iphone15pro"
  },
  {
    id: "ps5-console",
    title: "PlayStation 5 Console",
    description: "Ultra-high speed SSD, Integrated I/O, Ray Tracing, 4K Gaming",
    price: 499.99,
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600",
    category: "gaming",
    affiliate_link: "https://amzn.to/ps5-console"
  },
  {
    id: "macbook-pro",
    title: "MacBook Pro 16\" M3 Max",
    description: "Apple M3 Max chip, 48GB RAM, 1TB SSD, Liquid Retina XDR",
    price: 3499.99,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/macbook-m3"
  },
  {
    id: "dyson-airwrap",
    title: "Dyson Airwrap Multi-Styler",
    description: "Complete hair styling tool, Multiple attachments, Professional results",
    price: 599.99,
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600",
    category: "beauty",
    affiliate_link: "https://amzn.to/dyson-airwrap"
  },
  {
    id: "apple-watch-ultra",
    title: "Apple Watch Ultra 2",
    description: "49mm Titanium Case, Action Button, Precision GPS, Diving & Hiking",
    price: 799.99,
    image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/watch-ultra"
  },
  {
    id: "sony-camera",
    title: "Sony A7 IV Mirrorless Camera",
    description: "33MP Full-Frame, 4K 60fps, Real-time Tracking AF",
    price: 2498.99,
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/sony-a7iv"
  },
  {
    id: "nintendo-switch",
    title: "Nintendo Switch OLED",
    description: "7-inch OLED screen, Enhanced audio, Wide adjustable stand",
    price: 349.99,
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600",
    category: "gaming",
    affiliate_link: "https://amzn.to/switch-oled"
  },
  {
    id: "bose-qc45",
    title: "Bose QuietComfort 45",
    description: "Wireless Noise Cancelling Headphones, 24hr Battery, Premium Sound",
    price: 329.99,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/bose-qc45"
  },
  {
    id: "ipad-pro",
    title: "iPad Pro 12.9\" M2",
    description: "Liquid Retina XDR display, M2 chip, ProMotion, Face ID",
    price: 1099.99,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/ipad-pro"
  },
  {
    id: "nike-air-max",
    title: "Nike Air Max 90",
    description: "Classic sneaker design, Max Air cushioning, Premium materials",
    price: 130.00,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    category: "fashion",
    affiliate_link: "https://amzn.to/nike-airmax"
  },
  {
    id: "instant-pot",
    title: "Instant Pot Duo Plus 9-in-1",
    description: "Pressure Cooker, Slow Cooker, Rice Cooker, Steamer, 6 Quart",
    price: 119.99,
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600",
    category: "home",
    affiliate_link: "https://amzn.to/instant-pot"
  },
  {
    id: "lululemon-leggings",
    title: "Lululemon Align Leggings",
    description: "High-Rise, Nulu fabric, Buttery soft, Squat-proof",
    price: 98.00,
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600",
    category: "fashion",
    affiliate_link: "https://amzn.to/lululemon"
  },
  {
    id: "yeti-cooler",
    title: "YETI Tundra 45 Cooler",
    description: "Legendary cold retention, Bear-resistant, Rotomolded construction",
    price: 349.99,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600",
    category: "outdoor",
    affiliate_link: "https://amzn.to/yeti-cooler"
  },
  {
    id: "kitchenaid-mixer",
    title: "KitchenAid Stand Mixer",
    description: "5-Quart, 10-Speed, Tilt-Head, Includes accessories",
    price: 429.99,
    image: "https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=600",
    category: "home",
    affiliate_link: "https://amzn.to/kitchenaid"
  },
  {
    id: "samsung-tv",
    title: "Samsung 65\" OLED 4K TV",
    description: "Neural Quantum Processor, HDR10+, 120Hz, Gaming Hub",
    price: 1799.99,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/samsung-oled"
  },
  {
    id: "nespresso-machine",
    title: "Nespresso VertuoPlus",
    description: "Coffee & Espresso Maker, One-touch brewing, 5 cup sizes",
    price: 179.99,
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600",
    category: "home",
    affiliate_link: "https://amzn.to/nespresso"
  },
  {
    id: "theragun",
    title: "Theragun Elite Massage Gun",
    description: "Deep muscle treatment, 5 speeds, OLED screen, QuietForce",
    price: 399.99,
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600",
    category: "fitness",
    affiliate_link: "https://amzn.to/theragun"
  },
  {
    id: "roomba",
    title: "iRobot Roomba j7+",
    description: "Self-Emptying Robot Vacuum, AI obstacle avoidance, Smart Mapping",
    price: 799.99,
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600",
    category: "home",
    affiliate_link: "https://amzn.to/roomba-j7"
  },
  {
    id: "le-creuset",
    title: "Le Creuset Dutch Oven 5.5QT",
    description: "Enameled cast iron, Lifetime quality, Even heat distribution",
    price: 379.99,
    image: "https://images.unsplash.com/photo-1584990347449-39b6c35c3720?w=600",
    category: "home",
    affiliate_link: "https://amzn.to/le-creuset"
  },
  {
    id: "peloton-bike",
    title: "Peloton Bike+",
    description: "Auto-resistance, Rotating screen, Immersive classes",
    price: 2495.00,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600",
    category: "fitness",
    affiliate_link: "https://amzn.to/peloton"
  },
  {
    id: "ray-ban-meta",
    title: "Ray-Ban Meta Smart Glasses",
    description: "Built-in camera, Open-ear audio, Livestream to social media",
    price: 299.00,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/rayban-meta"
  },
  {
    id: "oura-ring",
    title: "Oura Ring Gen3",
    description: "Sleep tracking, Activity monitoring, Heart rate, Body temperature",
    price: 299.00,
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600",
    category: "fitness",
    affiliate_link: "https://amzn.to/oura-ring"
  },
  {
    id: "gopro-12",
    title: "GoPro HERO12 Black",
    description: "5.3K60 Video, HDR, HyperSmooth 6.0, Waterproof to 33ft",
    price: 399.99,
    image: "https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=600",
    category: "electronics",
    affiliate_link: "https://amzn.to/gopro12"
  },
  {
    id: "vitamix-blender",
    title: "Vitamix A3500 Blender",
    description: "Smart blending, 5 Programs, Self-cleaning, 10-year warranty",
    price: 579.99,
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600",
    category: "home",
    affiliate_link: "https://amzn.to/vitamix"
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add referral tracking if user has referral code
    const productsWithReferral = shopifyProducts.map(product => ({
      ...product,
      referral_code: user.referral_code || null
    }));

    return Response.json({
      success: true,
      products: productsWithReferral,
      total: productsWithReferral.length
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return Response.json({ 
      error: 'Failed to fetch products',
      details: error.message 
    }, { status: 500 });
  }
});