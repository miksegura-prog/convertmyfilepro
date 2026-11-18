/**
 * Pruebas automatizadas del modo OWNER BETA (experimental).
 *
 *   node tests/owner-beta/run-tests.mjs
 *
 * Cubre dos cosas que sí se pueden verificar sin navegador:
 *  1. Resolución del límite de subida por herramienta y modalidad.
 *  2. Seguridad de `GET /api/owner-status`: sin configuración no hay OWNER,
 *     y solo un JWT firmado por Cloudflare Access (RS256) con `aud`/`iss`/`exp`
 *     correctos devuelve `{ owner: true }`.
 *
 * Las pruebas de compresión real de vídeo requieren navegador: ver OWNER_BETA.md.
 */
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateKeyPairSync, sign } from 'node:crypto';
import { buildSync } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const tmpDir = path.join(here, '.tmp');

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const bundle = (entry, outfile) => {
  buildSync({
    entryPoints: [path.join(root, entry)],
    outfile: path.join(tmpDir, outfile),
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    logLevel: 'silent',
  });
  return pathToFileURL(path.join(tmpDir, outfile)).href;
};

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

/* ---------------------------- límites de subida --------------------------- */

const limitsUrl = bundle('src/config/uploadLimits.ts', 'uploadLimits.mjs');
const plansUrl = bundle('src/config/plans.ts', 'plans.mjs');
const { resolveUploadMaxSizeMB } = await import(limitsUrl);
const plans = await import(plansUrl);

const VIDEO_CONFIG = { maxSizeMB: plans.PRO_FILE_SIZE_MB, ownerMaxSizeMB: plans.OWNER_VIDEO_MB };

await check('Free mantiene 25 MB en vídeo', () => {
  const mb = resolveUploadMaxSizeMB(VIDEO_CONFIG, {
    isOwnerBeta: false,
    hasProAccess: false,
    freeMaxSizeMB: plans.FREE_VIDEO_MB,
  });
  assert.equal(mb, 25);
});

await check('PRO mantiene 50 MB en vídeo', () => {
  const mb = resolveUploadMaxSizeMB(VIDEO_CONFIG, {
    isOwnerBeta: false,
    hasProAccess: true,
    freeMaxSizeMB: plans.FREE_VIDEO_MB,
  });
  assert.equal(mb, 50);
});

await check('OWNER BETA obtiene 200 MB en vídeo', () => {
  const mb = resolveUploadMaxSizeMB(VIDEO_CONFIG, {
    isOwnerBeta: true,
    hasProAccess: true,
    freeMaxSizeMB: plans.FREE_VIDEO_MB,
  });
  assert.equal(mb, 200);
});

await check('OWNER no eleva el límite global de otras herramientas', () => {
  const mb = resolveUploadMaxSizeMB(undefined, {
    isOwnerBeta: true,
    hasProAccess: true,
    freeMaxSizeMB: undefined,
  });
  assert.equal(mb, 50);
});

await check('Sin OWNER, ownerMaxSizeMB no se aplica a Free ni PRO', () => {
  const free = resolveUploadMaxSizeMB(VIDEO_CONFIG, {
    isOwnerBeta: false,
    hasProAccess: false,
    freeMaxSizeMB: undefined,
  });
  const pro = resolveUploadMaxSizeMB(VIDEO_CONFIG, {
    isOwnerBeta: false,
    hasProAccess: true,
    freeMaxSizeMB: undefined,
  });
  assert.equal(free, 50);
  assert.equal(pro, 50);
});


/* ------------------------- /api/owner-status (Worker) --------------------- */

const workerUrl = bundle('src/worker.ts', 'worker.mjs');
const worker = (await import(workerUrl)).default;

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-kid';
const TEAM_DOMAIN = 'owner-test.cloudflareaccess.com';
const AUDIENCE = 'test-aud-123';
const OWNER_EMAIL = 'owner@example.com';

const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };

