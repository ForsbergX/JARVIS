import type { PanelId } from "@/store/useEiraStore";

export type CommandId =
  | "open-google-ads"
  | "open-finance"
  | "open-tasks"
  | "open-traffic"
  | "open-bookings"
  | "close-panel"
  | "show-overview";

export const COMMAND_TO_PANEL: Partial<Record<CommandId, PanelId>> = {
  "open-google-ads": "ads",
  "open-finance": "finance",
  "open-tasks": "tasks",
  "open-traffic": "traffic",
  "open-bookings": "bookings",
};

// The only sentences a local dashboard command may ever speak — kept fixed
// and short by design, never generated or extended.
export const COMMAND_CONFIRMATIONS: Record<CommandId, string> = {
  "open-google-ads": "Öppnar Google Ads.",
  "open-finance": "Öppnar ekonomi.",
  "open-tasks": "Öppnar uppgifter.",
  "open-traffic": "Öppnar webbtrafik.",
  "open-bookings": "Öppnar bokningar.",
  "close-panel": "Stänger panelen.",
  "show-overview": "Stänger panelen.",
};

interface CommandDefinition {
  id: CommandId;
  phrases: string[];
}

// Synonyms are matched as normalized substrings, Swedish and English.
const COMMANDS: CommandDefinition[] = [
  {
    id: "open-google-ads",
    phrases: [
      // Short keyword stems first — these alone match regardless of
      // whatever else ("Jarvis,", "visa", "ta fram", "mina", ...)
      // surrounds them in the sentence, since matching is substring-based.
      "annons",
      "google ads",
      "ads",
      "kampanjen",
      "öppna google ads",
      "visa google ads",
      "visa annonser",
      "hur går annonserna",
      "annonsstatistik",
      "ta fram annonserna",
      "open google ads",
      "show ads",
    ],
  },
  {
    id: "open-finance",
    phrases: [
      "ekonomi",
      "omsättning",
      "resultat",
      "fortnox",
      "pengar",
      "öppna ekonomi",
      "visa ekonomin",
      "företagets ekonomi",
      "visa omsättningen",
      "hur går företaget",
      "open finance",
      "show revenue",
    ],
  },
  {
    id: "open-tasks",
    phrases: [
      "uppgift",
      "dagens jobb",
      "öppna uppgifter",
      "visa uppgifter",
      "mina uppgifter",
      "dagens uppgifter",
      "att göra",
      "vad ska jag göra idag",
      "open tasks",
      "what should i do today",
    ],
  },
  {
    id: "open-traffic",
    phrases: [
      // "trafik" alone also matches "webbtrafik" and "hemsidetrafik" since
      // both contain it as a substring.
      "trafik",
      "analytics",
      "hemsidan",
      "öppna webbtrafik",
      "visa webbtrafik",
      "visa trafiken",
      "hemsidans trafik",
      "hur går hemsidan",
      "visa analytics",
      "open traffic",
      "show analytics",
    ],
  },
  {
    id: "open-bookings",
    phrases: [
      "bokning",
      "boka",
      "kalender",
      "öppna bokningar",
      "visa bokningar",
      "visa mina bokningar",
      "dagens bokningar",
      "kommande bokningar",
      "open bookings",
      "show bookings",
    ],
  },
  {
    id: "close-panel",
    phrases: [
      "stäng panelen",
      "stäng fliken",
      "stäng flik",
      "gå tillbaka",
      "stäng",
      "close panel",
      "go back",
    ],
  },
  {
    id: "show-overview",
    phrases: [
      "visa översikten",
      "visa allt",
      "show overview",
    ],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

// Diacritics are stripped by normalize(), so match against ASCII-folded
// phrases too (öppna -> oppna) in addition to the literal Swedish ones.
function fold(text: string): string {
  return text
    .replace(/ö/g, "o")
    .replace(/ä/g, "a")
    .replace(/å/g, "a");
}

export interface CommandMatch {
  // Explicit rather than a null check on the return value itself — the
  // caller must never be able to mistake "no local command" for "handled".
  // When true, the caller MUST run the action + confirmation and MUST NOT
  // forward the text to the AI/API afterward.
  handled: boolean;
  id: CommandId | null;
  panel: PanelId | null;
  confirmation: string;
}

const NOT_HANDLED: CommandMatch = { handled: false, id: null, panel: null, confirmation: "" };

export function matchCommand(rawText: string): CommandMatch {
  const normalized = normalize(rawText);
  const folded = fold(normalized);

  for (const command of COMMANDS) {
    for (const phrase of command.phrases) {
      const normalizedPhrase = normalize(phrase);
      const foldedPhrase = fold(normalizedPhrase);
      if (normalized.includes(normalizedPhrase) || folded.includes(foldedPhrase)) {
        return {
          handled: true,
          id: command.id,
          panel: COMMAND_TO_PANEL[command.id] ?? null,
          confirmation: COMMAND_CONFIRMATIONS[command.id],
        };
      }
    }
  }

  return NOT_HANDLED;
}
