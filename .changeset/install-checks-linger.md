---
"@bragdoc/local": patch
---

`bragdoc service install` on Linux now checks whether lingering is on (`loginctl show-user`), and only when it's off
says why it matters (the service stops when you log out) and prints `sudo loginctl enable-linger <user>`, as `bragdoc
doctor` does. Before, it told everyone to run `loginctl enable-linger` (without `sudo`), and `service status` repeated
it. When `loginctl` can't answer (in a container, say) it says nothing. With `--json`, the advice is in the document's
`warnings`. BragDoc never runs `sudo` itself.
