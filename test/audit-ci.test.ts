import { describe, it, expect } from "vitest";
import { auditWorkflowText } from "../src/commands/audit-ci.js";

const noPerms = `
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

const writeAll = `
on: push
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
`;

const prTarget = `
on:
  pull_request_target:
    types: [opened]
permissions: read-all
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

describe("auditWorkflowText", () => {
  it("flags missing permissions", () => {
    const findings = auditWorkflowText("ci.yml", noPerms);
    expect(findings.some(f => f.id === "ci.permissions-missing")).toBe(true);
  });

  it("flags write-all", () => {
    const findings = auditWorkflowText("ci.yml", writeAll);
    expect(findings.some(f => f.id === "ci.permissions-write-all")).toBe(true);
  });

  it("flags pull_request_target without actor filter", () => {
    const findings = auditWorkflowText("ci.yml", prTarget);
    expect(findings.some(f => f.id === "ci.trigger-pull-request-target")).toBe(true);
  });
});
