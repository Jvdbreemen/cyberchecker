import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgentSeal, AgentSealNotInstalledError } from "../src/agentseal-client.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";

function mockSpawn(stdout: string, stderr = "", code = 0) {
  const proc: any = {
    stdout: { on: (ev: string, cb: any) => ev === "data" && cb(Buffer.from(stdout)) },
    stderr: { on: (ev: string, cb: any) => ev === "data" && cb(Buffer.from(stderr)) },
    on: (ev: string, cb: any) => { if (ev === "close") setTimeout(() => cb(code), 0); },
  };
  (spawn as any).mockReturnValue(proc);
}

describe("runAgentSeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses JSON output", async () => {
    mockSpawn(JSON.stringify({ score: 78, findings: [] }));
    const out = await runAgentSeal(["guard", "--output", "json"]);
    expect(out).toEqual({ score: 78, findings: [] });
  });

  it("throws AgentSealNotInstalledError when binary missing", async () => {
    (spawn as any).mockImplementation(() => {
      const proc: any = { stdout: { on: () => {} }, stderr: { on: () => {} }, on: (ev: string, cb: any) => { if (ev === "error") setTimeout(() => cb(Object.assign(new Error("not found"), { code: "ENOENT" })), 0); } };
      return proc;
    });
    await expect(runAgentSeal(["guard"])).rejects.toBeInstanceOf(AgentSealNotInstalledError);
  });

  it("throws on non-zero exit with stderr message", async () => {
    mockSpawn("", "boom", 2);
    await expect(runAgentSeal(["guard"])).rejects.toThrow(/boom/);
  });

  it("invokes agentseal directly with cwd by default", async () => {
    mockSpawn(JSON.stringify({}));
    await runAgentSeal(["guard"], { cwd: "/tmp/x" });
    expect(spawn).toHaveBeenCalledWith(
      "agentseal",
      ["guard"],
      expect.objectContaining({ cwd: "/tmp/x" }),
    );
  });

  it("invokes npx --yes agentseal when useNpx is true", async () => {
    mockSpawn(JSON.stringify({}));
    await runAgentSeal(["guard", "--output", "json"], { useNpx: true });
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["--yes", "agentseal", "guard", "--output", "json"],
      expect.any(Object),
    );
  });
});
