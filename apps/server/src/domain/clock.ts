/** Liefert die aktuelle Zeit in Millisekunden seit Epoch. Wird injiziert, damit Tests die Zeit steuern können. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
