export async function createSetupIntent() {
  const res = await fetch('/api/setup-intent', { method: 'POST' });
  const data = await res.json();
  return { data };
}
