---
'@bragdoc/cli': minor
---

Added branch whitelist filtering for the extract command. Projects can now define allowed branches for achievement extraction via the branchWhitelist configuration property. Use `bragdoc projects add --branch-whitelist <branches>` to configure allowed branches, or update with `bragdoc projects update <path> --branch-whitelist <branches>`. When configured, the extract command validates that the current branch is in the whitelist and fails with clear guidance if the branch is not allowed.
