import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml } from "yaml";
import type { Severity } from "./severity.js";
import type { Finding } from "./verdict.js";

export interface Rule {
  id: string;
  severity: Severity;
  paths: string[];
  match: { type: "jsonpath"; expr: string; pattern: string } | { type: "regex"; pattern: string };
  message: string;
  remediation?: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = join(HERE, "hardening-rules");

export interface LoadOptions {
  userYamlPath?: string;
  userYamlContent?: string;
  defaultsDir?: string;
}

export async function loadRules(opts: LoadOptions = {}): Promise<Rule[]> {
  const dir = opts.defaultsDir ?? RULES_DIR;
  const files = await readdir(dir).catch(() => [] as string[]);
  const yamls = files.filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
  const defaults: Rule[] = [];
  for (const f of yamls) {
    const content = await readFile(join(dir, f), "utf8");
    const parsed = parseYaml(content);
    if (Array.isArray(parsed)) defaults.push(...parsed);
  }

  let user: Rule[] = [];
  if (opts.userYamlContent) user = parseYaml(opts.userYamlContent) ?? [];
  else if (opts.userYamlPath) {
    try {
      user = parseYaml(await readFile(opts.userYamlPath, "utf8")) ?? [];
    } catch { user = []; }
  }

  const byId = new Map<string, Rule>();
  for (const r of defaults) byId.set(r.id, r);
  for (const r of user) byId.set(r.id, r);
  return [...byId.values()];
}

export function expandPath(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

function jsonpath(obj: any, expr: string): unknown[] {
  if (!expr.startsWith("$")) return [];
  const segments: string[] = [];
  const re = /\.([\w-]+)|\[\*\]/g;
  let m: RegExpExecArray | null;
  let last = 1;
  while ((m = re.exec(expr)) !== null) {
    segments.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last !== expr.length) return [];

  let cur: unknown[] = [obj];
  for (const seg of segments) {
    const next: unknown[] = [];
    for (const node of cur) {
      if (node == null) continue;
      if (seg === "[*]") {
        if (Array.isArray(node)) next.push(...node);
        else if (typeof node === "object") next.push(...Object.values(node as object));
      } else {
        const key = seg.slice(1);
        if (typeof node === "object" && key in (node as object)) next.push((node as any)[key]);
      }
    }
    cur = next;
  }
  return cur;
}

export function applyJsonpathRule(rule: Rule, obj: unknown, path: string): Finding[] {
  if (rule.match.type !== "jsonpath") return [];
  const matches = jsonpath(obj, rule.match.expr);
  const re = new RegExp(rule.match.pattern);
  const out: Finding[] = [];
  for (const v of matches) {
    if (typeof v === "string" && re.test(v)) {
      out.push({ severity: rule.severity, id: rule.id, message: rule.message, path });
    }
  }
  return out;
}

export function applyRegexRule(rule: Rule, content: string, path: string): Finding[] {
  if (rule.match.type !== "regex") return [];
  const re = new RegExp(rule.match.pattern, "m");
  if (re.test(content)) return [{ severity: rule.severity, id: rule.id, message: rule.message, path }];
  return [];
}
