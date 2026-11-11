import type { Card, ReferenceStory } from '@allinscrum/protocol';
import { SIGNAL_CARDS } from './deck.ts';
import { DomainError } from './domain-error.ts';

export const MAX_REFERENCE_TITLE_LENGTH = 60;

/**
 * Eine Referenzstory braucht einen kurzen Titel und einen echten Schätzwert aus dem Deck –
 * "?" oder die Kaffeetasse taugen nicht als Anker.
 */
export function parseReferenceStory(input: ReferenceStory, deck: readonly Card[]): ReferenceStory {
  const title = input.title.trim();
  const validTitle = title.length > 0 && title.length <= MAX_REFERENCE_TITLE_LENGTH;
  const validCard = deck.includes(input.card) && !SIGNAL_CARDS.includes(input.card);
  if (!validTitle || !validCard) throw new DomainError('invalid-reference-story');
  return { title, card: input.card };
}
