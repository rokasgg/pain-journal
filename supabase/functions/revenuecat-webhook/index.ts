import { createAdminClient, ENTITLEMENT_ID } from "../_shared/entitlement.ts";

// RevenueCat → Supabase entitlement sync. RevenueCat POSTs every subscription
// event here; we keep one `subscriptions` row per user with the latest
// expiry. "Active" is always `expires_at > now()`, so a CANCELLATION (auto-
// renew turned off) keeps access until the period ends, and EXPIRATION just
// confirms it.
//
// Setup:
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random string>
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   RevenueCat → Integrations → Webhooks: URL = .../functions/v1/revenuecat-webhook,
//   Authorization header = "Bearer <the same random string>".
//
// app_user_id is the Supabase user id (the app calls Purchases.logIn(user.id)).
// Anonymous ids ($RCAnonymousID:...) are ignored: they aren't a Supabase user.

interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_to?: string[];
  product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: string;
  expiration_at_ms?: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function supabaseUserId(event: RevenueCatEvent): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return candidates.find((id): id is string => typeof id === "string" && UUID_RE.test(id)) ?? null;
}

function periodType(value: string | undefined): "trial" | "intro" | "normal" | null {
  const lower = value?.toLowerCase();
  return lower === "trial" || lower === "intro" || lower === "normal" ? lower : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let event: RevenueCatEvent;
  try {
    const body = await req.json();
    event = body?.event ?? {};
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // TEST events from the dashboard: acknowledge without writing.
  if (event.type === "TEST") return json({ ok: true, test: true });

  const admin = createAdminClient();

  // TRANSFER: the purchase moved to another app user id (e.g. restore on a
  // different account). Drop it from the old users; the new owner gets their
  // own event/REST refresh.
  if (event.type === "TRANSFER") {
    const from = (event.aliases ?? []).filter((id) => UUID_RE.test(id));
    for (const id of from) {
      if (event.transferred_to?.includes(id)) continue;
      await admin.from("subscriptions").update({ expires_at: new Date().toISOString(), will_renew: false, updated_at: new Date().toISOString() }).eq("user_id", id);
    }
    return json({ ok: true });
  }

  const userId = supabaseUserId(event);
  if (!userId) return json({ ok: true, ignored: "no supabase user id" });

  const entitlements = event.entitlement_ids ?? [];
  if (entitlements.length > 0 && !entitlements.includes(ENTITLEMENT_ID)) {
    return json({ ok: true, ignored: "other entitlement" });
  }

  // Subscriptions only (no lifetime product), so every grant has an expiry.
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const willRenew = !["CANCELLATION", "EXPIRATION", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED"].includes(event.type ?? "");

  const row: Record<string, unknown> = {
    user_id: userId,
    entitlement: ENTITLEMENT_ID,
    product_id: event.product_id ?? null,
    period_type: periodType(event.period_type),
    will_renew: willRenew,
    updated_at: new Date().toISOString(),
  };
  // Keep the last known expiry when an event doesn't carry one.
  if (expiresAt) row.expires_at = expiresAt;

  const { error } = await admin.from("subscriptions").upsert(row);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
