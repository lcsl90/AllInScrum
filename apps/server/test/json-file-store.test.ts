import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionSnapshot } from '../src/domain/session.ts';
import { JsonFileStore } from '../src/persistence/json-file-store.ts';

const snapshot: SessionSnapshot = {
  joinCode: 'K7Q-X2M',
  name: 'Team Rot',
  deck: ['1', '2', '3', '?'],
  lastJoinedAt: 1_700_000_000_000,
  roundsPlayed: 2,
  history: [
    {
      round: 2,
      revealedAt: 1_700_000_100_000,
      average: 2.5,
      suggestedCard: '3',
      consensusCard: null,
    },
  ],
  referenceStory: { title: 'Login', card: '2' },
};

describe('JsonFileStore', () => {
  let directory: string;
  let file: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'allinscrum-'));
    file = join(directory, 'data', 'sessions.json');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('liest zurück, was es gespeichert hat', async () => {
    await new JsonFileStore(file).save([snapshot]);

    expect(await new JsonFileStore(file).load()).toEqual([snapshot]);
  });

  it('beginnt ohne Datei mit leerem Saal', async () => {
    expect(await new JsonFileStore(file).load()).toEqual([]);
  });

  it('hinterlässt nach dem Speichern keine Zwischendateien', async () => {
    await new JsonFileStore(file).save([snapshot]);

    expect(await readdir(join(directory, 'data'))).toEqual(['sessions.json']);
  });

  it.each([
    ['kein JSON', '{ kaputt'],
    ['unbekannte Version', JSON.stringify({ version: 99, sessions: [] })],
    ['falsche Form', JSON.stringify({ version: 1, sessions: [{ joinCode: 42 }] })],
  ])('legt eine Datei mit %s beiseite, statt sie zu überschreiben', async (_, content) => {
    await new JsonFileStore(file).save([]);
    await writeFile(file, content);

    await expect(new JsonFileStore(file).load()).rejects.toThrow(/beiseitegelegt/);

    const files = await readdir(join(directory, 'data'));
    expect(files).toEqual([expect.stringMatching(/^sessions\.json\.corrupt-\d+$/)]);
    const [aside] = files;
    expect(await readFile(join(directory, 'data', aside!), 'utf8')).toBe(content);
  });
});
