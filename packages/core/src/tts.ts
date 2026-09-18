const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export interface SpeechResult {
  audioBase64: string;
  contentType: string;
}

// Fixed confirmation phrases ("Jag öppnar ekonomin.", etc.) repeat constantly,
// so their audio is cached in memory — avoids a real ElevenLabs round-trip
// (300-800ms) on every panel command. Capped to stay bounded; in-flight
// requests are deduped too, so two rapid identical calls only hit the API once.
const MAX_CACHE_ENTRIES = 100;
const resultCache = new Map<string, SpeechResult | null>();
const inFlight = new Map<string, Promise<SpeechResult | null>>();

function cacheKey(voiceId: string, text: string): string {
  return `${voiceId}::${text}`;
}

export async function synthesizeSpeech(text: string): Promise<SpeechResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId || !text.trim()) return null;

  const key = cacheKey(voiceId, text);
  const cached = resultCache.get(key);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = synthesizeSpeechUncached(text, apiKey, voiceId)
    .then((result) => {
      if (resultCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = resultCache.keys().next().value;
        if (oldestKey !== undefined) resultCache.delete(oldestKey);
      }
      resultCache.set(key, result);
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

async function synthesizeSpeechUncached(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<SpeechResult | null> {
  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBase64: Buffer.from(arrayBuffer).toString("base64"),
    contentType: "audio/mpeg",
  };
}
