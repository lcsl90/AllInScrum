import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ReferenceStory, RoundRecord } from '@allinscrum/protocol';
import type { SessionStore } from '../application/session-archive.ts';
import type { SessionSnapshot } from '../domain/session.ts';

const FORMAT_VERSION = 1;

interface SnapshotFile {
  readonly version: typeof FORMAT_VERSION;
  readonly sessions: readonly SessionSnapshot[];
}

/**
 * Legt alle Tische in einer JSON-Datei ab. Geschrieben wird erst in eine Zwischendatei, die dann
 * umbenannt wird – ein Absturz mitten im Schreiben hinterlässt nie eine halbe Datei.
 */
export class JsonFileStore implements SessionStore {
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  async load(): Promise<readonly SessionSnapshot[]> {
    const content = await readIfExists(this.file);
    if (content === null) return [];
    try {
      return parseSnapshotFile(content).sessions;
    } catch {
      // Nicht überschreiben: Vielleicht lässt sich die Datei von Hand retten.
      const aside = `${this.file}.corrupt-${Date.now()}`;
      await rename(this.file, aside);
      throw new Error(`Gesicherte Tische unlesbar – Datei beiseitegelegt unter ${aside}.`);
    }
  }

  async save(sessions: readonly SessionSnapshot[]): Promise<void> {
    const content: SnapshotFile = { version: FORMAT_VERSION, sessions };
    const temporary = `${this.file}.tmp`;
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(temporary, JSON.stringify(content));
    await rename(temporary, this.file);
  }
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/* Die Datei kommt von der Platte, nicht aus dem eigenen Speicher – ihre Form wird geprüft. */

function parseSnapshotFile(content: string): SnapshotFile {
  const file = record(JSON.parse(content));
  if (file['version'] !== FORMAT_VERSION) throw new Error('Unbekannte Version');
  return { version: FORMAT_VERSION, sessions: list(file['sessions'], parseSnapshot) };
}

function parseSnapshot(raw: unknown): SessionSnapshot {
  const value = record(raw);
  return {
    joinCode: text(value['joinCode']),
    name: text(value['name']),
    deck: list(value['deck'], text),
    lastJoinedAt: number(value['lastJoinedAt']),
    roundsPlayed: number(value['roundsPlayed']),
    history: list(value['history'], parseRoundRecord),
    referenceStory:
      value['referenceStory'] === null ? null : parseReference(value['referenceStory']),
  };
}

function parseRoundRecord(raw: unknown): RoundRecord {
  const value = record(raw);
  return {
    round: number(value['round']),
    revealedAt: number(value['revealedAt']),
    average: nullable(value['average'], number),
    suggestedCard: nullable(value['suggestedCard'], text),
    consensusCard: nullable(value['consensusCard'], text),
  };
}

function parseReference(raw: unknown): ReferenceStory {
  const value = record(raw);
  return { title: text(value['title']), card: text(value['card']) };
}

function record(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Kein Objekt');
  return raw as Record<string, unknown>;
}

function list<T>(raw: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(raw)) throw new Error('Keine Liste');
  return raw.map(parse);
}

function text(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('Kein Text');
  return raw;
}

function number(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new Error('Keine Zahl');
  return raw;
}

function nullable<T>(raw: unknown, parse: (raw: unknown) => T): T | null {
  return raw === null ? null : parse(raw);
}
