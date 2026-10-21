import { COFFEE_CARD, type PlayerView, type SessionView } from '@allinscrum/protocol';
import { describe, expect, it } from 'vitest';
import { FakeClock, minutes, seconds } from '../../test/support/fake-clock.ts';
import { DEFAULT_DECK } from './deck.ts';
import { type Membership, Session, type SessionSettings } from './session.ts';

function createSession(overrides: Partial<SessionSettings> = {}) {
  return new Session({
    joinCode: 'ABC-DEF',
    name: 'Sprint 42',
    deck: DEFAULT_DECK,
    maxPlayers: 16,
    clock: new FakeClock().now,
    ...overrides,
  });
}

function profile(name: string) {
  return { name, avatar: null };
}

function playerIn(view: SessionView, member: Membership): PlayerView | undefined {
  return view.players.find((player) => player.id === member.playerId);
}

/** Setzt Spieler in der angegebenen Reihenfolge an den Tisch; der erste wird Admin. */
function seat<const Names extends readonly string[]>(session: Session, ...names: Names) {
  return names.map((name) => session.join({ profile: profile(name) })) as {
    [K in keyof Names]: Membership;
  };
}

describe('Session', () => {
  describe('Beitreten', () => {
    it('macht den ersten Spieler am Tisch zum Admin', () => {
      const session = createSession();

      const alice = session.join({ profile: profile('Alice') });

      expect(session.viewFor(alice.playerId).players).toEqual([
        expect.objectContaining({ name: 'Alice', isAdmin: true }),
      ]);
    });

    it('entfernt Leerzeichen am Rand des Namens', () => {
      const session = createSession();

      const alice = session.join({ profile: profile('  Alice  ') });

      expect(session.viewFor(alice.playerId).players[0]?.name).toBe('Alice');
    });

    it.each(['', '   '])('lehnt den leeren Namen "%s" ab', (name) => {
      const session = createSession();

      expect(() => session.join({ profile: profile(name) })).toThrowDomainError('invalid-name');
    });
  });

  describe('Inaktivität', () => {
    it('gilt als inaktiv, wenn länger als die Frist niemand etwas getan hat', () => {
      const clock = new FakeClock();
      const session = createSession({ clock: clock.now });
      seat(session, 'Alice', 'Bob');

      clock.advance(minutes(61));

      expect(session.isIdleLongerThan(minutes(60))).toBe(true);
    });

    it('wird durch jede Spieleraktion wieder aktiv', () => {
      const clock = new FakeClock();
      const session = createSession({ clock: clock.now });
      const [alice] = seat(session, 'Alice', 'Bob');
      clock.advance(minutes(50));

      session.startRound(alice.playerId);
      clock.advance(minutes(50));

      expect(session.isIdleLongerThan(minutes(60))).toBe(false);
    });
  });

  describe('Volle Session', () => {
    it('nimmt über die Obergrenze hinaus niemanden mehr auf', () => {
      const session = createSession({ maxPlayers: 2 });
      seat(session, 'Alice', 'Bob');

      expect(() => session.join({ profile: profile('Carol') })).toThrowDomainError('session-full');
    });

    it('lässt Zurückkehrende trotzdem wieder an ihren Platz', () => {
      const session = createSession({ maxPlayers: 2 });
      const [, bob] = seat(session, 'Alice', 'Bob');

      const again = session.join({ profile: profile('Bob'), resumeToken: bob.resumeToken });

      expect(again.playerId).toBe(bob.playerId);
    });
  });

  describe('Wiederkehren', () => {
    it('setzt einen zurückkehrenden Spieler samt Karte wieder auf seinen Platz', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob');
      session.startRound(alice.playerId);
      session.vote(bob.playerId, '5');
      session.setOnline(bob.playerId, false);

      const again = session.join({ profile: profile('Bob'), resumeToken: bob.resumeToken });

      const view = session.viewFor(again.playerId);
      expect(again.playerId).toBe(bob.playerId);
      expect(view.players).toHaveLength(2);
      expect(playerIn(view, bob)).toMatchObject({ isOnline: true, card: '5' });
    });
  });

  describe('Join-Code', () => {
    it('zeigt allen am Tisch den Code, damit sie weitere Mitspieler einladen können', () => {
      const session = createSession({ joinCode: 'K7Q-X2M' });

      const [, bob] = seat(session, 'Alice', 'Bob');

      expect(session.viewFor(bob.playerId).joinCode).toBe('K7Q-X2M');
    });
  });

  describe('Runde starten', () => {
    it('startet als Admin die erste Schätzrunde', () => {
      const session = createSession();
      const [alice] = seat(session, 'Alice', 'Bob');

      session.startRound(alice.playerId);

      expect(session.viewFor(alice.playerId)).toMatchObject({ phase: 'voting', round: 1 });
    });

    it('verbietet anderen Spielern das Starten', () => {
      const session = createSession();
      const [, bob] = seat(session, 'Alice', 'Bob');

      expect(() => session.startRound(bob.playerId)).toThrowDomainError('not-admin');
    });

    it('braucht mindestens zwei Spieler am Tisch', () => {
      const session = createSession();
      const [alice] = seat(session, 'Alice');

      expect(() => session.startRound(alice.playerId)).toThrowDomainError('not-enough-players');
    });

    it('zeigt nur dem Admin an, dass gestartet werden kann', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob');

      expect(session.viewFor(alice.playerId).canStart).toBe(true);
      expect(session.viewFor(bob.playerId).canStart).toBe(false);
    });

    it('kann eine laufende Runde nicht erneut starten', () => {
      const session = createSession();
      const [alice] = seat(session, 'Alice', 'Bob');
      session.startRound(alice.playerId);

      expect(session.viewFor(alice.playerId).canStart).toBe(false);
      expect(() => session.startRound(alice.playerId)).toThrowDomainError('round-already-active');
    });
  });

  describe('Schätzen', () => {
    function startedSession() {
      const session = createSession();
      const players = seat(session, 'Alice', 'Bob', 'Carol');
      session.startRound(players[0].playerId);
      return { session, players };
    }

    it('legt die Karte verdeckt ab – der Spieler selbst sieht sie', () => {
      const { session, players } = startedSession();
      const [, bob] = players;

      session.vote(bob.playerId, '5');

      expect(playerIn(session.viewFor(bob.playerId), bob)).toMatchObject({
        status: 'voted',
        card: '5',
      });
    });

    it('verbirgt den Kartenwert vor den Mitspielern', () => {
      const { session, players } = startedSession();
      const [alice, bob] = players;

      session.vote(bob.playerId, '5');

      expect(playerIn(session.viewFor(alice.playerId), bob)).toMatchObject({
        status: 'voted',
        card: null,
        cardOpen: false,
      });
    });

    it.each(['?', COFFEE_CARD])('legt die Signalkarte %s sofort für alle offen hin', (card) => {
      const { session, players } = startedSession();
      const [alice, bob] = players;

      session.vote(bob.playerId, card);

      expect(playerIn(session.viewFor(alice.playerId), bob)).toMatchObject({
        card,
        cardOpen: true,
      });
      expect(playerIn(session.viewFor(bob.playerId), bob)).toMatchObject({ card, cardOpen: true });
    });

    it('akzeptiert nur Karten aus dem Deck', () => {
      const { session, players } = startedSession();

      expect(() => session.vote(players[1].playerId, '4')).toThrowDomainError('invalid-card');
    });

    it('liefert das Kartendeck der Session mit', () => {
      const { session, players } = startedSession();

      expect(session.viewFor(players[1].playerId).deck).toEqual(DEFAULT_DECK);
    });

    it('erlaubt keine Karte, bevor die Runde gestartet wurde', () => {
      const session = createSession();
      const [, bob] = seat(session, 'Alice', 'Bob');

      expect(() => session.vote(bob.playerId, '5')).toThrowDomainError('round-not-active');
    });

    it('kann die Karte vor dem Aufdecken wieder zurücknehmen', () => {
      const { session, players } = startedSession();
      const [, bob] = players;
      session.vote(bob.playerId, '5');

      session.vote(bob.playerId, null);

      expect(playerIn(session.viewFor(bob.playerId), bob)).toMatchObject({
        status: 'pending',
        card: null,
      });
    });

    it('weist Stimmen von Unbekannten ab', () => {
      const { session } = startedSession();

      expect(() => session.vote('fremd', '5')).toThrowDomainError('not-a-member');
    });

    it('zeigt allen sofort, dass ein Spieler unsicher ist', () => {
      const { session, players } = startedSession();
      const [alice, bob] = players;
      session.vote(bob.playerId, '8');

      session.setUncertain(bob.playerId, true);

      expect(playerIn(session.viewFor(alice.playerId), bob)).toMatchObject({
        uncertain: true,
        card: null,
      });
    });
  });

  describe('Aufdecken', () => {
    function votedSession(cards: readonly string[]) {
      const session = createSession();
      const players = seat(session, 'Alice', 'Bob', 'Carol');
      session.startRound(players[0].playerId);
      players.forEach((player, index) => {
        const card = cards[index];
        if (card !== undefined) session.vote(player.playerId, card);
      });
      return { session, players };
    }

    it('zeigt nach dem Aufdecken allen alle Karten', () => {
      const { session, players } = votedSession(['3', '5', '8']);
      const [alice, bob] = players;

      session.reveal(alice.playerId);

      const view = session.viewFor(bob.playerId);
      expect(view.phase).toBe('revealed');
      expect(view.players.map((player) => player.card)).toEqual(['3', '5', '8']);
      expect(view.players.every((player) => player.cardOpen)).toBe(true);
    });

    it('wartet, bis alle geschätzt haben', () => {
      const { session, players } = votedSession(['3', '5']);

      expect(session.viewFor(players[0].playerId).canReveal).toBe(false);
      expect(() => session.reveal(players[0].playerId)).toThrowDomainError('votes-missing');
    });

    it('signalisiert nur dem Admin, dass aufgedeckt werden kann', () => {
      const { session, players } = votedSession(['3', '5', '8']);
      const [alice, bob] = players;

      expect(session.viewFor(alice.playerId).canReveal).toBe(true);
      expect(session.viewFor(bob.playerId).canReveal).toBe(false);
      expect(() => session.reveal(bob.playerId)).toThrowDomainError('not-admin');
    });

    it('kann eine Runde nur einmal aufdecken', () => {
      const { session, players } = votedSession(['3', '5', '8']);
      const [alice] = players;
      session.reveal(alice.playerId);

      expect(session.viewFor(alice.playerId).canReveal).toBe(false);
      expect(() => session.reveal(alice.playerId)).toThrowDomainError('round-not-active');
    });

    describe('Karte nach dem Aufdecken tauschen', () => {
      it('zeigt die neue Karte – die ursprünglich aufgedeckte liegt sichtbar darunter', () => {
        const { session, players } = votedSession(['3', '5', '13']);
        const [alice, , carol] = players;
        session.reveal(alice.playerId);

        session.vote(carol.playerId, '5');

        expect(playerIn(session.viewFor(alice.playerId), carol)).toMatchObject({
          card: '5',
          replacedCard: '13',
        });
      });

      it('rechnet den Durchschnitt mit der neuen Karte', () => {
        const { session, players } = votedSession(['3', '5', '34']);
        const [alice, , carol] = players;
        session.reveal(alice.playerId);

        session.vote(carol.playerId, '5');

        expect(session.viewFor(alice.playerId).result?.suggestedCard).toBe('5');
      });

      it('hebt die Markierung auf, wenn zur ursprünglichen Karte zurückgetauscht wird', () => {
        const { session, players } = votedSession(['3', '5', '13']);
        const [alice, , carol] = players;
        session.reveal(alice.playerId);
        session.vote(carol.playerId, '5');

        session.vote(carol.playerId, '13');

        expect(playerIn(session.viewFor(alice.playerId), carol)?.replacedCard).toBeNull();
      });

      it('lässt keine Karte nachreichen, wer beim Aufdecken keine hatte', () => {
        const { session, players } = votedSession(['3', '5']);
        const [alice, , carol] = players;
        session.ignore(alice.playerId, carol.playerId, true);
        session.reveal(alice.playerId);

        expect(() => session.vote(carol.playerId, '8')).toThrowDomainError('player-ignored');
      });

      it('lässt die Karte nicht mehr zurücknehmen', () => {
        const { session, players } = votedSession(['3', '5', '8']);
        const [alice, bob] = players;
        session.reveal(alice.playerId);

        expect(() => session.vote(bob.playerId, null)).toThrowDomainError('invalid-card');
      });
    });

    it('liefert erst nach dem Aufdecken eine Auswertung', () => {
      const { session, players } = votedSession(['3', '5', '8']);
      const [alice] = players;
      expect(session.viewFor(alice.playerId).result).toBeNull();

      session.reveal(alice.playerId);

      expect(session.viewFor(alice.playerId).result).toMatchObject({ suggestedCard: '5' });
    });

    describe('Spieler aussetzen lassen', () => {
      it('erlaubt das Aufdecken, wenn der fehlende Spieler ignoriert wird', () => {
        const { session, players } = votedSession(['3', '5']);
        const [alice, , carol] = players;

        session.ignore(alice.playerId, carol.playerId, true);

        const view = session.viewFor(alice.playerId);
        expect(playerIn(view, carol)?.status).toBe('ignored');
        expect(view.canReveal).toBe(true);
      });

      it('ist dem Admin vorbehalten', () => {
        const { session, players } = votedSession(['3', '5']);
        const [, bob, carol] = players;

        expect(() => session.ignore(bob.playerId, carol.playerId, true)).toThrowDomainError(
          'not-admin',
        );
      });

      it('nimmt dem ausgesetzten Spieler die Karte ab', () => {
        const { session, players } = votedSession(['3', '5']);
        const [alice, , carol] = players;
        session.ignore(alice.playerId, carol.playerId, true);

        expect(() => session.vote(carol.playerId, '8')).toThrowDomainError('player-ignored');
      });

      it('wertet eine bereits gelegte Karte des Ausgesetzten nicht', () => {
        const { session, players } = votedSession(['3', '5', '34']);
        const [alice, , carol] = players;

        session.ignore(alice.playerId, carol.playerId, true);
        session.reveal(alice.playerId);

        const view = session.viewFor(alice.playerId);
        expect(view.result?.suggestedCard).toBe('5');
        expect(playerIn(view, carol)?.card).toBeNull();
      });

      it('braucht trotzdem mindestens eine gelegte Karte', () => {
        const { session, players } = votedSession([]);
        const [alice, bob, carol] = players;
        [alice, bob, carol].forEach((player) =>
          session.ignore(alice.playerId, player.playerId, true),
        );

        expect(session.viewFor(alice.playerId).canReveal).toBe(false);
      });

      it('gilt nur während einer laufenden Runde', () => {
        const session = createSession();
        const [alice, bob] = seat(session, 'Alice', 'Bob');

        expect(() => session.ignore(alice.playerId, bob.playerId, true)).toThrowDomainError(
          'round-not-active',
        );
      });

      it('gilt nur für Spieler am Tisch', () => {
        const { session, players } = votedSession(['3', '5']);

        expect(() => session.ignore(players[0].playerId, 'fremd', true)).toThrowDomainError(
          'player-not-found',
        );
      });
    });
  });

  describe('Zuschauen', () => {
    it('nimmt einen Spieler aus der Schätzung – das Aufdecken wartet nicht auf ihn', () => {
      const session = createSession();
      const [alice, bob, carol] = seat(session, 'Alice', 'Bob', 'Carol');
      session.setSpectating(alice.playerId, true);
      session.startRound(alice.playerId);

      session.vote(bob.playerId, '5');
      session.vote(carol.playerId, '8');

      const view = session.viewFor(alice.playerId);
      expect(playerIn(view, alice)).toMatchObject({ isSpectator: true, status: 'ignored' });
      expect(view.canReveal).toBe(true);
    });

    it('gilt dauerhaft – auch in den folgenden Runden', () => {
      const session = createSession();
      const [alice, bob, carol] = seat(session, 'Alice', 'Bob', 'Carol');
      session.setSpectating(alice.playerId, true);
      session.startRound(alice.playerId);
      session.vote(bob.playerId, '5');
      session.vote(carol.playerId, '8');
      session.reveal(alice.playerId);

      session.startRound(alice.playerId);

      expect(playerIn(session.viewFor(bob.playerId), alice)?.status).toBe('ignored');
    });

    it('nimmt eine bereits gelegte Karte zurück', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob', 'Carol');
      session.startRound(alice.playerId);
      session.vote(bob.playerId, '5');

      session.setSpectating(bob.playerId, true);

      expect(playerIn(session.viewFor(bob.playerId), bob)).toMatchObject({
        status: 'ignored',
        card: null,
      });
    });

    it('lässt Zuschauer jederzeit wieder mitschätzen', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob', 'Carol');
      session.setSpectating(bob.playerId, true);
      session.startRound(alice.playerId);

      session.setSpectating(bob.playerId, false);
      session.vote(bob.playerId, '5');

      expect(playerIn(session.viewFor(bob.playerId), bob)).toMatchObject({
        isSpectator: false,
        status: 'voted',
      });
    });

    it('braucht für eine Runde mindestens zwei, die mitschätzen', () => {
      const session = createSession();
      const [alice] = seat(session, 'Alice', 'Bob');

      session.setSpectating(alice.playerId, true);

      expect(session.viewFor(alice.playerId).canStart).toBe(false);
      expect(() => session.startRound(alice.playerId)).toThrowDomainError('not-enough-players');
    });

    it('überlässt die Entscheidung den Zuschauern selbst – der Admin kann sie nicht aussetzen lassen', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob', 'Carol');
      session.setSpectating(bob.playerId, true);
      session.startRound(alice.playerId);

      expect(() => session.ignore(alice.playerId, bob.playerId, false)).toThrowDomainError(
        'player-spectating',
      );
    });

    it('steht nur Spielern am Tisch offen', () => {
      const session = createSession();
      seat(session, 'Alice', 'Bob');

      expect(() => session.setSpectating('fremd', true)).toThrowDomainError('not-a-member');
    });
  });

  describe('Tisch verlassen', () => {
    it('entfernt den Spieler samt Karte', () => {
      const session = createSession();
      const [alice, bob, carol] = seat(session, 'Alice', 'Bob', 'Carol');
      session.startRound(alice.playerId);
      session.vote(alice.playerId, '3');
      session.vote(bob.playerId, '5');
      session.vote(carol.playerId, '34');

      session.leave(carol.playerId);
      session.reveal(alice.playerId);

      const view = session.viewFor(alice.playerId);
      expect(view.players.map((player) => player.name)).toEqual(['Alice', 'Bob']);
      expect(view.result?.suggestedCard).toBe('5');
    });

    it('übergibt die Admin-Rolle an den am längsten anwesenden Spieler', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob', 'Carol');

      session.leave(alice.playerId);

      expect(playerIn(session.viewFor(bob.playerId), bob)?.isAdmin).toBe(true);
    });
  });

  describe('Admin-Rolle übergeben', () => {
    it('macht den gewählten Spieler zum Admin', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob');

      session.transferAdmin(alice.playerId, bob.playerId);

      const view = session.viewFor(alice.playerId);
      expect(view.players.map((player) => player.isAdmin)).toEqual([false, true]);
    });

    it('ist nur dem Admin erlaubt', () => {
      const session = createSession();
      const [, bob, carol] = seat(session, 'Alice', 'Bob', 'Carol');

      expect(() => session.transferAdmin(bob.playerId, carol.playerId)).toThrowDomainError(
        'not-admin',
      );
    });

    it('geht nur an Spieler am Tisch', () => {
      const session = createSession();
      const [alice] = seat(session, 'Alice', 'Bob');

      expect(() => session.transferAdmin(alice.playerId, 'fremd')).toThrowDomainError(
        'player-not-found',
      );
    });
  });

  describe('Präsenz', () => {
    it('zeigt an, wer gerade nicht verbunden ist', () => {
      const session = createSession();
      const [alice, bob] = seat(session, 'Alice', 'Bob');

      session.setOnline(bob.playerId, false);

      expect(playerIn(session.viewFor(alice.playerId), bob)?.isOnline).toBe(false);
    });

    describe('Präsenzregeln', () => {
      const policy = { adminHandoverAfterMs: seconds(30), removeOfflineAfterMs: minutes(5) };

      it('übergibt die Admin-Rolle, wenn der Admin zu lange getrennt ist', () => {
        const clock = new FakeClock();
        const session = createSession({ clock: clock.now });
        const [alice, bob] = seat(session, 'Alice', 'Bob');
        session.setOnline(alice.playerId, false);
        clock.advance(seconds(31));

        const changed = session.applyPresencePolicy(policy);

        expect(changed).toBe(true);
        expect(playerIn(session.viewFor(bob.playerId), bob)?.isAdmin).toBe(true);
      });

      it('lässt dem Admin eine Karenzzeit für kurze Verbindungsabbrüche', () => {
        const clock = new FakeClock();
        const session = createSession({ clock: clock.now });
        const [alice] = seat(session, 'Alice', 'Bob');
        session.setOnline(alice.playerId, false);
        clock.advance(seconds(20));

        expect(session.applyPresencePolicy(policy)).toBe(false);
        expect(playerIn(session.viewFor(alice.playerId), alice)?.isAdmin).toBe(true);
      });

      it('entfernt Spieler, die zu lange getrennt sind', () => {
        const clock = new FakeClock();
        const session = createSession({ clock: clock.now });
        const [alice, bob] = seat(session, 'Alice', 'Bob');
        session.setOnline(bob.playerId, false);
        clock.advance(minutes(6));

        const changed = session.applyPresencePolicy(policy);

        expect(changed).toBe(true);
        expect(session.viewFor(alice.playerId).players.map((player) => player.name)).toEqual([
          'Alice',
        ]);
      });
    });
  });

  describe('Nächste Runde', () => {
    it('räumt den Tisch für die nächste Schätzung', () => {
      const session = createSession();
      const [alice, bob, carol] = seat(session, 'Alice', 'Bob', 'Carol');
      session.startRound(alice.playerId);
      session.vote(alice.playerId, '3');
      session.vote(bob.playerId, '5');
      session.setUncertain(bob.playerId, true);
      session.ignore(alice.playerId, carol.playerId, true);
      session.reveal(alice.playerId);

      session.startRound(alice.playerId);

      const view = session.viewFor(alice.playerId);
      expect(view).toMatchObject({ phase: 'voting', round: 2, result: null });
      expect(view.players).toEqual(
        Array(3).fill(expect.objectContaining({ status: 'pending', uncertain: false, card: null })),
      );
    });
  });
});
