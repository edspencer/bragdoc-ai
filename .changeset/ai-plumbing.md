---
"@bragdoc/local": patch
---

Two things for opt-in AI, both yours to read. Your instructions for the models are plain Markdown files in your data folder's `ai/` folder: `what-counts.md` (what counts as a win for you) and `style.md` (how you write). They're backed up, picked up when you edit them by hand, and a broken or overlong one is listed as a Problem rather than ever being overwritten. And every time anything asks a model something, a line is added to `logs/ai-runs.jsonl`: when, what for, which model and where it ran, how many items and tokens, and how it went, but never what was sent or answered. With AI off nothing is written.
