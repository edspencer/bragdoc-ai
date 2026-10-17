# The data home and its files

> **Stub.** PR3 of [#411](https://github.com/edspencer/bragdoc-ai/issues/411) (the file store) writes this document
> properly, and PR9 generates the agent guide's file reference from the same schemas. Until then, this is the layout
> from the specification (R2), so everyone builds towards the same thing.

The data home is `--data-dir`, else `$BRAGDOC_HOME`, else `~/.bragdoc` (D7). Everything in it is a plain file you can
read and edit; BragDoc picks hand edits up live.

```
config.yaml                     # schemaVersion, sources, mcp, allowedHosts; secrets never inlined
profile.yaml                    # name, role, githubLogin, aliases[], notMe[], emails[], timezone
companies/<id>.yaml
projects/<id>.yaml              # name, description, color (#rrggbb), start, end|null, status, companyId?, repoIds[]
repos/<id>.yaml                 # name, localPath?, remoteUrl?, host, tracked
achievements/YYYY/MM/<id>.md    # front-matter + markdown body; YYYY/MM is the ID's creation month
evidence/<aa>/<sha256>.<ext>    # content-addressed blobs
evidence/<aa>/<sha256>.yaml     # sidecar: mime, originalName, bytes, width/height, ocr
found/<id>.yaml                 # Found candidates (pending | kept | dismissed)
imports/<timestamp>/            # documents carried over from a hosted-app export (read-only)
secrets.yaml                    # mode 0600: a GitHub token, if you use one
runtime.json                    # mode 0600: the running server's pid, port, url, version, MCP token
logs/network.jsonl              # every outbound request
backups/<iso>/                  # snapshots
backups/removed/                # "deleted" files are moved here, never unlinked
.gitignore                      # written on first run: keeps machine-written files out of git
cache/                          # derived and deletable
legacy-cli/                     # the old BragDoc CLI's files, moved aside on first run
```

- IDs are ULIDs. References use IDs, never names, so renaming a project rewrites one file.
- Every file is validated when it's loaded. A file that doesn't validate is listed as a Problem and left alone; it's
  never rewritten while it's invalid.
- Every file type carries an integer `schemaVersion`. A file from a newer BragDoc is read-only (and a newer
  `config.yaml` refuses to start).
