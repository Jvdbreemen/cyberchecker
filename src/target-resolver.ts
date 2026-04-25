import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

export type TargetKind =
  | { kind: "path"; value: string }
  | { kind: "github"; owner: string; repo: string }
  | { kind: "npm"; name: string; version?: string };

export function classifyTarget(s: string): TargetKind {
  if (s.startsWith("npm:")) {
    const rest = s.slice(4);
    const at = rest.lastIndexOf("@");
    if (at > 0) return { kind: "npm", name: rest.slice(0, at), version: rest.slice(at + 1) };
    return { kind: "npm", name: rest };
  }
  if (/^https?:\/\/github\.com\//.test(s)) {
    const m = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (m) return { kind: "github", owner: m[1]!, repo: m[2]! };
  }
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(s) && !s.includes(".")) {
    const [owner, repo] = s.split("/");
    return { kind: "github", owner: owner!, repo: repo! };
  }
  if (/^[a-zA-Z0-9_./-]+\/[a-zA-Z0-9_.-]+$/.test(s)) {
    const [owner, repo] = s.split("/");
    if (owner && repo && !owner.includes(".") && !s.startsWith(".") && !s.startsWith("/")) {
      return { kind: "github", owner, repo };
    }
  }
  return { kind: "path", value: s };
}

function exec(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: "inherit" });
    p.on("close", code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)));
    p.on("error", reject);
  });
}

export async function resolveTarget(target: TargetKind): Promise<{ workdir: string; cleanup: () => Promise<void> }> {
  if (target.kind === "path") {
    return { workdir: target.value, cleanup: async () => {} };
  }
  const dir = await mkdtemp(join(tmpdir(), "cyberchecker-"));
  if (target.kind === "github") {
    await exec("git", ["clone", "--depth", "1", `https://github.com/${target.owner}/${target.repo}.git`, dir]);
    return { workdir: dir, cleanup: async () => { await exec("rm", ["-rf", dir]); } };
  }
  // npm
  const spec = target.version ? `${target.name}@${target.version}` : target.name;
  await exec("npm", ["pack", spec, "--silent", "--pack-destination", dir], { cwd: dir });
  await exec("sh", ["-c", `tar -xzf "${dir}"/*.tgz -C "${dir}" --strip-components=1`]);
  return { workdir: dir, cleanup: async () => { await exec("rm", ["-rf", dir]); } };
}
