import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Agent } from "./agent.js";
import { createDefaultToolRegistry } from "./index.js";
import type { ChatMessage } from "./types.js";

async function main() {
  const tools = createDefaultToolRegistry();
  const agent = new Agent(tools);
  const history: ChatMessage[] = [];
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log("JARVIS core CLI. Type 'exit' to quit.");
  for (;;) {
    const input = await rl.question("you> ");
    if (input.trim().toLowerCase() === "exit") break;
    history.push({ role: "user", content: input });
    const reply = await agent.respond(history);
    history.push({ role: "assistant", content: reply });
    console.log(`jarvis> ${reply}\n`);
  }
  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
