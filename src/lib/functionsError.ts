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
      if (typeof body?.error === 'string' && body.error) return body.error;
    }
  } catch {
    // context wasn't a Response with a JSON body (e.g. a network-level
    // failure) — fall through to the generic message.
  }
  return fallback;
}
