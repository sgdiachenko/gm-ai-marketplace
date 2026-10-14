# PR Tools

PR Tools reviews and describes pull requests from inside Claude Code. See [the install guide](../../docs/installing.md) and [the skills](skills/).

<script>alert("raw HTML is escaped")</script>

![Review flow](assets/flow.svg)

## Review a pull request

Run the skill with a PR number:

```
/pr-tools:review-pr 482
```

| Severity | Meaning |
|---|---|
| Blocking | Must fix before merge |
| Nit | Optional |
