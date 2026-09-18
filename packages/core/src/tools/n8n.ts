import type { ToolDefinition } from "../types.js";

export function createN8nTool(): ToolDefinition {
  return {
    name: "trigger_n8n_workflow",
    description:
      "Trigger an n8n workflow via its webhook URL, passing a JSON payload. Input: payload (object).",
    inputSchema: {
      type: "object",
      properties: {
        payload: { type: "object" },
      },
      required: ["payload"],
    },
    run: async (input) => {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        return "n8n tool is not configured: set N8N_WEBHOOK_URL in the environment.";
      }
      const { payload } = input as { payload: Record<string, unknown> };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      return `n8n responded with status ${response.status}: ${text}`;
    },
  };
}
