# AllInScrum

Realtime Planning Poker an einem virtuellen Pokertisch – ohne Registrierung, ohne Datenbank,
als einzelner Docker-Container.

## Funktionen

- **Sofort loslegen:** Name eingeben (optional ein Foto), Tisch eröffnen, Join-Code oder Link
  ans Team schicken. Name und Foto merkt sich der Browser in einem Cookie.
- **Unsichtbare Sessions:** Hinein kommt nur, wer den Code kennt. Wer zu viele falsche Codes
  probiert, wird für eine Minute gebremst.
- **Verdeckt schätzen:** Karten bleiben bis zum Aufdecken geheim – der Server schickt fremde
  Werte vorher gar nicht erst heraus. Wer unsicher ist, markiert seine Karte.
- **Signalkarten:** `?` (Story unklar) und die Kaffeetasse (Pause) liegen sofort für alle offen,
  damit das Team reagieren kann, ohne die Runde zu Ende zu spielen.
- **Zuschauen:** Wer nur moderiert (z. B. Scrum Master oder Product Owner), nimmt sich mit
  „Nur zuschauen" dauerhaft aus der Schätzung – bis er selbst wieder einsteigt.
- **Ergebnis:** echter Durchschnitt („Das Team hat im Schnitt 6,5 Storypoints gegeben.") und die
  nächstliegende Karte des Decks als Vorschlag. Die Karten liegen nach Wert gestapelt; wer nach
  dem Aufdecken umschwenkt, steht mit seiner neuen Karte einzeln da – die alte schaut darunter
  hervor. Bei Einigkeit gibt es Konfetti.
- **Admin-Rolle:** Der Ersteller startet Runden, deckt auf, lässt Abwesende eine Runde aussetzen
  und kann die Rolle weitergeben. Ist der Admin länger getrennt, wandert sie automatisch weiter.
- **Robust:** Nach einem Reload oder Verbindungsabbruch sitzt man wieder auf seinem Platz – mit
  seiner Karte. Mehrere Tabs desselben Spielers sind kein Problem.
- **Flüchtig:** Alles lebt im Arbeitsspeicher. Sessions ohne Aktivität werden nach 60 Minuten
  gelöscht, ein Neustart räumt alles ab.

## Schnellstart mit Docker

```bash
docker compose up --build
```

Danach läuft AllInScrum auf <http://localhost:41400>. Einen anderen Port wählt man mit
`HOST_PORT=8080 docker compose up --build`.

Ohne Compose:

```bash
docker build -t allinscrum .
docker run -p 41400:41400 allinscrum
```

Das Image enthält nur Node, den gebündelten Server und das gebaute Frontend (kein
`node_modules`), läuft als unprivilegierter Benutzer und bringt einen Healthcheck auf
`/healthz` mit.

## Konfiguration

Alle Werte sind optional und werden als Umgebungsvariablen gesetzt (siehe auch
[`docker-compose.yml`](docker-compose.yml)). Ungültige Werte verhindern den Start mit einer
klaren Fehlermeldung.

| Variable                       | Standard                        | Bedeutung                                                            |
| ------------------------------ | ------------------------------- | -------------------------------------------------------------------- |
| `PORT`                         | `41400`                         | Port des HTTP- und WebSocket-Servers                                 |
| `HOST`                         | `0.0.0.0`                       | Adresse, an die der Server bindet                                    |
| `SESSION_IDLE_TIMEOUT_MINUTES` | `60`                            | Sessions ohne Aktivität werden danach gelöscht                       |
| `ADMIN_HANDOVER_SECONDS`       | `30`                            | So lange darf der Admin getrennt sein, bevor die Rolle weiterwandert |
| `OFFLINE_REMOVAL_MINUTES`      | `5`                             | So lange bleibt ein getrennter Spieler am Tisch sitzen               |
| `MAX_SESSIONS`                 | `200`                           | Obergrenze gleichzeitiger Sessions                                   |
| `MAX_PLAYERS_PER_SESSION`      | `16`                            | Obergrenze Spieler pro Tisch                                         |
| `CARD_DECK`                    | `0,1,2,3,5,8,13,21,34,?,coffee` | Kommagetrennte Karten; `coffee` erscheint als Kaffeetasse            |
| `TRUST_PROXY`                  | `false`                         | Client-Adresse aus `X-Forwarded-For` lesen (nur hinter einem Proxy)  |
| `STATIC_DIR`                   | gebautes Frontend               | Verzeichnis mit `index.html` und `assets/`                           |

Zahlenkarten fließen in den Durchschnitt ein, alle anderen Karten (`?`, `coffee` oder z. B.
T-Shirt-Größen) nicht.

### Hinter einem Reverse Proxy

Der Proxy muss WebSockets durchreichen (`Upgrade`/`Connection`-Header für `/socket.io/`). Setze
`TRUST_PROXY=true`, damit die Sperre gegen das Durchprobieren von Codes die echte
Client-Adresse sieht – aber nur, wenn wirklich ein vertrauenswürdiger Proxy davor sitzt.

## Datenschutz

Es gibt keine Konten und keine Datenbank. Name und Foto liegen im Cookie des eigenen Browsers
und werden nur an den Tisch übertragen, an dem man sitzt. Auf dem Server existieren Sessions
ausschließlich im Arbeitsspeicher und verschwinden nach Inaktivität oder beim Neustart.

## Entwicklung

Voraussetzung: Node.js ≥ 22.18.

```bash
npm install
npm run dev          # Oberfläche auf http://localhost:5173 mit Hot Reload
npm test             # Unit- und Integrationstests
npm run test:e2e     # Playwright (einmalig vorher: npx playwright install chromium)
npm run check        # Typecheck, Lint und Tests – vor jedem Commit
```

Gearbeitet wird strikt testgetrieben. Architektur, Testpyramide und Konventionen stehen in
[`AGENTS.md`](AGENTS.md).

## Lizenz

[Apache License 2.0](LICENSE)
