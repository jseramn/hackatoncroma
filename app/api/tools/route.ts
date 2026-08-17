import { createMCPClient } from "@ai-sdk/mcp";
import type { CatalogTool } from "@/lib/catalog";
import { CROMA_MCP_URL } from "@/lib/croma-tools";
import { VERIFY_CATALOG } from "@/lib/verify-catalog";

export type { CatalogTool };

const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { tools: CatalogTool[]; expiresAt: number } | undefined;

async function fetchCromaCatalog(): Promise<CatalogTool[]> {
  const apiKey = process.env.CROMA_API_KEY;
  if (!apiKey) return [];

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: CROMA_MCP_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    clientName: "croma-chat-template",
  });

  try {
    const { tools } = await client.listTools();
    return tools.map((tool) => ({
      name: tool.name,
      title: tool.title ?? tool.name,
      description: tool.description ?? "",
    }));
  } finally {
    void client.close().catch(() => undefined);
  }
}

function mergeCatalog(croma: CatalogTool[]): CatalogTool[] {
  const names = new Set(VERIFY_CATALOG.map((tool) => tool.name));
  return [
    ...VERIFY_CATALOG,
    ...croma.filter((tool) => !names.has(tool.name)),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return Response.json({ tools: cache.tools });
  }
  try {
    const croma = await fetchCromaCatalog();
    const tools = mergeCatalog(croma);
    cache = { tools, expiresAt: Date.now() + CACHE_TTL_MS };
    return Response.json({ tools });
  } catch (err) {
    console.error("[croma-chat] tool catalog failed", err);
    if (cache) return Response.json({ tools: cache.tools });
    return Response.json({ tools: VERIFY_CATALOG });
  }
}
