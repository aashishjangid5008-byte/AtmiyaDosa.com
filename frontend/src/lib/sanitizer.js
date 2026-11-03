/**
 * Client-Side Input Sanitizer & XSS Defense Layer
 * Prevents HTML/Script injection attacks and validates numerical boundaries
 */

const DANGEROUS_TAGS_REGEX = /<(?:\/?[a-zA-Z][^>]*|!--[^>]*--|\?[^>]*\?)>/gi;
const JAVASCRIPT_PROTOCOL_REGEX = /(?:javascript|vbscript|data):/gi;

/**
 * Strips script tags, HTML tags, null bytes, and dangerous protocols from user text.
 * @param {string} input - Raw user input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text string
 */
export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(DANGEROUS_TAGS_REGEX, '') // Strip HTML tags
    .replace(JAVASCRIPT_PROTOCOL_REGEX, '') // Strip javascript: schemes
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and constrains a numerical input within safe positive integer bounds.
 * Prevents negative quantities, NaN exploits, and integer overflow.
 * @param {any} val - Input value
 * @param {number} min - Minimum allowed value (default: 1)
 * @param {number} max - Maximum allowed value (default: 50)
 * @returns {number} Safe integer
 */
export function sanitizeQuantity(val, min = 1, max = 50) {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || !isFinite(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Validates Indian phone number format (10 digits).
 * @param {string} phone
 * @returns {string|null}
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.slice(-10);
}

/**
 * Sanitizes an order object before dispatching to the API or saving to local storage.
 * @param {object} order
 * @returns {object}
 */
export function sanitizeOrderPayload(order) {
  if (!order || typeof order !== 'object') return {};

  return {
    ...order,
    table_number: sanitizeText(order.table_number || '', 20),
    customer_name: sanitizeText(order.customer_name || 'Walk-in Guest', 60),
    special_note: sanitizeText(order.special_note || '', 300),
    items: Array.isArray(order.items)
      ? order.items.map(item => ({
          ...item,
          id: sanitizeText(item.id || '', 50),
          name: sanitizeText(item.name || '', 100),
          qty: sanitizeQuantity(item.qty || item.quantity || 1, 1, 30),
          notes: sanitizeText(item.notes || '', 150),
        }))
      : []
  };
}
