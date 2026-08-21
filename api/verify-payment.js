/**
 * POST /api/verify-payment
 *
 * Verifies a Paystack transaction server-side, then grants access in
 * Supabase. This step exists because the frontend can never be
 * trusted to say "the payment succeeded" — anyone can edit
 * client-side JS in their browser and fake a success callback. The
 * only trustworthy source of truth is asking Paystack directly, with
 * a secret key that never reaches the browser.
 *
 * Body: { reference: string, userId: string, purchaseType: "bundle" | "stage", stageId?: number }
 *
 * Required environment variables (set in Vercel dashboard, never in
 * the repo):
 *   PAYSTACK_SECRET_KEY        — from your Paystack dashboard
 *   SUPABASE_SERVICE_ROLE_KEY  — from Supabase Project Settings -> API
 *                                 (the "service_role" key, NOT anon —
 *                                 this bypasses RLS on purpose, which
 *                                 is exactly why it must stay a
 *                                 server-side secret and never ship in
 *                                 client code)
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://osrelodwmcuswcrxnblg.supabase.co";

// Prices are enforced here, not trusted from the request — this is
// what stops someone from tampering with the amount client-side and
// paying ₦1 for a ₦13,000 bundle.
const STAGE_PRICE_KOBO = 250000; // ₦2,500
const BUNDLE_PRICE_KOBO = 1300000; // ₦13,000

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { reference, userId, purchaseType, stageId } = req.body || {};

  if (!reference || !userId || !purchaseType) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (purchaseType === "stage" && !stageId) {
    return res.status(400).json({ error: "stageId required for a stage purchase" });
  }

  try {
    // 1. Ask Paystack directly whether this transaction really succeeded.
    const verifyResp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const verifyJson = await verifyResp.json();

    if (!verifyJson.status || verifyJson.data?.status !== "success") {
      return res.status(400).json({ error: "Payment not verified as successful" });
    }

    // 2. Confirm the amount actually paid matches what this purchase
    // type should cost — never trust an amount from the client.
    const expectedAmount =
      purchaseType === "bundle" ? BUNDLE_PRICE_KOBO : STAGE_PRICE_KOBO;
    if (verifyJson.data.amount !== expectedAmount) {
      return res.status(400).json({ error: "Amount paid does not match expected price" });
    }

    // 3. Grant access using the service_role key, which bypasses RLS
    // — this is the one place in the whole app allowed to do that,
    // and it's server-side only, gated behind a real verified payment.
    const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (purchaseType === "bundle") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_paid: true })
        .eq("id", userId);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const { data: profile, error: fetchErr } = await supabaseAdmin
        .from("profiles")
        .select("unlocked_stages")
        .eq("id", userId)
        .single();
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });

      const current = profile?.unlocked_stages || [];
      const numericStageId = Number(stageId);
      if (!current.includes(numericStageId)) current.push(numericStageId);

      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ unlocked_stages: current })
        .eq("id", userId);
      if (updateErr) return res.status(500).json({ error: updateErr.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected error" });
  }
}
