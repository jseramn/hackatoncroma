import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { join } from "node:path";
import type { ToolSet } from "ai";
import { wrapMcpTools } from "@/lib/mcp-wrap";
import { createVerifyInProcessTools } from "@/lib/verify-runtime";

export type VerifyToolbox = {
  tools: ToolSet;
  close: () => void;
};

const VERIFY_ROOT = join(process.cwd(), "node_modules/mallanet-verify");
const TSX_CLI = join(process.cwd(), "node_modules/tsx/dist/cli.mjs");

async function createVerifyStdioToolbox(): Promise<VerifyToolbox> {
  const apiKey = process.env.CROMA_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  if (!apiKey || !databaseUrl) {
    throw new Error("stdio verify requires CROMA_API_KEY and DATABASE_URL");
  }

  const transport = new Experimental_StdioMCPTransport({
    command: process.execPath,
    args: [TSX_CLI, join(VERIFY_ROOT, "src/index.ts")],
    cwd: VERIFY_ROOT,
    env: {
      CROMA_API_KEY: apiKey,
      DATABASE_URL: databaseUrl,
    },
    stderr: "pipe",
  });

  const client = await createMCPClient({
    transport,
    clientName: "hackatoncroma-verify",
  });

  const available = await client.tools();
  return {
    tools: wrapMcpTools(available, "verify"),
    close: () => void client.close().catch(() => undefined),
  };
}

export function createVerifyInProcessToolbox(): VerifyToolbox {
  return {
    tools: createVerifyInProcessTools(),
    close: () => undefined,
  };
}

// Prefer the real stdio MCP when Neon is configured. Otherwise (or if spawn
// fails on serverless) run the same handlers in-process with a memory store.
export async function createVerifyToolbox(): Promise<VerifyToolbox> {
  if (process.env.DATABASE_URL && process.env.CROMA_API_KEY) {
    try {
      return await createVerifyStdioToolbox();
    } catch (err) {
      console.error("[verify] stdio mcp failed, using in-process", err);
    }
  }
  return createVerifyInProcessToolbox();
}
