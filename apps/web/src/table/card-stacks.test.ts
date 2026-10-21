import { describe, expect, it } from 'vitest';
import { buildPlayer, DECK } from '../test/builders.ts';
import { cardStacks } from './card-stacks.ts';

describe('cardStacks', () => {
  it('stapelt die aufgedeckten Karten nach Wert – in der Reihenfolge des Decks', () => {
    const alice = buildPlayer({ id: 'alice', status: 'voted', card: '8' });
    const bob = buildPlayer({ id: 'bob', status: 'voted', card: '5' });
    const carol = buildPlayer({ id: 'carol', status: 'voted', card: '5' });

    expect(cardStacks([alice, bob, carol], DECK)).toEqual([
      { card: '5', players: [bob, carol] },
      { card: '8', players: [alice] },
    ]);
  });

  it('lässt Spieler ohne Karte außen vor', () => {
    const paused = buildPlayer({ id: 'dave', status: 'ignored' });
    const absent = buildPlayer({ id: 'erin', status: 'pending' });

    expect(cardStacks([paused, absent], DECK)).toEqual([]);
  });
});
