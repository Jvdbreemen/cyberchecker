import type { Severity } from "./severity.js";

export type Verdict = "proceed" | "verify" | "investigate" | "do-not-install";

export interface Finding {
  severity: Severity;
  id: string;
  message: string;
  tags?: string[];
  path?: string;
}

export interface VerdictResult {
  verdict: Verdict;
  reason: string;
}

export function exitCodeFor(v: Verdict): number {
  return { proceed: 0, verify: 1, investigate: 2, "do-not-install": 3 }[v];
}

function hasCritical(findings: Finding[]): boolean {
  return findings.some(f => f.severity === "CRITICAL");
}

function hasCredentialExfilCorrelation(findings: Finding[]): boolean {
  const hasCred = findings.some(f => f.tags?.includes("credential"));
  const hasNet = findings.some(f => f.tags?.some(t => t === "network" || t === "exfil"));
  return hasCred && hasNet;
}

function hasDeobfuscatedInjection(findings: Finding[]): boolean {
  return findings.some(f => f.tags?.includes("deobfuscated") && f.tags?.includes("injection"));
}

export function computeVerdict(
  agentSealScore: number,
  authorTrust: number | null,
  findings: Finding[],
): VerdictResult {
  if (hasCritical(findings)) {
    return { verdict: "do-not-install", reason: "CRITICAL finding present" };
  }
  if (hasCredentialExfilCorrelation(findings)) {
    return { verdict: "do-not-install", reason: "credential targeting + outbound network detected" };
  }
  if (hasDeobfuscatedInjection(findings)) {
    return { verdict: "do-not-install", reason: "deobfuscated injection payload detected" };
  }

  if (agentSealScore >= 80) {
    if (authorTrust === null || authorTrust >= 50) {
      return { verdict: "proceed", reason: `agentseal=${agentSealScore}, author-trust=${authorTrust ?? "n/a"}` };
    }
    return { verdict: "verify", reason: `config OK (${agentSealScore}) but author-trust low (${authorTrust})` };
  }
  if (agentSealScore >= 65) {
    if (authorTrust === null || authorTrust >= 30) {
      return { verdict: "verify", reason: `agentseal=${agentSealScore}, author-trust=${authorTrust ?? "n/a"}` };
    }
    return { verdict: "investigate", reason: `mid score (${agentSealScore}) + poor author-trust (${authorTrust})` };
  }
  if (agentSealScore >= 45) {
    return { verdict: "investigate", reason: `score ${agentSealScore} below safe threshold` };
  }
  return { verdict: "do-not-install", reason: `score ${agentSealScore} below acceptable threshold` };
}
