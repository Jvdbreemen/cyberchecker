import type { Finding } from "./verdict.js";
import type { VerdictResult } from "./verdict.js";
import type { AuthorTrust } from "./author-trust.js";
import { type Severity } from "./severity.js";

export interface AuditReport {
  command: string;
  target: string;
  agentSealScore: number;
  authorTrust: AuthorTrust | null;
  verdict: VerdictResult;
  findings: Finding[];
  generatedAt: Date;
}

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "ALERT", "REVIEW", "CLEAN"];

export function renderReport(r: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# CyberChecker — ${r.command}`);
  lines.push("");
  lines.push(`**Target:** \`${r.target}\``);
  lines.push(`**Generated:** ${r.generatedAt.toISOString()}`);
  lines.push("");
  lines.push(`## Verdict: ${r.verdict.verdict.toUpperCase()}`);
  lines.push("");
  lines.push(`> ${r.verdict.reason}`);
  lines.push("");
  lines.push(`## Scores`);
  lines.push("");
  lines.push(`- **AgentSeal:** ${r.agentSealScore}/100`);
  lines.push(`- **Author-trust:** ${r.authorTrust ? `${r.authorTrust.score}/100 — ${r.authorTrust.summary}` : "—"}`);
  lines.push("");

  const grouped = new Map<Severity, Finding[]>();
  for (const f of r.findings) {
    if (!grouped.has(f.severity)) grouped.set(f.severity, []);
    grouped.get(f.severity)!.push(f);
  }

  if (r.findings.length === 0) {
    lines.push(`## Findings`);
    lines.push("");
    lines.push("_No findings._");
  } else {
    for (const sev of SEVERITY_ORDER) {
      const items = grouped.get(sev);
      if (!items || items.length === 0) continue;
      lines.push(`## ${sev}`);
      lines.push("");
      for (const f of items) {
        const path = f.path ? ` \`${f.path}\`` : "";
        lines.push(`- **${f.id}**${path}: ${f.message}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
