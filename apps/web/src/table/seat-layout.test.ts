import { describe, expect, it } from 'vitest';
import { seatLayout } from './seat-layout.ts';

const rounded = ({ x, y }: { x: number; y: number }) => ({ x: Math.round(x), y: Math.round(y) });

describe('seatLayout', () => {
  it('setzt einen einzelnen Spieler unten in die Mitte', () => {
    expect(rounded(seatLayout(1, 0)[0]!.seat)).toEqual({ x: 50, y: 100 });
  });

  it('setzt den eigenen Platz immer nach unten – egal, wann man beigetreten ist', () => {
    expect(rounded(seatLayout(4, 2)[2]!.seat)).toEqual({ x: 50, y: 100 });
  });

  it('verteilt die anderen im Uhrzeigersinn ums Oval', () => {
    const seats = seatLayout(4, 0).map((position) => rounded(position.seat));

    expect(seats).toEqual([
      { x: 50, y: 100 },
      { x: 0, y: 50 },
      { x: 50, y: 0 },
      { x: 100, y: 50 },
    ]);
  });

  it('legt die Karte zwischen Sitzplatz und Tischmitte', () => {
    const { seat, card } = seatLayout(4, 0)[1]!;

    expect(card.x).toBeGreaterThan(seat.x);
    expect(card.x).toBeLessThan(50);
    expect(card.y).toBeCloseTo(50);
  });
});
