import type { SessionSnapshot } from '../domain/session.ts';
import type { SessionRegistry } from './session-registry.ts';

/** Port zur dauerhaften Ablage der Tische – z. B. eine Datei auf einem Volume. */
export interface SessionStore {
  load(): Promise<readonly SessionSnapshot[]>;
  save(snapshots: readonly SessionSnapshot[]): Promise<void>;
}

/**
 * Hält die Tische über Neustarts hinweg: stellt sie beim Start wieder her und schreibt sie nur
 * dann weg, wenn sich seit dem letzten Mal etwas geändert hat.
 */
export class SessionArchive {
  private readonly registry: SessionRegistry;
  private readonly store: SessionStore;
  private lastSaved: string | null = null;
  /** Der zuletzt angestoßene Schreibvorgang – der nächste wartet auf ihn. */
  private writing: Promise<void> = Promise.resolve();

  constructor(registry: SessionRegistry, store: SessionStore) {
    this.registry = registry;
    this.store = store;
  }

  /** @returns die Anzahl der wiederhergestellten Tische */
  async restore(): Promise<number> {
    const snapshots = await this.store.load();
    this.registry.restore(snapshots);
    this.lastSaved = fingerprint(this.registry.snapshot());
    return snapshots.length;
  }

  /** Schreibt nacheinander: Ein langsames Speichern überholt nie ein späteres. */
  flush(): Promise<void> {
    const next = this.writing.catch(() => undefined).then(() => this.saveIfChanged());
    this.writing = next;
    return next;
  }

  private async saveIfChanged(): Promise<void> {
    const snapshots = this.registry.snapshot();
    const current = fingerprint(snapshots);
    if (current === this.lastSaved) return;
    await this.store.save(snapshots);
    this.lastSaved = current;
  }
}

function fingerprint(snapshots: readonly SessionSnapshot[]): string {
  return JSON.stringify(snapshots);
}
