#!/usr/bin/env npx tsx
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  createRuntimeContext,
  createVerifyServer,
  type RuntimeEnv,
} from "./server.js";

export type { RuntimeEnv };
export { createRuntimeContext, createVerifyServer, VERIFY_TOOL_SPECS } from "./server.js";

export function requireEnv(env: NodeJS.Dict<string> = process.env): RuntimeEnv {
  const CROMA_API_KEY = env.CROMA_API_KEY;
  if (!CROMA_API_KEY) throw new Error("CROMA_API_KEY is required");
  const DATABASE_URL = env.DATABASE_URL || undefined;
  return { DATABASE_URL, CROMA_API_KEY };
}

export function start(env: NodeJS.Dict<string> = process.env) {
  const resolved = requireEnv(env);
  serveStdio(() => createVerifyServer(createRuntimeContext(resolved)));
}

if (!process.env.VITEST) {
  start();
}
