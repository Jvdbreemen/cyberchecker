import { spawn } from "node:child_process";

export class AgentSealNotInstalledError extends Error {
  constructor() {
    super(
      "agentseal binary not found. Install it: `npm install -g agentseal` or `pip install agentseal`. " +
        "CyberChecker will fall back to `npx --yes agentseal` if you re-run with --use-npx.",
    );
    this.name = "AgentSealNotInstalledError";
  }
}

export interface RunOptions {
  useNpx?: boolean;
  cwd?: string;
}

export async function runAgentSeal(args: string[], opts: RunOptions = {}): Promise<unknown> {
  const cmd = opts.useNpx ? "npx" : "agentseal";
  const fullArgs = opts.useNpx ? ["--yes", "agentseal", ...args] : args;
  const proc = spawn(cmd, fullArgs, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });

  let stdout = "";
  let stderr = "";

  return new Promise((resolve, reject) => {
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return reject(new AgentSealNotInstalledError());
      reject(err);
    });
    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        return reject(
          new Error(`agentseal exited ${code}: ${stderr.trim() || "no stderr"}`),
        );
      }
      try {
        resolve(stdout.trim() ? JSON.parse(stdout) : {});
      } catch (e) {
        reject(
          new Error(
            `failed to parse agentseal JSON output: ${(e as Error).message}\n--- raw ---\n${stdout}`,
          ),
        );
      }
    });
  });
}
