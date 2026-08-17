import { McpServer } from "@modelcontextprotocol/server";
import { createCromaClient, type CromaGateway } from "./croma/client.js";
import type { ServerContext } from "./context.js";
import { createClient } from "./db/client.js";
import { createMemoryStore } from "./db/memory.js";
import { createSqlStore } from "./db/queries.js";
import { checkCromaBackground, checkCromaBackgroundSchema } from "./tools/check-croma-background.js";
import { generateReport, generateReportSchema } from "./tools/generate-report.js";
import { getVolunteer, getVolunteerSchema } from "./tools/get-volunteer.js";
import { listPendingVolunteers, listPendingVolunteersSchema } from "./tools/list-pending-volunteers.js";
import { requestVerificationData, requestVerificationDataSchema } from "./tools/request-verification-data.js";
import { validateLinkedIn, validateLinkedInSchema } from "./tools/validate-linkedin.js";
import { verifyVolunteer, verifyVolunteerSchema } from "./tools/verify-volunteer.js";

export type { ServerContext };

export type RuntimeEnv = {
  DATABASE_URL?: string;
  CROMA_API_KEY?: string;
};

let memoryStore: ReturnType<typeof createMemoryStore> | undefined;

function skippedCroma(): CromaGateway {
  return {
    async query() {
      return {
        policia: { status: "skipped" },
        procuraduria: { status: "skipped" },
        rama: { status: "skipped" },
        rues: { status: "skipped" },
      };
    },
  };
}

export const VERIFY_TOOL_SPECS = [
  {
    name: "list_pending_volunteers",
    description: "List verify volunteers with no report",
    inputSchema: listPendingVolunteersSchema,
    handler: listPendingVolunteers,
  },
  {
    name: "get_volunteer",
    description: "Get a verify volunteer by id",
    inputSchema: getVolunteerSchema,
    handler: getVolunteer,
  },
  {
    name: "request_verification_data",
    description: "Bind document and optional LinkedIn URL",
    inputSchema: requestVerificationDataSchema,
    handler: requestVerificationData,
  },
  {
    name: "check_croma_background",
    description: "Query Croma sources with per-source degrade",
    inputSchema: checkCromaBackgroundSchema,
    handler: checkCromaBackground,
  },
  {
    name: "validate_linkedin",
    description: "Normalize a LinkedIn URL; no profile fetch",
    inputSchema: validateLinkedInSchema,
    handler: validateLinkedIn,
  },
  {
    name: "generate_report",
    description: "Persist Pass/Alert/Fail report for a volunteer",
    inputSchema: generateReportSchema,
    handler: generateReport,
  },
  {
    name: "verify_volunteer",
    description: "Orchestrate Croma, LinkedIn normalize, and persist",
    inputSchema: verifyVolunteerSchema,
    handler: verifyVolunteer,
  },
] as const;

export function createRuntimeContext(env: RuntimeEnv): ServerContext {
  return {
    store: env.DATABASE_URL
      ? createSqlStore(createClient(env.DATABASE_URL))
      : (memoryStore ??= createMemoryStore()),
    croma: env.CROMA_API_KEY
      ? createCromaClient({ apiKey: env.CROMA_API_KEY })
      : skippedCroma(),
    log: (message) => console.error(message),
    now: () => Date.now(),
    newId: () => crypto.randomUUID(),
  };
}

export function createVerifyServer(ctx: ServerContext) {
  const server = new McpServer({ name: "mallanet-verify", version: "0.1.0" });
  for (const spec of VERIFY_TOOL_SPECS) {
    server.registerTool(spec.name, { description: spec.description, inputSchema: spec.inputSchema }, (input: object) =>
      (spec.handler as (context: ServerContext, value: object) => ReturnType<typeof spec.handler>)(ctx, input),
    );
  }
  return server;
}
