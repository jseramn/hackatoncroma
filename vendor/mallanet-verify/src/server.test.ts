import { describe, expect, it } from "vitest";
import { createRuntimeContext, VERIFY_TOOL_SPECS } from "./server.js";
import { listPendingVolunteers } from "./tools/list-pending-volunteers.js";

describe("createRuntimeContext", () => {
  it("uses the in-memory seed when DATABASE_URL is omitted", async () => {
    const ctx = createRuntimeContext({ CROMA_API_KEY: "k" });
    const result = await listPendingVolunteers(ctx, { limit: 5 });
    const text = result.content[0]?.text ?? "[]";
    const rows = JSON.parse(text) as Array<{ id: string }>;
    expect(rows.some((row) => row.id === "verify-operator-001")).toBe(true);
  });

  it("exports the seven MCP tool specs", () => {
    expect(VERIFY_TOOL_SPECS.map((spec) => spec.name)).toEqual([
      "list_pending_volunteers",
      "get_volunteer",
      "request_verification_data",
      "check_croma_background",
      "validate_linkedin",
      "generate_report",
      "verify_volunteer",
    ]);
  });
});
