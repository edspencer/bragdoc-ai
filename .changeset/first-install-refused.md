---
"@bragdoc/local": patch
---

`bragdoc service install` no longer leaves a service file behind when systemd or launchd refuses a first install (no
user session to load it into, say). Before, `service status` then said BragDoc was installed but not running, and the
next login tried to start it. Re-installing over a working service still keeps it if the manager refuses.
