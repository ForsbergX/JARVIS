// The Web Speech API exposes no gender/pitch metadata on SpeechSynthesisVoice
// — only name/lang/uri — so "darkest available male voice" has to be
// approximated: prefer a Swedish voice whose name hints male, then a British
// English voice whose name hints male, then whatever Swedish/English voice
// is available. Actual "darkness" comes from the pitch/rate tuning applied
// to whichever voice gets picked, in playFallbackSpeech.
const MALE_NAME_HINTS = [
  "bengt",
  "david",
  "mattias",
  "erik",
  "henrik",
  "magnus",
  "daniel",
  "george",
  "james",
  "arthur",
  "ryan",
  "oliver",
  "male",
  "man",
  "guy",
];

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Some browsers never fire voiceschanged (voices already loaded, or the
    // list stays empty) — don't hang the queue waiting for it.
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

function isMaleNamed(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  return MALE_NAME_HINTS.some((hint) => name.includes(hint));
}

export function pickDarkMaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const swedish = voices.filter((v) => v.lang?.toLowerCase().startsWith("sv"));
  const swedishMale = swedish.find(isMaleNamed);
  if (swedishMale) return swedishMale;

  const british = voices.filter((v) => v.lang?.toLowerCase().startsWith("en-gb"));
  const britishMale = british.find(isMaleNamed);
  if (britishMale) return britishMale;

  if (swedish.length > 0) return swedish[0];
  if (british.length > 0) return british[0];
  return undefined;
}
