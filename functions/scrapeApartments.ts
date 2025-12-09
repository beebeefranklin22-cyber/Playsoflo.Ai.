import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { location, maxPages = 1, minPrice, maxPrice, bedrooms, bathrooms } = await req.json();

    if (!location) {
      return Response.json({ error: 'Location is required' }, { status: 400 });
    }

    const properties = [];
    const baseUrl = 'https://www.apartments.com';
    
    // Format location for URL (e.g., "Miami, FL" -> "miami-fl")
    const formattedLocation = location.toLowerCase().replace(/[,\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const searchUrl = `${baseUrl}/${formattedLocation}/${page > 1 ? `${page}/` : ''}`;
        
        console.log(`Fetching page ${page}: ${searchUrl}`);
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        });

        if (!response.ok) {
          console.log(`Failed to fetch page ${page}: ${response.status}`);
          break;
        }

        const html = await response.text();
        
        // Parse property listings from HTML
        const propertyRegex = /<article[^>]*class="[^"]*placard[^"]*"[^>]*>[\s\S]*?<\/article>/gi;
        const matches = html.match(propertyRegex) || [];
        
        console.log(`Found ${matches.length} properties on page ${page}`);
        
        for (const match of matches) {
          try {
            // Extract property data
            const titleMatch = match.match(/property-title[^>]*>([^<]+)</i);
            const priceMatch = match.match(/property-pricing[^>]*>([^<]+)</i) || 
                             match.match(/\$([0-9,]+)/);
            const addressMatch = match.match(/property-address[^>]*>([^<]+)</i);
            const linkMatch = match.match(/href="([^"]*apartments\.com[^"]+)"/i);
            const bedroomsMatch = match.match(/(\d+)\s*(?:bd|bed)/i);
            const bathroomsMatch = match.match(/(\d+(?:\.\d+)?)\s*(?:ba|bath)/i);
            const imageMatch = match.match(/data-src="([^"]+)"|src="([^"]+\.jpg[^"]*)"/i);
            const phoneMatch = match.match(/phone-link[^>]*>([^<]+)</i) || 
                             match.match(/\((\d{3})\)\s*(\d{3})-(\d{4})/);
            
            const title = titleMatch ? titleMatch[1].trim() : null;
            const priceText = priceMatch ? priceMatch[1].replace(/[^\d,]/g, '') : null;
            const price = priceText ? parseInt(priceText.replace(/,/g, '')) : null;
            
            // Apply filters
            if (minPrice && price && price < minPrice) continue;
            if (maxPrice && price && price > maxPrice) continue;
            
            const bedroomsCount = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;
            if (bedrooms && bedroomsCount !== bedrooms) continue;
            
            const bathroomsCount = bathroomsMatch ? parseFloat(bathroomsMatch[1]) : null;
            if (bathrooms && bathroomsCount !== bathrooms) continue;

            if (title) {
              const property = {
                title,
                price,
                address: addressMatch ? addressMatch[1].trim() : null,
                url: linkMatch ? linkMatch[1] : null,
                bedrooms: bedroomsCount,
                bathrooms: bathroomsCount,
                image_url: imageMatch ? (imageMatch[1] || imageMatch[2]) : null,
                phone: phoneMatch ? (typeof phoneMatch[1] === 'string' && phoneMatch[1].includes('(') ? phoneMatch[1].trim() : `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`) : null,
                location: location,
                source: 'apartments.com',
                scraped_at: new Date().toISOString()
              };
              
              properties.push(property);
            }
          } catch (err) {
            console.error('Error parsing property:', err);
          }
        }
        
        // Small delay between pages to be respectful
        if (page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Error fetching page ${page}:`, err);
      }
    }

    return Response.json({
      success: true,
      properties,
      total: properties.length,
      location,
      pages_scraped: maxPages
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return Response.json({ 
      error: error.message || 'Failed to scrape apartments' 
    }, { status: 500 });
  }
});