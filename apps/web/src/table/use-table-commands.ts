import type { Ack, Card } from '@allinscrum/protocol';
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
    const run = (send: () => Promise<Ack>) => {
      void send().then((response) => {
        if (!response.ok) toast.show(errorMessage(response.error));
      });
    };
    return {
      startRound: () => run(() => client.startRound()),
      reveal: () => run(() => client.reveal()),
      vote: (card: Card | null) => run(() => client.vote(card)),
      setUncertain: (uncertain: boolean) => run(() => client.setUncertain(uncertain)),
      setSpectating: (spectating: boolean) => run(() => client.setSpectating(spectating)),
      ignorePlayer: (playerId: string, ignored: boolean) =>
        run(() => client.ignorePlayer(playerId, ignored)),
      transferAdmin: (playerId: string) => run(() => client.transferAdmin(playerId)),
    };
  }, [client, toast]);
}
