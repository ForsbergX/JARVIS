import pg from "pg";
import type { ChatMessage } from "./types.js";

const { Pool } = pg;

let pool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function createConversation(): Promise<string> {
  const result = await getPool().query<{ id: string }>(
    "INSERT INTO conversations DEFAULT VALUES RETURNING id"
  );
  return result.rows[0].id;
}

export async function appendMessage(
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  await getPool().query(
    "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
    [conversationId, message.role, message.content]
  );
}

export async function getHistory(conversationId: string): Promise<ChatMessage[]> {
  const result = await getPool().query<{ role: ChatMessage["role"]; content: string }>(
    "SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY id ASC",
    [conversationId]
  );
  return result.rows;
}
