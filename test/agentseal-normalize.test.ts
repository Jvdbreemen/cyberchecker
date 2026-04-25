import { describe, it, expect } from "vitest";
import { normalizeGuardOutput, normalizeScanMcpOutput } from "../src/agentseal-normalize.js";

describe("normalizeGuardOutput", () => {
  it("extracts score and findings", () => {
    const raw = {
      summary: { trust_score: 78 },
      findings: [
        { severity: "ALERT", rule_id: "exfil.url", message: "outbound", path: "x.md", tags: ["network"] },
        { severity: "CRITICAL", rule_id: "creds.access", message: "ssh access", path: "y.md", tags: ["credential"] },
      ],
    };
    const out = normalizeGuardOutput(raw);
    expect(out.score).toBe(78);
    expect(out.findings).toHaveLength(2);
    expect(out.findings[0]?.severity).toBe("ALERT");
    expect(out.findings[1]?.tags).toContain("credential");
  });

  it("defaults score to 100 when missing and no findings", () => {
    const out = normalizeGuardOutput({ findings: [] });
    expect(out.score).toBe(100);
  });

  it("computes score from findings if missing", () => {
    const out = normalizeGuardOutput({ findings: [{ severity: "CRITICAL", rule_id: "x", message: "x" }] });
    expect(out.score).toBeLessThan(50);
  });
});

describe("normalizeScanMcpOutput", () => {
  it("extracts per-tool findings", () => {
    const raw = {
      server: "filesystem",
      trust_score: 82,
      tools: [
        { name: "read_file", findings: [{ severity: "REVIEW", rule_id: "long.desc", message: "long" }] },
        { name: "write_file", findings: [] },
      ],
    };
    const out = normalizeScanMcpOutput(raw);
    expect(out.score).toBe(82);
    expect(out.findings.length).toBe(1);
    expect(out.findings[0]?.path).toContain("read_file");
  });
});
