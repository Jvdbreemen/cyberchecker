import type { Octokit } from "octokit";
import type { GitHubInputs } from "./author-trust.js";

export interface RepoSpec {
  owner: string;
  repo: string;
}

export function parseRepoSpec(s: string): RepoSpec | null {
  const trimmed = s.trim().replace(/\.git$/, "");
  const url = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)/);
  if (url) return { owner: url[1]!, repo: url[2]! };
  const slug = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (slug) return { owner: slug[1]!, repo: slug[2]! };
  return null;
}

function totalFromLink(linkHeader: string | undefined): number | null {
  if (!linkHeader) return null;
  const m = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return m ? parseInt(m[1]!, 10) : null;
}

export async function fetchAuthorInputs(owner: string, repo: string, octokit: Octokit): Promise<GitHubInputs> {
  const [user, repoData, contributors, readme, commits, otherRepos, closedIssues] = await Promise.all([
    octokit.rest.users.getByUsername({ username: owner }),
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.repos.listContributors({ owner, repo, per_page: 100 }).catch(() => ({ data: [] as any[] })),
    octokit.rest.repos.getReadme({ owner, repo }).catch(() => ({ data: { size: 0 } })),
    octokit.rest.repos.listCommits({ owner, repo, per_page: 1 }),
    octokit.rest.repos.listForUser({ username: owner, per_page: 1 }).catch(() => ({ data: [] as any[] })),
    octokit.rest.search.issuesAndPullRequests({ q: `repo:${owner}/${repo} is:issue is:closed` }).catch(() => ({ data: { total_count: 0 } })),
  ]);

  const totalCommits = totalFromLink((commits as any).headers?.link) ?? (commits.data.length || 1);
  const lastCommit = new Date(commits.data[0]?.commit?.author?.date ?? Date.now());
  const closedCount = (closedIssues as any).data.total_count ?? 0;
  const openCount = repoData.data.open_issues_count ?? 0;
  const closedIssueRatio = (closedCount + openCount) === 0 ? 0 : closedCount / (closedCount + openCount);

  return {
    ownerCreatedAt: new Date(user.data.created_at),
    totalCommits,
    uniqueContributors: contributors.data.length,
    closedIssueRatio,
    lastCommit,
    hasReadmeOver500Bytes: ((readme as any).data?.size ?? 0) > 500,
    hasLicense: !!repoData.data.license,
    ownerOtherRepoCount: otherRepos.data.length,
  };
}
