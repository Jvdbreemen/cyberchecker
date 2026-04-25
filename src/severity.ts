export type Severity = "CRITICAL" | "ALERT" | "REVIEW" | "CLEAN";

export const SEVERITIES: Severity[] = ["CRITICAL", "ALERT", "REVIEW", "CLEAN"];

export function severityRank(s: Severity): number {
  switch (s) {
    case "CRITICAL": return 4;
    case "ALERT": return 3;
    case "REVIEW": return 2;
    case "CLEAN": return 1;
  }
}

export function compareSeverity(a: Severity, b: Severity): number {
  return severityRank(b) - severityRank(a);
}
