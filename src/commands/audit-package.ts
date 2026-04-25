import { classifyTarget, resolveTarget } from "../target-resolver.js";
import { computeVerdict, exitCodeFor } from "../verdict.js";
import { computeAuthorTrust, type GitHubInputs } from "../author-trust.js";
import { renderReport, type AuditReport } from "../report.js";
import { normalizeGuardOutput } from "../agentseal-normalize.js";
import { runAgentSeal } from "../agentseal-client.js";
import { buildBacklogTaskPayloads, exportPayloadsAsJson } from "../backlog-export.js";

export interface AuditPackageOptions {
  target: string;
  agentSealRunner?: (workdir: string) => Promise<unknown>;
  githubFetcher?: (owner: string, repo: string) => Promise<GitHubInputs>;
  now?: Date;
  cwd?: string;
  useNpx?: boolean;
  parent?: string;
}

export interface AuditResult {
  report: string;
  exitCode: number;
  reportData: AuditReport;
  backlogJson?: string;
}

export async function runAuditPackage(opts: AuditPackageOptions): Promise<AuditResult> {
  const target = classifyTarget(opts.target);
  const now = opts.now ?? new Date();

  const { workdir, cleanup } = opts.cwd
    ? { workdir: opts.cwd, cleanup: async () => {} }
    : await resolveTarget(target);

  try {
    const rawAS = opts.agentSealRunner
      ? await opts.agentSealRunner(workdir)
      : await runAgentSeal(["guard", "--output", "json"], { useNpx: opts.useNpx, cwd: workdir });
    const norm = normalizeGuardOutput(rawAS);

    let authorTrust: AuditReport["authorTrust"] = null;
    if (target.kind === "github" && opts.githubFetcher) {
      const inputs = await opts.githubFetcher(target.owner, target.repo);
      authorTrust = computeAuthorTrust(inputs, now);
    } else if (target.kind === "github") {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: process.env["GITHUB_TOKEN"] });
      const { fetchAuthorInputs } = await import("../github-fetcher.js");
      const inputs = await fetchAuthorInputs(target.owner, target.repo, octokit);
      authorTrust = computeAuthorTrust(inputs, now);
    }

    const verdict = computeVerdict(norm.score, authorTrust?.score ?? null, norm.findings);

    const reportData: AuditReport = {
      command: "audit-package",
      target: opts.target,
      agentSealScore: norm.score,
      authorTrust,
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
  } finally {
    await cleanup();
  }
}
