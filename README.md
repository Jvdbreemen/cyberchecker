# CyberChecker

Pre-install + system-wide security auditor for AI agents. Wraps [AgentSeal](https://github.com/getagentseal/agentseal) for detection and adds:

- **Author-trust scoring** for GitHub-sourced packages (account age, commits, contributors, recency, hygiene)
- **Verdict mapping** (proceed / verify / investigate / do-not-install) with hard overrides for CRITICAL findings, credential-targeting + exfil correlation, and deobfuscated injection payloads
- **System hardening rules** for `~/.claude/settings.json`, hooks and `CLAUDE.md`
- **CI workflow audit** based on Sangle's hardening checklist (permissions, triggers, harden-runner, secrets)
- **Backlog MCP export** of ALERT/CRITICAL findings as sub-tasks
- **Claude Code plugin** with slash-commands

## Install

```
npm install -g cyberchecker
npm install -g agentseal   # peer dependency; or use --use-npx
```

Claude Code plugin:

```
claude plugin marketplace add Jvdbreemen/cyberchecker
claude plugin install cyberchecker
```

## Usage

```
cyberchecker audit-package https://github.com/foo/bar
cyberchecker audit-package npm:left-pad
cyberchecker audit-package ./my-skill/

cyberchecker audit-system

cyberchecker audit-mcp "npx @modelcontextprotocol/server-filesystem /tmp"
cyberchecker audit-mcp sse:http://localhost:3001/sse

cyberchecker audit-ci
cyberchecker audit-ci ./somewhere/.github/workflows
```

Use as a script gate:

```
cyberchecker audit-package npm:some-pkg && npm install some-pkg
```

Exit codes: 0=proceed, 1=verify, 2=investigate, 3=do-not-install.

## Backlog export

```
cyberchecker audit-system --export-backlog --parent task-121
```

Prints JSON ready to feed into Backlog MCP. Each ALERT/CRITICAL finding becomes a sub-task with labels `cyberchecker`, `severity:<level>`, `source:<command>`, milestone `CyberChecker`.

## Custom hardening rules

Drop a YAML at `~/.claude/cyberchecker.yaml`:

```yaml
- id: my.custom-rule
  severity: ALERT
  paths: ["~/.claude/settings.json"]
  match:
    type: jsonpath
    expr: "$.permissions.allow[*]"
    pattern: "DangerousTool"
  message: "Don't allow DangerousTool"
```

User rules with the same `id` as a default replace it; new ids append.

## Comparison

| | CyberChecker | AgentSeal | Prompt Shield |
|---|---|---|---|
| Detection engine | wraps AgentSeal | own (6-stage, ML, registry) | 18 regex checks |
| Author-trust scoring | yes | no | yes (qualitative) |
| Verdict mapping | yes (4 levels + overrides) | trust score only | yes |
| Claude Code plugin | yes | no (CLI only) | yes |
| CI workflow audit | yes (Sangle checklist) | no | no |
| Backlog MCP export | yes | no | no |
| Real-time watcher | no (use `agentseal shield`) | yes | no |

## License

MIT
