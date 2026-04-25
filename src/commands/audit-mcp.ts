import { runAgentSeal } from "../agentseal-client.js";
import { normalizeScanMcpOutput } from "../agentseal-normalize.js";
import { computeVerdict, exitCodeFor } from "../verdict.js";
import { renderReport, type AuditReport } from "../report.js";
import { buildBacklogTaskPayloads, exportPayloadsAsJson } from "../backlog-export.js";

export interface AuditMcpOptions {
  serverSpec: string;
  agentSealRunner?: () => Promise<unknown>;
  now?: Date;
  useNpx?: boolean;
  parent?: string;
}

function buildAgentSealArgs(serverSpec: string): string[] {
  if (serverSpec.startsWith("sse:")) return ["scan-mcp", "--sse", serverSpec.slice(4), "--output", "json"];
  return ["scan-mcp", "--server", ...serverSpec.split(/\s+/), "--output", "json"];
}

export async function runAuditMcp(opts: AuditMcpOptions) {
  const now = opts.now ?? new Date();
  const rawAS = opts.agentSealRunner
    ? await opts.agentSealRunner()
    : await runAgentSeal(buildAgentSealArgs(opts.serverSpec), { useNpx: opts.useNpx });
  const norm = normalizeScanMcpOutput(rawAS);
  const verdict = computeVerdict(norm.score, null, norm.findings);

  const reportData: AuditReport = {
    command: "audit-mcp",
    target: opts.serverSpec,
    agentSealScore: norm.score,
    authorTrust: null,
    verdict,
    findings: norm.findings,
    generatedAt: now,
  };

  const backlogJson = exportPayloadsAsJson(buildBacklogTaskPayloads({
    command: reportData.command,
    target: reportData.target,
    parent: opts.parent,
    findings: reportData.findings,
  }));

  return {
    report: renderReport(reportData),
    exitCode: exitCodeFor(verdict.verdict),
    reportData,
    backlogJson,
  };
}
