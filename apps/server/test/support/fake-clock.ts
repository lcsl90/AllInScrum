/** Steuerbare Uhr für Tests – ersetzt die echte Zeit an der Systemgrenze. */
export class FakeClock {
  private time = Date.UTC(2026, 0, 1, 9, 0, 0);

  readonly now = (): number => this.time;

  advance(milliseconds: number): void {
    this.time += milliseconds;
  }
}

export const seconds = (value: number): number => value * 1000;
export const minutes = (value: number): number => value * 60_000;
