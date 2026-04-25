import { describe, it, expect } from "vitest";
import { runAuditSystem } from "../src/commands/audit-system.js";

describe("runAuditSystem", () => {
  it("aggregates agentseal findings + hardening findings", async () => {
    const result = await runAuditSystem({
      agentSealRunner: async () => ({ summary: { trust_score: 88 }, findings: [{ severity: "REVIEW", rule_id: "x", message: "x" }] }),
      readSettings: async () => ({ permissions: { allow: ["Read", "Bash(*)"] } }),
      now: new Date("2026-04-25T10:00:00Z"),
    });
    expect(result.report).toContain("audit-system");
    expect(result.report).toMatch(/Bash/);
    expect(result.exitCode).toBeGreaterThanOrEqual(1);
  });
});
