import type { PanelId } from "@/store/useEiraStore";

export type CommandId =
  | "open-google-ads"
  | "open-customers"
  | "open-finance"
  | "open-tasks"
  | "open-traffic"
  | "open-bookings"
  | "close-panel"
  | "show-overview";

export const COMMAND_TO_PANEL: Partial<Record<CommandId, PanelId>> = {
  "open-google-ads": "google-ads",
  "open-customers": "customers",
  "open-finance": "finance",
  "open-tasks": "tasks",
  "open-traffic": "traffic",
  "open-bookings": "bookings",
};

export const COMMAND_CONFIRMATIONS: Record<CommandId, string> = {
  "open-google-ads": "Jag öppnar Google Ads.",
  "open-customers": "Jag visar kunderna.",
  "open-finance": "Jag öppnar ekonomin.",
  "open-tasks": "Jag visar dagens uppgifter.",
  "open-traffic": "Jag öppnar webbtrafiken.",
  "open-bookings": "Jag visar dagens jobb.",
  "close-panel": "Jag stänger panelen.",
  "show-overview": "Jag visar översikten.",
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
    id: "open-customers",
    phrases: [
      "öppna kunder",
      "visa kundbasen",
      "visa kunder",
      "open customers",
      "show customers",
    ],
  },
  {
    id: "open-finance",
    phrases: [
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
      "öppna bokningar",
      "visa bokningar",
      "visa mina bokningar",
      "dagens bokningar",
      "kommande bokningar",
      "visa dagens jobb",
      "öppna dagens jobb",
      "open bookings",
      "show bookings",
    ],
  },
  {
    id: "close-panel",
    phrases: [
      "stäng panelen",
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
  id: CommandId;
  panel: PanelId | null;
  confirmation: string;
}

export function matchCommand(rawText: string): CommandMatch | null {
  const normalized = normalize(rawText);
  const folded = fold(normalized);

  for (const command of COMMANDS) {
    for (const phrase of command.phrases) {
      const normalizedPhrase = normalize(phrase);
      const foldedPhrase = fold(normalizedPhrase);
      if (normalized.includes(normalizedPhrase) || folded.includes(foldedPhrase)) {
        return {
          id: command.id,
          panel: COMMAND_TO_PANEL[command.id] ?? null,
          confirmation: COMMAND_CONFIRMATIONS[command.id],
        };
      }
    }
  }

  return null;
}
