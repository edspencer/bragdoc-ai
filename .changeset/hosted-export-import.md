---
"@bragdoc/local": patch
---

Moving from the hosted BragDoc app: `bragdoc import <export.json>` brings your export across, companies, projects
(with their repos), achievements, and documents and reviews as read-only files. Run it with `--dry-run` first to see
exactly what would be added, what's already here, and what's left behind and why. Importing the same file again adds
nothing new, and a snapshot of your data is taken before anything is written.
