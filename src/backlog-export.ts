import type { Finding } from "./verdict.js";

export interface BacklogTaskPayload {
  title: string;
  description: string;
  labels: string[];
  parent: string;
  milestone: string;
}

export interface BuildOptions {
  command: string;
  target: string;
  parent?: string;
  findings: Finding[];
}

export function buildBacklogTaskPayloads(opts: BuildOptions): BacklogTaskPayload[] {
  const parent = opts.parent ?? "task-121";
  return opts.findings
    .filter(f => f.severity === "CRITICAL" || f.severity === "ALERT")
    .map(f => ({
      title: `[CyberChecker:${opts.command}] ${f.severity}: ${f.message.slice(0, 80)}`,
      description: [
        `**Source:** ${opts.target}`,
        `**Rule id:** \`${f.id}\``,
        f.path ? `**Path:** \`${f.path}\`` : "",
        `**Severity:** ${f.severity}`,
        ``,
        f.message,
      ].filter(Boolean).join("\n"),
      labels: ["cyberchecker", `severity:${f.severity.toLowerCase()}`, `source:${opts.command}`],
      parent,
      milestone: "CyberChecker",
    }));
}

export function exportPayloadsAsJson(payloads: BacklogTaskPayload[]): string {
  return JSON.stringify(payloads, null, 2);
}
