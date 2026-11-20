/**
 * Datos comerciales verificados de ConvertMyFilePro PRO.
 *
 * - Enlace de Stripe actual: suscripción anual (price_1UanG9FA6QOCRduX1ERV4nPj),
 *   5,99 EUR / año, producto «ConvertMyFilePro PRO (Annual / Anual)».
 * - No modificar el producto ni el precio aquí: esta constante solo enlaza.
 * - Los límites reflejan lo realmente implementado en la app; si cambian en el
 *   código, actualizar también este archivo para no anunciar prestaciones falsas.
 */
export const PRO_PAYMENT_LINK = 'https://buy.stripe.com/8x214nfpg8CaeL0bFy2Ry08';

/** Precio verificado en Stripe Checkout (EUR, facturación anual). */
export const PRO_PRICE_EUR = 5.99;

/** Archivos por lote: Free = 3, PRO = máximo configurado por herramienta (20). */
export const FREE_BATCH_FILES = 3;
export const PRO_BATCH_FILES = 20;

/** Tamaño máximo de archivo para compresión de vídeo en Free y PRO: 50 MB. */
export const FREE_VIDEO_MB = 50;
export const PRO_FILE_SIZE_MB = 50;

/** OCR: 5 imágenes o páginas al día en Free; PRO sin límite diario. Mismas funciones/calidad. */
export const FREE_OCR_PAGES = 5;


// Black Friday 2026 introductory discount: €2 off the FIRST annual invoice.
// Stripe LIVE coupon CMFP_BF_2026_FIRST_YEAR, promotion code BLACKFRIDAY2026.
// Regular annual subscription price and renewal remain €5.99 before tax.
// Valid through 30 Nov 2026 23:59:59 Europe/Madrid (23:00:00 UTC on Nov 30).
export const BLACK_FRIDAY_CODE = 'BLACKFRIDAY2026';
export const BLACK_FRIDAY_FIRST_YEAR_EUR = 3.99;
export const BLACK_FRIDAY_END_UTC = Date.UTC(2026, 10, 30, 23, 0, 0);
export const isBlackFridayActive = () => Date.now() < BLACK_FRIDAY_END_UTC;
