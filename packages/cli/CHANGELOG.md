# @bragdoc/cli

## 1.3.0

### Minor Changes

- 5392db6: Added branch whitelist filtering for the extract command. Projects can now define allowed branches for achievement extraction via the branchWhitelist configuration property. Use `bragdoc projects add --branch-whitelist <branches>` to configure allowed branches, or update with `bragdoc projects update <path> --branch-whitelist <branches>`. When configured, the extract command validates that the current branch is in the whitelist and fails with clear guidance if the branch is not allowed.

## 1.2.1

### Patch Changes

- 52f5092: fixed a bug where commits would be marked processed even when the extraction failed

## 1.2.0

### Minor Changes

- 0538992: Bumped mdx-prompt dependency

## 1.1.3

### Patch Changes

- 4cabb4f: moved the welcome message to be on first-run instead of attempting a postinstall
- 4cabb4f: When auto-detecting project names, don't use the github username, just the project name

## 1.1.2

### Patch Changes

- e9b2f4b: Postinstall message

## 1.1.1

### Patch Changes

- e534144: Fix CLI build error

## 1.1.0

### Minor Changes

- fbd85c7: Added configurable detail levels to bragdoc extract

### Patch Changes

- dbe02f6: Fix default API URL to point to https://app.bragdoc.ai instead of https://www.bragdoc.ai

## 1.0.0

### Major Changes

- 92e4f17: Rewrote the web frontend, split into a turborepo
- 917f2f5: LLM extraction of Achievements moved from server side to client side

### Patch Changes

- Updated dependencies [92e4f17]
  - @bragdoc/config@1.0.0

## 0.1.2

### Patch Changes

- 290e050: Fixed commit API response type

## 0.1.1

### Patch Changes

- bafe9d3: Initial release
