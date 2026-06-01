// Synthesized notification sounds using Web Audio API — no file dependencies
let audioContext = null;

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playTone(frequency, duration, type = 'sine', gain = 0.3, delay = 0) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime + delay);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// ── Sound presets ──

/** Default ding — bright two-tone chime */
export function playNotificationDing() {
  try {
    playTone(880, 0.15, 'sine', 0.25, 0);
    playTone(1174.66, 0.2, 'sine', 0.2, 0.12);
  } catch {}
}

/** Message received — soft triple bubble */
export function playMessageSound() {
  try {
    playTone(523.25, 0.1, 'sine', 0.2, 0);
    playTone(659.25, 0.1, 'sine', 0.2, 0.1);
    playTone(783.99, 0.15, 'sine', 0.18, 0.2);
  } catch {}
}

/** Payment / money — ascending cash-register chime */
export function playPaymentSound() {
  try {
    playTone(659.25, 0.12, 'triangle', 0.25, 0);
    playTone(783.99, 0.12, 'triangle', 0.22, 0.1);
    playTone(1046.5, 0.18, 'triangle', 0.2, 0.2);
    playTone(1318.51, 0.25, 'sine', 0.15, 0.3);
  } catch {}
}

/** Ride / delivery update — warm pulse */
export function playRideSound() {
  try {
    playTone(440, 0.12, 'sine', 0.22, 0);
    playTone(554.37, 0.12, 'sine', 0.2, 0.12);
    playTone(659.25, 0.2, 'sine', 0.18, 0.24);
  } catch {}
}

/** Success — celebratory ascending arpeggio */
export function playSuccessSound() {
  try {
    playTone(523.25, 0.1, 'sine', 0.2, 0);
    playTone(659.25, 0.1, 'sine', 0.2, 0.08);
    playTone(783.99, 0.1, 'sine', 0.2, 0.16);
    playTone(1046.5, 0.25, 'sine', 0.22, 0.24);
  } catch {}
}

/** Error / alert — low attention-grabbing pulse */
export function playAlertSound() {
  try {
    playTone(440, 0.15, 'square', 0.12, 0);
    playTone(349.23, 0.2, 'square', 0.1, 0.18);
  } catch {}
}

/** Pick the right sound for a notification type */
export function playSoundForType(type) {
  const paymentTypes = ['payment_received', 'payment_completed', 'tip_received', 'escrow_released'];
  const messageTypes = ['new_message', 'message', 'direct_message', 'new_comment', 'comment_reply'];
  const rideTypes = ['ride_request', 'ride_update'];
  const successTypes = ['booking_confirmed', 'booking_completed'];
  const alertTypes = ['booking_cancelled', 'dispute_opened'];

  if (paymentTypes.includes(type)) return playPaymentSound();
  if (messageTypes.includes(type)) return playMessageSound();
  if (rideTypes.includes(type)) return playRideSound();
  if (successTypes.includes(type)) return playSuccessSound();
  if (alertTypes.includes(type)) return playAlertSound();
  return playNotificationDing();
}