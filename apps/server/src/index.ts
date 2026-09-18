import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import {
  Agent,
  createDefaultToolRegistry,
  db,
  type ChatMessage,
} from "@jarvis/core";

const PORT = Number(process.env.PORT ?? 4000);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocket);

const tools = createDefaultToolRegistry();
const agent = new Agent(tools);

app.get("/health", async () => ({ status: "ok" }));

app.get("/ws", { websocket: true }, (socket) => {
  let conversationId: string | undefined;

  socket.on("message", async (raw: Buffer) => {
    try {
      const data = JSON.parse(raw.toString()) as {
        conversationId?: string;
        message: string;
      };

      if (!conversationId) {
        conversationId = data.conversationId ?? (await db.createConversation());
        socket.send(JSON.stringify({ type: "conversation", conversationId }));
      }

      const userMessage: ChatMessage = { role: "user", content: data.message };
      await db.appendMessage(conversationId, userMessage);

      const history = await db.getHistory(conversationId);
      const reply = await agent.respond(history);
      await db.appendMessage(conversationId, { role: "assistant", content: reply });

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
      { error },
      "Could not init DB schema on startup — check DATABASE_URL / that Postgres is running"
    );
  }
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
