import { describe, it, expect } from "vitest";
import { loadRules, applyJsonpathRule, type Rule } from "../src/rule-loader.js";

describe("loadRules", () => {
  it("loads bundled defaults", async () => {
    const rules = await loadRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every(r => r.id && r.severity && r.match)).toBe(true);
  });

  it("merges user rules: same id replaces", async () => {
    const userYaml = `
- id: claude-settings.bash-wildcard
  severity: REVIEW
  paths: ["~/test"]
  match:
    type: jsonpath
    expr: "$.x"
    pattern: "y"
  message: "downgraded"
`;
    const rules = await loadRules({ userYamlContent: userYaml });
    const r = rules.find(r => r.id === "claude-settings.bash-wildcard");
    expect(r?.severity).toBe("REVIEW");
  });

  it("appends new rules from user yaml", async () => {
    const userYaml = `
- id: custom.my-rule
  severity: ALERT
  paths: ["~/foo"]
  match:
    type: jsonpath
    expr: "$.bar"
    pattern: "baz"
  message: "custom"
`;
    const rules = await loadRules({ userYamlContent: userYaml });
    expect(rules.find(r => r.id === "custom.my-rule")).toBeDefined();
  });
});

describe("applyJsonpathRule", () => {
  it("matches Bash(*) wildcard", () => {
    const rule: Rule = {
      id: "x",
      severity: "ALERT",
      paths: ["test"],
      match: { type: "jsonpath", expr: "$.permissions.allow[*]", pattern: "Bash\\(\\*\\)" },
      message: "wild bash",
    };
    const findings = applyJsonpathRule(rule, { permissions: { allow: ["Read", "Bash(*)"] } }, "test");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("ALERT");
  });

  it("returns no findings when no match", () => {
    const rule: Rule = {
      id: "x",
      severity: "ALERT",
      paths: ["test"],
      match: { type: "jsonpath", expr: "$.permissions.allow[*]", pattern: "Bash\\(\\*\\)" },
      message: "wild bash",
    };
    expect(applyJsonpathRule(rule, { permissions: { allow: ["Read"] } }, "test")).toEqual([]);
  });
});
