// engine.mjs — Motor de edición REAL de texto PDF (v2 · runs de texto).
// Estrategia: tokenizar el content stream, agrupar las mostraciones (Tj/TJ) en
// "runs" contiguos por línea y fuente, decodificar cada run con la codificación
// ORIGINAL de su fuente (ToUnicode del documento, WinAnsi o MacRoman), buscar el
// texto del usuario en el run (incluso si la palabra está fragmentada en varios
// operadores y objetos) y re-escribir el run con el nuevo texto en los MISMOS
// códigos de glifo, compensando el ancho con un número TJ final para no desplazar
// el resto de la línea. No usa rectángulos blancos ni superposiciones.
import {
  PDFDocument, PDFName, PDFArray, PDFRawStream, PDFNumber,
  StandardFonts, decodePDFRawStream,
} from 'pdf-lib';
import { createRequire } from 'node:module';

// @pdf-lib/fontkit se instaló con --no-save (solo para esta prueba; no está en package.json).
const reqFromHere = createRequire(import.meta.url);
const fontkit = reqFromHere('@pdf-lib/fontkit');

/* ---------------- WinAnsi ---------------- */
const SPECIALS = {
  0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026',
  0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160',
  0x8B: '\u2039', 0x8C: '\u0152', 0x8E: '\u017D', 0x91: '\u2018', 0x92: '\u2019',
  0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153',
  0x9E: '\u017E', 0x9F: '\u0178',
};
const SPECIALS_REV = new Map(Object.entries(SPECIALS).map(([b, ch]) => [ch, Number(b)]));

export function winAnsiEncode(str) {
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (SPECIALS_REV.has(ch)) out.push(SPECIALS_REV.get(ch));
    else if (c >= 0xA0 && c <= 0xFF) out.push(c);
    else throw new Error(`Carácter no representable en WinAnsi: U+${c.toString(16)}`);
  }
  return Uint8Array.from(out);
}

export function winAnsiDecode(bytes) {
  let s = '';
  for (const b of bytes) s += b < 0x80 ? String.fromCharCode(b) : (SPECIALS[b] ?? String.fromCharCode(b));
  return s;
}

/* ---------------- MacRoman (fuentes simples con /MacRomanEncoding) ---------------- */
const MACROMAN = new Map(Object.entries({
  '80': '\u00C4', '81': '\u00C5', '82': '\u00C7', '83': '\u00C9', '84': '\u00D1', '85': '\u00D6',
  '86': '\u00DC', '87': '\u00E1', '88': '\u00E0', '89': '\u00E2', '8A': '\u00E4', '8B': '\u00E3',
  '8C': '\u00E5', '8D': '\u00E7', '8E': '\u00E9', '8F': '\u00E8', '90': '\u00EA', '91': '\u00EB',
  '92': '\u00ED', '93': '\u00EC', '94': '\u00EE', '95': '\u00EF', '96': '\u00F1', '97': '\u00F3',
  '98': '\u00F2', '99': '\u00F4', '9A': '\u00F6', '9B': '\u00F5', '9C': '\u00FA', '9D': '\u00F9',
  '9E': '\u00FB', '9F': '\u00FC', 'A0': '\u2020', 'A1': '\u00B0', 'A2': '\u00A2', 'A3': '\u00A3',
  'A4': '\u00A7', 'A5': '\u2022', 'A6': '\u00B6', 'A7': '\u00DF', 'A8': '\u00AE', 'A9': '\u00A9',
  'AA': '\u2122', 'AB': '\u00B4', 'AC': '\u00A8', 'AD': '\u2260', 'AE': '\u00C6', 'AF': '\u00D8',
  'B0': '\u221E', 'B1': '\u00B1', 'B2': '\u2264', 'B3': '\u2265', 'B4': '\u00A5', 'B5': '\u00B5',
  'B6': '\u2202', 'B7': '\u2211', 'B8': '\u220F', 'B9': '\u03C0', 'BA': '\u222B', 'BB': '\u00AA',
  'BC': '\u00BA', 'BD': '\u03A9', 'BE': '\u00E6', 'BF': '\u00F8', 'C0': '\u00BF', 'C1': '\u00A1',
  'C2': '\u00AC', 'C3': '\u221A', 'C4': '\u0192', 'C5': '\u2248', 'C6': '\u2206', 'C7': '\u00AB',
  'C8': '\u00BB', 'C9': '\u2026', 'CA': '\u00A0', 'CB': '\u00C0', 'CC': '\u00C3', 'CD': '\u00D5',
  'CE': '\u0152', 'CF': '\u0153', 'D0': '\u2013', 'D1': '\u2014', 'D2': '\u201C', 'D3': '\u201D',
  'D4': '\u2018', 'D5': '\u2019', 'D6': '\u00F7', 'D7': '\u25CA', 'D8': '\u00FF', 'D9': '\u0178',
  'DA': '\u2044', 'DB': '\u20AC', 'DC': '\u2039', 'DD': '\u203A', 'DE': '\uFB01', 'DF': '\uFB02',
  'E0': '\u2021', 'E1': '\u00B7', 'E2': '\u201A', 'E3': '\u201E', 'E4': '\u2030', 'E5': '\u00C2',
  'E6': '\u00CA', 'E7': '\u00C1', 'E8': '\u00CB', 'E9': '\u00C8', 'EA': '\u00CD', 'EB': '\u00CE',
  'EC': '\u00CF', 'ED': '\u00CC', 'EE': '\u00D3', 'EF': '\u00D4', 'F0': '\uF8FF', 'F1': '\u00D2',
  'F2': '\u00DA', 'F3': '\u00DB', 'F4': '\u00D9', 'F5': '\u0131', 'F6': '\u02C6', 'F7': '\u02DC',
  'F8': '\u00AF', 'F9': '\u02D8', 'FA': '\u02D9', 'FB': '\u02DA', 'FC': '\u00B8', 'FD': '\u02DD',
  'FE': '\u02DB', 'FF': '\u02C7',
}));
const MACROMAN_REV = new Map();
for (const [b, ch] of MACROMAN) if (!MACROMAN_REV.has(ch)) MACROMAN_REV.set(ch, parseInt(b, 16));

