// Reverse proxy: api-test.reage.life -> ilxgodhosirhhkffqryw.supabase.co
// Минимальный, без лишней магии. Прокидывает любой путь как есть,
// raw body, аккуратные таймауты, понятный 502 при сбое апстрима.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import dns from 'node:dns';
import { lookup as dnsLookup } from 'node:dns/promises';
import { request as undiciRequest, Agent } from 'undici';

// IPv4-first, чтобы не тратить время на IPv6 если он не маршрутизируется
dns.setDefaultResultOrder('ipv4first');

const UPSTREAM_HOST = 'ilxgodhosirhhkffqryw.supabase.co';
const UPSTREAM_ORIGIN = `https://${UPSTREAM_HOST}`;
const PORT = Number(process.env.PORT) || 8080;
// 3 минуты: edge-функции с Gemini 2.5 Pro (parse-analysis-pdf, генерация
// отчёта и т.п.) могут отвечать дольше 30 секунд. Прокси не должен резать.
const REQUEST_TIMEOUT_MS = 180_000;

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'accept-encoding',
]);

const dispatcher = new Agent({
  connectTimeout: 10_000,
  headersTimeout: REQUEST_TIMEOUT_MS,
  bodyTimeout: REQUEST_TIMEOUT_MS,
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 30_000,
});

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  trustProxy: true,
  // 80 МБ — UI лимит 50 МБ; запас на multipart overhead и base64-обвязку.
  bodyLimit: 80 * 1024 * 1024,
});

await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  exposedHeaders: '*',
  allowedHeaders: '*',
});

// Любой контент-тайп -> сырой Buffer. Так POST /auth/v1/token доходит до GoTrue без переупаковки JSON.
app.removeAllContentTypeParsers();
app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => {
  done(null, body);
});

app.get('/healthz', async () => ({ ok: true, ts: Date.now() }));

app.get('/__diag', async () => {
  const out = { upstream: UPSTREAM_HOST, ts: Date.now() };
  try {
    const t0 = Date.now();
    const addr = await dnsLookup(UPSTREAM_HOST, { all: true });
    out.dns = { ok: true, ms: Date.now() - t0, addresses: addr };
  } catch (e) {
    out.dns = { ok: false, error: String(e?.message || e) };
  }
  try {
    const t0 = Date.now();
    const res = await undiciRequest(`${UPSTREAM_ORIGIN}/auth/v1/health`, {
      method: 'GET',
      dispatcher,
      headersTimeout: 8000,
      bodyTimeout: 8000,
    });
    const text = await res.body.text();
    out.https = { ok: true, ms: Date.now() - t0, status: res.statusCode, body: text.slice(0, 200) };
  } catch (e) {
    out.https = { ok: false, error: String(e?.message || e), code: e?.code, cause: String(e?.cause || '') };
  }
  return out;
});

app.all('/*', async (req, reply) => {
  const url = `${UPSTREAM_ORIGIN}${req.raw.url}`;
  const method = req.method.toUpperCase();

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    headers[k] = v;
  }
  headers['host'] = UPSTREAM_HOST;
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-for'] = req.ip;

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? (Buffer.isBuffer(req.body) ? req.body : (req.body ?? undefined)) : undefined;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await undiciRequest(url, {
      method,
      headers,
      body,
      dispatcher,
      signal: ac.signal,
      headersTimeout: REQUEST_TIMEOUT_MS,
      bodyTimeout: REQUEST_TIMEOUT_MS,
    });

    reply.code(upstream.statusCode);
    for (const [k, v] of Object.entries(upstream.headers)) {
      if (HOP_BY_HOP.has(k.toLowerCase())) continue;
      reply.header(k, v);
    }

    // Для SSE / chunked-ответов критично не буферизовать: иначе клиент не
    // получает промежуточные события (heartbeat, progress) и рвёт соединение
    // по idle-таймауту. Стримим апстрим напрямую в ответ.
    const ct = String(upstream.headers['content-type'] || '');
    const isStream =
      ct.includes('text/event-stream') ||
      String(upstream.headers['transfer-encoding'] || '').includes('chunked') ||
      String(upstream.headers['x-accel-buffering'] || '').toLowerCase() === 'no';

    if (isStream) {
      // Отключаем буферизацию upstream/nginx-подобных прокси перед нами
      reply.header('x-accel-buffering', 'no');
      reply.header('cache-control', upstream.headers['cache-control'] || 'no-cache, no-transform');
      return reply.send(upstream.body);
    }

    const buf = Buffer.from(await upstream.body.arrayBuffer());
    return reply.send(buf);

  } catch (e) {
    const aborted = ac.signal.aborted;
    req.log.error({ err: e, url, method }, 'upstream_error');
    return reply.code(502).send({
      error: 'bad_gateway',
      upstream: UPSTREAM_HOST,
      targetPath: req.raw.url,
      method,
      reason: aborted ? 'timeout' : 'fetch_error',
      message: String(e?.message || e),
      code: e?.code,
      cause: String(e?.cause || ''),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
  } finally {
    clearTimeout(timer);
  }
});

app.listen({ host: '0.0.0.0', port: PORT })
  .then(() => app.log.info(`proxy listening on :${PORT} -> ${UPSTREAM_ORIGIN}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
