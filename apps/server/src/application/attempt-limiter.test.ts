import { describe, expect, it } from 'vitest';
import { FakeClock, minutes, seconds } from '../../test/support/fake-clock.ts';
import { AttemptLimiter } from './attempt-limiter.ts';

function createLimiter(clock = new FakeClock()) {
  return new AttemptLimiter({ maxFailures: 3, windowMs: minutes(1), clock: clock.now });
}

describe('AttemptLimiter', () => {
  it('lässt ein paar Vertipper zu', () => {
    const limiter = createLimiter();

    limiter.recordFailure('1.2.3.4');
    limiter.recordFailure('1.2.3.4');

    expect(limiter.isBlocked('1.2.3.4')).toBe(false);
  });

  it('sperrt, wer zu oft falsche Codes probiert', () => {
    const limiter = createLimiter();

    Array.from({ length: 3 }).forEach(() => limiter.recordFailure('1.2.3.4'));

    expect(limiter.isBlocked('1.2.3.4')).toBe(true);
    expect(limiter.isBlocked('5.6.7.8')).toBe(false);
  });

  it('gibt nach Ablauf des Zeitfensters wieder frei', () => {
    const clock = new FakeClock();
    const limiter = createLimiter(clock);
    Array.from({ length: 3 }).forEach(() => limiter.recordFailure('1.2.3.4'));

    clock.advance(minutes(1) + seconds(1));

    expect(limiter.isBlocked('1.2.3.4')).toBe(false);
  });
});
