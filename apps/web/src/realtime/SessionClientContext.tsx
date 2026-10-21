import { createContext, type ReactNode, useContext } from 'react';
import type { SessionClient } from './session-client.ts';

const SessionClientContext = createContext<SessionClient | null>(null);

export function SessionClientProvider(props: { client: SessionClient; children: ReactNode }) {
  return (
    <SessionClientContext.Provider value={props.client}>{props.children}</SessionClientContext.Provider>
  );
}

export function useSessionClient(): SessionClient {
  const client = useContext(SessionClientContext);
  if (!client) throw new Error('useSessionClient braucht einen SessionClientProvider');
  return client;
}
