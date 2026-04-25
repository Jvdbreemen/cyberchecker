import { describe, it, expect } from "vitest";
import { computeAuthorTrust, type GitHubInputs } from "../src/author-trust.js";

const baseInputs: GitHubInputs = {
  ownerCreatedAt: new Date("2020-01-01"),
  totalCommits: 250,
  uniqueContributors: 5,
  closedIssueRatio: 0.6,
  lastCommit: new Date("2026-04-01"),
  hasReadmeOver500Bytes: true,
  hasLicense: true,
  ownerOtherRepoCount: 12,
};

describe("computeAuthorTrust", () => {
  it("scores a healthy repo high", () => {
    const r = computeAuthorTrust(baseInputs, new Date("2026-04-25"));
    expect(r.score).toBeGreaterThanOrEqual(75);
  });

  it("penalises brand-new accounts", () => {
    const r = computeAuthorTrust({ ...baseInputs, ownerCreatedAt: new Date("2026-04-15") }, new Date("2026-04-25"));
    expect(r.score).toBeLessThan(40);
  });

  it("penalises empty repo", () => {
    const r = computeAuthorTrust({ ...baseInputs, totalCommits: 0, uniqueContributors: 1 }, new Date("2026-04-25"));
    expect(r.score).toBeLessThan(60);
  });

  it("clamps to 0-100", () => {
    const r = computeAuthorTrust({
      ownerCreatedAt: new Date("2026-04-20"),
      totalCommits: 0,
      uniqueContributors: 1,
      closedIssueRatio: 0,
      lastCommit: new Date("2020-01-01"),
      hasReadmeOver500Bytes: false,
      hasLicense: false,
      ownerOtherRepoCount: 0,
    }, new Date("2026-04-25"));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("includes a summary string", () => {
    const r = computeAuthorTrust(baseInputs, new Date("2026-04-25"));
    expect(r.summary).toMatch(/commits/);
  });
});
