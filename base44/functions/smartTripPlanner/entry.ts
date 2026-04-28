import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, user_location, check_in_date, check_out_date } = await req.json();

    // Parse user intent from query
    const intent = parseUserIntent(query);

    if (!intent.destination || !intent.dates) {
      return Response.json({
        error: "Please specify a destination and dates for your trip"
      }, { status: 400 });
    }

    // Fetch data from multiple providers in parallel
    const [flights, hotels, restaurants, experiences, carRentals, events] = await Promise.all([
      fetchFlights(intent.destination, intent.dates.start, intent.dates.end),
      fetchHotels(intent.destination, intent.dates.start, intent.dates.end),
      fetchRestaurants(intent.destination, intent.preferences.dining),
      fetchExperiences(intent.destination, intent.preferences.activities),
      fetchCarRentals(intent.destination, intent.dates.start, intent.dates.end, intent.preferences.transport),
      fetchLocalEvents(intent.destination, intent.dates.start, intent.dates.end)
    ]);

    // Compile intelligent itinerary
    const itinerary = compileItinerary(
      intent,
      { flights, hotels, restaurants, experiences, carRentals, events }
    );

    return Response.json({ itinerary, intent });
  } catch (error) {
    console.error('Trip planner error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseUserIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Extract destination
  const destinations = [
    { name: 'Miami', keywords: ['miami', 'florida', 'south florida', 'miami beach'] },
    { name: 'New York', keywords: ['new york', 'nyc', 'manhattan'] },
    { name: 'Los Angeles', keywords: ['los angeles', 'la', 'california'] },
    { name: 'Houston', keywords: ['houston', 'texas'] },
    { name: 'Palm Beach', keywords: ['palm beach', 'west palm beach'] },
    { name: 'New Orleans', keywords: ['new orleans', 'louisiana'] },
    { name: 'Las Vegas', keywords: ['vegas', 'las vegas', 'nevada'] },
    { name: 'Chicago', keywords: ['chicago', 'illinois'] }
  ];

  let destination = null;
  for (const dest of destinations) {
    if (dest.keywords.some(kw => lowerQuery.includes(kw))) {
      destination = dest.name;
      break;
    }
  }

  // Extract dates
  const dateMatch = query.match(/(\d{1,2}(?:st|nd|rd|th)?)\s+(?:to|through|-|and)\s+(\d{1,2}(?:st|nd|rd|th)?)/i);
  const durationMatch = query.match(/(\d+)\s*(?:day|week|night)/i);
  
  let dates = { start: new Date(), end: new Date() };
  if (dateMatch) {
    const [start, end] = dateMatch.slice(1);
    dates.start = new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(start));
    dates.end = new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(end));
  } else if (durationMatch) {
    const duration = parseInt(durationMatch[1]);
    dates.end = new Date(dates.start.getTime() + duration * 24 * 60 * 60 * 1000);
  }

  // Extract preferences
  const preferences = {
    budget: 'moderate',
    activities: [],
    dining: [],
    transport: 'car',
    vibe: 'adventure'
  };

  if (lowerQuery.includes('luxury') || lowerQuery.includes('upscale')) preferences.budget = 'luxury';
  if (lowerQuery.includes('budget') || lowerQuery.includes('cheap')) preferences.budget = 'budget';
  if (lowerQuery.includes('romantic') || lowerQuery.includes('date')) preferences.vibe = 'romantic';
  if (lowerQuery.includes('classy') || lowerQuery.includes('sophisticated')) preferences.vibe = 'upscale';
  if (lowerQuery.includes('nightlife') || lowerQuery.includes('club')) preferences.activities.push('nightlife');
  if (lowerQuery.includes('restaurant') || lowerQuery.includes('dining') || lowerQuery.includes('eat')) preferences.dining.push('fine_dining');
  if (lowerQuery.includes('suv') || lowerQuery.includes('car') || lowerQuery.includes('rental')) preferences.transport = 'car';
  if (lowerQuery.includes('flight') || lowerQuery.includes('fly')) preferences.transport = 'flight';

  return {
    destination,
    dates,
    preferences,
    original_query: query
  };
}

async function fetchFlights(destination, startDate, endDate) {
  try {
    // Mock flight data - in production, integrate with Skyscanner/Kayak API
    return [
      {
        id: 'FL1',
        airline: 'Delta',
        departure: '8:00 AM',
        arrival: '10:30 AM',
        duration: '2h 30m',
        price: 320,
        seats_available: 5,
        rating: 4.5
      },
      {
        id: 'FL2',
        airline: 'United',
        departure: '10:00 AM',
        arrival: '12:30 PM',
        duration: '2h 30m',
        price: 280,
        seats_available: 8,
        rating: 4.2
      },
      {
        id: 'FL3',
        airline: 'American Airlines',
        departure: '2:00 PM',
        arrival: '4:30 PM',
        duration: '2h 30m',
        price: 250,
        seats_available: 12,
        rating: 4.0
      }
    ];
  } catch (error) {
    console.error('Flights fetch error:', error);
    return [];
  }
}

