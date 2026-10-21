import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { App } from './App.tsx';
import { ProfileProvider } from './profile/ProfileContext.tsx';
import { createSessionClient, type RealtimeSocket } from './realtime/session-client.ts';
import { SessionClientProvider } from './realtime/SessionClientContext.tsx';
import './styles/global.css';
import { ToastProvider } from './ui/Toaster.tsx';

/** Composition Root des Frontends: eine Verbindung, ein Client, alle Provider. */

const socket: RealtimeSocket = io({ transports: ['websocket', 'polling'] });
const client = createSessionClient(socket);

const root = document.getElementById('root');
if (!root) throw new Error('#root fehlt in index.html');

createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <SessionClientProvider client={client}>
        <ProfileProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ProfileProvider>
      </SessionClientProvider>
    </MotionConfig>
  </StrictMode>,
);
