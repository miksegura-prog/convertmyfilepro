import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';

import {
  editPdf,
  addTextToPdf,
  verifyPdfBytes,
  checkEditOverflow,
  type AddedText,
  type AddedTextFont,
  type OverflowInfo,
} from '@/lib/pdf-studio/pdfEditEngine';
import { SEO } from '@/components/ui-custom/SEO';
import { DropZone } from '@/components/ui-custom/DropZone';
import { FAQ } from '@/components/ui-custom/FAQ';
import { useFileUpload } from '@/hooks/useFileUpload';
import { downloadBlob, readFileAsArrayBuffer } from '@/utils/fileHelpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Download,
  Undo2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  MousePointer2,
  Type,
  Pencil,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';

// Carga del worker de PDF.js (el archivo se copia junto al bundle por Vite).
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_MB = 50;

interface AppliedEdit {
  id: number;
  page: number; // 1-based (solo para mostrar)
  find: string;
  replace: string;
  count: number;
}

// Texto libre añadido (coordenadas en puntos de PDF, origen inferior-izquierda).
// `page` es 0-based para el motor; en pantalla se muestra como la página del visor.
interface TextAnnotation {
  id: number;
  page: number; // 0-based
  x: number;
  y: number;
  size: number;
  text: string;
  font: AddedTextFont;
  color: string; // hex '#RRGGBB'
}

// Fuentes estándar disponibles para el texto añadido (PDF Studio Beta).
const FONT_OPTIONS: Array<{ value: AddedTextFont; labelKey: string }> = [
  { value: 'helvetica', labelKey: 'helvetica' },
  { value: 'helvetica-bold', labelKey: 'helveticaBold' },
  { value: 'times-roman', labelKey: 'times' },
  { value: 'times-roman-bold', labelKey: 'timesBold' },
  { value: 'courier', labelKey: 'courier' },
  { value: 'courier-bold', labelKey: 'courierBold' },
];

// Familia CSS equivalente para la vista previa WYSIWYG en el visor.
const FONT_FAMILY_CSS: Record<AddedTextFont, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  'helvetica-bold': 'Helvetica, Arial, sans-serif',
  'times-roman': '"Times New Roman", Times, serif',
  'times-roman-bold': '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
  'courier-bold': '"Courier New", Courier, monospace',
};

const FONT_WEIGHT_CSS: Record<AddedTextFont, number> = {
  helvetica: 400,
  'helvetica-bold': 700,
  'times-roman': 400,
  'times-roman-bold': 700,
  courier: 400,
  'courier-bold': 700,
};

// Convierte un color '#RRGGBB' a RGB en 0..1 para el motor.
const hexToRgb01 = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};

// La capa de texto de PDF.js une fragmentos con espacios según posición;
// los saltos de línea/tabuladores no existen en el content stream, así que se
// normalizan a un único espacio antes de intentar la búsqueda.
const normalizeSelection = (raw: string): string => raw.replace(/[\r\n\t]+/g, ' ').trim();

// Captura SOLO la línea donde empieza la selección (la fila del ancla). Así una
// selección nueva sustituye por completo a la anterior y nunca se acumulan líneas
// de otras partes del documento en el campo «Texto original».
const captureSelectionText = (): string => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0);
  const viewer = document.querySelector('.pdf-studio-viewer');
  if (!viewer || !viewer.contains(range.commonAncestorContainer)) return '';

  const spans: HTMLElement[] = [];
  const walker = document.createTreeWalker(viewer, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement;
      if (el.tagName === 'SPAN' && el.closest('.textLayer') && range.intersectsNode(el)) {
        return NodeFilter.FILTER_ACCEPT;
      }
      // FILTER_SKIP: bajar a los hijos (p. ej. adentrarse en `.textLayer`).
      return NodeFilter.FILTER_SKIP;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) spans.push(n as HTMLElement);
  if (spans.length === 0) return '';

  spans.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );

  const startEl =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? (range.startContainer.parentElement as HTMLElement)
      : (range.startContainer as HTMLElement);
  const anchorTop = startEl.getBoundingClientRect().top;

  // Solo la fila del ancla: evita acumular líneas de otras filas.
  const lineSpans = spans.filter((s) => Math.abs(s.getBoundingClientRect().top - anchorTop) < 4);
  if (lineSpans.length === 0) return '';

  const parts: string[] = [];
  for (const span of lineSpans) {
    const textNodes: Text[] = [];
    const tw = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let tn: Node | null;
    while ((tn = tw.nextNode())) textNodes.push(tn as Text);
    for (const tnode of textNodes) {
      if (!range.intersectsNode(tnode)) continue;
      let start = 0;
      let end = tnode.data.length;
      if (range.startContainer === tnode) start = range.startOffset;
      if (range.endContainer === tnode) end = range.endOffset;
      parts.push(tnode.data.slice(Math.min(start, end), Math.max(start, end)));
    }
  }
  return normalizeSelection(parts.join(''));
};

