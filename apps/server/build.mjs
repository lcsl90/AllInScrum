import { build } from 'esbuild';

/** Bündelt den Server samt Abhängigkeiten in eine einzige Datei – das Docker-Image braucht so kein node_modules. */
await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  legalComments: 'none',
  // Optionale native Beschleuniger von "ws" – werden zur Laufzeit nur genutzt, wenn vorhanden.
  external: ['bufferutil', 'utf-8-validate'],
  // CommonJS-Abhängigkeiten brauchen im ESM-Bundle ein "require".
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
