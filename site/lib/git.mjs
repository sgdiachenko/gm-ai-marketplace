// Dates and commits come from git, never from the clock, so one commit always builds the same site.
import { execFileSync } from 'node:child_process';

function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// YYYY-MM-DD of the last commit that touched `path`, or '' for files that were never committed.
export const lastCommitDate = (root, path) => git(root, ['log', '-1', '--format=%cs', '--', path]);

export function buildCommit(root) {
  const commit = git(root, ['rev-parse', 'HEAD']);
  const iso = git(root, ['log', '-1', '--format=%cI']);
  return {
    commit: commit.slice(0, 7),
    fullCommit: commit,
    date: iso ? new Date(iso).toISOString().replace('.000Z', 'Z') : '',
  };
}
