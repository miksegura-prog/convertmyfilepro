import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  extractTextFromImage, supportedLanguages, DEFAULT_OCR_SETTINGS,
  type OcrSettings, type OcrImageMode,
  type OcrImageProcessing, type OcrRotation,
} from '@/tools/ocrTool';
import { SEO } from '@/components/ui-custom/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2, Download, Sparkles, FileText, RotateCcw, X } from 'lucide-react';
import { DropZone } from '@/components/ui-custom/DropZone';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useProStatus } from '@/hooks/useProStatus';
import { ProModal } from '@/components/ui-custom/ProModal';
import { FAQ } from '@/components/ui-custom/FAQ';
import { downloadBlob } from '@/utils/fileHelpers';
import type { OcrResult } from '@/types';

const FREE_PER_DAY = 5;
const MAX_ITEMS_PER_JOB = 40;
const USAGE_KEY = 'cmfp_ocr_daily_v2';

function localDay(): string {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-');
}
function readUsage(): number {
  try {
    const value = JSON.parse(localStorage.getItem(USAGE_KEY) || 'null') as {
      date?: string; used?: number;
    } | null;
    return value?.date === localDay() && Number.isInteger(value.used) && value.used! >= 0
      ? value.used! : 0;
  } catch { return 0; }
}
function recordUsage(): number {
  const used = readUsage() + 1;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify({ date: localDay(), used })); }
  catch { /* The free usage counter is best-effort, not a server-side quota. */ }
  return used;
}
function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
type Job = { file: File; pages?: number[] };

