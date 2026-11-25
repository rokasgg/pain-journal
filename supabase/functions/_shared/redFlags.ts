// Hard-coded red-flag escalation for the AI chat. It runs on the user's
// message BEFORE the Premium check, the daily limit and any model call, so
// a safety reply never depends on the model or on a quota. The model's own
// `red_flag` kind stays as a second net for wording this misses.
//
// It errs on the side of escalating: a false positive shows a "see a doctor"
// card, a false negative could hurt someone. It never diagnoses.

export type RedFlagLocale = "en" | "lt";

export const RED_FLAG_MESSAGE: Record<RedFlagLocale, string> = {
  en: "What you describe may need a doctor's assessment soon. Don't wait for your next scheduled visit: contact a doctor today, and if symptoms are severe, getting worse quickly or come with other problems, call 112.",
  lt: "Tai, ką aprašote, gali reikėti skubaus gydytojo įvertinimo. Nelaukite kito vizito: kreipkitės į gydytoją šiandien, o jei simptomai stiprūs, greitai blogėja ar kartu atsiranda kitų negalavimų, skambinkite 112.",
};

/** Lowercase and strip diacritics ("šlapimo" → "slapimo", "krūtinė" → "krutine"). */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");
}

// Two patterns within `gap` characters of each other, in either order.
function near(a: string, b: string, gap = 40): RegExp {
  return new RegExp(`(?:${a})[^.?!\\n]{0,${gap}}(?:${b})|(?:${b})[^.?!\\n]{0,${gap}}(?:${a})`, "g");
}

const LIMB_LT = "\\b(?:rank|koj|pirst|plast|deln|peti)";
const LIMB_EN = "\\b(?:arms?|hands?|legs?|fingers?|feet|foot)\\b";

// `\b` before LT stems keeps "ne-" prefixed (negated) verbs from matching:
// "netirpsta" doesn't match \btirp.
const PATTERNS: RegExp[] = [
  // Numbness or weakness in an arm or leg.
  near("\\b(?:nu)?tirp|\\bsilpn|\\bnebejauc|\\bnejauc", LIMB_LT),
  near("\\bnumb|\\btingl|\\bweak|\\bcan'?t feel|\\bcannot feel|\\blost (?:the )?feeling", LIMB_EN),
  // Bladder or bowel control.
  near("\\bslapim|\\btustin", "\\bnelaik|\\bnesulaik|\\bkontrol|\\bnevaldau|\\bnegaliu"),
  /\bincontinen/g,
  near("\\bbladder|\\bbowel", "\\bcontrol|\\blost\\b|\\bloss\\b|\\bcan'?t\\b|\\bcannot\\b|\\bleak"),
  // Sudden severe pain.
  near("\\bstaig", "\\bstipr|\\baistr|\\bnepakel|\\bbaisu|\\bsmark"),
  near("\\bsudden", "\\bsevere|\\bworst\\b|\\bexcruciating|\\bunbearable|\\bintense"),
  // Chest pain, trouble breathing.
  near("\\bkrutin", "\\bskaud|\\bskaus|\\bspaud|\\bgel"),
  /\bdusin|\bdust(?:a|u)\b|\b(?:sunku|negaliu) kvepuot/g,
  /\bchest (?:pain|pressure|tightness)|\b(?:can'?t|cannot|hard to|trouble) breath|\bshort(?:ness)? of breath/g,
  // Loss of coordination, speech or walking.
  /\b(?:sunku|negaliu) (?:kalbet|vaiksciot|paeit)|\b(?:prarad|netek)\w* pusiausvyr|\bkoordinac/g,
  /\b(?:slurred|trouble|can'?t|cannot) (?:speak|talk|walk)|\blost (?:my )?balance|\bcoordination\b/g,
];

// "no numbness", "nėra tirpimo", "be silpnumo": a negation word just before
// the match means the user is saying they DON'T have it.
const NEGATION_BEFORE =
  /\b(?:no|not|without|never|don'?t|doesn'?t|didn'?t|isn'?t|haven'?t|nera|nebuvo|be|jokio|jokiu|jokios|joks)\b[^.?!\n]{0,12}$/;

export function detectRedFlag(text: string): boolean {
  const folded = foldText(text);
  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of folded.matchAll(pattern)) {
      const before = folded.slice(Math.max(0, (match.index ?? 0) - 24), match.index ?? 0);
      if (!NEGATION_BEFORE.test(before)) return true;
    }
  }
  return false;
}
