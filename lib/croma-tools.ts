import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { jsonSchema, type ToolSet } from "ai";

// Toolbox over Croma's public MCP server. Contract: real data or an honest
// generic error — upstream failure details go to the server log, never to the
// model or the user.

const GENERIC_ERROR = "La consulta no está disponible en este momento.";
const MAX_RESULT_CHARS = 6_000;

export const CROMA_MCP_URL =
  process.env.CROMA_MCP_URL ?? "https://api.croma.run/mcp";

// Cap result text so one broad query can't blow up the model context.
function trimResult(result: unknown): unknown {
  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as { content?: unknown }).content)
  ) {
    const { content, ...rest } = result as { content: unknown[] };
    return {
      ...rest,
      content: content.map((part) => {
        if (
          part &&
          typeof part === "object" &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          const text = (part as { text: string }).text;
          return text.length > MAX_RESULT_CHARS
            ? {
                ...part,
                text: `${text.slice(0, MAX_RESULT_CHARS)}… [resultado truncado]`,
              }
            : part;
        }
        return part;
      }),
    };
  }
  return result;
}

// gpt-oss on Groq fills optional tool params with null, and Groq validates
// arguments against the schema and rejects the call ("expected number, got
// null"). Loosen every optional property to also accept null; the execute
// wrapper strips the nulls before they reach the MCP server. Harmless for
// providers that don't do this (e.g. Anthropic).
function nullableOptionals(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }
  const out = { ...(schema as Record<string, unknown>) };
  if (out.properties && typeof out.properties === "object") {
    const required = new Set(
      Array.isArray(out.required) ? (out.required as string[]) : [],
    );
    out.properties = Object.fromEntries(
      Object.entries(out.properties as Record<string, unknown>).map(
        ([key, prop]) => {
          let next = nullableOptionals(prop) as Record<string, unknown>;
          if (
            !required.has(key) &&
            next &&
            typeof next === "object" &&
            typeof next.type === "string" &&
            next.type !== "null"
          ) {
            next = { ...next, type: [next.type, "null"] };
          }
          return [key, next];
        },
      ),
    );
  }
  if (out.items) out.items = nullableOptionals(out.items);
  return out;
}

function stripNulls(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([, value]) => value !== null,
    ),
  );
}

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
  const tools = Object.fromEntries(
    Object.entries(available).map(([name, mcpTool]) => {
      const rawSchema = (mcpTool as { inputSchema?: { jsonSchema?: unknown } })
        .inputSchema?.jsonSchema;
      return [
        name,
        {
          ...mcpTool,
          ...(rawSchema
            ? {
                inputSchema: jsonSchema(
                  nullableOptionals(rawSchema) as Parameters<
                    typeof jsonSchema
                  >[0],
                ),
              }
            : {}),
          execute: async (input: unknown, options: unknown) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const output = await (mcpTool.execute as any)(
                stripNulls(input),
                options,
              );
              return trimResult(output);
            } catch (err) {
              console.error(`[croma-chat] mcp tool ${name} failed`, err);
              return { error: GENERIC_ERROR };
            }
          },
        },
      ];
    }),
  ) as ToolSet;

  return {
    tools,
    close: () => void client.close().catch(() => undefined),
  };
}