function macromanEncode(str) {
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (MACROMAN_REV.has(ch)) out.push(MACROMAN_REV.get(ch));
    else throw new Error(`Carácter no representable en MacRoman: U+${c.toString(16)}`);
  }
  return Uint8Array.from(out);
}
function macromanDecode(bytes) {
  let s = '';
  for (const b of bytes) s += b < 0x80 ? String.fromCharCode(b) : (MACROMAN.get(b.toString(16).toUpperCase()) ?? String.fromCharCode(b));
  return s;
}

/* ---------------- bytes / hex / cadenas PDF ---------------- */
const bytesToHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();

function escapePdfString(bytes) {
  let out = '(';
  for (const b of bytes) {
    if (b === 40 || b === 41 || b === 92) out += '\\' + String.fromCharCode(b);
    else if (b === 10) out += '\\n';
    else if (b === 13) out += '\\r';
    else if (b === 9) out += '\\t';
    else out += String.fromCharCode(b);
  }
  return out + ')';
}

const fmtNum = (n) => {
  const r = Math.round(n * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
};

/* ---------------- tokenizador de content stream ---------------- */
const NUM_RE = /^-?\d*\.?\d+(?:[eE][-+]?\d+)?/;
const OP_NAME_RE = /^[A-Za-z]+\*?/;

function scanString(content, i) {
  const out = [];
  let k = i + 1;
  let depth = 1;
  while (k < content.length) {
    const c = content[k];
    if (c === '\\') { const e = escByte(content, k); out.push(e.byte); k = e.next; continue; }
    if (c === '(') { depth++; out.push(40); k++; continue; }
    if (c === ')') { depth--; if (depth === 0) { k++; break; } out.push(41); k++; continue; }
    out.push(content.charCodeAt(k)); k++;
  }
  return { bytes: Uint8Array.from(out), end: k };
}

function escByte(content, i) {
  const c0 = content[i + 1];
  let value;
  let next;
  switch (c0) {
    case 'n': value = 10; next = i + 2; break;
    case 'r': value = 13; next = i + 2; break;
    case 't': value = 9; next = i + 2; break;
    case 'b': value = 8; next = i + 2; break;
    case 'f': value = 12; next = i + 2; break;
    case '(': value = 40; next = i + 2; break;
    case ')': value = 41; next = i + 2; break;
    case '\\': value = 92; next = i + 2; break;
    default:
      if (c0 && /[0-7]/.test(c0)) {
        let oct = c0;
        let k = i + 2;
        while (oct.length < 3 && content[k] && /[0-7]/.test(content[k])) { oct += content[k]; k++; }
        value = parseInt(oct, 8) & 0xFF;
        next = k;
      } else {
        value = (c0 || '').charCodeAt(0) & 0xFF;
        next = i + 2;
      }
  }
  return { byte: value, next };
}

function scanHex(content, i) {
  let hex = '';
  let k = i + 1;
  while (k < content.length && content[k] !== '>') {
    const c = content[k];
    if (/[0-9A-Fa-f]/.test(c)) hex += c;
    k++;
  }
  if (content[k] === '>') k++;
  if (hex.length % 2) hex = hex.slice(0, -1);
  const bytes = new Uint8Array(hex.length / 2);
  for (let n = 0; n < bytes.length; n++) bytes[n] = parseInt(hex.substr(n * 2, 2), 16);
  return { bytes, end: k };
}

function tokenizeContent(content) {
  const toks = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    const ch = content[i];
    if (ch === '%') {
      while (i < n && content[i] !== '\n' && content[i] !== '\r') i++;
      continue;
    }
    if (/[ \t\r\n\f]/.test(ch)) { i++; continue; }
    if (ch === '(') {
      const s = scanString(content, i);
      toks.push({ t: 'str', start: i, end: s.end, bytes: s.bytes });
      i = s.end;
      continue;
    }
    if (ch === '<' && content[i + 1] !== '<') {
      const s = scanHex(content, i);
      toks.push({ t: 'hex', start: i, end: s.end, bytes: s.bytes });
      i = s.end;
      continue;
    }
    if (ch === '/') {
      const start = i; i++;
      while (i < n && !/[ \t\r\n\f()<>\[\]%]/.test(content[i] ?? '')) i++;
      toks.push({ t: 'name', start, end: i, value: content.slice(start + 1, i) });
      continue;
    }
    if (ch === '[') {
      const start = i; i++;
      const items = [];
      while (i < n) {
        const c = content[i];
        if (c === ']') { i++; break; }
        if (/[ \t\r\n\f]/.test(c)) { i++; continue; }
        if (c === '(') {
          const s = scanString(content, i);
          items.push({ t: 'str', bytes: s.bytes });
          i = s.end;
          continue;
        }
        if (c === '<') {
          const s = scanHex(content, i);
          items.push({ t: 'hex', bytes: s.bytes });
          i = s.end;
          continue;
        }
        const mm = content.slice(i).match(NUM_RE);
        if (mm) { items.push({ t: 'num', v: parseFloat(mm[0]) }); i += mm[0].length; continue; }
        i++;
      }
      toks.push({ t: 'arr', start, end: i, items });
      continue;
    }
    const mm = content.slice(i).match(OP_NAME_RE);
    if (mm) {
      toks.push({ t: 'op', start: i, end: i + mm[0].length, value: mm[0] });
      i += mm[0].length;
      continue;
    }
    const mm2 = content.slice(i).match(NUM_RE);
    if (mm2) {
      toks.push({ t: 'num', start: i, end: i + mm2[0].length, v: parseFloat(mm2[0]) });
      i += mm2[0].length;
      continue;
    }
    i++;
  }
  return toks;
}

