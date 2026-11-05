---
"@bragdoc/local": patch
---

Running `bragdoc service install` again keeps the port and data folder the service already has, unless you give new
ones with `--port` or `--data-dir`. Before, a reinstall without `--port` moved the service back to port 2724.
