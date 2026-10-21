import confetti from 'canvas-confetti';

const COLORS = ['#e8b84f', '#ffd277', '#4cd39b', '#ffffff', '#c0262d'];

/** Konfetti von beiden Seiten des Tisches – nur, wenn der Nutzer Bewegung nicht reduziert hat. */
export function celebrate(): void {
  if (typeof window.matchMedia !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const burst = (x: number, angle: number) =>
    void confetti({
      particleCount: 90,
      angle,
      spread: 70,
      startVelocity: 55,
      origin: { x, y: 0.75 },
      colors: COLORS,
      disableForReducedMotion: true,
    });
  burst(0.15, 60);
  burst(0.85, 120);
  setTimeout(() => burst(0.5, 90), 250);
}
