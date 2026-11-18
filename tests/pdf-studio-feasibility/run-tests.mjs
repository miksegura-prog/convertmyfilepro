// run-tests.mjs — Orquesta la prueba de viabilidad de edición REAL de texto PDF.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFixtures } from './fixtures.mjs';
import { editPdf } from './engine.mjs';
import { extractPages } from './extract.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts');
fs.mkdirSync(ART, { recursive: true });

const norm = (s) => s.normalize('NFC').replace(/\s+/g, '');

// Métricas Helvetica para el respaldo geométrico del ancla de S5.
import { PDFDocument as PDFDocForMetrics, StandardFonts as SF } from 'pdf-lib';
const metricsDoc = await PDFDocForMetrics.create();
const helvMetrics = await metricsDoc.embedFont(SF.Helvetica);
const w12 = (s) => helvMetrics.widthOfTextAtSize(s, 12);


const SCENARIOS = [
  {
    id: 'S1 · Helvetica estándar (WinAnsi): español, reemplazo más largo y más corto',
    fixture: 'F1-simple-helvetica.pdf',
    edits: [
      { page: 0, find: 'zorro', replace: 'conejillo de indias' },
      { page: 0, find: '2026-001', replace: '2027-9' },
      { page: 0, find: '¡qué ilusión, corazón!', replace: '¡vaya lío, ñandú!' },
    ],
    removed: ['zorro', '2026-001', '¡qué ilusión, corazón!'],
    added: ['conejillo de indias', '2027-9', '¡vaya lío, ñandú!'],
    chars: ['ñ', 'á', 'é', 'í', 'ó', 'ú', '¡', '¿', 'º'],
    anchors: [],
  },
  {
    id: 'S2 · TTF embebida COMPLETA (Liberation Sans): sustitución real por glifos (más largo y más corto)',
    fixture: 'F2-embedded-full.pdf',
    edits: [
      { page: 0, find: 'rápido', replace: 'pausadamente' },
      { page: 0, find: '456', replace: '789012' },
    ],
    removed: ['rápido', '456'],
    added: ['pausadamente', '789012'],
    // Nota: "á" desaparece legítimamente (estaba solo dentro de "rápido") y "í" es
    // extraída como "i" incluso en el ORIGINAL (rareza del ToUnicode de pdf-lib).
    chars: ['ñ', 'Ñ', 'ó', 'ü'],
    anchors: [],
  },
  {
    id: 'S3 · TTF embebida SUBSET (Liberation Sans): reemplazo solo con glifos ya usados en el documento',
    fixture: 'F3-embedded-subset.pdf',
    edits: [{ page: 0, find: 'rápido', replace: 'ápidos' }],
    removed: ['rápido'],
    added: ['ápidos'],
    chars: ['ñ', 'Ñ'],
    anchors: [],
  },
  {
    id: 'S4 · TTF embebida SUBSET (Liberation Sans): glifos nuevos NO presentes (se espera fallo)',
    fixture: 'F3-embedded-subset.pdf',
    edits: [{ page: 0, find: '456', replace: '789012' }],
    removed: [],
    added: ['789012'],
    kept: ['456'],
    chars: [],
    anchors: [],
    expectedFail: true,
  },
  {
    id: 'S5 · PDF externo (no generado con pdf-lib): Tj + TJ con kerning, WinAnsi crudo',
    fixture: 'F4-foreign-minimal.pdf',
    edits: [
      { page: 0, find: 'mundo', replace: 'universo entero' },
      { page: 0, find: 'externo', replace: 'propio' },
      { page: 0, find: 'AV', replace: 'OV' },
    ],
    removed: ['mundo', 'externo', 'AV'],
    added: ['universo entero', 'propio', 'OV'],
    chars: ['ñ', '¡', '¿', '—'],
    anchors: [{ text: 'Kerning', fallbackX: () => 60 }],
  },
];

// Genera y escribe los fixtures en artifacts/
const FIXTURES = await buildFixtures(ART);
for (const [name, bytes] of Object.entries(FIXTURES)) {
  fs.writeFileSync(path.join(ART, name), bytes);
}

const results = [];

const dump = ['# Proxy visual: items de texto (str · x · y) original vs editado', ''];
const summary = [];

