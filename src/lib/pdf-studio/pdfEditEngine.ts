// pdfEditEngine.ts — Motor de edición REAL de texto PDF para el navegador (v2 · runs).
// Tokeniza el content stream, agrupa las mostraciones (Tj/TJ) en "runs" contiguos por
// línea y fuente, decodifica cada run con la codificación ORIGINAL de su fuente
// (ToUnicode del documento, WinAnsi o MacRoman), localiza el texto del usuario aunque
// esté fragmentado en varios operadores/objetos y reescribe SOLO ese run con
// `[ nuevo ajuste ] TJ`, conservando la posición del resto de la línea mediante la
// compensación de ancho. No usa rectángulos blancos ni superposiciones.
import {
  PDFDocument, PDFName, PDFArray, PDFRawStream, PDFNumber,
  StandardFonts, decodePDFRawStream, rgb,
} from 'pdf-lib';
import * as fontkitNs from '@pdf-lib/fontkit';
const fontkit: any = (fontkitNs as any).default ?? fontkitNs;

/* Sustitutos de Buffer (latin1) para el navegador */
function latin1Encode(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
  return out;
}
function latin1Decode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/* ---------------- WinAnsi ---------------- */
const SPECIALS: Record<number, string> = {
  0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026',
  0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160',
  0x8B: '\u2039', 0x8C: '\u0152', 0x8E: '\u017D', 0x91: '\u2018', 0x92: '\u2019',
  0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153',
  0x9E: '\u017E', 0x9F: '\u0178',
};
const SPECIALS_REV = new Map(Object.entries(SPECIALS).map(([b, ch]) => [ch, Number(b)]));

export function winAnsiEncode(str: string): Uint8Array {
  const out: number[] = [];
  for (const ch of str) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) out.push(c);
    else if (SPECIALS_REV.has(ch)) out.push(SPECIALS_REV.get(ch) as number);
    else if (c >= 0xA0 && c <= 0xFF) out.push(c);
    else throw new Error(`Carácter no representable en WinAnsi: U+${c.toString(16)}`);
  }
  return Uint8Array.from(out);
}

export function winAnsiDecode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b < 0x80 ? String.fromCharCode(b) : (SPECIALS[b] ?? String.fromCharCode(b));
  return s;
}

/* ---------------- MacRoman (fuentes simples con /MacRomanEncoding) ---------------- */
const MACROMAN = new Map<string, string>(Object.entries({
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
const MACROMAN_REV = new Map<string, number>();
for (const [b, ch] of MACROMAN) if (!MACROMAN_REV.has(ch)) MACROMAN_REV.set(ch, parseInt(b, 16));

function macromanEncode(str: string): Uint8Array {
  const out: number[] = [];
  for (const ch of str) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) out.push(c);
    else if (MACROMAN_REV.has(ch)) out.push(MACROMAN_REV.get(ch) as number);
    else throw new Error(`Carácter no representable en MacRoman: U+${c.toString(16)}`);
  }
  return Uint8Array.from(out);
}
function macromanDecode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b < 0x80 ? String.fromCharCode(b) : (MACROMAN.get(b.toString(16).toUpperCase()) ?? String.fromCharCode(b));
  return s;
}

/* ---------------- bytes / hex / cadenas PDF ---------------- */
const bytesToHex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();

function escapePdfString(bytes: Uint8Array): string {
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

const fmtNum = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
};

/* ---------------- tokenizador de content stream ---------------- */
const NUM_RE = /^-?\d*\.?\d+(?:[eE][-+]?\d+)?/;
const OP_NAME_RE = /^[A-Za-z]+\*?/;

interface Tok { t: string; start: number; end: number; bytes?: Uint8Array; v?: number; value?: string; items?: Array<{ t: string; v?: number; bytes?: Uint8Array }>; }

