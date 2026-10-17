---
version: "0.1.2"
level: copilot
processes:
  design: pair
  implementation: copilot
  testing: copilot
  documentation: copilot
  review: pair
  deployment: assist
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.2).

## Notes

BragDoc Local is built by its author working with Claude Code agents.

- **Design is the author's.** What BragDoc is for and the rules it keeps are decisions the author made and argued
  through with Claude: your data as plain files, localhost only, no telemetry, AI off unless you turn it on, nothing
  reaching your board without you. They're written down in [spec.md](spec.md) and the decisions log
  ([docs/decisions.md](docs/decisions.md)), with what was rejected.
- **Implementation and tests are largely generated under review.** Agents write code and tests against the
  specification, each pull request is reviewed independently before it merges, and the author decides what lands.
  Commits an agent helped write carry a `Co-Authored-By: Claude` trailer.
- **Checked by running it.** CI runs the typecheck, the test suite and the build on Linux and macOS, and a browser
  smoke test on Linux, before anything merges, and every change someone can see is driven in a real browser before it's called done.
- **Releases are automated, never from a laptop.** npm releases will come from GitHub Actions with trusted publishing
  and provenance, after CI has passed on the exact commit ([RELEASING.md](RELEASING.md)).

### Why this file exists

Because "was this vibe-coded?" is a fair question to ask of a tool that holds your work history, and the useful answer
is a specific one. If you're sceptical of generated code, this tells you where to look: the specification, the
guarantees in [SECURITY.md](SECURITY.md), and the tests that hold them.