for (const sc of SCENARIOS) {
  const res = { id: sc.id, fixture: sc.fixture, checks: [], applied: null, verdict: '', ok: true, error: null };
  results.push(res);
  summary.push('');
  summary.push(`[${sc.id}]`);
  try {
    const src = fs.readFileSync(path.join(ART, sc.fixture));
    const orig = await extractPages(src);
    const log = (m) => console.log(`  ${m}`);
    const { bytes, applied } = await editPdf(src, sc.edits, log);
    res.applied = applied;
    fs.writeFileSync(path.join(ART, `out-${sc.fixture}`), bytes);
    const edited = await extractPages(bytes);

    const flat = (pp) => pp.map((pg) => pg.map((i) => i.str).join(' ')).join(' \n ');
    const fullE = norm(flat(edited));

    for (const f of sc.removed ?? []) {
      res.checks.push({ name: `texto antiguo ausente de la extracción: "${f}"`, ok: !fullE.includes(norm(f)) });
    }
    if (sc.expectedFail) {
      // El escenario espera que el motor RECHACE la sustitución: no se comprueba el texto
      // nuevo, se comprueba que la negativa sea explícita (error de glifo y 0 cambios).
      const refusal = (applied ?? []).some(
        (a) => a && a.count === 0 && typeof a.error === 'string' && /glifo no disponible/i.test(a.error),
      );
      res.checks.push({
        name: 'el motor rechaza la sustitución por glifos ausentes (error explícito, 0 cambios)',
        ok: refusal,
        detail: refusal ? '' : `\n    applied: ${JSON.stringify(applied)}`,
      });
    } else {
      for (const a of sc.added ?? []) {
        res.checks.push({ name: `texto nuevo presente y seleccionable: "${a}"`, ok: fullE.includes(norm(a)) });
      }
    }
    for (const k of sc.kept ?? []) {
      res.checks.push({ name: `texto original conservado (el motor se niega a romperlo): "${k}"`, ok: fullE.includes(norm(k)) });
    }
    for (const c of sc.chars ?? []) {
      res.checks.push({ name: `carácter español extraíble: "${c}"`, ok: fullE.includes(c) });
    }

    const subs = [...sc.edits.map((e) => e.find), ...sc.edits.map((e) => e.replace)].filter(Boolean);
    const stripSubs = (text) => subs.reduce((t, x) => t.split(x).join(''), text);
    // Comparación a nivel de TEXTO por página (inmune a cómo pdfjs fusione chunks).
    const resid = (pp) => JSON.stringify(pp.map((pg) => norm(stripSubs(pg.map((i) => i.str).join(' ')))));
    const same = resid(orig) === resid(edited);
    res.checks.push({
      name: 'resto del documento sin cambios (extracción)',
      ok: same,
      detail: same ? '' : `\n    orig: ${resid(orig)}\n    edit: ${resid(edited)}`,
    });

    for (const a of sc.anchors ?? []) {
      const findItem = (pp) => pp.flat().find((i) => norm(i.str).startsWith(norm(a.text)));
      const o = findItem(orig);
      const e = findItem(edited);
      let ok = false;
      let dxLabel = 'n/a';
      if (o && e) {
        const dx = e.x - o.x;
        dxLabel = dx.toFixed(2);
        ok = Math.abs(dx) < 1.5 && Math.abs(o.y - e.y) < 1.5;
      } else if (e && typeof a.fallbackX === 'function') {
        const dx = e.x - a.fallbackX();
        dxLabel = `vs teórico ${dx.toFixed(2)}`;
        ok = Math.abs(dx) < 3;
      }
      res.checks.push({
        name: `posición estable tras editar (ancla "${a.text}", Δx=${dxLabel})`,
        ok,
      });
    }

    const failed = res.checks.filter((c) => !c.ok);
    if (sc.expectedFail) {
      // Un escenario de fallo esperado SOLO es correcto si el motor se negó a aplicar el
      // cambio. Si aplica el texto nuevo, es una regresión (no un "éxito" del escenario).
      res.verdict = failed.length
        ? 'FALLO NO ESPERADO (el motor no rechazó los glifos ausentes)'
        : 'FALLO ESPERADO (limitación confirmada)';
      res.ok = !failed.length;
    } else {
      res.verdict = failed.length ? 'FALLO' : 'OK';
      res.ok = !failed.length;
    }

    dump.push('', `## ${sc.id}`, '— original:');
    orig.forEach((pg, i) => pg.forEach((it) => dump.push(`  p${i + 1} · x=${it.x.toFixed(1)} · y=${it.y.toFixed(1)} · ${JSON.stringify(it.str)}`)));
    dump.push('— editado:');
    edited.forEach((pg, i) => pg.forEach((it) => dump.push(`  p${i + 1} · x=${it.x.toFixed(1)} · y=${it.y.toFixed(1)} · ${JSON.stringify(it.str)}`)));
  } catch (err) {
    const msg = String((err && err.stack) || err);
    // El motor puede abortar (throw) en lugar de devolver `applied`: si es la negativa
    // conocida por glifos ausentes y el escenario lo esperaba, no es un error de la suite.
    const glyphRefusal = /glifo no disponible en la fuente embebida subset/i.test(msg);
    if (sc.expectedFail && glyphRefusal) {
      res.verdict = 'FALLO ESPERADO (limitación confirmada)';
      res.ok = true;
      res.error = msg;
      res.checks.push({ name: 'el motor aborta con error de glifo ausente (negativa explícita)', ok: true });
      summary.push('  (el motor abortó con error de glifo: negativa esperada)');
    } else {
      res.verdict = 'ERROR';
      res.ok = false;
      res.error = msg;
      summary.push(`ERROR: ${msg.split('\n')[0]}`);
    }
  }

  summary.push(`veredicto: ${res.verdict}`);
  if (res.applied) summary.push(`motor: ${JSON.stringify(res.applied)}`);
  for (const c of res.checks) summary.push(`  ${c.ok ? '✔' : '✘'} ${c.name}${c.detail || ''}`);
}

console.log('\n=== PRUEBA DE VIABILIDAD · EDICIÓN REAL DE TEXTO PDF (sin superposiciones) ===');
for (const line of summary) console.log(line);

const allOk = results.every((r) => r.ok);
console.log('\nResultado global:', allOk
  ? 'Todas las comprobaciones se comportaron según lo previsto.'
  : 'Hay comprobaciones con comportamiento no previsto (ver arriba).');
console.log('Artefactos en:', ART);

fs.writeFileSync(path.join(ART, 'results.txt'), summary.join('\n') + '\n');
fs.writeFileSync(path.join(ART, 'render-diff.txt'), dump.join('\n') + '\n');
process.exit(allOk ? 0 : 1);

