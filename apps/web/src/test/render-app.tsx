import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { ProfileProvider } from '../profile/ProfileContext.tsx';
import { SessionClientProvider } from '../realtime/SessionClientContext.tsx';
import { ToastProvider } from '../ui/Toaster.tsx';
import { FakeSessionClient } from './fake-session-client.ts';

interface RenderOptions {
  readonly client?: FakeSessionClient;
  readonly path?: string;
}

/** Rendert eine Komponente so, wie sie in der App eingebettet ist – mit Fake-Server und Test-Router. */
export function renderApp(ui: ReactElement, options: RenderOptions = {}) {
  const client = options.client ?? new FakeSessionClient();
  const location = memoryLocation({ path: options.path ?? '/', record: true });
  const user = userEvent.setup();

  function Providers({ children }: { children: ReactNode }) {
    return (
      <Router hook={location.hook}>
        <SessionClientProvider client={client}>
          <ProfileProvider>
            <ToastProvider>{children}</ToastProvider>
          </ProfileProvider>
        </SessionClientProvider>
      </Router>
    );
  }

  const result = render(ui, { wrapper: Providers });
  return { ...result, client, user, history: location.history };
}
