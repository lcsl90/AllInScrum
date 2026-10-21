import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import sirv from 'sirv';

export interface HttpServerOptions {
  /** Verzeichnis mit dem gebauten Frontend (index.html + assets). */
  readonly staticDir: string;
  /** Zertifikat und Schlüssel (PEM) – dann spricht der Server HTTPS, sonst HTTP. */
  readonly tls?: TlsCredentials | undefined;
}

export interface TlsCredentials {
  readonly cert: Buffer;
  readonly key: Buffer;
}

/** Server für Healthcheck und Frontend. Socket.IO hängt sich zusätzlich an diesen Server. */
export function createHttpServer(options: HttpServerOptions): Server {
  const serveApp = createAppHandler(options.staticDir);

  const handle: RequestHandler = (request, response) => {
    if (request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    serveApp(request, response);
  };

  return options.tls ? createHttpsServer(options.tls, handle) : createServer(handle);
}

type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void;

/** Im Entwicklungsmodus gibt es kein gebautes Frontend – dann liefert Vite aus und wir antworten 404. */
function createAppHandler(staticDir: string): RequestHandler {
  if (!existsSync(staticDir)) {
    return (_request, response) => {
      response.writeHead(404).end();
    };
  }
  return sirv(staticDir, {
    // Unbekannte Pfade (z. B. geteilte Links /s/<id>) liefern die Single-Page-App aus.
    single: true,
    etag: true,
    setHeaders: setCacheHeaders,
  });
}

/** Gehashte Assets dürfen ewig gecacht werden, index.html nie – sonst fehlen neue Versionen. */
function setCacheHeaders(response: ServerResponse, pathname: string): void {
  const cacheControl = pathname.startsWith('/assets/')
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  response.setHeader('cache-control', cacheControl);
}
