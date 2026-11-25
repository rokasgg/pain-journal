import { assertEquals } from "jsr:@std/assert@1";
import { buildDataSummary, MAX_HISTORY_MESSAGES, sanitiseChatMessages } from "./chatInput.ts";

Deno.test("rejects an over-long question instead of cutting it", () => {
  const r = sanitiseChatMessages([{ role: "user", content: "a".repeat(501) }]);
  assertEquals(r, { ok: false, error_code: "message_too_long" });
});

Deno.test("needs a final user turn", () => {
  assertEquals(sanitiseChatMessages([]).ok, false);
  assertEquals(sanitiseChatMessages([{ role: "assistant", content: "hi" }]).ok, false);
  assertEquals(sanitiseChatMessages("nope").ok, false);
});

Deno.test("keeps the last turns, starting with a user turn, and drops junk", () => {
  const turns = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }));
  const r = sanitiseChatMessages([{ role: "system", content: "x" }, ...turns]);
  if (!r.ok) throw new Error("expected ok");
  assertEquals(r.messages.length <= MAX_HISTORY_MESSAGES, true);
  assertEquals(r.messages[0].role, "user");
  assertEquals(r.question, "m14");
});

Deno.test("summarises a day into one compact row", () => {
  const s = buildDataSummary(
    [
      { type: "morning", checkin_date: "2026-11-02", pain_level: 4, sleep_hours: 6.5, symptoms: { numbness: true }, notes: null },
      { type: "evening", checkin_date: "2026-11-02", pain_level: 2, did_exercises: false, triggers: [] },
      { type: "evening", checkin_date: "2026-11-01", pain_level: 0 },
    ],
    [],
  );
  assertEquals(s.days, [
    { d: "2026-11-01", e: { pain: 0 } },
    { d: "2026-11-02", m: { pain: 4, sym: ["numbness"], sh: 6.5 }, e: { pain: 2, ex: "none" } },
  ]);
  assertEquals(s.totals, { logged_days: 2, avg_pain: 1.5, pain_free_days: 1, flare_ups: 0 });
});
