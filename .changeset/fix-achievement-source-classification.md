---
"@bragdoc/cli": patch
---

Fix achievement source classification for commit-extracted achievements. Previously, achievements extracted from Git commits were incorrectly saved with source='llm' instead of source='commit'. This fix ensures correct source classification, enabling proper filtering and analytics based on achievement origin.