/* ---------------- streams ---------------- */
function streamBytes(stream) {
  if (stream instanceof PDFRawStream) {
    const filter = stream.dict ? stream.dict.get(PDFName.of('Filter')) : null;
    const raw = stream.contents ?? (typeof stream.getContents === 'function' ? stream.getContents() : null);
    if (!filter) return raw instanceof Uint8Array ? raw : new Uint8Array(Buffer.from(String(raw ?? ''), 'latin1'));
    const dec = decodePDFRawStream(stream).decode();
    return dec instanceof Uint8Array ? dec : new Uint8Array(Buffer.from(String(dec), 'latin1'));
  }
  if (typeof stream.getContentsString === 'function') {
    return new Uint8Array(Buffer.from(stream.getContentsString(), 'latin1'));
  }
  if (typeof stream.getContents === 'function') {
    const c = stream.getContents();
    return typeof c === 'string' ? new Uint8Array(Buffer.from(c, 'latin1')) : new Uint8Array(c);
  }
  throw new Error('Tipo de stream no soportado: ' + (stream && stream.constructor && stream.constructor.name));
}

function contentRefs(page) {
  const node = page.node;
  const v = node.get(PDFName.of('Contents'));
  if (!v) return [];
  if (v instanceof PDFArray) return v.asArray();
  return [v];
}

function writeBack(ctx, ref, stream, content) {
  const bytes = Buffer.from(content, 'latin1');
  const dict = stream.dict;
  dict.set(PDFName.of('Length'), PDFNumber.of(bytes.length));
  dict.delete(PDFName.of('Filter')); // se guarda sin comprimir para simplificar la prueba
  ctx.assign(ref, PDFRawStream.of(dict, bytes));
}

