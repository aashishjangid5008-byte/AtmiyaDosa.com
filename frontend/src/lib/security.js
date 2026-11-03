/**
 * Client-Side Security Protection Layer
 * - Floor Manager PIN Brute-Force Rate Limiting (Progressive Lockout)
 * - Anti-Tamper & Security Headers for Fetch
 * - Secure Session & Token Management
 */

const PIN_ATTEMPTS_KEY = 'atmiya_pin_failed_attempts';
const PIN_LOCKOUT_UNTIL_KEY = 'atmiya_pin_lockout_until';
const MAX_FAILED_PIN_ATTEMPTS = 4;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

/**
 * Checks if PIN entry is currently locked out due to excessive failed attempts.
 * @returns {{ isLocked: boolean, remainingSeconds: number }}
 */
export function checkPinLockout() {
  try {
    const lockoutUntil = parseInt(sessionStorage.getItem(PIN_LOCKOUT_UNTIL_KEY) || '0', 10);
    const now = Date.now();
    if (lockoutUntil && lockoutUntil > now) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }
    // Lockout expired
    if (lockoutUntil && lockoutUntil <= now) {
      sessionStorage.removeItem(PIN_LOCKOUT_UNTIL_KEY);
      sessionStorage.removeItem(PIN_ATTEMPTS_KEY);
    }
  } catch (e) {
    console.error('Lockout check error:', e);
  }
  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Records a failed PIN attempt and triggers a cooldown lockout if threshold is exceeded.
 * @returns {{ isLocked: boolean, remainingAttempts: number, remainingSeconds: number }}
 */
export function recordFailedPinAttempt() {
  try {
    const current = parseInt(sessionStorage.getItem(PIN_ATTEMPTS_KEY) || '0', 10) + 1;
    sessionStorage.setItem(PIN_ATTEMPTS_KEY, String(current));

    if (current >= MAX_FAILED_PIN_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      sessionStorage.setItem(PIN_LOCKOUT_UNTIL_KEY, String(lockoutUntil));
      return { isLocked: true, remainingAttempts: 0, remainingSeconds: 60 };
    }

    return { 
      isLocked: false, 
      remainingAttempts: MAX_FAILED_PIN_ATTEMPTS - current, 
      remainingSeconds: 0 
    };
  } catch (e) {
    return { isLocked: false, remainingAttempts: 1, remainingSeconds: 0 };
  }
}

/**
 * Resets the failed PIN attempts counter upon successful verification.
 */
export function resetPinAttempts() {
  try {
    sessionStorage.removeItem(PIN_ATTEMPTS_KEY);
    sessionStorage.removeItem(PIN_LOCKOUT_UNTIL_KEY);
  } catch (e) {}
}

/**
 * Secure Fetch Wrapper:
 * - Automatically injects Authorization Bearer token if user is logged in
 * - Injects anti-CSRF request origin headers
 * - Handles 401 Unauthorized by clearing stale credentials
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function secureFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});

  // Add default content type if payload present
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token from local storage if available
  try {
    const rawUser = localStorage.getItem('atmiya_auth_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user?.token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${user.token}`);
      }
    }
  } catch (e) {}

  // Request security identifier
  headers.set('X-Requested-With', 'XMLHttpRequest');

  const response = await fetch(url, { ...options, headers });

  // Handle automatic logout on token expiration or revocation
  if (response.status === 401 && !url.includes('/auth/login')) {
    console.warn('Authentication token expired or invalid. Clearing session.');
    try {
      localStorage.removeItem('atmiya_auth_user');
      window.dispatchEvent(new Event('atmiya_auth_expired'));
    } catch (e) {}
  }

  return response;
}

/**
 * Table QR Security & Anti-Tampering Engine
 * Prevents URL tampering (?table=T01 -> ?table=T02) and unauthorized bill hijacking.
 */
const TABLE_SALT = 'atmiya_dosa_hub_qr_sec_2026';
const BOUND_TABLE_KEY = 'atmiya_bound_table';

export function normalizeTableNumber(val) {
  if (!val) return '';
  const digits = String(val).replace(/[^0-9]/g, '');
  if (digits) return String(parseInt(digits, 10));
  return String(val).trim().toUpperCase();
}

/**
 * Generates a deterministic security signature for a table QR code.
 * @param {string|number} tableVal 
 * @returns {string} 8-character hex signature
 */
