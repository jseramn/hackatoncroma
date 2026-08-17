import { tool, type ToolSet } from "ai";
import {
  createRuntimeContext,
  VERIFY_TOOL_SPECS,
  type ServerContext,
} from "mallanet-verify";
import { GENERIC_ERROR } from "@/lib/mcp-wrap";

let ctx: ServerContext | undefined;

function getContext(): ServerContext {
  ctx ??= createRuntimeContext({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    CROMA_API_KEY: process.env.CROMA_API_KEY || undefined,
  });
  return ctx;
}

export function createVerifyInProcessTools(): ToolSet {
  const context = getContext();
  const tools: ToolSet = {};
  for (const spec of VERIFY_TOOL_SPECS) {
    tools[spec.name] = tool({
      description: spec.description,
      inputSchema: spec.inputSchema,
      execute: async (input: unknown) => {
        try {
          return await spec.handler(
            context,
            input as never,
          );
        } catch (err) {
          console.error(`[verify] ${spec.name} failed`, err);
          return { error: GENERIC_ERROR };
        }
      },
    } as never);
  }
  return tools;
}
