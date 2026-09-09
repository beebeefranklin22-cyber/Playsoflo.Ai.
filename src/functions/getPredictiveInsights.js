// Simple time-of-day heuristics rather than a real ML demand-prediction
// model (no historical ride-demand dataset exists to train one on).
export async function getPredictiveInsights({ time_of_day } = {}) {
  const hour = time_of_day ?? new Date().getHours();
  const insights = [];

  if (hour >= 7 && hour <= 9) insights.push({ title: 'Morning rush hour', description: 'Higher demand expected near business districts and transit hubs.' });
  else if (hour >= 16 && hour <= 19) insights.push({ title: 'Evening rush hour', description: 'Higher demand expected leaving business districts.' });
  else if (hour >= 22 || hour <= 2) insights.push({ title: 'Late night', description: 'Demand is concentrated around nightlife areas; fares may include a late-night premium.' });
  else insights.push({ title: 'Off-peak hours', description: 'Demand is typically steady and spread out.' });

  return { data: { insights } };
}
