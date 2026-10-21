# AGENTS.md – Arbeitsregeln für AllInScrum

Diese Datei richtet sich an alle (menschlichen wie KI-)Entwickler, die an diesem Repository arbeiten.

## Produkt in einem Satz

Realtime Planning Poker an einem virtuellen Pokertisch: ohne Registrierung, Sessions nur im
Arbeitsspeicher, automatische Löschung nach 60 Minuten Inaktivität, als ein Docker-Container
betreibbar.

## Entwicklungsprozess: strikt TDD

**Jede Änderung an Verhalten beginnt mit einem fehlschlagenden Test.** Keine Ausnahme für
"kleine" Änderungen.

1. **RED** – genau _einen_ Test für _ein_ beobachtbares Verhalten schreiben, ausführen, Fehlschlag
   sehen (und prüfen, dass er aus dem richtigen Grund fehlschlägt).
2. **GREEN** – minimalen Produktionscode schreiben, bis der Test grün ist. Nichts vorwegnehmen.
3. **REFACTOR** – erst wenn alles grün ist: Duplikate entfernen, Module vertiefen, Namen schärfen.
   Nach jedem Schritt Tests laufen lassen. Niemals im roten Zustand refaktorieren.

Vertikale Slices statt horizontaler: nicht erst alle Tests, dann allen Code – sondern
Test → Implementierung → nächster Test.

### Was ist ein guter Test?

- Testet **Verhalten über die öffentliche Schnittstelle**, nicht Implementierungsdetails.
  Ein Refactoring ohne Verhaltensänderung darf keinen Test brechen.
- Der Testname beschreibt _was_ passiert (fachlich, gern auf Deutsch), nicht _wie_.
- Gemockt wird **nur an Systemgrenzen**: Zeit (`Clock`), Zufall, Netzwerk (Socket im Frontend).
  Eigene Module werden nie gemockt.
- Pro Test eine logische Aussage.

### Testpyramide

| Ebene                   | Wo                                    | Werkzeug                  |
| ----------------------- | ------------------------------------- | ------------------------- |
| Domäne (schnell, viele) | `apps/server/src/domain/**/*.test.ts` | Vitest                    |
| Protokoll-Integration   | `apps/server/test/**/*.test.ts`       | Vitest + echter Socket.IO |
| UI-Komponenten / Logik  | `apps/web/src/**/*.test.ts(x)`        | Vitest + Testing Library  |
| End-to-End (wenige)     | `e2e/**/*.spec.ts`                    | Playwright                |

## Architektur

```
packages/protocol   Gemeinsamer Vertrag: Event-Namen, Payloads, SessionView, Fehlercodes (nur Typen)
apps/server         Node + Socket.IO + sirv (statische Auslieferung des gebauten Frontends)
  src/domain        Reine Spiellogik ohne I/O (Session, Runde, Statistik, Regeln)
  src/application   SessionRegistry: Anlegen, Finden, Aufräumen (Inaktivität, Präsenz)
  src/transport     Socket-Gateway: Payload-Prüfung, Domänenaufrufe, personalisierte Broadcasts
  src/http          Healthcheck + statische Dateien
  src/config.ts     Konfiguration aus Umgebungsvariablen
  src/main.ts       Composition Root – einziger Ort, an dem verdrahtet wird
apps/web            React + Vite + Motion
  src/realtime      SessionClient (SDK-artiger Wrapper um Socket.IO) + React-Hooks
  src/profile       Name, Avatar (Initialen/Foto), lokale Speicherung
  src/home          Startseite, Session erstellen/beitreten
  src/table         Pokertisch, Sitzplätze, Karten, Animationen
  src/ui            Wiederverwendbare UI-Bausteine
```

### Leitlinien

- **Die Domäne ist die einzige Quelle der Wahrheit.** Regeln wie "darf aufgedeckt werden?" werden
  serverseitig berechnet und als Flags (`canReveal`, `canStart`) ausgeliefert – das Frontend
  dupliziert keine Spielregeln.
- **Geheimhaltung serverseitig:** Fremde Karten verlassen den Server erst nach dem Aufdecken.
  Jede Sicht wird pro Spieler projiziert (`Session.viewFor`).
- **Abhängigkeiten werden injiziert** (Clock, ID-Generator, Konfiguration), nie im Modul erzeugt.
- **Tiefe Module:** kleine Schnittstellen, Komplexität dahinter verbergen.
- **Fehler** der Domäne sind `DomainError`s mit einem `ErrorCode` aus `@allinscrum/protocol`;
  das Gateway übersetzt sie in `{ ok: false, error }`-Acks.
- Kein Persistenz-Layer. Alles lebt im Speicher und darf beim Neustart verloren gehen.
- Animationen respektieren `prefers-reduced-motion`.
- Keine Emojis – weder in UI-Texten noch als Kartenwerte. Symbole sind schlanke SVG-Icons aus
  `apps/web/src/ui/icons.tsx` (z. B. die Kaffeekarte `COFFEE_CARD` als Tasse).
- Clean Code: kleine Funktionen, sprechende Namen, keine toten Pfade, keine auskommentierten
  Codeblöcke, keine spekulativen Features.

## Befehle

```bash
npm install          # einmalig
npm run dev          # Server (Port 3000, belegt → freier Port) + Vite (Port 5173) mit Hot Reload
npm test             # alle Unit- und Integrationstests
npm run test:watch   # TDD-Modus
npm run test:e2e     # Playwright (vorher: npx playwright install chromium)
npm run check        # Typecheck + Lint + Tests – muss vor jedem Commit grün sein
npm run build        # Produktions-Build (Web + gebündelter Server)
docker compose up --build
```

## Konventionen

- TypeScript strict, ESM, Node ≥ 22.18 (native Type-Stripping im Server-Dev-Modus).
  Relative Imports mit `.ts`-Endung.
- Code-Bezeichner auf Englisch, UI-Texte und Testnamen auf Deutsch.
- Formatierung: Prettier (`npm run format`), Linting: ESLint.
- Neue Fehlercodes zuerst in `packages/protocol/src/errors.ts` ergänzen.
