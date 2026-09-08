// Pure validation/sanitization — no DB access needed. Mirrors what a
// "submit your listing" form needs checked before it's created.
export async function validateListing({ listing_type, data } = {}) {
  const errors = [];
  const sanitized = { ...data };

  if (!data?.title?.trim()) errors.push('Title is required');
  else sanitized.title = data.title.trim();

  if (data?.description) sanitized.description = data.description.trim();

  const price = Number(data?.price ?? data?.price_per_night ?? data?.daily_rate);
  if (data?.price !== undefined || data?.price_per_night !== undefined || data?.daily_rate !== undefined) {
    if (!Number.isFinite(price) || price < 0) errors.push('Price must be a positive number');
  }

  if (listing_type === 'property' && !data?.address?.trim() && !data?.location?.trim()) {
    errors.push('Address or location is required');
  }

  if (listing_type === 'experience' && !data?.provider_email) {
    errors.push('Provider email is required');
  }

  return { data: { valid: errors.length === 0, errors, sanitized_data: sanitized } };
}
