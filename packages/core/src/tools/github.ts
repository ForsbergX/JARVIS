import { Octokit } from "@octokit/rest";
import type { ToolDefinition } from "../types.js";

export function createGithubTool(): ToolDefinition {
  return {
    name: "github_list_repo_issues",
    description:
      "List open issues for a GitHub repository. Input: owner, repo (both strings).",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
      },
      required: ["owner", "repo"],
    },
    run: async (input) => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        return "GitHub tool is not configured: set GITHUB_TOKEN in the environment.";
      }
      const octokit = new Octokit({ auth: token });
      const { owner, repo } = input as { owner: string; repo: string };
      const { data } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: "open",
        per_page: 10,
      });
      if (data.length === 0) return `No open issues in ${owner}/${repo}.`;
      return data.map((issue) => `#${issue.number} ${issue.title}`).join("\n");
    },
  };
}
