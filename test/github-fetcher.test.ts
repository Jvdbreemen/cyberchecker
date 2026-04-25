import { describe, it, expect, vi } from "vitest";
import { fetchAuthorInputs, parseRepoSpec } from "../src/github-fetcher.js";

describe("parseRepoSpec", () => {
  it("parses owner/repo", () => {
    expect(parseRepoSpec("foo/bar")).toEqual({ owner: "foo", repo: "bar" });
  });
  it("parses https URL", () => {
    expect(parseRepoSpec("https://github.com/foo/bar")).toEqual({ owner: "foo", repo: "bar" });
  });
  it("parses https URL with .git suffix", () => {
    expect(parseRepoSpec("https://github.com/foo/bar.git")).toEqual({ owner: "foo", repo: "bar" });
  });
  it("returns null on invalid", () => {
    expect(parseRepoSpec("not-a-repo")).toBeNull();
  });
});

describe("fetchAuthorInputs", () => {
  it("aggregates octokit responses into GitHubInputs", async () => {
    const fakeOctokit = {
      rest: {
        users: { getByUsername: vi.fn().mockResolvedValue({ data: { created_at: "2020-01-01T00:00:00Z" } }) },
        repos: {
          get: vi.fn().mockResolvedValue({ data: { open_issues_count: 5, license: { key: "mit" } } }),
          listContributors: vi.fn().mockResolvedValue({ data: [{ login: "a" }, { login: "b" }, { login: "c" }] }),
          getReadme: vi.fn().mockResolvedValue({ data: { size: 1200 } }),
          listCommits: vi.fn().mockResolvedValue({ data: [{ commit: { author: { date: "2026-04-15T12:00:00Z" } } }], headers: { link: '<...&page=12>; rel="last"' } }),
          listForUser: vi.fn().mockResolvedValue({ data: new Array(8).fill({}) }),
        },
        search: { issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { total_count: 10 } }) },
      },
    };

    const inputs = await fetchAuthorInputs("foo", "bar", fakeOctokit as any);
    expect(inputs.uniqueContributors).toBe(3);
    expect(inputs.totalCommits).toBe(12);
    expect(inputs.hasReadmeOver500Bytes).toBe(true);
    expect(inputs.hasLicense).toBe(true);
    expect(inputs.ownerOtherRepoCount).toBe(8);
    expect(inputs.lastCommit.toISOString()).toMatch(/^2026-04-15/);
  });
});
