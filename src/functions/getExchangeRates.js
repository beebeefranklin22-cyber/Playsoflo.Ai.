export async function getExchangeRates() {
  try {
    const res = await fetch('/api/prices?type=fx');
    const json = await res.json();
    if (!res.ok) return { data: { rates: {}, error: json.error } };
    return { data: json };
  } catch (error) {
    return { data: { rates: {}, error: error.message } };
  }
}
