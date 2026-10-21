import type { ErrorCode } from '@allinscrum/protocol';

/** Verletzung einer fachlichen Regel. Wird vom Gateway in eine Fehler-Antwort übersetzt. */
export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.name = 'DomainError';
    this.code = code;
  }
}

/** Wirft, falls eine Regelprüfung eine Verletzung gemeldet hat. */
export function throwIfViolated(violation: ErrorCode | null): void {
  if (violation !== null) throw new DomainError(violation);
}
