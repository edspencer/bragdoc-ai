---
title: OpenRouter
description: "Using many providers’ models through one OpenRouter key with BragDoc: exactly what each AI feature sends to openrouter.ai, where your key is kept, and how to stop it."
---

:::note[Coming in 0.2.0]
The AI features are built on the [`v0.2` branch](https://github.com/edspencer/bragdoc-ai/tree/v0.2) and will be in
BragDoc 0.2.0.
:::

[OpenRouter](https://openrouter.ai) is one API, and one key, in front of many providers' models (Anthropic's, Google's,
open models and more). BragDoc talks to it (`https://openrouter.ai/api/v1`) directly from your computer: there's no
BragDoc server in between, and BragDoc's makers see nothing. OpenRouter receives what's sent under your account and
their terms, and passes it to whichever provider runs the model you picked, under theirs: check that model's provider
on OpenRouter too.

BragDoc asks OpenRouter for no "reasoning" on structured answers (the judge, Tidy), so a model doesn't spend its
answer on thinking; a model that insists gets a low setting. It sends no `HTTP-Referer` or `X-Title`, the headers
OpenRouter uses to credit an app.

An OpenRouter connection is also what [Jev](/ai/cloud/jev/) goes through.

## Setting it up

1. In **Settings → AI** (with AI on), under **Add one** (or **Add another**), pick **OpenRouter**, then
   **Add, then read what's sent**.
2. **The consent dialog opens next.** It says where the connection would send (`openrouter.ai`), what each feature would
   send there, field by field, whose terms apply, and how to stop. **Until you press Allow, nothing at all is sent**,
   not even a test or a request for the list of models. **Not now** leaves the connection saved and blocked.
3. Paste your **key**, pick a **model**, and press **Test connection** (one tiny question with nothing of yours in it).
4. Choose it as the model your features use, or as one feature's own, and switch the features on.

What you allowed is version-stamped: if a later BragDoc would send more, it asks again. Pointing the connection at
another address withdraws the consent and forgets the key, so a key entered for one provider is never sent to
another.

## Exactly what it sends

This is the statement the consent dialog shows, word for word: both are made from the same file in BragDoc's code.

<!-- ai-reference:consent-openrouter:start -->
**Where it goes.** Straight from this computer to `openrouter.ai`, run by OpenRouter.

**What each feature would send there:**

- **The judge (Found)**, only once you switch the judge on:
  - The text of a screenshot Found picked up (read on this computer), with your own messages marked
  - For a merged pull request (if you tick it): its repository, title, the first 2,000 characters of its description, and the date
  - Your name and role, the other names you go by, and the names to ignore
  - Your active and paused projects' names
  - Your “what counts as a win” instructions
- **Tidy this up (the board)**, only when you press Tidy on something:
  - The text you pasted, or the text read from a picture you added
  - For an achievement you tidy in its edit drawer: its title, summary, notes, quotes (with who said them, and where) and its pictures’ text
  - Today's date, and your name and role
  - Your projects' names
  - Your “how I write” notes, if you wrote some
- **Draft with AI (Folio)**, only when you press Draft:
  - The achievements in the folio you picked, and its dates: titles, summaries, dates, impact, project and company names, and their evidence (quotes word for word, with who said them and where; pull request numbers and titles; link sites and titles; file names)
  - Your name and role
  - Your note on what the draft is for, if you wrote one
  - Your “how I write” notes, if you wrote some
- **Test connection**, when you press Test:
  - A one-line test question (nothing of yours)

Every feature is off until you switch it on. File paths, ids and BragDoc’s own addresses are never sent.

**Whose terms.** OpenRouter receives it under your account and their policy: [OpenRouter’s privacy policy](https://openrouter.ai/privacy).

**And:**

- It goes from this computer straight to that host, under your account and their terms. BragDoc’s makers see nothing: there is no BragDoc server in between.
- Your key stays in secrets.yaml on this computer (readable by you alone), and is sent only to that host.
- To stop: Settings → AI → the connection → Revoke. Nothing more is sent from that moment.

_This is version 1 of the statement. If a later BragDoc would send more, it asks again._
<!-- ai-reference:consent-openrouter:end -->

## Your key

Paste your OpenRouter API key into the connection's **Key** field. It's kept in `secrets.yaml` in your data folder,
which only you can read (permissions 0600). It's never written to `config.yaml`, never logged, never backed up, never
returned by BragDoc's API (the card shows only its last four characters), and it's sent only to ``openrouter.ai``. BragDoc
never reads a key from your environment either: only from what you paste here.

**Forget** deletes it from `secrets.yaml`. To make a key useless everywhere, revoke it in your OpenRouter
account as well.

## The judge in the background

Allowing a cloud connection doesn't let the judge send on its own. With a cloud model, the judge's background runs
(as candidates arrive, or every few hours) need one more tick on its card, **Also send to *host* in the background**;
without it, only **Judge now** sends. See [The judge](/ai/the-judge/#when-it-runs-by-itself-and-on-what-power).

## Stopping it

- **Revoke**, on the connection's card: nothing more is sent to it from that moment, even mid-run, and nothing is
  sent again until you allow it again.
- **AI off**, the master switch: everything stops at once, and no cloud host stays on BragDoc's allow-list.
- **Remove**, on the card: the connection and its key are both gone.

## Seeing what it sent

Every request is a line in **Settings → Network activity**, stamped *internet*, with the host (`openrouter.ai`), the
feature, the model and the bytes sent (never the content), and the receipt totals what went **to AI providers on the
internet**. Each request carries `User-Agent: BragDoc` and no attribution headers.
