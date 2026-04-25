#!/usr/bin/env node
import { Command } from "commander";
import { runAuditPackage } from "./commands/audit-package.js";
import { runAuditMcp } from "./commands/audit-mcp.js";
import { runAuditSystem } from "./commands/audit-system.js";
import { runAuditCi } from "./commands/audit-ci.js";

const program = new Command();

program
  .name("cyberchecker")
  .description("AI/MCP/package security auditor wrapping AgentSeal")
  .version("0.1.0");

program
  .command("audit-package <target>")
  .description("Audit a package, skill, or MCP server source for prompt injection and supply-chain risks")
  .option("--use-npx", "Run agentseal via npx --yes (no global install required)")
  .option("--out <file>", "Write report to file (default: stdout)")
  .option("--export-backlog", "Print Backlog MCP-ready JSON for ALERT/CRITICAL findings")
  .option("--parent <task-id>", "Parent task id for backlog export (default: task-121)")
  .action(async (target: string, opts: { useNpx?: boolean; out?: string; exportBacklog?: boolean; parent?: string }) => {
    const { writeFile } = await import("node:fs/promises");
    const result = await runAuditPackage({ target, useNpx: opts.useNpx, parent: opts.parent });
    if (opts.out) await writeFile(opts.out, result.report, "utf8");
    else process.stdout.write(result.report + "\n");
    if (opts.exportBacklog && result.backlogJson) process.stdout.write(result.backlogJson + "\n");
    process.exit(result.exitCode);
  });

program
  .command("audit-mcp <server-spec>")
  .description("Live MCP server audit. Spec: stdio command or sse:URL")
  .option("--use-npx", "Run agentseal via npx --yes")
  .option("--out <file>", "Write report to file")
  .option("--export-backlog", "Print Backlog MCP-ready JSON for ALERT/CRITICAL findings")
  .option("--parent <task-id>", "Parent task id for backlog export (default: task-121)")
  .action(async (serverSpec: string, opts: { useNpx?: boolean; out?: string; exportBacklog?: boolean; parent?: string }) => {
    const { writeFile } = await import("node:fs/promises");
    const result = await runAuditMcp({ serverSpec, useNpx: opts.useNpx, parent: opts.parent });
    if (opts.out) await writeFile(opts.out, result.report, "utf8");
    else process.stdout.write(result.report + "\n");
    if (opts.exportBacklog && result.backlogJson) process.stdout.write(result.backlogJson + "\n");
    process.exit(result.exitCode);
  });

program
  .command("audit-system")
  .description("Audit local AI agent configurations (~/.claude/, system-wide)")
  .option("--scope <scope>", "all | claude-only", "all")
  .option("--use-npx", "Run agentseal via npx --yes")
  .option("--out <file>", "Write report to file")
  .option("--export-backlog", "Print Backlog MCP-ready JSON for ALERT/CRITICAL findings")
  .option("--parent <task-id>", "Parent task id for backlog export (default: task-121)")
  .action(async (opts: { scope?: "all" | "claude-only"; useNpx?: boolean; out?: string; exportBacklog?: boolean; parent?: string }) => {
    const { writeFile } = await import("node:fs/promises");
    const result = await runAuditSystem({ scope: opts.scope, useNpx: opts.useNpx, parent: opts.parent });
    if (opts.out) await writeFile(opts.out, result.report, "utf8");
    else process.stdout.write(result.report + "\n");
    if (opts.exportBacklog && result.backlogJson) process.stdout.write(result.backlogJson + "\n");
    process.exit(result.exitCode);
  });

program
  .command("audit-ci [path]")
  .description("Audit GitHub Actions workflow files for hardening issues")
  .option("--out <file>", "Write report to file")
  .option("--export-backlog", "Print Backlog MCP-ready JSON for ALERT/CRITICAL findings")
  .option("--parent <task-id>", "Parent task id for backlog export (default: task-121)")
  .action(async (path: string | undefined, opts: { out?: string; exportBacklog?: boolean; parent?: string }) => {
    const { writeFile } = await import("node:fs/promises");
    const result = await runAuditCi({ workflowsDir: path });
    if (opts.out) await writeFile(opts.out, result.report, "utf8");
    else process.stdout.write(result.report + "\n");
    process.exit(result.exitCode);
  });

program.parseAsync();
