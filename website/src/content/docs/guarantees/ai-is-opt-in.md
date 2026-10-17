---
title: AI is opt-in
description: "v0.1 has no AI features. Any AI feature in a later version will be off until you switch it on, and BragDoc will never install a model by itself."
---

**BragDoc v0.1 has no AI features and no AI dependencies.** Everything in it works by plain rules you can read: the
screenshot source matches words, the GitHub source lists your merged pull requests, Folio sorts and filters. Nothing
is sent to a model, local or remote.

## What may come later

Some things could be better with a language model: deciding whether a screenshot is really praise for you, suggesting
which project something belongs to, tidying a title, drafting a Folio summary. If later versions offer features like
these, the rules are fixed:

- **Every AI feature is off by default**, and each is switched on separately, by you.
- **BragDoc will never install a model runtime (such as Ollama) or download a model by itself.** At most it may
  notice one you already have, tell you what a feature would download and how much disk and memory it needs, and act
  only after you confirm.
- **Everything keeps working without it.** The rules-only paths stay complete; AI is an extra, never a requirement.
- **Local first.** The intended design uses a small model running on your own machine. A feature that would send
  anything to a remote service would say so plainly and go through the same logged
  [network path](/guarantees/network-activity/) as everything else.

## What's there now

Only the seam: a small interface in the code (`shared/judge.ts`) that a future, opt-in judge could plug into, and an
empty slot on Found candidates for its verdict. In v0.1 nothing fills it.
