---
title: AI is opt-in
description: "AI is off unless you turn it on, each feature separately. BragDoc never installs a model runner or downloads a model by itself, and nothing a model says reaches your data without a click. Each rule, and the code that enforces it."
---

**AI is off unless you turn it on.** Everything BragDoc does works without it: the screenshot source matches words
against plain rules you can read, the GitHub source lists your merged pull requests, Folio sorts and filters. With AI
off, nothing you write or keep is sent to a model, local or remote, and nothing writes or rewrites your words for you.

BragDoc 0.1 has no AI at all. From 0.2.0 (built on the
[`v0.2` branch](https://github.com/edspencer/bragdoc-ai/tree/v0.2)), it has three optional AI features:
[the judge](/ai/the-judge/), [Tidy this up](/ai/tidy/) and [Draft with AI](/ai/draft/). These are the rules they're
held to, each with the code that holds them to it, so you can check.

The one piece of machine learning that's always there is text recognition (OCR): reading the words in a screenshot.
It runs on your machine, with Tesseract's English data, which comes inside BragDoc's package, or Apple's Vision
framework on a Mac. It reads text and nothing more, and nothing it reads leaves your computer.

## The rules

**1. Every AI feature is off until you switch it on.** There's a master switch, and a switch per feature, and every
one defaults to off. Turning AI on turns no feature on; turning a feature on gives you its button and nothing that runs
by itself (the judge's background runs are a [second choice](/ai/the-judge/#when-it-runs-by-itself-and-on-what-power)).
Upgrading from 0.1 changes nothing until you act.
*Enforced by* the settings' defaults (`server/config.ts`), and every call is checked against the switches before it's
queued, when it starts, and every second while it runs (`server/ai/run.ts`).

**2. With AI off, the AI library isn't even loaded, and nothing is contacted.** No model is asked anything, on this
computer or anywhere else; Settings → AI offers nothing that could reach a runner, and the server refuses it too.
*Enforced by* one dynamic import on the first model call (`server/ai/sdk.ts`); a test runs a whole AI-off session
under a module loader hook and fails if the AI library is ever even resolved (`test/ai-lazy.test.ts`), and the
packaging check does the same against the packed build.

**3. BragDoc never installs a model runner, and never downloads a model by itself.** It can look for a runner you
already have (a fixed look at the usual local addresses, and at your `PATH`, which runs nothing), and tell you what a
model would download and whether you have the room. It asks Ollama to download one only after you confirm, in a dialog
that states the size, your free space and the RAM, and only one of the two recommended models.
*Enforced by* the download route requiring that confirm (`server/ai/local.ts`), and by Ollama not being a program
BragDoc is allowed to run at all (`ALLOWED_BINS` in `server/proc.ts`).

**4. Every call to a model goes through the one logged door out, and shows in Network activity.** Local calls
included, each stamped *this computer*, *your network* or *internet*, with its feature, model and bytes sent. The
browser never talks to a model: the server does.
*Enforced by* the egress module (`server/egress.ts`), whose per-connection fetch is the only one a model provider is
given; the CI guard (`test/guard-egress.test.ts`) confines the AI library to `server/ai/` (`sdk.ts`, `providers.ts` and
`decide.ts`, plus `ollama.ts` for the provider interface).

**5. A cloud provider sends nothing until you've read what it would send, and allowed it.** Whether a connection is
local or cloud is decided by its address, never its kind. A connection on the internet makes no request at all, not
even a test, before you accept a plain statement of what each feature would send there, field by field (each
[provider's page](/ai/cloud/anthropic/) has it word for word). The statement is versioned: if a later BragDoc would
send more, it asks again. **Revoke** stops it at once.
*Enforced by* `shared/ai/hosts.ts` (where an address is), `shared/ai/consent.ts` (the statements, which the dialog and
these docs are both made from), and the allow-list, which adds a cloud host only while AI is on and that connection's
consent is current, checked per connection on every request (`server/egress.ts`; `test/ai-consent.test.ts`,
`test/ai-egress.test.ts`).

**6. AI suggests; you decide.** Nothing a model produces reaches your board, an achievement or a file of yours without
a click. **The judge never keeps and never dismisses anything**: it only writes its opinion on a pending Found
candidate. Tidy's suggestion and Draft's draft are yours to use, edit or throw away, and neither writes anything.
*Enforced by* the one way a verdict is written (`setVerdict` in `server/services/found.ts`), which never touches a
candidate's status.

**7. Nothing invented, checked in code.** Prompts tell the model to use only what it was given, and the answer is
then checked: a number, amount or capitalised name that isn't in the source is flagged, a date the text doesn't
support is left out, a draft's line is checked against the clippings it cites, and a judge's quote that isn't word for
word in the screenshot is dropped.
*Enforced by* `shared/ai/grounding.ts`, `shared/ai/draft.ts` and the judge's checks (`server/ai/judge/index.ts`).

**8. No telemetry, and no hidden provider.** The AI library's telemetry is never turned on; its default route to a
hosted gateway is closed at start-up (a model named by a bare string throws); no attribution headers are sent to
providers; and keys are only ever the ones you paste in Settings → AI, never read from your environment.
*Enforced by* `server/ai/sdk.ts`, `server/ai/providers.ts` and `server/egress.ts`, with tests of the headers that
actually leave.

**9. What you give a model is data, never instructions.** Screenshot text, pull request descriptions and pasted text
are fenced off and labelled as material to judge or tidy. Models get no tools, and their answers are checked against
a schema and shown as text.
*Enforced by* the prompts in `server/ai/prompts/`, each a pure function tested for what it includes and leaves out
(never a file path, an id or a local address).

## The edges

- **A model runner is its own software.** Ollama, LM Studio or llama.cpp may contact things of their own (a model
  registry, update checks, their own cloud features). That traffic comes from their process, not BragDoc's, so it's
  outside BragDoc's Network activity log, and it's configured in the runner. See
  [Setting up a local model](/ai/local-models/#a-runner-is-its-own-software).
- **A cloud provider receives what's sent under your account and their terms.** BragDoc can tell you exactly what
  it sends; what the provider does with it is in their policy, linked from each provider's page.
- **A verdict already written stays** on its Found card if you turn AI off: it's your data now, marked "judged
  earlier". Dismissing the candidate clears it.

CI never calls a real model: every test, and every AI answer in these docs' screenshots, comes from BragDoc's own
fake model server.
