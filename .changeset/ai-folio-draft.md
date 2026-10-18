---
"@bragdoc/local": patch
---

Draft with AI in Folio, for when AI and its Draft feature are both on (they're off until you turn them on). Beside Copy and Export, with an optional "What's this for?" note, it writes a self-review draft from exactly the achievements your folio picks, highest impact first, each bullet citing the achievements it came from. Every line is checked: a number, date or name that isn't in what it cites, a bullet with no citation, and stock filler are flagged, and clicking a flag selects the line. The draft streams in (with Cancel), is yours to edit, copy or export as `bragdoc-draft-<from>-<to>.md`, and is never saved anywhere; if a folio is too big for the model, the lowest-impact achievements are left out and Folio says how many. The plain export is unchanged.
