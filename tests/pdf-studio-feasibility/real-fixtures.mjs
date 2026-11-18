// real-fixtures.mjs — PDFs REALES de terceros (real0/real1/real2). NO se versionan
// (ver .gitignore). Los diagnósticos que dependen de ellos deben omitirse si faltan.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts', 'real');
export const REAL_FILES = ['real0.pdf', 'real1.pdf', 'real2.pdf'];

export function skipIfMissingRealPdfs(scriptName, required = REAL_FILES) {
  const missing = required.filter((f) => !fs.existsSync(path.join(REAL_DIR, f)));
  if (!missing.length) return false;
  console.log(`[omitido] ${scriptName}: faltan PDFs reales no versionados en tests/pdf-studio-feasibility/artifacts/real/ (${missing.join(', ')}).`);
  console.log('Son PDFs de terceros y no forman parte de la suite principal (run-tests.mjs).');
  process.exit(0);
}
