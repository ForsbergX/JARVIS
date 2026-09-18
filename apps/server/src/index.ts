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

// Speaks fixed confirmation text for local voice commands (e.g. "Google Ads
// öppnat.") without invoking the Claude agent — no key ever reaches the client.
app.post<{ Body: { text?: string } }>("/speak", async (request, reply) => {
  const text = request.body?.text;
  if (!text || !text.trim()) {
    return reply.code(400).send({ error: "Missing text" });
  }
  try {
    const speech = await synthesizeSpeech(text);
    return { audio: speech?.audioBase64, audioType: speech?.contentType };
  } catch (error) {
    app.log.warn(
      { error },
      "ElevenLabs TTS failed for /speak — check ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID"
    );
    return { audio: undefined, audioType: undefined };
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
      };

      if (!conversationId) {
        try {
          conversationId = data.conversationId ?? (await db.createConversation());
        } catch (error) {
          app.log.warn(
            { error },
            "Postgres unavailable — continuing with in-memory history for this session"
          );
          conversationId = data.conversationId ?? randomUUID();
        }
        socket.send(JSON.stringify({ type: "conversation", conversationId }));
      }

      const userMessage: ChatMessage = { role: "user", content: data.message };
      history.push(userMessage);
      await db.appendMessage(conversationId, userMessage).catch(() => {});

      const reply = await agent.respond(history);
      history.push({ role: "assistant", content: reply });
      await db.appendMessage(conversationId, { role: "assistant", content: reply }).catch(() => {});

      let speech: Awaited<ReturnType<typeof synthesizeSpeech>> = null;
      try {
        speech = await synthesizeSpeech(reply);
      } catch (error) {
        app.log.warn(
          { error },
          "ElevenLabs TTS failed — check ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID"
        );
      }

      socket.send(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: reply,
          audio: speech?.audioBase64,
          audioType: speech?.contentType,
        })
      );
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
      { error },
      "Could not init DB schema on startup — check DATABASE_URL / that Postgres is running"
    );
  }
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
