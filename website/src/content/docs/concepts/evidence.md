---
title: Evidence
description: "Evidence is what backs an achievement up: an image, a PDF, a file, a link, a GitHub pull request, or a quote."
---

:::note[Coming in v0.1]
Evidence is part of the v0.1 board, which is being built. The file format below is already defined.
:::

An **achievement** is something you did or got credit for. **Evidence** is what backs it up. One achievement can carry
several pieces:

| Kind | What it is |
| --- | --- |
| `image` | A screenshot or photo, shown as a print. Its text is read on your machine (OCR) and becomes searchable. |
| `pdf` | A PDF: a design doc, a review, a certificate. |
| `file` | Any other file: slides, a spreadsheet, a recording. |
| `url` | A link: a launch post, a dashboard, a talk recording. |
| `github_pr` | A GitHub pull request, keyed as `github_pr:owner/repo#123`. |
| `quote` | Words someone said about your work, with who said it and where. Shown as a sticky note. |

## Where files go

Files are stored once, in `evidence/` inside your data folder, named by a hash of their content. Adding the same file
twice stores it once. BragDoc checks what a file really is from its first bytes, not its name, and keeps a small
sidecar file next to it with its type, original name, size, and any text read from it.

When BragDoc serves a stored file back to your browser, it does so under strict rules: images are only ever shown as
images, and anything else downloads rather than opening in the page. See
[Localhost security](/guarantees/localhost-security/).

The exact format is in [The data folder](/reference/data-folder/#evidence).
