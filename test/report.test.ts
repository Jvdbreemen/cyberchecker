import { describe, it, expect } from "vitest";
import { renderReport, type AuditReport } from "../src/report.js";

const sample: AuditReport = {
  command: "audit-package",
  target: "github.com/foo/bar",
  agentSealScore: 78,
  authorTrust: { score: 65, summary: "3yr account, 142 commits, 4 contributors, last commit 12d ago" },
  verdict: { verdict: "verify", reason: "agentseal=78, author-trust=65" },
  findings: [
    { severity: "ALERT", id: "exfil.url", message: "outbound URL in skill description", path: "skills/foo/SKILL.md", tags: ["network"] },
    { severity: "REVIEW", id: "long.url", message: "URL longer than 200 chars", path: "skills/foo/SKILL.md" },
  ],
  generatedAt: new Date("2026-04-25T10:00:00Z"),
};

describe("renderReport", () => {
  it("includes verdict heading", () => {
    const out = renderReport(sample);
    expect(out).toMatch(/Verdict.*verify/i);
  });

  it("includes scores", () => {
    const out = renderReport(sample);
    expect(out).toContain("78");
    expect(out).toContain("65");
  });

  it("groups findings by severity", () => {
    const out = renderReport(sample);
    expect(out.indexOf("ALERT")).toBeLessThan(out.indexOf("REVIEW"));
  });

  it("omits sections with no findings", () => {
    const minimal = { ...sample, findings: [] };
    expect(renderReport(minimal)).not.toContain("ALERT");
  });

  it("handles missing author-trust", () => {
    const local = { ...sample, authorTrust: null };
    expect(renderReport(local)).toMatch(/n\/a|not available|—/i);
  });
});
