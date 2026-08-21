/**
 * Paystack public config.
 *
 * The public key below is safe to have in client-side code — it's
 * designed to be exposed, the same way the Supabase anon key is.
 * It can only initiate a checkout popup; it can't move money or
 * verify anything on its own. The actual security boundary is the
 * secret key used in /api/verify-payment.js, which never appears in
 * this file or anywhere else in the browser-shipped code.
 *
 * REPLACE THIS with your real public key from your Paystack dashboard
 * (Settings -> API Keys & Webhooks) before going live. Use the "test"
 * key while testing, switch to the "live" key only once you're ready
 * to accept real payments.
 */
export const PAYSTACK_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY";

export const STAGE_PRICE_NAIRA = 2500;
export const BUNDLE_PRICE_NAIRA = 13000;
