import type { Finding } from "./verdict.js";
import type { Severity } from "./severity.js";

const SEVERITY_SET = new Set<Severity>(["CRITICAL", "ALERT", "REVIEW", "CLEAN"]);

function normalizeSeverity(s: unknown): Severity {
  const upper = String(s ?? "").toUpperCase();
  return SEVERITY_SET.has(upper as Severity) ? (upper as Severity) : "REVIEW";
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export function scoreFromFindings(findings: Finding[]): number {
  if (findings.length === 0) return 100;
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === "CRITICAL") penalty += 60;
    else if (f.severity === "ALERT") penalty += 30;
    else if (f.severity === "REVIEW") penalty += 10;
  }
  return Math.max(0, 100 - penalty);
}

function mapRawFinding(raw: any, basePath?: string): Finding {
  return {
    severity: normalizeSeverity(raw.severity),
    id: asString(raw.rule_id ?? raw.id, "unknown"),
    message: asString(raw.message ?? raw.description, ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
    path: asString(raw.path ?? basePath, basePath ?? "") || undefined,
  };
}

export interface NormalizedAudit {
  score: number;
  findings: Finding[];
}

export function normalizeGuardOutput(raw: any): NormalizedAudit {
  const findings = asArray(raw?.findings).map(f => mapRawFinding(f));
  const declaredScore = raw?.summary?.trust_score ?? raw?.trust_score;
  const score = typeof declaredScore === "number" ? declaredScore : scoreFromFindings(findings);
  return { score, findings };
}

export function normalizeScanMcpOutput(raw: any): NormalizedAudit {
  const tools = asArray(raw?.tools);
  const findings: Finding[] = [];
  for (const tool of tools) {
    const toolName = asString(tool.name, "tool");
    const toolFindings = asArray(tool.findings).map(f => mapRawFinding(f, `tool:${toolName}`));
    findings.push(...toolFindings);
  }
  const declaredScore = raw?.trust_score;
  const score = typeof declaredScore === "number" ? declaredScore : scoreFromFindings(findings);
  return { score, findings };
}
