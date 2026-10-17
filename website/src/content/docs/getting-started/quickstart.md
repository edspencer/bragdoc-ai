---
title: Quickstart
description: "Start BragDoc, tell it a little about yourself, and pin your first achievement to the board."
---

:::note[Coming in v0.1]
This walks through v0.1 as it is designed. The screens don't exist yet; real screenshots will replace this note.
:::

## 1. Start it

```sh
npx @bragdoc/local
```

Open `http://localhost:2724` in your browser.

## 2. Say who you are (or skip it)

The first time, BragDoc opens **Welcome**. Every step can be skipped and changed later in Settings.

1. **About you:** your name, your role, and what people call you at work (nicknames, handles). The screenshot
   source uses these to recognise when a screenshot is about you.
2. **Where wins come from:** each source, off until you switch it on. You can connect GitHub (BragDoc uses the `gh`
   CLI if you have it), point it at a screenshots folder, or skip all of them.
3. **Your code:** optionally, pick a folder like `~/Code`. BragDoc looks inside it, and only inside it, for git
   repositories you've pushed to recently, and you tick the ones to track. Only the paths you accept are saved.

## 3. Add an achievement

The board opens with a box that says **Drop it here.** Type a line about something you did this week. The first line
becomes the title; anything after it is the body. Then:

- paste a screenshot (⌘V or Ctrl+V), or drag in a PDF or any file;
- paste a GitHub pull request URL, which becomes a pull request card;
- pick a date (today by default), an impact from 1 to 10 if you like, and a project.

Press ⌘+Enter (Ctrl+Enter) to save. The card appears under **This week**.

If the board feels empty and you'd like to see what it's for, **Fill it with example data** adds a set of invented
achievements, marked as examples and removable in one click.

## 4. Look at the file

Open `~/.bragdoc/achievements/` in your editor. The achievement you just added is a Markdown file there. Edit its
title and save: the board updates by itself. That's the whole data model; see
[Your data is files](/concepts/your-data-is-files/).

## Next

- Switch on a source and watch [Found](/concepts/found-and-sources/) fill up.
- Connect [your coding agent](/agents/overview/).
- Keep BragDoc running in the background with [`bragdoc service install`](/getting-started/installation/#keep-it-running).
