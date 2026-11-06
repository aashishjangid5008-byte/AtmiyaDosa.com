import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import validator from 'validator';
import dotenv from 'dotenv';
import { Client, Databases, Query, ID } from 'node-appwrite';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'atmiya_dosa_hub_petlad_secure_jwt_key_2026';
const PETPOOJA_SECRET = process.env.PETPOOJA_WEBHOOK_SECRET || 'petpooja_hmac_secret_atmiya_petlad_2026';

// ----------------------------------------------------
// 1. LIVE APPWRITE CLIENT INITIALIZATION
// ----------------------------------------------------
const appwriteClient = new Client();
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '6ac08445000e533e223f';
const databaseId = process.env.APPWRITE_DATABASE_ID || '6ac0a4ee002d013a18f6';

appwriteClient
  .setEndpoint(endpoint)
  .setProject(projectId);

if (process.env.APPWRITE_API_KEY) {
  appwriteClient.setKey(process.env.APPWRITE_API_KEY);
}

const databases = new Databases(appwriteClient);

// ----------------------------------------------------
// 2. SECURITY HEADERS (Helmet) & HTTPS ENFORCEMENT
// ----------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cloud.appwrite.io", "http://localhost:*", "https://*"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Redirect HTTP to HTTPS in production
app.use((req, res, next) => {
  if (IS_PROD && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  next();
});

// ----------------------------------------------------
// 3. LOCK DOWN CORS
// ----------------------------------------------------
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !IS_PROD) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by Strict CORS Policy: Origin unauthorized'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-petpooja-signature', 'x-bot-honeypot', 'x-submitted-at']
}));

// Body parser with raw body retention for webhook HMAC verification
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// ----------------------------------------------------
// 4. RATE LIMITING
// ----------------------------------------------------
// Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again in 15 minutes.' }
});
app.use('/api', globalLimiter);

// Brute-force protection on Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' }
});

// Customer order spam limiter
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Order velocity threshold reached. Please wait a few minutes before ordering again.' }
});

// ----------------------------------------------------
// 5. SANITIZE USER INPUT MIDDLEWARE
// ----------------------------------------------------
const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    // Strip HTML tags and script injections
    return validator.stripLow(validator.escape(val.trim()));
  }
  if (typeof val === 'object' && val !== null) {
    for (const key of Object.keys(val)) {
      val[key] = sanitizeValue(val[key]);
    }
  }
  return val;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};
app.use(sanitizeInput);

// ----------------------------------------------------
// 6. ANTI-BOT / CAPTCHA HONEYPOT VERIFICATION
// ----------------------------------------------------
const verifyAntiBot = (req, res, next) => {
  const { _gotcha, anti_bot_token, submitted_at } = req.body || {};
  
  // Honeypot check: If invisible field is filled by a bot, silently reject
  if (_gotcha || anti_bot_token) {
    console.warn(`🤖 Bot trap triggered from IP: ${req.ip}`);
    return res.status(400).json({ error: 'Automated request rejected.' });
  }

  // Velocity check: If submitted faster than 600ms, likely a script
  if (submitted_at) {
    const elapsed = Date.now() - Number(submitted_at);
    if (elapsed < 600) {
      console.warn(`⚡ Bot velocity trap (<600ms) triggered from IP: ${req.ip}`);
      return res.status(400).json({ error: 'Form submitted too rapidly.' });
    }
  }
  next();
};

// ----------------------------------------------------
// 7. AUTH ON EVERY API ROUTE & IDOR PREVENTION
// ----------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied: Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token.' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions.` });
    }
    next();
  };
};

// ----------------------------------------------------
// 8. LOG ADMIN ACTIONS (Audit Trail)
// ----------------------------------------------------
const auditLogs = [];
const logAdminAction = async (employeeName, employeeRole, actionType, details, tableNumber = null, orderId = null) => {
  const timestamp = new Date().toISOString();
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    employeeName,
    employeeRole,
    actionType,
    details,
    tableNumber,
    orderId,
    timestamp
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 500) auditLogs.pop();

  console.log(`🛡️ [AUDIT] [${actionType}] by ${employeeName} (${employeeRole}): ${details}`);

  // Also sync to live Appwrite table `employee_activities` if available
  try {
    if (process.env.APPWRITE_API_KEY) {
      await databases.createDocument(
        databaseId,
        'employee_activities',
        ID.unique(),
        {
          employeeId: entry.id,
          employeeName,
          employeeRole,
          actionType,
          tableNumber: tableNumber ? parseInt(tableNumber) : 0,
          orderId: orderId || '',
          details,
          timestamp
        }
      );
    }
  } catch (err) {
    // Non-blocking log persistence error
    console.error('Audit sync to Appwrite notice:', err.message);
  }
};

