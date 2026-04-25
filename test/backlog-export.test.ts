import { describe, it, expect } from "vitest";
import { buildBacklogTaskPayloads } from "../src/backlog-export.js";

describe("buildBacklogTaskPayloads", () => {
  it("creates one task per ALERT/CRITICAL finding", () => {
    const tasks = buildBacklogTaskPayloads({
      command: "audit-package",
      target: "github.com/foo/bar",
      parent: "task-121",
      findings: [
        { severity: "CRITICAL", id: "x", message: "x" },
        { severity: "ALERT", id: "y", message: "y" },
        { severity: "REVIEW", id: "z", message: "z" }, // skipped
      ],
    });
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.title).toMatch(/CRITICAL/);
    expect(tasks[0]?.parent).toBe("task-121");
    expect(tasks[0]?.labels).toContain("cyberchecker");
  });

  it("uses default parent when none given", () => {
    const tasks = buildBacklogTaskPayloads({
      command: "audit-system",
      target: "~/.claude",
      findings: [{ severity: "ALERT", id: "a", message: "a" }],
    });
    expect(tasks[0]?.parent).toBe("task-121");
  });
});
