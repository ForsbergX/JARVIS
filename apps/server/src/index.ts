import "dotenv/config";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import {
  Agent,
  createDefaultToolRegistry,
  db,
  synthesizeSpeech,
  type ChatMessage,
} from "@jarvis/core";

const PORT = Number(process.env.PORT ?? 4000);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocket);

const tools = createDefaultToolRegistry();
const agent = new Agent(tools);

app.get("/health", async () => ({ status: "ok" }));

// Speaks fixed confirmation text for local voice commands (e.g. "Jag öppnar
// ekonomin.") without invoking the Claude agent — no key ever reaches the client.
// Always echoes back `text` too: if ElevenLabs audio is missing (quota/plan
// issue), the client falls back to the browser's own speechSynthesis with
// that same text, silently — the user never sees an error either way.
app.post<{ Body: { text?: string } }>("/speak", async (request, reply) => {
  const text = request.body?.text;
  if (!text || !text.trim()) {
    return reply.code(400).send({ error: "Missing text" });
  }
  const startedAt = Date.now();
  try {
    const speech = await synthesizeSpeech(text);
    app.log.info({ ms: Date.now() - startedAt, text }, "/speak resolved");
    return { audio: speech?.audioBase64, audioType: speech?.contentType, text };
  } catch (error) {
    app.log.warn(
      { err: error },
      "ElevenLabs TTS failed for /speak — check ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID / credits"
    );
    return { audio: undefined, audioType: undefined, text };
  }
});

app.get("/ws", { websocket: true }, (socket) => {
  let conversationId: string | undefined;
  const history: ChatMessage[] = [];

  socket.on("message", async (raw: Buffer) => {
    try {
      const data = JSON.parse(raw.toString()) as {
        conversationId?: string;
        message: string;
        uiContext?: unknown;
      };

      if (!conversationId) {
        try {
          conversationId = data.conversationId ?? (await db.createConversation());
        } catch (error) {
          app.log.warn(
            { err: error },
            "Postgres unavailable — continuing with in-memory history for this session"
          );
          conversationId = data.conversationId ?? randomUUID();
        }
        socket.send(JSON.stringify({ type: "conversation", conversationId }));
      }

      const userMessage: ChatMessage = { role: "user", content: data.message };
      history.push(userMessage);
      await db.appendMessage(conversationId, userMessage).catch(() => {});

      // Sentences are sent to the client as soon as Claude produces them —
      // the client's speechSynthesis (its primary, active voice) starts
      // talking before the full reply is ready. No ElevenLabs call here:
      // that's kept dormant in synthesizeSpeech/tts.ts, not part of the
      // active voice flow.
      const onSentence = (sentence: string) => {
        socket.send(JSON.stringify({ type: "speech-chunk", text: sentence }));
      };

      const reply = await agent.respond(history, onSentence, data.uiContext);
      history.push({ role: "assistant", content: reply });
      await db.appendMessage(conversationId, { role: "assistant", content: reply }).catch(() => {});

      socket.send(JSON.stringify({ type: "message", role: "assistant", content: reply }));
    } catch (error) {
      app.log.error(error);
      socket.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  });
});

async function start() {
  try {
    await db.initSchema();
  } catch (error) {
    app.log.warn(
      { err: error },
      "Could not init DB schema on startup — check DATABASE_URL / that Postgres is running"
    );
  }

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
