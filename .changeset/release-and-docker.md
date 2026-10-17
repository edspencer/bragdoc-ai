---
"@bragdoc/local": patch
---

BragDoc can run in Docker on your laptop, as an alternative to npm: `docker compose up -d` serves it on
http://localhost:2724 (this computer only) with the same `~/.bragdoc` an npm install uses. Every build now records what
it is (version, commit, build time, and whether it's an official release) for the About page to show, and an
unwritable data folder is reported as such instead of as a port problem.
