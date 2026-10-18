# docs-media: repeatable screenshots

Screenshots for PRs, the README and the docs site, taken the same way every time, so a redesign is one command to
re-shoot rather than someone re-deriving click paths from memory. Adapted from Local Review's rig.

```sh
npx playwright install chromium                 # once
npm run docs:media                              # build with /dev/kit, boot a throwaway instance, take every shot
npm run docs:media -- --only kit-light,kit-dark
npm run docs:media -- --base http://localhost:5050   # a server you started yourself (serve.sh)
npm run docs:media -- --no-build                     # reuse dist/ as it is
npm run docs:media:sync                              # copy the shots the docs site uses into website/src/assets/
```

Output goes to `tools/docs-media/out/` (git-ignored): `<shot>.png` at 2x, `provenance.json` (each shot's route,
theme, viewport, scale and crop) and `contact-sheet.png` (every shot on one page, labelled).

It builds with `/dev/kit` (`BRAGDOC_KIT=1`, D33) for the shots, then rebuilds the web app without it, so `dist/` is
never left holding the kit. With `--no-build` it shoots whatever `dist/` has.

## The pieces

| File | Does |
| --- | --- |
| `shots.ts` | The shot list: route, theme, viewport, actions, and what to capture (viewport, whole page, or a crop around elements). Each says what it's for. **Edit this to add a shot.** |
| `capture.ts` | Builds, boots the rig, opens each shot in a fresh browser context and writes the PNGs. |
| `serve.sh` | Runs BragDoc on a throwaway home with a scrubbed environment. **The one place that says how the rig launches the app.** |
| `leaks.ts` | The leak scan (below), unit-tested in `test/docs-media.test.ts`. |
| `sync.ts` | Copies the shots the docs site refers to (`<Shot name="…">` in a page, `assets/landing/<shot>.png`) from `out/` into `website/src/assets/`, and deletes copies nothing uses. `test/docs.test.ts` fails on a page that uses a shot `shots.ts` doesn't list, or one that isn't committed. |
| `fake-gh-prs.json` | The merged pull requests the fake GitHub CLI (`test/fixtures/fake-gh/gh`) answers with in the example world: invented, in the example data's `altimetry-example` repos. |

## What makes the shots deterministic

- **The data:** an empty data home (plus `/dev/kit`'s invented content), or, for a shot with `data: 'example'`, the
  example world: a second rig, seeded through BragDoc's own API with the example dataset, Alex Marlowe's profile, the
  GitHub source connected through the fake `gh` (never a real login or the network), and one screenshot in a watched
  folder, so Found has both kinds of candidate. It runs on port 2724 when that's free, because Settings shows
  BragDoc's own address.
- **The clock:** the empty-home shots are fixed at `SHOT_NOW` (`shots.ts`), so "This week" never drifts. The example
  world can't be: the server stamps some times itself (when something was found, the network log) with the real clock,
  so its data is placed at the day of the run and the browser's clock is frozen just after seeding.
- **The browser:** a fresh context per shot (with the CSP bypassed, for the stylesheet below), 1440×900 unless the shot says otherwise, the shot's theme both stored and
  as the colour scheme, scale 2, reduced motion, `en-GB`, UTC, and a stylesheet that turns off animations,
  transitions, carets and scrollbars. The mouse is parked in a corner.
- **Waiting:** for the page's `h1`, fonts and images, never a bare sleep. A console error fails the shot.

## What the shots must not show

The repository is public, and so is every pixel pushed to it. Before writing a shot the rig scans the page's text, form values, placeholders, tooltips and alt text, and
**refuses to write it** if anything looks like it belongs to the machine: absolute paths (`/tmp/`, `/home/`,
`/Users/`, …), private IPs, a `localhost` or `127.0.0.1` port other than 2724, the rig's own port (unless it's 2724),
or an email outside `.example`. Add your own patterns (a hostname, say) as regex alternatives in `$BRAGDOC_LEAK_EXTRA`; they're not
written in this file because it's public. The scan reads the DOM, not pixels, so look at the images too: the contact
sheet is there for that.