const OcrTool: React.FC = () => {
  const { t, i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const { hasProAccess } = useProStatus();
  const [settings, setSettings] = useState<OcrSettings>({
    ...DEFAULT_OCR_SETTINGS,
    language: es ? 'spa' : 'eng',
  });
  const [pdfPageRange, setPdfPageRange] = useState('');
  const [used, setUsed] = useState(readUsage);
  const [resultText, setResultText] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const [averageConfidence, setAverageConfidence] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const cancelRef = useRef(false);

  const {
    files, isDragging, error, addFiles, removeFile, clearFiles, setIsDragging,
  } = useFileUpload({
    maxFiles: 10,
    maxSizeMB: 20,
    allowedTypes: ['image/*', 'application/pdf'],
    multiple: true,
  });

  const ui = es ? {
    intro: 'Extrae texto de imágenes y PDF escaneados. Todas las mejoras son gratuitas; PRO solo amplía la cantidad diaria.',
    language: 'Idioma del documento',
    mode: 'Diseño del texto',
    processing: 'Preparación de imagen',
    rotation: 'Girar imagen',
    pages: 'Páginas de PDF (opcional)',
    pageHelp: 'Ejemplo: 1-3,5. Déjalo vacío para procesar todas las páginas. Cada página cuenta como una imagen.',
    fileHelp: 'Hasta 10 archivos por operación; 20 MB por archivo. Los PDF se procesan página por página.',
    start: 'Extraer texto',
    extracting: 'Reconociendo texto',
    stop: 'Detener después de esta página',
    free: 'Gratis: 5 imágenes o páginas PDF al día, con todas las funciones.',
    freeRemaining: 'Te quedan',
    pagesToday: 'imágenes/páginas hoy',
    pro: 'PRO: sin límite diario de imágenes o páginas. La calidad y las herramientas son las mismas que en Gratis.',
    result: 'Texto extraído (editable)',
    copy: 'Copiar',
    txt: 'Descargar TXT',
    docx: 'Descargar Word',
    again: 'Nueva extracción',
    confidence: 'Confianza media aproximada',
    empty: 'No se ha detectado texto. Prueba otro modo, idioma o una imagen más nítida.',
    limit: 'Has alcanzado el límite gratuito de hoy. Puedes volver mañana o activar PRO para procesar más imágenes.',
    batchLimit: 'Para evitar bloquear el navegador, procesa un máximo de 40 imágenes o páginas por operación.',
    unknown: 'No se ha podido procesar el archivo.',
    complete: 'Imágenes/páginas procesadas',
    privacy: 'Los archivos se procesan en tu navegador. La primera ejecución puede descargar modelos de idioma.',
    modeOptions: [
      { value: 'auto', label: 'Automático (recomendado)' },
      { value: 'document', label: 'Documento / párrafos' },
      { value: 'line', label: 'Una sola línea' },
      { value: 'sparse', label: 'Texto disperso / captura' },
    ],
    processingOptions: [
      { value: 'automatic', label: 'Mejorar contraste automáticamente' },
      { value: 'original', label: 'Imagen original' },
      { value: 'grayscale', label: 'Escala de grises' },
      { value: 'blackWhite', label: 'Blanco y negro (escaneos)' },
    ],
  } : {
    intro: 'Extract text from images and scanned PDFs. Every quality feature is free; PRO only increases your daily volume.',
    language: 'Document language',
    mode: 'Text layout',
    processing: 'Image processing',
    rotation: 'Rotate image',
    pages: 'PDF pages (optional)',
    pageHelp: 'Example: 1-3,5. Leave blank for all pages. Every PDF page counts as one image.',
    fileHelp: 'Up to 10 files per batch; 20 MB per file. PDFs are processed page by page.',
    start: 'Extract text',
    extracting: 'Recognizing text',
    stop: 'Stop after current page',
    free: 'Free: 5 images or PDF pages daily, with all features.',
    freeRemaining: 'You have',
    pagesToday: 'images/pages left today',
    pro: 'PRO: unlimited images or pages per day. Quality and tools are identical to Free.',
    result: 'Extracted text (editable)',
    copy: 'Copy',
    txt: 'Download TXT',
    docx: 'Download Word',
    again: 'New extraction',
    confidence: 'Approximate average confidence',
    empty: 'No text detected. Try a different mode, language or clearer image.',
    limit: 'You have reached today’s free limit. Come back tomorrow or choose PRO for more images.',
    batchLimit: 'To keep your browser responsive, process no more than 40 images or pages per batch.',
    unknown: 'Could not process the file.',
    complete: 'Images/pages completed',
    privacy: 'Files are processed in your browser. The first run may download language models.',
    modeOptions: [
      { value: 'auto', label: 'Automatic (recommended)' },
      { value: 'document', label: 'Document / paragraphs' },
      { value: 'line', label: 'Single line' },
      { value: 'sparse', label: 'Sparse text / screenshot' },
    ],
    processingOptions: [
      { value: 'automatic', label: 'Auto-enhance contrast' },
      { value: 'original', label: 'Original image' },
      { value: 'grayscale', label: 'Grayscale' },
      { value: 'blackWhite', label: 'Black and white (scans)' },
    ],
  };

  const updateSetting = <K extends keyof OcrSettings>(key: K, value: OcrSettings[K]) => {
    setSettings(previous => ({ ...previous, [key]: value }));
  };

  const handleExtract = async () => {
    if (!files.length || extracting) return;
    cancelRef.current = false;
    setErrorMessage('');
    setHasResult(false);
    setResultText('');
    setAverageConfidence(null);
    setExtracting(true);
    setProgress({ done: 0, total: 0 });

    const outputs: string[] = [];
    const confidences: number[] = [];
    let completed = 0;

    const finishItem = (fileName: string, result: OcrResult, pageNumber?: number) => {
      const heading = pageNumber
        ? fileName + ' — ' + (es ? 'página ' : 'page ') + pageNumber
        : fileName;
      outputs.push('=== ' + heading + ' ===\n' + result.text);
      confidences.push(result.confidence);
      completed++;
      if (!hasProAccess) setUsed(recordUsage());
      setProgress(previous => ({ done: completed, total: previous.total }));
    };

    try {
      const jobs: Job[] = [];
      let wanted = 0;
      for (const item of files) {
        if (!isPdf(item.file)) {
          jobs.push({ file: item.file });
          wanted++;
        } else {
          const { getOcrPdfPageCount, selectPdfPages } = await import('@/tools/ocrPdf');
          const pages = selectPdfPages(pdfPageRange, await getOcrPdfPageCount(item.file));
          jobs.push({ file: item.file, pages });
          wanted += pages.length;
        }
        if (wanted > MAX_ITEMS_PER_JOB) throw new Error(ui.batchLimit);
      }

      setUsed(readUsage());
      if (!hasProAccess && readUsage() + wanted > FREE_PER_DAY) {
        setProModalOpen(true);
        throw new Error(ui.limit + ' ' + (es
          ? 'Selecciona menos imágenes o páginas para usar las que te quedan.'
          : 'Select fewer images or pages to use your remaining allowance.'));
      }
      setProgress({ done: 0, total: wanted });

      for (const job of jobs) {
        if (cancelRef.current) break;
        if (job.pages) {
          const { extractTextFromPdfPages } = await import('@/tools/ocrPdf');
          await extractTextFromPdfPages(
            job.file, job.pages, settings,
            (pageNumber, result) => finishItem(job.file.name, result, pageNumber),
            () => cancelRef.current,
          );
        } else {
          const result = await extractTextFromImage(job.file, settings);
          finishItem(job.file.name, result);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : ui.unknown);
    } finally {
      if (completed) {
        setHasResult(true);
        setResultText(outputs.join('\n\n'));
        setAverageConfidence(confidences.reduce((sum, value) => sum + value, 0) / confidences.length);
      }
      setExtracting(false);
    }
  };

  const handleReset = () => {
    cancelRef.current = false;
    clearFiles();
    setResultText('');
    setHasResult(false);
    setAverageConfidence(null);
    setErrorMessage('');
    setProgress({ done: 0, total: 0 });
    setUsed(readUsage());
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleTxt = () => {
    downloadBlob(new Blob([resultText], { type: 'text/plain;charset=utf-8' }), 'convertmyfilepro-ocr.txt');
  };
  const handleDocx = async () => {
    setExporting(true);
    try {
      const { createOcrDocx } = await import('@/tools/ocrExport');
      downloadBlob(await createOcrDocx(resultText), 'convertmyfilepro-ocr.docx');
    } catch {
      setErrorMessage(es ? 'No se pudo crear el archivo Word.' : 'Could not create the Word document.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SEO
        title={t('tools.ocr.seoTitle')}
        description={t('tools.ocr.seoDescription')}
        keywords={['ocr', 'image to text', 'scanned PDF OCR', 'text recognition']}
      />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-[var(--color-text)] md:text-4xl">
            {t('tools.ocr.title')}
          </h1>
          <p className="text-lg text-[var(--color-muted)]">{ui.intro}</p>
        </div>
        <Card className="space-y-5 p-5 shadow-card md:p-8">
          <div className="rounded-lg bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)]">
            {hasProAccess ? (
              <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />{ui.pro}</p>
            ) : (
              <p>{ui.free} <strong>{ui.freeRemaining} {Math.max(0, FREE_PER_DAY - used)} {ui.pagesToday}.</strong></p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">{ui.privacy}</p>
          </div>

          {!hasResult && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block">{ui.language}</Label>
                  <Select value={settings.language} onValueChange={value => updateSetting('language', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{ui.mode}</Label>
                  <Select value={settings.mode} onValueChange={value => updateSetting('mode', value as OcrImageMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ui.modeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{ui.processing}</Label>
                  <Select value={settings.preprocessing} onValueChange={value => updateSetting('preprocessing', value as OcrImageProcessing)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ui.processingOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{ui.rotation}</Label>
                  <Select value={String(settings.rotation)} onValueChange={value => updateSetting('rotation', Number(value) as OcrRotation)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0°</SelectItem>
                      <SelectItem value="90">90°</SelectItem>
                      <SelectItem value="180">180°</SelectItem>
                      <SelectItem value="270">270°</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="ocr-pdf-range" className="mb-2 block">{ui.pages}</Label>
                <input
                  id="ocr-pdf-range"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3"
                  placeholder="1-3,5"
                  value={pdfPageRange}
                  onChange={event => setPdfPageRange(event.target.value)}
                  disabled={extracting}
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{ui.pageHelp}</p>
              </div>

              <DropZone
                files={files}
                onFilesAdd={addFiles}
                onFileRemove={removeFile}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                accept="image/*,application/pdf"
                multiple
                maxSizeMB={20}
                error={error}
              />
              <p className="text-xs text-[var(--color-muted)]">{ui.fileHelp}</p>

              {files.length > 0 && (
                <div className="space-y-2">
                  {extracting && (
                    <p className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {ui.extracting}: {progress.done}/{progress.total || '…'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => void handleExtract()}
                      disabled={extracting}
                      className="flex-1 bg-[var(--color-accent)] text-white"
                    >
                      {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                      {ui.start}
                    </Button>
                    {extracting ? (
                      <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
                        <X className="mr-2 h-4 w-4" />{ui.stop}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" />{t('common.clear')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {errorMessage && (
            <p role="alert" className="rounded-lg border border-amber-300 p-3 text-sm text-amber-700 dark:text-amber-300">
              {errorMessage}
            </p>
          )}

          {hasResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{ui.result}</h2>
                {averageConfidence !== null && (
                  <span className="text-xs text-[var(--color-muted)]">
                    {ui.confidence}: {averageConfidence.toFixed(1)}%
                  </span>
                )}
              </div>
              <Textarea
                value={resultText}
                onChange={event => setResultText(event.target.value)}
                rows={13}
                className="font-mono text-sm"
                aria-label={ui.result}
              />
              {!resultText.trim() && <p className="text-sm text-amber-700">{ui.empty}</p>}
              <p className="text-xs text-[var(--color-muted)]">
                {ui.complete}: {progress.done}/{progress.total}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleCopy()} variant="outline" disabled={!resultText.trim()}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{ui.copy}
                </Button>
                <Button onClick={handleTxt} variant="outline" disabled={!resultText.trim()}>
                  <Download className="mr-2 h-4 w-4" />{ui.txt}
                </Button>
                <Button onClick={() => void handleDocx()} variant="outline" disabled={!resultText.trim() || exporting}>
                  {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {ui.docx}
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />{ui.again}
              </Button>
            </div>
          )}
        </Card>
        <FAQ />
        <ProModal open={proModalOpen} onOpenChange={setProModalOpen} trigger="ocr" />
      </div>
    </>
  );
};
export default OcrTool;
