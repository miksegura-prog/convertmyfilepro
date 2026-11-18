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

/** OCR: Free limita a 2 operaciones por sesión; PRO no tiene ese tope. */
export const FREE_OCR_PAGES = 2;
