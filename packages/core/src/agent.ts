import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./types.js";
import { ToolRegistry } from "./tools/registry.js";

const MODEL = "claude-sonnet-4-5";
const SYSTEM_PROMPT =
  "You are JARVIS, a capable assistant. Use the available tools when they " +
  "help answer the request. Be direct and concise — default to short, " +
  "direct answers (1-3 sentences) unless the user asks for more detail.";

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
   */
  async respond(history: ChatMessage[], onSentence?: (sentence: string) => void): Promise<string> {
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Tool-calling loop: keep going while Claude asks for tools, stop once
    // it returns a plain text turn.
    for (let turn = 0; turn < 8; turn++) {
      const stream = this.client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
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
