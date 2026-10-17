---
title: Projects, companies, repos
description: "Projects group achievements and give them colour; companies and repos are optional context, shown on a timeline."
---

:::note[Coming in v0.1]
Projects are being built. This page describes the design.
:::

A **project** is a named piece of work with a start date, an end date (or none, if it's ongoing), a status and a
colour. An achievement can belong to any number of projects, and its card's tape takes the colour of the first.

- **Colour:** pick one of twelve swatches or any colour you like. The text on it is chosen automatically so it stays
  readable, and project colours look the same in the light and dark themes.
- **Status:** active, paused, done or archived.
- **Company:** optional. A **company** is where you did the work, with your role and dates.
- **Repos:** optional. A **repo** is a code repository, by local path, remote URL or both. Linking repos to a project
  lets BragDoc suggest the project for pull requests from those repos.

## The timeline

The Projects page draws your projects as a timeline: one lane per company plus one for projects without a company,
month gridlines, a marker for today, and striped bars for projects that are still going. Click a bar to see that
project's pile of achievements. On a narrow screen the timeline scrolls sideways inside itself.

## Renaming is cheap

Achievements refer to projects by id, not by name, so renaming a project changes one file. Removing a project moves
its file to `backups/removed/` and leaves the references alone, so putting it back restores everything; until then,
Settings → Data lists the dangling references. See [Your data is files](/concepts/your-data-is-files/).