async function fetchHotels(destination, startDate, endDate) {
  try {
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return [
      {
        id: 'HT1',
        name: 'The Ritz-Carlton',
        category: 'luxury',
        price_per_night: 450,
        total_price: 450 * nights,
        rating: 4.8,
        rooms_available: 3,
        amenities: ['gym', 'pool', 'spa', 'concierge'],
        location: destination,
        reviews: 2145
      },
      {
        id: 'HT2',
        name: 'The Standard',
        category: 'upscale',
        price_per_night: 280,
        total_price: 280 * nights,
        rating: 4.6,
        rooms_available: 8,
        amenities: ['pool', 'restaurant', 'rooftop_bar'],
        location: destination,
        reviews: 1842
      },
      {
        id: 'HT3',
        name: 'Budget Inn',
        category: 'budget',
        price_per_night: 120,
        total_price: 120 * nights,
        rating: 4.1,
        rooms_available: 15,
        amenities: ['wifi', 'parking'],
        location: destination,
        reviews: 892
      }
    ];
  } catch (error) {
    console.error('Hotels fetch error:', error);
    return [];
  }
}

async function fetchRestaurants(destination, preferences = []) {
  try {
    return [
      {
        id: 'REST1',
        name: 'Juvia',
        cuisine: 'Peruvian-Japanese-Spanish Fusion',
        rating: 4.7,
        price_level: '$$$',
        vibe: 'upscale',
        cuisine_type: preferences.includes('fine_dining') ? 'fine_dining' : 'casual',
        reservations_available: true,
        cuisine_tags: ['seafood', 'fusion', 'cocktails'],
        reviews: 3421,
        avg_cost: 85
      },
      {
        id: 'REST2',
        name: 'Casa Tua',
        cuisine: 'Spanish Tapas',
        rating: 4.5,
        price_level: '$$',
        vibe: 'romantic',
        cuisine_type: 'fine_dining',
        reservations_available: true,
        cuisine_tags: ['spanish', 'tapas', 'wine'],
        reviews: 2156,
        avg_cost: 65
      },
      {
        id: 'REST3',
        name: 'Garcia\'s Seafood',
        cuisine: 'Fresh Seafood',
        rating: 4.6,
        price_level: '$',
        vibe: 'casual',
        cuisine_type: 'casual',
        reservations_available: false,
        cuisine_tags: ['seafood', 'local', 'casual'],
        reviews: 1892,
        avg_cost: 35
      },
      {
        id: 'REST4',
        name: 'Stubborn Seed',
        cuisine: 'American Contemporary',
        rating: 4.8,
        price_level: '$$$',
        vibe: 'upscale_casual',
        cuisine_type: 'fine_dining',
        reservations_available: true,
        cuisine_tags: ['american', 'farm_to_table', 'cocktails'],
        reviews: 2845,
        avg_cost: 95
      }
    ];
  } catch (error) {
    console.error('Restaurants fetch error:', error);
    return [];
  }
}

async function fetchExperiences(destination, preferences = []) {
  try {
    return [
      {
        id: 'EXP1',
        name: 'Yacht Charter',
        category: 'water_sports',
        price: 500,
        duration_hours: 4,
        group_size: '2-6',
        rating: 4.9,
        description: 'Luxury yacht with captain and crew',
        vibe: 'luxury',
        reviews: 1256
      },
      {
        id: 'EXP2',
        name: 'Art Deco Walking Tour',
        category: 'cultural',
        price: 45,
        duration_hours: 2,
        group_size: '1-20',
        rating: 4.7,
        description: 'Guided tour of historic architecture',
        vibe: 'cultural',
        reviews: 892
      },
      {
        id: 'EXP3',
        name: 'Nightclub VIP Experience',
        category: 'nightlife',
        price: 150,
        duration_hours: 4,
        group_size: '2-10',
        rating: 4.6,
        description: 'Premium bottle service at exclusive clubs',
        vibe: 'nightlife',
        reviews: 1145
      },
      {
        id: 'EXP4',
        name: 'Everglades Airboat Tour',
        category: 'nature',
        price: 80,
        duration_hours: 2,
        group_size: '1-4',
        rating: 4.8,
        description: 'Wildlife and nature adventure',
        vibe: 'adventure',
        reviews: 1632
      }
    ];
  } catch (error) {
    console.error('Experiences fetch error:', error);
    return [];
  }
}

