export { Agent } from "./agent.js";
export { ToolRegistry } from "./tools/registry.js";
export { createGithubTool } from "./tools/github.js";
export { createN8nTool } from "./tools/n8n.js";
export { synthesizeSpeech } from "./tts.js";
export type { SpeechResult } from "./tts.js";
export * as db from "./db.js";
export type { ChatMessage, ToolDefinition, AgentStreamEvent } from "./types.js";

import { ToolRegistry } from "./tools/registry.js";
import { createGithubTool } from "./tools/github.js";
import { createN8nTool } from "./tools/n8n.js";

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(createGithubTool());
  registry.register(createN8nTool());
  return registry;
}
