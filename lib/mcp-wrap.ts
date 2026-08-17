import { jsonSchema, type ToolSet } from "ai";

// Shared MCP tool wrappers. Contract: real data or an honest generic error —
// upstream failure details go to the server log, never to the model or user.

export const GENERIC_ERROR = "La consulta no está disponible en este momento.";
const MAX_RESULT_CHARS = 6_000;

export function trimResult(result: unknown): unknown {
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
// wrapper strips the nulls before they reach the MCP server.
export function nullableOptionals(schema: unknown): unknown {
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

export function stripNulls(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([, value]) => value !== null,
    ),
  );
}

type McpToolLike = {
  inputSchema?: { jsonSchema?: unknown };
  execute?: (input: unknown, options: unknown) => Promise<unknown>;
};

export function wrapMcpTools(
  available: Record<string, object>,
  logPrefix: string,
): ToolSet {
  return Object.fromEntries(
    Object.entries(available).map(([name, rawTool]) => {
      const mcpTool = rawTool as McpToolLike;
      const rawSchema = mcpTool.inputSchema?.jsonSchema;
      return [
        name,
        {
          ...rawTool,
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
              const output = await mcpTool.execute?.(stripNulls(input), options);
              return trimResult(output);
            } catch (err) {
              console.error(`[${logPrefix}] mcp tool ${name} failed`, err);
              return { error: GENERIC_ERROR };
            }
          },
        },
      ];
    }),
  ) as ToolSet;
}
