---
title: Folio
description: "Folio gathers the achievements in a date range into a Markdown document you can export, copy or print, for reviews and promotion cases."
---

Folio is for the moment you need it all in one place: a self-review, a promotion case, a CV update, a one-to-one. Open
it from **Folio** in the header.

1. **Pick a window:** this quarter, last quarter, the last six months, this year, last year, or any two dates. "This
   quarter" and "this year" run to today. With nothing picked, Folio shows the last six months.
2. **Filter:** by project (including "No project"), by company, or by minimum impact. "At least 5" leaves out
   achievements you haven't rated; at the far left, everything counts, rated or not. Only projects and companies with
   something in the window are offered, with a count.
3. **Choose the clippings:** every matching achievement is listed, best first (highest impact, then newest). Untick
   the ones to leave out, or use **Tick all** and **Untick all**. Unticked ones stay in the list, faded, so you can
   change your mind.
4. **Read the preview:** the right-hand side shows the document as a printout, or as the raw Markdown. Group it by
   **project** (the default), **month** or **week**.
5. **Take it away:** **Export .md** downloads `bragdoc-<from>-<to>.md`; **Copy** puts the same Markdown on the
   clipboard; **Print** prints just the printout, black on white, with each link's address written out (or save it as
   a PDF from your browser's print dialog).

Everything you pick lives in the page's address, so reloading, going back, or bookmarking it brings the same folio
back.

## What's in the document

```md
# Alex Marlowe: achievements

_1 July 2026 – 30 September 2026 · 12 achievements_

## Pre-flight checklist (Altimetry)

- **Offline sync survived its first real weekend** · 13 Sep 2026 · impact 8/10
  Crews ran 140 checklists on flaky Wi-Fi.
  - PR: [altimetry/preflight-web#341: CRDT merge](https://github.com/altimetry/preflight-web/pull/341)
  - Screenshot: sync-dashboard.png
  > Not one conflict all weekend.
  >
  > — Imani Okafor, #preflight
```

- The heading uses the name in your profile; without one, it's just "Achievements". When you've filtered, a line under
  the dates says how.
- Each achievement has its title, its date (or date range), its impact if you've rated it, and its summary (or, if it
  has none, the first paragraph of its notes).
- **Pull requests and links stay links.** Quotes become blockquotes.
- **Files are named, never located.** Screenshots, PDFs and other files appear by their caption or file name only:
  no folder, and no link to BragDoc, which nobody you send the document to could open.
- **Nothing that only works on your computer** goes in: a link to `localhost` or another local address is named and
  marked as left out. Internal ids never appear.

Folio writes nothing to your [data folder](/reference/data-folder/): the document is made in your browser.

## No AI

Folio doesn't write anything for you: v0.1 has no AI. The document is exactly what you picked, in order, nothing added
or rewritten: the facts to write your review from. An optional, opt-in drafting feature may come later; see
[AI is opt-in](/guarantees/ai-is-opt-in/).
