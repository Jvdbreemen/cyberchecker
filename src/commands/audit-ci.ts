import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { parse as parseYaml } from "yaml";
import { computeVerdict, exitCodeFor, type Finding } from "../verdict.js";
import { renderReport, type AuditReport } from "../report.js";

interface WorkflowDoc {
  on?: any;
  permissions?: any;
  jobs?: Record<string, JobDoc>;
}
interface JobDoc {
  steps?: StepDoc[];
  permissions?: any;
}
interface StepDoc {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
  if?: string;
}

function parseSafe(text: string): WorkflowDoc | null {
  try { return parseYaml(text); } catch { return null; }
}

function findingsForWorkflow(path: string, doc: WorkflowDoc, raw: string): Finding[] {
  const out: Finding[] = [];

  if (!("permissions" in doc)) {
    out.push({ severity: "ALERT", id: "ci.permissions-missing", message: "Workflow has no permissions block; defaults to write-all", path });
  } else if (doc.permissions === "write-all") {
    out.push({ severity: "CRITICAL", id: "ci.permissions-write-all", message: "Workflow grants write-all permissions", path });
  }

  const triggers = doc.on;
  const triggerKeys: string[] = typeof triggers === "string"
    ? [triggers]
    : Array.isArray(triggers)
      ? triggers
      : triggers && typeof triggers === "object"
        ? Object.keys(triggers)
        : [];

  if (triggerKeys.includes("pull_request_target")) {
    const hasJobIf = Object.values(doc.jobs ?? {}).some(j => (j as any)?.if);
    if (!hasJobIf) out.push({ severity: "CRITICAL", id: "ci.trigger-pull-request-target", message: "Trigger pull_request_target without actor filter", path });
  }
  if (triggerKeys.includes("issue_comment")) {
    const hasJobIf = Object.values(doc.jobs ?? {}).some(j => (j as any)?.if);
    if (!hasJobIf) out.push({ severity: "CRITICAL", id: "ci.trigger-issue-comment", message: "Trigger issue_comment without actor filter", path });
  }

  const usesSecrets = /\$\{\{\s*secrets\./i.test(raw);
  const hasHarden = /step-security\/harden-runner/i.test(raw);
  if (usesSecrets && !hasHarden) {
    out.push({ severity: "ALERT", id: "ci.harden-runner-missing", message: "Job uses secrets but no harden-runner step", path });
  }

  for (const job of Object.values(doc.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step.uses === "string" && step.uses.startsWith("anthropics/claude-code-action")) {
        const w = step.with ?? {};
        if (!("allowedTools" in w) && !("CLAUDE_CODE_SCRIPT_CAPS" in (step.env ?? {}))) {
          out.push({ severity: "ALERT", id: "ci.claude-action-no-allowed-tools", message: "claude-code-action without allowedTools or CLAUDE_CODE_SCRIPT_CAPS", path });
        }
      }
    }
  }

  return out;
}

export function auditWorkflowText(path: string, text: string): Finding[] {
  const doc = parseSafe(text);
  if (!doc) return [{ severity: "REVIEW", id: "ci.parse-error", message: "Could not parse workflow YAML", path }];
  return findingsForWorkflow(path, doc, text);
}

export interface AuditCiOptions {
  workflowsDir?: string;
  workflowFiles?: { path: string; content: string }[];
  now?: Date;
  parent?: string;
}

export async function runAuditCi(opts: AuditCiOptions = {}) {
  const now = opts.now ?? new Date();
  const dir = opts.workflowsDir ?? ".github/workflows";

  let files: { path: string; content: string }[] = opts.workflowFiles ?? [];
  if (!opts.workflowFiles) {
    try {
      const names = (await readdir(dir)).filter(n => [".yml", ".yaml"].includes(extname(n)));
      files = await Promise.all(names.map(async n => ({ path: join(dir, n), content: await readFile(join(dir, n), "utf8") })));
    } catch { files = []; }
  }

  const findings: Finding[] = [];
  for (const f of files) findings.push(...auditWorkflowText(f.path, f.content));

  const score = findings.length === 0 ? 100 : Math.max(0, 100 - findings.reduce((acc, f) => acc + (f.severity === "CRITICAL" ? 25 : f.severity === "ALERT" ? 10 : 3), 0));
  const verdict = computeVerdict(score, null, findings);

  const reportData: AuditReport = {
    command: "audit-ci",
    target: dir,
    agentSealScore: score,
    authorTrust: null,
    verdict,
    findings,
    generatedAt: now,
  };

  return {
    report: renderReport(reportData),
    exitCode: exitCodeFor(verdict.verdict),
    reportData,
  };
}
