import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { get as httpsGet } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpServer } from '../src/http/http-server.ts';

describe('HTTP-Server', () => {
  let staticDir: string;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    staticDir = await mkdtemp(join(tmpdir(), 'allinscrum-static-'));
    await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>AllInScrum</title>');
    await mkdir(join(staticDir, 'assets'));
    await writeFile(join(staticDir, 'assets', 'app-3f2a1b.js'), 'console.log("hi")');
    server = createHttpServer({ staticDir });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(staticDir, { recursive: true, force: true });
  });

  it('meldet sich über den Healthcheck als bereit', async () => {
    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('liefert gebaute Assets aus', async () => {
    const response = await fetch(`${baseUrl}/assets/app-3f2a1b.js`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('console.log("hi")');
  });

  it('beantwortet geteilte Session-Links mit der App', async () => {
    const response = await fetch(`${baseUrl}/s/k3x9a2b7qp`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>AllInScrum</title>');
  });
});

describe('HTTP-Server ohne gebautes Frontend (Entwicklungsmodus)', () => {
  it('startet trotzdem und beantwortet den Healthcheck', async () => {
    const server = createHttpServer({ staticDir: join(tmpdir(), 'gibt-es-nicht-allinscrum') });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const health = await fetch(`${baseUrl}/healthz`);
    const page = await fetch(`${baseUrl}/`);

    expect(health.status).toBe(200);
    expect(page.status).toBe(404);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
});

describe('HTTP-Server mit Zertifikat', () => {
  const tlsDir = join(import.meta.dirname, 'support', 'tls');

  it('spricht HTTPS', async () => {
    const cert = await readFile(join(tlsDir, 'test-cert.pem'));
    const key = await readFile(join(tlsDir, 'test-key.pem'));
    const server = createHttpServer({
      staticDir: join(tmpdir(), 'gibt-es-nicht-allinscrum'),
      tls: { cert, key },
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const health = await getOverHttps(`https://127.0.0.1:${port}/healthz`, cert);

    expect(health).toEqual({ status: 200, body: '{"status":"ok"}' });
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
});

/** GET über HTTPS, das nur dem übergebenen (selbst signierten) Zertifikat vertraut. */
function getOverHttps(url: string, trusted: Buffer): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    httpsGet(url, { ca: trusted }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => (body += chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}