/* ---------------- fuentes: nombres y tablas ---------------- */
const STANDARD_KEY = {
  'Helvetica': 'Helvetica', 'Helvetica-Bold': 'HelveticaBold',
  'Helvetica-Oblique': 'HelveticaOblique', 'Helvetica-BoldOblique': 'HelveticaBoldOblique',
  'Times-Roman': 'TimesRoman', 'Times-Bold': 'TimesBold', 'Times-Italic': 'TimesItalic',
  'Times-BoldItalic': 'TimesBoldItalic', 'Courier': 'Courier', 'Courier-Bold': 'CourierBold',
  'Courier-Oblique': 'CourierOblique', 'Courier-BoldOblique': 'CourierBoldOblique',
  'Symbol': 'Symbol', 'ZapfDingbats': 'ZapfDingbats',
};

function nameOf(obj) {
  if (!obj) return '';
  if (typeof obj.code === 'string') return obj.code;
  const s = typeof obj.asString === 'function' ? obj.asString() : String(obj);
  return s.replace(/^\//, '');
}

const utf16FromHex = (hex) => {
  let s = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCodePoint(parseInt(hex.substr(i, 4), 16));
  return s;
};

function parseToUnicode(text) {
  const g2u = new Map();
  let m;
  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((m = bfcharRe.exec(text))) {
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g;
    let p;
    while ((p = pairRe.exec(m[1]))) {
      if (!g2u.has(parseInt(p[1], 16))) g2u.set(parseInt(p[1], 16), utf16FromHex(p[2]));
    }
  }
  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = bfrangeRe.exec(text))) {
    const re3 = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p;
    while ((p = re3.exec(m[1]))) {
      const a = parseInt(p[1], 16);
      const b = parseInt(p[2], 16);
      const d = parseInt(p[3], 16);
      for (let g = a; g <= b; g++) if (!g2u.has(g)) g2u.set(g, String.fromCodePoint(d + (g - a)));
    }
    const reArr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]*)\]/g;
    let q;
    while ((q = reArr.exec(m[1]))) {
      const a = parseInt(q[1], 16);
      const b = parseInt(q[2], 16);
      const dsts = q[3].match(/<([0-9A-Fa-f]+)>/g) ?? [];
      for (let g = a, i = 0; g <= b && i < dsts.length; g++, i++) {
        if (!g2u.has(g)) g2u.set(g, utf16FromHex(dsts[i].slice(1, -1)));
      }
    }
  }
  return g2u;
}

// Parsea /Widths simple (FirstChar..) y devuelve Map código→unidades.
function parseSimpleWidths(fdict, ctx) {
  const first = fdict.get(PDFName.of('FirstChar'))?.asNumber?.() ?? 0;
  const map = new Map();
  const wRef = fdict.get(PDFName.of('Widths'));
  if (!wRef) return map;
  try {
    const arr = ctx.lookup(wRef);
    arr.asArray().forEach((e, i) => {
      const w = ctx.lookup(e).asNumber?.();
      if (typeof w === 'number') map.set(first + i, w);
    });
  } catch { /* mapa vacío */ }
  return map;
}

