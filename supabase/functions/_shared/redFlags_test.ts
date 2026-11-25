import { assertEquals } from "jsr:@std/assert@1";
import { detectRedFlag } from "./redFlags.ts";

const POSITIVE = [
  "Man nutirpo ranka",
  "ranka tirpsta nuo vakar",
  "Jaučiu silpnumą kairėje kojoje",
  "nebejaučiu pirštų",
  "Nuo ryto nelaikau šlapimo",
  "negaliu kontroliuoti tuštinimosi",
  "Staiga labai stiprus skausmas nugaroje",
  "skauda krūtinę",
  "sunku kvėpuoti",
  "sunku kalbėti ir praradau pusiausvyrą",
  "My left arm went numb",
  "tingling in my hands since this morning",
  "weakness in my leg",
  "I lost bladder control",
  "sudden severe pain in my neck",
  "chest pain when I walk",
  "I can't breathe properly",
  "trouble walking today",
];

const NEGATIVE = [
  "Ar miegas veikia mano skausmą?",
  "Sustingęs kaklas rytais",
  "Kaip praėjo mano savaitė?",
  "Ar treniruotės padeda?",
  "Ranka nebetirpsta",
  "nėra tirpimo rankose",
  "How was my week?",
  "Is there a link between sleep and pain?",
  "no numbness in my arms",
  "My neck pain is worse in the evening",
];

Deno.test("detects red flags in Lithuanian and English", () => {
  for (const text of POSITIVE) assertEquals(detectRedFlag(text), true, text);
});

Deno.test("leaves ordinary questions alone", () => {
  for (const text of NEGATIVE) assertEquals(detectRedFlag(text), false, text);
});
