---
name: cyberchecker
description: Audit AI agent skills, MCP servers, npm packages, GitHub repos and CI workflows for prompt injection, supply chain risks and hardening issues. Triggers on phrases like "audit deze skill", "is dit pakket veilig", "scan mijn setup", "check MCP server".
---

# CyberChecker

You are auditing software for AI agent security risks. Use the `cyberchecker` CLI; it shells out to AgentSeal for detection and adds author-trust + verdict mapping.

## When to activate

- User asks to audit a skill, MCP server, npm package or GitHub repo before installing
- User asks to "scan my setup" or "check my Claude config"
- User mentions reviewing a `.github/workflows/` file or the Sangle hardening checklist
- Slash command: `/cyberchecker-package`, `/cyberchecker-system`, `/cyberchecker-mcp`, `/cyberchecker-ci`

## Workflow

1. **Identify target**. Ask if unclear: a path, a GitHub URL, an npm package, or "the system" (~/.claude/).
2. **Pick subcommand**:
   - Specific package or repo → `audit-package`
   - Local agent setup → `audit-system`
   - Live MCP server → `audit-mcp`
   - GitHub Actions workflows → `audit-ci`
3. **Run**: spawn `cyberchecker <subcommand> <target>` (use `--use-npx` if user lacks `agentseal` globally).
4. **Present** the markdown report verbatim. Lead with the verdict line.
5. **Explain** the verdict briefly: which findings drove it, what the user can do.
6. **If verdict is `verify` or `investigate`**, list the 3 most important files for the user to inspect manually.
7. **If `--export-backlog` makes sense** (auditing your own setup, ALERT/CRITICAL findings present), offer to file backlog tasks under TASK-121.

## Verdict semantics

- `proceed` (exit 0): safe to install or run
- `verify` (exit 1): probably OK, manual spot-check recommended
- `investigate` (exit 2): clear concerns, do not auto-install
- `do-not-install` (exit 3): hard block — confirmed risk

## Hard overrides

CyberChecker auto-flags `do-not-install` for: any CRITICAL finding, credential-targeting + outbound-network correlation, deobfuscated injection payload (zero-width chars, BiDi overrides, tag chars).
