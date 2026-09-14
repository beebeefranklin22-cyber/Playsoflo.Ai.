import { useEffect } from 'react';

export const REFERRAL_STORAGE_KEY = 'psf_referral_code';

// Captures ?ref=CODE from the URL (AffiliateProgram.jsx's referral links)
// into localStorage so it survives from the link click through to signup,
// where AuthContext.register() reads it back and stamps it on the new
// profile as referred_by_code. Without this, a referral link never
// actually attributed anyone -- nothing captured the code before now.
export default function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      try {
        localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
      } catch {
        // localStorage unavailable (private mode, etc.) -- referral
        // attribution is best-effort, never worth breaking the page for.
      }
    }
  }, []);
  return null;
}