function scanString(content: string, i: number): { bytes: Uint8Array; end: number } {
  const out: number[] = [];
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

function escByte(content: string, i: number): { byte: number; next: number } {
  const c0 = content[i + 1];
  let value: number;
  let next: number;
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

function scanHex(content: string, i: number): { bytes: Uint8Array; end: number } {
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

function tokenizeContent(content: string): Tok[] {
  const toks: Tok[] = [];
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
      const items: Array<{ t: string; v?: number; bytes?: Uint8Array }> = [];
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
        const mm: RegExpMatchArray | null = content.slice(i).match(NUM_RE);
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
function streamBytes(stream: any): Uint8Array {
  if (stream instanceof PDFRawStream) {
    const filter = stream.dict ? stream.dict.get(PDFName.of('Filter')) : null;
    const raw = stream.contents ?? (typeof stream.getContents === 'function' ? stream.getContents() : null);
    if (!filter) return raw instanceof Uint8Array ? raw : latin1Encode(String(raw ?? ''));
    const dec = decodePDFRawStream(stream).decode();
    return dec instanceof Uint8Array ? dec : latin1Encode(String(dec));
  }
  if (typeof stream.getContentsString === 'function') {
    return latin1Encode(stream.getContentsString());
  }
  if (typeof stream.getContents === 'function') {
    const c = stream.getContents();
    return typeof c === 'string' ? latin1Encode(c) : new Uint8Array(c);
  }
  throw new Error('Tipo de stream no soportado: ' + (stream && stream.constructor && stream.constructor.name));
}

function contentRefs(page: any) {
  const node = page.node;
  const v = node.get(PDFName.of('Contents'));
  if (!v) return [];
  if (v instanceof PDFArray) return v.asArray();
  return [v];
}

function writeBack(ctx: any, ref: any, stream: any, content: string) {
  const bytes = latin1Encode(content);
  const dict = stream.dict;
  dict.set(PDFName.of('Length'), PDFNumber.of(bytes.length));
  dict.delete(PDFName.of('Filter'));
  ctx.assign(ref, PDFRawStream.of(dict, bytes));
}

/* ---------------- fuentes: nombres y tablas ---------------- */
const STANDARD_KEY: Record<string, string> = {
  'Helvetica': 'Helvetica', 'Helvetica-Bold': 'HelveticaBold',
  'Helvetica-Oblique': 'HelveticaOblique', 'Helvetica-BoldOblique': 'HelveticaBoldOblique',
  'Times-Roman': 'TimesRoman', 'Times-Bold': 'TimesBold', 'Times-Italic': 'TimesItalic',
  'Times-BoldItalic': 'TimesBoldItalic', 'Courier': 'Courier', 'Courier-Bold': 'CourierBold',
  'Courier-Oblique': 'CourierOblique', 'Courier-BoldOblique': 'CourierBoldOblique',
  'Symbol': 'Symbol', 'ZapfDingbats': 'ZapfDingbats',
};

function nameOf(obj: any): string {
  if (!obj) return '';
  if (typeof obj.code === 'string') return obj.code;
  const s = typeof obj.asString === 'function' ? obj.asString() : String(obj);
  return s.replace(/^\//, '');
}

const utf16FromHex = (hex: string) => {
  let s = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCodePoint(parseInt(hex.substr(i, 4), 16));
  return s;
};

function parseToUnicode(text: string): Map<number, string> {
  const g2u = new Map<number, string>();
  let m: RegExpExecArray | null;
  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((m = bfcharRe.exec(text))) {
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g;
    let p: RegExpExecArray | null;
    while ((p = pairRe.exec(m[1]))) {
      if (!g2u.has(parseInt(p[1], 16))) g2u.set(parseInt(p[1], 16), utf16FromHex(p[2]));
    }
  }
  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = bfrangeRe.exec(text))) {
    const re3 = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let p: RegExpExecArray | null;
    while ((p = re3.exec(m[1]))) {
      const a = parseInt(p[1], 16);
      const b = parseInt(p[2], 16);
      const d = parseInt(p[3], 16);
      for (let g = a; g <= b; g++) if (!g2u.has(g)) g2u.set(g, String.fromCodePoint(d + (g - a)));
    }
    const reArr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]*)\]/g;
    let q: RegExpExecArray | null;
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

function parseSimpleWidths(fdict: any, ctx: any): Map<number, number> {
  const first = fdict.get(PDFName.of('FirstChar'))?.asNumber?.() ?? 0;
  const map = new Map<number, number>();
  const wRef = fdict.get(PDFName.of('Widths'));
  if (!wRef) return map;
  try {
    const arr = ctx.lookup(wRef);
    arr.asArray().forEach((e: any, i: number) => {
      const w = ctx.lookup(e).asNumber?.();
      if (typeof w === 'number') map.set(first + i, w);
    });
  } catch { /* mapa vacío */ }
  return map;
}

interface FontEncoder {
  custom: boolean;
  codeWidth: number;
  base: string;
  encName: string;
  decode: (bytes: Uint8Array) => string;
  encode: (str: string) => Uint8Array;
  widthUnits1000: (str: string) => number;
  width: (str: string, size: number) => number;
}

// Codificador CID (Type0): invierte ToUnicode (unicode→CID) y usa /W + /DW del
// descendiente para medir. Solo admite glifos presentes en el subset.
function buildCidEncoderFromTables(fdict: any, dfd: any, ctx: any, base: string): FontEncoder | null {
  const res = (v: any) => (!v ? null : (typeof v.asNumber === 'function' || typeof v.asArray === 'function' ? v : ctx.lookup(v)));
  const tu = res(fdict.get(PDFName.of('ToUnicode')));
  if (!tu) return null;
  const text = latin1Decode(streamBytes(tu));
  const g2u = parseToUnicode(text);
  const u2g = new Map<string, number>();
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
  const widths = new Map<number, number>();
  const wVal = res(dfd.get(PDFName.of('W')));
  if (wVal && typeof wVal.asArray === 'function') {
    const els = wVal.asArray().map((e: any) => res(e));
    for (let i = 0; i < els.length;) {
      const a = els[i]?.asNumber?.();
      if (a == null) { i++; continue; }
      const second = res(els[i + 1]);
      if (second && typeof second.asArray === 'function') {
        second.asArray().forEach((e: any, k: number) => {
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
  const glyphWidth = (g: number | undefined) => (typeof g === 'number' ? (widths.get(g) ?? dw) : dw);
  const codeBytes = (g: number) => (codeWidth === 1 ? [g & 0xFF] : [(g >> 8) & 0xFF, g & 0xFF]);
  const decode = (bytes: Uint8Array) => {
    let s = '';
    const bw = codeWidth;
    for (let i = 0; i + bw <= bytes.length; i += bw) {
      const g = bw === 1 ? bytes[i] : ((bytes[i] << 8) | bytes[i + 1]);
      s += g2u.get(g) ?? '\uFFFD';
    }
    return s;
  };
  const widthOf = (str: string): number => {
    let units = 0;
    for (const ch of str) {
      const g = u2g.get(ch);
      units += typeof g === 'number' ? glyphWidth(g) : dw;
    }
    return units;
  };
  return {
    custom: true,
    codeWidth,
    base,
    encName: `ToUnicode(${codeWidth}B)`,
    decode,
    encode: (str: string) => {
      const out: number[] = [];
      for (const ch of str) {
        const g = u2g.get(ch);
        if (g === undefined) throw new Error(`glifo no disponible en la fuente embebida subset: \"${ch}\"`);
        out.push(...codeBytes(g));
      }
      return Uint8Array.from(out);
    },
    widthUnits1000: widthOf,
    width: (str: string, size: number) => (widthOf(str) * size) / 1000,
  };
}

// Codificador para fuentes SIMPLES (Type1 / TrueType de 1 byte): respeta la
// codificación ORIGINAL del documento (ToUnicode, MacRoman o WinAnsi). Si `fk`
// trae el programa embebido, valida que los glifos existan en el subset y usa sus
// avances reales cuando /Widths falte o valga 0.
function buildSimpleEncoder(fdict: any, ctx: any, base: string, stdFont: any, fk: any, log: (s: string) => void): FontEncoder {
  const encObj = fdict.get(PDFName.of('Encoding'));
  let encName = '';
  if (encObj && typeof encObj.asString === 'function') encName = encObj.asString();
  else if (encObj && typeof encObj.code === 'string') encName = encObj.code;
  else if (encObj) encName = 'dict';

  let g2u: Map<number, string> | null = null;
  let codeWidth = 1;
  const tuRef = fdict.get(PDFName.of('ToUnicode'));
  if (tuRef) {
    try {
      const tu = ctx.lookup(tuRef);
      const text = latin1Decode(streamBytes(tu));
      g2u = parseToUnicode(text);
      for (const g of g2u.keys()) { if (g > 0xFF) { codeWidth = 2; break; } }
    } catch (err) {
      log(`  [!] ToUnicode ilegible de "${base}": ${String((err && (err as Error).message) || err).slice(0, 60)}`);
    }
  }
  const widthsByCode = parseSimpleWidths(fdict, ctx);

  const decodeFn = g2u
    ? (bytes: Uint8Array): string => {
        let s = '';
        const bw = codeWidth;
        for (let i = 0; i + bw <= bytes.length; i += bw) {
          const g = bw === 1 ? bytes[i] : ((bytes[i] << 8) | bytes[i + 1]);
          s += g2u?.get(g) ?? (bw === 1 && bytes[i] >= 32 && bytes[i] < 127 ? String.fromCharCode(bytes[i]) : '\uFFFD');
        }
        return s;
      }
    : (encName.includes('MacRoman') ? macromanDecode : winAnsiDecode);

  const encodeFn = g2u
    ? (str: string): Uint8Array => {
        const u2g = new Map<string, number>();
        for (const [g, s] of g2u!) if (!u2g.has(s)) u2g.set(s, g);
        const out: number[] = [];
        for (const ch of str) {
          const g = u2g.get(ch);
          if (g === undefined) throw new Error(`glifo no disponible en la fuente embebida: \"${ch}\"`);
          if (codeWidth === 1) out.push(g & 0xFF);
          else out.push((g >> 8) & 0xFF, g & 0xFF);
        }
        return Uint8Array.from(out);
      }
    : (str: string): Uint8Array => {
        const enc = encName.includes('MacRoman') ? macromanEncode : winAnsiEncode;
        const bytes = enc(str);
        if (fk) {
          for (const ch of str) {
            const cp = ch === ' ' ? 32 : (ch.codePointAt(0) as number);
            const g = fk.glyphForCodePoint(cp);
            const ok = !!g && g.id !== undefined && g.id !== 0;
            if (!ok) throw new Error(`glifo no disponible en la fuente embebida subset: \"${ch}\"`);
          }
        }
        return bytes;
      };

  const fkGlyphW = (cp: number): number | null => {
    if (!fk) return null;
    try {
      const g = fk.glyphForCodePoint(cp);
      if (g && typeof g.advanceWidth === 'number' && g.id !== 0) return g.advanceWidth;
    } catch { /* noop */ }
    return null;
  };

  const widthUnits1000 = (str: string): number => {
    try {
      const bytes = encodeFn(str);
      const bw = codeWidth;
      let units = 0;
      for (let i = 0; i + bw <= bytes.length; i += bw) {
        const g = bw === 1 ? bytes[i] : ((bytes[i] << 8) | bytes[i + 1]);
        let w = widthsByCode.get(g) ?? 0;
        if (!w || !isFinite(w)) w = fkGlyphW(g) ?? 0;
        if (!w) w = 500;
        units += w;
      }
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
    width: (str: string, size: number) => (widthUnits1000(str) * size) / 1000,
  };
}

async function buildPageEncoders(
  _doc: PDFDocument,
  page: any,
  scratch: PDFDocument,
  scratchFonts: Map<string, any>,
  log: (s: string) => void,
): Promise<Record<string, FontEncoder>> {
  const encoders: Record<string, FontEncoder> = {};
  const ctx = page.node.context;
  let res: any = null;
  let node: any = page.node;
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
      if (!sf) { sf = await scratch.embedFont((StandardFonts as any)[stdKey]); scratchFonts.set(stdKey, sf); }
      let fk: any = null;
      try {
        const fdrRef = fdict.get(PDFName.of('FontDescriptor'));
        const fdr = fdrRef ? ctx.lookup(fdrRef) : null;
        const ffRef = fdr ? fdr.get(PDFName.of('FontFile2')) ?? fdr.get(PDFName.of('FontFile3')) : null;
        if (ffRef) {
          const st = ctx.lookup(ffRef);
          const raw = streamBytes(st);
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
interface TextRun {
  font: string | null;
  size: number;
  pieces: Array<{ bytes: Uint8Array; isHex: boolean; adv: number }>;
  revStart: number;
  revEnd: number;
  startAbs: number;
  endOff: number;
  text: string;
}

function buildRuns(content: string, encoders: Record<string, FontEncoder>): TextRun[] {
  const tokens = tokenizeContent(content);
  const runs: TextRun[] = [];
  let cur: TextRun | null = null;
  let font: string | null = null;
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

  const addPiece = (bytes: Uint8Array, isHex: boolean, f: string | null, s: number) => {
    if (!cur) return;
    const enc = encoders[f ?? ''];
    let decoded = '';
    let units = 0;
    if (enc) {
      try {
        decoded = enc.decode(bytes);
        units = enc.widthUnits1000(decoded);
      } catch {
        decoded = latin1Decode(bytes);
        units = bytes.length * 500;
      }
    } else {
      decoded = latin1Decode(bytes);
      units = bytes.length * 500;
    }
    const adv = (units / 1000) * s;
    cur.pieces.push({ bytes, isHex, adv });
    cur.text += decoded;
    posX += adv;
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const tk = tokens[idx];
    if (tk.t !== 'op') continue;
    const op = tk.value as string;
    if (op === 'BT') { closeRun(); inText = true; }
    else if (op === 'ET') { closeRun(); inText = false; }
    else if (inText) {
      if (op === 'Tf') {
        const nameT = tokens[idx - 2];
        const sizeT = tokens[idx - 1];
        const nm: string | null = nameT && nameT.t === 'name' ? (nameT.value as string) : font;
        const sz: number = sizeT && sizeT.t === 'num' ? (sizeT.v as number) : size;
        if (cur && (cur.font !== nm || cur.size !== sz)) closeRun();
        font = nm; size = sz;
      } else if (op === 'Td' || op === 'TD') {
        const tx = tokens[idx - 2] && tokens[idx - 2].t === 'num' ? (tokens[idx - 2].v as number) : 0;
        const ty = tokens[idx - 1] && tokens[idx - 1].t === 'num' ? (tokens[idx - 1].v as number) : 0;
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
          addPiece(prev.bytes as Uint8Array, prev.t === 'hex', font, size);
          cur.revEnd = tk.end;
        }
      } else if (op === 'TJ') {
        const prev = tokens[idx - 1];
        if (prev && prev.t === 'arr') {
          if (!cur) cur = { font, size, pieces: [], revStart: prev.start, revEnd: -1, startAbs: posX, endOff: 0, text: '' };
          for (const item of prev.items ?? []) {
            if (item.t === 'num') { posX += -((item.v as number) / 1000) * size; continue; }
            if (item.t === 'str' || item.t === 'hex') addPiece(item.bytes as Uint8Array, item.t === 'hex', font, size);
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
interface PdfEdit {
  page?: number;
  find: string;
  replace: string;
  occ?: number; // índice de la aparición a sustituir (0 = primera de la página)
}

// Derecha: se avisa si el final estimado del run supera `pageWidth - margin`.
export const DEFAULT_RIGHT_MARGIN = 36; // 0,5 pulgada, margen típico de página

export interface OverflowInfo {
  kind: 'page' | 'line';
  estimatedNewEnd: number; // final estimado del run en puntos (coordenadas del texto)
  pageWidth: number; // ancho de la página en puntos
  lineRightMax: number; // extensión máxima actual de la línea (puntos)
  margin: number;
}

export interface EditResult {
  page: number;
  find: string;
  replace: string;
  count: number;
  found: number; // apariciones detectadas de `find` en la página
  error: string | null;
  warning: string | null; // aviso de desbordamiento (si lo hubo)
  overflow: OverflowInfo | null;
}

interface OccState {
  target: number;
  seen: number;
  found: number;
  rewrote: boolean;
  error: string | null;
  warning: string | null;
  overflow: OverflowInfo | null;
}

function indexAll(text: string, find: string): number[] {
  const out: number[] = [];
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

function applyEditOnce(
  content: string,
  edit: PdfEdit,
  encoders: Record<string, FontEncoder>,
  occState: OccState,
  _log: (s: string) => void,
  pageWidth: number | null,
  rightMargin = DEFAULT_RIGHT_MARGIN,
): { content: string; changed: boolean } {
  const runs = buildRuns(content, encoders);
  let lineRightMax = 0;
  for (const run of runs) lineRightMax = Math.max(lineRightMax, run.startAbs + run.endOff);
  let out = content;
  for (const run of runs) {
    const enc = run.font ? encoders[run.font] : undefined;
    if (!enc) continue;
    const idxs = indexAll(run.text, edit.find);
    occState.found += idxs.length;
    if (occState.rewrote) continue;
    const local = occState.target - occState.seen;
    if (local < 0 || local >= idxs.length) { occState.seen += idxs.length; continue; }
    const gIdx = idxs[local];
    const newText = run.text.slice(0, gIdx) + edit.replace + run.text.slice(gIdx + edit.find.length);
    let newBytes: Uint8Array;
    try {
      newBytes = enc.encode(newText);
    } catch (err) {
      occState.error = String((err && (err as Error).message) || err);
      occState.rewrote = true;
      continue;
    }
    const newW = enc.widthUnits1000(newText);
    const newAdv = (newW / 1000) * run.size;
    const adj = ((newAdv - run.endOff) * 1000) / run.size;
    const tok = enc.codeWidth === 2 ? `<${bytesToHex(newBytes)}>` : escapePdfString(newBytes);
    const replacement = `[ ${tok} ${fmtNum(adj)} ] TJ`;
    out = out.slice(0, run.revStart) + replacement + out.slice(run.revEnd);
    occState.rewrote = true;
    // Aviso de desbordamiento: solo si el reemplazo es M�S ancho que el original
    // y su final estimado supera el ancho de p�gina o la extensi�n de la l�nea.
    if (!occState.overflow && pageWidth && pageWidth > 0) {
      const overflow = computeRunOverflow(run, newAdv, lineRightMax, pageWidth, rightMargin);
      if (overflow) {
        occState.overflow = overflow;
        occState.warning =
          overflow.kind === 'page'
            ? `el reemplazo podr�a superar el ancho de la p�gina (final estimado ${fmtNum(overflow.estimatedNewEnd)} pt sobre ${fmtNum(pageWidth)} pt)`
            : 'el reemplazo es m�s ancho que la l�nea actual y podr�a empujar el texto adyacente hacia el margen';
      }
    }
  }
  return { content: out, changed: occState.rewrote };
}

// Estimaci�n de desbordamiento de una sustituci�n dentro de un run.
// `run.startAbs` es la posici�n X del run en el espacio del texto; para documentos
// t�picos coincide con la coordenada X real de la p�gina, as� que compararlo con el
// ancho de p�gina es una heur�stica v�lida para avisar al usuario en la Beta.
function computeRunOverflow(
  run: TextRun,
  newAdv: number,
  lineRightMax: number,
  pageWidth: number,
  rightMargin: number,
): OverflowInfo | null {
  const delta = newAdv - run.endOff;
  if (delta <= 0.5) return null; // igual o m�s corto: no hay riesgo
  const estimatedNewEnd = run.startAbs + newAdv;
  if (estimatedNewEnd > pageWidth - rightMargin) {
    return { kind: 'page', estimatedNewEnd, pageWidth, lineRightMax, margin: rightMargin };
  }
  if (estimatedNewEnd > lineRightMax + 2) {
    return { kind: 'line', estimatedNewEnd, pageWidth, lineRightMax, margin: rightMargin };
  }
  return null;
}

/* ---------------- API ---------------- */
export async function editPdf(
  srcBytes: Uint8Array,
  edits: PdfEdit[],
  log: (s: string) => void = () => {},
): Promise<{ bytes: Uint8Array; applied: EditResult[] }> {
  const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  const scratch = await PDFDocument.create();
  const scratchFonts = new Map<string, any>();
  const pages = doc.getPages();
  const encodersByPage = new Map<number, Record<string, FontEncoder>>();
  const applied: EditResult[] = [];

  for (const edit of edits) {
    const entry: EditResult = {
      page: edit.page ?? 0,
      find: edit.find,
      replace: edit.replace,
      count: 0,
      found: 0,
      error: null,
      warning: null,
      overflow: null,
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
      const encoders = encodersByPage.get(pageIdx) ?? {};
      const occState: OccState = { target: edit.occ ?? 0, seen: 0, found: 0, rewrote: false, error: null, warning: null, overflow: null };
      const pageWidth = page.getSize().width;
      for (const ref of contentRefs(page)) {
        const stream = page.node.context.lookup(ref);
        if (!stream) continue;
        let content = latin1Decode(streamBytes(stream));
        const res = applyEditOnce(content, edit, encoders, occState, log, pageWidth);
        if (res.changed) writeBack(page.node.context, ref, stream, res.content);
      }
      entry.found = occState.found;
      entry.warning = occState.warning;
      entry.overflow = occState.overflow;
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
      entry.error = String((err && (err as Error).message) || err);
    }
  }

  const bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false });
  return { bytes, applied };
}

/**
 * Comprueba si una sustitución supera el ancho disponible o podría invadir el
 * margen de la página, SIN modificar el documento. Se usa en la interfaz para
 * avisar al usuario ANTES de aplicar el cambio.
 */
export async function checkEditOverflow(
  srcBytes: Uint8Array,
  edit: PdfEdit,
  rightMargin = DEFAULT_RIGHT_MARGIN,
): Promise<OverflowInfo | null> {
  const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  const scratch = await PDFDocument.create();
  const scratchFonts = new Map<string, any>();
  const pageIdx = edit.page ?? 0;
  const page = doc.getPages()[pageIdx];
  if (!page) return null;
  const log = () => {};
  const encoders = await buildPageEncoders(doc, page, scratch, scratchFonts, log);
  const pageWidth = page.getSize().width;
  const occState: OccState = { target: edit.occ ?? 0, seen: 0, found: 0, rewrote: false, error: null, warning: null, overflow: null };
  for (const ref of contentRefs(page)) {
    const stream = page.node.context.lookup(ref);
    if (!stream) continue;
    const content = latin1Decode(streamBytes(stream));
    applyEditOnce(content, edit, encoders, occState, log, pageWidth, rightMargin);
  }
  return occState.overflow;
}

/* ---------------- texto libre (añadir texto nuevo) ---------------- */
export type AddedTextFont =
  | 'helvetica'
  | 'helvetica-bold'
  | 'times-roman'
  | 'times-roman-bold'
  | 'courier'
  | 'courier-bold';

export interface AddedText {
  page: number; // 0-based
  text: string;
  x: number; // en puntos de usuario PDF, origen en esquina inferior-izquierda
  y: number; // ídem, eje vertical hacia arriba
  size: number;
  font?: AddedTextFont; // fuente estándar (por defecto Helvetica)
  color?: { r: number; g: number; b: number }; // canal RGB en 0..1
}

const ADDED_FONT_MAP: Record<AddedTextFont, StandardFonts> = {
  helvetica: StandardFonts.Helvetica,
  'helvetica-bold': StandardFonts.HelveticaBold,
  'times-roman': StandardFonts.TimesRoman,
  'times-roman-bold': StandardFonts.TimesRomanBold,
  courier: StandardFonts.Courier,
  'courier-bold': StandardFonts.CourierBold,
};

export async function addTextToPdf(
  srcBytes: Uint8Array,
  texts: AddedText[],
  log: (s: string) => void = () => {},
): Promise<{ bytes: Uint8Array; added: number }> {
  const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  const pages = doc.getPages();
  let added = 0;
  for (const t of texts) {
    const page = pages[t.page];
    if (!page) throw new Error(`página ${t.page} inexistente`);
    const text = (t.text ?? '').trim();
    if (!text) continue;
    const fontKey: AddedTextFont = t.font ?? 'helvetica';
    const font = await doc.embedFont(ADDED_FONT_MAP[fontKey] ?? StandardFonts.Helvetica);
    const color = t.color ? rgb(t.color.r, t.color.g, t.color.b) : undefined;
    page.drawText(text, { x: t.x, y: t.y, size: t.size || 12, font, ...(color ? { color } : {}) });
    added++;
    log(`- texto añadido en página ${t.page + 1} (${fmtNum(t.x)}, ${fmtNum(t.y)})`); // sin contenido del PDF
  }
  const bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false });
  return { bytes, added };
}

export async function verifyPdfBytes(srcBytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    return true;
  } catch {
    return false;
  }
}