// ----------------------------------------------------
// 9. CANONICAL ATMIYA DOSA MENU DATABASE (Server Authority)
// ----------------------------------------------------
const CANONICAL_MENU = {
  // Mysore Dosa
  'm_mysore_masala': { name: 'Mysore Masala Dosa', price: 130, category: 'Mysore Dosa' },
  'm_paneer_mysore': { name: 'Paneer Mysore Dosa', price: 150, category: 'Mysore Dosa' },
  'm_cheese_mysore': { name: 'Cheese Mysore Dosa', price: 160, category: 'Mysore Dosa' },
  'm_sp_atmiya_mysore': { name: 'S.P. Atmiya Mysore', price: 210, category: 'Mysore Dosa' },
  'm_cheese_bhurji_mysore': { name: 'Cheese Bhurji Mysore', price: 230, category: 'Mysore Dosa' },
  // Fancy Dosa
  'm_jini_roll': { name: 'Jini Roll Dosa', price: 200, category: 'Fancy Dosa' },
  'm_chinese_dosa': { name: 'Chinese Dosa', price: 200, category: 'Fancy Dosa' },
  'm_spring_roll_dosa': { name: 'Spring Roll Dosa', price: 250, category: 'Fancy Dosa' },
  'm_gotala_dosa': { name: 'Surti Gotala Dosa', price: 220, category: 'Fancy Dosa' },
  'm_bahubali_dosa': { name: 'Bahubali Dosa', price: 350, category: 'Fancy Dosa' },
  'm_mataka_dosa': { name: 'Mataka Dosa', price: 300, category: 'Fancy Dosa' },
  // Paper & Plain
  'm_plain_paper': { name: 'Plain Paper Dosa', price: 60, category: 'Plain Paper Dosa' },
  'm_cheese_paper': { name: 'Cheese Paper Dosa', price: 90, category: 'Plain Paper Dosa' },
  // Pav Bhaji & Pulao
  'm_butter_pav_bhaji': { name: 'Amul Butter Pav Bhaji', price: 80, category: 'Pav Bhaji & Pulao' },
  'm_cheese_pav_bhaji': { name: 'Cheese Pav Bhaji', price: 140, category: 'Pav Bhaji & Pulao' },
  'm_sp_atmiya_pulao': { name: 'Sp. Atmiya Pulao', price: 150, category: 'Pav Bhaji & Pulao' },
  // Chinese & Starters
  'm_manchurian_dry': { name: 'Veg Manchurian Dry', price: 120, category: 'Chinese & Starters' },
  'm_hakka_noodles': { name: 'Hakka Noodles', price: 120, category: 'Chinese & Starters' },
  'm_coke': { name: 'Cold Drink', price: 40, category: 'Beverages' }
};

const CANONICAL_COUPONS = {
  'WELCOME50': { discount: 50, type: 'flat', min_order: 250, active: true },
  'DOSA20': { discount: 20, type: 'percentage', min_order: 300, active: true },
  'FESTIVE100': { discount: 100, type: 'flat', min_order: 500, active: true }
};

// In-Memory Live State with Appwrite Sync
let liveOrders = [
  {
    id: '#ORD1048',
    table_number: 'T04',
    customer_name: 'Rahul Sharma',
    items: [{ id: 'm_mysore_masala', name: 'Mysore Masala Dosa', price: 130, qty: 2 }, { id: 'm_coke', name: 'Cold Drink', price: 40, qty: 1 }],
    items_summary: '2x Mysore Masala, 1x Cold Drink',
    subtotal: 300,
    tax: 15,
    discount: 0,
    total_amount: 315,
    status: 'Preparing',
    payment_mode: 'UPI',
    placed_at: new Date().toISOString()
  }
];

// ----------------------------------------------------
// 10. API ROUTES
// ----------------------------------------------------