// Codificador CID (Type0): invierte ToUnicode (unicode→CID) y usa /W + /DW del
// descendiente para medir. Solo admite glifos presentes en el subset.
function buildCidEncoderFromTables(fdict, dfd, ctx, base) {
  const res = (v) => (!v ? null : (typeof v.asNumber === 'function' || typeof v.asArray === 'function' ? v : ctx.lookup(v)));
  const tu = res(fdict.get(PDFName.of('ToUnicode')));
  if (!tu) return null;
  const text = Buffer.from(streamBytes(tu)).toString('latin1');
  const g2u = parseToUnicode(text);
  const u2g = new Map();
  // El ancho del código se deduce del CMap (/Encoding): Identity-H/-V y otros
  // CMap de 2+ bytes → 2; encodings de 1 byte (WinAnsi…) → 1.
  const encNm = (fdict.get(PDFName.of('Encoding'))?.asString?.()) ?? (fdict.get(PDFName.of('Encoding'))?.code ?? '');
  let codeWidth = /Identity|^Uni|GB|CNS|JIS|KSC|-H$|-V$/.test(encNm) ? 2 : 1;
  if (codeWidth === 1) {
    for (const g of g2u.keys()) { if (g > 0xFF) { codeWidth = 2; break; } }
  }
  for (const [g, s] of g2u) if (!u2g.has(s)) u2g.set(s, g);
  if (!u2g.size) return null;

  let dw = 1000;
  const dwNum = res(dfd.get(PDFName.of('DW')))?.asNumber?.();
  if (typeof dwNum === 'number' && dwNum > 0) dw = dwNum;
  const widths = new Map();
  const wVal = res(dfd.get(PDFName.of('W')));
  if (wVal && typeof wVal.asArray === 'function') {
    const els = wVal.asArray().map((e) => res(e));
    for (let i = 0; i < els.length;) {
      const a = els[i]?.asNumber?.();
      if (a == null) { i++; continue; }
      const second = res(els[i + 1]);
      if (second && typeof second.asArray === 'function') {
        second.asArray().forEach((e, k) => {
          const w = res(e)?.asNumber?.();
          if (typeof w === 'number') widths.set(a + k, w);
        });
        i += 2;
      } else {
        const b = second?.asNumber?.();
        const w = res(els[i + 2])?.asNumber?.();
        if (b != null && w != null) {
          for (let g = a; g <= b; g++) widths.set(g, w);
          i += 3;
        } else i++;
      }
    }
  }
  const glyphWidth = (g) => (typeof g === 'number' ? (widths.get(g) ?? dw) : dw);
  const codeBytes = (g) => (codeWidth === 1 ? [g & 0xFF] : [(g >> 8) & 0xFF, g & 0xFF]);
  const decode = (bytes) => {
    let s = '';
    const bw = codeWidth;
    for (let i = 0; i + bw <= bytes.length; i += bw) {
      const g = bw === 1 ? bytes[i] : ((bytes[i] << 8) | bytes[i + 1]);
      s += g2u.get(g) ?? '\uFFFD';
    }
    return s;
  };
  return {
    custom: true,
    codeWidth,
    base,
    decode,
    encode: (str) => {
      const out = [];
      for (const ch of str) {
        const g = u2g.get(ch);
        if (g === undefined) throw new Error(`glifo no disponible en la fuente embebida subset: "${ch}"`);
        out.push(...codeBytes(g));
      }
      return Uint8Array.from(out);
    },
    widthUnits1000: (str) => {
      let units = 0;
      for (const ch of str) {
        const g = u2g.get(ch);
        units += typeof g === 'number' ? glyphWidth(g) : dw;
      }
      return units;
    },
    width: (str, size) => {
      let units = 0;
      for (const ch of str) {
        const g = u2g.get(ch);
        units += typeof g === 'number' ? glyphWidth(g) : dw;
      }
      return (units * size) / 1000;
    },
  };
}

// Codificador para fuentes SIMPLES (Type1 / TrueType de 1 byte): respeta la
// codificación ORIGINAL del documento (ToUnicode, MacRoman o WinAnsi) para que los
// bytes re-escritos sigan siendo válidos para la fuente del PDF. Si `fk` trae el
// programa embebido (FontFile2), valida que los glifos existan en el subset y usa
// sus avances reales cuando /Widths falte o valga 0.
function buildSimpleEncoder(fdict, ctx, base, stdFont, fk, log) {
  const encObj = fdict.get(PDFName.of('Encoding'));
  let encName = '';
  if (encObj && typeof encObj.asString === 'function') encName = encObj.asString();
  else if (encObj && typeof encObj.code === 'string') encName = encObj.code;
  else if (encObj) encName = 'dict';

  let g2u = null;
  let codeWidth = 1;
  const tuRef = fdict.get(PDFName.of('ToUnicode'));
  if (tuRef) {
    try {
      const tu = ctx.lookup(tuRef);
      const text = Buffer.from(streamBytes(tu)).toString('latin1');
      g2u = parseToUnicode(text);
      for (const g of g2u.keys()) { if (g > 0xFF) { codeWidth = 2; break; } }
    } catch (err) {
      log(`  [!] ToUnicode ilegible de "${base}": ${String((err && err.message) || err).slice(0, 60)}`);
    }
  }
  const widthsByCode = parseSimpleWidths(fdict, ctx);

  const decodeFn = g2u
    ? (bytes) => {
        let s = '';
        const bw = codeWidth;
        for (let i = 0; i + bw <= bytes.length; i += bw) {
          const g = bw === 1 ? bytes[i] : ((bytes[i] << 8) | bytes[i + 1]);
          s += g2u.get(g) ?? (bw === 1 && bytes[i] >= 32 && bytes[i] < 127 ? String.fromCharCode(bytes[i]) : '\uFFFD');
        }
        return s;
      }
    : (encName.includes('MacRoman') ? macromanDecode : winAnsiDecode);

  const encodeFn = g2u
    ? (str) => {
        const u2g = new Map();
        for (const [g, s] of g2u) if (!u2g.has(s)) u2g.set(s, g);
        const out = [];
        for (const ch of str) {
          const g = u2g.get(ch);
          if (g === undefined) throw new Error(`glifo no disponible en la fuente embebida: "${ch}"`);
          if (codeWidth === 1) out.push(g & 0xFF);
          else out.push((g >> 8) & 0xFF, g & 0xFF);
        }
        return Uint8Array.from(out);
      }
    : (str) => {
        const enc = encName.includes('MacRoman') ? macromanEncode : winAnsiEncode;
        const bytes = enc(str);
        if (fk) {
          for (const ch of str) {
            const cp = ch === ' ' ? 32 : ch.codePointAt(0);
            const g = fk.glyphForCodePoint(cp);
            const ok = (g && g.id !== undefined && g.id !== 0) || (cp >= 32 && cp < 127 && fk.cmap && fk.cmap.get?.(cp));
            if (!ok) throw new Error(`glifo no disponible en la fuente embebida subset: "${ch}"`);
          }
        }
        return bytes;
      };

  const fkGlyphW = (cp) => {
    if (!fk) return null;
    try {
      const g = fk.glyphForCodePoint(cp);
      if (g && typeof g.advanceWidth === 'number' && g.id !== 0) return g.advanceWidth;
    } catch { /* noop */ }
    return null;
  };

  const widthUnits1000 = (str) => {
    try {
      const bytes = encodeFn(str);
      const bw = codeWidth;
      let units = 0;
      let usedFk = false;
      for (let i = 0; i + bw <= bytes.length; i += bw) {
        const g = bw === 1 ? bytes[i] : ((bytes[i] << 8) | bytes[i + 1]);
        let w = widthsByCode.get(g) ?? 0;
        if (!w || !isFinite(w)) w = fkGlyphW(g) ?? 0;
        if (!w) w = 500;
        units += w;
      }
      if (!g2u) usedFk = true; // (solo informativo)
      return units;
    } catch { /* cae al estándar */ }
    if (stdFont) {
      try {
        const u = stdFont.widthOfTextAtSize(str, 1000);
        if (u > 0) return u;
      } catch { /* por defecto */ }
    }
    return str.length * 500;
  };

  return {
    custom: false,
    codeWidth,
    base,
    encName: encName || (g2u ? `ToUnicode(${codeWidth}B)` : 'WinAnsi'),
    decode: decodeFn,
    encode: encodeFn,
    widthUnits1000,
    width: (str, size) => (widthUnits1000(str) * size) / 1000,
  };
}

