---
title: Choosing a model
description: "Which local model to run for BragDoc's AI features, by how much RAM you have, and what each one actually scored as the judge on a synthetic test set. Under 8 GB there's no local recommendation."
---

Settings → AI reads this computer's RAM, processor and the free space in your home folder (on this computer; they're
never sent anywhere) and suggests a model from the table below. The tables on this page are generated from the same
code the app uses, so the two can't disagree.

## Recommended local models

<!-- ai-reference:models:start -->
| Model | Tier | Download | RAM it wants | Notes |
|---|---|---|---|---|
| `gemma4:e4b` | The default | about 6.6 GB | 16 GB | The default. 100% recall in the spike. Bundles vision encoders for later. |
| `qwen3.5:4b` | The 8 GB pick | about 3.3 GB | 8 GB | The 8 GB pick. Higher precision, slightly lower recall. |
| `gemma4:26b-a4b` | “Better” tier | larger (it varies) | 32 GB | The "better" tier: about 99% hosted in the spike; not measured locally. |
| `qwen3:14b` | “Better” tier | larger (it varies) | 32 GB | The "better" tier: about 99% hosted in the spike; not measured locally. |
| `phi-4` | “Better” tier | larger (it varies) | 32 GB | The "better" tier: about 99% hosted in the spike; not measured locally. |

What Settings → AI suggests from this computer's RAM: **16 GB or more**, `gemma4:e4b`; **8–16 GB**, `qwen3.5:4b`; **under 8 GB, nothing**. No model that small was measured on a local runner, and the measurements below show a hosted model's score doesn't carry over to the same weights run locally, so BragDoc doesn't guess: it says a local model will struggle there, and suggests a cloud provider or leaving AI off.

The table is as of 2026-10-18. Only `gemma4:e4b` and `qwen3.5:4b` have a known download size, so they're the only two BragDoc offers to ask Ollama to download (after a confirm). Any other model is `ollama pull <name>` in a terminal.
<!-- ai-reference:models:end -->

"The spike" is the experiment BragDoc's AI design came from, run before any of it was built (its findings are
summarised in [issue #434](https://github.com/edspencer/bragdoc-ai/issues/434)); "recall" there is the
share of real wins the whole pipeline kept. **Avoid general models of 3B parameters or fewer as the judge**: in the
spike, the smallest general models kept almost everything or answered at random. Gemma 4 E4B and Qwen 3.5 4B are the
exceptions that were measured.

## What the judge scored

These are measurements, not promises. Every one is on a **synthetic, deliberately adversarial test set**: 218 chat
messages about a made-up engineer (praise, praise for someone else, their own messages, passing thanks, routine
chatter, and 20 sarcastic ones), drawn as screenshots, plus 20 made-up merged pull requests. Your own screenshots will
differ.

<!-- ai-reference:measured:start -->
| Model | Where | Ran on | Screenshots read as | Precision | Recall | Sarcasm kept | Merged PRs right | Median per message | Replayed in CI |
|---|---|---|---|---|---|---|---|---|---|
| `gemma4:e4b` | local runner | Ollama, CPU only (a 2020 desktop, no GPU) | perfect text | 83% | 100% | 8 of 20 | 20 of 20 | 10.2 s | yes |
| `qwen3.5:4b` | local runner | Ollama, CPU only (a 2020 desktop, no GPU) | perfect text | 89% | 95% | 5 of 20 | 20 of 20 | — | yes |
| `typesafe/jev-1.14` | cloud | Jev, through OpenRouter | perfect text | 100% | 100% | 0 of 20 | 20 of 20 | 0.2 s | yes |
| `anthropic/claude-haiku-5.5` | cloud | OpenRouter | real OCR | 100% | 98% | 0 of 20 | 20 of 20 | 1.6 s | no: one live run |
| `google/gemini-3.5-flash-lite` | cloud | OpenRouter | real OCR | 95% | 100% | 1 of 20 | 20 of 20 | 0.8 s | no: one live run |

Precision and recall are the judge's own, on the messages the screenshot rules let through, which is all it's ever asked about. "Sarcasm kept" counts sarcastic messages it called a win, of the set's 20 (the rules let 17 of them through on perfect text). A median of "—" means the runner was shared with another job at the time, so its timing says nothing.
<!-- ai-reference:measured:end -->

How to read it:

- **Precision** is how often "Looks like a win" was right; **recall** is how many of the real wins it caught. Both
  local models catch nearly every win. **Sarcasm is what small local models get wrong**: praise words aimed at you
  and meant the other way. The plain rules can't catch it at all, and the judge never dismisses anything, so a
  sarcastic message it got wrong costs you a glance and a Dismiss.
- **The local numbers are lower than the spike's** (gemma4:e4b's precision was 93% there, qwen3.5:4b's 96%): a
  screenshot's text carries less than the chat data the spike had (no reactions, no channel details).
- **"Perfect text"** means the screenshots' text was given exactly, as CI replays it; "real OCR" means read from the
  pictures, as the app does.
- **"Replayed in CI"**: those models' real answers are recorded, and every change to BragDoc re-runs the judge on them
  and must score exactly this. The two cloud rows were one live run each, not recorded.
- **Speed**: on a 2020 desktop CPU with no GPU, a judged screenshot takes roughly 10–20 seconds, fine in the
  background. Apple-silicon laptops are roughly ten times faster (published figures, not measured here). The cloud
  models answer in a second or two.

[Jev](/ai/cloud/jev/) is a decision model rather than a chat model: it scored best and fastest, but it's cloud-only and
answers with a probability, never a reason.

## Tidy and Draft

The same two local models were measured on Tidy and Draft, on synthetic text and the example data:

- **Tidy**: both answered in valid structured form every time (30 of 30, in one live run each; `qwen3.5:4b`'s
  answers are recorded and replayed in CI). The checks then flag anything invented, and
  drop a date your text doesn't support, so a small model's slip shows up as a flag rather than in your achievement.
- **Draft**: `gemma4:e4b` cited a clipping for every bullet; `qwen3.5:4b` wrote cited prose instead of bullets, every time (both are recorded and replayed in CI).
  Every line is checked against the clippings it cites, and anything that can't be traced back is flagged.

On a shared desktop CPU with no GPU, a tidy took around two minutes and a draft a few minutes; a laptop with Apple
silicon or a GPU is much faster.

## Cloud models

With a cloud provider, a small, fast model is plenty for the judge, Tidy and Draft (in the spike, most hosted models
of 8B parameters and up were at least 95% accurate as the judge). Whichever you pick, the provider's page says what
it's sent: [Anthropic](/ai/cloud/anthropic/), [OpenAI](/ai/cloud/openai/), [OpenRouter](/ai/cloud/openrouter/).
