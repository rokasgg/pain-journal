import { createClient } from "npm:@supabase/supabase-js@2";

// Permanently deletes the calling user's account and all their data.
// Required for App Store review (guideline 5.1.1(v): apps with account
// creation must offer in-app account deletion).
//
// The user is identified ONLY from their own session (anon client + their
// Authorization header) — never from the request body — and the deletion
// itself uses the service-role key, which is available to edge functions as
// SUPABASE_SERVICE_ROLE_KEY and never ships in the app.
//
// Rows are deleted table by table rather than relying on FK cascades: several
// tables were created in the Supabase dashboard and their cascade setup isn't
// guaranteed. Deploy with: supabase functions deploy delete-account

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Children before parents. muscle_findings go with physio_assessments
// (assessment_id FK, on delete cascade).
const USER_TABLES = [
  "exercise_logs",
  "routines",
  "physio_assessments",
  "flare_ups",
  "checkins",
  "reminder_settings",
] as const;

const AVATAR_BUCKET = "avatars";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not authenticated." }, 401);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not authenticated." }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) return json({ error: `Could not delete ${table}: ${error.message}` }, 500);
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", user.id);
  if (profileError) return json({ error: `Could not delete profile: ${profileError.message}` }, 500);

  // Avatar files live under `${userId}/...` — best-effort; a leftover image
  // must not block account deletion.
  const { data: files } = await admin.storage.from(AVATAR_BUCKET).list(user.id);
  if (files && files.length > 0) {
    await admin.storage.from(AVATAR_BUCKET).remove(files.map((file) => `${user.id}/${file.name}`));
  }

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) return json({ error: `Could not delete account: ${authError.message}` }, 500);

  return json({ deleted: true });
});