async function buildPageEncoders(doc, page, scratch, scratchFonts, log) {
  const encoders = {};
  const ctx = page.node.context;
  let res = null;
  let node = page.node;
  for (let hop = 0; hop < 6 && node; hop++) {
    const r = node.get(PDFName.of('Resources'));
    if (r) { res = ctx.lookup(r); break; }
    const parent = node.get(PDFName.of('Parent'));
    node = parent ? ctx.lookup(parent) : null;
  }
  if (!res || typeof res.get !== 'function') return encoders;
  const fval = res.get(PDFName.of('Font'));
  const fonts = fval ? ctx.lookup(fval) : null;
  if (!fonts || typeof fonts.entries !== 'function') return encoders;

  for (const [k, fr] of fonts.entries()) {
    const fname = nameOf(k);
    const fdict = ctx.lookup(fr);
    if (!fdict || typeof fdict.get !== 'function') continue;
    const subtype = nameOf(fdict.get(PDFName.of('Subtype')));
    const baseRaw = nameOf(fdict.get(PDFName.of('BaseFont')));
    const base = baseRaw.replace(/^[A-Z]{6}\+/, '');

    if (subtype === 'Type0') {
      const dfRef = fdict.get(PDFName.of('DescendantFonts'));
      const df = dfRef ? ctx.lookup(dfRef) : null;
      const first = df && typeof df.asArray === 'function' ? df.asArray()[0] : null;
      const dfd = first ? ctx.lookup(first) : null;
      const enc = buildCidEncoderFromTables(fdict, dfd, ctx, base);
      if (enc) encoders[fname] = enc;
      else log(`  [!] Type0 "${base}": sin ToUnicode utilizable → no editable de forma nativa`);
    } else if (subtype === 'Type1' || subtype === 'TrueType') {
      const key = STANDARD_KEY[base];
      const stdKey = key ?? 'Helvetica';
      let sf = scratchFonts.get(stdKey);
      if (!sf) { sf = await scratch.embedFont(StandardFonts[stdKey]); scratchFonts.set(stdKey, sf); }
      // Programa embebido para validar glifos y leer avances reales (FontFile2/3).
      let fk = null;
      try {
        const fdrRef = fdict.get(PDFName.of('FontDescriptor'));
        const fdr = fdrRef ? ctx.lookup(fdrRef) : null;
        const ffRef = fdr ? fdr.get(PDFName.of('FontFile2')) ?? fdr.get(PDFName.of('FontFile3')) : null;
        if (ffRef) {
          const st = ctx.lookup(ffRef);
          const raw = decodePDFRawStream(st).decode();
          fk = await fontkit.create(raw);
        }
      } catch { /* sin validación de glifos */ }
      encoders[fname] = buildSimpleEncoder(fdict, ctx, base, sf, fk, log);
    } else {
      log(`  [!] fuente ${fname} (${subtype}/${base}): tipo no soportado por este motor de prueba`);
    }
  }
  return encoders;
}