const PdfStudioEdit: React.FC = () => {
  const { t } = useTranslation();
  const { files, isDragging, error, addFiles, clearFiles, setIsDragging } = useFileUpload({
    maxFiles: 1,
    maxSizeMB: MAX_FILE_MB,
    allowedTypes: ['application/pdf'],
    multiple: false,
  });

  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pageDimsRef = useRef<{ widthPts: number; heightPts: number; scale: number }>({
    widthPts: 0,
    heightPts: 0,
    scale: 1,
  });
  const renderSeqRef = useRef(0);
  const editIdRef = useRef(0);
  const addIdRef = useRef(0);
  const dragRef = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  // Selección guardada: independiente del Selection API del navegador, para que no
  // se borre cuando el usuario interactúa con inputs, botones o el panel lateral.
  const selectionRef = useRef<{ text: string; page: number } | null>(null);
  const pageNumRef = useRef(1);
  const addModeRef = useRef(false);

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [docVersion, setDocVersion] = useState(0);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [applying, setApplying] = useState(false);
  const [appliedEdits, setAppliedEdits] = useState<AppliedEdit[]>([]);
  const [historyStack, setHistoryStack] = useState<Uint8Array[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingTexts, setSavingTexts] = useState(false);
  // Tipografía por defecto para el texto nuevo (se aplica al hacer clic en el visor).
  const [defaultFont, setDefaultFont] = useState<AddedTextFont>('helvetica');
  const [defaultSize, setDefaultSize] = useState(14);
  const [defaultColor, setDefaultColor] = useState('#000000');
  // Advertencia de desbordamiento: se pide confirmación antes de aplicar.
  const [pendingOverflow, setPendingOverflow] = useState<{
    find: string;
    replace: string;
    selPage: number;
    info: OverflowInfo;
  } | null>(null);

  const loadPdf = useCallback(
    async (data: Uint8Array) => {
      const old = pdfDocRef.current;
      pdfDocRef.current = null;
      renderSeqRef.current += 1;
      if (old) {
        try { await old.loadingTask.destroy(); } catch { /* noop */ }
      }
      setLoadingDoc(true);
      setErrorMsg(null);
      try {
        // IMPORTANTE: PDF.js transfiere (detach) el ArrayBuffer de `data` al worker
        // (`GetDocRequest` usa `[data.buffer]` como transfer list). Si le pasamos el
        // búfer de estado, lo deja vacío y `editPdf()` recibe 0 bytes
        // ("No PDF header found"). Se le entrega una COPIA y el estado conserva los
        // bytes originales.
        const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setPageNum(1);
        setBytes(data);
        setDocVersion((v) => v + 1);
      } catch (err) {
        setErrorMsg(
          t('tools.pdfStudioEdit.errors.load', {
            message: String((err as Error)?.message || err),
          })
        );
      } finally {
        setLoadingDoc(false);
      }
    },
    [t]
  );

  // Sincroniza refs que se leen desde listeners (para no clausurar valores obsoletos).
  useEffect(() => { pageNumRef.current = pageNum; }, [pageNum]);
  useEffect(() => { addModeRef.current = addMode; }, [addMode]);

  // Captura la selección real del usuario DENTRO de la capa de texto del PDF.
  // - Solo se procesa cuando la selección es válida y procede del textLayer.
  // - La selección queda GUARDADA (selectionRef + state) y es independiente del
  //   Selection API del navegador: al hacer clic en un input/botón del panel el
  //   navegador colapsa la selección (captureSelectionText() devuelve ''), pero aquí
  //   eso se IGNORA, de modo que el texto original no desaparece.
  useEffect(() => {
    const handler = () => {
      if (addModeRef.current) return; // en modo AÑADIR no se captura selección
      const text = captureSelectionText();
      if (text) {
        setSelectedText(text);
        selectionRef.current = { text, page: pageNumRef.current };
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  const handleClearSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    selectionRef.current = null;
    setSelectedText('');
    setReplaceText('');
    setPendingOverflow(null);
  }, []);

  // Renderiza la página actual (canvas + capa de texto seleccionable).
  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    if (!doc || !canvas || !textLayer) return;
    const seq = ++renderSeqRef.current;
    let cancelled = false;

    (async () => {
      const page = await doc.getPage(pageNum);
      if (cancelled || seq !== renderSeqRef.current) { page.cleanup(); return; }
      const viewport = page.getViewport({ scale: zoom });
      pageDimsRef.current = {
        scale: viewport.scale || zoom,
        widthPts: viewport.width / (viewport.scale || zoom),
        heightPts: viewport.height / (viewport.scale || zoom),
      };
      const w = Math.floor(viewport.width);
      const h = Math.floor(viewport.height);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      textLayer.innerHTML = '';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
      await renderTask.promise;
      if (cancelled || seq !== renderSeqRef.current) return;
      const textContent = await page.getTextContent();
      if (cancelled || seq !== renderSeqRef.current) return;
      // La capa de texto de PDF.js se dimensiona y posiciona con estas variables
      // (misma escala y origen de coordenadas que el canvas).
      textLayer.style.setProperty('--total-scale-factor', String(viewport.scale));
      textLayer.style.setProperty('--scale-round-x', '1px');
      textLayer.style.setProperty('--scale-round-y', '1px');
      const layer = new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport,
      });
      await layer.render();
      page.cleanup();
    })().catch((err) => {
      if (cancelled) return;
      console.error('[pdf-studio] render error', err);
    });

    return () => { cancelled = true; };
  }, [docVersion, pageNum, zoom]);

  // Destruye el documento PDF.js al desmontar.
  useEffect(
    () => () => {
      renderSeqRef.current += 1;
      const doc = pdfDocRef.current;
      if (doc) { void doc.loadingTask.destroy().catch(() => { /* noop */ }); }
    },
    []
  );

  const mapError = useCallback(
    (msg: string): string => {
      if (msg.includes('no se encontró')) return t('tools.pdfStudioEdit.errors.notFound');
      if (msg.includes('glifo no disponible')) {
        const m = msg.match(/"([^"]+)"/);
        return t('tools.pdfStudioEdit.errors.subsetGlyph', { glyph: m ? m[1] : '' });
      }
      if (msg.includes('WinAnsi')) {
        const m = msg.match(/U\+([0-9A-Fa-f]+)/);
        return t('tools.pdfStudioEdit.errors.winAnsi', {
          glyph: m ? String.fromCodePoint(parseInt(m[1], 16)) : '',
        });
      }
      if (msg.includes('inexistente')) return t('tools.pdfStudioEdit.errors.pageMissing');
      return t('tools.pdfStudioEdit.errors.generic', { message: msg });
    },
    [t]
  );

  // Núcleo de la sustitución: aplica el cambio real y actualiza visor/estado.
  const applySubstitution = useCallback(
    async (find: string, replace: string, selPage: number) => {
      if (!bytes || !find || !replace) return;
      setApplying(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        const result = await editPdf(bytes, [{ page: selPage - 1, find, replace }], () => {});
        const entry = result.applied[0];
        if (entry && entry.count > 0 && !entry.error) {
          // Verificación REAL del resultado: el PDF editado debe volver a abrirse.
          const ok = await verifyPdfBytes(result.bytes);
          if (!ok) {
            setErrorMsg(t('tools.pdfStudioEdit.errors.unverifiable'));
            return;
          }
          setHistoryStack((prev) => [...prev, bytes]);
          editIdRef.current += 1;
          setAppliedEdits((prev) => [
            ...prev,
            { id: editIdRef.current, page: selPage, find, replace, count: entry.count },
          ]);
          setSuccessMsg(t('tools.pdfStudioEdit.success', { count: entry.count }));
          setSelectedText('');
          setReplaceText('');
          selectionRef.current = null;
          await loadPdf(result.bytes);
        } else if (entry?.error) {
          // Mostrar el error real del motor (además del mensaje amigable).
          const localized = mapError(entry.error);
          setErrorMsg(`${localized} · [motor] ${entry.error}`);
        } else {
          setErrorMsg(mapError('no se encontró el texto con la codificación esperada'));
        }
      } catch (err) {
        const raw = String((err as Error)?.message || err);
        setErrorMsg(`${mapError(raw)} · [motor] ${raw}`);
      } finally {
        setApplying(false);
      }
    },
    [bytes, loadPdf, mapError, t],
  );

  const handleApply = useCallback(async () => {
    // Usa la selección GUARDADA (independiente del Selection API del navegador).
    if (addMode) return; // no se aplica sustitución en modo AÑADIR
    const saved = selectionRef.current;
    const src = (saved?.text ?? selectedText).trim();
    const selPage = saved?.page ?? pageNum;
    const replace = replaceText.trim();
    if (!bytes || !src || !replace) return;
    const find = src;
    if (find === replace) {
      setErrorMsg(t('tools.pdfStudioEdit.noChange'));
      setSuccessMsg(null);
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    // Advertencia ANTES de aplicar: si el reemplazo supera el ancho disponible o
    // podría invadir el margen de la página, se pide confirmación explícita.
    try {
      const info = await checkEditOverflow(bytes, { page: selPage - 1, find, replace });
      if (info) {
        setPendingOverflow({ find, replace, selPage, info });
        return;
      }
    } catch {
      /* si no se puede estimar el ancho, se continúa con la aplicación normal */
    }
    await applySubstitution(find, replace, selPage);
  }, [addMode, bytes, pageNum, selectedText, replaceText, applySubstitution, t]);

  const confirmOverflowApply = useCallback(async () => {
    if (!pendingOverflow) return;
    const p = pendingOverflow;
    setPendingOverflow(null);
    await applySubstitution(p.find, p.replace, p.selPage);
  }, [pendingOverflow, applySubstitution]);

  const cancelOverflowApply = useCallback(() => setPendingOverflow(null), []);

  /* ------- texto libre (añadir / mover / editar / eliminar) ------- */
  const handleToggleAddMode = useCallback(() => {
    setAddMode((m) => !m);
    setSelectedId(null);
    setEditingId(null);
    setPendingOverflow(null);
  }, []);

  // Coloca una nueva anotación de texto en el punto del clic (coordenadas en puntos).
  const handleViewerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!addMode) return;
      const dims = pageDimsRef.current;
      const wrapper = wrapperRef.current;
      if (!wrapper || dims.scale <= 0) return;
      const rect = wrapper.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
      // Conversión pantalla → puntos usando el zoom actual (viewport de PDF.js).
      const x = px / zoom;
      const y = dims.heightPts - py / zoom;
      addIdRef.current += 1;
      const ann: TextAnnotation = {
        id: addIdRef.current,
        page: pageNum - 1,
        x,
        y,
        size: defaultSize,
        text: '',
        font: defaultFont,
        color: defaultColor,
      };
      setAnnotations((list) => [...list, ann]);
      setSelectedId(ann.id);
      setEditingId(ann.id);
    },
    [addMode, pageNum, zoom, defaultSize, defaultFont, defaultColor],
  );

  const startEditing = useCallback((id: number) => setEditingId(id), []);

  const handleUpdateText = useCallback((id: number, text: string) => {
    setAnnotations((list) => list.map((a) => (a.id === id ? { ...a, text } : a)));
  }, []);

  // Actualiza la tipografía (fuente, tamaño, color) de un texto añadido.
  const handleUpdateStyle = useCallback(
    (id: number, patch: Partial<Pick<TextAnnotation, 'size' | 'font' | 'color'>>) => {
      setAnnotations((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [],
  );

  const handleDeleteAnnotation = useCallback((id: number) => {
    setAnnotations((list) => list.filter((a) => a.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
    setEditingId((cur) => (cur === id ? null : cur));
  }, []);

  // Termina la edición en línea (p. ej. al teclear Enter o pulsar Confirmar).
  const confirmEditing = useCallback((id: number) => {
    setEditingId((cur) => (cur === id ? null : cur));
  }, []);

  // Arrastrar para mover + toque (clic sin arrastre) para seleccionar/editar.
  // Umbral de 3px: un clic sin mover selecciona el texto y abre la edición en línea.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: ann.x, origY: ann.y, moved: false };
      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        if (!d.moved && Math.abs(ev.clientX - d.startX) + Math.abs(ev.clientY - d.startY) > 3) {
          d.moved = true;
        }
        if (d.moved) {
          const dx = (ev.clientX - d.startX) / zoom;
          const dy = (ev.clientY - d.startY) / zoom;
          setAnnotations((list) =>
            list.map((a) => (a.id === d.id ? { ...a, x: d.origX + dx, y: d.origY - dy } : a)),
          );
        }
      };
      const onUp = () => {
        const d = dragRef.current;
        if (d && !d.moved) {
          setSelectedId(d.id);
          setEditingId(d.id);
        }
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [annotations, zoom],
  );

  const handleSaveTexts = useCallback(async () => {
    const pending = annotations.filter((a) => a.text.trim() !== '');
    if (!bytes || pending.length === 0) return;
    setSavingTexts(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const addedTexts: AddedText[] = pending.map((a) => ({
        page: a.page,
        text: a.text,
        x: a.x,
        y: a.y,
        size: a.size,
        font: a.font,
        color: hexToRgb01(a.color),
      }));
      const result = await addTextToPdf(bytes, addedTexts, () => {});
      const ok = await verifyPdfBytes(result.bytes);
      if (!ok) {
        setErrorMsg(t('tools.pdfStudioEdit.errors.unverifiable'));
        return;
      }
      setHistoryStack((prev) => [...prev, bytes]);
      setAnnotations([]);
      setSelectedId(null);
      setEditingId(null);
      setAddMode(false);
      setSuccessMsg(t('tools.pdfStudioEdit.textsAdded', { count: result.added }));
      await loadPdf(result.bytes);
    } catch (err) {
      const raw = String((err as Error)?.message || err);
      setErrorMsg(`${mapError(raw)} · [motor] ${raw}`);
    } finally {
      setSavingTexts(false);
    }
  }, [bytes, annotations, loadPdf, mapError, t]);

  const handleUndo = useCallback(async () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setHistoryStack((stack) => stack.slice(0, -1));
    setAppliedEdits((edits) => edits.slice(0, -1));
    setErrorMsg(null);
    setSuccessMsg(null);
    await loadPdf(prev);
  }, [historyStack, loadPdf]);

  const handleDownload = useCallback(() => {
    if (!bytes) return;
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const base = (fileName || 'document').replace(/\.pdf$/i, '');
    downloadBlob(blob, `${base}-edited.pdf`);
  }, [bytes, fileName]);

  const handleFilesAdd = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const f = list[0];
await addFiles(list);
      if (!f || !f.type.includes('pdf')) return;
      if (f.size > MAX_FILE_MB * 1024 * 1024) return;
      try {
        const buf = await readFileAsArrayBuffer(f);
        setFileName(f.name);
        // PDF nuevo → reiniciar selección, textos pendientes y avisos.
        setSelectedText('');
        setReplaceText('');
        selectionRef.current = null;
        setAnnotations([]);
        setSelectedId(null);
        setEditingId(null);
        setAddMode(false);
        setPendingOverflow(null);
        await loadPdf(new Uint8Array(buf));
      } catch (err) {
        setErrorMsg(
          t('tools.pdfStudioEdit.errors.load', {
            message: String((err as Error)?.message || err),
          })
        );
      }
    },
    [addFiles, loadPdf, t]
  );

  const handleReset = useCallback(async () => {
    renderSeqRef.current += 1;
    const old = pdfDocRef.current;
    pdfDocRef.current = null;
    if (old) {
      try { await old.loadingTask.destroy(); } catch { /* noop */ }
    }
    setBytes(null);
    setNumPages(0);
    setPageNum(1);
    setZoom(1);
    setSelectedText('');
    setReplaceText('');
    selectionRef.current = null;
    setAppliedEdits([]);
    setHistoryStack([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setFileName('');
    setAddMode(false);
    setAnnotations([]);
    setSelectedId(null);
    setEditingId(null);
    setPendingOverflow(null);
    clearFiles();
  }, [clearFiles]);

  const canApply =
    bytes !== null && !addMode && selectedText.trim() !== '' && replaceText.trim() !== '' && !applying;

  // Anotación seleccionada en el visor (para editar su tipografía en el panel).
  const selectedAnnotation = annotations.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      <SEO
        title={t('tools.pdfStudioEdit.seoTitle')}
        description={t('tools.pdfStudioEdit.seoDescription')}
        keywords={['edit pdf text', 'pdf text editor online', 'edit pdf free', 'modify pdf text', 'pdf studio']}
        canonical="https://convertmyfilepro.com/pdf-studio/edit"
        noindex
      />

      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text)]">
              {t('tools.pdfStudioEdit.title')}
            </h1>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {t('tools.pdfStudioEdit.betaBadge')}
            </span>
          </div>
          <p className="text-[var(--color-muted)] text-lg max-w-2xl mx-auto">
            {t('tools.pdfStudioEdit.description')}
          </p>
          <p className="mt-3 mx-auto max-w-2xl text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            {t('tools.pdfStudioEdit.betaNotice')}
          </p>
        </div>

        {!bytes ? (
          <Card className="p-6 md:p-10 shadow-card">
            <div className="max-w-xl mx-auto">
              <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4 text-center">
                {t('tools.pdfStudioEdit.uploadTitle')}
              </h2>
              <DropZone
                files={files}
                onFilesAdd={handleFilesAdd}
                onFileRemove={() => clearFiles()}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                accept="application/pdf"
                multiple={false}
                error={error}
              />

{loadingDoc && (
  <div className="mt-4 text-center text-sm text-blue-600">
    Abriendo documento PDF...
  </div>
)}

{errorMsg && (
  <div
    role="alert"
    className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700"
  >
    <strong>Error al abrir el PDF:</strong>
    <p className="mt-2">{errorMsg}</p>
  </div>
)}
              <p className="mt-4 text-xs text-[var(--color-muted)] text-center">
                {t('tools.pdfStudioEdit.notes')}
              </p>
              <p className="mt-2 text-xs text-[var(--color-muted)] text-center">
                {t('tools.pdfStudioEdit.limitations')}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Columna visor */}
            <div>
              <Card className="p-3 mb-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <FileText className="w-4 h-4 mr-2" />
                    {t('tools.pdfStudioEdit.openPdf')}
                  </Button>

                  <Button
                    size="sm"
                    variant={addMode ? 'default' : 'outline'}
                    onClick={handleToggleAddMode}
                    className={
                      addMode
                        ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white'
                        : ''
                    }
                  >
                    <Type className="w-4 h-4 mr-2" />
                    {t('tools.pdfStudioEdit.addText')}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pageNum <= 1}
                      onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-[var(--color-muted)] px-1 min-w-[80px] text-center">
                      {t('tools.pdfStudioEdit.page', { page: pageNum, count: numPages })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pageNum >= numPages}
                      onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-[var(--color-muted)] w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyStack.length === 0}
                      onClick={handleUndo}
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      {t('tools.pdfStudioEdit.undo')}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('tools.pdfStudioEdit.download')}
                    </Button>
                  </div>
                </div>
              </Card>


              <div className="pdf-studio-viewer overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] max-h-[75vh]">
                {loadingDoc && (
                  <div className="flex items-center justify-center gap-2 p-10 text-[var(--color-primary)]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('tools.pdfStudioEdit.applying')}</span>
                  </div>
                )}
                <div className="w-fit mx-auto p-4">
                  <div
                    ref={wrapperRef}
                    onClick={handleViewerClick}
                    className={addMode ? 'relative cursor-crosshair' : 'relative'}
                  >
                    <canvas ref={canvasRef} className="block max-w-none shadow-lg rounded-sm" />
                    {/* `textLayer` (css de pdfjs-dist): absoluta, inset:0, superpuesta al canvas */}
                    <div ref={textLayerRef} className="textLayer" />

                    {/* Overlay de textos añadidos: vista previa WYSIWYG anclada al PDF.
                        Posición (left/top) = puntos × escala del viewport de PDF.js,
                        sin offsets CSS improvisados; se mantiene al hacer zoom,
                        desplazar o navegar entre páginas. */}
                    {annotations
                      .filter((a) => a.page === pageNum - 1)
                      .map((a) => {
                        // Escala síncrona (zoom) para que el overlay rescale al instante al hacer zoom.
                        const fontSize = a.size * zoom;
                        const left = a.x * zoom;
                        const top = (pageDimsRef.current.heightPts - a.y) * zoom;
                        const selected = selectedId === a.id;
                        const editing = editingId === a.id;
                        return (
                          <div
                            key={a.id}
                            onPointerDown={(e) => handlePointerDown(e, a.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ left, top, touchAction: 'none' }}
                            className="absolute z-20 select-none cursor-move"
                          >
                            {editing ? (
                              <div className="flex items-start" style={{ fontSize, lineHeight: 1.2 }}>
                                <textarea
                                  autoFocus
                                  rows={1}
                                  value={a.text}
                                  onChange={(e) => handleUpdateText(a.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      confirmEditing(a.id);
                                    }
                                  }}
                                  onBlur={() => confirmEditing(a.id)}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  style={{
                                    fontSize,
                                    lineHeight: 1.2,
                                    fontFamily: FONT_FAMILY_CSS[a.font],
                                    fontWeight: FONT_WEIGHT_CSS[a.font],
                                    color: a.color,
                                  }}
                                  className="block w-56 resize-none rounded-sm border border-blue-400 bg-white/70 p-0.5 outline-none"
                                  placeholder={t('tools.pdfStudioEdit.editText')}
                                />
                                <button
                                  type="button"
                                  title={t('tools.pdfStudioEdit.saveTexts')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmEditing(a.id);
                                  }}
                                  className="ml-1 rounded border border-green-500 bg-green-100 p-0.5 text-green-700"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={selected ? 'rounded-sm outline outline-1 outline-blue-400' : ''}
                                style={{ fontSize, lineHeight: 1.2 }}
                              >
                                {/* Vista previa real del texto, sin etiqueta ni caja azul */}
                                <span
                                  className="whitespace-pre"
                                  style={{
                                    fontFamily: FONT_FAMILY_CSS[a.font],
                                    fontWeight: FONT_WEIGHT_CSS[a.font],
                                    color: a.color,
                                  }}
                                >
                                  {a.text || '\u00A0'}
                                </span>
                                {/* Controles solo cuando el elemento está seleccionado */}
                                {selected && (
                                  <span className="ml-1 inline-flex items-start align-top">
                                    <button
                                      type="button"
                                      title={t('tools.pdfStudioEdit.editText')}
                                      className="rounded border border-blue-400 bg-white p-0.5 text-blue-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(a.id);
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title={t('tools.pdfStudioEdit.deleteText')}
                                      className="ml-1 rounded border border-red-400 bg-white p-0.5 text-red-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAnnotation(a.id);
                                      }}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-muted)]">
                {addMode ? (
                  <>
                    <Type className="w-4 h-4 flex-shrink-0" />
                    {t('tools.pdfStudioEdit.addTextHint')}
                  </>
                ) : (
                  <>
                    <MousePointer2 className="w-4 h-4 flex-shrink-0" />
                    {t('tools.pdfStudioEdit.selectionHint')}
                  </>
                )}
              </p>
            </div>

            {/* Panel de edición */}
            <div>
              <Card className="p-5 shadow-card lg:sticky lg:top-24">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pdf-studio-selected" className="text-sm font-semibold text-[var(--color-text)]">
                    {t('tools.pdfStudioEdit.selectedText')}
                  </Label>
                  <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                    <XCircle className="w-4 h-4 mr-1" />
                    {t('tools.pdfStudioEdit.clearSelection')}
                  </Button>
                </div>
                {/* Campo de solo lectura: el usuario NO edita el texto original. */}
                <Textarea
                  id="pdf-studio-selected"
                  rows={3}
                  readOnly
                  className="mt-2 read-only:opacity-90"
                  placeholder={t('tools.pdfStudioEdit.selectedTextPlaceholder')}
                  value={selectedText}
                />

                <Label htmlFor="pdf-studio-replace" className="mt-4 block text-sm font-semibold text-[var(--color-text)]">
                  {t('tools.pdfStudioEdit.replaceLabel')}
                </Label>
                <Input
                  id="pdf-studio-replace"
                  className="mt-2"
                  placeholder={t('tools.pdfStudioEdit.replacePlaceholder')}
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                />

                <Button
                  className="mt-4 w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white font-semibold"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('tools.pdfStudioEdit.applying')}
                    </>
                  ) : (
                    t('tools.pdfStudioEdit.apply')
                  )}
                </Button>

                {pendingOverflow && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-sm text-amber-700 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold">{t('tools.pdfStudioEdit.overflowTitle')}</p>
                        <p className="mt-1">
                          {pendingOverflow.info.kind === 'page'
                            ? t('tools.pdfStudioEdit.overflowPageMessage', {
                                end: Math.round(pendingOverflow.info.estimatedNewEnd),
                                width: Math.round(pendingOverflow.info.pageWidth),
                              })
                            : t('tools.pdfStudioEdit.overflowLineMessage')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
                            onClick={confirmOverflowApply}
                          >
                            {t('tools.pdfStudioEdit.applyAnyway')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelOverflowApply}>
                            {t('tools.pdfStudioEdit.cancelOverflow')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {errorMsg && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {t('tools.pdfStudioEdit.typographyTitle')}
                  </h3>
                  {selectedAnnotation ? (
                    <div className="mt-2 space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-[var(--color-muted)]">
                          {t('tools.pdfStudioEdit.font')}
                        </Label>
                        <Select
                          value={selectedAnnotation.font}
                          onValueChange={(v) => handleUpdateStyle(selectedAnnotation.id, { font: v as AddedTextFont })}
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(`tools.pdfStudioEdit.fonts.${opt.labelKey}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-medium text-[var(--color-muted)]">
                            {t('tools.pdfStudioEdit.fontSize')}
                          </Label>
                          <Input
                            type="number"
                            min={4}
                            max={200}
                            className="mt-1 h-8 text-sm"
                            value={selectedAnnotation.size}
                            onChange={(e) =>
                              handleUpdateStyle(selectedAnnotation.id, {
                                size: Math.max(4, Math.min(200, Number(e.target.value) || 4)),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-[var(--color-muted)]">
                            {t('tools.pdfStudioEdit.color')}
                          </Label>
                          <input
                            type="color"
                            aria-label={t('tools.pdfStudioEdit.color')}
                            className="mt-1 h-8 w-full cursor-pointer rounded-md border border-[var(--color-border)] bg-transparent p-0.5"
                            value={selectedAnnotation.color}
                            onChange={(e) => handleUpdateStyle(selectedAnnotation.id, { color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-3">
                      <p className="text-xs text-[var(--color-muted)]">
                        {t('tools.pdfStudioEdit.defaultTypographyHint')}
                      </p>
                      <div>
                        <Label className="text-xs font-medium text-[var(--color-muted)]">
                          {t('tools.pdfStudioEdit.font')}
                        </Label>
                        <Select value={defaultFont} onValueChange={(v) => setDefaultFont(v as AddedTextFont)}>
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(`tools.pdfStudioEdit.fonts.${opt.labelKey}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-medium text-[var(--color-muted)]">
                            {t('tools.pdfStudioEdit.fontSize')}
                          </Label>
                          <Input
                            type="number"
                            min={4}
                            max={200}
                            className="mt-1 h-8 text-sm"
                            value={defaultSize}
                            onChange={(e) => setDefaultSize(Math.max(4, Math.min(200, Number(e.target.value) || 4)))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-[var(--color-muted)]">
                            {t('tools.pdfStudioEdit.color')}
                          </Label>
                          <input
                            type="color"
                            aria-label={t('tools.pdfStudioEdit.color')}
                            className="mt-1 h-8 w-full cursor-pointer rounded-md border border-[var(--color-border)] bg-transparent p-0.5"
                            value={defaultColor}
                            onChange={(e) => setDefaultColor(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {t('tools.pdfStudioEdit.editsTitle')}
                  </h3>
                  {appliedEdits.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {t('tools.pdfStudioEdit.noEdits')}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {appliedEdits.map((ed) => (
                        <li
                          key={ed.id}
                          className="text-sm p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
                        >
                          <p className="font-medium text-[var(--color-text)] truncate">
                            {ed.find} <span aria-hidden>→</span> {ed.replace}
                          </p>
                          <p className="text-xs text-[var(--color-muted)]">
                            {t('tools.pdfStudioEdit.editCount', { count: ed.count, page: ed.page })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {t('tools.pdfStudioEdit.annotationsTitle')}
                  </h3>
                  {annotations.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {t('tools.pdfStudioEdit.noAnnotations')}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {annotations.map((a) => (
                        <li
                          key={a.id}
                          className="text-sm p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
                        >
                          <p className="font-medium text-[var(--color-text)] truncate">
                            {a.text.trim() || t('tools.pdfStudioEdit.editText')}
                          </p>
                          <p className="text-xs text-[var(--color-muted)]">
                            Página {a.page + 1}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(a.id)}
                            >
                              {t('tools.pdfStudioEdit.editText')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAnnotation(a.id)}
                            >
                              {t('tools.pdfStudioEdit.deleteText')}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="mt-3 w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white font-semibold"
                    disabled={savingTexts || annotations.length === 0}
                    onClick={handleSaveTexts}
                  >
                    {savingTexts ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {t('tools.pdfStudioEdit.applying')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t('tools.pdfStudioEdit.saveTexts')}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        <FAQ />
      </div>
    </>
  );
};

export default PdfStudioEdit;

