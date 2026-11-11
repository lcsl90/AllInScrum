import { expect, test } from './support/players.ts';

test.describe('Planning Poker am Tisch', () => {
  test('zwei Teammitglieder schätzen verdeckt, decken auf und sehen den Durchschnitt', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');

    await alice.page.getByRole('button', { name: 'Runde starten' }).click();
    await bob.hand.getByRole('button', { name: 'Karte 5', exact: true }).click();
    await expect(alice.page.getByRole('img', { name: 'Bob: verdeckte Karte' })).toBeVisible();
    await alice.hand.getByRole('button', { name: 'Karte 8', exact: true }).click();
    await alice.page.getByRole('button', { name: 'Aufdecken' }).click();

    for (const { page } of [alice, bob]) {
      await expect(page.getByText(/im Schnitt/)).toHaveText(
        'Das Team hat im Schnitt 6,5 Storypoints gegeben.',
      );
      await expect(page.getByText(/Nächstliegende Karte/)).toHaveText('Nächstliegende Karte: 8');
    }
  });

  test('ein Fragezeichen sehen alle sofort – Zahlen bleiben verdeckt', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');
    await alice.page.getByRole('button', { name: 'Runde starten' }).click();

    await bob.hand.getByRole('button', { name: 'Karte ?', exact: true }).click();
    await alice.hand.getByRole('button', { name: 'Karte 5', exact: true }).click();

    await expect(alice.page.getByRole('img', { name: 'Bob: Karte ?' })).toBeVisible();
    await expect(bob.page.getByRole('img', { name: 'Alice: verdeckte Karte' })).toBeVisible();
  });

  test('wer nur zuschaut, hält die Runde nicht auf', async ({ openTable, joinTable }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');
    const carol = await joinTable(alice.joinCode, 'Carol');

    await alice.page.getByRole('button', { name: 'Nur zuschauen' }).click();
    await alice.page.getByRole('button', { name: 'Runde starten' }).click();
    await bob.hand.getByRole('button', { name: 'Karte 3', exact: true }).click();
    await carol.hand.getByRole('button', { name: 'Karte 5', exact: true }).click();

    await expect(alice.page.getByText('2 von 2 haben geschätzt')).toBeVisible();
    await expect(alice.page.getByRole('button', { name: 'Aufdecken' })).toBeEnabled();
  });

  test('zu zweit: Schaut der Admin nur zu, spielt der andere die Runde allein durch', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');

    await alice.page.getByRole('button', { name: 'Nur zuschauen' }).click();
    await bob.page.getByRole('button', { name: 'Runde starten' }).click();
    await bob.hand.getByRole('button', { name: 'Karte 5', exact: true }).click();
    await bob.page.getByRole('button', { name: 'Aufdecken' }).click();

    await expect(alice.page.getByText(/im Schnitt/)).toHaveText(
      'Das Team hat im Schnitt 5 Storypoints gegeben.',
    );
    await expect(bob.page.getByRole('button', { name: 'Nächste Runde' })).toBeEnabled();
  });

  test('der Scrum-Mentor bittet die niedrigste und die höchste Schätzung um Begründung', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');
    await alice.page.getByRole('button', { name: 'Runde starten' }).click();
    await alice.hand.getByRole('button', { name: 'Karte 3', exact: true }).click();
    await bob.hand.getByRole('button', { name: 'Karte 13', exact: true }).click();

    await bob.page.getByRole('button', { name: 'Aufdecken' }).click();

    const mentor = bob.page.getByRole('complementary', { name: 'Scrum-Mentor' });
    await expect(mentor).toContainText('Alice hat am niedrigsten geschätzt (3)');
    await expect(mentor).toContainText('Bob hat am höchsten geschätzt (13)');
    await expect(mentor.getByText('Du bist dran')).toBeVisible();
  });

  test('nach einem Reload sitzt man wieder auf seinem Platz – mit seiner Karte', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');
    await alice.page.getByRole('button', { name: 'Runde starten' }).click();
    await bob.hand.getByRole('button', { name: 'Karte 13', exact: true }).click();

    await bob.page.reload();

    await expect(bob.hand.getByRole('button', { name: 'Karte 13', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(alice.page.getByText('1 von 2 haben geschätzt')).toBeVisible();
  });

  test('die hervorgehobene Karte bleibt greifbar, auch an ihrem angehobenen Teil', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    await joinTable(alice.joinCode, 'Bob');
    await alice.page.getByRole('button', { name: 'Runde starten' }).click();
    const card = alice.hand.getByRole('button', { name: 'Karte 5', exact: true });
    const strip = await card.boundingBox();
    if (!strip) throw new Error('Karte 5 ist nicht sichtbar');
    const x = strip.x + strip.width / 2;

    // Erst auf die Karte zeigen, dann nach oben auf den angehobenen Teil fahren und klicken.
    await alice.page.mouse.move(x, strip.y + strip.height / 2);
    await alice.page.mouse.move(x, strip.y - 30, { steps: 6 });
    await alice.page.mouse.down();
    await alice.page.mouse.up();

    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('der Admin nimmt einen Spieler vom Tisch – die Runde wartet nicht mehr auf ihn', async ({
    openTable,
    joinTable,
  }) => {
    const alice = await openTable('Alice');
    const bob = await joinTable(alice.joinCode, 'Bob');
    const carol = await joinTable(alice.joinCode, 'Carol');
    await alice.page.getByRole('button', { name: 'Runde starten' }).click();
    await alice.hand.getByRole('button', { name: 'Karte 3', exact: true }).click();
    await bob.hand.getByRole('button', { name: 'Karte 5', exact: true }).click();

    await alice.page.getByRole('button', { name: 'Aktionen für Carol' }).click();
    await alice.page.getByRole('menuitem', { name: 'Vom Tisch entfernen' }).click();

    await expect(carol.page.getByRole('heading', { name: 'Vom Tisch genommen' })).toBeVisible();
    await expect(alice.page.getByText('2 von 2 haben geschätzt')).toBeVisible();
    await expect(alice.page.getByRole('button', { name: 'Aufdecken' })).toBeEnabled();
  });

  test('der Join-Code lässt sich auch über http im LAN kopieren', async ({ openTable }) => {
    const { page, joinCode } = await openTable('Alice');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Ohne sicheren Kontext fehlt die Clipboard-API – zum Nachlesen bleibt sie hier versteckt greifbar.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'hiddenClipboard', { value: navigator.clipboard });
      Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined });
    });
    await page.reload();

    await page
      .getByRole('button', { name: `Join-Code ${joinCode} kopieren` })
      .first()
      .click();

    await expect(page.getByText('Kopiert!')).toBeVisible();
    const copied = await page.evaluate(() =>
      (window as unknown as { hiddenClipboard: Clipboard }).hiddenClipboard.readText(),
    );
    expect(copied).toBe(joinCode);
  });

  test('ein unbekannter Code führt zu einer verständlichen Meldung', async ({ openTable }) => {
    const { page } = await openTable('Alice');

    await page.goto('/s/ZZZ-ZZZ');

    await expect(page.getByRole('heading', { name: 'Tisch nicht gefunden' })).toBeVisible();
  });
});
