---
"@bragdoc/local": patch
---

An opt-in judge for Found. With AI and the judge switched on, **Judge now** on the Found page asks your model about each screenshot waiting there (and merged PRs, if you tick them): is it a win worth saving, why, and how sure. Its answer appears on the card as "Looks like a win · 86%" or "Probably not · 70%", with the reason and which model said so. It's only an opinion: the judge never keeps or dismisses anything, and never touches a candidate you've already decided. It reads the screenshot again on your machine, marks which messages are yours, and follows your own `ai/what-counts.md`, which BragDoc writes for you from your profile the first time you switch the judge on. A quote it gives that isn't word for word in the screenshot is dropped. With AI off again, earlier verdicts stay, marked "judged earlier". Agents see your `what-counts.md` too, in `bragdoc_get_context`.
