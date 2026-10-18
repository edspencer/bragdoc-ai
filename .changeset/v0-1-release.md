---
"@bragdoc/local": minor
---

BragDoc 0.1.0: the first local release. Run `npx @bragdoc/local` (or `npm i -g @bragdoc/local`, or Docker) and
BragDoc serves on http://localhost:2724, on this computer only, with your achievements as plain files in `~/.bragdoc`.
Pin wins to the board, see projects on a timeline, let GitHub and your screenshots folder fill Found (both off until
you turn them on), turn a date window into markdown with Folio, let your coding agent write over MCP, and bring an
export from the hosted app across. There's no AI, no telemetry and no update check, and Settings → Network activity
shows every request BragDoc makes.

Fixed while testing the release: a very tall picture no longer covers the rest of the board; a screenshot you'd
already pasted onto the board isn't sent to Found again; the board says Ctrl+V rather than ⌘V off a Mac; and names
pasted into Welcome's "what people call you" as a list ("Alex M, @alex") are saved as separate names.
