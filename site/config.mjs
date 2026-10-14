// Where the site and the repository live. Change these when the repository moves.
export const REPO = 'sgdiachenko/gm-ai-marketplace';
export const BRANCH = 'main';
export const GITHUB = `https://github.com/${REPO}`;
// GitHub Pages serves a project site under /<repository>/. Pages link to each other with relative
// paths, so only 404.html, which GitHub serves at any depth, needs this absolute prefix.
export const BASE_PATH = '/gm-ai-marketplace/';
export const SITE_URL = `https://sgdiachenko.github.io${BASE_PATH}`;
// The first Claude Code release with `claude plugin install --marketplace` (docs/installing.md).
export const MIN_CLAUDE_CODE = '2.1.275';
// Which file in site/i18n/ holds the UI strings.
export const LOCALE = 'en';
