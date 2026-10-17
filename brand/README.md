# BragDoc brand kit

The mark is a lowercase "b" on a tomato tile: the Scrapbook board's accent colour. In the app header it's tilted a
few degrees with a darker tomato edge under it, like something pinned up in a hurry (`src/shell/Logo.tsx` draws the
same path). Adapted from Local Review's brand kit.

## Files

| File | What it is | Use it for |
|---|---|---|
| `mark.svg` | The mark: 32×32, hand-authored. **The source of everything else.** | Anywhere a square icon is needed |
| `favicon.svg` | A copy of `mark.svg` | `<link rel="icon" type="image/svg+xml">` |
| `favicon.ico` | 16, 32 and 48px PNGs in one ICO | `/favicon.ico`, old browsers |
| `apple-touch-icon.png` | 180×180, full-bleed (iOS rounds the corners) | `<link rel="apple-touch-icon">` |
| `icon-192.png`, `icon-512.png` | Web manifest icons | `manifest.webmanifest` |
| `og-image.png` | 1200×630 card | `og:image` / `twitter:image` on the docs site |
| `social-preview.png` | 1280×640 card | GitHub repo Settings → Social preview |
| `generate.mjs` | Builds every file above except `mark.svg`, and copies the favicons into `public/` | See "Regenerating" |

The mark needs no font: the "b" is a path. The wordmark is set in Bricolage Grotesque ExtraBold, lowercase
(`bragdoc`); in HTML use the app's self-hosted font rather than an image.

## Colours

The app's tokens (`src/styles.css`) are the source; these are the ones the brand uses.

| Name | Light | Lamplight (dark) | Where |
|---|---|---|---|
| Tomato (accent) | `#ef5a3c` | `#ff6d4d` | The tile, the main button, the Board pill |
| Tomato shadow | `#b8381f` | `#a83a22` | The edge under the tilted mark and under accent buttons |
| Oat (board) | `#f1ece2` | `#211a14` (cork) | The page background, with a dot grid (light) or speckle (dark) |
| Ink | `#1d1a17` | `#f2e9da` | Text |
| Sticky | `#fff3a8` | `#d6b74c` | Sticky notes |

## Fonts

All four are self-hosted through `@fontsource` (SIL Open Font Licence), so neither the app nor the docs site loads
anything from a font CDN: Instrument Sans (body), Bricolage Grotesque (headings, the wordmark), Caveat (handwriting)
and Geist Mono (code).

## Usage rules

- **Keep the tile.** The mark is the "b" on its tomato tile; don't set the "b" on another colour.
- **Tilt only in the app.** The header tilts it −6°; the favicon and icons are straight, so they stay crisp at 16px.
- Project colours are the user's, not the brand's: never use them for BragDoc itself.

## Regenerating

```sh
npx playwright install chromium   # once
npm run brand                     # node brand/generate.mjs
```

It renders with the Chromium that `@playwright/test` brings (no extra dependencies), and the cards use the fonts from
`node_modules/@fontsource*`. The output is stable for a given Chromium; commit what changed.
