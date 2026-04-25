import { describe, it, expect, vi } from "vitest";
import { runAuditPackage } from "../src/commands/audit-package.js";

describe("runAuditPackage", () => {
  it("renders a report for a github target", async () => {
    const result = await runAuditPackage({
      target: "https://github.com/foo/bar",
      agentSealRunner: async () => ({ summary: { trust_score: 90 }, findings: [] }),
      githubFetcher: async () => ({
        ownerCreatedAt: new Date("2020-01-01"),
        totalCommits: 200,
        uniqueContributors: 4,
        closedIssueRatio: 0.6,
        lastCommit: new Date("2026-04-01"),
        hasReadmeOver500Bytes: true,
        hasLicense: true,
        ownerOtherRepoCount: 5,
      }),
      now: new Date("2026-04-25T10:00:00Z"),
      cwd: "/tmp",
    });
    expect(result.report).toMatch(/Verdict.*PROCEED/i);
    expect(result.exitCode).toBe(0);
  });

  it("returns do-not-install on CRITICAL", async () => {
    const result = await runAuditPackage({
      target: "https://github.com/foo/bad",
      agentSealRunner: async () => ({
        summary: { trust_score: 95 },
        findings: [{ severity: "CRITICAL", rule_id: "x", message: "bad" }],
      }),
      githubFetcher: async () => ({
        ownerCreatedAt: new Date("2020-01-01"),
        totalCommits: 200,
        uniqueContributors: 4,
        closedIssueRatio: 0.6,
        lastCommit: new Date("2026-04-01"),
        hasReadmeOver500Bytes: true,
        hasLicense: true,
        ownerOtherRepoCount: 5,
      }),
      now: new Date("2026-04-25T10:00:00Z"),
      cwd: "/tmp",
    });
    expect(result.exitCode).toBe(3);
  });
});
