# @bragdoc/local

## 0.2.0

### Minor Changes

- [#445](https://github.com/edspencer/bragdoc-ai/pull/445) [`ad482ad`](https://github.com/edspencer/bragdoc-ai/commit/ad482ad3f1651fa4c31ef6b95ad8cecd53aac1f1) Thanks [@edspencer](https://github.com/edspencer)! - BragDoc 0.2.0: opt-in AI. Everything from 0.1 works exactly as before with AI off, which is how it starts: no model is
  contacted and the AI SDK isn't even loaded. Turn it on in Settings → AI and point it at a model runner you already
  have (Ollama, LM Studio, llama.cpp or any OpenAI-compatible server, on this computer or your network), or at
  Anthropic, OpenAI or OpenRouter with your own key, which sends nothing until you've read exactly what each feature
  would send there and pressed Allow. Then switch on what you want: a judge in Found that says whether a candidate looks
  like a win for you, and why, and never keeps or dismisses anything itself; Tidy this up on the board; and Draft with
  AI in Folio, with every bullet citing its achievement. Every model call is in Network activity, and every run in the
  AI activity log.

### Patch Changes

- [#435](https://github.com/edspencer/bragdoc-ai/pull/435) [`eaa64f9`](https://github.com/edspencer/bragdoc-ai/commit/eaa64f9ae6551cd8c35cbcd26731f6a712f13251) Thanks [@edspencer](https://github.com/edspencer)! - The groundwork for opt-in AI. `config.yaml` gains an `ai:` section with everything off: a master switch, connections to a model runner on your machine or network (Ollama, LM Studio, llama.cpp, any OpenAI-compatible server) or to a cloud provider (Anthropic, OpenAI, OpenRouter), and a switch per feature. With AI off nothing changes and BragDoc doesn't even load its AI code. A connection whose address is on the internet sends nothing, not even a test, until you accept a statement of exactly what would be sent there; keys are kept in `secrets.yaml` and never shown again. Every model call, local ones included, appears in Network activity marked as going to this computer, your network or the internet.

- [#444](https://github.com/edspencer/bragdoc-ai/pull/444) [`b0b2707`](https://github.com/edspencer/bragdoc-ai/commit/b0b2707a260324cf17f5c9aac10224df91fc54fe) Thanks [@edspencer](https://github.com/edspencer)! - The docs site has an AI section: what each opt-in feature does and sends, setting up a local model (and that a runner's own traffic is outside BragDoc's log), choosing a model with the measured numbers, the judge, Tidy, Draft, and one privacy page per cloud provider with its consent statement word for word. "AI is opt-in" now lists each rule with the code that enforces it.

- [#440](https://github.com/edspencer/bragdoc-ai/pull/440) [`8d236ad`](https://github.com/edspencer/bragdoc-ai/commit/8d236add0dc915486de42dd5eab0c778c8cb22b3) Thanks [@edspencer](https://github.com/edspencer)! - Draft with AI in Folio, for when AI and its Draft feature are both on (they're off until you turn them on). Beside Copy and Export, with an optional "What's this for?" note, it writes a self-review draft from exactly the achievements your folio picks, highest impact first, each bullet citing the achievements it came from. Every line is checked: a number, date or name that isn't in what it cites, a bullet with no citation, and stock filler are flagged, and clicking a flag selects the line. The draft streams in (with Cancel), is yours to edit, copy or export as `bragdoc-draft-<from>-<to>.md`, and is never saved anywhere; if a folio is too big for the model, the lowest-impact achievements are left out and Folio says how many. The plain export is unchanged.

- [#442](https://github.com/edspencer/bragdoc-ai/pull/442) [`e0c034c`](https://github.com/edspencer/bragdoc-ai/commit/e0c034cb535a7042ab556cb177dc1c05c8130736) Thanks [@edspencer](https://github.com/edspencer)! - The Found judge can use Jev, TypeSafe's yes-or-no decision model, through your OpenRouter key: add it in Settings → AI, read what it would send and allow it (its own consent, separate from OpenRouter's), then "Use for the judge". Jev answers with a probability only ("Looks like a win · 94%") and never says why, and BragDoc never makes a reason up for it. It can't write, so Tidy and Draft never use it.

- [#436](https://github.com/edspencer/bragdoc-ai/pull/436) [`6b99fe1`](https://github.com/edspencer/bragdoc-ai/commit/6b99fe1f53de23bcc879cab8d4bde1ecaa6b2014) Thanks [@edspencer](https://github.com/edspencer)! - Two things for opt-in AI, both yours to read. Your instructions for the models are plain Markdown files in your data folder's `ai/` folder: `what-counts.md` (what counts as a win for you) and `style.md` (how you write). They're backed up, picked up when you edit them by hand, and a broken or overlong one is listed as a Problem rather than ever being overwritten. And every time anything asks a model something, a line is added to `logs/ai-runs.jsonl`: when, what for, which model and where it ran, how many items and tokens, and how it went, but never what was sent or answered. With AI off nothing is written.

- [#437](https://github.com/edspencer/bragdoc-ai/pull/437) [`3f8cd77`](https://github.com/edspencer/bragdoc-ai/commit/3f8cd77fb6f1018c81f4a49e3e00c314325ae80a) Thanks [@edspencer](https://github.com/edspencer)! - Settings → AI: one place to see and control everything AI, where nothing happens without you. AI is still off by
  default, and with it off nothing on this page can reach a model. Turn it on to add where models run (Ollama, LM
  Studio, llama.cpp, any OpenAI-compatible server, or Anthropic, OpenAI and OpenRouter with your own key), test a
  connection and see the answer in plain words, and pick the model features will use. Anything on the internet asks
  first: a consent screen says exactly what each feature would send there, field by field, and whose terms apply, and
  nothing is sent before you allow it. "Look for a model runner on this computer" finds one you already have (BragDoc
  never installs one), and "Recommended for this computer" suggests a model from your RAM, with its `ollama pull`
  command and, after a confirm that states the download size, free disk space and RAM, an "Ask Ollama to download it"
  button. Network activity now stamps every model call this computer, your network or internet, and totals what went to
  AI providers on the internet. While AI is on, the header shows where models run.

- [#439](https://github.com/edspencer/bragdoc-ai/pull/439) [`138c746`](https://github.com/edspencer/bragdoc-ai/commit/138c74633f67630260adeb03454e1dd3ffc068cb) Thanks [@edspencer](https://github.com/edspencer)! - "Tidy this up" on the board, for when AI and Tidy are both switched on. Paste something messy (a chat message, a PR description, a rambling note) or a screenshot, press Tidy this up, and you get a suggested title, summary, date, impact and projects beside what you wrote. Use any field, or all of them; nothing is saved until you pin it, and what you wrote is kept in the notes. It uses only what's in your text: any number, date or name in the suggestion that isn't in your text is underlined, a date your text doesn't support is left out, and something that isn't an achievement (a calendar invite, say) is called that. It works in the edit drawer too. With AI or Tidy off, there's no button at all.

- [#443](https://github.com/edspencer/bragdoc-ai/pull/443) [`4d025df`](https://github.com/edspencer/bragdoc-ai/commit/4d025dfe7b99d5f83c1731857dcfd1bea9432359) Thanks [@edspencer](https://github.com/edspencer)! - The Found judge gets its card in Settings → AI and its place in Found. Switching it on gives you Judge now and nothing else; it then asks whether to also judge new things as they arrive, and says what that costs on this computer. You can also have it run every few hours, only between two times of day, and only when your computer is plugged in; a cloud model needs one more tick before anything is sent in the background. Each run is in AI activity, in plain words (including why one stopped or is waiting). Found groups what's waiting into "Looks like a win", "Not judged yet" and "Probably not", which stays collapsed and is never dismissed for you: "Dismiss these N" does it in one go, with Undo. Each card shows why the judge thinks so, a Judge again button and exactly what's sent, and Keep files it under the judge's suggested projects too. Edit "What counts as a win for me" right on the card; Settings shows how often you agreed with the judge. With AI off, none of it appears.

- [#438](https://github.com/edspencer/bragdoc-ai/pull/438) [`b44cbe4`](https://github.com/edspencer/bragdoc-ai/commit/b44cbe456ae886162e0beac96a9fcf9ef19a10ac) Thanks [@edspencer](https://github.com/edspencer)! - An opt-in judge for Found. With AI and the judge switched on, **Judge now** on the Found page asks your model about each screenshot waiting there (and merged PRs, if you tick them): is it a win worth saving, why, and how sure. Its answer appears on the card as "Looks like a win · 86%" or "Probably not · 70%", with the reason and which model said so. It's only an opinion: the judge never keeps or dismisses anything, and never touches a candidate you've already decided. It reads the screenshot again on your machine, marks which messages are yours, and follows your own `ai/what-counts.md`, which BragDoc writes for you from your profile the first time you switch the judge on. A quote it gives that isn't word for word in the screenshot is dropped. With AI off again, earlier verdicts stay, marked "judged earlier". Agents see your `what-counts.md` too, in `bragdoc_get_context`.

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
