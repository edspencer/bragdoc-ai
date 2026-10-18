---
title: Evidence
description: "Evidence is what backs an achievement up: an image, a PDF, a file, a link, a GitHub pull request, or a quote."
---

An **achievement** is something you did or got credit for. **Evidence** is what backs it up. One achievement can carry
several pieces:

| Kind | What it is |
| --- | --- |
| `image` | A screenshot or photo, shown as a print. If it's a PNG, JPEG, GIF or WebP, its text is read on your machine (OCR) and becomes searchable. |
| `pdf` | A PDF: a design doc, a review, a certificate. |
| `file` | Any other file: slides, a spreadsheet, a recording. |
| `url` | A link: a launch post, a dashboard, a talk recording. |
| `github_pr` | A GitHub pull request, keyed as `github_pr:owner/repo#123`. |
| `quote` | Words someone said about your work, with who said it and where. Shown as a sticky note. |

## Where files go

Files are stored once, in `evidence/<aa>/<sha256>.<ext>` inside your data folder, named by a hash of their content.
Adding the same file twice stores it once. BragDoc checks what a file really is from its first bytes, not its name: an
upload that claims to be a picture or a PDF but isn't is refused. Next to each file it keeps a small sidecar file with
its type, original name, size, a picture's width and height, and any text read from it. Each file can be up to 25 MB.

When BragDoc serves a stored file back to your browser, it does so under strict rules: PNG, JPEG, GIF, WebP, AVIF and
SVG pictures are shown as pictures (and only ever as pictures, so an SVG can't run a script), and everything else,
other picture formats included, downloads rather than opening in the page. See
[Localhost security](/guarantees/localhost-security/).

The exact format is in [The data folder](/reference/data-folder/#evidence).