/* ---------------- intérprete ligero → runs de texto ---------------- */
// Un "run" es una secuencia contigua de mostraciones (Tj/TJ) de la MISMA fuente y
// tamaño en la MISMA línea. Las piezas separadas por avance vertical, cambio de
// fuente/tamaño, rotación o hueco ≥ espacio se consideran runs distintos.
function buildRuns(content, encoders) {
  const tokens = tokenizeContent(content);
  const runs = [];
  let cur = null;
  let font = null;
  let size = 12;
  let inText = false;
  let posX = 0;

  const closeRun = () => {
    if (cur && cur.pieces.length) {
      cur.endOff = posX - cur.startAbs;
      runs.push(cur);
    }
    cur = null;
  };

  const addPiece = (bytes, isHex, f, s) => {
    const enc = encoders[f];
    let decoded = '';
    let units = 0;
    if (enc) {
      try {
        decoded = enc.decode(bytes);
        units = enc.widthUnits1000 ? enc.widthUnits1000(decoded) : (enc.width(decoded, 1) * 1000);
      } catch {
        decoded = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
        units = bytes.length * 500;
      }
    } else {
      decoded = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
      units = bytes.length * 500;
    }
    const adv = (units / 1000) * s;
    cur.pieces.push({ bytes, isHex, decoded, adv });
    cur.text += decoded;
    posX += adv;
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const tk = tokens[idx];
    if (tk.t !== 'op') continue;
    const op = tk.value;
    if (op === 'BT') { closeRun(); inText = true; }
    else if (op === 'ET') { closeRun(); inText = false; }
    else if (inText) {
      if (op === 'Tf') {
        const nameT = tokens[idx - 2];
        const sizeT = tokens[idx - 1];
        const nm = nameT && nameT.t === 'name' ? nameT.value : font;
        const sz = sizeT && sizeT.t === 'num' ? sizeT.v : size;
        if (cur && (cur.font !== nm || cur.size !== sz)) closeRun();
        font = nm; size = sz;
      } else if (op === 'Td' || op === 'TD') {
        const tx = tokens[idx - 2] && tokens[idx - 2].t === 'num' ? tokens[idx - 2].v : 0;
        const ty = tokens[idx - 1] && tokens[idx - 1].t === 'num' ? tokens[idx - 1].v : 0;
        if (op === 'TD' || Math.abs(ty) > 1e-6) { closeRun(); posX += tx; continue; }
        if (cur) {
          const adv = posX - cur.startAbs;
          const gap = tx - adv;
          const em = size || 12;
          if (Math.abs(gap) <= 0.4 * em) {
            posX += tx;
          } else if (gap < 1.4 * em && gap > -0.25 * em) {
            cur.text += ' ';
            posX += tx;
          } else {
            closeRun();
            posX += tx;
          }
        } else {
          posX += tx;
        }
      } else if (op === 'T*' || op === 'Tm' || op === 'Tc' || op === 'Tw' || op === 'Tz' || op === 'Ts' || op === 'TL') {
        closeRun();
      } else if (op === 'Tj') {
        const prev = tokens[idx - 1];
        if (prev && (prev.t === 'str' || prev.t === 'hex')) {
          if (!cur) cur = { font, size, pieces: [], revStart: prev.start, revEnd: -1, startAbs: posX, endOff: 0, text: '' };
          addPiece(prev.bytes, prev.t === 'hex', font, size);
          cur.revEnd = tk.end;
        }
      } else if (op === 'TJ') {
        const prev = tokens[idx - 1];
        if (prev && prev.t === 'arr') {
          if (!cur) cur = { font, size, pieces: [], revStart: prev.start, revEnd: -1, startAbs: posX, endOff: 0, text: '' };
          for (const item of prev.items) {
            if (item.t === 'num') { posX += -(item.v / 1000) * size; continue; }
            if (item.t === 'str' || item.t === 'hex') addPiece(item.bytes, item.t === 'hex', font, size);
          }
          cur.revEnd = tk.end;
        }
      }
    }
  }
  closeRun();
  return runs;
}

