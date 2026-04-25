import { describe, it, expect } from "vitest";
import { runAuditMcp } from "../src/commands/audit-mcp.js";

describe("runAuditMcp", () => {
  it("works for stdio spec", async () => {
    const result = await runAuditMcp({
      serverSpec: "npx @modelcontextprotocol/server-filesystem /tmp",
      agentSealRunner: async () => ({ trust_score: 80, tools: [{ name: "read", findings: [] }] }),
      now: new Date("2026-04-25T10:00:00Z"),
    });
    expect(result.report).toContain("audit-mcp");
    expect(result.exitCode).toBe(0);
  });

  it("works for sse spec", async () => {
    const result = await runAuditMcp({
      serverSpec: "sse:http://localhost:3001/sse",
      agentSealRunner: async () => ({ trust_score: 75, tools: [] }),
      now: new Date("2026-04-25T10:00:00Z"),
    });
    expect(result.exitCode).toBe(1);
  });
});
