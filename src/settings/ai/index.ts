// The feature cards in Settings → AI → Features (SPEC R26). One entry per AI feature, in the order the page shows
// them. **Feature PRs fill in their own `Card`**: write the card as a component in this folder (it gets the live
// AiStatus and its feature's readiness), import it here and replace `null` with it, one line, like a route in
// server/routes/index.ts. Until then the page lists the feature as off, with what it will do.
//
// A card owns its feature's switch (`PUT /api/ai/features/<feature> { enabled }`), its model override, and any
// settings of its own. AI's master switch and the text slot stay on the tab itself.
import type { ComponentType } from 'react';
import type { AiFeatureName, AiFeatureReadiness, AiStatus } from '../../../shared/api.ts';
import { DraftCard } from './DraftCard.tsx';
import { TidyCard } from './TidyCard.tsx';

export interface FeatureCardProps {
  status: AiStatus;
  readiness: AiFeatureReadiness;
}

export interface FeatureCardEntry {
  feature: AiFeatureName;
  title: string;
  /** What it does, in a sentence, for the placeholder (and the card's own sub-title, if it likes). */
  what: string;
  /** The feature's card, or null until its PR adds it. */
  Card: ComponentType<FeatureCardProps> | null;
}

export const FEATURE_CARDS: readonly FeatureCardEntry[] = [
  { feature: 'judge', title: 'The judge, in Found', what: 'Reads what Found picks up and says whether it looks like a win for you, and why. It never keeps or dismisses anything.', Card: null }, // PR24/PR25
  { feature: 'tidy', title: 'Tidy this up, on the board', what: 'Turns something you pasted into a title, a summary and the right project, for you to accept field by field.', Card: TidyCard }, // PR26
  { feature: 'draft', title: 'Draft with AI, in Folio', what: 'Writes a draft from the achievements in a folio, citing each one, for you to edit.', Card: DraftCard }, // PR27
];
