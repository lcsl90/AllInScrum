import type { Clock } from '../domain/clock.ts';

export interface AttemptLimiterSettings {
  /** So viele Fehlversuche sind im Zeitfenster erlaubt; danach wird gesperrt. */
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly clock: Clock;
}

/**
 * Bremst das Durchprobieren von Join-Codes: Wer im Zeitfenster zu oft danebenliegt, wird gesperrt,
 * bis seine ältesten Fehlversuche aus dem Fenster gefallen sind.
 */
export class AttemptLimiter {
  private readonly settings: AttemptLimiterSettings;
  private readonly failures = new Map<string, number[]>();

  constructor(settings: AttemptLimiterSettings) {
    this.settings = settings;
  }

  isBlocked(key: string): boolean {
    return this.recentFailures(key).length >= this.settings.maxFailures;
  }

  recordFailure(key: string): void {
    this.failures.set(key, [...this.recentFailures(key), this.settings.clock()]);
  }

  /** Vergisst abgelaufene Fehlversuche, damit der Speicher nicht wächst. */
  prune(): void {
    for (const key of this.failures.keys()) {
      if (this.recentFailures(key).length === 0) this.failures.delete(key);
    }
  }

  private recentFailures(key: string): number[] {
    const windowStart = this.settings.clock() - this.settings.windowMs;
    return (this.failures.get(key) ?? []).filter((time) => time > windowStart);
  }
}
