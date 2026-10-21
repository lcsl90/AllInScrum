import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

/*
 * Startet Realtime-Server und Vite gemeinsam. PORT gilt für die Oberfläche (Vite),
 * der Server läuft intern auf ALLINSCRUM_SERVER_PORT – Vite reicht /socket.io dorthin durch.
 * Ohne Vorgabe nimmt der Server Port 41400 oder, falls der belegt ist, einen freien.
 */
const webPort = process.env.PORT ?? '5173';
const serverPort = process.env.ALLINSCRUM_SERVER_PORT ?? String(await availablePort(41400));

const processes = [
  start('server', ['run', 'dev', '-w', '@allinscrum/server'], { PORT: serverPort }),
  start('web', ['run', 'dev', '-w', '@allinscrum/web', '--', '--port', webPort, '--strictPort'], {
    ALLINSCRUM_SERVER_URL: `http://localhost:${serverPort}`,
  }),
];

function start(name, args, env) {
  const child = spawn('npm', args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const prefix = (chunk) =>
    chunk
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => `[${name}] ${line}`)
      .join('\n') + '\n';
  child.stdout.on('data', (chunk) => process.stdout.write(prefix(chunk)));
  child.stderr.on('data', (chunk) => process.stderr.write(prefix(chunk)));
  child.on('exit', (code) => {
    console.log(`[${name}] beendet (${code ?? 'Signal'}) – stoppe alles.`);
    processes.forEach((other) => other.kill());
    process.exit(code ?? 0);
  });
  return child;
}

/** Der Wunschport, wenn er frei ist – sonst ein beliebiger freier (z. B. neben einem zweiten Dev-Server). */
function availablePort(preferred) {
  const tryListen = (port) =>
    new Promise((resolve, reject) => {
      const probe = createServer();
      probe.once('error', reject);
      probe.listen(port, '0.0.0.0', () => {
        const { port: bound } = probe.address();
        probe.close(() => resolve(bound));
      });
    });
  return tryListen(preferred).catch(() => tryListen(0));
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => processes.forEach((child) => child.kill(signal)));
}