async function fetchCarRentals(destination, startDate, endDate, preferences = 'car') {
  try {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return [
      {
        id: 'CAR1',
        company: 'Hertz',
        type: 'SUV (Full Size)',
        model: 'Cadillac Escalade',
        price_per_day: 120,
        total_price: 120 * days,
        rating: 4.5,
        features: ['luxury', 'spacious', 'premium_sound'],
        available: true
      },
      {
        id: 'CAR2',
        company: 'Enterprise',
        type: 'Sedan (Luxury)',
        model: 'Mercedes-Benz C-Class',
        price_per_day: 95,
        total_price: 95 * days,
        rating: 4.4,
        features: ['luxury', 'fuel_efficient', 'navigation'],
        available: true
      },
      {
        id: 'CAR3',
        company: 'Budget',
        type: 'Economy',
        model: 'Honda Civic',
        price_per_day: 45,
        total_price: 45 * days,
        rating: 4.0,
        features: ['budget', 'reliable', 'parking_assist'],
        available: true
      }
    ];
  } catch (error) {
    console.error('Car rentals fetch error:', error);
    return [];
  }
}

async function fetchLocalEvents(destination, startDate, endDate) {
  try {
    return [
      {
        id: 'EVT1',
        name: 'Art Basel Miami',
        date: 'Ongoing',
        type: 'Art & Culture',
        price: 20,
        rating: 4.8,
        description: 'International contemporary art fair'
      },
      {
        id: 'EVT2',
        name: 'Wynwood Walls Walking Tour',
        date: 'Daily',
        type: 'Urban Culture',
        price: 30,
        rating: 4.7,
        description: 'Street art and graffiti tour'
      },
      {
        id: 'EVT3',
        name: 'Latin Beats DJ Night',
        date: 'Friday & Saturday',
        type: 'Nightlife',
        price: 25,
        rating: 4.6,
        description: 'Latin music and dance event'
      }
    ];
  } catch (error) {
    console.error('Events fetch error:', error);
    return [];
  }
}

function compileItinerary(intent, data) {
  const { flights, hotels, restaurants, experiences, carRentals, events } = data;
  
  // Recommend best options based on preferences
  const recommendations = {
    flight: selectBestOption(flights, 'price', intent.preferences.budget),
    hotel: selectBestOption(
      hotels.filter(h => 
        intent.preferences.budget === 'luxury' ? h.category === 'luxury' :
        intent.preferences.budget === 'budget' ? h.category === 'budget' :
        h.category !== 'luxury'
      ),
      'rating'
    ),
    restaurants: restaurants.slice(0, 4).map((r, i) => ({
      ...r,
      day: (i % 3) + 1,
      meal: i % 3 === 0 ? 'dinner' : i % 3 === 1 ? 'lunch' : 'breakfast'
    })),
    car_rental: selectBestOption(
      carRentals.filter(c => 
        intent.preferences.transport === 'car' || intent.preferences.vibe === 'luxury'
      ),
      'rating'
    ),
    experiences: experiences.slice(0, 3),
    local_events: events.slice(0, 2)
  };

  return {
    destination: intent.destination,
    dates: {
      arrival: intent.dates.start.toLocaleDateString(),
      departure: intent.dates.end.toLocaleDateString(),
      duration_days: Math.ceil((intent.dates.end - intent.dates.start) / (1000 * 60 * 60 * 24))
    },
    summary: `🌟 ${intent.destination} Trip Itinerary (${intent.preferences.vibe === 'romantic' ? '💕 Romantic' : '🎉 Adventurous'})`,
    recommendations,
    estimated_budget: {
      flights: recommendations.flight?.price || 0,
      hotel: recommendations.hotel?.total_price || 0,
      restaurants: (recommendations.restaurants.reduce((sum, r) => sum + (r.avg_cost || 0), 0) * 3),
      car_rental: recommendations.car_rental?.total_price || 0,
      experiences: recommendations.experiences.reduce((sum, e) => sum + (e.price || 0), 0),
      total: 0
    }
  };
}

function selectBestOption(options, sortBy, preference = null) {
  if (!options || options.length === 0) return null;
  
  if (preference === 'luxury') {
    return options.find(o => o.category === 'luxury' || o.price_level === '$$$') || options[0];
  }
  if (preference === 'budget') {
    return options.sort((a, b) => a.price - b.price)[0];
  }
  
  return options.sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
    return 0;
  })[0];
}