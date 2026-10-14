---
name: engineering-insights
description: "Reads and appends to INSIGHTS.md, the append-only log of non-obvious findings (gotchas, what worked, what didn't). Use at the start of a task to load prior findings for the area you touch, and at the end of a substantive session to record a new one. Trigger terms: INSIGHTS.md, gotcha, lesson learned, note this, wrap up."
metadata:
  tags: insights, learnings, session-start, wrap-up, documentation
---

# Engineering insights

`INSIGHTS.md` is a project's memory of things that turned out to be true and weren't obvious. It is append-only: history stays, corrections are new entries.

## Where the file lives

- A repository with modules or packages may keep one `INSIGHTS.md` per module, next to that module's `AGENTS.md` or `README.md`, plus one at the root.
- A smaller repository keeps a single `INSIGHTS.md` at the root.
- The project's `AGENTS.md` / `CLAUDE.md` may say where it lives and what an entry looks like. Follow it over the defaults here.
- No `INSIGHTS.md` anywhere: read nothing; create one only when you have an entry to write and the task allows writing files.

## Start of a task

Read the `INSIGHTS.md` of every module the task touches, and the root one, **before** doing any work. Note what's relevant; don't re-derive something already recorded. In a long file, search for the task's terms and read those entries plus the section they sit in.

## End of a substantive session

Write only when something non-obvious happened: a real problem solved, a decision made, a surprise hit. A trivial edit writes nothing.

1. Re-read the file right before writing; another session may have added to it.
2. If the finding is already there, write nothing.
3. Otherwise add one entry in the file's existing format. When the file has no format of its own, add a dated bullet under the existing heading it fits, after that section's last entry — never a new heading:

   ```markdown
   - **YYYY-MM-DD** — <specific, actionable finding>. Evidence: `path:line`.
   ```

## Never overwrite

- **Never regenerate or rewrite the file.** Only insert. Every existing entry must come out byte-for-byte identical.
- Never edit or delete a prior entry to "fix" it; correct it with a new dated entry that says what changed.
- A rule that should hold **always** belongs in the module's `AGENTS.md`, not here.

## Read-only callers

Reviewers, verifiers and planners read `INSIGHTS.md` as context and never append to it. When such an agent finds something worth recording, it says so in its report and the main session or the user decides whether to write it.
