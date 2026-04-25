import { describe, it, expect } from "vitest";
import { compareSeverity, severityRank, type Severity } from "../src/severity.js";

describe("severity", () => {
  it("ranks CRITICAL highest, CLEAN lowest", () => {
    const s: Severity[] = ["CLEAN", "REVIEW", "ALERT", "CRITICAL"];
    const sorted = [...s].sort(compareSeverity);
    expect(sorted).toEqual(["CRITICAL", "ALERT", "REVIEW", "CLEAN"]);
  });

  it("severityRank returns numeric levels", () => {
    expect(severityRank("CRITICAL")).toBeGreaterThan(severityRank("ALERT"));
    expect(severityRank("ALERT")).toBeGreaterThan(severityRank("REVIEW"));
    expect(severityRank("REVIEW")).toBeGreaterThan(severityRank("CLEAN"));
  });
});
