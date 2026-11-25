import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// Server-side Premium check for the AI edge functions. The client gates the
// UI too, but this is what actually protects the (billed) model calls.
//
// Source of truth is the `subscriptions` table (written by the
// revenuecat-webhook function). Right after a purchase the webhook can lag a
// few seconds, so a missing/expired row falls back to RevenueCat's REST API
// and caches the answer back into the table.
//
// Secrets: REVENUECAT_SECRET_KEY (RevenueCat → API keys → secret key).
// Without it, the fallback is skipped and only the table counts.

export const ENTITLEMENT_ID = "pain_journaling_pro";

export interface SubscriptionRow {
  user_id: string;
  entitlement: string;
  product_id: string | null;
  period_type: "trial" | "intro" | "normal" | null;
  expires_at: string | null;
  will_renew: boolean;
  updated_at: string;
}

export function isActiveRow(row: Pick<SubscriptionRow, "expires_at"> | null, now = new Date()): boolean {
  if (!row?.expires_at) return false;
  return new Date(row.expires_at).getTime() > now.getTime();
}

export function createAdminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalisePeriod(value: unknown): SubscriptionRow["period_type"] {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (lower === "trial" || lower === "intro" || lower === "normal") return lower;
  return null;
}

async function fetchFromRevenueCat(userId: string): Promise<Omit<SubscriptionRow, "updated_at"> | null> {
  const key = Deno.env.get("REVENUECAT_SECRET_KEY");
  if (!key) return null;
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const ent = body?.subscriber?.entitlements?.[ENTITLEMENT_ID];
    // Subscriptions only (no lifetime product): no expiry = not Premium.
    if (!ent?.expires_date) return null;
    const productId: string | null = typeof ent.product_identifier === "string" ? ent.product_identifier : null;
    const sub = productId ? body?.subscriber?.subscriptions?.[productId] : null;
    return {
      user_id: userId,
      entitlement: ENTITLEMENT_ID,
      product_id: productId,
      period_type: normalisePeriod(sub?.period_type),
      expires_at: ent.expires_date,
      will_renew: sub ? !sub.unsubscribe_detected_at : false,
    };
  } catch {
    return null;
  }
}

export type PremiumCheck = { ok: true } | { ok: false; response: Response };

/**
 * `admin` must be a service-role client (the user can't write subscriptions).
 * Returns a ready 402 Response with `error_code: 'premium_required'` when the
 * user isn't Premium, so callers can `if (!check.ok) return check.response`.
 */
export async function requirePremium(
  admin: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<PremiumCheck> {
  const { data } = await admin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (isActiveRow(data)) return { ok: true };

  const fresh = await fetchFromRevenueCat(userId);
  if (fresh && isActiveRow(fresh)) {
    await admin.from("subscriptions").upsert({ ...fresh, updated_at: new Date().toISOString() });
    return { ok: true };
  }

  return {
    ok: false,
    response: new Response(
      JSON.stringify({ error: "Premium required.", error_code: "premium_required" }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    ),
  };
}
