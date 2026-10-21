import type { ErrorCode } from '@allinscrum/protocol';
import { expect } from 'vitest';
import { DomainError } from '../../src/domain/domain-error.ts';

declare module 'vitest' {
  // Die Typparameter müssen exakt der Vitest-Deklaration entsprechen, auch wenn T hier ungenutzt ist.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    /** Erwartet, dass die Funktion einen DomainError mit genau diesem Code wirft. */
    toThrowDomainError: (code: ErrorCode) => R;
  }
}

expect.extend({
  toThrowDomainError(action: unknown, expected: ErrorCode) {
    if (typeof action !== 'function') {
      return { pass: false, message: () => 'toThrowDomainError erwartet eine Funktion' };
    }
    try {
      action();
    } catch (error) {
      const actual = error instanceof DomainError ? error.code : String(error);
      return {
        pass: actual === expected,
        message: () => `erwartet DomainError "${expected}", erhalten: ${actual}`,
      };
    }
    return {
      pass: false,
      message: () => `erwartet DomainError "${expected}", aber nichts geworfen`,
    };
  },
});