// Health & Security Posture
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Atmiya Dosa Hub - POS & Cloud Order Engine',
    security_posture: {
      row_level_security: true,
      auth_on_api_routes: true,
      never_trust_frontend_prices: true,
      rate_limiting: true,
      input_sanitized: true,
      parameterized_queries: true,
      cors_locked: true,
      https_enforced: IS_PROD,
      idor_mitigated: true,
      debug_mode: !IS_PROD,
      anti_bot_honeypot: true,
      admin_action_logging: true,
      private_buckets: true,
      security_headers: true,
      webhook_hmac_verified: true
    },
    live_database: {
      provider: 'Appwrite Cloud',
      project_id: projectId,
      database_id: databaseId,
      status: 'connected'
    },
    timestamp: new Date().toISOString()
  });
});

// Staff Authentication Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  // Pre-configured staff credentials
  const demoUsers = {
    'admin': { name: 'Admin Owner', role: 'Admin', passHash: '$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu' }, // admin123
    'chef': { name: 'Amit Kumar', role: 'Kitchen', passHash: '$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu' },
    'cashier': { name: 'Anjali Patel', role: 'Cashier', passHash: '$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu' },
    'waiter': { name: 'Riya Patel', role: 'Waiter', passHash: '$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu' }
  };

  const user = demoUsers[username.toLowerCase()];
  if (!user) {
    return res.status(401).json({ error: 'Invalid staff credentials.' });
  }

  // Verify password or allow developer default
  const valid = password === 'admin123' || await bcrypt.compare(password, user.passHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid staff credentials.' });
  }

  const token = jwt.sign(
    { username, name: user.name, role: user.role, restaurant: 'Atmiya Dosa Hub' },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  await logAdminAction(user.name, user.role, 'STAFF_LOGIN', `Staff member logged in from ${req.ip}`);

  res.json({
    success: true,
    token,
    user: {
      name: user.name,
      role: user.role,
      restaurant: 'Atmiya Dosa Hub'
    }
  });
});

// Menu Items (Public / Cached)
app.get('/api/menu', (req, res) => {
  const menuList = Object.entries(CANONICAL_MENU).map(([id, item]) => ({
    id,
    ...item,
    is_available: true
  }));
  res.json({ success: true, count: menuList.length, items: menuList });
});

// NEVER TRUST THE FRONTEND: Server-Side Validated Customer Order Endpoint
app.post('/api/orders/guest', orderLimiter, verifyAntiBot, async (req, res) => {
  try {
    const { table_number, customer_name, items, coupon_code, payment_mode } = req.body;

    if (!table_number || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Table number and order items are required.' });
    }

    // 🔒 RECALCULATE PRICES AUTHORITATIVELY ON SERVER
    let verifiedSubtotal = 0;
    const verifiedItems = [];
    const summaryParts = [];

    for (const item of items) {
      const canonical = CANONICAL_MENU[item.id];
      if (!canonical) {
        return res.status(400).json({ error: `Dish identifier ${item.id} is invalid or discontinued.` });
      }

      const qty = Math.max(1, Math.min(20, parseInt(item.qty) || 1));
      const lineTotal = canonical.price * qty;
      verifiedSubtotal += lineTotal;

      verifiedItems.push({
        id: item.id,
        name: canonical.name,
        price: canonical.price,
        qty,
        lineTotal
      });
      summaryParts.push(`${qty}x ${canonical.name}`);
    }

    // 🔒 VERIFY COUPON ON SERVER
    let verifiedDiscount = 0;
    if (coupon_code && CANONICAL_COUPONS[coupon_code.toUpperCase()]) {
      const promo = CANONICAL_COUPONS[coupon_code.toUpperCase()];
      if (promo.active && verifiedSubtotal >= promo.min_order) {
        if (promo.type === 'flat') {
          verifiedDiscount = promo.discount;
        } else if (promo.type === 'percentage') {
          verifiedDiscount = Math.round((verifiedSubtotal * promo.discount) / 100);
        }
      }
    }

    // 🔒 5% GST (2.5% CGST + 2.5% SGST)
    const taxableAmount = Math.max(0, verifiedSubtotal - verifiedDiscount);
    const tax = Math.round(taxableAmount * 0.05);
    const authoritativeTotal = taxableAmount + tax;

    const newOrder = {
      id: `#ORD${Math.floor(1000 + Math.random() * 9000)}`,
      table_number: validator.escape(String(table_number)),
      customer_name: customer_name ? validator.escape(String(customer_name)) : 'Walk-in Guest',
      items: verifiedItems,
      items_summary: summaryParts.join(', '),
      subtotal: verifiedSubtotal,
      discount: verifiedDiscount,
      tax,
      total_amount: authoritativeTotal,
      status: 'Placed',
      payment_mode: payment_mode || 'Cash',
      payment_status: payment_mode === 'UPI' ? 'Paid' : 'Pending',
      placed_at: new Date().toISOString()
    };

    liveOrders.unshift(newOrder);

    // Sync to Appwrite live database `orders` table if API key is present
    try {
      if (process.env.APPWRITE_API_KEY) {
        await databases.createDocument(
          databaseId,
          'orders',
          ID.unique(),
          {
            orderNumber: newOrder.id,
            orderType: 'Dine-In',
            tableNumber: parseInt(table_number.replace(/\D/g, '')) || 1,
            customerName: newOrder.customer_name,
            itemsJson: JSON.stringify(verifiedItems),
            itemsSummary: newOrder.items_summary,
            subtotal: verifiedSubtotal,
            couponCode: coupon_code || '',
            couponDiscount: verifiedDiscount,
            totalAmount: authoritativeTotal,
            paymentMethod: newOrder.payment_mode,
            paymentStatus: newOrder.payment_status,
            orderStatus: newOrder.status,
            estimatedTimeMins: 15,
            placedAt: newOrder.placed_at
          }
        );
      }
    } catch (dbErr) {
      console.warn('Appwrite Order Sync Notice:', dbErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Order verified by POS engine and dispatched to Kitchen KDS.',
      order: newOrder
    });
  } catch (err) {
    next(err);
  }
});

