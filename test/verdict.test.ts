import { describe, it, expect } from "vitest";
import { computeVerdict, exitCodeFor, type Finding } from "../src/verdict.js";

const noFindings: Finding[] = [];
const critical: Finding[] = [{ severity: "CRITICAL", id: "x", message: "x" }];

describe("computeVerdict", () => {
  it("proceeds at >=80 / >=50", () => {
    expect(computeVerdict(85, 60, noFindings).verdict).toBe("proceed");
    expect(computeVerdict(80, 50, noFindings).verdict).toBe("proceed");
  });

  it("verifies at high agentseal but low author-trust", () => {
    expect(computeVerdict(90, 30, noFindings).verdict).toBe("verify");
  });

  it("verifies at mid agentseal with reasonable author trust", () => {
    expect(computeVerdict(70, 40, noFindings).verdict).toBe("verify");
  });

  it("investigates at mid agentseal with poor author trust", () => {
    expect(computeVerdict(70, 20, noFindings).verdict).toBe("investigate");
  });

  it("investigates at 45-64 regardless of author", () => {
    expect(computeVerdict(50, 100, noFindings).verdict).toBe("investigate");
  });

  it("do-not-installs below 45", () => {
    expect(computeVerdict(40, 100, noFindings).verdict).toBe("do-not-install");
  });

  it("do-not-installs on any CRITICAL finding (override)", () => {
    expect(computeVerdict(95, 95, critical).verdict).toBe("do-not-install");
  });

  it("treats null author-trust like score-only thresholds", () => {
    expect(computeVerdict(90, null, noFindings).verdict).toBe("proceed");
    expect(computeVerdict(70, null, noFindings).verdict).toBe("verify");
    expect(computeVerdict(50, null, noFindings).verdict).toBe("investigate");
  });

  it("do-not-installs on cred+exfil cross-correlation", () => {
    const findings: Finding[] = [
      { severity: "ALERT", id: "cred", message: "credential targeting", tags: ["credential"] },
      { severity: "ALERT", id: "exfil", message: "outbound network", tags: ["network", "exfil"] },
    ];
    expect(computeVerdict(85, 80, findings).verdict).toBe("do-not-install");
  });

  it("do-not-installs on deobfuscated injection payload", () => {
    const findings: Finding[] = [
      { severity: "ALERT", id: "obf", message: "zero-width chars in skill", tags: ["deobfuscated", "injection"] },
    ];
    expect(computeVerdict(95, 95, findings).verdict).toBe("do-not-install");
  });

  it("exit codes: 0/1/2/3", () => {
    expect(exitCodeFor("proceed")).toBe(0);
    expect(exitCodeFor("verify")).toBe(1);
    expect(exitCodeFor("investigate")).toBe(2);
    expect(exitCodeFor("do-not-install")).toBe(3);
  });
});
