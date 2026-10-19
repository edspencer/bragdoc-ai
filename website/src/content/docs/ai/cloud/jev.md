---
title: Jev, through OpenRouter
description: "Jev, TypeSafe’s hosted decision model, as BragDoc’s Found judge through your OpenRouter key: what it sends, its own consent, and its limits (a probability, never a reason)."
---

:::note[Coming in 0.2.0]
The AI features are built on the [`v0.2` branch](https://github.com/edspencer/bragdoc-ai/tree/v0.2) and will be in
BragDoc 0.2.0.
:::

**Jev** is TypeSafe AI's hosted **decision model**: rather than writing text, it answers typed questions with a
probability ("a win: 93%", and which project). BragDoc can use it as [the judge](/ai/the-judge/), and only as the
judge: it can't tidy or draft, because it doesn't write.

In the measurements on [Choosing a model](/ai/choosing-a-model/#what-the-judge-scored), Jev scored best of everything
tried (100% precision and recall on the synthetic set, no sarcasm kept; on perfect text, while the cloud chat models
were measured on real OCR), in about 0.2 seconds a message. But:

- **it's cloud only**: there's no local Jev;
- **it never says why.** A Jev verdict on a Found card reads "Jev answers with a probability only": no reason, no
  quote, and BragDoc never makes one up for it.

BragDoc reaches it as `typesafe/jev-1.14`, at OpenRouter's decision endpoint (`/api/v1/systemone`), through an
OpenRouter connection of yours, with that connection's key. (OpenRouter's `typesafe/jev-router` is a different thing,
a router to chat models, and BragDoc won't use it as Jev.)

## Setting it up

1. Set up an [OpenRouter](/ai/cloud/openrouter/) connection first, with your key.
2. Under **Add another**, pick **Jev (via OpenRouter)**, and choose the OpenRouter connection it goes through.
3. **Jev has its own consent**, separate from the OpenRouter connection's: read its statement, and press **Allow**.
   Until you do, nothing is sent to Jev, even though the OpenRouter connection is allowed.
4. On the judge's card, pick **Jev (cloud)** as the judge's model (or press **Use for the judge** on Jev's card). It
   can only ever be the judge's model.

Jev's consent is asked again if you point it at another OpenRouter connection, replace that connection's key, or
remove that connection (each may be another account).

## Exactly what it sends

This is the statement the consent dialog shows, word for word: both are made from the same file in BragDoc's code.

<!-- ai-reference:consent-jev:start -->
**Where it goes.** Straight from this computer to `openrouter.ai`, run by OpenRouter, for TypeSafe’s Jev.

**What each feature would send there:**

- **The judge (Found)**, only once you switch the judge on:
  - The text of a screenshot Found picked up (read on this computer), with your own messages marked
  - For a merged pull request (if you tick it): its repository, title, the first 2,000 characters of its description, and the date
  - Your name and role, the other names you go by, and the names to ignore
  - Your active and paused projects' names
  - Your “what counts as a win” instructions
- **Test connection**, when you press Test:
  - A one-line test question (nothing of yours)

Every feature is off until you switch it on. File paths, ids and BragDoc’s own addresses are never sent.

**Whose terms.** OpenRouter, for TypeSafe’s Jev receives it under your account and their policy: [OpenRouter, for TypeSafe’s Jev’s privacy policy](https://openrouter.ai/privacy).

**And:**

- It goes from this computer to OpenRouter, which passes it to TypeSafe AI, who run Jev. BragDoc’s makers see nothing: there is no BragDoc server in between.
- Jev answers with probabilities only (“a win: 93%”, and which project). It never says why, and BragDoc never makes a reason up for it.
- It uses the key of the OpenRouter connection it goes through: that stays in secrets.yaml on this computer (readable by you alone), and is sent only to that connection’s host. A new key there, or removing it, asks for this consent again.
- To stop: Settings → AI → the Jev connection → Revoke. Nothing more is sent to Jev from that moment, even while the OpenRouter connection stays allowed.

_This is version 2 of the statement. If a later BragDoc would send more, it asks again._
<!-- ai-reference:consent-jev:end -->

## Its key

Jev uses the key of the OpenRouter connection it goes through: see [OpenRouter](/ai/cloud/openrouter/#your-key). Jev
has no key, address or context size of its own.

## In the background

Allowing a cloud connection doesn't let the judge send on its own. With a cloud model, the judge's background runs
(as candidates arrive, or every few hours) need one more tick on its card, **Also send to *host* in the background**;
without it, only **Judge now** sends. See [The judge](/ai/the-judge/#when-it-runs-by-itself-and-on-what-power).

## Stopping it

- **Revoke**, on the connection's card: nothing more is sent to it from that moment, even mid-run, and nothing is
  sent again until you allow it again.
- **AI off**, the master switch: everything stops at once, and no cloud host stays on BragDoc's allow-list.
- **Remove**, on Jev's card: the Jev connection is gone; the OpenRouter connection and its key stay.

## Seeing what it sent

Every request is a line in **Settings → Network activity**, stamped *internet*, with the host (`openrouter.ai`), the
feature, the model and the bytes sent (never the content), and the receipt totals what went **to AI providers on the
internet**. Each request carries `User-Agent: BragDoc` and no attribution headers.
