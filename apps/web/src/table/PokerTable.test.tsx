import { COFFEE_CARD, type SessionView } from '@allinscrum/protocol';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { rememberMembership, resumeTokenFor } from '../realtime/membership-store.ts';
import { buildPlayer, buildView } from '../test/builders.ts';
import { renderApp } from '../test/render-app.tsx';
import { PokerTable } from './PokerTable.tsx';

function renderTable(view: SessionView) {
  return renderApp(<PokerTable view={view} online />);
}

const asGuest = (overrides: Partial<SessionView> = {}) =>
  buildView({
    youId: 'bob',
    canStart: false,
    players: [buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }), buildPlayer({ id: 'bob' })],
    ...overrides,
  });

describe('Pokertisch', () => {
  describe('Einladen', () => {
    it('kopiert den Join-Code zum Weiterschicken', async () => {
      const { user } = renderTable(buildView({ joinCode: 'K7Q-X2M' }));

      await user.click(screen.getByRole('button', { name: 'Join-Code K7Q-X2M kopieren' }));

      expect(await navigator.clipboard.readText()).toBe('K7Q-X2M');
      expect(await screen.findByText('Kopiert!')).toBeInTheDocument();
    });

    it('kopiert alternativ den direkten Einladungslink', async () => {
      const { user } = renderTable(buildView({ joinCode: 'K7Q-X2M' }));

      await user.click(screen.getByRole('button', { name: 'Einladungslink kopieren' }));

      expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/s/K7Q-X2M`);
    });

    it('bittet den Ersteller, sein Team einzuladen, solange er allein am Tisch sitzt', () => {
      renderTable(
        buildView({
          canStart: false,
          players: [buildPlayer({ id: 'me', name: 'Alice', isAdmin: true })],
        }),
      );

      expect(screen.getByRole('heading', { name: 'Lade dein Team ein' })).toBeInTheDocument();
    });
  });

  describe('Rahmen', () => {
    it('verlässt den Tisch und kehrt zur Startseite zurück', async () => {
      rememberMembership('K7Q-X2M', 'token');
      const { user, client, history } = renderTable(buildView({ joinCode: 'K7Q-X2M' }));

      await user.click(screen.getByRole('button', { name: 'Tisch verlassen' }));

      expect(client.callsOf('leaveSession')).toHaveLength(1);
      expect(history.at(-1)).toBe('/');
      expect(resumeTokenFor('K7Q-X2M')).toBeUndefined();
    });

    it('zeigt an, wenn die Verbindung unterbrochen ist', () => {
      renderApp(<PokerTable view={buildView()} online={false} />);

      expect(screen.getByText(/Verbindung unterbrochen/)).toBeInTheDocument();
    });

    it('erklärt, wenn man selbst diese Runde aussetzt', () => {
      renderTable(
        asGuest({
          phase: 'voting',
          round: 1,
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }),
            buildPlayer({ id: 'bob', status: 'ignored' }),
          ],
        }),
      );

      expect(screen.getByText(/Du setzt diese Runde aus/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Karte 5' })).toBeDisabled();
    });
  });

  describe('vor der ersten Runde', () => {
    it('lässt den Admin die Schätzrunde starten', async () => {
      const { user, client } = renderTable(buildView({ canStart: true }));

      await user.click(screen.getByRole('button', { name: 'Runde starten' }));

      expect(client.callsOf('startRound')).toHaveLength(1);
    });

    it('zeigt verständlich an, wenn der Server einen Befehl ablehnt', async () => {
      const { user, client } = renderTable(buildView({ canStart: true }));
      client.respond('startRound', { ok: false, error: 'not-enough-players' });

      await user.click(screen.getByRole('button', { name: 'Runde starten' }));

      expect(await screen.findByText(/mindestens zwei Spieler/)).toBeInTheDocument();
    });

    it('lässt alle anderen auf den Admin warten', () => {
      renderTable(asGuest());

      expect(screen.queryByRole('button', { name: 'Runde starten' })).not.toBeInTheDocument();
      expect(screen.getByText(/Warte, bis Alice die Runde startet/)).toBeInTheDocument();
    });
  });

  describe('während der Schätzung', () => {
    const voting = (overrides: Partial<SessionView> = {}) =>
      buildView({ phase: 'voting', round: 1, canStart: false, ...overrides });

    it('legt per Klick eine Karte aus der Hand', async () => {
      const { user, client } = renderTable(voting());
      const hand = screen.getByRole('group', { name: 'Deine Karten' });

      await user.click(within(hand).getByRole('button', { name: 'Karte 5' }));

      expect(client.callsOf('vote')).toEqual([['5']]);
    });

    it('zeigt die Kaffeekarte als Symbol und legt sie wie jede andere Karte', async () => {
      const { user, client } = renderTable(voting());
      const hand = screen.getByRole('group', { name: 'Deine Karten' });

      await user.click(within(hand).getByRole('button', { name: 'Karte Kaffeepause' }));

      expect(within(hand).queryByText(COFFEE_CARD)).not.toBeInTheDocument();
      expect(client.callsOf('vote')).toEqual([[COFFEE_CARD]]);
    });

    it('zeigt offen liegende Karten wie das ? schon vor dem Aufdecken am Platz', () => {
      renderTable(
        voting({
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }),
            buildPlayer({ id: 'bob', status: 'voted', card: '?', cardOpen: true }),
          ],
        }),
      );

      expect(screen.getByRole('img', { name: 'Bob: Karte ?' })).toBeInTheDocument();
    });

    it('nimmt die gelegte Karte mit einem zweiten Klick zurück', async () => {
      const view = voting({
        players: [
          buildPlayer({ id: 'me', name: 'Alice', isAdmin: true, status: 'voted', card: '5' }),
          buildPlayer({ id: 'bob' }),
        ],
      });
      const { user, client } = renderTable(view);
      const chosen = within(screen.getByRole('group', { name: 'Deine Karten' })).getByRole(
        'button',
        {
          name: 'Karte 5',
        },
      );
      expect(chosen).toHaveAttribute('aria-pressed', 'true');

      await user.click(chosen);

      expect(client.callsOf('vote')).toEqual([[null]]);
    });

    it('meldet per Schalter, dass man unsicher ist', async () => {
      const { user, client } = renderTable(voting());
      const toggle = screen.getByRole('button', { name: 'Ich bin unsicher' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggle);

      expect(client.callsOf('setUncertain')).toEqual([[true]]);
    });

    it('lässt die verdeckte Karte eines unsicheren Spielers für alle orange atmen', () => {
      renderTable(
        voting({
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }),
            buildPlayer({ id: 'bob', status: 'voted', uncertain: true }),
          ],
        }),
      );

      expect(
        screen.getByRole('img', { name: 'Bob: verdeckte Karte, unsicher' }),
      ).toBeInTheDocument();
    });

    it('zeigt, wie viele schon geschätzt haben – Ausgesetzte zählen nicht mit', () => {
      renderTable(
        voting({
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true, status: 'voted', card: '3' }),
            buildPlayer({ id: 'bob' }),
            buildPlayer({ id: 'carol', status: 'ignored' }),
          ],
        }),
      );

      expect(screen.getByText('1 von 2 haben geschätzt')).toBeInTheDocument();
    });

    it('lässt den Admin erst aufdecken, wenn der Server es erlaubt', async () => {
      const { rerender, user, client } = renderTable(voting({ canReveal: false }));
      expect(screen.getByRole('button', { name: 'Aufdecken' })).toBeDisabled();

      rerender(<PokerTable view={voting({ canReveal: true })} online />);
      await user.click(screen.getByRole('button', { name: 'Aufdecken' }));

      expect(client.callsOf('reveal')).toHaveLength(1);
    });
  });

  describe('Zuschauen', () => {
    const spectatingAlice = buildPlayer({
      id: 'me',
      name: 'Alice',
      isAdmin: true,
      isSpectator: true,
      status: 'ignored',
    });

    it('nimmt sich per Schalter selbst aus der Schätzung – schon vor der ersten Runde', async () => {
      const { user, client } = renderTable(buildView());
      const toggle = screen.getByRole('button', { name: 'Nur zuschauen' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggle);

      expect(client.callsOf('setSpectating')).toEqual([[true]]);
    });

    it('zeigt Zuschauern keine Karten und lässt sie jederzeit wieder einsteigen', async () => {
      const { user, client } = renderTable(
        buildView({
          phase: 'voting',
          round: 1,
          players: [spectatingAlice, buildPlayer({ id: 'bob' })],
        }),
      );
      expect(screen.queryByRole('group', { name: 'Deine Karten' })).not.toBeInTheDocument();
      expect(screen.getByText(/Du schaust nur zu/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Nur zuschauen', pressed: true }));

      expect(client.callsOf('setSpectating')).toEqual([[false]]);
    });

    it('zeigt allen am Platz, wer nur zuschaut – statt eines Aussetzers', () => {
      renderTable(
        buildView({
          phase: 'voting',
          round: 1,
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }),
            buildPlayer({ id: 'bob', isSpectator: true, status: 'ignored' }),
          ],
        }),
      );

      expect(screen.getByText('schaut zu')).toBeInTheDocument();
      expect(screen.queryByText('setzt aus')).not.toBeInTheDocument();
    });

    it('bietet dem Admin für Zuschauer kein Aussetzen an – das entscheiden sie selbst', async () => {
      const { user } = renderTable(
        buildView({
          phase: 'voting',
          round: 1,
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }),
            buildPlayer({ id: 'bob', isSpectator: true, status: 'ignored' }),
          ],
        }),
      );

      await user.click(screen.getByRole('button', { name: 'Aktionen für Bob' }));

      expect(
        screen.queryByRole('menuitem', { name: 'Wieder mitspielen lassen' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Zum Admin machen' })).toBeInTheDocument();
    });
  });

  describe('Admin-Aktionen am Platz', () => {
    const voting = (bob: Partial<Parameters<typeof buildPlayer>[0]> = {}) =>
      buildView({
        phase: 'voting',
        round: 1,
        players: [
          buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }),
          buildPlayer({ id: 'bob', ...bob }),
        ],
      });

    it('lässt einen abwesenden Spieler diese Runde aussetzen', async () => {
      const { user, client } = renderTable(voting());

      await user.click(screen.getByRole('button', { name: 'Aktionen für Bob' }));
      await user.click(screen.getByRole('menuitem', { name: 'Diese Runde aussetzen lassen' }));

      expect(client.callsOf('ignorePlayer')).toEqual([['bob', true]]);
    });

    it('holt einen ausgesetzten Spieler zurück in die Runde', async () => {
      const { user, client } = renderTable(voting({ status: 'ignored' }));

      await user.click(screen.getByRole('button', { name: 'Aktionen für Bob' }));
      await user.click(screen.getByRole('menuitem', { name: 'Wieder mitspielen lassen' }));

      expect(client.callsOf('ignorePlayer')).toEqual([['bob', false]]);
    });

    it('übergibt die Admin-Rolle', async () => {
      const { user, client } = renderTable(voting());

      await user.click(screen.getByRole('button', { name: 'Aktionen für Bob' }));
      await user.click(screen.getByRole('menuitem', { name: 'Zum Admin machen' }));

      expect(client.callsOf('transferAdmin')).toEqual([['bob']]);
    });

    it('steht anderen Spielern nicht zur Verfügung', () => {
      renderTable(asGuest({ phase: 'voting', round: 1 }));

      expect(screen.queryByRole('button', { name: /Aktionen für/ })).not.toBeInTheDocument();
    });
  });

  describe('nach dem Aufdecken', () => {
    const revealed = (overrides: Partial<SessionView> = {}) =>
      buildView({
        phase: 'revealed',
        round: 1,
        players: [
          buildPlayer({ id: 'me', name: 'Alice', isAdmin: true, status: 'voted', card: '5' }),
          buildPlayer({ id: 'bob', status: 'voted', card: '8', uncertain: true }),
          buildPlayer({ id: 'carol', status: 'voted', card: '5' }),
        ],
        result: { average: 6, suggestedCard: '5', consensus: false },
        ...overrides,
      });

    it('zeigt allen alle Karten – die Unsicherheit bleibt sichtbar', () => {
      renderTable(revealed());

      expect(screen.getByRole('img', { name: 'Alice: Karte 5' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Bob: Karte 8, unsicher' })).toBeInTheDocument();
    });

    it('legt die Karten nach Wert gestapelt in die Tischmitte', () => {
      renderTable(revealed());

      const stacks = screen.getAllByRole('group', { name: /^Stapel/ });
      expect(stacks.map((stack) => stack.getAttribute('aria-label'))).toEqual([
        'Stapel 5: Alice, Carol',
        'Stapel 8: Bob',
      ]);
    });

    it('benennt den Stapel der Kaffeekarte verständlich', () => {
      renderTable(
        revealed({
          players: [
            buildPlayer({
              id: 'me',
              name: 'Alice',
              isAdmin: true,
              status: 'voted',
              card: COFFEE_CARD,
            }),
            buildPlayer({ id: 'bob', status: 'voted', card: '5' }),
          ],
        }),
      );

      expect(screen.getByRole('group', { name: 'Stapel Kaffeepause: Alice' })).toBeInTheDocument();
    });

    it('nennt unter jedem Stapel, wer ihn gelegt hat', () => {
      renderTable(revealed());

      const stack = screen.getByRole('group', { name: /^Stapel 5/ });
      expect(within(stack).getByText('Alice')).toBeInTheDocument();
      expect(within(stack).getByText('Carol')).toBeInTheDocument();
    });

    it('nennt den echten Durchschnitt in einem ganzen Satz', () => {
      renderTable(revealed());

      expect(screen.getByText(/im Schnitt/)).toHaveTextContent(
        'Das Team hat im Schnitt 6 Storypoints gegeben.',
      );
    });

    it.each([
      [6.5, '6,5'],
      [13 / 3, '4,3'],
    ])('schreibt den Durchschnitt %s mit einer Nachkommastelle: %s', (average, written) => {
      renderTable(revealed({ result: { average, suggestedCard: '5', consensus: false } }));

      expect(screen.getByText(/im Schnitt/)).toHaveTextContent(
        `Das Team hat im Schnitt ${written} Storypoints gegeben.`,
      );
    });

    it('spricht bei einem Punkt in der Einzahl', () => {
      renderTable(revealed({ result: { average: 1, suggestedCard: '1', consensus: false } }));

      expect(screen.getByText(/im Schnitt/)).toHaveTextContent(
        'Das Team hat im Schnitt 1 Storypoint gegeben.',
      );
    });

    it('erklärt, wenn es ohne Zahlenkarten keinen Durchschnitt gibt', () => {
      renderTable(revealed({ result: { average: null, suggestedCard: null, consensus: false } }));

      expect(
        screen.getByText('Ohne Zahlenkarten gibt es keinen Durchschnitt.'),
      ).toBeInTheDocument();
    });

    it('schlägt die nächstliegende Karte vor, wenn der Durchschnitt zwischen zwei Karten liegt', () => {
      renderTable(revealed());

      expect(screen.getByText(/Nächstliegende Karte/)).toHaveTextContent('Nächstliegende Karte: 5');
    });

    it('verzichtet auf den Vorschlag, wenn der Durchschnitt genau eine Karte ist', () => {
      renderTable(revealed({ result: { average: 5, suggestedCard: '5', consensus: false } }));

      expect(screen.queryByText(/Nächstliegende Karte/)).not.toBeInTheDocument();
    });

    it('lässt die Karte nach dem Aufdecken noch tauschen', async () => {
      const { user, client } = renderTable(revealed());
      const hand = screen.getByRole('group', { name: 'Deine Karten' });

      await user.click(within(hand).getByRole('button', { name: 'Karte 5' }));
      await user.click(within(hand).getByRole('button', { name: 'Karte 13' }));

      expect(client.callsOf('vote')).toEqual([['13']]);
    });

    it('zeigt getauschte Karten mit der aufgedeckten darunter', () => {
      renderTable(
        revealed({
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true, status: 'voted', card: '5' }),
            buildPlayer({ id: 'bob', status: 'voted', card: '5', replacedCard: '13' }),
          ],
        }),
      );

      expect(
        screen.getByRole('img', { name: 'Bob: Karte 5, getauscht von 13' }),
      ).toBeInTheDocument();
    });

    it('stellt getauschte Karten einzeln über den, der getauscht hat – die übrigen bleiben gestapelt', () => {
      renderTable(
        revealed({
          players: [
            buildPlayer({ id: 'me', name: 'Alice', isAdmin: true, status: 'voted', card: '5' }),
            buildPlayer({ id: 'bob', status: 'voted', card: '5', replacedCard: '13' }),
            buildPlayer({ id: 'carol', status: 'voted', card: '5' }),
          ],
        }),
      );

      const stack = screen.getByRole('group', { name: 'Stapel 5: Alice, Bob, Carol' });
      const unchanged = within(stack).getByRole('group', { name: 'Alice, Carol' });
      const swapped = within(stack).getByRole('group', { name: 'Bob' });
      expect(within(unchanged).getAllByRole('img', { name: /Karte 5$/ })).toHaveLength(2);
      expect(
        within(swapped).getByRole('img', { name: 'Bob: Karte 5, getauscht von 13' }),
      ).toBeInTheDocument();
      expect(within(swapped).getByText('Bob')).toBeInTheDocument();
    });

    it('feiert, wenn sich alle einig sind', () => {
      renderTable(revealed({ result: { average: 5, suggestedCard: '5', consensus: true } }));

      expect(screen.getByText('Alle einig!')).toBeInTheDocument();
    });

    it('fordert nur zum Diskutieren auf, wenn es Ausreißer gibt', () => {
      const { rerender } = renderTable(revealed({ youId: 'bob' }));
      expect(screen.getByText('Diskutiert die Ausreißer!')).toBeInTheDocument();

      rerender(
        <PokerTable
          view={revealed({
            youId: 'bob',
            result: { average: 5, suggestedCard: '5', consensus: true },
          })}
          online
        />,
      );

      expect(screen.queryByText('Diskutiert die Ausreißer!')).not.toBeInTheDocument();
    });

    it('lässt den Admin die nächste Runde starten', async () => {
      const { user, client } = renderTable(revealed({ canStart: true }));

      await user.click(screen.getByRole('button', { name: 'Nächste Runde' }));

      expect(client.callsOf('startRound')).toHaveLength(1);
    });
  });
});