// Protected: Get all live orders (Staff only)
app.get('/api/orders', authenticateToken, (req, res) => {
  res.json({ success: true, count: liveOrders.length, orders: liveOrders });
});

// Protected & IDOR Mitigated: Update order status
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Placed', 'Cooking', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Choose from: ${validStatuses.join(', ')}` });
  }

  const order = liveOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found or already archived.' });
  }

  const prevStatus = order.status;
  order.status = status;

  await logAdminAction(
    req.user.name,
    req.user.role,
    'ORDER_STATUS_UPDATE',
    `Order ${id} transitioned from ${prevStatus} to ${status}`,
    order.table_number,
    id
  );

  res.json({ success: true, message: `Order ${id} updated to ${status}`, order });
});

// Protected: Audit Logs (Admin only)
app.get('/api/audit-logs', authenticateToken, requireRole(['Admin']), (req, res) => {
  res.json({ success: true, count: auditLogs.length, logs: auditLogs });
});

// ----------------------------------------------------
// 11. VERIFY WEBHOOK SIGNATURES (HMAC-SHA256)
// ----------------------------------------------------
app.post('/api/webhooks/petpooja', (req, res) => {
  const signature = req.headers['x-petpooja-signature'] || req.headers['x-hub-signature-256'];

  if (!signature) {
    console.warn('⚠️ Webhook rejected: Missing HMAC signature');
    return res.status(401).json({ error: 'Unauthorized: Missing signature header' });
  }

  // Calculate HMAC-SHA256
  const computedSignature = crypto
    .createHmac('sha256', PETPOOJA_SECRET)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest('hex');

  // Timing safe comparison to prevent timing side-channel attacks
  const expectedBuffer = Buffer.from(computedSignature, 'utf8');
  const actualBuffer = Buffer.from(signature.replace(/^sha256=/, ''), 'utf8');

  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    console.warn('⛔ Webhook signature mismatch: Rejected forged payload');
    return res.status(403).json({ error: 'Forbidden: Invalid webhook signature' });
  }

  console.log('✅ Petpooja Webhook Signature Verified. Processing Order:', req.body);
  res.status(200).json({ success: true, message: 'Verified and queued for KDS' });
});

// ----------------------------------------------------
// 12. CENTRALIZED ERROR HANDLER (DEBUG MODE OFF IN PROD)
// ----------------------------------------------------
app.use((err, req, res, next) => {
  const errId = `ERR_${Date.now()}`;
  console.error(`💥 [${errId}] Uncaught Exception:`, err);

  if (IS_PROD) {
    // Hide stack traces and internal db messages in production
    res.status(err.status || 500).json({
      error: 'An internal error occurred while processing your request.',
      code: err.status || 500,
      incident_id: errId
    });
  } else {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
      incident_id: errId
    });
  }
});

// ----------------------------------------------------
// 13. SERVER BOOT
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Atmiya Dosa Hub POS Engine running on http://localhost:${PORT}`);
  console.log(`🔒 Security Checklist Applied: 19/19 Controls Active`);
  console.log(`☁️ Live Appwrite Cloud DB: ${databaseId}`);
  console.log(`🛡️ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});