/* ---------------- sustitución sobre runs ---------------- */
function indexAll(text, find) {
  const out = [];
  if (!find) return out;
  let from = 0;
  for (;;) {
    const i = text.indexOf(find, from);
    if (i < 0) break;
    out.push(i);
    from = i + find.length;
  }
  return out;
}

// Aplica la sustitución en un content stream: localiza el run que contiene la
// ocurrencia objetivo (por defecto la primera de la página) y reescribe SOLO ese
// run con `[ nuevo f ] TJ`, compensando el ancho para no mover el resto de la línea.
function applyEditOnce(content, edit, encoders, occState, log) {
  const runs = buildRuns(content, encoders);
  let out = content;
  for (const run of runs) {
    const enc = encoders[run.font];
    if (!enc) continue;
    const idxs = indexAll(run.text, edit.find);
    occState.found += idxs.length;
    if (occState.rewrote) continue;
    const local = occState.target - occState.seen;
    if (local < 0 || local >= idxs.length) { occState.seen += idxs.length; continue; }
    const gIdx = idxs[local];
    const newText = run.text.slice(0, gIdx) + edit.replace + run.text.slice(gIdx + edit.find.length);
    let newBytes;
    try {
      newBytes = enc.encode(newText);
    } catch (err) {
      log(`  [!] run «${run.text}» → nuevo «${newText}» (fuente ${run.font})`);
      occState.error = String((err && err.message) || err);
      occState.rewrote = true;
      continue;
    }
    const newW = enc.widthUnits1000 ? enc.widthUnits1000(newText) : (enc.width(newText, 1) * 1000);
    const newAdv = (newW / 1000) * run.size;
    const adj = ((newAdv - run.endOff) * 1000) / run.size;
    const tok = enc.codeWidth === 2 ? `<${bytesToHex(newBytes)}>` : escapePdfString(newBytes);
    const replacement = `[ ${tok} ${fmtNum(adj)} ] TJ`;
    out = out.slice(0, run.revStart) + replacement + out.slice(run.revEnd);
    occState.rewrote = true;
  }
  return { content: out, changed: occState.rewrote };
}

/* ---------------- API ---------------- */
export function diagReset() { /* mantiene firma usada por scripts de diagnóstico */ }
export function diagOff() { /* ídem */ }

export async function editPdf(srcBytes, edits, log = () => {}, opts = {}) {
  const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  const scratch = await PDFDocument.create();
  const scratchFonts = new Map();
  const pages = doc.getPages();
  const encodersByPage = new Map();
  const applied = [];

  for (const edit of edits) {
    const entry = {
      page: edit.page ?? 0, find: edit.find, replace: edit.replace,
      count: 0, found: 0, error: null,
    };
    applied.push(entry);
    try {
      const pageIdx = edit.page ?? 0;
      const page = pages[pageIdx];
      if (!page) throw new Error(`página ${pageIdx} inexistente`);
      if (!encodersByPage.has(pageIdx)) {
        log(`- página ${pageIdx + 1}: analizando fuentes del recurso…`);
        encodersByPage.set(pageIdx, await buildPageEncoders(doc, page, scratch, scratchFonts, log));
      }
      if (!edit.find) throw new Error('texto original vacío');
      const encoders = encodersByPage.get(pageIdx);
      if (opts.debug) {
        for (const ref of contentRefs(page)) {
          const stream = page.node.context.lookup(ref);
          if (!stream) continue;
          const content = Buffer.from(streamBytes(stream)).toString('latin1');
          const runsDbg = buildRuns(content, encoders);
          runsDbg.forEach((r) => log(`[debug] run font=${r.font} size=${r.size} «${r.text}»`));
        }
      }
      const occState = { target: edit.occ ?? 0, seen: 0, found: 0, rewrote: false, error: null };
      for (const ref of contentRefs(page)) {
        const stream = page.node.context.lookup(ref);
        if (!stream) continue;
        let content = Buffer.from(streamBytes(stream)).toString('latin1');
        const res = applyEditOnce(content, edit, encoders, occState, log);
        if (res.changed) writeBack(page.node.context, ref, stream, res.content);
      }
      entry.found = occState.found;
      if (occState.error) {
        entry.error = occState.error;
      } else if (occState.rewrote) {
        entry.count = 1;
      } else {
        entry.error = occState.found
          ? 'no se pudo sustituir la aparición solicitada en esta página'
          : 'no se encontró el texto con la codificación esperada';
      }
    } catch (err) {
      entry.error = String((err && err.message) || err);
    }
  }

  const bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false });
  return { bytes, applied };
}

