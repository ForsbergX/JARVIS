import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./types.js";
import { ToolRegistry } from "./tools/registry.js";

const MODEL = "claude-sonnet-4-5";
const SYSTEM_PROMPT =
  "You are JARVIS, a capable assistant. Use the available tools when they " +
  "help answer the request. Be direct and concise.";

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

  async respond(history: ChatMessage[]): Promise<string> {
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Tool-calling loop: keep going while Claude asks for tools, stop once
    // it returns a plain text turn.
    for (let turn = 0; turn < 8; turn++) {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: this.tools.toAnthropicTools(),
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        return response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n");
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
