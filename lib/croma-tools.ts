import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { wrapMcpTools } from "@/lib/mcp-wrap";

// Toolbox over Croma's public MCP server.

export const CROMA_MCP_URL =
  process.env.CROMA_MCP_URL ?? "https://api.croma.run/mcp";

export async function createCromaToolbox() {
  const apiKey = process.env.CROMA_API_KEY;
  if (!apiKey) {
    throw new Error("CROMA_API_KEY is not set");
  }

  const client: MCPClient = await createMCPClient({
    transport: {
      type: "http",
      url: CROMA_MCP_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    clientName: "croma-ai-sdk-sample",
  });

  const available = await client.tools();
  return {
    tools: wrapMcpTools(available, "croma-chat"),
    close: () => void client.close().catch(() => undefined),
  };
}
