export async function getCryptoPrices() {
  try {
    const res = await fetch('/api/prices?type=crypto');
    const json = await res.json();
    if (!res.ok) return { data: { prices: {}, error: json.error } };
    return { data: json };
  } catch (error) {
    return { data: { prices: {}, error: error.message } };
  }
}
