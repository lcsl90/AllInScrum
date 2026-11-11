import type { Ack, Card, ErrorCode, ReferenceStory } from '@allinscrum/protocol';
import { useMemo } from 'react';
import { useSessionClient } from '../realtime/SessionClientContext.tsx';
import { errorMessage } from '../ui/error-messages.ts';
import { useToast } from '../ui/Toaster.tsx';

export type TableCommands = ReturnType<typeof useTableCommands>;

/** Die Befehle am Tisch – Fehler des Servers erscheinen als Toast, die Komponenten bleiben schlank. */
export function useTableCommands() {
  const client = useSessionClient();
  const toast = useToast();

  return useMemo(() => {
    /**
     * @param alreadyDone Fehler, der nur bedeutet: Jemand anderes war schneller, das Ziel ist
     *   erreicht. Da alle am Tisch starten und aufdecken dürfen, ist das kein Grund zur Meldung.
     */
    const run = (send: () => Promise<Ack>, alreadyDone?: ErrorCode) => {
      void send().then((response) => {
        if (!response.ok && response.error !== alreadyDone) {
          toast.show(errorMessage(response.error));
        }
      });
    };
    return {
      startRound: () => run(() => client.startRound(), 'round-already-active'),
      reveal: () => run(() => client.reveal(), 'round-not-active'),
      vote: (card: Card | null) => run(() => client.vote(card)),
      setUncertain: (uncertain: boolean) => run(() => client.setUncertain(uncertain)),
      setSpectating: (spectating: boolean) => run(() => client.setSpectating(spectating)),
      ignorePlayer: (playerId: string, ignored: boolean) =>
        run(() => client.ignorePlayer(playerId, ignored)),
      transferAdmin: (playerId: string) => run(() => client.transferAdmin(playerId)),
      removePlayer: (playerId: string) => run(() => client.removePlayer(playerId)),
      setReferenceStory: (story: ReferenceStory | null) =>
        run(() => client.setReferenceStory(story)),
    };
  }, [client, toast]);
}