export function generateTableSecurityKey(tableVal) {
  const norm = normalizeTableNumber(tableVal);
  if (!norm) return '';
  let hash = 0x811c9dc5;
  const str = `${TABLE_SALT}_table_${norm}_atmiya`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Verifies if the provided key matches the signature for the given table.
 * @param {string|number} tableVal 
 * @param {string} key 
 * @returns {boolean}
 */
export function verifyTableSecurityKey(tableVal, key) {
  if (!tableVal || !key) return false;
  return generateTableSecurityKey(tableVal).toLowerCase() === String(key).trim().toLowerCase();
}

/**
 * Binds the current browser session to a specific dining table.
 * @param {string|number} tableVal 
 */
export function bindSessionTable(tableVal) {
  const norm = normalizeTableNumber(tableVal);
  if (norm) {
    try {
      sessionStorage.setItem(BOUND_TABLE_KEY, norm);
      localStorage.setItem(BOUND_TABLE_KEY, norm);
      localStorage.setItem('selected_table', norm < 10 ? `T0${norm}` : `T${norm}`);
    } catch (e) {}
  }
}

/**
 * Gets the table bound to this browser session, if any.
 * @returns {string|null}
 */
export function getBoundSessionTable() {
  try {
    return sessionStorage.getItem(BOUND_TABLE_KEY) || localStorage.getItem(BOUND_TABLE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Clears the bound table session (e.g. when table is marked vacated or settled).
 */
export function clearBoundSessionTable() {
  try {
    sessionStorage.removeItem(BOUND_TABLE_KEY);
    localStorage.removeItem(BOUND_TABLE_KEY);
    localStorage.removeItem('selected_table');
  } catch (e) {}
}

/**
 * Helper to check whether a host or URL is a local or private network address
 * (e.g. localhost, 127.0.0.1, 10.x.x.x, 192.168.x.x, 172.16-31.x.x).
 * @param {string} hostOrUrl 
 * @returns {boolean}
 */
export function isPrivateOrLocalAddress(hostOrUrl) {
  if (!hostOrUrl || typeof hostOrUrl !== 'string') return true;
  try {
    const raw = hostOrUrl.trim().toLowerCase();
    const hostname = raw.includes('://') 
      ? new URL(raw).hostname.toLowerCase() 
      : raw.split('/')[0].split(':')[0].toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
      return true;
    }
    if (hostname.endsWith('.local')) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Returns the configured production domain (e.g. https://my-app.run.app) if set.
 * @returns {string|null}
 */
export function getProductionDomain() {
  if (typeof window === 'undefined') return null;
  try {
    const custom = localStorage.getItem('production_domain') || localStorage.getItem('atmiya_production_domain');
    if (custom && custom.trim() && !isPrivateOrLocalAddress(custom.trim())) {
      return custom.trim().replace(/\/+$/, '');
    }
    // Also check stored settings if present
    const settingsStr = localStorage.getItem('settings');
    if (settingsStr) {
      const parsed = JSON.parse(settingsStr);
      if (parsed?.productionDomain && !isPrivateOrLocalAddress(parsed.productionDomain)) {
        return parsed.productionDomain.trim().replace(/\/+$/, '');
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Stores an explicit production domain override (e.g. for Google Cloud Run).
 * @param {string|null} domain 
 */
export function setProductionDomain(domain) {
  if (typeof window === 'undefined') return;
  try {
    if (domain && domain.trim()) {
      const clean = domain.trim().replace(/\/+$/, '');
      localStorage.setItem('production_domain', clean);
    } else {
      localStorage.removeItem('production_domain');
      localStorage.removeItem('atmiya_production_domain');
    }
  } catch (e) {}
}

/**
 * Resolves the active base URL for QR codes.
 * Ensures QR codes generated work dynamically online on any mobile device (4G/5G/Wi-Fi):
 * - If running online (e.g. Google Cloud Run *.run.app or custom domain), automatically uses window.location.origin.
 * - Automatically purges stale private IP addresses (e.g. 10.x.x.x, 192.168.x.x).
 * - If running on localhost, allows using the configured productionDomain for live standee printing.
 * @param {string|null} overrideUrl 
 * @returns {string} Clean base URL without trailing slash
 */
export function getActiveQrBaseUrl(overrideUrl = null) {
  if (overrideUrl && typeof overrideUrl === 'string' && overrideUrl.trim()) {
    return overrideUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin ? window.location.origin.replace(/\/+$/, '') : '';
    const isCurrentHostPrivate = isPrivateOrLocalAddress(window.location.hostname);

    // 1. IF CURRENT BROWSER IS RUNNING ON A PUBLIC LIVE CLOUD DOMAIN:
    // This is the real live deployment (Google Cloud Run, custom domain, etc.)!
    // Purge any stale LAN private IP addresses that were stored during previous local testing.
    if (!isCurrentHostPrivate && currentOrigin.startsWith('http')) {
      try {
        const stored = localStorage.getItem('qr_base_url');
        if (stored && isPrivateOrLocalAddress(stored)) {
          localStorage.removeItem('qr_base_url');
        }
      } catch (e) {}
      return currentOrigin;
    }

    // 2. IF ADMIN SET A DEDICATED PRODUCTION CLOUD RUN DOMAIN:
    // Allows generating live-ready standees even when viewing from localhost on desktop
    const configuredProd = getProductionDomain();
    if (configuredProd) {
      return configuredProd;
    }

    // 3. CHECK EXPLICIT OVERRIDE IN STORAGE (if not a stale private IP or tunnel)
    try {
      const stored = localStorage.getItem('qr_base_url');
      if (stored && stored.trim() && !stored.includes('trycloudflare.com')) {
        // Only use stored if it's either public or matches the current browser host
        if (!isPrivateOrLocalAddress(stored) || stored.includes(window.location.hostname)) {
          return stored.trim().replace(/\/+$/, '');
        } else {
          // Stale private IP from another network -> purge
          localStorage.removeItem('qr_base_url');
        }
      }
    } catch (e) {}

    // 4. FALLBACK: CURRENT WINDOW ORIGIN (OR LOCALHOST)
    if (currentOrigin && currentOrigin.startsWith('http')) {
      return currentOrigin;
    }

    return 'http://localhost:5173';
  }

  return 'http://localhost:5173';
}

/**
 * Builds the canonical, secure QR URL for a dining table.
 * Includes both table parameter and cryptographic anti-tamper signature (&tsec=...)
 * @param {string|number} tableNumber 
 * @param {string|null} customBaseUrl 
 * @returns {string} Fully-qualified URL ready for QR encoding
 */
export function getTableQrUrl(tableNumber, customBaseUrl = null) {
  const normDigits = normalizeTableNumber(tableNumber);
  const formattedTable = normDigits && Number(normDigits) < 10 
    ? `T0${normDigits}` 
    : (normDigits ? `T${normDigits}` : String(tableNumber || 'T01').trim().toUpperCase());
  const tsec = generateTableSecurityKey(tableNumber);
  const base = getActiveQrBaseUrl(customBaseUrl);
  return `${base}/?table=${encodeURIComponent(formattedTable)}&tsec=${tsec}`;
}

/**
 * Checks whether the current browser session is a dining guest / customer session.
 * @returns {boolean}
 */
export function isCustomerSession() {
  if (typeof window === 'undefined') return false;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('table')) return true;
    if (sessionStorage.getItem('atmiya_customer_mode') === 'true') return true;
    if (sessionStorage.getItem(BOUND_TABLE_KEY)) return true;
  } catch (e) {}
  return false;
}

/**
 * Marks this browser tab as an active customer session locked to dining menu view.
 * @param {string|number} tableVal 
 */
export function markCustomerSession(tableVal) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('atmiya_customer_mode', 'true');
    if (tableVal) bindSessionTable(tableVal);
  } catch (e) {}
}

/**
 * Clears customer session state (e.g. after bill settlement or table vacate).
 */
export function clearCustomerSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('atmiya_customer_mode');
    clearBoundSessionTable();
  } catch (e) {}
}

/**
 * Validates whether a requested table switch from URL is legitimate or tampering.
 * @param {string|number} requestedTable 
 * @param {string} securityKey 
 * @param {boolean} hasActiveOrdersOnBoundTable 
 * @returns {{ allowed: boolean, boundTable: string|null, reason: string }}
 */
export function validateTableAccess(requestedTable, securityKey, hasActiveOrdersOnBoundTable = false) {
  const reqNorm = normalizeTableNumber(requestedTable);
  const bound = getBoundSessionTable();

  // If no table is bound yet, this is the first scan/visit
  if (!bound) {
    return { allowed: true, boundTable: reqNorm, reason: 'initial_bind' };
  }

  // If requested table matches the bound table, perfectly valid
  if (reqNorm === bound) {
    return { allowed: true, boundTable: bound, reason: 'same_table' };
  }

  // User is attempting to switch tables:
  // If there are active dining orders on the bound table, STRICTLY PROHIBIT SWITCHING!
  if (hasActiveOrdersOnBoundTable) {
    return {
      allowed: false,
      boundTable: bound,
      reason: 'active_order_conflict'
    };
  }

  // If attempting to switch, require the genuine physical QR standee security key
  if (verifyTableSecurityKey(reqNorm, securityKey)) {
    // Valid physical scan at a new table
    return { allowed: true, boundTable: reqNorm, reason: 'valid_scan_reseat' };
  }

  // URL manual tampering detected (?table=T01 typed in address bar)
  return {
    allowed: false,
    boundTable: bound,
    reason: 'unauthorized_tampering'
  };
}
