import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

// Tests prüfen Verhalten, keine Bewegung: Animationen springen sofort ans Ziel.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  // Vertragstests gegen den echten Server laufen ohne DOM.
  if (typeof document === 'undefined') return;
  cleanup();
  // Cookies und lokaler Speicher dürfen nicht von einem Test in den nächsten wandern.
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
  localStorage.clear();
});
