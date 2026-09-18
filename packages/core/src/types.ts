export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ToolInputSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  run: (input: Record<string, unknown>) => Promise<string>;
}

export interface AgentStreamEvent {
  type: "text" | "tool_use" | "tool_result" | "done";
  text?: string;
  toolName?: string;
  toolInput?: unknown;
}
