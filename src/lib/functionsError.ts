import { t } from '@/lib/i18n/useTranslation';
import { queryClient } from '@/lib/queryClient';

// supabase-js's `functions.invoke()` only puts a generic "Edge Function
// returned a non-2xx status code" in `error.message` when a function
// responds with a non-2xx status — the actual `{ error: "..." }` body our
// functions return lives on `error.context`, the raw fetch `Response`
// object, and nothing reads it automatically. Every AI edge-function hook
// hit this: a real error (missing secret, bad input, DB error) always
// surfaced as that one generic string instead of the specific reason.
export async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const context = (error as { context?: unknown })?.context;
    if (context && typeof (context as Response).json === 'function') {
      const body = await (context as Response).json();
      // 402 from _shared/entitlement.ts: the server says this user isn't
      // Premium (client and server disagreed, e.g. it just expired). Refetch
      // the entitlement so the UI locks too, and say it plainly.
      if (body?.error_code === 'premium_required') {
        queryClient.invalidateQueries({ queryKey: ['premium'] });
        return t('premium.requiredError');
      }
      if (typeof body?.error === 'string' && body.error) return body.error;
    }
  } catch {
    // context wasn't a Response with a JSON body (e.g. a network-level
    // failure) — fall through to the generic message.
  }
  return fallback;
}
