// A minimal per-user, per-channel rate limit for outbound-message relays
// (email.js, sms.js) -- both accept an arbitrary `to` and message body from
// any authenticated user with no restriction at all, which is a real spam/
// harassment/cost-abuse vector (sending through the platform's own Resend
// domain or Twilio number). This doesn't restrict WHO can be messaged or
// WHAT can be said (the one legitimate caller of each endpoint needs that
// freedom), just how often one account can fire either off.
export async function enforceRateLimit(admin, { channel, userEmail, maxPerHour }) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from('outbound_message_log')
    .select('id', { count: 'exact', head: true })
    .eq('channel', channel)
    .eq('user_email', userEmail)
    .gte('created_at', since);
  if (countError) throw countError;
  if ((count || 0) >= maxPerHour) {
    throw new Error(`Rate limit exceeded: too many ${channel} messages sent recently. Please try again later.`);
  }

  const { error: insertError } = await admin.from('outbound_message_log').insert({ channel, user_email: userEmail });
  if (insertError) throw insertError;
}
