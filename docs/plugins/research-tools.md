# research-tools — maintainer notes

One agent, `researcher`. `sdd-engineering` depends on it (`^1.0.0`): `spec-creator` raises research requests (`RQ#`) and the main session runs one researcher per request. Spec: `specs/sdd-engineering.md`.

## Origin

`sgdiachenko/dev-digest` at `1b694bc41a61`, `.claude/agents/researcher.md`. Changes:

- dev-digest's package list (`server/`, `client/`, …) replaced by "the module the question is about";
- the rule about mirrored contract folders generalized to any mirrored or vendored file;
- version pinning reads any manifest and lockfile, not only `package.json`;
- a scope given in the prompt (directory, package, commit range) is respected;
- the report formats are unchanged; `sdd-engineering` relies on the *Not found / gaps* section.

## Context cost

`claude plugin details research-tools` on Claude Code 2.1.299: ~100 tokens always-on, ~2k on invoke.

## Compatibility

The report headings (*Answer (TL;DR)*, *Conclusions*, *Evidence*, *Not found / gaps*) are what callers read. Renaming or removing one is a major release.
