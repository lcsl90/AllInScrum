/** Punkt in Prozent der Tischfläche: (0, 0) oben links, (100, 100) unten rechts. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SeatPosition {
  /** Mittelpunkt des Sitzplatzes auf der Tischkante. */
  readonly seat: Point;
  /** Wo die Karte dieses Spielers auf dem Filz liegt. */
  readonly card: Point;
}

/** Wie weit die Karte von der Tischmitte entfernt liegt (Anteil des Radius). */
const CARD_DISTANCE = 0.62;

/**
 * Verteilt die Spieler gleichmäßig auf dem Oval – in Sitzreihenfolge, im Uhrzeigersinn.
 * Der betrachtende Spieler sitzt immer unten in der Mitte.
 */
export function seatLayout(count: number, viewerIndex: number): SeatPosition[] {
  return Array.from({ length: count }, (_, index) => {
    const step = (index - viewerIndex + count) % count;
    const angle = Math.PI / 2 + (step * 2 * Math.PI) / count;
    return {
      seat: pointOnEllipse(angle, 1),
      card: pointOnEllipse(angle, CARD_DISTANCE),
    };
  });
}

function pointOnEllipse(angle: number, distance: number): Point {
  return {
    x: 50 + 50 * distance * Math.cos(angle),
    y: 50 + 50 * distance * Math.sin(angle),
  };
}
