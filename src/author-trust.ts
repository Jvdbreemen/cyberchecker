export interface GitHubInputs {
  ownerCreatedAt: Date;
  totalCommits: number;
  uniqueContributors: number;
  closedIssueRatio: number;
  lastCommit: Date;
  hasReadmeOver500Bytes: boolean;
  hasLicense: boolean;
  ownerOtherRepoCount: number;
}

export interface AuthorTrust {
  score: number;
  summary: string;
}

const DAY_MS = 86_400_000;

function days(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function computeAuthorTrust(inp: GitHubInputs, now: Date = new Date()): AuthorTrust {
  const ageDays = days(inp.ownerCreatedAt, now);
  const ageYears = ageDays / 365;
  const accountAge = clamp((ageYears / 5) * 25, 0, 25);

  const commits = clamp(Math.log10(Math.max(1, inp.totalCommits)) / Math.log10(500) * 20, 0, 20);
  const contributors = clamp(((inp.uniqueContributors - 1) / 9) * 20, 0, 20);
  const closedRatio = clamp(inp.closedIssueRatio >= 0.5 ? 15 : (inp.closedIssueRatio / 0.5) * 15, 0, 15);

  const sinceLast = days(inp.lastCommit, now);
  const recency = clamp(sinceLast <= 30 ? 10 : sinceLast >= 365 ? 0 : (1 - (sinceLast - 30) / 335) * 10, 0, 10);

  const readme = inp.hasReadmeOver500Bytes ? 5 : 0;
  const license = inp.hasLicense ? 5 : 0;

  let raw = accountAge + commits + contributors + closedRatio + recency + readme + license;

  if (ageDays < 30) raw -= 25;
  if (sinceLast >= 180) raw -= 10;
  if (inp.ownerOtherRepoCount === 0) raw -= 10;
  if (inp.totalCommits < 10) raw -= 15;

  const score = Math.round(clamp(raw, 0, 100));
  const ageStr = ageYears >= 1 ? `${ageYears.toFixed(1)}yr account` : `${ageDays}d account`;
  const summary = `${ageStr}, ${inp.totalCommits} commits, ${inp.uniqueContributors} contributors, last commit ${sinceLast}d ago`;

  return { score, summary };
}