// Mock de red: solo responde al endpoint de certificados de Cloudflare Access.
globalThis.fetch = async (input) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`) {
    return new Response(JSON.stringify({ keys: [jwk] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response('not found', { status: 404 });
};

const b64url = (value) => Buffer.from(value).toString('base64url');

const makeJwt = (overrides = {}, { tamper = false } = {}) => {
  const header = { alg: 'RS256', typ: 'JWT', kid: KID };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    aud: AUDIENCE,
    iss: `https://${TEAM_DOMAIN}`,
    email: OWNER_EMAIL,
    iat: nowSeconds,
    exp: nowSeconds + 600,
    ...overrides,
  };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url');
  return tamper ? `${data}.${b64url('tampered-signature')}` : `${data}.${signature}`;
};

const baseEnv = {
  STRIPE_SECRET_KEY: 'unused',
  ASSETS: { fetch: async () => new Response('assets') },
  OWNER_BETA_ENABLED: 'true',
  OWNER_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  OWNER_ACCESS_AUD: AUDIENCE,
  OWNER_EMAILS: OWNER_EMAIL,
};

const callOwner = async (env, token, method = 'GET') => {
  const headers = token ? { 'Cf-Access-Jwt-Assertion': token } : {};
  const request = new Request('https://preview.example.com/api/owner-status', { method, headers });
  const response = await worker.fetch(request, env);
  const body = await response.json();
  return { status: response.status, body };
};

await check('Sin variables OWNER_* el endpoint responde 404 owner:false', async () => {
  const { status, body } = await callOwner(
    { STRIPE_SECRET_KEY: 'x', ASSETS: baseEnv.ASSETS },
    makeJwt()
  );
  assert.equal(status, 404);
  assert.equal(body.owner, false);
});

await check('OWNER_BETA_ENABLED distinto de true no habilita OWNER', async () => {
  const { status, body } = await callOwner({ ...baseEnv, OWNER_BETA_ENABLED: '1' }, makeJwt());
  assert.equal(status, 404);
  assert.equal(body.owner, false);
});

await check('Sin cabecera Cf-Access-Jwt-Assertion → 401', async () => {
  const { status, body } = await callOwner(baseEnv, null);
  assert.equal(status, 401);
  assert.equal(body.owner, false);
});

await check('JWT válido de Access → owner:true', async () => {
  const { status, body } = await callOwner(baseEnv, makeJwt());
  assert.equal(status, 200);
  assert.equal(body.owner, true);
  assert.equal(body.email, OWNER_EMAIL);
});

await check('JWT con firma manipulada → 403', async () => {
  const { status, body } = await callOwner(baseEnv, makeJwt({}, { tamper: true }));
  assert.equal(status, 403);
  assert.equal(body.owner, false);
});

await check('JWT con aud incorrecto → 403', async () => {
  const { status, body } = await callOwner(baseEnv, makeJwt({ aud: 'otra-app' }));
  assert.equal(status, 403);
  assert.equal(body.owner, false);
});

await check('JWT con iss incorrecto → 403', async () => {
  const { status, body } = await callOwner(baseEnv, makeJwt({ iss: 'https://evil.example.com' }));
  assert.equal(status, 403);
  assert.equal(body.owner, false);
});

await check('JWT caducado → 403', async () => {
  const past = Math.floor(Date.now() / 1000) - 3600;
  const { status, body } = await callOwner(baseEnv, makeJwt({ iat: past, exp: past + 60 }));
  assert.equal(status, 403);
  assert.equal(body.owner, false);
});

await check('Identidad fuera de OWNER_EMAILS → 403', async () => {
  const { status, body } = await callOwner(baseEnv, makeJwt({ email: 'intruso@example.com' }));
  assert.equal(status, 403);
  assert.equal(body.owner, false);
});

await check('Método POST → 405', async () => {
  const { status, body } = await callOwner(baseEnv, makeJwt(), 'POST');
  assert.equal(status, 405);
  assert.equal(body.owner, false);
});

/* --------------------------------- informe -------------------------------- */

let failures = 0;
for (const result of results) {
  if (result.ok) {
    console.log(`PASS  ${result.name}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${result.name}\n      ${result.error}`);
  }
}

rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${results.length - failures}/${results.length} pruebas correctas.`);
process.exitCode = failures === 0 ? 0 : 1;
