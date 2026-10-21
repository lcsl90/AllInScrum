import type { ErrorCode, SessionClosedReason, SessionView } from '@allinscrum/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '../profile/ProfileContext.tsx';
import {
  forgetMembership,
  rememberMembership,
  resumeTokenFor,
} from '../realtime/membership-store.ts';
import { useSessionClient } from '../realtime/SessionClientContext.tsx';

export type SessionConnection =
  | { readonly status: 'needs-profile' }
  | { readonly status: 'joining' }
  | { readonly status: 'seated'; readonly view: SessionView | null }
  | { readonly status: 'failed'; readonly error: ErrorCode }
  | { readonly status: 'closed'; readonly reason: SessionClosedReason };

/** Steuert den Beitritt zu einer Session und liefert den aktuellen Stand des Tisches. */
export function useSessionConnection(joinCode: string) {
  const client = useSessionClient();
  const { profile } = useProfile();
  // Der Beitritt liest das aktuelle Profil, ohne bei jeder Namensänderung neu beizutreten.
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  const hasName = profile.name.trim().length > 0;
  const [connection, setConnection] = useState<SessionConnection>(() =>
    hasName ? { status: 'joining' } : { status: 'needs-profile' },
  );
  const joinStarted = useRef(false);

  /** `quietly`: der Tisch bleibt sichtbar, während im Hintergrund neu beigetreten wird. */
  const join = useCallback(
    async ({ quietly = false } = {}) => {
      joinStarted.current = true;
      if (!quietly) setConnection({ status: 'joining' });
      const response = await client.joinSession({
        joinCode,
        profile: profileRef.current,
        resumeToken: resumeTokenFor(joinCode),
      });
      if (!response.ok) {
        setConnection({ status: 'failed', error: response.error });
        return;
      }
      rememberMembership(joinCode, response.data.resumeToken);
      setConnection((current) =>
        current.status === 'seated' ? current : { status: 'seated', view: null },
      );
    },
    [client, joinCode],
  );

  useEffect(() => client.onState((view) => setConnection({ status: 'seated', view })), [client]);

  // Nach einem Verbindungsabbruch kennt der Server den neuen Socket nicht – still wieder hinsetzen.
  const [online, setOnline] = useState(true);
  const seated = connection.status === 'seated';
  useEffect(
    () =>
      client.onConnectionChange((connected) => {
        setOnline(connected);
        if (connected && seated) void join({ quietly: true });
      }),
    [client, seated, join],
  );

  useEffect(
    () =>
      client.onClosed((reason) => {
        forgetMembership(joinCode);
        setConnection({ status: 'closed', reason });
      }),
    [client, joinCode],
  );

  // Mit gemerktem Namen geht es sofort an den Tisch – genau einmal, auch im StrictMode.
  useEffect(() => {
    if (!joinStarted.current && connection.status === 'joining') void join();
  }, [connection.status, join]);

  return { connection, online, join };
}
