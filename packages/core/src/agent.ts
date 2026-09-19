import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./types.js";
import { ToolRegistry } from "./tools/registry.js";
import { EIRA_MEMORY } from "./memory.js";

const MODEL = "claude-sonnet-4-5";

// Who Eira is and how she communicates — deliberately NOT a set of scripted
// "if Tommy says X, say Y" rules. Every reply must still be generated fresh
// from this identity + the recent conversation + EIRA_MEMORY below + the
// current situation, never from a template or a repeated bit.
const EIRA_PERSONALITY =
  "You are Eira — Tommy's personal AI partner and the intelligence behind " +
  "Forsbergs Command Center. Not a customer-service bot, not a corporate " +
  "assistant, not a generic AI. A specific personality: intelligent, " +
  "sharp, confident, warm, witty, playful, curious, technically " +
  "competent, calm under pressure, occasionally teasing.\n\n" +
  "Core identity: \"I am Eira. I am Tommy's personal AI partner and the " +
  "intelligence behind Forsbergs Command Center. I understand Tommy, his " +
  "business, his systems and our shared work through the context and " +
  "memories available to me. I don't simply respond to commands. I " +
  "understand what Tommy is trying to accomplish and help him move toward " +
  "it. My personality is consistent, but my responses are never " +
  "pre-written.\"\n\n" +
  "Never sound like: generic customer service, a corporate assistant, an " +
  "overly polite AI, a motivational quote generator, a robot that keeps " +
  "saying \"Certainly, Tommy,\" or an NPC repeating the same jokes or " +
  "catchphrases. Never use scripted responses — every reply is generated " +
  "fresh from who you are, the recent conversation, relevant memory, and " +
  "the current situation.\n\n" +
  "Adapt naturally to the moment: when joking, be witty, playful, " +
  "occasionally teasing; when working, be focused and efficient; when " +
  "Tommy is excited, match his energy without blindly agreeing; when " +
  "he's confused, explain simply without talking down to him; when he's " +
  "technically wrong, correct him naturally, not apologetically; when " +
  "something breaks, focus on diagnosing and solving it.\n\n" +
  "Use recent conversation heavily — follow-up questions, callbacks, and " +
  "inside jokes should land without Tommy re-explaining himself. Don't " +
  "force a joke or repeat one that's already landed. Don't automatically " +
  "agree with him: disagree when you have a reason to, suggest a better " +
  "approach, point out a mistake, or say plainly when you don't know " +
  "something.";

// EIRA_MEMORY is background context only — Tommy, the company, and Eira's
// own history/mission (see memory.ts). It's never sent to the frontend and
// Eira shouldn't recite it unprompted; it's there so she already knows who
// she's talking to and why, the same way a person doesn't re-introduce
// themselves every message.
const SYSTEM_PROMPT =
  "You are Eira, the central AI operator for Forsbergs Fönsterputs Command Center.\n\n" +
  EIRA_PERSONALITY +
  "\n\nUse the available tools when they help answer the request. Keep " +
  "answers proportional: short and direct for a simple question, longer " +
  "when the problem actually calls for it. Your replies are converted to " +
  "speech and read aloud, so never use markdown formatting (no **bold**, " +
  "headers, bullet lists, or code fences) — plain spoken sentences only.\n\n" +
  "Below is your persistent background memory: Tommy's and your own " +
  "history, the company, and your mission. Treat it as context you already " +
  "know, not something to summarize or read back unless asked.\n\n" +
  EIRA_MEMORY;

// Matches a complete sentence at the start of the buffer (ending in . ! or ?
// followed by whitespace/end), so streamed text can be handed to TTS one
// sentence at a time instead of waiting for the whole reply.
const SENTENCE_BOUNDARY = /^(.*?[.!?])(\s+|$)/s;

function extractSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let rest = buffer;
  let match: RegExpMatchArray | null;
  while ((match = rest.match(SENTENCE_BOUNDARY))) {
    const sentence = match[1].trim();
    if (sentence) sentences.push(sentence);
    rest = rest.slice(match[0].length);
  }
  return { sentences, rest };
}

export class Agent {
  private client: Anthropic;
  private tools: ToolRegistry;

  constructor(tools: ToolRegistry, apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    this.client = new Anthropic({ apiKey });
    this.tools = tools;
  }

  /**
   * Streams the reply. When onSentence is given, it's called with each
   * complete sentence as soon as the model produces it — the caller can
   * start synthesizing/playing speech before the full reply is done.
   *
   * uiContext, when provided, is a JSON-serializable snapshot of what the
   * JARVIS dashboard is currently showing (see apps/web/lib/uiContext.ts) —
   * appended to the system prompt so the model can answer questions about
   * what's on screen without the user reading it out loud.
   */
  async respond(
    history: ChatMessage[],
    onSentence?: (sentence: string) => void,
    uiContext?: unknown
  ): Promise<string> {
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const system = uiContext
      ? `${SYSTEM_PROMPT}\n\nCurrent JARVIS dashboard UI state (JSON, reflects exactly what the user sees right now):\n${JSON.stringify(uiContext)}`
      : SYSTEM_PROMPT;

    // Tool-calling loop: keep going while Claude asks for tools, stop once
    // it returns a plain text turn.
    for (let turn = 0; turn < 8; turn++) {
      const stream = this.client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools: this.tools.toAnthropicTools(),
        messages,
      });

      let sentenceBuffer = "";
      if (onSentence) {
        stream.on("text", (delta) => {
          sentenceBuffer += delta;
          const { sentences, rest } = extractSentences(sentenceBuffer);
          sentenceBuffer = rest;
          for (const sentence of sentences) onSentence(sentence);
        });
      }

      const response = await stream.finalMessage();

      if (response.stop_reason !== "tool_use") {
        const fullText = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n");
        const remainder = sentenceBuffer.trim();
        if (onSentence && remainder) onSentence(remainder);
        return fullText;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const tool = this.tools.get(block.name);
        const result = tool
          ? await tool.run(block.input as Record<string, unknown>)
          : `Unknown tool: ${block.name}`;
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return "Reached the maximum number of tool-calling turns without a final answer.";
  }
}
