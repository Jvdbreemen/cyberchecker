import { readFile } from "node:fs/promises";
import { runAgentSeal } from "../agentseal-client.js";
import { normalizeGuardOutput, scoreFromFindings } from "../agentseal-normalize.js";
import { computeVerdict, exitCodeFor, type Finding } from "../verdict.js";
import { renderReport, type AuditReport } from "../report.js";
import { loadRules, applyJsonpathRule, applyRegexRule, expandPath } from "../rule-loader.js";
import { buildBacklogTaskPayloads, exportPayloadsAsJson } from "../backlog-export.js";

export interface AuditSystemOptions {
  agentSealRunner?: () => Promise<unknown>;
  readSettings?: () => Promise<unknown>;
  now?: Date;
  useNpx?: boolean;
  scope?: "all" | "claude-only";
  parent?: string;
}

export async function runAuditSystem(opts: AuditSystemOptions = {}) {
  const now = opts.now ?? new Date();
  const rawAS = opts.agentSealRunner
    ? await opts.agentSealRunner()
    : await runAgentSeal(["guard", "--output", "json"], { useNpx: opts.useNpx });
  const norm = normalizeGuardOutput(rawAS);

  const settingsPath = expandPath("~/.claude/settings.json");
  let settings: unknown = null;
  if (opts.readSettings) settings = await opts.readSettings();
  else {
    try {
      settings = JSON.parse(await readFile(settingsPath, "utf8"));
    } catch { settings = null; }
  }

  const rules = await loadRules({ userYamlPath: expandPath("~/.claude/cyberchecker.yaml") });
  const customFindings: Finding[] = [];
  if (settings) {
    for (const rule of rules) {
      if (rule.match.type === "jsonpath") customFindings.push(...applyJsonpathRule(rule, settings, "~/.claude/settings.json"));
      else if (rule.match.type === "regex") customFindings.push(...applyRegexRule(rule, JSON.stringify(settings, null, 2), "~/.claude/settings.json"));
    }
  }

  try {
    const claudeMd = await readFile(expandPath("~/.claude/CLAUDE.md"), "utf8");
    for (const rule of rules) {
      if (rule.match.type === "regex" && rule.paths.some(p => p.includes("CLAUDE.md"))) {
        customFindings.push(...applyRegexRule(rule, claudeMd, "~/.claude/CLAUDE.md"));
      }
    }
  } catch { /* file may not exist */ }

  const allFindings = [...norm.findings, ...customFindings];

  // Use the lower of agentseal's declared score and a score derived from all
  // aggregated findings, so that custom hardening findings lower the verdict.
  const combinedScore = Math.min(norm.score, scoreFromFindings(allFindings));
  const verdict = computeVerdict(combinedScore, null, allFindings);

  const reportData: AuditReport = {
    command: "audit-system",
    target: opts.scope === "claude-only" ? "~/.claude/" : "machine-wide",
    agentSealScore: norm.score,
    authorTrust: null,
    verdict,
    findings: allFindings,
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
