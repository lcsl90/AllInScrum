import { ERROR_CODES } from '@allinscrum/protocol';
import { describe, expect, it } from 'vitest';
import { errorMessage } from './error-messages.ts';

describe('errorMessage', () => {
  it.each(ERROR_CODES)('hat für "%s" einen verständlichen deutschen Text', (code) => {
    const message = errorMessage(code);

    expect(message.length).toBeGreaterThan(10);
    expect(message).not.toContain(code);
  });
});
