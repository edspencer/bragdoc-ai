# @bragdoc/local

## 0.1.0

### Minor Changes

- [#433](https://github.com/edspencer/bragdoc-ai/pull/433) [`95338b9`](https://github.com/edspencer/bragdoc-ai/commit/95338b92bee79428dfa6a94afcd729c371943350) Thanks [@edspencer](https://github.com/edspencer)! - BragDoc 0.1.0: the first local release. Run `npx @bragdoc/local` (or `npm i -g @bragdoc/local`, or Docker) and
  BragDoc serves on http://localhost:2724, on this computer only, with your achievements as plain files in `~/.bragdoc`.
  Pin wins to the board, see projects on a timeline, let GitHub and your screenshots folder fill Found (both off until
  you turn them on), turn a date window into markdown with Folio, let your coding agent write over MCP, and bring an
  export from the hosted app across. There's no AI, no telemetry and no update check, and Settings → Network activity
  shows every request BragDoc makes.
  
  Fixed while testing the release: a very tall picture no longer covers the rest of the board; a screenshot you'd
  already pasted onto the board isn't sent to Found again; the board says Ctrl+V rather than ⌘V off a Mac; and names
  pasted into Welcome's "what people call you" as a list ("Alex M, @alex") are saved as separate names.

### Patch Changes

- [#422](https://github.com/edspencer/bragdoc-ai/pull/422) [`af74110`](https://github.com/edspencer/bragdoc-ai/commit/af74110f06552fb387b2a33b9308eb1ae10b6474) Thanks [@edspencer](https://github.com/edspencer)! - The Board: paste or drop screenshots, PDFs, files, links and GitHub PR links (shown as owner/repo#n; nothing is fetched unless GitHub is connected), or type a line, and it's pinned to a week-by-week board. Edit, archive and remove (with Undo); search; a Found strip; a Problems banner for broken files; and live updates when files change on disk or an agent writes over MCP.

- [#427](https://github.com/edspencer/bragdoc-ai/pull/427) [`ca9abf7`](https://github.com/edspencer/bragdoc-ai/commit/ca9abf704d95413f0aeea3d686c24d6e3d65857d) Thanks [@edspencer](https://github.com/edspencer)! - Folio: pick a date window (this quarter, last quarter, the last six months, this year, last year, or any dates), filter by project, company and minimum impact, untick anything that doesn't belong, and take it away as Markdown (Export .md or Copy) or print it. The document is grouped by project, month or week, best first, with pull requests and links kept as links and files named but never located, so it's safe to send on. Everything you picked stays in the page's address.

- [#429](https://github.com/edspencer/bragdoc-ai/pull/429) [`e310f22`](https://github.com/edspencer/bragdoc-ai/commit/e310f22a77541061b86cd77d4a1e09f43b08935c) Thanks [@edspencer](https://github.com/edspencer)! - Found and the GitHub source. Connect GitHub in Settings → Sources, through the gh CLI you're already logged in to (no
  token stored) or a fine-grained token, and BragDoc finds the pull requests you merged: in the last 90 days at first,
  everywhere or only in the owners and repositories you pick. Each one waits in Found with the plain rules it passed;
  keep it (it becomes an achievement with the PR attached), merge it into one you have, or dismiss it for good, each
  with Undo. It checks when you press Check now, and every hour only if you turn that on. Every request is in Network
  activity, and problems (gh missing or logged out, a refused token, offline, rate limits) are said plainly.

- [#424](https://github.com/edspencer/bragdoc-ai/pull/424) [`5bef1b8`](https://github.com/edspencer/bragdoc-ai/commit/5bef1b8b05f4b16ca579f946ba571371d3977d9a) Thanks [@edspencer](https://github.com/edspencer)! - Moving from the hosted BragDoc app: `bragdoc import <export.json>` brings your export across, companies, projects
  (with their repos), achievements, and documents and reviews as read-only files. Run it with `--dry-run` first to see
  exactly what would be added, what's already here, and what's left behind and why. Importing the same file again adds
  nothing new, and a snapshot of your data is taken before anything is written.

- [#420](https://github.com/edspencer/bragdoc-ai/pull/420) [`924413b`](https://github.com/edspencer/bragdoc-ai/commit/924413bf1887558dedb930a4ae75251ef439672b) Thanks [@edspencer](https://github.com/edspencer)! - Your coding agent can now read and write BragDoc over MCP. `bragdoc mcp install claude` registers it with Claude Code;
  then "note this in my BragDoc" works: the agent reads your context first (`bragdoc_get_context`), searches for
  duplicates, and what it writes goes on the board marked "Written by Claude Code" (or to Found, with
  `mcp.writeTo: found`). `bragdoc mcp` is a stdio bridge for other clients, `--print` shows their config, and
  `bragdoc guide` prints the guide for agents (also served at `/agent-guide.md` and `/llms.txt`).

- [#430](https://github.com/edspencer/bragdoc-ai/pull/430) [`8062b5a`](https://github.com/edspencer/bragdoc-ai/commit/8062b5a02ca74e48afc190e2b28ef5c8f00b01cd) Thanks [@edspencer](https://github.com/edspencer)! - Welcome: the first time you open BragDoc, three skippable steps. Say who you are and what people call you at work;
  see each source, off until you switch it on (connect GitHub there if you like); and, if you want, name the folder you
  keep your code in: BragDoc looks a few levels deep for five seconds at most, says why each repo is suggested ("you
  pushed 3 days ago"), and saves only the repos you tick. Editors' recent-project lists are read only if you tick them.
  Run any step again from Settings → Data.
  
  Example data: "Fill it with example data" on the empty board adds a few months of a made-up engineer's work, marked
  as examples; "Remove example data" takes away exactly that and nothing of yours. The empty board now says what Found
  is watching, or how to turn a source on.

- [#421](https://github.com/edspencer/bragdoc-ai/pull/421) [`58d6d66`](https://github.com/edspencer/bragdoc-ai/commit/58d6d66ccd32e6610ba77f50976a0792d8a6aa00) Thanks [@edspencer](https://github.com/edspencer)! - The Projects page works: your projects on a timeline, in company swimlanes, each in any colour you like (twelve swatches
  or a colour picker, with text that stays readable on it), striped while they're ongoing, with a "today" marker. Click
  a project to see its pile of achievements. Create and edit projects and companies, archive or delete them (with Undo),
  and link repos, added by their folder (BragDoc reads that repo's git config for its remote, and nothing else) or by
  their URL.

- [#417](https://github.com/edspencer/bragdoc-ai/pull/417) [`ba93331`](https://github.com/edspencer/bragdoc-ai/commit/ba93331f117bb8f5b11158f9fd18054a3a044d0b) Thanks [@edspencer](https://github.com/edspencer)! - BragDoc can run in Docker on your laptop, as an alternative to npm: `docker compose up -d` serves it on
  http://localhost:2724 (this computer only) with the same `~/.bragdoc` an npm install uses. Every build now records what
  it is (version, commit, build time, and whether it's an official release) for the About page to show, and an
  unwritable data folder is reported as such instead of as a port problem.

- [#431](https://github.com/edspencer/bragdoc-ai/pull/431) [`a1d2cce`](https://github.com/edspencer/bragdoc-ai/commit/a1d2cce9196c1b83ead2f2c7923246692ac01acd) Thanks [@edspencer](https://github.com/edspencer)! - The screenshots folder: choose a folder in Settings → Sources and BragDoc watches it for new screenshots, reads each one on your computer (no AI, nothing sent anywhere), and sends the ones that are praise for you to Found, with the picture, the words on a sticky and the rules they passed. The rest are only counted ("40 looked at · 3 sent to Found"). Off until you turn it on; only new files are read unless you ask it to look at the last 7 days; on a Mac it explains the Desktop permission prompt and how to give screenshots a folder of their own. Pictures you paste or drop on the board are read in the background too, so their words are searchable, and when they're praise for you the composer offers the quote as a sticky.

- [#423](https://github.com/edspencer/bragdoc-ai/pull/423) [`a9243c5`](https://github.com/edspencer/bragdoc-ai/commit/a9243c54ddcda2061497cc46f0ac46e137ff29a5) Thanks [@edspencer](https://github.com/edspencer)! - Settings now shows what BragDoc does and lets you check it. **Network activity** is a live receipt of every outbound
  request BragDoc made or refused, with what it's allowed to talk to right now, and a button that asks it to send
  something it isn't allowed to so you can watch it refuse. **Data** shows where your data folder is, any files BragDoc
  couldn't read (live, as you edit them), and your backups. **About & verify** shows what this build says about itself
  and the commands that check a release independently; local builds say "unofficial build". **Sources** has the address
  and token your coding agents connect with (show, copy, or make a new one) and whether their achievements go straight
  onto your board or into Found.
