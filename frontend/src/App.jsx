import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ChefHat, 
  Utensils, 
  Users, 
  BarChart3, 
  Tag, 
  QrCode, 
  Settings, 
  Bell, 
  Search, 
  Sun, 
  Calendar, 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Zap,
  BellRing,
  Moon,
  Clock,
  ShieldAlert,
  Check
} from 'lucide-react';

import { 
  getLocalStore, 
  setLocalStore, 
  getAuthUser, 
  setAuthUser, 
  logoutAuthUser,
  INITIAL_SETTINGS,
  INITIAL_TABLES, 
  INITIAL_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_ORDERS, 
  INITIAL_ACTIVITY, 
  INITIAL_EMPLOYEES, 
  INITIAL_COUPONS,
  INITIAL_SERVICE_CALLS,
  INITIAL_CUSTOMERS,
  saveCustomerProfile,
  addCustomerLoyaltyPoints,
  recordEmployeeActivity,
  loadAuthenticMenuCards,
  clearAllMenuData,
  AUTHENTIC_CATEGORIES,
  AUTHENTIC_MENU_CARD_ITEMS
} from './lib/appwrite';
import { 
  supabase, 
  RESTAURANT_ID, 
  dispatchOrderToSupabase, 
  updateOrderStatusInSupabase, 
  settleTableSessionInSupabase, 
  settleTableSessionApi,
  verifyStaffTokenApi,
  fetchLiveOrdersFromSupabase,
  normalizeTableNumber,
  updateOrderItemStatusInSupabase,
  updateAllOrderItemsServedInSupabase,
  fetchLiveMenuFromSupabase,
  fetchLiveTablesFromSupabase,
  saveTableToSupabaseApi,
  deleteTableFromSupabaseApi,
  updateTableInSupabaseApi,
  API_BASE_URL
} from './lib/supabase';
import { getDishCuisine } from './lib/cuisines';
import { getTranslation } from './lib/translations';
import { playSound } from './lib/sound';
import { sanitizeOrderPayload } from './lib/sanitizer';
import { 
  validateTableAccess, 
  bindSessionTable, 
  getBoundSessionTable, 
  verifyTableSecurityKey,
  clearBoundSessionTable,
  generateTableSecurityKey,
  getTableQrUrl,
  getActiveQrBaseUrl,
  isCustomerSession,
  markCustomerSession,
  clearCustomerSession
} from './lib/security';
import { 
  registerServiceWorker, 
  triggerStaffOrderNotification, 
  triggerStaffServiceNotification, 
  triggerTableTurnoverNotification,
  triggerWaiterFoodReadyNotification,
  speakTableCleanAlert
} from './lib/notifications';

import AuthPage from './components/auth/AuthPage';
import ExecutiveDashboard from './components/admin/ExecutiveDashboard';
import OrdersView from './components/admin/OrdersView';
import KitchenPanelView from './components/admin/KitchenPanelView';
import WaiterView from './components/waiter/WaiterView';
import TablesView from './components/admin/TablesView';
import MenuManagementView from './components/admin/MenuManagementView';
import EmployeesView from './components/admin/EmployeesView';
import ReportsAnalytics from './components/admin/ReportsAnalytics';
import QRManagementView from './components/admin/QRManagementView';
import SettingsView from './components/admin/SettingsView';
import QuickPosModal from './components/admin/QuickPosModal';
import CustomerCRM from './components/admin/CustomerCRM';

import CustomerMenu from './components/CustomerMenu';

const DEMO_ORDER_IDS = new Set([
  '#ORD1048', '#ORD1047', '#ORD1046', '#ORD1045', '#ORD1044', '#ORD1043', 
  '#ORD1042', '#ORD1041', '#ORD1049', '#ORD1050', 'ORD-TEST-001', 'ORD-TEST-999', 
  'ORD-T04-1001', '#ORD3908', '#ORD3451', '#ORD2842', 'ORD3908', 'ORD3451', 'ORD2842'
]);

const mapDbOrderToFrontend = (dbOrd) => {
  const isOnline = dbOrd.payment_method === 'UPI_COUNTER' || dbOrd.payment_method === 'ONLINE_RAZORPAY';
  const statusDisplayMap = {
    'PLACED': 'Placed',
    'PREPARING': 'Preparing',
    'READY': 'Ready',
    'SERVED': 'Served',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled'
  };

  // 1. Extract KDS dish item states metadata from special_notes (persisted in Cloud DB)
  let itemStates = {};
  let cleanSpecialNote = dbOrd.special_notes || '';
  if (cleanSpecialNote && cleanSpecialNote.includes('[KDS_ITEM_STATES:')) {
    try {
      const match = cleanSpecialNote.match(/\[KDS_ITEM_STATES:(\{.*?\})\]/);
      if (match) {
        itemStates = JSON.parse(match[1]);
        cleanSpecialNote = cleanSpecialNote.replace(/\[KDS_ITEM_STATES:\{.*?\}\]/g, '').trim();
      }
    } catch (e) {}
  }

  const hasSpecificStates = Object.keys(itemStates).length > 0;

  let itms = (dbOrd.order_items || []).map((i, idx) => {
    const savedState = itemStates[String(idx)] || itemStates[i.item_name] || itemStates[i.id];
    const isSavedReady = savedState === 'ready';
    const isSavedServed = savedState === 'served';
    const isSavedPrep = savedState === 'preparing' || savedState === 'cooking' || savedState === 'placed';

    let isItemServed = false;
    if (isSavedServed) {
      isItemServed = true;
    } else if (isSavedReady || isSavedPrep) {
      isItemServed = false;
    } else if (i.status === 'SERVED' || i.status === 'served') {
      isItemServed = true;
    } else if (dbOrd.status === 'COMPLETED' || dbOrd.status === 'SETTLED' || (!hasSpecificStates && (dbOrd.status === 'SERVED' || itemStates['all'] === 'served'))) {
      isItemServed = true;
    }

    let isItemReady = isItemServed;
    if (!isItemServed) {
      if (isSavedReady) {
        isItemReady = true;
      } else if (isSavedPrep) {
        isItemReady = false;
      } else if (i.status === 'READY' || i.status === 'ready') {
        isItemReady = true;
      } else if (!hasSpecificStates && (dbOrd.status === 'READY' || itemStates['all'] === 'ready')) {
        isItemReady = true;
      }
    }

    const kitchenStatus = isItemServed 
      ? 'served' 
      : (isItemReady ? 'ready' : (savedState === 'preparing' || i.status === 'PREPARING' ? 'preparing' : 'placed'));

    return {
      id: i.id,
      name: i.item_name,
      price: parseFloat(i.unit_price) || 0,
      qty: i.quantity || 1,
      kitchen_status: kitchenStatus,
      is_served: isItemServed,
      cooking_note: i.cooking_note || null,
      note: i.cooking_note || null,
      customizations: i.cooking_note || null
    };
  });

  // Defensive fallback: If DB order_items is empty, extract add-on dishes like Mineral Water from special_notes
  if (itms.length === 0 && cleanSpecialNote) {
    const waterMatch = cleanSpecialNote.match(/(?:\+|💧)?\s*(\d+)x?\s*Mineral\s*Water/i);
    if (waterMatch) {
      const waterQty = parseInt(waterMatch[1], 10) || 1;
      const savedWaterState = itemStates['0'] || itemStates['water'] || itemStates['all'];
      const isWaterServed = savedWaterState === 'served' || (!hasSpecificStates && dbOrd.status === 'SERVED') || dbOrd.status === 'COMPLETED' || dbOrd.status === 'SETTLED';
      const isWaterReady = isWaterServed || dbOrd.status === 'READY' || savedWaterState === 'ready';
      itms.push({
        id: `addon_water_${dbOrd.id}`,
        name: 'Packaged Mineral Water (1 Litre Bottle)',
        price: 20,
        qty: waterQty,
        kitchen_status: isWaterServed ? 'served' : (isWaterReady ? 'ready' : 'placed'),
        is_served: isWaterServed,
        cooking_note: 'Chilled bottle'
      });
    }
  }

  let mappedStatus = statusDisplayMap[dbOrd.status] || dbOrd.status || 'Preparing';
  const payStatusLower = String(dbOrd.payment_status || '').toLowerCase().trim();
  const rawStatusUpper = String(dbOrd.status || '').toUpperCase().trim();
  
  const allItemsServed = itms.length > 0 && itms.every(it => it.is_served);
  const anyItemServed = itms.some(it => it.is_served);
  const allItemsReadyOrServed = itms.length > 0 && itms.every(it => it.is_served || it.kitchen_status === 'ready');

  if (rawStatusUpper === 'COMPLETED' || rawStatusUpper === 'SETTLED' || mappedStatus === 'Completed' || (allItemsServed && (payStatusLower === 'paid' || payStatusLower === 'settled'))) {
    mappedStatus = 'Completed';
  } else if (rawStatusUpper === 'CANCELLED' || mappedStatus === 'Cancelled') {
    mappedStatus = 'Cancelled';
  } else if (rawStatusUpper === 'SERVED' || allItemsServed) {
    if (payStatusLower === 'paid' || payStatusLower === 'settled') {
      mappedStatus = 'Completed';
    } else {
      mappedStatus = 'Served';
    }
  } else if (rawStatusUpper === 'READY' || allItemsReadyOrServed) {
    mappedStatus = 'Ready';
  } else if (rawStatusUpper === 'PREPARING' || rawStatusUpper === 'COOKING' || anyItemServed) {
    mappedStatus = 'Preparing';
  } else if (rawStatusUpper === 'PLACED') {
    mappedStatus = 'Placed';
  } else {
    mappedStatus = statusDisplayMap[dbOrd.status] || 'Preparing';
  }

  const isCancelledOrder = mappedStatus === 'Cancelled' || rawStatusUpper === 'CANCELLED';
  const isCompletedOrder = mappedStatus === 'Completed' || rawStatusUpper === 'COMPLETED' || rawStatusUpper === 'SETTLED';
  const orderSettledAt = dbOrd.settled_at || dbOrd.completed_at || (isCompletedOrder ? (dbOrd.served_at || dbOrd.placed_at || new Date().toISOString()) : null);

  return {
    id: dbOrd.order_number?.startsWith('#') ? dbOrd.order_number : `#${dbOrd.order_number}`,
    order_number: dbOrd.order_number,
    supabase_order_id: dbOrd.id,
    session_id: dbOrd.session_id,
    table_number: dbOrd.table_number,
    customer_name: dbOrd.customer_name || 'Walk-in Guest',
    customer_phone: dbOrd.customer_phone || '',
    items: itms,
    order_items: dbOrd.order_items || [],
    items_summary: itms.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Dishes',
    subtotal: parseFloat(dbOrd.subtotal) || 0,
    tax: parseFloat(dbOrd.tax_amount) || 0,
    discount: parseFloat(dbOrd.discount_amount) || 0,
    total: parseFloat(dbOrd.total_amount) || 0,
    total_amount: parseFloat(dbOrd.total_amount) || 0,
    status: mappedStatus,
    channel: 'Dine-In QR',
    placed_at: dbOrd.placed_at,
    created_at: dbOrd.created_at || dbOrd.placed_at,
    served_at: dbOrd.served_at,
    settled_at: orderSettledAt,
    completed_at: orderSettledAt,
    time: dbOrd.placed_at ? new Date(dbOrd.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
    payment_mode: isOnline ? 'UPI' : 'Cash',
    payment_method: dbOrd.payment_method || (isOnline ? 'UPI_COUNTER' : 'CASH'),
    payment_status: isCancelledOrder ? 'Void' : (isCompletedOrder || payStatusLower === 'paid' || dbOrd.payment_status === 'PAID' ? 'Paid' : 'Pending Cash'),
    payment_verified_online: isOnline,
    special_note: cleanSpecialNote
  };
};

export default function App() {
  // Check if opened via QR code scanning (e.g. ?table=T04&tsec=...)
  const urlParams = new URLSearchParams(window.location.search);
  const scannedTable = urlParams.get('table');
  const tableSecurityKey = urlParams.get('tsec') || urlParams.get('key') || '';
  const isAdminPreview = urlParams.get('admin_preview') === '1';
  const isDirectKds = urlParams.get('kds') === 'true' || urlParams.get('kds') === '1' || urlParams.get('portal') === 'kitchen' || urlParams.get('mode') === 'kds' || urlParams.get('tab') === 'kitchen';
  const isDirectWaiter = urlParams.get('waiter') === 'true' || urlParams.get('waiter') === '1' || urlParams.get('portal') === 'waiter' || urlParams.get('mode') === 'waiter' || urlParams.get('tab') === 'waiter';
  const isLogoutRequested = urlParams.get('logout') === 'true';

  // Customer Session Lock:
  // If the user arrived via QR scan or has an existing bound dining session, they are a customer.
  // Unless explicitly authenticated as staff or accessing staff portals (KDS / Waiter), they must stay in customer menu!
  const initialIsCustomer = Boolean(
    !isDirectKds && !isDirectWaiter && (
      scannedTable ||
      (typeof window !== 'undefined' && sessionStorage.getItem('atmiya_customer_mode') === 'true') ||
      (getBoundSessionTable() && !getLocalStore('auth_user', null))
    )
  );

  const [viewMode, setViewMode] = useState(() => (initialIsCustomer ? 'customer' : 'admin')); // 'admin' or 'customer'
  const [qrSecurityError, setQrSecurityError] = useState(() => {
    // SECURITY GUARD: Staff bypass is strictly for explicit Admin Preview mode (?admin_preview=1) or direct staff routes.
    // Having auth_user in localStorage must NEVER bypass table signature checks for customer QR scans!
    const isPrivileged = isAdminPreview || isDirectKds || isDirectWaiter;
    if (isPrivileged) return null;

    if (scannedTable) {
      const scannedNorm = normalizeTableNumber(scannedTable);
      const isKeyValid = verifyTableSecurityKey(scannedNorm, tableSecurityKey);
      if (!isKeyValid) {
        const existingBound = getBoundSessionTable();
        // If customer was already bound to another table, they'll be reverted to that table.
        // But if there is no prior bound table (fresh URL tampering or untrusted link), block access!
        if (!existingBound || existingBound === scannedNorm) {
          return {
            attemptedTable: scannedTable,
            reason: 'invalid_security_key'
          };
        }
      }
    }
    return null;
  });

  const [currentTable, setCurrentTable] = useState(() => {
    const existingBound = getBoundSessionTable();
    const isPrivileged = isAdminPreview || isDirectKds || isDirectWaiter;

    if (scannedTable) {
      const scannedNorm = normalizeTableNumber(scannedTable);
      const isKeyValid = verifyTableSecurityKey(scannedNorm, tableSecurityKey);

      // Non-privileged (customer/guest) security verification:
      if (!isPrivileged) {
        // Condition A: Cryptographic signature is INVALID or missing:
        if (!isKeyValid) {
          // If customer already has a bound table in session (e.g. was on T01 and manually edited URL to T02):
          if (existingBound) {
            const safeBound = Number(existingBound) < 10 ? `T0${existingBound}` : `T${existingBound}`;
            const correctSec = generateTableSecurityKey(safeBound);
            try {
              window.history.replaceState(null, '', `/?table=${safeBound}&tsec=${correctSec}`);
            } catch (e) {}
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('atmiya_tamper_flag', JSON.stringify({
                  attempted: scannedTable,
                  bound: safeBound,
                  reason: 'invalid_security_key',
                  timestamp: Date.now()
                }));
              } catch (e) {}
            }
            return safeBound;
          }

          // No existing bound session and invalid key: fallback safely to T01 while qrSecurityError blocks access
          return 'T01';
        }

        // Condition B: Signature is valid, BUT customer is attempting to switch tables while having active dining orders on their current table:
        if (existingBound && scannedNorm !== existingBound) {
          let hasActiveOrderOnBound = false;
          try {
            const rawOrders = getLocalStore('orders', []);
            if (Array.isArray(rawOrders)) {
              hasActiveOrderOnBound = rawOrders.some(o => {
                const oTbl = normalizeTableNumber(o?.table_number);
                const st = String(o?.status || '').toLowerCase().trim();
                const paySt = String(o?.payment_status || '').toLowerCase().trim();
                if (oTbl !== existingBound) return false;
                if (st === 'cancelled' || st === 'completed' || st === 'settled') return false;
                if (st === 'served' && (paySt === 'paid' || paySt === 'settled' || paySt === 'void')) return false;
                return true;
              });
            }
          } catch (e) {}

          if (hasActiveOrderOnBound) {
            const safeBound = Number(existingBound) < 10 ? `T0${existingBound}` : `T${existingBound}`;
            const correctSec = generateTableSecurityKey(safeBound);
            try {
              window.history.replaceState(null, '', `/?table=${safeBound}&tsec=${correctSec}`);
            } catch (e) {}
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('atmiya_tamper_flag', JSON.stringify({
                  attempted: scannedTable,
                  bound: safeBound,
                  reason: 'active_order_conflict',
                  timestamp: Date.now()
                }));
              } catch (e) {}
            }
            return safeBound;
          }
        }
      }

      // Valid physical QR scan OR Privileged Staff:
      if (isPrivileged || isKeyValid) {
        markCustomerSession(scannedTable);
        bindSessionTable(scannedTable);
        const formatted = Number(scannedNorm) < 10 ? `T0${scannedNorm}` : `T${scannedNorm}`;
        return formatted || scannedTable;
      }

      return scannedTable;
    }

    // If no table in URL, restore bound table from session!
    if (existingBound) {
      const safeBound = Number(existingBound) < 10 ? `T0${existingBound}` : `T${existingBound}`;
      const correctSec = generateTableSecurityKey(safeBound);
      try {
        window.history.replaceState(null, '', `/?table=${safeBound}&tsec=${correctSec}`);
      } catch (e) {}
      return safeBound;
    }
    try {
      const saved = localStorage.getItem('selected_table');
      if (saved) return saved;
    } catch {}
    return 'T01';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication State
  const [forceAuthWall, setForceAuthWall] = useState(false);
  const [authUser, setAuthState] = useState(() => {
    if (isLogoutRequested) {
      logoutAuthUser();
      return null;
    }
    const saved = getLocalStore('auth_user', null);
    if (saved) {
      if (saved.name === 'Darshit Rana') {
        const cleaned = { ...saved, name: 'Admin Owner' };
        setLocalStore('auth_user', cleaned);
        return cleaned;
      }
      return saved;
    }
    if (isDirectKds) {
      const chefProfile = {
        id: 'chef_suresh',
        name: 'Suresh Chef (KDS Station)',
        email: 'kitchen@atmiyadosa.com',
        role: 'chef',
        restaurantName: 'Atmiya Dosa Hub',
        restaurantId: RESTAURANT_ID,
        avatar: '👨‍🍳',
        status: 'active'
      };
      setLocalStore('auth_user', chefProfile);
      return chefProfile;
    }
    if (isDirectWaiter) {
      const waiterProfile = {
        id: 'WTR-101',
        waiter_id: 'WTR-101',
        name: 'Riya Patel',
        email: 'waiter@atmiyadosa.com',
        role: 'waiter',
        restaurantName: 'Atmiya Dosa Hub',
        restaurantId: RESTAURANT_ID,
        avatar: '👩‍💼',
        status: 'active'
      };
      setLocalStore('auth_user', waiterProfile);
      return waiterProfile;
    }
    return null;
  });

  // Role reference and turnover session deduplication
  const authUserRef = useRef(authUser);
  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const notifiedTurnoverSessionsRef = useRef(new Set());

  const isChefUser = authUser?.role === 'chef';
  const isWaiterUser = authUser?.role === 'waiter';
  const isAdminUser = !authUser?.role || authUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState(() => {
    if (isDirectKds) return 'kitchen';
    if (isDirectWaiter) return 'waiter';
    const saved = getLocalStore('auth_user', null);
    if (saved?.role === 'chef') return 'kitchen';
    if (saved?.role === 'waiter') return 'waiter';
    return 'dashboard';
  });

  // Strict RBAC safeguard: Ensure chef and waiter stay strictly within authorized modules
  useEffect(() => {
    if (isChefUser) {
      const allowedChefTabs = ['kitchen', 'orders'];
      if (!allowedChefTabs.includes(activeTab)) {
        setActiveTab('kitchen');
      }
    } else if (isWaiterUser) {
      const allowedWaiterTabs = ['waiter', 'orders'];
      if (!allowedWaiterTabs.includes(activeTab)) {
        setActiveTab('waiter');
      }
    }
  }, [isChefUser, isWaiterUser, activeTab]);

  // Global State (persisted & synchronized)
  const [currentLang, setCurrentLangState] = useState(() => {
    try {
      return localStorage.getItem('preferred_language') || getLocalStore('settings', INITIAL_SETTINGS)?.language || 'en';
    } catch {
      return 'en';
    }
  });

  const setCurrentLang = (newLang) => {
    setCurrentLangState(newLang);
    try {
      localStorage.setItem('preferred_language', newLang);
    } catch (e) {
      console.warn('Failed to persist preferred_language', e);
    }
  };
  const [showGlobalLangModal, setShowGlobalLangModal] = useState(false);
  // 100% Clean White Classic Theme Only (No Dark / Sapphire Mode)
  const [theme, setThemeState] = useState('light');
  const setTheme = () => {
    setThemeState('light');
    setLocalStore('app_theme', 'light');
  };
  const [settings, setSettings] = useState(() => {
    const stored = getLocalStore('settings', INITIAL_SETTINGS);
    const merged = { ...INITIAL_SETTINGS, ...stored };
    if (merged.payeeName === 'darshit rana') {
      merged.payeeName = 'Atmiya Dosa Hub';
    }
    return merged;
  });
  const [tables, setTables] = useState(() => getLocalStore('tables', INITIAL_TABLES));
  const [categories, setCategories] = useState(() => getLocalStore('categories', INITIAL_CATEGORIES));
  const [menuItems, setMenuItems] = useState(() => getLocalStore('menu_items', INITIAL_MENU_ITEMS));
  const [orders, setOrders] = useState(() => {
    const raw = getLocalStore('orders', INITIAL_ORDERS);
    if (!Array.isArray(raw)) return INITIAL_ORDERS;
    return raw.filter(o => {
      const id = String(o?.id || o?.order_number || '');
      return !DEMO_ORDER_IDS.has(id) && !id.includes('ORD9436') && !id.includes('TEST') && o?.customer_name !== 'Test Guest';
    });
  });
  const [employees, setEmployees] = useState(() => {
    const raw = getLocalStore('employees', INITIAL_EMPLOYEES);
    if (!Array.isArray(raw)) return INITIAL_EMPLOYEES;
    return raw.map(e => {
      if (e.name === 'Darshit Rana') {
        return { ...e, name: 'Admin Owner' };
      }
      return e;
    });
  });
  const [serviceCalls, setServiceCalls] = useState(() => {
    const raw = getLocalStore('service_calls', INITIAL_SERVICE_CALLS);
    if (!Array.isArray(raw)) return INITIAL_SERVICE_CALLS;
    return raw.filter(c => {
      const oid = String(c?.orderId || c?.orderNumber || '');
      const cust = String(c?.customerName || '');
      return !oid.includes('ORD9436') && !oid.includes('TEST') && !oid.includes('ORD7611') && cust !== 'Test Guest';
    });
  });
  const [customers, setCustomers] = useState(() => getLocalStore('customers', INITIAL_CUSTOMERS));
  const [activity, setActivity] = useState(() => getLocalStore('activity', INITIAL_ACTIVITY));
  const [coupons, setCoupons] = useState(() => getLocalStore('coupons', INITIAL_COUPONS));
  const [seenOrderIds, setSeenOrderIds] = useState(() => {
    try {
      const raw = localStorage.getItem('seen_order_ids');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const markOrderAsSeen = (orderId) => {
    if (!orderId) return;
    setSeenOrderIds(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      if (currentList.includes(orderId)) return currentList;
      const updated = [...currentList, orderId];
      try {
        localStorage.setItem('seen_order_ids', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save seen_order_ids', e);
      }
      return updated;
    });
  };

  const markAllCurrentOrdersAsSeen = () => {
    if (!orders || orders.length === 0) return;
    const currentIds = orders.map(o => o.id);
    setSeenOrderIds(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      const merged = Array.from(new Set([...currentList, ...currentIds]));
      try {
        localStorage.setItem('seen_order_ids', JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to save seen_order_ids', e);
      }
      return merged;
    });
  };

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [showQuickPos, setShowQuickPos] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('Wed, 15 Oct 2025 | 11:42 AM');
  const [activeToast, setActiveToast] = useState(null);

  // Auto-dismiss floating toast notifications after 8 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Continuously sanitize service calls: purge stale food_ready calls for tables that are available or orders that are settled/completed
  useEffect(() => {
    setServiceCalls(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let hasChanges = false;
      const sanitized = prev.filter(c => {
        // 1. Purge test/demo calls
        const oid = String(c?.orderId || c?.orderNumber || '');
        const cust = String(c?.customerName || '');
        if (oid.includes('ORD9436') || oid.includes('TEST') || oid.includes('ORD7611') || cust === 'Test Guest') {
          hasChanges = true;
          return false;
        }

        // 2. If it's a food_ready call:
        if (c.type === 'food_ready') {
          const tDigits = String(c.tableNumber || '').replace(/[^0-9]/g, '');
          const tCode = tDigits ? String(parseInt(tDigits, 10)) : String(c.tableNumber || '').trim().toLowerCase();
          
          // Check table status
          const tbl = tables.find(t => {
            const numDigits = String(t.number || '').replace(/[^0-9]/g, '');
            return (numDigits ? String(parseInt(numDigits, 10)) : String(t.number || '').trim().toLowerCase()) === tCode;
          });

          // If table is available (free / clean / ready to seat), purge ready food call!
          if (tbl && tbl.status === 'available') {
            hasChanges = true;
            return false;
          }

          // Check if there is any active, non-completed order for this table
          const activeOrdForTbl = orders.find(o => {
            const oDigits = String(o.table_number || '').replace(/[^0-9]/g, '');
            const oCode = oDigits ? String(parseInt(oDigits, 10)) : String(o.table_number || '').trim().toLowerCase();
            if (oCode !== tCode) return false;
            const st = String(o.status || '').toLowerCase().trim();
            const paySt = String(o.payment_status || '').toLowerCase().trim();
            if (st === 'completed' || st === 'cancelled' || st === 'settled') return false;
            if (st === 'served' && (paySt === 'paid' || paySt === 'void')) return false;
            return true;
          });

          if (!activeOrdForTbl) {
            hasChanges = true;
            return false;
          }

          // If orderId matches a completed or paid order
          const ord = orders.find(o => o.id === c.orderId || o.order_number === c.orderId);
          if (ord) {
            const st = String(ord.status || '').toLowerCase().trim();
            const paySt = String(ord.payment_status || '').toLowerCase().trim();
            if (st === 'completed' || st === 'cancelled' || st === 'settled' || (st === 'served' && (paySt === 'paid' || paySt === 'void'))) {
              hasChanges = true;
              return false;
            }
            if (c.itemIndex !== undefined && ord.items?.[c.itemIndex]?.is_served) {
              hasChanges = true;
              return false;
            }
          }
        }
        return true;
      });

      if (hasChanges) {
        setLocalStore('service_calls', sanitized);
        return sanitized;
      }
      return prev;
    });
  }, [tables, orders]);

  // On mount check if URL tampering occurred before initial render
  useEffect(() => {
    try {
      const flagStr = sessionStorage.getItem('atmiya_tamper_flag');
      if (flagStr) {
        sessionStorage.removeItem('atmiya_tamper_flag');
        const flag = JSON.parse(flagStr);
        setActiveToast({
          title: `🔒 Table Access Locked (${flag.bound})`,
          message: flag.reason === 'invalid_security_key'
            ? `Security signature for Table ${flag.attempted} is invalid. Reverted to your assigned Table ${flag.bound}.`
            : flag.reason === 'active_order_conflict'
            ? `Active dining order is in progress on ${flag.bound}. Switching to ${flag.attempted} is blocked.`
            : `Your active dining session is locked to ${flag.bound}. Manual table editing in URL (${flag.attempted}) is blocked for bill security.`,
          type: 'error'
        });
        playSound('alert');
      }
    } catch (e) {}
  }, []);

  // Live Anti-Tampering URL Monitor
  // Protects against guests manually typing a new table into browser address bar (e.g. ?table=T02)
  useEffect(() => {
    if (viewMode !== 'customer') return;

    const checkUrlTampering = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTable = params.get('table');
      const key = params.get('tsec') || params.get('key') || '';
      const isPrivileged = params.get('admin_preview') === '1' || isDirectKds || isDirectWaiter;

      if (!urlTable) {
        // If in customer session but URL query param was dropped by back button or navigation,
        // restore the bound table into URL and STAY in customer view (never reveal login page!)
        const bound = getBoundSessionTable();
        if (bound && !authUserRef.current) {
          const safeTable = Number(bound) < 10 ? `T0${bound}` : `T${bound}`;
          const correctSec = generateTableSecurityKey(safeTable);
          try {
            window.history.replaceState(null, '', `/?table=${safeTable}&tsec=${correctSec}`);
          } catch (e) {}
          setCurrentTable(safeTable);
          setViewMode('customer');
        }
        return;
      }

      const bound = getBoundSessionTable();
      const urlNorm = normalizeTableNumber(urlTable);

      // Verify cryptographic signature if not privileged
      if (!isPrivileged) {
        const isKeyValid = verifyTableSecurityKey(urlNorm, key);
        if (!isKeyValid) {
          // If customer has a bound table, revert URL to bound table immediately!
          if (bound) {
            const safeBoundTable = Number(bound) < 10 ? `T0${bound}` : `T${bound}`;
            const correctSec = generateTableSecurityKey(safeBoundTable);
            try {
              window.history.replaceState(null, '', `/?table=${safeBoundTable}&tsec=${correctSec}`);
            } catch (e) {}
            setCurrentTable(safeBoundTable);
            setActiveToast({
              title: `🔒 Table Switch Blocked`,
              message: `URL tampering detected! Security signature for Table ${urlTable} is invalid. Reverted to your assigned Table ${safeBoundTable}.`,
              type: 'error'
            });
            playSound('alert');
            return;
          } else {
            // No bound table and invalid key: trigger security error screen
            setQrSecurityError({
              attemptedTable: urlTable,
              reason: 'invalid_security_key'
            });
            return;
          }
        }
      }

      // If no bound table yet and key is valid (or privileged):
      if (!bound) {
        bindSessionTable(urlTable);
        setQrSecurityError(null);
        return;
      }

      // If bound table exists and url table is different:
      if (urlNorm !== bound) {
        const hasActiveOrder = orders.some(o => 
          normalizeTableNumber(o.table_number) === bound && 
          String(o.status || '').toLowerCase() !== 'completed' && 
          String(o.status || '').toLowerCase() !== 'cancelled' &&
          String(o.status || '').toLowerCase() !== 'settled'
        );

        const validation = validateTableAccess(urlTable, key, hasActiveOrder);
        if (!validation.allowed && !isPrivileged) {
          const safeBoundTable = Number(bound) < 10 ? `T0${bound}` : `T${bound}`;
          const correctSec = generateTableSecurityKey(safeBoundTable);
          try {
            window.history.replaceState(null, '', `/?table=${safeBoundTable}&tsec=${correctSec}`);
          } catch (e) {}
          setCurrentTable(safeBoundTable);
          setActiveToast({
            title: `🔒 Table Access Locked (${safeBoundTable})`,
            message: validation.reason === 'invalid_security_key'
              ? `Invalid QR security key for Table ${urlTable}. Reverted to your assigned Table ${safeBoundTable}.`
              : validation.reason === 'active_order_conflict'
              ? `Your active dining bill is on Table ${safeBoundTable}. You cannot switch to Table ${urlTable} while an active order is in progress.`
              : `Your active dining session is locked to Table ${safeBoundTable}. Changing tables in the URL (${urlTable}) is prevented for your bill's security.`,
            type: 'error'
          });
          playSound('alert');
        } else if (validation.allowed) {
          bindSessionTable(urlTable);
          setCurrentTable(urlTable);
          setQrSecurityError(null);
        }
      } else {
        setQrSecurityError(null);
      }
    };

    window.addEventListener('popstate', checkUrlTampering);
    checkUrlTampering();
    return () => window.removeEventListener('popstate', checkUrlTampering);
  }, [viewMode, orders]);

  // Universal Toast Alert Renderer (works on both Customer Menu and Admin Dashboard)
  const renderActiveToast = () => {
    if (!activeToast) return null;
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] w-[92%] sm:w-auto sm:min-w-[420px] max-w-lg animate-in slide-in-from-top-3 duration-200">
        <div className={`p-3.5 rounded-2xl border shadow-2xl flex items-center justify-between gap-3 ${
          activeToast.type === 'error' || activeToast.type === 'danger'
            ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-500/20'
            : activeToast.type === 'service' 
              ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-500/10' 
              : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-500/10'
        }`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              activeToast.type === 'error' || activeToast.type === 'danger'
                ? 'bg-rose-600 text-white'
                : activeToast.type === 'service'
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
            }`}>
              {activeToast.type === 'error' || activeToast.type === 'danger' ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : activeToast.type === 'service' ? (
                <BellRing className="w-5 h-5 animate-bounce" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black font-heading leading-tight truncate">
                {activeToast.title}
              </div>
              <div className="text-[11px] font-medium opacity-85 truncate mt-0.5">
                {activeToast.message}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {activeToast.type === 'service' && activeToast.callId && (
              <button
                onClick={() => handleDismissServiceCall(activeToast.callId)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Attend
              </button>
            )}
            {activeToast.type === 'order' && (
              <button
                onClick={() => {
                  setActiveTab('kitchen');
                  setActiveToast(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Kitchen →
              </button>
            )}
            <button
              onClick={() => setActiveToast(null)}
              className="p-1 rounded-lg hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const t = (key) => getTranslation(currentLang, key);

  // Real-time listener for updates across tabs / components
  const loadFreshState = () => {
    setSettings(getLocalStore('settings', INITIAL_SETTINGS));
    setTables(getLocalStore('tables', INITIAL_TABLES));
    setCategories(getLocalStore('categories', INITIAL_CATEGORIES));
    setMenuItems(getLocalStore('menu_items', INITIAL_MENU_ITEMS));
    setOrders(getLocalStore('orders', INITIAL_ORDERS));
    setActivity(getLocalStore('activity', INITIAL_ACTIVITY));
    setEmployees(getLocalStore('employees', INITIAL_EMPLOYEES));
    setCoupons(getLocalStore('coupons', INITIAL_COUPONS));
    setServiceCalls(getLocalStore('service_calls', INITIAL_SERVICE_CALLS));
    setCustomers(getLocalStore('customers', INITIAL_CUSTOMERS));
    setAuthState(getLocalStore('auth_user', null));
  };

  useEffect(() => {
    window.addEventListener('restaurant_data_updated', loadFreshState);
    window.addEventListener('storage', loadFreshState);
    return () => {
      window.removeEventListener('restaurant_data_updated', loadFreshState);
      window.removeEventListener('storage', loadFreshState);
    };
  }, []);

  // Register Service Worker on mount for mobile lock screen & background push notifications
  useEffect(() => {
    registerServiceWorker();

    // Purge old mock demo orders and stuck test orders from localStorage so tables are fresh
    const cachedOrders = getLocalStore('orders', []);
    let hasOrderChanges = false;
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    const cleaned = cachedOrders
      .filter(o => {
        const id = String(o?.id || o?.order_number || '');
        if (DEMO_ORDER_IDS.has(id) || DEMO_ORDER_IDS.has(o?.order_number)) return false;
        if (id.includes('ORD9436') || id.includes('TEST') || id.includes('DEMO')) return false;
        if (o?.customer_name === 'Test Guest') return false;
        return true;
      })
      .map(o => {
        const st = (o.status || '').toLowerCase();
        const orderTime = o.placed_at || o.created_at;
        const isStale = orderTime && (now - new Date(orderTime).getTime() > THREE_HOURS_MS);

        const paySt = (o.payment_status || '').toLowerCase();
        // If an order is already served (or completed/settled) AND paid, it is completed!
        if ((st === 'served' || st === 'completed' || st === 'settled') && (paySt === 'paid' || paySt === 'void')) {
          if (st !== 'completed') {
            hasOrderChanges = true;
            return {
              ...o,
              status: 'Completed',
              payment_status: 'Paid'
            };
          }
        }

        // Auto-complete stale kitchen tickets older than 3 hours
        if (isStale && st !== 'completed' && st !== 'cancelled') {
          hasOrderChanges = true;
          return {
            ...o,
            status: 'Completed',
            payment_status: 'Paid',
            items: (o.items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'ready' }))
          };
        }

        if (st === 'cancelled' && paySt !== 'paid' && o.payment_status !== 'Void') {
          hasOrderChanges = true;
          return { ...o, payment_status: 'Void' };
        }
        return o;
      });

    if (hasOrderChanges || cleaned.length !== cachedOrders.length) {
      setLocalStore('orders', cleaned);
      setOrders(cleaned);
    }

    // Auto-reconcile tables against active orders:
    // If a table has NO active dining orders, it MUST be VACANT / available.
    // This purges ghost occupied tables leftover from stale demo orders or local storage.
    const effectiveOrders = (hasOrderChanges || cleaned.length !== cachedOrders.length) ? cleaned : cachedOrders;
    const activeOrderTableNumbers = new Set(
      effectiveOrders
        .filter(o => {
          const st = (o.status || '').toLowerCase();
          const paySt = (o.payment_status || '').toLowerCase();
          const isCancelled = st === 'cancelled';
          const orderTime = o.placed_at || o.created_at;
          const isStale = orderTime && (now - new Date(orderTime).getTime() > THREE_HOURS_MS);
          if (isStale) return false;

          // If an order is served/completed AND paid, it is NOT an active table order!
          if ((st === 'served' || st === 'completed' || st === 'settled') && (paySt === 'paid' || paySt === 'void')) {
            return false;
          }

          const isUnpaid = !isCancelled && (
            paySt === 'pending cash' || 
            paySt === 'unpaid'
          );
          return (!isCancelled && st !== 'completed' && st !== 'settled') || isUnpaid;
        })
        .map(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0'))
    );

    const cachedTables = getLocalStore('tables', INITIAL_TABLES);
    const sanitizedTables = cachedTables.map(t => {
      const code = (t.number || '').replace(/\D/g, '').padStart(2, '0');
      const hasActive = activeOrderTableNumbers.has(code);
      if (!hasActive && (t.status === 'occupied' || t.current_order_id || t.timing)) {
        return {
          ...t,
          status: 'available',
          current_order_id: null,
          current_customer_name: null,
          current_customer_phone: null,
          timing: null,
          food_delivered_at: null,
          turnover_notified: false
        };
      }
      return t;
    });

    setLocalStore('tables', sanitizedTables);
    setTables(sanitizedTables);

    // Ensure water is excluded from customer menu items (waiter add-on exclusive)
    const cachedItems = getLocalStore('menu_items', INITIAL_MENU_ITEMS);
    const sanitizedItems = cachedItems.filter(i => 
      i.id !== 'ATM_WATER_01' && 
      !i.id?.startsWith('ATM_WATER') && 
      !i.is_water &&
      !(i.name && i.name.toLowerCase().includes('mineral water'))
    );
    if (sanitizedItems.length !== cachedItems.length) {
      setLocalStore('menu_items', sanitizedItems);
      setMenuItems(sanitizedItems);
    }
    const cachedCats = getLocalStore('categories', INITIAL_CATEGORIES);
    setCategories(cachedCats);
  }, []);

  // Live Supabase Orders Synchronization Helper
  const refreshOrdersFromSupabase = useCallback(async () => {
    try {
      const dbOrders = await fetchLiveOrdersFromSupabase();
      if (!dbOrders || dbOrders.length === 0) return;

      const syncNow = Date.now();
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      const mappedDbOrders = dbOrders
        .filter(o => !DEMO_ORDER_IDS.has(o.order_number) && !DEMO_ORDER_IDS.has(o.id))
        .map(mapDbOrderToFrontend);

      setOrders(prev => {
        const merged = mappedDbOrders.map(mo => {
          const localMatch = (prev || []).find(po => 
            po.id === mo.id || 
            (po.supabase_order_id && mo.supabase_order_id === po.supabase_order_id) ||
            (po.order_number && mo.order_number === po.order_number) ||
            (po.id && String(po.id).replace('#', '') === String(mo.order_number || mo.id).replace('#', ''))
          );
          if (!localMatch) return mo;

          // Merge item ready/served states so locally updated dishes NEVER revert to 'placed'
          const dbItems = (mo.items && mo.items.length > 0) ? mo.items : (localMatch.items || []);
          const mergedItems = dbItems.map((dbItem, idx) => {
            const localItem = localMatch.items?.[idx] || (localMatch.items || []).find(it => it.name === dbItem.name);
            const isLocalServed = Boolean(localItem?.is_served);
            const isLocalReady = Boolean(localItem && (localItem.kitchen_status === 'ready' || isLocalServed));
            const isDbServed = Boolean(dbItem.is_served || dbItem.kitchen_status === 'served');
            const isDbReady = Boolean(dbItem.kitchen_status === 'ready');
            const finalServed = isLocalServed || isDbServed;
            const finalReady = finalServed || isLocalReady || isDbReady;

            return {
              ...dbItem,
              kitchen_status: finalServed ? 'served' : (finalReady ? 'ready' : (dbItem.kitchen_status || 'placed')),
              is_served: finalServed,
              ready_at: localItem?.ready_at || dbItem.ready_at,
              served_at: localItem?.served_at || dbItem.served_at
            };
          });

          const allMergedReady = mergedItems.length > 0 && mergedItems.every(i => i.kitchen_status === 'ready' || i.is_served);
          let preservedStatus = mo.status;
          if (localMatch.status === 'Completed' || mo.status === 'Completed') {
            preservedStatus = 'Completed';
          } else if (localMatch.status === 'Cancelled' || mo.status === 'Cancelled') {
            preservedStatus = 'Cancelled';
          } else if (localMatch.status === 'Served' || mo.status === 'Served') {
            preservedStatus = 'Served';
          } else if (allMergedReady) {
            preservedStatus = 'Ready';
          } else if (localMatch.status === 'Ready' && mo.status === 'Placed') {
            preservedStatus = 'Ready';
          } else if (localMatch.status === 'Preparing' && mo.status === 'Placed') {
            preservedStatus = 'Preparing';
          }

          const orderSettledAt = mo.settled_at || localMatch.settled_at || (preservedStatus === 'Completed' ? (mo.served_at || mo.placed_at || new Date().toISOString()) : null);

          return {
            ...mo,
            items: mergedItems,
            status: preservedStatus,
            payment_status: preservedStatus === 'Completed' ? 'Paid' : (mo.payment_status || localMatch.payment_status),
            settled_at: orderSettledAt,
            completed_at: orderSettledAt
          };
        });

        // Retain active orders that haven't synced into DB yet so they are NEVER wiped until completed & delivered!
        (prev || []).forEach(po => {
          const isAlreadyInDb = merged.some(mo => 
            mo.id === po.id || 
            (po.supabase_order_id && mo.supabase_order_id === po.supabase_order_id) ||
            (po.order_number && mo.order_number === po.order_number) ||
            (po.id && String(po.id).replace('#', '') === String(mo.order_number || mo.id).replace('#', ''))
          );
          const isTestDummy = String(po.id || '').includes('TEST') || DEMO_ORDER_IDS.has(po.id) || !po.table_number;
          const st = String(po.status || '').toLowerCase();
          const isUnsettled = st !== 'completed' && st !== 'cancelled' && st !== 'settled';
          if (!isAlreadyInDb && !isTestDummy && isUnsettled) {
            merged.push(po);
          }
        });
        setLocalStore('orders', merged);
        return merged;
      });

      // Reconcile tables with latest orders
      setTables(prevTables => {
        const activeTbls = new Set(
          mappedDbOrders
            .filter(o => {
              const st = (o.status || '').toLowerCase();
              const paySt = (o.payment_status || '').toLowerCase();
              const isCancelled = st === 'cancelled';
              const orderTime = o.placed_at || o.created_at;
              const isStale = orderTime && (syncNow - new Date(orderTime).getTime() > THREE_HOURS_MS);
              if (isStale) return false;

              // If order is completed, cancelled, or settled, it is done - table is free!
              if (isCancelled || st === 'completed' || st === 'settled') {
                return false;
              }
              if (st === 'served' && (paySt === 'paid' || paySt === 'void')) {
                return false;
              }

              const isUnpaid = paySt === 'pending cash' || paySt === 'unpaid';
              return st !== 'served' || isUnpaid;
            })
            .map(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0'))
        );

        const reconciled = (prevTables || []).map(t => {
          const code = (t.number || '').replace(/\D/g, '').padStart(2, '0');
          const hasActive = activeTbls.has(code);
          if (hasActive) {
            const matchOrd = mappedDbOrders.find(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0') === code);
            return {
              ...t,
              status: 'occupied',
              current_order_id: matchOrd?.id || t.current_order_id,
              current_customer_name: matchOrd?.customer_name || t.current_customer_name,
              current_customer_phone: matchOrd?.customer_phone || t.current_customer_phone
            };
          } else if (t.status === 'occupied' || t.current_order_id || t.timing) {
            return {
              ...t,
              status: 'available',
              current_order_id: null,
              current_customer_name: null,
              current_customer_phone: null,
              timing: null,
              food_delivered_at: null,
              turnover_notified: false
            };
          }
          return t;
        });

        // Ensure newly ordered dining tables not yet in prevTables are dynamically included on all screens!
        const existingCodes = new Set((reconciled || []).map(t => (t.number || '').replace(/\D/g, '').padStart(2, '0')));
        activeTbls.forEach(code => {
          if (!existingCodes.has(code)) {
            const matchOrd = mappedDbOrders.find(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0') === code);
            const rawTbl = matchOrd?.table_number || `T${code}`;
            const cleanDigits = rawTbl.replace(/[^0-9]/g, '');
            const tableNumStr = cleanDigits 
              ? (parseInt(cleanDigits, 10) < 10 ? `T0${parseInt(cleanDigits, 10)}` : `T${parseInt(cleanDigits, 10)}`) 
              : rawTbl;
            reconciled.push({
              id: tableNumStr,
              number: tableNumStr,
              capacity: 4,
              zone: 'Main Hall',
              status: 'occupied',
              current_order_id: matchOrd?.id,
              current_customer_name: matchOrd?.customer_name,
              current_customer_phone: matchOrd?.customer_phone,
              timing: null
            });
            existingCodes.add(code);
          }
        });

        setLocalStore('tables', reconciled);
        return reconciled;
      });
    } catch (err) {
      console.warn('[SUPABASE] Refresh live orders notice:', err);
    }
  }, []);

  // Live Floor Tables Synchronizer: Guarantees newly created tables (Tables 17+) reflect across all devices
  const refreshTablesFromSupabase = useCallback(async () => {
    try {
      const liveTables = await fetchLiveTablesFromSupabase();
      if (liveTables && Array.isArray(liveTables) && liveTables.length > 0) {
        setTables(prevTables => {
          const map = new Map();
          // Populate live tables from Supabase Cloud
          liveTables.forEach(lt => {
            const code = (lt.number || '').replace(/\D/g, '');
            const key = code ? parseInt(code, 10) : lt.number;
            map.set(key, lt);
          });
          // Preserve local dynamic runtime properties (active orders, seated timing, delivered timestamps)
          (prevTables || []).forEach(pt => {
            const code = (pt.number || '').replace(/\D/g, '');
            const key = code ? parseInt(code, 10) : pt.number;
            if (map.has(key)) {
              const existing = map.get(key);
              const isVacant = String(existing.status || '').toLowerCase() === 'vacant' || String(existing.status || '').toLowerCase() === 'available';
              map.set(key, {
                ...existing,
                current_order_id: isVacant ? null : (pt.current_order_id || existing.current_order_id),
                current_customer_name: isVacant ? null : (pt.current_customer_name || existing.current_customer_name),
                current_customer_phone: isVacant ? null : (pt.current_customer_phone || existing.current_customer_phone),
                timing: isVacant ? null : (pt.timing || existing.timing),
                food_delivered_at: isVacant ? null : (pt.food_delivered_at || existing.food_delivered_at),
                turnover_notified: isVacant ? false : (pt.turnover_notified || existing.turnover_notified),
                status: isVacant ? 'available' : (existing.status || pt.status || 'available')
              });
            } else {
              map.set(key, pt);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => {
            const numA = parseInt(String(a.number).replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(b.number).replace(/\D/g, ''), 10) || 0;
            return numA - numB;
          });
          setLocalStore('tables', merged);
          return merged;
        });
      }
    } catch (tblErr) {
      console.warn('[SUPABASE] Refresh live tables notice:', tblErr);
    }
  }, []);

  // 4-Second Resilient Fallback Poller: Guarantees orders & tables stay 100% in sync across devices
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden || authUserRef.current) {
        refreshOrdersFromSupabase();
        refreshTablesFromSupabase();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshOrdersFromSupabase, refreshTablesFromSupabase]);

  // Live Supabase Synchronization Hook (keeps QR Menu, Admin POS & Kitchen in 100% real-time sync)
  useEffect(() => {
    let orderChannel = null;
    let alertsChannel = null;

    async function syncFromSupabase() {
      // 1. Always sync live authoritative menu & uploaded photos from Backend (/api/menu)
      try {
        const bRes = await fetch(`${API_BASE_URL}/menu`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData?.items && Array.isArray(bData.items) && bData.items.length > 0) {
            setMenuItems(prev => {
              const updatedList = [...prev];
              bData.items.forEach(bItem => {
                const idx = updatedList.findIndex(m => m.id === bItem.id || (m.name && bItem.name && m.name.toLowerCase().trim() === bItem.name.toLowerCase().trim()));
                const bPhoto = bItem.image_url || bItem.image || null;
                if (idx >= 0) {
                  if (bPhoto) {
                    updatedList[idx].image_url = bPhoto;
                    updatedList[idx].imageUrl = bPhoto;
                    updatedList[idx].image = bPhoto;
                    updatedList[idx].photo = bPhoto;
                  }
                  if (bItem.price !== undefined) {
                    updatedList[idx].price = Number(bItem.price);
                    updatedList[idx].originalPrice = Number(bItem.price);
                    updatedList[idx].finalPrice = Number(bItem.price);
                  }
                  if (bItem.is_available !== undefined) {
                    updatedList[idx].is_available = bItem.is_available;
                    updatedList[idx].isAvailable = bItem.is_available;
                  }
                  if (bItem.category) updatedList[idx].category = bItem.category;
                } else {
                  updatedList.push({
                    ...bItem,
                    english_name: bItem.name,
                    gujarati_name: bItem.gujarati_name || bItem.name,
                    price: Number(bItem.price),
                    originalPrice: Number(bItem.price),
                    finalPrice: Number(bItem.price),
                    image_url: bPhoto,
                    imageUrl: bPhoto,
                    image: bPhoto,
                    photo: bPhoto,
                    cuisine: getDishCuisine(bItem),
                    orders_count: 10,
                    rating: 4.8,
                    prepTimeMins: bItem.prep_time_mins || 10
                  });
                }
              });
              setLocalStore('menu_items', updatedList);
              return updatedList;
            });
          }
        }
      } catch (bErr) {
        console.warn('[MENU SYNC] Server fetch notice:', bErr);
      }

      try {
        const { data: supaCategories, error: catErr } = await supabase
          .from('menu_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        const { data: supaItems, error: itemErr } = await supabase
          .from('menu_items')
          .select('*')
          .order('name', { ascending: true });

        const isMenuCleared = typeof localStorage !== 'undefined' && localStorage.getItem('restaurant_menu_cleared') === 'true';
        if (!isMenuCleared && !catErr && supaCategories && supaCategories.length > 0) {
          const catMap = {};
          supaCategories.forEach(c => { catMap[c.id] = c.name; });

          if (!itemErr && supaItems && supaItems.length > 0) {
            const mappedItems = supaItems.map((item, idx) => {
              const photo = item.image_url || null;
              const priceNum = parseFloat(item.price) || 0;
              return {
                id: item.id,
                name: item.name,
                english_name: item.name,
                gujarati_name: item.gujarati_name || item.name,
                category: catMap[item.category_id] || 'Other',
                price: priceNum,
                originalPrice: priceNum,
                finalPrice: priceNum,
                hasDiscount: false,
                discountPercent: 0,
                description: item.description || '',
                image_url: photo,
                image: photo,
                imageUrl: photo,
                photo: photo,
                is_veg: true,
                is_spicy: (item.name || '').toLowerCase().includes('sezwan') || 
                          (item.name || '').toLowerCase().includes('chilly') || 
                          (item.name || '').toLowerCase().includes('garlic'),
                is_available: item.is_available !== false,
                isAvailable: item.is_available !== false,
                is_jain_available: Boolean(item.is_jain_available),
                orders_count: 20 + (idx % 30),
                prepTimeMins: item.prep_time_mins || 10,
                rating: 4.8,
                notes: ''
              };
            });

            // CLOUD-AUTHORITATIVE PRESERVATION MERGE:
            // Supabase Cloud is the single source of truth for items, prices, and live availability.
            // Local store only enriches images and promotional discounts.
            const currentLocal = getLocalStore('menu_items', INITIAL_MENU_ITEMS) || [];
            const localById = new Map();
            const localByName = new Map();
            currentLocal.forEach(it => {
              if (it.id) localById.set(it.id, it);
              if (it.name) localByName.set(it.name.toLowerCase().trim(), it);
            });

            const mergedItems = mappedItems.map(supaItem => {
              const matchedLocal = localById.get(supaItem.id) || localByName.get(supaItem.name.toLowerCase().trim());
              if (matchedLocal) {
                const photo = supaItem.image_url || matchedLocal.image_url || matchedLocal.imageUrl || matchedLocal.image || matchedLocal.photo || null;
                const cuisine = matchedLocal.cuisine || getDishCuisine(matchedLocal);
                const basePrice = (supaItem.price !== undefined && supaItem.price !== null) ? supaItem.price : (matchedLocal.price || 0);
                const hasDisc = matchedLocal.hasDiscount === true;
                const discPct = matchedLocal.discountPercent || 0;
                const finalP = hasDisc ? Math.max(0, Math.round(basePrice * (1 - discPct / 100))) : basePrice;

                return {
                  ...supaItem,
                  image_url: photo,
                  image: photo,
                  imageUrl: photo,
                  photo: photo,
                  cuisine: cuisine,
                  price: finalP,
                  originalPrice: basePrice,
                  finalPrice: finalP,
                  hasDiscount: hasDisc,
                  discountPercent: discPct,
                  is_available: supaItem.is_available,
                  isAvailable: supaItem.is_available,
                  orders_count: matchedLocal.orders_count || supaItem.orders_count,
                  description: supaItem.description || matchedLocal.description
                };
              }
              const photo = supaItem.image_url;
              return {
                ...supaItem,
                image: photo,
                imageUrl: photo,
                photo: photo,
                cuisine: getDishCuisine(supaItem),
                isAvailable: supaItem.is_available
              };
            });

            // Keep locally added dishes that are not in Supabase yet (e.g. m_1729...)
            currentLocal.forEach(locIt => {
              const exists = mergedItems.some(m => m.id === locIt.id || (m.name && locIt.name && m.name.toLowerCase().trim() === locIt.name.toLowerCase().trim()));
              if (!exists) {
                const photo = locIt.image_url || locIt.imageUrl || locIt.image || locIt.photo || null;
                mergedItems.push({
                  ...locIt,
                  image_url: photo,
                  image: photo,
                  imageUrl: photo,
                  photo: photo,
                  cuisine: locIt.cuisine || getDishCuisine(locIt),
                  is_available: locIt.is_available !== false,
                  isAvailable: locIt.is_available !== false
                });
              }
            });

            // Also merge any dishes from backend /menu (e.g. dishes added via POS/Admin API)
            try {
              const bRes = await fetch(`${API_BASE_URL}/menu`);
              if (bRes.ok) {
                const bData = await bRes.json();
                if (bData?.items && Array.isArray(bData.items)) {
                  bData.items.forEach(bItem => {
                    const idx = mergedItems.findIndex(m => m.id === bItem.id || (m.name && bItem.name && m.name.toLowerCase().trim() === bItem.name.toLowerCase().trim()));
                    const bPhoto = bItem.image_url || null;
                    if (idx >= 0) {
                      if (bPhoto) {
                        mergedItems[idx].image_url = bPhoto;
                        mergedItems[idx].imageUrl = bPhoto;
                        mergedItems[idx].image = bPhoto;
                        mergedItems[idx].photo = bPhoto;
                      }
                      if (bItem.price !== undefined) {
                        mergedItems[idx].price = bItem.price;
                        mergedItems[idx].originalPrice = bItem.price;
                        mergedItems[idx].finalPrice = bItem.price;
                      }
                      if (bItem.is_available !== undefined) {
                        mergedItems[idx].is_available = bItem.is_available;
                        mergedItems[idx].isAvailable = bItem.is_available;
                      }
                      if (bItem.category) mergedItems[idx].category = bItem.category;
                    } else {
                      mergedItems.push({
                        ...bItem,
                        english_name: bItem.name,
                        gujarati_name: bItem.gujarati_name || bItem.name,
                        originalPrice: bItem.price,
                        finalPrice: bItem.price,
                        image_url: bPhoto,
                        imageUrl: bPhoto,
                        image: bPhoto,
                        photo: bPhoto,
                        cuisine: getDishCuisine(bItem),
                        orders_count: 10,
                        rating: 4.8,
                        prepTimeMins: bItem.prep_time_mins || 10
                      });
                    }
                  });
                }
              }
            } catch (bErr) {
              // backend optional
            }

            setMenuItems(mergedItems);
            setLocalStore('menu_items', mergedItems);
            try {
              localStorage.setItem('atmiya_menu_items', JSON.stringify(mergedItems));
            } catch (e) {}

            const mappedCategories = supaCategories.map(c => ({
              id: c.id,
              name: c.name,
              gujarati: c.gujarati_name || c.name,
              icon: c.icon || 'Utensils',
              percentage: 10
            }));
            setCategories(mappedCategories);
            setLocalStore('categories', mappedCategories);
          }
        }

        // Live Orders initial sync from Supabase
        await refreshOrdersFromSupabase();

        // Restore active un-attended table service calls from Supabase audit_logs
        try {
          const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
          const { data: recentLogs } = await supabase
            .from('audit_logs')
            .select('*')
            .gte('created_at', fourHoursAgo)
            .in('action_type', ['CALL_WAITER', 'CALL_WATER', 'CALL_BILL', 'CALL_CLEAN'])
            .order('created_at', { ascending: false })
            .limit(25);

          if (recentLogs && recentLogs.length > 0) {
            const { data: attendedLogs } = await supabase
              .from('audit_logs')
              .select('details')
              .gte('created_at', fourHoursAgo)
              .eq('action_type', 'SERVICE_ATTENDED');

            const attendedSet = new Set((attendedLogs || []).map(a => a.details));
            const labelsMap = {
              CALL_WAITER: 'Floor Waiter Assistance',
              CALL_WATER: 'Drinking Water Refill',
              CALL_BILL: 'Bill Settlement Request',
              CALL_CLEAN: 'Table Cleaning'
            };

            const restoredCalls = recentLogs
              .filter(log => !attendedSet.has(`Attended ${log.id}`))
              .map(log => ({
                id: log.id || `srv_${new Date(log.created_at).getTime()}`,
                tableNumber: log.table_number || '01',
                type: log.action_type?.replace('CALL_', '') || 'WAITER',
                label: labelsMap[log.action_type] || log.details || 'Floor Assistance',
                time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'pending'
              }));

            if (restoredCalls.length > 0) {
              setServiceCalls(prev => {
                const merged = [...restoredCalls];
                prev.forEach(p => {
                  if (!merged.some(m => m.id === p.id)) {
                    merged.push(p);
                  }
                });
                setLocalStore('service_calls', merged);
                return merged;
              });
            }
          }
        } catch (srvErr) {
          console.warn('[SUPABASE] Service logs restore notice:', srvErr);
        }

        // 1. Subscribe to live order updates from Supabase Realtime
        orderChannel = supabase
          .channel(`realtime:app_orders_${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
            console.log('[SUPABASE REALTIME] Order postgres_changes event:', payload?.eventType);

            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            // If a new order is placed from ANY phone/device, trigger alerts ONLY to relevant staff roles
            if (payload?.eventType === 'INSERT' && payload?.new && isStaffLoggedIn) {
              const newOrd = payload.new;
              const tbl = (newOrd.table_number || '01').replace(/\D/g, '');
              const ordNum = newOrd.order_number || '';
              const cust = newOrd.customer_name || 'Guest';

              if (currentRole === 'chef' || currentRole === 'admin') {
                triggerStaffOrderNotification({
                  tableNumber: tbl,
                  orderNumber: ordNum,
                  customerName: cust,
                  paymentMode: newOrd.payment_method || 'Cash'
                });
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: `🚨 Table ${tbl} — New KOT Placed!`,
                  message: `Order #${ordNum} (${newOrd.payment_method || 'Cash'}) from ${cust}. Start prep now!`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              } else if (currentRole === 'waiter') {
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: `📝 Table ${tbl}: New Order Placed`,
                  message: `Order #${ordNum} placed for Table ${tbl}. Ticket queued in kitchen.`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              }
            }

            await refreshOrdersFromSupabase();
            loadFreshState();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async (payload) => {
            console.log('[SUPABASE REALTIME] menu_items postgres_changes event:', payload?.eventType);
            if (payload?.eventType === 'DELETE' && payload?.old?.id) {
              setMenuItems(prev => {
                const updated = prev.filter(it => it.id !== payload.old.id);
                setLocalStore('menu_items', updated);
                return updated;
              });
            } else if (payload?.new) {
              const changed = payload.new;
              setMenuItems(prev => {
                const idx = prev.findIndex(it => it.id === changed.id || (it.name && changed.name && it.name.toLowerCase().trim() === changed.name.toLowerCase().trim()));
                if (idx >= 0) {
                  const updated = [...prev];
                  const current = updated[idx];
                  const basePrice = parseFloat(changed.price) || current.price;
                  const hasDisc = current.hasDiscount === true;
                  const finalP = hasDisc ? Math.max(0, Math.round(basePrice * (1 - (current.discountPercent || 0)/100))) : basePrice;
                  updated[idx] = {
                    ...current,
                    price: finalP,
                    originalPrice: basePrice,
                    finalPrice: finalP,
                    is_available: changed.is_available !== false,
                    isAvailable: changed.is_available !== false,
                    description: changed.description || current.description,
                    image_url: changed.image_url || current.image_url,
                    image: changed.image_url || current.image,
                    imageUrl: changed.image_url || current.imageUrl,
                    photo: changed.image_url || current.photo
                  };
                  setLocalStore('menu_items', updated);
                  return updated;
                }
                return prev;
              });
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, async (payload) => {
            console.log('[SUPABASE REALTIME] restaurant_tables postgres_changes event:', payload?.eventType);
            await refreshTablesFromSupabase();
            await refreshOrdersFromSupabase();
          })
          .subscribe();

        // 2. Subscribe to cross-device Table Service Calls, Food Ready Broadcast & New Orders ('restaurant_alerts')
        alertsChannel = supabase
          .channel('restaurant_alerts')
          .on('broadcast', { event: 'new_order_placed' }, async ({ payload }) => {
            console.log('[SUPABASE REALTIME] Incoming new order broadcast:', payload);
            if (!payload) return;

            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            // Trigger alerts strictly on authenticated staff terminals!
            if (isStaffLoggedIn) {
              const tbl = (payload.table_number || '01').replace(/\D/g, '');
              const ordNum = payload.order_number || '';
              const cust = payload.customer_name || 'Guest';

              if (currentRole === 'chef' || currentRole === 'admin') {
                triggerStaffOrderNotification({
                  tableNumber: tbl,
                  orderNumber: ordNum,
                  customerName: cust,
                  paymentMode: payload.payment_mode || 'Cash',
                  isAddon: payload.is_addon || false
                });
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: `🚨 Table ${tbl} — New KOT Placed!`,
                  message: `Order #${ordNum} (${payload.payment_mode || 'Cash'}) from ${cust}. Start prep now!`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              } else if (currentRole === 'waiter') {
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: `📝 Table ${tbl}: New Order Placed`,
                  message: `Order #${ordNum} placed for Table ${tbl}. Ticket queued in kitchen.`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              }
            }

            loadFreshState();
            await refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'order_status_updated' }, async () => {
            await refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'table_session_settled' }, async () => {
            await refreshOrdersFromSupabase();
            await refreshTablesFromSupabase();
          })
          .on('broadcast', { event: 'table_created' }, async () => {
            await refreshTablesFromSupabase();
          })
          .on('broadcast', { event: 'table_updated' }, async () => {
            await refreshTablesFromSupabase();
          })
          .on('broadcast', { event: 'table_deleted' }, async () => {
            await refreshTablesFromSupabase();
          })
          .on('broadcast', { event: 'food_ready_for_pickup' }, ({ payload }) => {
            console.log('[SUPABASE REALTIME] Food ready for pickup:', payload);
            if (!payload || !payload.tableNumber) return;

            loadFreshState();
            refreshOrdersFromSupabase();

            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            // WAITER FOOD RUNNER & ADMIN: Announce ready dishes waiting on counter
            if (isStaffLoggedIn && (currentRole === 'waiter' || currentRole === 'admin')) {
              triggerWaiterFoodReadyNotification({
                tableNumber: payload.tableNumber,
                orderNumber: payload.orderNumber,
                itemsSummary: payload.itemsSummary
              });
              const readyCall = {
                id: `ready_${payload.orderId || payload.tableNumber}_${Date.now()}`,
                tableNumber: payload.tableNumber,
                label: `Food Ready: ${payload.itemsSummary || 'Dishes Plated'}`,
                type: 'food_ready',
                orderId: payload.orderId,
                orderNumber: payload.orderNumber,
                itemsSummary: payload.itemsSummary,
                time: 'Just now',
                timestamp: Date.now()
              };
              setServiceCalls(prev => {
                const updated = [readyCall, ...prev.filter(c => !(c.type === 'food_ready' && c.orderId && c.orderId === payload.orderId))];
                setLocalStore('service_calls', updated);
                return updated;
              });
              setActiveToast({
                id: `ready_${Date.now()}`,
                title: `🍽️ Table ${payload.tableNumber}: Food Ready for Pickup!`,
                message: `${payload.itemsSummary || 'Plated food'} waiting on counter. Collect & deliver to table.`,
                type: 'ready',
                time: 'Just now',
                tableNumber: payload.tableNumber
              });
            }
          })
          .on('broadcast', { event: 'order_item_ready' }, ({ payload }) => {
            console.log('[SUPABASE REALTIME] Incoming order_item_ready broadcast:', payload);
            if (!payload || !payload.tableNumber) return;

            loadFreshState();
            refreshOrdersFromSupabase();

            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            // WAITER FOOD RUNNER & ADMIN ONLY: Announce ready dishes waiting on counter
            if (isStaffLoggedIn && (currentRole === 'waiter' || currentRole === 'admin')) {
              const summary = payload.itemsSummary || (payload.qty ? `${payload.qty}x ${payload.itemName}` : 'Dish Item');
              triggerWaiterFoodReadyNotification({
                tableNumber: payload.tableNumber,
                orderNumber: payload.orderNumber || payload.orderId,
                itemsSummary: summary
              });
              const readyCall = {
                id: `ready_${payload.orderId || payload.tableNumber}_${payload.itemIndex ?? Date.now()}`,
                tableNumber: payload.tableNumber,
                label: `Food Ready: ${summary}`,
                type: 'food_ready',
                orderId: payload.orderId,
                orderNumber: payload.orderNumber || payload.orderId,
                itemIndex: payload.itemIndex,
                itemsSummary: summary,
                time: 'Just now',
                timestamp: Date.now()
              };
              setServiceCalls(prev => {
                const updated = [readyCall, ...prev.filter(c => !(c.type === 'food_ready' && c.orderId === payload.orderId && c.itemIndex === payload.itemIndex))];
                setLocalStore('service_calls', updated);
                return updated;
              });
              setActiveToast({
                id: `ready_${Date.now()}`,
                title: `🍽️ Table ${payload.tableNumber}: ${summary} Ready!`,
                message: `Plated hot on kitchen counter. Pick up & deliver to Table ${payload.tableNumber}.`,
                type: 'ready',
                time: 'Just now',
                tableNumber: payload.tableNumber
              });
            }
          })
          .on('broadcast', { event: 'service_call' }, ({ payload }) => {
            console.log('[SUPABASE REALTIME] Incoming service call broadcast:', payload);
            if (!payload || !payload.id) return;

            // Update local serviceCalls state
            setServiceCalls(prev => {
              if (prev.some(c => c.id === payload.id)) return prev;
              const updated = [payload, ...prev.slice(0, 24)];
              setLocalStore('service_calls', updated);
              return updated;
            });

            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            // WAITER: Primary responder to customer floor calls (Water, Bill, Waiter, Clean)
            if (isStaffLoggedIn && currentRole === 'waiter') {
              triggerStaffServiceNotification({
                tableNumber: payload.tableNumber,
                type: payload.type,
                label: payload.label,
                customerName: payload.customerName || 'Guest'
              });
              setActiveToast({
                id: payload.id,
                title: `🔔 Table ${payload.tableNumber} Requested ${payload.label}`,
                message: `${payload.label} requested by Table ${payload.tableNumber}. Attend immediately.`,
                type: 'service',
                time: payload.time || 'Just now',
                tableNumber: payload.tableNumber,
                callId: payload.id
              });
            } else if (isStaffLoggedIn && currentRole === 'admin') {
              // Gentle notification for admin
              playSound('alert');
              setActiveToast({
                id: payload.id,
                title: `🔔 Table ${payload.tableNumber} Requested Assistance`,
                message: `${payload.label} requested by Table ${payload.tableNumber}`,
                type: 'service',
                time: payload.time || 'Just now',
                tableNumber: payload.tableNumber,
                callId: payload.id
              });
            }
            // CHEF (Kitchen) is completely silent and not disturbed with water/bill calls!
          })
          .on('broadcast', { event: 'dismiss_service_call' }, ({ payload }) => {
            if (!payload || !payload.callId) return;
            setServiceCalls(prev => {
              const updated = prev.filter(c => c.id !== payload.callId);
              setLocalStore('service_calls', updated);
              return updated;
            });
          })
          .on('broadcast', { event: 'order_item_served_updated' }, () => {
            loadFreshState();
            refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'menu_item_updated' }, ({ payload }) => {
            console.log('[SUPABASE REALTIME] Incoming menu_item_updated broadcast:', payload);
            if (!payload) return;
            if (payload.action === 'delete' && payload.itemId) {
              setMenuItems(prev => {
                const updated = prev.filter(it => it.id !== payload.itemId);
                setLocalStore('menu_items', updated);
                try {
                  localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
                } catch (e) {}
                window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
                return updated;
              });
              return;
            }
            if (payload.item) {
              setMenuItems(prev => {
                const target = payload.item;
                const photo = target.image_url || target.imageUrl || target.image || target.photo || null;
                const normalizedTarget = {
                  ...target,
                  image_url: photo,
                  imageUrl: photo,
                  image: photo,
                  photo: photo
                };
                const matchesItem = (it) => (
                  (it.id && target.id && it.id === target.id) ||
                  (it.name && target.name && it.name.toLowerCase().trim() === target.name.toLowerCase().trim())
                );
                const exists = prev.some(matchesItem);
                const updated = exists 
                  ? prev.map(it => matchesItem(it) ? { ...it, ...normalizedTarget } : it)
                  : [...prev, normalizedTarget];
                setLocalStore('menu_items', updated);
                try {
                  localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
                } catch (e) {}
                window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
                return updated;
              });
            } else if (payload.items && Array.isArray(payload.items)) {
              setMenuItems(payload.items);
              setLocalStore('menu_items', payload.items);
              try {
                localStorage.setItem('atmiya_menu_items', JSON.stringify(payload.items));
              } catch (e) {}
              window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: payload.items } }));
            }
          })
          .subscribe();

      } catch (err) {
        console.warn('Supabase initial sync notice:', err);
      }
    }

    syncFromSupabase();

    return () => {
      if (orderChannel) {
        supabase.removeChannel(orderChannel);
      }
      if (alertsChannel) {
        supabase.removeChannel(alertsChannel);
      }
    };
  }, [refreshOrdersFromSupabase]);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = days[now.getDay()];
        const date = now.getDate();
        const month = months[now.getMonth()];
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCurrentTimeStr(`${day}, ${date} ${month} • ${time}`);
      } catch (err) {
        console.warn('Clock format err:', err);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Server-side JWT token verification on mount
  useEffect(() => {
    const activeToken = localStorage.getItem('auth_token');
    if (activeToken && authUser) {
      verifyStaffTokenApi(activeToken).catch(() => {});
    }
  }, []);

  const handleLoginSuccess = (user, token) => {
    setForceAuthWall(false);
    setViewMode('admin');
    setAuthUser(user);
    setAuthState(user);
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    if (user?.role === 'chef') {
      setActiveTab('kitchen');
    } else if (user?.role === 'waiter') {
      setActiveTab('waiter');
    } else {
      setActiveTab('dashboard');
    }
    playSound('success');
  };

  const handleLogout = () => {
    // 1. Purge all stored credentials from both LocalStorage and SessionStorage
    logoutAuthUser();
    try {
      localStorage.removeItem('restaurant_auth_user');
      localStorage.removeItem('atmiya_auth_user');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('atmiya_auth_token');
      sessionStorage.removeItem('restaurant_auth_user');
      sessionStorage.removeItem('atmiya_auth_user');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('atmiya_auth_token');
      sessionStorage.removeItem('atmiya_customer_mode');
      sessionStorage.removeItem('atmiya_bound_table');
      sessionStorage.removeItem('atmiya_seen_landing');
    } catch (e) {}

    // 2. Clear customer session lock & table binding so guest isolation doesn't trap staff
    clearCustomerSession();
    clearBoundSessionTable();

    // 3. Clear URL query parameters (?tab=..., ?kds=..., ?table=..., ?portal=...)
    if (typeof window !== 'undefined') {
      try {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      } catch (e) {}
    }

    // 4. Force auth wall and reset view states
    setForceAuthWall(true);
    setAuthState(null);
    setViewMode('admin');
    setActiveTab('dashboard');

    playSound('success');
  };

  // State Mutation Handlers
  const handleUpdateOrderStatus = (orderId, newStatus, staffName = null, staffRole = null) => {
    const isOrderMatch = (o) => (
      o.id === orderId || 
      o.order_number === orderId || 
      String(o.id || '').replace(/^#+/, '') === String(orderId || '').replace(/^#+/, '') ||
      (o.order_number && String(o.order_number).replace(/^#+/, '') === String(orderId || '').replace(/^#+/, '')) ||
      (o.supabase_order_id && o.supabase_order_id === orderId)
    );
    const targetOrder = orders.find(isOrderMatch);
    const isNowServed = newStatus === 'Served' || newStatus === 'Completed';
    const isNowReady = newStatus === 'Ready';
    const deliveredAt = isNowServed ? Date.now() : targetOrder?.food_delivered_at;
    const actorName = staffName || authUser?.name || 'Staff';
    const actorRole = staffRole ? (staffRole === 'chef' ? 'Head Chef' : staffRole === 'waiter' ? 'Floor Waiter' : staffRole === 'cashier' ? 'Cashier' : 'Admin') : (authUser?.role || 'Admin');

    const updated = orders.map(o => isOrderMatch(o) ? { 
      ...o, 
      status: newStatus,
      food_delivered_at: deliveredAt || o.food_delivered_at,
      items: isNowServed 
        ? (o.items || []).map(it => ({ ...it, is_served: true, served_at: it.served_at || Date.now(), kitchen_status: 'served' }))
        : (isNowReady
            ? (o.items || []).map(it => ({ ...it, kitchen_status: 'ready', ready_at: it.ready_at || Date.now() }))
            : o.items)
    } : o);
    setOrders(updated);
    setLocalStore('orders', updated);

    // If order was served to table, stamp food_delivered_at on the table for the 30-min turnover engine
    if (isNowServed && targetOrder?.table_number) {
      const normalizeTbl = (val) => String(val || '').replace(/[^0-9]/g, '');
      const tCode = normalizeTbl(targetOrder.table_number);
      const updatedTables = tables.map(t => {
        if (normalizeTbl(t.number) === tCode) {
          return {
            ...t,
            food_delivered_at: deliveredAt,
            turnover_notified: false
          };
        }
        return t;
      });
      setTables(updatedTables);
      setLocalStore('tables', updatedTables);
    }

    // Broadcast status change across active terminals
    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'order_item_served_updated',
        payload: { orderId, newStatus }
      });

      // If food is ready on counter, broadcast directly to Waiter Food Runner and add to Calls section!
      if (newStatus === 'Ready' && targetOrder) {
        const cleanTbl = (targetOrder.table_number || '').replace(/table/i, '').trim();
        const itemsSummary = (targetOrder.items || []).map(i => `${i.qty || 1}x ${i.name}`).slice(0, 3).join(', ');

        const foodReadyCall = {
          id: `ready_${targetOrder.id}_${Date.now()}`,
          tableNumber: cleanTbl,
          label: `Food Ready: ${itemsSummary || 'Plated Food'}`,
          type: 'food_ready',
          orderId: targetOrder.id,
          orderNumber: targetOrder.order_number || targetOrder.id,
          itemsSummary,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };
        setServiceCalls(prev => {
          const updated = [foodReadyCall, ...prev.filter(c => !(c.type === 'food_ready' && (c.orderId === targetOrder.id || String(c.orderId) === String(targetOrder.id))))];
          setLocalStore('service_calls', updated);
          return updated;
        });

        channel.send({
          type: 'broadcast',
          event: 'food_ready_for_pickup',
          payload: {
            tableNumber: cleanTbl,
            orderId: targetOrder.id,
            orderNumber: targetOrder.order_number || targetOrder.id,
            itemsSummary
          }
        });

        if (authUser?.role === 'waiter') {
          triggerWaiterFoodReadyNotification({
            tableNumber: cleanTbl,
            orderId: targetOrder.id,
            itemsSummary
          });
        } else {
          // For kitchen/chef: soft chime only, NO loud waiter runner voice alert echoing on kitchen screen!
          playSound('kitchen_bell');
        }
      } else if (isNowServed && targetOrder) {
        // Clear any ready food calls for this order
        setServiceCalls(prev => {
          const updated = prev.filter(c => !(c.type === 'food_ready' && (c.orderId === orderId || String(c.orderId) === String(orderId))));
          setLocalStore('service_calls', updated);
          return updated;
        });
      }
    } catch (e) {
      console.warn('Status broadcast err:', e);
    }

    recordEmployeeActivity({
      employeeName: `${actorName} (${actorRole})`,
      employeeRole: actorRole,
      tableNumber: targetOrder?.table_number || 'Kitchen',
      actionType: `ORDER_${newStatus.toUpperCase()}`,
      amount: targetOrder?.total || null,
      details: `Order #${orderId} status changed to "${newStatus}" by ${actorName} [Role: ${actorRole}]${isNowServed ? ' (Food served to table - 30m turnover countdown started)' : ''}`,
      type: 'order',
      color: newStatus === 'Completed' ? 'emerald' : newStatus === 'Preparing' ? 'amber' : 'orange'
    });

    // Update in Supabase Cloud
    updateOrderStatusInSupabase(targetOrder?.supabase_order_id || targetOrder?.order_number || targetOrder?.id || orderId, newStatus);
    if (isNowServed && targetOrder?.table_number) {
      try {
        updateAllOrderItemsServedInSupabase(targetOrder.table_number);
      } catch (e) {}
    }

    // Dual persistence with FastAPI local backend
    try {
      const cleanOrdId = String(targetOrder?.order_number || targetOrder?.id || orderId).replace('#', '');
      fetch(`/api/orders/${cleanOrdId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(() => {});
    } catch (e) {}

    // If order was completed or cancelled, check if this table has any other active dining orders
    if ((newStatus === 'Completed' || newStatus === 'Cancelled') && targetOrder?.table_number) {
      const targetTableCode = (targetOrder.table_number || '').replace(/\D/g, '').padStart(2, '0');
      const hasOtherActive = updated.some(o => {
        if (o.id === orderId) return false;
        const oCode = (o.table_number || '').replace(/\D/g, '').padStart(2, '0');
        if (oCode !== targetTableCode) return false;
        const st = (o.status || '').toLowerCase();
        const isCancelled = st === 'cancelled';
        const isUnpaid = !isCancelled && (
          (o.payment_status || '').toLowerCase() === 'pending cash' || 
          (o.payment_status || '').toLowerCase() === 'unpaid'
        );
        return (!isCancelled && st !== 'completed' && st !== 'settled') || isUnpaid;
      });

      if (!hasOtherActive) {
        const updatedTables = tables.map(t => {
          const tCode = (t.number || '').replace(/\D/g, '').padStart(2, '0');
          if (tCode === targetTableCode) {
            return {
              ...t,
              status: 'available',
              current_order_id: null,
              current_customer_name: null,
              current_customer_phone: null,
              timing: null,
              food_delivered_at: null,
              turnover_notified: false
            };
          }
          return t;
        });
        setTables(updatedTables);
        setLocalStore('tables', updatedTables);
      }
    }
  };

  // Toggle individual dish item served/delivered state (Syncs between Kitchen KDS and Customer QR Menu)
  const handleToggleItemServed = (orderId, itemIndex, staffName = null, staffId = null) => {
    const isOrderMatch = (o) => (
      o.id === orderId || 
      o.order_number === orderId || 
      String(o.id || '').replace(/^#+/, '') === String(orderId || '').replace(/^#+/, '') ||
      (o.supabase_order_id && o.supabase_order_id === orderId)
    );
    const targetOrder = orders.find(isOrderMatch);
    if (!targetOrder) return;

    const collectorName = staffName || authUser?.name || 'Floor Server';
    const collectorId = staffId || authUser?.waiter_id || authUser?.id || 'WTR-101';

    let newlyDeliveredAt = null;

    const updated = orders.map(o => {
      if (!isOrderMatch(o)) return o;
      const items = (o.items || []).map((it, idx) => {
        if (idx !== itemIndex) return it;
        const nextServed = !it.is_served;
        return {
          ...it,
          is_served: nextServed,
          kitchen_status: nextServed ? 'served' : (it.kitchen_status || 'ready'),
          served_at: nextServed ? Date.now() : null,
          served_by_waiter_id: nextServed ? collectorId : null,
          served_by_waiter_name: nextServed ? collectorName : null
        };
      });

      const allServed = items.length > 0 && items.every(i => i.is_served);
      const anyServed = items.some(i => i.is_served);
      const allReadyOrServed = items.length > 0 && items.every(i => i.is_served || i.kitchen_status === 'ready');
      const nextStatus = allServed ? 'Served' : (allReadyOrServed ? 'Ready' : (anyServed ? 'Preparing' : o.status));
      const deliveredAt = anyServed ? (o.food_delivered_at || Date.now()) : (allServed ? Date.now() : o.food_delivered_at);
      if (anyServed && !o.food_delivered_at) {
        newlyDeliveredAt = deliveredAt;
      }

      return {
        ...o,
        items,
        status: nextStatus,
        food_delivered_at: deliveredAt,
        delivered_by_waiter_id: collectorId,
        delivered_by_waiter_name: collectorName
      };
    });

    setOrders(updated);
    setLocalStore('orders', updated);

    // If marked served, clear any matching food_ready service call
    const targetItem = targetOrder.items?.[itemIndex];
    const isNowServed = targetItem ? !targetItem.is_served : true;
    if (isNowServed) {
      setServiceCalls(prev => {
        const nextCalls = prev.filter(c => !(c.type === 'food_ready' && (c.orderId === orderId || String(c.orderId) === String(orderId)) && (c.itemIndex === itemIndex || c.itemIndex === undefined)));
        setLocalStore('service_calls', nextCalls);
        return nextCalls;
      });

      recordEmployeeActivity({
        employeeName: `${collectorName} (${collectorId})`,
        employeeRole: 'Waiter',
        tableNumber: targetOrder.table_number || 'Dine-In',
        actionType: 'FOOD_DELIVERED',
        details: `Delivered ${targetItem?.name || 'dish'} to ${targetOrder.table_number} by ${collectorName} (${collectorId})`,
        type: 'order',
        color: 'emerald'
      });
    }

    // If first item delivered, stamp food_delivered_at on the table for 30m turnover countdown
    if (targetOrder.table_number && newlyDeliveredAt) {
      const normalizeTbl = (val) => String(val || '').replace(/[^0-9]/g, '');
      const tCode = normalizeTbl(targetOrder.table_number);
      const updatedTables = tables.map(t => {
        if (normalizeTbl(t.number) === tCode && !t.food_delivered_at) {
          return {
            ...t,
            food_delivered_at: newlyDeliveredAt,
            turnover_notified: false
          };
        }
        return t;
      });
      setTables(updatedTables);
      setLocalStore('tables', updatedTables);
    }

    // Broadcast update via Supabase Realtime so Customer Menu on guest phone updates live
    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'order_item_served_updated',
        payload: { orderId, itemIndex }
      });
    } catch (e) {
      console.warn('Realtime item served broadcast error:', e);
    }

    // Persist item served state to Supabase Cloud & Local Backend
    try {
      updateOrderItemStatusInSupabase(
        targetOrder.supabase_order_id || targetOrder.id || targetOrder.order_number || orderId,
        itemIndex,
        isNowServed ? 'SERVED' : 'READY',
        targetOrder
      );
      const cleanOrdId = String(targetOrder.id || orderId).replace('#', '');
      fetch(`/api/orders/${cleanOrdId}/items/${itemIndex}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isNowServed ? 'served' : 'ready' })
      }).catch(() => {});
    } catch (dbErr) {
      console.warn('Supabase item served sync error:', dbErr);
    }

    playSound('success');
  };

  // Toggle individual dish item ready/prepared state by Kitchen Chef
  const handleToggleItemReady = (orderId, itemIndex) => {
    const isOrderMatch = (o) => (
      o.id === orderId || 
      o.order_number === orderId || 
      String(o.id || '').replace(/^#+/, '') === String(orderId || '').replace(/^#+/, '') ||
      (o.supabase_order_id && o.supabase_order_id === orderId)
    );
    const targetOrder = orders.find(isOrderMatch);
    if (!targetOrder) return;
    const targetItem = targetOrder.items?.[itemIndex];
    if (!targetItem) return;

    const nextReadyState = targetItem.kitchen_status === 'ready' ? 'preparing' : 'ready';

    const updated = orders.map(o => {
      if (!isOrderMatch(o)) return o;
      const items = (o.items || []).map((it, idx) => {
        if (idx !== itemIndex) return it;
        return {
          ...it,
          kitchen_status: nextReadyState,
          ready_at: nextReadyState === 'ready' ? Date.now() : null
        };
      });

      const allReady = items.length > 0 && items.every(i => i.kitchen_status === 'ready' || i.is_served);
      const nextStatus = allReady ? 'Ready' : (o.status === 'Ready' || o.status === 'Placed' ? 'Preparing' : o.status);

      return {
        ...o,
        items,
        status: nextStatus
      };
    });

    setOrders(updated);
    setLocalStore('orders', updated);

    const cleanTbl = (targetOrder.table_number || '').replace(/table/i, '').trim();
    const qty = targetItem.qty || targetItem.quantity || 1;
    const itemName = targetItem.name;

    // If marked ready, notify waiters via voice, push, and add to Calls section!
    if (nextReadyState === 'ready') {
      const foodReadyCall = {
        id: `ready_item_${orderId}_${itemIndex}_${Date.now()}`,
        tableNumber: cleanTbl,
        label: `Dish Ready: ${qty}x ${itemName}`,
        type: 'food_ready',
        orderId,
        orderNumber: targetOrder.order_number || targetOrder.id,
        itemIndex,
        itemsSummary: `${qty}x ${itemName}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      setServiceCalls(prev => {
        const nextCalls = [foodReadyCall, ...prev.filter(c => !(c.type === 'food_ready' && c.orderId === orderId && c.itemIndex === itemIndex))];
        setLocalStore('service_calls', nextCalls);
        return nextCalls;
      });

      if (authUser?.role === 'waiter') {
        triggerWaiterFoodReadyNotification({
          tableNumber: cleanTbl,
          orderId: targetOrder.id,
          itemsSummary: `${qty}x ${itemName}`
        });
      } else {
        // Kitchen Chef ticked dish ready: gentle chime, NO waiter speech announcement!
        playSound('kitchen_bell');
      }

      // Broadcast over Supabase Realtime channel
      try {
        const channel = supabase.channel('restaurant_alerts');
        channel.send({
          type: 'broadcast',
          event: 'order_item_ready',
          payload: {
            orderId: targetOrder.id,
            itemIndex,
            tableNumber: cleanTbl,
            itemName,
            qty,
            readyAt: Date.now()
          }
        });
      } catch (e) {
        console.warn('Realtime item ready broadcast notice:', e);
      }
    } else {
      // Dish unticked back to preparing - remove ready call
      setServiceCalls(prev => {
        const nextCalls = prev.filter(c => !(c.type === 'food_ready' && c.orderId === orderId && c.itemIndex === itemIndex));
        setLocalStore('service_calls', nextCalls);
        return nextCalls;
      });
    }

    // Persist item ready state to Supabase Cloud & Local Backend
    try {
      updateOrderItemStatusInSupabase(
        targetOrder.supabase_order_id || targetOrder.id || targetOrder.order_number || orderId,
        itemIndex,
        nextReadyState === 'ready' ? 'READY' : 'PREPARING',
        targetOrder
      );
      // Dual persistence: sync with FastAPI local orders database
      const cleanOrdId = String(targetOrder.id || orderId).replace('#', '');
      fetch(`/api/orders/${cleanOrdId}/items/${itemIndex}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextReadyState })
      }).catch(() => {});
    } catch (dbErr) {
      console.warn('Item ready sync error:', dbErr);
    }

    playSound('success');
  };

  // Mark all dishes for a specific table as Delivered/Served
  const handleMarkAllTableItemsServed = (tableNum, staffName = null, staffId = null) => {
    const normalizeTbl = (val) => String(val || '').replace(/[^0-9]/g, '');
    const targetCode = normalizeTbl(tableNum);
    const collectorName = staffName || authUser?.name || 'Floor Server';
    const collectorId = staffId || authUser?.waiter_id || authUser?.id || 'WTR-101';
    
    const updated = orders.map(o => {
      if (normalizeTbl(o.table_number) !== targetCode || o.status === 'Cancelled') return o;
      return {
        ...o,
        status: 'Served',
        food_delivered_at: o.food_delivered_at || Date.now(),
        delivered_by_waiter_id: collectorId,
        delivered_by_waiter_name: collectorName,
        items: (o.items || []).map(it => ({
          ...it,
          is_served: true,
          served_at: it.served_at || Date.now(),
          served_by_waiter_id: collectorId,
          served_by_waiter_name: collectorName
        }))
      };
    });

    setOrders(updated);
    setLocalStore('orders', updated);

    // Dismiss all food ready calls for this table
    setServiceCalls(prev => {
      const nextCalls = prev.filter(c => !(c.type === 'food_ready' && normalizeTbl(c.tableNumber) === targetCode));
      setLocalStore('service_calls', nextCalls);
      return nextCalls;
    });

    recordEmployeeActivity({
      employeeName: `${collectorName} (${collectorId})`,
      employeeRole: 'Waiter',
      tableNumber: `Table ${tableNum}`,
      actionType: 'FOOD_DELIVERED',
      details: `Delivered all dishes to Table ${tableNum} by ${collectorName} (${collectorId})`,
      type: 'table',
      color: 'emerald'
    });

    // Stamp table food_delivered_at
    const updatedTables = tables.map(t => {
      if (normalizeTbl(t.number) === targetCode) {
        return {
          ...t,
          food_delivered_at: t.food_delivered_at || Date.now(),
          turnover_notified: false
        };
      }
      return t;
    });
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'order_item_served_updated',
        payload: { tableNum }
      });
    } catch (e) {}

    // Persist all served items for this table to Supabase Cloud
    try {
      updateAllOrderItemsServedInSupabase(tableNum);
    } catch (dbErr) {
      console.warn('Supabase mark all served sync error:', dbErr);
    }

    playSound('success');
  };

  const handleMarkCashPaymentDone = (orderId, staffName) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const collector = staffName || authUser?.name || 'Anjali Patel';
    const nowIso = new Date().toISOString();
    
    // When COD is marked paid by the manager, order status becomes 'Completed'
    const updated = orders.map(o => o.id === orderId ? {
      ...o,
      status: 'Completed', // Order status becomes Completed upon cash payment confirmation
      payment_status: 'Paid',
      payment_mode: 'Cash',
      paid_collected_by: collector,
      payment_verified_online: false,
      settled_at: o.settled_at || nowIso,
      completed_at: o.completed_at || nowIso,
      items: (o.items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'served' }))
    } : o);
    setOrders(updated);
    setLocalStore('orders', updated);

    // Check if table has any remaining active dining orders
    const normalizeTbl = (val) => {
      const digits = String(val || '').replace(/[^0-9]/g, '');
      return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
    };
    const targetTableNum = targetOrder.table_number;
    if (targetTableNum) {
      const remainingActive = updated.filter(o => 
        normalizeTbl(o.table_number) === normalizeTbl(targetTableNum) &&
        o.status !== 'Completed' &&
        o.status !== 'Cancelled'
      );

      if (remainingActive.length === 0) {
        // Table is fully completed & settled! Free the table
        const updatedTables = tables.map(t => 
          normalizeTbl(t.number) === normalizeTbl(targetTableNum) ? {
            ...t,
            status: 'available',
            current_order_id: null,
            current_customer_name: null,
            current_customer_phone: null,
            timing: null,
            food_delivered_at: null,
            turnover_notified: false
          } : t
        );
        setTables(updatedTables);
        setLocalStore('tables', updatedTables);
      }
    }

    recordEmployeeActivity({
      employeeName: collector,
      employeeRole: 'Cashier & POS Lead',
      tableNumber: targetOrder.table_number || 'Dine-In',
      actionType: 'PAYMENT_COLLECTED_CASH',
      amount: targetOrder.total,
      paymentMethod: 'Cash',
      details: `Cash payment of ₹${targetOrder.total} collected & order #${orderId} marked COMPLETED for Table ${targetOrder.table_number || 'Dine-In'} by ${collector}`,
      type: 'payment',
      color: 'emerald'
    });
    playSound('success');

    // Sync to Supabase Cloud
    updateOrderStatusInSupabase(targetOrder?.supabase_order_id || targetOrder?.id || orderId, 'COMPLETED');
    if (targetOrder.table_number) {
      settleTableSessionInSupabase(targetOrder.table_number, targetOrder?.supabase_order_id || targetOrder?.id || orderId, 'Cash');
    }
  };

  const handleCancelOrderWithReason = (orderId, reason, staffName) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const staff = staffName || authUser?.name || 'Admin';
    const updated = orders.map(o => o.id === orderId ? {
      ...o,
      status: 'Cancelled',
      payment_status: 'Void',
      cancel_reason: reason,
      cancelled_by: staff
    } : o);
    setOrders(updated);
    setLocalStore('orders', updated);

    // If order was cancelled, immediately free table if no other active dining orders remain
    const targetTableNum = targetOrder?.table_number;
    if (targetTableNum) {
      const normalizeTbl = (val) => String(val || '').replace(/[^0-9]/g, '');
      const tCode = normalizeTbl(targetTableNum);
      const hasOtherActive = updated.some(o => 
        o.id !== orderId && 
        normalizeTbl(o.table_number) === tCode && 
        o.status !== 'Completed' && 
        o.status !== 'Cancelled'
      );
      if (!hasOtherActive) {
        const updatedTables = tables.map(t => 
          normalizeTbl(t.number) === tCode ? {
            ...t,
            status: 'available',
            current_order_id: null,
            current_customer_name: null,
            current_customer_phone: null,
            timing: null,
            food_delivered_at: null,
            turnover_notified: false
          } : t
        );
        setTables(updatedTables);
        setLocalStore('tables', updatedTables);
      }
    }

    recordEmployeeActivity({
      employeeName: staff,
      employeeRole: authUser?.role || 'Admin',
      tableNumber: targetOrder.table_number || 'Online Queue',
      actionType: 'ORDER_CANCELLED_OUT_OF_STOCK',
      amount: targetOrder.total,
      details: `Order #${targetOrder.id} cancelled. Reason: ${reason} (Authorized by ${staff})`,
      type: 'order',
      color: 'rose'
    });
    playSound('alert');

    // Sync Cancellation to Supabase Cloud
    updateOrderStatusInSupabase(targetOrder?.supabase_order_id || targetOrder?.id || orderId, 'Cancelled');
  };

  const handlePlaceCustomerOrder = async (rawOrder) => {
    // Client-side XSS and injection sanitization
    const newOrder = sanitizeOrderPayload(rawOrder);
    const isCustomerScreen = viewMode === 'customer' || Boolean(scannedTable);
    const isStaffSession = Boolean(authUser) && !isCustomerScreen;
    const userRole = isStaffSession ? authUser?.role : 'customer';

    // Ensure session table lock is reinforced upon customer order placement
    if (viewMode === 'customer' && !authUser) {
      const boundTable = getBoundSessionTable();
      if (boundTable) {
        const safeTable = Number(boundTable) < 10 ? `T0${boundTable}` : `T${boundTable}`;
        newOrder.table_number = safeTable;
      } else {
        setActiveToast({
          title: '🔒 Table Verification Required',
          message: 'Please scan your dining table QR standee before placing an order.',
          type: 'error'
        });
        playSound('alert');
        return;
      }
    }
    if (newOrder.table_number) {
      bindSessionTable(newOrder.table_number);
    }

    // 0. Table Session Round & Multi-Round Add-on Architecture
    const normalizeTbl = (val) => {
      const digits = String(val || '').replace(/[^0-9]/g, '');
      return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
    };
    const isOrderActive = (o) => {
      if (!o) return false;
      const st = String(o?.status || '').toLowerCase().trim();
      const paySt = String(o?.payment_status || '').toLowerCase().trim();
      if (st === 'cancelled') return false;
      if (st === 'completed' || st === 'settled') return false;
      // If order is served AND already paid, the dining session has finished!
      if (st === 'served' && (paySt === 'paid' || paySt === 'void')) return false;
      return true;
    };

    const existingActiveOrders = orders.filter(o => 
      normalizeTbl(o.table_number) === normalizeTbl(newOrder.table_number) && isOrderActive(o)
    );
    const isAddonOrder = existingActiveOrders.length > 0;
    const roundNumber = isAddonOrder ? (existingActiveOrders[0].round || 1) + 1 : 1;

    // Tag order with round metadata and link to parent table session
    newOrder.is_addon = isAddonOrder;
    newOrder.round = roundNumber;
    newOrder.parent_order_id = isAddonOrder ? (existingActiveOrders[0].id || existingActiveOrders[0].order_number) : null;

    // Enforce proper payment classification
    const isOnline = newOrder.payment_mode === 'UPI' || newOrder.payment_verified_online === true;
    newOrder.payment_mode = isOnline ? 'UPI' : 'Cash';
    newOrder.payment_status = isOnline ? 'Paid' : 'Pending Cash';
    newOrder.payment_verified_online = isOnline;

    let finalOrder = newOrder;
    let updated = [];

    if (isAddonOrder) {
      // MERGE INTO CONTINUOUS TABLE BILL: Do not generate a separate bill for water or add-ons!
      const activeParent = existingActiveOrders[0];
      const mergedItems = [...(activeParent.items || [])];

      (newOrder.items || []).forEach(newItem => {
        const existingIdx = mergedItems.findIndex(i => 
          (i.id && newItem.id && i.id === newItem.id) || 
          (i.name && newItem.name && i.name.toLowerCase().trim() === newItem.name.toLowerCase().trim())
        );

        const addedQty = Number(newItem.quantity || newItem.qty || 1);
        const isDeliveredByWaiter = Boolean(newItem.is_served);
        const targetKitchenStatus = isDeliveredByWaiter 
          ? 'served' 
          : (newItem.kitchen_status || 'placed');

        if (existingIdx !== -1) {
          const cur = mergedItems[existingIdx];
          const curQty = Number(cur.quantity || cur.qty || 1);
          const newQty = curQty + addedQty;
          const unitPrice = Number(cur.price || cur.unit_price || newItem.price || 0);
          mergedItems[existingIdx] = {
            ...cur,
            quantity: newQty,
            qty: newQty,
            total_price: Number((newQty * unitPrice).toFixed(2)),
            kitchen_status: isDeliveredByWaiter ? cur.kitchen_status : targetKitchenStatus,
            is_served: isDeliveredByWaiter ? cur.is_served : false,
            served_at: isDeliveredByWaiter ? (newItem.served_at || Date.now()) : cur.served_at,
            round: roundNumber
          };
        } else {
          mergedItems.push({
            ...newItem,
            quantity: addedQty,
            qty: addedQty,
            round: roundNumber,
            is_addon: true,
            kitchen_status: targetKitchenStatus,
            is_served: isDeliveredByWaiter,
            served_at: isDeliveredByWaiter ? (newItem.served_at || Date.now()) : null
          });
        }
      });

      const addedSubtotal = parseFloat(newOrder.subtotal || 0);
      const addedTax = parseFloat(newOrder.tax || 0);
      const addedDiscount = parseFloat(newOrder.discount || 0);
      const addedTotal = parseFloat(newOrder.total || newOrder.total_amount || 0);

      const cumulativeSubtotal = Number((parseFloat(activeParent.subtotal || 0) + addedSubtotal).toFixed(2));
      const cumulativeTax = Number((parseFloat(activeParent.tax || 0) + addedTax).toFixed(2));
      const cumulativeDiscount = Number((parseFloat(activeParent.discount || 0) + addedDiscount).toFixed(2));
      const cumulativeTotal = Number((parseFloat(activeParent.total || activeParent.total_amount || 0) + addedTotal).toFixed(2));
      const summaryStr = mergedItems.map(i => `${i.quantity || i.qty || 1}x ${i.name || i.item_name}`).join(', ');

      const allItemsServed = mergedItems.length > 0 && mergedItems.every(i => i.is_served);
      const hasReadyItems = mergedItems.some(i => (i.kitchen_status === 'ready' || i.kitchen_status === 'prepared') && !i.is_served);
      const nextOrderStatus = allItemsServed ? 'Served' : (hasReadyItems ? 'Ready' : 'Placed');

      finalOrder = {
        ...activeParent,
        items: mergedItems,
        order_items: mergedItems,
        subtotal: cumulativeSubtotal,
        tax: cumulativeTax,
        discount: cumulativeDiscount,
        total: cumulativeTotal,
        total_amount: cumulativeTotal,
        items_summary: summaryStr,
        round: roundNumber,
        status: nextOrderStatus,
        payment_status: 'Pending Cash', // Continuous bill remains pending until final table checkout
        last_addon_at: new Date().toISOString(),
        special_note: [activeParent.special_note, newOrder.special_note].filter(Boolean).join(' • ')
      };

      updated = orders.map(o => o.id === activeParent.id ? finalOrder : o);
    } else {
      updated = [newOrder, ...orders];
    }

    // 1. Immediately update UI & local state for zero-latency UX
    setOrders(updated);
    setLocalStore('orders', updated);

    // Update corresponding dining table status to occupied with guest info
    const updatedTables = tables.map(t => {
      if (normalizeTbl(t.number) === normalizeTbl(finalOrder.table_number) || t.id === finalOrder.table_number) {
        return {
          ...t,
          status: 'occupied',
          current_order_id: finalOrder.id,
          current_customer_name: finalOrder.customer_name,
          current_customer_phone: finalOrder.customer_phone,
          timing: t.timing || '1m'
        };
      }
      return t;
    });
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    // Permanently record customer profile in local CRM
    if (finalOrder.customer_phone) {
      saveCustomerProfile({
        name: finalOrder.customer_name,
        phone: finalOrder.customer_phone,
        tableNumber: finalOrder.table_number,
        orderId: finalOrder.id,
        orderTotal: finalOrder.total || finalOrder.total_amount,
        items: finalOrder.items || [],
        paymentMode: finalOrder.payment_mode || 'UPI'
      });
      setCustomers(getLocalStore('customers', INITIAL_CUSTOMERS));
    }

    const isWaiterOrder = Boolean(newOrder.placed_by_waiter_id || newOrder.order_source === 'Waiter Terminal');
    const actionLabel = isAddonOrder 
      ? `ADD-ON ROUND ${roundNumber}` 
      : (isWaiterOrder ? `WAITER ORDER (${newOrder.placed_by_waiter_id || 'TERMINAL'})` : 'QR SELF-ORDER');

    recordEmployeeActivity({
      employeeName: isWaiterOrder ? (newOrder.placed_by_waiter_name || authUser?.name || 'Waiter') : (finalOrder.customer_name || 'Guest User'),
      employeeRole: isWaiterOrder ? 'Floor Waiter' : `Guest / ${actionLabel}`,
      tableNumber: finalOrder.table_number || 'Online',
      actionType: isAddonOrder ? 'ORDER_ADDON_PLACED' : (isWaiterOrder ? 'ORDER_PLACED_WAITER' : 'ORDER_PLACED_QR'),
      amount: newOrder.total || newOrder.total_amount || 0,
      paymentMethod: finalOrder.payment_mode || 'Cash',
      details: `${actionLabel} placed at Table ${finalOrder.table_number} by ${isWaiterOrder ? `Waiter ${newOrder.placed_by_waiter_name || 'Staff'}` : (finalOrder.customer_name || 'Guest')} (+${newOrder.items_summary}) — Continuous Bill: ₹${finalOrder.total}`,
      type: 'order',
      color: isWaiterOrder ? 'indigo' : (isAddonOrder ? 'blue' : 'orange')
    });

    // Kitchen & Admin audible chime and clear voice alert for the exact table
    if (isStaffSession) {
      if (userRole === 'chef' || userRole === 'admin') {
        triggerStaffOrderNotification({
          tableNumber: finalOrder.table_number || '01',
          orderNumber: finalOrder.id || '',
          itemsSummary: isAddonOrder ? (newOrder.items_summary || 'Add-on round') : finalOrder.items_summary,
          customerName: finalOrder.customer_name || 'Guest',
          isAddon: isAddonOrder,
          paymentMode: finalOrder.payment_mode
        });
      } else if (userRole === 'waiter') {
        playSound('waiter');
      }

      // Display floating staff banner toast on the POS
      setActiveToast({
        title: isAddonOrder ? `💧 Table ${finalOrder.table_number} Add-On Added to Bill (Round ${roundNumber})!` : `🔔 Table ${finalOrder.table_number} New Order!`,
        message: `${finalOrder.customer_name || 'Guest'}: Added ${newOrder.items_summary} • Continuous Bill: ₹${finalOrder.total}`,
        type: isAddonOrder ? 'info' : 'success'
      });
    }

    // 1.5 If order contains ready-to-deliver items (e.g. bottled water ordered by customer via QR), dispatch food_ready alert for waiters
    (finalOrder.items || []).forEach((it, idx) => {
      if ((it.kitchen_status === 'ready' || it.kitchen_status === 'prepared') && !it.is_served) {
        const cleanTbl = (finalOrder.table_number || '').replace(/table/i, '').trim();
        const qty = it.qty || it.quantity || 1;
        const foodReadyCall = {
          id: `ready_item_${finalOrder.id}_${idx}_${Date.now()}`,
          tableNumber: cleanTbl,
          label: `Deliver: ${qty}x ${it.name}`,
          type: 'food_ready',
          orderId: finalOrder.id,
          orderNumber: finalOrder.order_number || finalOrder.id,
          itemIndex: idx,
          itemsSummary: `${qty}x ${it.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };
        setServiceCalls(prev => {
          if (prev.some(c => c.orderId === finalOrder.id && c.itemIndex === idx)) return prev;
          const next = [foodReadyCall, ...prev];
          setLocalStore('service_calls', next);
          return next;
        });
      }
    });

    // 2. DISPATCH LIVE TO SUPABASE CLOUD POSTGRESQL (table_sessions, orders, order_items, customers)
    try {
      const supaResult = await dispatchOrderToSupabase({
        table_number: finalOrder.table_number,
        customer_name: finalOrder.customer_name,
        customer_phone: finalOrder.customer_phone,
        items: finalOrder.items || [],
        subtotal: finalOrder.subtotal || 0,
        tax: finalOrder.tax || 0,
        discount: finalOrder.discount || 0,
        total: finalOrder.total || finalOrder.total_amount || 0,
        payment_mode: finalOrder.payment_mode || 'Cash',
        special_note: finalOrder.special_note || '',
        order_id: finalOrder.id,
        id: finalOrder.supabase_order_id || finalOrder.id
      });

      if (supaResult && supaResult.sessionId) {
        // Enrich local order record with Supabase Session ID and DB Order UUID
        const enrichedOrders = updated.map(o => o.id === finalOrder.id ? {
          ...o,
          supabase_order_id: supaResult.order?.id || o.supabase_order_id || null,
          session_id: supaResult.sessionId,
          session_code: supaResult.sessionCode
        } : o);
        setOrders(enrichedOrders);
        setLocalStore('orders', enrichedOrders);
      }
    } catch (err) {
      console.warn('[SUPABASE] Cloud sync notice:', err);
    }

    // Realtime cross-device broadcast: Instantly pops ticket on Kitchen POS & Waiter Terminals
    try {
      const alertChannel = supabase.channel('restaurant_alerts');
      alertChannel.send({
        type: 'broadcast',
        event: 'new_order_placed',
        payload: {
          order_id: newOrder.id,
          order_number: newOrder.order_number || newOrder.id,
          table_number: newOrder.table_number,
          customer_name: newOrder.customer_name,
          items_summary: newOrder.items_summary,
          total: newOrder.total || newOrder.total_amount || 0,
          payment_mode: newOrder.payment_mode || 'Cash',
          is_addon: isAddonOrder,
          placed_at: newOrder.placed_at || new Date().toISOString()
        }
      });
    } catch (bcErr) {
      console.warn('[SUPABASE] Broadcast new_order_placed notice:', bcErr);
    }

    return newOrder.id;
  };

  const handleAddCustomerPoints = (customerId, points = 100) => {
    const updated = addCustomerLoyaltyPoints(customerId, points);
    setCustomers(updated);
    const target = updated.find(c => c.id === customerId);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: 'Admin / Owner',
      tableNumber: target?.last_table || 'CRM',
      actionType: 'LOYALTY_POINTS_AWARDED',
      details: `Awarded +${points} loyalty reward points to ${target?.name || 'Customer'}. New balance: ${target?.loyalty_points} Pts.`,
      type: 'staff',
      color: 'emerald'
    });
    playSound('success');
  };

  const handleSaveCustomerFromAdmin = (customerData) => {
    const saved = saveCustomerProfile(customerData);
    setCustomers(getLocalStore('customers', INITIAL_CUSTOMERS));
    return saved;
  };

  const handleAddTable = async (tableData) => {
    const cleanNumber = String(tableData.number || '').trim().toUpperCase();
    const tableObj = {
      id: cleanNumber,
      number: cleanNumber,
      capacity: parseInt(tableData.capacity, 10) || 4,
      zone: tableData.zone || 'Main Hall',
      status: 'available',
      current_order_id: null,
      timing: null
    };

    const updated = [...tables.filter(t => t.number !== cleanNumber), tableObj].sort((a, b) => {
      const numA = parseInt(String(a.number).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.number).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    setTables(updated);
    setLocalStore('tables', updated);

    // PERMANENT CLOUD PERSISTENCE: Save to Supabase Cloud PostgreSQL
    try {
      await saveTableToSupabaseApi(tableObj);
    } catch (e) {
      console.warn('Failed to sync new table to Supabase:', e);
    }

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: cleanNumber,
      actionType: 'TABLE_ADDED',
      details: `Added new dining table ${cleanNumber} (${tableObj.zone}, Capacity: ${tableObj.capacity})`,
      type: 'table',
      color: 'blue'
    });
    playSound('success');
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Delete this dining table?')) return;
    const targetTable = tables.find(t => t.id === id || t.number === id);
    const tableNum = targetTable?.number || id;
    const updated = tables.filter(t => t.id !== id && t.number !== id);
    setTables(updated);
    setLocalStore('tables', updated);

    // PERMANENT CLOUD PERSISTENCE: Delete from Supabase Cloud PostgreSQL
    try {
      await deleteTableFromSupabaseApi(tableNum);
    } catch (e) {
      console.warn('Failed to delete table from Supabase:', e);
    }

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: tableNum,
      actionType: 'TABLE_DELETED',
      details: `Deleted dining table ${tableNum}`,
      type: 'table',
      color: 'rose'
    });
  };

  const handleUpdateTable = async (tableId, updates) => {
    const updated = tables.map(t => (t.id === tableId || t.number === tableId) ? { ...t, ...updates } : t);
    setTables(updated);
    setLocalStore('tables', updated);

    // PERMANENT CLOUD PERSISTENCE: Update in Supabase Cloud PostgreSQL
    try {
      await updateTableInSupabaseApi(tableId, updates);
    } catch (e) {
      console.warn('Failed to update table in Supabase:', e);
    }
  };

  const handleReconcileFloorTables = (sourceOrders = orders) => {
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const activeOrderTableNumbers = new Set(
      sourceOrders
        .filter(o => {
          const st = String(o?.status || '').toLowerCase().trim();
          const paySt = String(o?.payment_status || '').toLowerCase().trim();
          const isCancelled = st === 'cancelled';
          const isPaid = paySt === 'paid' || paySt === 'void';
          if (isCancelled || st === 'completed' || st === 'settled') return false;
          if (st === 'served' && (paySt === 'paid' || paySt === 'void')) return false;

          const orderTime = o.placed_at || o.created_at;
          const isStale = orderTime && (now - new Date(orderTime).getTime() > THREE_HOURS_MS);
          if (isStale) return false;

          const isUnpaid = paySt === 'pending cash' || paySt === 'unpaid';
          return st !== 'served' || isUnpaid;
        })
        .map(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0'))
    );

    const updatedTables = tables.map(t => {
      const numCode = (t.number || '').replace(/\D/g, '').padStart(2, '0');
      const hasActive = activeOrderTableNumbers.has(numCode);
      if (!hasActive && (t.status === 'occupied' || t.current_order_id || t.timing)) {
        return {
          ...t,
          status: 'available',
          current_order_id: null,
          current_customer_name: null,
          current_customer_phone: null,
          timing: null,
          food_delivered_at: null,
          turnover_notified: false
        };
      }
      return t;
    });

    // Ensure newly ordered dining tables not yet in tables are dynamically added
    const existingTableCodes = new Set(updatedTables.map(t => (t.number || '').replace(/\D/g, '').padStart(2, '0')));
    activeOrderTableNumbers.forEach(code => {
      if (!existingTableCodes.has(code)) {
        const matchOrd = sourceOrders.find(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0') === code);
        const rawTbl = matchOrd?.table_number || `T${code}`;
        const cleanDigits = rawTbl.replace(/[^0-9]/g, '');
        const tableNumStr = cleanDigits 
          ? (parseInt(cleanDigits, 10) < 10 ? `T0${parseInt(cleanDigits, 10)}` : `T${parseInt(cleanDigits, 10)}`) 
          : rawTbl;
        updatedTables.push({
          id: tableNumStr,
          number: tableNumStr,
          capacity: 4,
          zone: 'Main Hall',
          status: 'occupied',
          current_order_id: matchOrd?.id,
          current_customer_name: matchOrd?.customer_name,
          current_customer_phone: matchOrd?.customer_phone,
          timing: null
        });
        existingTableCodes.add(code);
      }
    });

    setTables(updatedTables);
    setLocalStore('tables', updatedTables);
    playSound('success');
    return updatedTables;
  };

  const handleClearCompletedOrders = async (clearedIds = []) => {
    // 1. Collect all completed order IDs if none provided
    const idsToClear = Array.isArray(clearedIds) && clearedIds.length > 0
      ? clearedIds
      : (orders || []).filter(o => {
          const st = String(o?.status || '').toLowerCase().trim();
          const items = o.items || [];
          const allServed = items.length > 0 && items.every(it => it.is_served);
          return st === 'completed' || st === 'served' || st === 'settled' || allServed;
        }).map(o => String(o.id || o.order_number || o.supabase_order_id || '')).filter(Boolean);

    // 2. Persist to KDS cleared order IDs in localStorage (so KDS never shows them again)
    try {
      const raw = localStorage.getItem('kds_cleared_order_ids');
      const current = raw ? JSON.parse(raw) : [];
      const merged = Array.from(new Set([...current, ...idsToClear]));
      localStorage.setItem('kds_cleared_order_ids', JSON.stringify(merged));
    } catch (e) {}

    // 3. Mark orders as kds_cleared in orders state without deleting ANY order!
    // Completed orders are PERMANENTLY preserved in the Completed section, Admin Orders, and reports!
    const clearedSet = new Set(idsToClear.map(String));
    const preservedOrders = (orders || []).map(o => {
      const oId = String(o.id || o.order_number || o.supabase_order_id || '');
      const numId = String(o.order_number || '');
      const dbId = String(o.supabase_order_id || '');
      if (clearedSet.has(oId) || (numId && clearedSet.has(numId)) || (dbId && clearedSet.has(dbId))) {
        return { ...o, kds_cleared: true };
      }
      return o;
    });

    setOrders(preservedOrders);
    setLocalStore('orders', preservedOrders);
    playSound('success');

    // 4. Update status in Supabase so it's recorded as COMPLETED in cloud DB
    try {
      const uuidList = idsToClear.filter(id => id && id.length > 20);
      if (uuidList.length > 0) {
        await supabase
          .from('orders')
          .update({ status: 'COMPLETED' })
          .in('id', uuidList);
      }
    } catch (e) {
      console.warn('Notice: Update cloud orders exception:', e);
    }
  };

  const handleToggleStock = (itemId) => {
    let affectedItem = null;
    const updated = menuItems.map(item => {
      if (item.id === itemId) {
        const nextState = !item.is_available;
        affectedItem = { ...item, is_available: nextState, isAvailable: nextState };
        recordEmployeeActivity({
          employeeName: authUser?.name || 'Chef',
          employeeRole: authUser?.role || 'Chef',
          tableNumber: 'Kitchen Station',
          actionType: nextState ? 'DISH_IN_STOCK' : 'DISH_OUT_OF_STOCK',
          details: `Dish "${item.name}" marked as ${nextState ? 'Available / In-Stock' : 'OUT OF STOCK'}`,
          type: 'menu',
          color: nextState ? 'emerald' : 'rose'
        });
        return affectedItem;
      }
      return item;
    });
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
      window.dispatchEvent(new Event('restaurant_data_updated'));
    } catch (e) {}

    // Multi-Device Supabase Realtime Broadcast: Instantly updates all customer phones and staff screens
    if (affectedItem) {
      try {
        supabase.channel('restaurant_alerts').send({
          type: 'broadcast',
          event: 'menu_item_updated',
          payload: {
            action: 'stock_toggled',
            item: affectedItem
          }
        });
      } catch (e) {}

      // Supabase Cloud DB sync
      try {
        supabase
          .from('menu_items')
          .update({ is_available: affectedItem.is_available })
          .eq('id', affectedItem.id)
          .then();
      } catch (e) {}

      // Asynchronous background sync to FastAPI Backend API
      try {
        fetch(`${API_BASE_URL}/menu/${encodeURIComponent(affectedItem.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_available: affectedItem.is_available
          })
        }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleApplyDiscount = (itemId, percent) => {
    const p = Math.max(1, Math.min(90, Number(percent) || 15));
    let affectedItem = null;
    const updated = menuItems.map(item => {
      if (item.id === itemId) {
        const origPrice = Number(item.originalPrice || item.price || 0);
        const discountAmt = Math.round((origPrice * p) / 100);
        const finalPrice = Math.max(0, origPrice - discountAmt);
        affectedItem = {
          ...item,
          originalPrice: origPrice,
          finalPrice: finalPrice,
          price: finalPrice,
          hasDiscount: true,
          discountPercent: p
        };
        return affectedItem;
      }
      return item;
    });

    if (!affectedItem) return;

    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
    } catch (e) {}

    // Dispatch update events for instant customer & staff synchronization
    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    // Realtime Broadcast to connected customer phones & staff terminals
    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'menu_item_updated',
        payload: {
          action: 'discount_applied',
          item: affectedItem
        }
      });
    } catch (e) {}

    // Asynchronous background sync to FastAPI Backend API
    try {
      fetch(`${API_BASE_URL}/menu/${encodeURIComponent(affectedItem.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: affectedItem.finalPrice,
          original_price: affectedItem.originalPrice,
          final_price: affectedItem.finalPrice,
          has_discount: true,
          discount_percent: p
        })
      }).catch(() => {});
    } catch (e) {}

    // Asynchronous sync to Supabase Cloud
    try {
      supabase.from('menu_items').update({
        price: affectedItem.finalPrice
      }).eq('id', affectedItem.id).then(({ error }) => {
        if (error) console.warn('[SUPABASE] Menu discount update notice:', error.message);
      });
    } catch (err) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISCOUNT_APPLIED',
      details: `Applied ${p}% discount on "${affectedItem.name}" (Original: ₹${affectedItem.originalPrice} → Discounted: ₹${affectedItem.finalPrice})`,
      type: 'menu',
      color: 'rose'
    });
    playSound('success');
  };

  const handleRemoveDiscount = (itemId) => {
    let affectedItem = null;
    const updated = menuItems.map(item => {
      if (item.id === itemId) {
        const origPrice = Number(item.originalPrice || item.price || 0);
        affectedItem = {
          ...item,
          finalPrice: origPrice,
          price: origPrice,
          hasDiscount: false,
          discountPercent: 0
        };
        return affectedItem;
      }
      return item;
    });

    if (!affectedItem) return;

    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
    } catch (e) {}

    // Dispatch update events for instant customer & staff synchronization
    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    // Realtime Broadcast to connected customer phones & staff terminals
    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'menu_item_updated',
        payload: {
          action: 'discount_removed',
          item: affectedItem
        }
      });
    } catch (e) {}

    // Asynchronous background sync to FastAPI Backend API
    try {
      fetch(`${API_BASE_URL}/menu/${encodeURIComponent(affectedItem.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: affectedItem.finalPrice,
          original_price: affectedItem.originalPrice,
          final_price: affectedItem.finalPrice,
          has_discount: false,
          discount_percent: 0
        })
      }).catch(() => {});
    } catch (e) {}

    // Asynchronous sync to Supabase Cloud
    try {
      supabase.from('menu_items').update({
        price: affectedItem.finalPrice
      }).eq('id', affectedItem.id).then(({ error }) => {
        if (error) console.warn('[SUPABASE] Menu discount removal notice:', error.message);
      });
    } catch (err) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISCOUNT_REMOVED',
      details: `Removed discount on "${affectedItem.name}". Restored original price ₹${affectedItem.originalPrice || affectedItem.price}`,
      type: 'menu',
      color: 'slate'
    });
    playSound('success');
  };

  const handleUpdateMenuItem = async (updatedItem) => {
    const photoUrl = updatedItem.image_url || updatedItem.image || updatedItem.imageUrl || updatedItem.photo || null;
    const determinedCuisine = updatedItem.cuisine || getDishCuisine(updatedItem);
    const normalized = {
      ...updatedItem,
      image_url: photoUrl,
      image: photoUrl,
      imageUrl: photoUrl,
      photo: photoUrl,
      cuisine: determinedCuisine,
      is_available: updatedItem.is_available !== false,
      isAvailable: updatedItem.is_available !== false
    };

    const matchesUpdated = (item) => (
      (item.id && updatedItem.id && item.id === updatedItem.id) ||
      (item.name && updatedItem.name && item.name.toLowerCase().trim() === updatedItem.name.toLowerCase().trim())
    );
    const updated = menuItems.map(item => matchesUpdated(item) ? normalized : item);
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
    } catch (e) {}

    // Dispatch update events for instant customer & staff synchronization
    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    // Realtime Broadcast to all connected customer phones & staff terminals
    // Omit massive 177-item catalog from payload to stay strictly under Supabase's 256KB ceiling
    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'menu_item_updated',
        payload: {
          action: 'update',
          item: normalized
        }
      });
    } catch (e) {}

    // Asynchronous background sync to Supabase Cloud & Backend API
    try {
      supabase.from('menu_items').update({
        name: normalized.name,
        gujarati_name: normalized.gujarati_name || null,
        price: normalized.finalPrice || normalized.price,
        description: normalized.description || '',
        image_url: photoUrl,
        is_available: normalized.is_available
      }).eq('id', normalized.id).then(({ error }) => {
        if (error) console.warn('[SUPABASE] Menu update notice:', error.message);
      });
    } catch (err) {
      console.warn('[SUPABASE] Sync notice:', err);
    }

    try {
      fetch(`${API_BASE_URL}/menu/${normalized.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalized.name,
          gujarati_name: normalized.gujarati_name || null,
          price: normalized.finalPrice || normalized.price,
          category: normalized.category,
          description: normalized.description || '',
          image_url: photoUrl,
          is_available: normalized.is_available
        })
      }).catch(() => {});
    } catch (e) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'MENU_ITEM_UPDATED',
      details: `Updated dish "${normalized.name}" (Price: ₹${normalized.finalPrice || normalized.price}) with photo`,
      type: 'menu',
      color: 'orange'
    });
    playSound('success');
  };

  const handleAddMenuItem = async (itemData) => {
    const photoUrl = itemData.image_url || itemData.image || itemData.imageUrl || itemData.photo || null;
    const determinedCuisine = itemData.cuisine || getDishCuisine(itemData);
    const priceNum = Number(itemData.price);
    const itemObj = {
      ...itemData,
      id: itemData.id || `m_${Date.now()}`,
      originalPrice: priceNum,
      finalPrice: priceNum,
      price: priceNum,
      image_url: photoUrl,
      image: photoUrl,
      imageUrl: photoUrl,
      photo: photoUrl,
      cuisine: determinedCuisine,
      is_available: itemData.is_available !== false,
      isAvailable: itemData.is_available !== false,
      hasDiscount: false,
      discountPercent: 0,
      orders_count: 0,
      rating: 4.8,
      prepTimeMins: itemData.prepTimeMins || 10
    };

    const updated = [...menuItems, itemObj];
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
    } catch (e) {}

    // Dispatch update events for instant customer & staff synchronization
    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    // Realtime Broadcast to all connected customer phones & staff terminals
    // Omit massive 177-item catalog from payload to stay strictly under Supabase's 256KB ceiling
    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'menu_item_updated',
        payload: {
          action: 'add',
          item: itemObj
        }
      });
    } catch (e) {}

    // Asynchronous cloud persistence to Supabase PostgreSQL & Permanent Storage
    try {
      fetch(`${API_BASE_URL}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemObj.id,
          name: itemObj.name,
          gujarati_name: itemObj.gujarati_name || null,
          price: itemObj.price,
          category: itemObj.category || 'Mysore Dosa',
          description: itemObj.description || '',
          image_url: photoUrl,
          is_available: true
        })
      })
      .then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved?.id) {
          setMenuItems(prev => {
            const remapped = prev.map(m => m.id === itemObj.id ? { 
              ...m, 
              id: saved.id, 
              image_url: saved.image_url || m.image_url, 
              imageUrl: saved.image_url || m.imageUrl, 
              image: saved.image_url || m.image, 
              photo: saved.image_url || m.photo 
            } : m);
            setLocalStore('menu_items', remapped);
            try {
              localStorage.setItem('atmiya_menu_items', JSON.stringify(remapped));
            } catch (e) {}
            return remapped;
          });
        }
      })
      .catch(err => {
        console.warn('[MENU SYNC] Server menu sync notice:', err);
      });
    } catch (e) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISH_ADDED',
      details: `Created new dish "${itemObj.name}" in category "${itemObj.category}" (₹${itemObj.price}) with photo`,
      type: 'menu',
      color: 'emerald'
    });
    playSound('success');
  };

  const handleDeleteMenuItem = (id) => {
    const targetItem = menuItems.find(item => item.id === id);
    if (!window.confirm(`Remove "${targetItem?.name || 'this dish'}" from the menu?`)) return;
    const updated = menuItems.filter(item => item.id !== id);
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
      window.dispatchEvent(new Event('restaurant_data_updated'));
    } catch (e) {}

    // Multi-Device Supabase Realtime Broadcast
    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'menu_item_updated',
        payload: {
          action: 'delete',
          itemId: id
        }
      });
    } catch (e) {}

    // Asynchronous sync to Supabase Cloud & Backend API
    try {
      supabase.from('menu_items').delete().eq('id', id).then();
    } catch (e) {}

    try {
      fetch(`${API_BASE_URL}/menu/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISH_DELETED',
      details: `Deleted dish "${targetItem?.name || id}" from menu`,
      type: 'menu',
      color: 'rose'
    });
  };

  const handleAddCategory = (categoryData) => {
    const catName = (categoryData.name || '').trim();
    if (!catName) return null;
    const catId = categoryData.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const photoUrl = categoryData.image_url || categoryData.imageUrl || categoryData.image || categoryData.photo || null;
    const newCategory = {
      id: catId,
      name: catName,
      gujarati: (categoryData.gujarati || categoryData.gujarati_name || catName).trim(),
      image_url: photoUrl,
      imageUrl: photoUrl,
      image: photoUrl,
      photo: photoUrl,
      icon: categoryData.icon || 'Utensils',
      cuisine: categoryData.cuisine || 'south_indian',
      percentage: Number(categoryData.percentage) || 10
    };
    const updated = [...categories.filter(c => c.name.toLowerCase() !== catName.toLowerCase()), newCategory];
    setCategories(updated);
    setLocalStore('categories', updated);
    try {
      localStorage.removeItem('restaurant_menu_cleared');
      localStorage.setItem('restaurant_categories', JSON.stringify(updated));
      localStorage.setItem('atmiya_categories', JSON.stringify(updated));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('atmiya_categories_updated', { detail: { categories: updated } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'category_updated',
        payload: { action: 'add', category: newCategory }
      });
    } catch (e) {}

    try {
      supabase.from('menu_categories').insert({
        id: newCategory.id,
        name: newCategory.name,
        gujarati_name: newCategory.gujarati,
        icon: newCategory.icon,
        image_url: photoUrl,
        is_active: true
      }).then();
    } catch (e) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'CATEGORY_ADDED',
      details: `Created new category "${newCategory.name}" (${newCategory.gujarati})`,
      type: 'menu',
      color: 'emerald'
    });
    playSound('success');
    return newCategory;
  };

  const handleUpdateCategory = (categoryId, updatedData) => {
    const oldCat = categories.find(c => c.id === categoryId);
    if (!oldCat) return;
    const oldName = oldCat.name;
    const newName = (updatedData.name || oldName).trim();
    const photoUrl = updatedData.image_url !== undefined ? updatedData.image_url : (oldCat.image_url || oldCat.imageUrl || null);

    const updatedCat = {
      ...oldCat,
      ...updatedData,
      name: newName,
      gujarati: (updatedData.gujarati || updatedData.gujarati_name || oldCat.gujarati || newName).trim(),
      image_url: photoUrl,
      imageUrl: photoUrl,
      image: photoUrl,
      photo: photoUrl
    };

    const updatedCats = categories.map(c => c.id === categoryId ? updatedCat : c);
    setCategories(updatedCats);
    setLocalStore('categories', updatedCats);
    try {
      localStorage.setItem('restaurant_categories', JSON.stringify(updatedCats));
      localStorage.setItem('atmiya_categories', JSON.stringify(updatedCats));
    } catch (e) {}

    if (oldName !== newName) {
      const updatedDishes = menuItems.map(item => {
        if (item.category === oldName) {
          return { ...item, category: newName };
        }
        return item;
      });
      setMenuItems(updatedDishes);
      setLocalStore('menu_items', updatedDishes);
      try {
        localStorage.setItem('atmiya_menu_items', JSON.stringify(updatedDishes));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('atmiya_categories_updated', { detail: { categories: updatedCats } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'CATEGORY_UPDATED',
      details: `Updated category "${oldName}" → "${newName}"`,
      type: 'menu',
      color: 'orange'
    });
    playSound('success');
  };

  const handleDeleteCategory = (categoryId) => {
    const targetCat = categories.find(c => c.id === categoryId);
    if (!targetCat) return;
    const catDishes = menuItems.filter(m => m.category === targetCat.name);

    const updatedCats = categories.filter(c => c.id !== categoryId);
    setCategories(updatedCats);
    setLocalStore('categories', updatedCats);
    try {
      localStorage.setItem('restaurant_categories', JSON.stringify(updatedCats));
      localStorage.setItem('atmiya_categories', JSON.stringify(updatedCats));
    } catch (e) {}

    if (catDishes.length > 0) {
      const fallbackCatName = updatedCats.length > 0 ? updatedCats[0].name : 'General';
      const updatedDishes = menuItems.map(item => {
        if (item.category === targetCat.name) {
          return { ...item, category: fallbackCatName };
        }
        return item;
      });
      setMenuItems(updatedDishes);
      setLocalStore('menu_items', updatedDishes);
      try {
        localStorage.setItem('atmiya_menu_items', JSON.stringify(updatedDishes));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('atmiya_categories_updated', { detail: { categories: updatedCats } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    try {
      supabase.from('menu_categories').delete().eq('id', categoryId).then();
    } catch (e) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'CATEGORY_DELETED',
      details: `Deleted category "${targetCat.name}" (${catDishes.length} dishes reassigned)`,
      type: 'menu',
      color: 'rose'
    });
    playSound('trash');
  };

  const handleClearAllMenuAndCategories = () => {
    setMenuItems([]);
    setCategories([]);
    setLocalStore('menu_items', []);
    setLocalStore('categories', []);
    try {
      localStorage.setItem('restaurant_menu_items', '[]');
      localStorage.setItem('atmiya_menu_items', '[]');
      localStorage.setItem('restaurant_categories', '[]');
      localStorage.setItem('atmiya_categories', '[]');
      localStorage.setItem('restaurant_menu_cleared', 'true');
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: [] } }));
    window.dispatchEvent(new CustomEvent('atmiya_categories_updated', { detail: { categories: [] } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));
    window.dispatchEvent(new Event('atmiya_data_updated'));

    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'menu_item_updated',
        payload: { action: 'clear_all' }
      });
    } catch (e) {}

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'MENU_CLEARED_ALL',
      details: 'Cleared all menu dishes and categories for a fresh start',
      type: 'menu',
      color: 'rose'
    });
    playSound('trash');
  };

  const handleRestoreSampleMenu = () => {
    try {
      localStorage.removeItem('restaurant_menu_cleared');
    } catch (e) {}
    loadAuthenticMenuCards();
    setCategories(AUTHENTIC_CATEGORIES);
    setMenuItems(AUTHENTIC_MENU_CARD_ITEMS);
    playSound('success');
  };

  const handleAddEmployee = (empData) => {
    const updated = [...employees, empData];
    setEmployees(updated);
    setLocalStore('employees', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin / Owner',
      tableNumber: 'System',
      actionType: 'CREDENTIAL_GENERATED',
      details: `Generated login credentials for ${empData.name} (Role: ${empData.role}, Username: ${empData.username})`,
      type: 'staff',
      color: 'indigo'
    });
    playSound('success');
  };

  const handleUpdateEmployee = (updatedEmpData) => {
    if (!updatedEmpData || !updatedEmpData.id) return;
    const updated = employees.map(emp => {
      if (emp.id === updatedEmpData.id) {
        return { ...emp, ...updatedEmpData };
      }
      return emp;
    });
    setEmployees(updated);
    setLocalStore('employees', updated);

    // If currently logged-in user is this updated employee, synchronize active auth session immediately!
    const isMatchingCurrentAuth = authUser && (
      authUser.id === updatedEmpData.id || 
      authUser.username === updatedEmpData.username ||
      (String(authUser.role || '').toLowerCase().includes('admin') && String(updatedEmpData.role || '').toLowerCase().includes('admin'))
    );

    if (isMatchingCurrentAuth) {
      const nextAuthUser = {
        ...authUser,
        name: updatedEmpData.name || authUser.name,
        username: updatedEmpData.username || authUser.username,
        phone: updatedEmpData.phone || authUser.phone,
        role: updatedEmpData.role || authUser.role
      };
      setAuthUser(nextAuthUser);
      setLocalStore('auth_user', nextAuthUser);
    }

    recordEmployeeActivity({
      employeeName: updatedEmpData.name || authUser?.name || 'Admin Owner',
      employeeRole: updatedEmpData.role || authUser?.role || 'Admin / Owner',
      tableNumber: 'System',
      actionType: 'CREDENTIAL_UPDATED',
      details: `Updated credentials for ${updatedEmpData.name} (Role: ${updatedEmpData.role}, Username: ${updatedEmpData.username}, Phone: ${updatedEmpData.phone || 'N/A'})`,
      type: 'staff',
      color: 'indigo'
    });
    playSound('success');
  };

  const handleDeleteEmployee = (empId, empName) => {
    if (!window.confirm(`Are you sure you want to delete staff credentials for ${empName || 'this employee'}?`)) return;
    const updated = employees.filter(e => e.id !== empId);
    setEmployees(updated);
    setLocalStore('employees', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin / Owner',
      tableNumber: 'System',
      actionType: 'CREDENTIAL_DELETED',
      details: `Deleted login credentials for ${empName || empId}`,
      type: 'staff',
      color: 'rose'
    });
    playSound('success');
  };

  const handleAddCoupon = (couponData) => {
    const updated = [...coupons, couponData];
    setCoupons(updated);
    setLocalStore('coupons', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: 'Admin / Owner',
      tableNumber: 'Promo',
      actionType: 'COUPON_CREATED',
      details: `Created promo coupon "${couponData.code}" (${couponData.discount}${couponData.type === 'percentage' ? '%' : '₹'} off)`,
      type: 'promo',
      color: 'amber'
    });
    playSound('success');
  };

  const handleToggleCoupon = (id) => {
    const updated = coupons.map(c => c.id === id ? { ...c, active: !c.active } : c);
    setCoupons(updated);
    setLocalStore('coupons', updated);
  };

  const handleUpdateCoupon = (updatedCoupon) => {
    const updated = coupons.map(c => c.id === updatedCoupon.id ? updatedCoupon : c);
    setCoupons(updated);
    setLocalStore('coupons', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: 'Admin / Owner',
      tableNumber: 'Promo',
      actionType: 'COUPON_UPDATED',
      details: `Updated promo coupon "${updatedCoupon.code}" (${updatedCoupon.title || updatedCoupon.type})`,
      type: 'promo',
      color: 'amber'
    });
    playSound('success');
  };

  const handleDeleteCoupon = (couponId) => {
    const target = coupons.find(c => c.id === couponId);
    const updated = coupons.filter(c => c.id !== couponId);
    setCoupons(updated);
    setLocalStore('coupons', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: 'Admin / Owner',
      tableNumber: 'Promo',
      actionType: 'COUPON_DELETED',
      details: `Deleted promo coupon "${target?.code || couponId}"`,
      type: 'promo',
      color: 'rose'
    });
    playSound('trash');
  };


  const handleSettleTableBill = (orderId, tableNum, method = 'Cash', waiterId = null, waiterName = null) => {
    let resolvedOrderId = orderId;
    let resolvedTableNum = tableNum;
    let resolvedMethod = method;

    // Support flexible call signatures: (tableNum, method) or (orderId, tableNum, method)
    if (orderId && !tableNum) {
      resolvedTableNum = orderId;
      resolvedOrderId = null;
    } else if (orderId && typeof tableNum === 'string' && ['Cash', 'UPI', 'Card', 'Split'].includes(tableNum)) {
      resolvedMethod = tableNum;
      resolvedTableNum = orderId;
      resolvedOrderId = null;
    }

    const normalizeTbl = (val) => {
      const digits = String(val || '').replace(/[^0-9]/g, '');
      return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
    };

    const targetOrder = resolvedOrderId ? orders.find(o => o.id === resolvedOrderId) : null;
    if (!resolvedTableNum && targetOrder?.table_number) {
      resolvedTableNum = targetOrder.table_number;
    }

    const resolvedWaiterId = waiterId || authUser?.waiter_id || (authUser?.role === 'waiter' ? (authUser?.id || 'WTR-101') : null);
    const resolvedCollector = waiterName || authUser?.name || (authUser?.role === 'waiter' ? 'Floor Waiter' : 'Cashier');

    // Find all active orders for this table to settle the whole dining session (Round 1 meal + Round 2 water/extras)
    const tableActiveOrders = orders.filter(o => 
      resolvedTableNum && 
      normalizeTbl(o.table_number) === normalizeTbl(resolvedTableNum) && 
      o.status !== 'Completed' && 
      o.status !== 'Cancelled'
    );

    const totalTableAmount = tableActiveOrders.length > 0 
      ? tableActiveOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0)
      : (targetOrder?.total || targetOrder?.total_amount || 0);

    const updatedOrders = orders.map(o => {
      const isThisTableOrder = resolvedTableNum && 
        normalizeTbl(o.table_number) === normalizeTbl(resolvedTableNum) && 
        o.status !== 'Completed' && 
        o.status !== 'Cancelled';

      if (isThisTableOrder || o.id === orderId) {
        const nowIso = new Date().toISOString();
        return {
          ...o,
          status: 'Completed',
          payment_status: 'Paid',
          payment_mode: o.payment_verified_online ? o.payment_mode : resolvedMethod,
          paid_collected_by: resolvedCollector,
          paid_collected_by_id: resolvedWaiterId,
          paid_collected_by_waiter_id: resolvedWaiterId,
          payment_verified_online: o.payment_verified_online || resolvedMethod !== 'Cash',
          settled_at: o.settled_at || nowIso,
          completed_at: o.completed_at || nowIso,
          items: (o.items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'served' })),
          on_hold: false,
          is_hold: false,
          hold: false,
          table_held: false,
          kitchen_status: 'served'
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    setLocalStore('orders', updatedOrders);

    // Free the table & remove all hold flags
    const updatedTables = tables.map(t => 
      (resolvedTableNum && normalizeTbl(t.number) === normalizeTbl(resolvedTableNum)) ? {
        ...t,
        status: 'available',
        is_occupied: false,
        on_hold: false,
        is_hold: false,
        held: false,
        current_order_id: null,
        current_customer_name: null,
        current_customer_phone: null,
        timing: null,
        food_delivered_at: null,
        turnover_notified: false,
        snoozed_until: null
      } : t
    );
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    recordEmployeeActivity({
      employeeName: resolvedCollector,
      employeeRole: authUser?.role === 'waiter' ? 'Floor Waiter' : (authUser?.role || 'Cashier'),
      tableNumber: resolvedTableNum,
      actionType: 'TABLE_BILL_SETTLED',
      amount: totalTableAmount,
      paymentMethod: resolvedMethod,
      details: `Settled Table ${resolvedTableNum} bill of ₹${totalTableAmount} via ${resolvedMethod}${resolvedWaiterId ? ` [Collected by Waiter ID: ${resolvedWaiterId}]` : ''}. Table vacated & QR standee freed for next guest.`,
      type: 'payment',
      color: 'emerald'
    });
    playSound('cash');

    // Automated Server-side + Supabase session termination & bill settlement
    settleTableSessionApi({
      tableNumber: resolvedTableNum,
      orderId: targetOrder?.supabase_order_id || targetOrder?.id || orderId,
      paymentMethod: resolvedMethod,
      sessionId: targetOrder?.session_id,
      amountCollected: totalTableAmount,
      settledBy: resolvedCollector,
      waiterId: resolvedWaiterId
    });

    // 🔔 Automated Waiter Cleaning Dispatch Message from Cashier/Admin
    const cleanCallOnSettle = {
      id: `clean_${normalizeTbl(resolvedTableNum)}_${Date.now()}`,
      tableNumber: resolvedTableNum,
      type: 'table_clean',
      label: `🧹 Table Vacated — Clean & Reset Table ${resolvedTableNum}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      status: 'pending',
      dispatchedBy: resolvedCollector,
      priority: 'high'
    };

    setServiceCalls(prev => {
      const targetTblCode = normalizeTbl(resolvedTableNum);
      // Purge ALL prior service calls (food_ready, waiter calls, bill requests, etc.) for this settled table
      const filtered = (prev || []).filter(c => normalizeTbl(c.tableNumber) !== targetTblCode);
      const updated = [cleanCallOnSettle, ...filtered].slice(0, 30);
      setLocalStore('service_calls', updated);
      return updated;
    });

    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'service_call',
        payload: cleanCallOnSettle
      }).catch(err => console.warn('Realtime cleaning broadcast error:', err));
    } catch (err) {
      console.warn('Realtime cleaning broadcast error:', err);
    }

    if (getBoundSessionTable() === normalizeTbl(resolvedTableNum)) {
      clearBoundSessionTable();
    }
  };

  // Direct Table Vacate (Used by Admin Table Operations & Turnover Management)
  const handleVacateTable = async (tableNum) => {
    const normalizeTbl = (val) => {
      const digits = String(val || '').replace(/[^0-9]/g, '');
      return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
    };

    const targetTblCode = normalizeTbl(tableNum);
    const updatedTables = tables.map(t => {
      if (normalizeTbl(t.number) === targetTblCode) {
        return {
          ...t,
          status: 'available',
          is_occupied: false,
          on_hold: false,
          is_hold: false,
          held: false,
          current_order_id: null,
          current_customer_name: null,
          current_customer_phone: null,
          timing: null,
          food_delivered_at: null,
          turnover_notified: false,
          snoozed_until: null
        };
      }
      return t;
    });
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    // Clear turnover session de-duplication for this vacated table
    if (notifiedTurnoverSessionsRef.current) {
      Array.from(notifiedTurnoverSessionsRef.current).forEach(k => {
        if (k.startsWith(`${tableNum}_`)) {
          notifiedTurnoverSessionsRef.current.delete(k);
        }
      });
    }

    // Complete any active orders for this table & remove all hold flags
    const updatedOrders = orders.map(o => {
      if (normalizeTbl(o.table_number) === targetTblCode && o.status !== 'Completed' && o.status !== 'Cancelled') {
        return {
          ...o,
          status: 'Completed',
          payment_status: 'Paid',
          payment_mode: o.payment_mode || 'Cash',
          paid_collected_by: authUser?.name || 'Admin',
          settled_at: o.settled_at || new Date().toISOString(),
          completed_at: o.completed_at || new Date().toISOString(),
          items: (o.items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'served' })),
          on_hold: false,
          is_hold: false,
          hold: false,
          table_held: false,
          kitchen_status: 'served'
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    setLocalStore('orders', updatedOrders);

    // Sync session closure to Supabase Cloud
    settleTableSessionApi({
      tableNumber: tableNum,
      paymentMethod: 'Cash',
      settledBy: authUser?.name || 'Admin'
    });

    const cleanDigits = String(tableNum || '').replace(/\D/g, '');
    const intNum = cleanDigits ? parseInt(cleanDigits, 10) : null;
    const padNum = intNum !== null ? (intNum < 10 ? `0${intNum}` : `${intNum}`) : cleanDigits;
    const tableVariants = Array.from(new Set([
      tableNum,
      targetTblCode,
      String(intNum),
      padNum,
      `T${intNum}`,
      `T${padNum}`,
      `T-${intNum}`,
      `T-${padNum}`,
      `Table ${intNum}`,
      `Table ${padNum}`
    ].filter(Boolean)));
    const orFilter = tableVariants.map(v => `table_number.eq.${v}`).join(',');

    try {
      if (orFilter) {
        await supabase
          .from('orders')
          .update({ 
            status: 'Completed', 
            payment_status: 'Paid', 
            payment_mode: 'Cash',
            settled_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .or(orFilter);

        await supabase
          .from('restaurant_tables')
          .update({ status: 'VACANT', current_customer_name: null, current_order_id: null })
          .or(orFilter);

        await supabase
          .from('table_sessions')
          .update({ status: 'COMPLETED', closed_at: new Date().toISOString() })
          .or(orFilter);
      }
    } catch (e) {
      console.warn('Order status sync error during vacate:', e);
    }

    // If an active toast is showing for this table, dismiss it
    if (activeToast && activeToast.tableNumber && normalizeTbl(activeToast.tableNumber) === targetTblCode) {
      setActiveToast(null);
    }

    // Purge ALL service calls (food_ready, waiter calls, bill requests, cleaning) for this vacated table
    // Table is immediately VACANT, CLEAN, and READY TO SEAT across all terminals (Waiter & Admin)
    setServiceCalls(prev => {
      const filtered = (prev || []).filter(c => normalizeTbl(c.tableNumber) !== targetTblCode);
      setLocalStore('service_calls', filtered);
      return filtered;
    });

    playSound('success');

    // Realtime broadcast to all waiter and kitchen devices
    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'service_call',
        payload: cleanCall
      }).catch(err => console.warn('Realtime cleaning broadcast error:', err));
    } catch (err) {
      console.warn('Realtime cleaning broadcast error:', err);
    }

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: tableNum,
      actionType: 'TABLE_VACATED_CLEAN_DISPATCH',
      details: `Table ${tableNum} vacated & settled by Admin. Cleaning alert dispatched to floor waiters.`,
      type: 'table',
      color: 'emerald'
    });
    playSound('success');

    setActiveToast({
      title: `🟢 Table ${tableNum} Vacated & Settled`,
      message: `Table marked empty. Cleaning alert dispatched to floor waiters.`,
      type: 'success'
    });

    settleTableSessionApi({
      tableNumber: tableNum,
      orderId: null,
      paymentMethod: 'Turnover Check',
      settledBy: 'Turnover Engine'
    });

    if (getBoundSessionTable() === targetTblCode) {
      clearBoundSessionTable();
    }
  };

  // Turnover handlers deprecated and removed per user instruction
  const handleSnoozeTurnover = () => {};
  const handleSimulate30mElapsed = () => {};

  const handleShiftTable = (fromTable, toTable) => {
    // Update order table_number
    const updatedOrders = orders.map(o => {
      if ((o.table_number === fromTable || o.table_number === `Table ${fromTable}`) && o.status !== 'Completed') {
        return { ...o, table_number: toTable };
      }
      return o;
    });
    setOrders(updatedOrders);
    setLocalStore('orders', updatedOrders);

    // Update tables: fromTable becomes available, toTable becomes occupied
    const activeFromOrder = orders.find(o => (o.table_number === fromTable || o.table_number === `Table ${fromTable}`) && o.status !== 'Completed');
    const updatedTables = tables.map(t => {
      if (t.number === fromTable) {
        return { ...t, status: 'available', current_order_id: null, timing: null };
      }
      if (t.number === toTable) {
        return { ...t, status: 'occupied', current_order_id: activeFromOrder?.id || null, timing: '5m' };
      }
      return t;
    });
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: 'Floor Lead',
      tableNumber: `${fromTable} -> ${toTable}`,
      actionType: 'TABLE_SHIFTED',
      details: `Shifted guest dining session & order from Table ${fromTable} to Table ${toTable}`,
      type: 'table',
      color: 'blue'
    });

    // Dual persistence with backend
    try {
      const cleanFrom = String(fromTable).replace(/[^0-9]/g, '') || fromTable;
      fetch(`/api/tables/${cleanFrom}/shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_table_number: toTable })
      }).catch(() => {});
    } catch (e) {}

    playSound('success');
  };

  const handleCallService = async (type, tableNumber) => {
    const labels = {
      WAITER: 'Floor Waiter Assistance',
      WATER: 'Drinking Water Refill',
      BILL: 'Bill Settlement Request',
      CLEAN: 'Table Cleaning'
    };
    let cleanTbl = String(tableNumber).replace(/\D/g, '') || tableNumber;
    if (viewMode === 'customer' && !authUser) {
      const boundTbl = getBoundSessionTable();
      if (boundTbl) {
        cleanTbl = boundTbl;
      }
    }
    const newCall = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tableNumber: cleanTbl,
      type,
      label: labels[type] || 'Assistance',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      status: 'pending'
    };

    // 1. Update local state
    setServiceCalls(prev => {
      const updated = [newCall, ...prev.filter(c => c.id !== newCall.id).slice(0, 24)];
      setLocalStore('service_calls', updated);
      return updated;
    });

    // 2. Play service chime or cleaning siren
    if (type === 'CLEAN' || String(type).toLowerCase().includes('clean')) {
      playSound('alert');
      speakTableCleanAlert(cleanTbl);
    } else {
      playSound('waiter');
    }

    // 3. Broadcast immediately over Supabase Realtime channel to laptop POS & all staff devices
    try {
      const channel = supabase.channel('restaurant_alerts');
      await channel.send({
        type: 'broadcast',
        event: 'service_call',
        payload: newCall
      });
    } catch (err) {
      console.warn('Realtime service broadcast error:', err);
    }

    // 4. Persist to Supabase audit_logs
    recordEmployeeActivity({
      employeeName: `Table ${cleanTbl} Guest`,
      employeeRole: 'Customer QR',
      tableNumber: cleanTbl,
      actionType: `CALL_${type}`,
      details: `Table ${cleanTbl} guest requested: ${labels[type] || type}`,
      type: 'table',
      color: 'orange'
    });
  };

  const handleDismissServiceCall = async (callId, staffName = null, staffId = null) => {
    let targetCall = null;
    setServiceCalls(prev => {
      targetCall = (prev || []).find(s => s.id === callId);
      const updated = (prev || []).filter(s => s.id !== callId);
      setLocalStore('service_calls', updated);
      return updated;
    });

    // Dismiss active toast if it matches this call
    if (activeToast && (activeToast.callId === callId || activeToast.id === callId)) {
      setActiveToast(null);
    }

    // Broadcast dismissal to all devices so the alert clears everywhere
    try {
      const channel = supabase.channel('restaurant_alerts');
      await channel.send({
        type: 'broadcast',
        event: 'dismiss_service_call',
        payload: { callId }
      });
    } catch (e) {
      console.warn('Dismiss service broadcast error:', e);
    }

    if (targetCall) {
      const collectorName = staffName || authUser?.name || 'Staff';
      const collectorId = staffId || authUser?.waiter_id || authUser?.id || 'WTR-101';

      if (targetCall.type === 'food_ready') {
        if (targetCall.orderId && targetCall.itemIndex !== undefined) {
          handleToggleItemServed(targetCall.orderId, targetCall.itemIndex, collectorName, collectorId);
        } else if (targetCall.tableNumber) {
          handleMarkAllTableItemsServed(targetCall.tableNumber, collectorName, collectorId);
        }
      }

      const isCleanCall = targetCall.type === 'table_clean' || targetCall.type === 'cleaning';

      recordEmployeeActivity({
        employeeName: `${collectorName} (${collectorId})`,
        employeeRole: authUser?.role || 'Waiter',
        tableNumber: targetCall.tableNumber,
        actionType: targetCall.type === 'food_ready' ? 'FOOD_DELIVERED' : isCleanCall ? 'TABLE_CLEANED' : 'SERVICE_ATTENDED',
        details: targetCall.type === 'food_ready' 
          ? `Delivered food to Table ${targetCall.tableNumber}: ${targetCall.label || targetCall.itemsSummary || 'Dishes'} by ${collectorName} (${collectorId})`
          : isCleanCall
            ? `Table ${targetCall.tableNumber} cleaned & reset for next guests by ${collectorName} (${collectorId})`
            : `Attended ${targetCall.label || 'guest call'} at Table ${targetCall.tableNumber} by ${collectorName} (${collectorId})`,
        type: 'table',
        color: 'emerald'
      });
    }
    playSound('success');
  };

  const handleDismissTableServiceCalls = async (tableNum, callType = 'food_ready', staffName = null, staffId = null) => {
    const normalizeTbl = (val) => {
      const digits = String(val || '').replace(/[^0-9]/g, '');
      return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
    };
    const tCode = normalizeTbl(tableNum);
    let dismissedCalls = [];
    setServiceCalls(prev => {
      dismissedCalls = (prev || []).filter(c => normalizeTbl(c.tableNumber) === tCode && (!callType || c.type === callType));
      const updated = (prev || []).filter(c => !(normalizeTbl(c.tableNumber) === tCode && (!callType || c.type === callType)));
      setLocalStore('service_calls', updated);
      return updated;
    });

    if (activeToast && normalizeTbl(activeToast.tableNumber) === tCode) {
      setActiveToast(null);
    }

    try {
      const channel = supabase.channel('restaurant_alerts');
      for (const dc of dismissedCalls) {
        channel.send({
          type: 'broadcast',
          event: 'dismiss_service_call',
          payload: { callId: dc.id }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Batch dismiss service broadcast error:', e);
    }
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setLocalStore('settings', newSettings);
  };

  // SECURITY GUARD: IF QR SECURITY VERIFICATION FAILED (Tampered or Missing Key)
  if (qrSecurityError && !isAdminPreview) {
    const boundTbl = getBoundSessionTable();
    const safeBoundTbl = boundTbl ? (Number(boundTbl) < 10 ? `T0${boundTbl}` : `T${boundTbl}`) : null;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-rose-500/30">
        {renderActiveToast()}
        <div className="w-full max-w-md bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/10 animate-pulse">
              <ShieldAlert className="w-10 h-10 text-rose-500" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs font-black tracking-wider uppercase">
              <span>Security Protocol Enforced</span>
            </div>
            <h2 className="text-2xl font-black font-heading text-white tracking-tight">
              Invalid Table QR Code
            </h2>
            <p className="text-xs text-rose-400 font-bold uppercase tracking-widest font-mono">
              अमान्य क्यूआर कोड • एक्सेस अस्वीकृत
            </p>
          </div>

          {/* Details Card */}
          <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs text-slate-400 font-medium">Requested Table:</span>
              <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {qrSecurityError.attemptedTable || 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This dining link has an <strong>invalid, missing, or tampered security signature</strong>. To ensure table bill security and prevent cross-table ordering errors, manual table changes in the link are blocked.
            </p>
            <p className="text-xs text-amber-300/90 leading-relaxed font-medium">
              कृपया अपने डाइनिंग टेबल पर रखे असली ऐक्रेलिक क्यूआर कोड स्टैंडी (QR Standee) को अपने फोन से स्कैन करें।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 pt-2">
            {safeBoundTbl && (
              <button
                type="button"
                onClick={() => {
                  const correctSec = generateTableSecurityKey(safeBoundTbl);
                  setQrSecurityError(null);
                  setCurrentTable(safeBoundTbl);
                  window.location.href = `/?table=${safeBoundTbl}&tsec=${correctSec}`;
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Return to My Seated Table ({safeBoundTbl})</span>
              </button>
            )}

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Genuine Table Standee</span>
            </button>

            <button
              onClick={() => {
                setQrSecurityError(null);
                clearCustomerSession();
                clearBoundSessionTable();
                setForceAuthWall(true);
                setViewMode('admin');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-slate-700/60 flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <span>Staff / Management Login</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Atmiya Dosa Hub • Cryptographic Anti-Tamper System
          </div>
        </div>
      </div>
    );
  }

  // IF CUSTOMER VIEW (OR SCANNED QR CODE) -> DIRECTLY SHOW TOUCH-FRIENDLY CUSTOMER MENU (NO LOGIN WALL)
  if (!forceAuthWall && viewMode === 'customer') {
    return (
      <>
        {renderActiveToast()}
        <CustomerMenu
          currentTable={currentTable}
          setCurrentTable={setCurrentTable}
          tables={tables}
          categories={categories}
          menuItems={menuItems}
          orders={orders}
          coupons={coupons}
          onPlaceOrder={handlePlaceCustomerOrder}
          onCallService={handleCallService}
          currentLang={currentLang}
          onLanguageChange={setCurrentLang}
          restaurantSettings={settings}
          authUser={authUser}
          onBackToAdmin={() => {
            clearCustomerSession();
            clearBoundSessionTable();
            if (typeof window !== 'undefined') {
              try {
                window.history.replaceState(null, '', window.location.pathname);
              } catch (e) {}
            }
            setViewMode('admin');
            setForceAuthWall(true);
          }}
        />
      </>
    );
  }

  // IF NOT AUTHENTICATED -> CHECK IF CUSTOMER BEFORE SHOWING LOGIN WALL
  if (!authUser) {
    // CRITICAL GUEST ISOLATION SAFEGUARD:
    // If user arrived via QR scan, or has an active dining session, or was browsing as customer:
    // Keep them strictly in Customer Menu UNLESS staff clicked sign out or back to staff login!
    if (!forceAuthWall && (isCustomerSession() || getBoundSessionTable())) {
      return (
        <>
          {renderActiveToast()}
          <CustomerMenu
            currentTable={currentTable}
            setCurrentTable={setCurrentTable}
            tables={tables}
            categories={categories}
            menuItems={menuItems}
            orders={orders}
            coupons={coupons}
            onPlaceOrder={handlePlaceCustomerOrder}
            onCallService={handleCallService}
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
            restaurantSettings={settings}
            authUser={null}
            onBackToAdmin={() => {
              clearCustomerSession();
              clearBoundSessionTable();
              if (typeof window !== 'undefined') {
                try {
                  window.history.replaceState(null, '', window.location.pathname);
                } catch (e) {}
              }
              setViewMode('admin');
              setForceAuthWall(true);
            }}
          />
        </>
      );
    }

    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        employees={employees}
        onAddEmployee={handleAddEmployee}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenCustomerPreview={() => {
          setForceAuthWall(false);
          setViewMode('customer');
        }}
      />
    );
  }

  const isDark = false;
  const appBgClass = 'bg-[#F8FAFC] text-slate-900';
  const sidebarClass = 'bg-white border-slate-200/80 text-slate-700';
  const headerClass = 'bg-white/95 border-slate-200/80 backdrop-blur-xl shadow-xs';
  const navActiveStyle = 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20';
  const navInactiveStyle = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium';

  const recentOrders = (orders || []).slice(0, 6);
  const activeKitchenOrders = (orders || []).filter(o => {
    const st = String(o?.status || '').toLowerCase().trim();
    return st === 'placed' || st === 'pending' || st === 'preparing' || st === 'cooking' || st === 'ready';
  });
  // Active / uncompleted orders (only orders that are NOT completed and NOT cancelled)
  const uncompletedOrders = (orders || []).filter(o => {
    const st = String(o?.status || '').toLowerCase().trim();
    return st !== 'completed' && st !== 'cancelled';
  });
  // Unseen orders: active uncompleted orders not yet seen by staff
  const safeSeenOrderIds = Array.isArray(seenOrderIds) ? seenOrderIds : [];
  const unseenOrders = uncompletedOrders.filter(o => !safeSeenOrderIds.includes(o.id));
  const activeServiceCalls = (serviceCalls || []).filter(c => c.status !== 'attended' && c.status !== 'completed');

  const turnoverDueTables = [];

  const readyFoodCount = (orders || []).reduce((acc, o) => {
    const isCooking = ['cooking', 'preparing', 'ready', 'placed'].includes(String(o?.status || '').toLowerCase());
    if (!isCooking) return acc;
    const readyItems = (o.items || []).filter(i => (i.kitchen_status === 'ready' || i.kitchen_status === 'prepared' || o.status === 'Ready') && !i.is_served);
    return acc + readyItems.length;
  }, 0);
  const waiterAlertsCount = activeServiceCalls.length + readyFoodCount;
  const totalAlertsCount = activeServiceCalls.length + activeKitchenOrders.length;

  return (
    <div className={`min-h-screen font-sans flex transition-colors duration-300 ${appBgClass}`}>
      
      {/* 1. ELEGANT SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-xl border-r flex flex-col justify-between transition-transform duration-300 ease-in-out
        ${sidebarClass}
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Top Logo & Restaurant Title */}
        <div>
          <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-slate-800/80' : 'border-zinc-100'}`}>
            <div 
              className="flex items-center space-x-3 cursor-pointer" 
              onClick={() => setActiveTab(isChefUser ? 'kitchen' : isWaiterUser ? 'waiter' : 'dashboard')}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-heading font-black shadow-sm shadow-orange-500/20">
                {isChefUser ? <ChefHat className="w-5 h-5 text-white" /> : <Utensils className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h1 className="text-sm font-black font-heading tracking-tight leading-tight">
                  {settings?.restaurantName || 'Atmiya Dosa Hub'}
                </h1>
                <p className="text-[10px] font-bold text-slate-400">
                  {isChefUser ? 'Kitchen Station' : isWaiterUser ? 'Service Terminal' : t('adminPanel')} • Petlad
                </p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items List */}
          <nav className="p-4 space-y-1">
            
            {/* Dashboard: ADMIN / OWNER ONLY */}
            {isAdminUser && (
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                  activeTab === 'dashboard' ? navActiveStyle : navInactiveStyle
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('dashboard')}</span>
              </button>
            )}

            {/* Waiter Terminal: Visible to Waiter and Admin */}
            {!isChefUser && (
              <button
                onClick={() => { setActiveTab('waiter'); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                  activeTab === 'waiter' ? navActiveStyle : navInactiveStyle
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BellRing className="w-4 h-4 text-amber-500" />
                  <span>{t('waiterTerminal') || 'Waiter Terminal'}</span>
                </div>
                {waiterAlertsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500 text-white shadow-xs animate-pulse">
                    {waiterAlertsCount}
                  </span>
                )}
              </button>
            )}

            {/* Kitchen Panel: Prominently featured for Chef & Admin */}
            {!isWaiterUser && (
              <button
                onClick={() => { setActiveTab('kitchen'); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                  activeTab === 'kitchen' ? navActiveStyle : navInactiveStyle
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ChefHat className="w-4 h-4" />
                  <span>{t('kitchenPanel')}</span>
                </div>
                {activeKitchenOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-orange-500 text-white shadow-xs">
                    {activeKitchenOrders.length}
                  </span>
                )}
              </button>
            )}

            {/* Orders: Visible to All */}
            <button
              onClick={() => { 
                setActiveTab('orders'); 
                setMobileSidebarOpen(false); 
                markAllCurrentOrdersAsSeen();
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'orders' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4" />
                <span>{t('orders')}</span>
              </div>
              {unseenOrders.length > 0 ? (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-white shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  <span>{unseenOrders.length} {t('newBadge') || 'NEW'}</span>
                </span>
              ) : uncompletedOrders.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-400/20 text-orange-400 border border-orange-400/30">
                  {uncompletedOrders.length}
                </span>
              ) : null}
            </button>

            {/* Tables Setup & QR Generation: Admin only */}
            {isAdminUser && (
              <button
                onClick={() => { setActiveTab('tables'); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                  activeTab === 'tables' ? navActiveStyle : navInactiveStyle
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>{t('tables')}</span>
              </button>
            )}

            {/* Menu Management: Admin only */}
            {isAdminUser && (
              <button
                onClick={() => { setActiveTab('menu'); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                  activeTab === 'menu' ? navActiveStyle : navInactiveStyle
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>{t('menuManagement')}</span>
              </button>
            )}


            {/* Admin-Only Sections: Employees, CRM, Reports, Offers, QR, Settings */}
            {isAdminUser && (
              <>
                {/* Employees */}
                <button
                  onClick={() => { setActiveTab('employees'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                    activeTab === 'employees' ? navActiveStyle : navInactiveStyle
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{t('employees')}</span>
                </button>

                {/* VIP Guests & CRM */}
                <button
                  onClick={() => { setActiveTab('crm'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                    activeTab === 'crm' ? navActiveStyle : navInactiveStyle
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{t('guestCrmLoyalty') || 'Guest CRM & Loyalty'}</span>
                </button>

                {/* Reports & Analytics */}
                <button
                  onClick={() => { setActiveTab('reports'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                    activeTab === 'reports' ? navActiveStyle : navInactiveStyle
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{t('reportsAnalytics')}</span>
                </button>

                {/* QR Management */}
                <button
                  onClick={() => { setActiveTab('qr'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                    activeTab === 'qr' ? navActiveStyle : navInactiveStyle
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>{t('qrManagement')}</span>
                </button>

                {/* Settings */}
                <button
                  onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                    activeTab === 'settings' ? navActiveStyle : navInactiveStyle
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>{t('settings')}</span>
                </button>
              </>
            )}

          </nav>
        </div>

        {/* Sidebar Footer with Live POS Status */}
        <div className="p-4 space-y-2 border-t border-slate-200/60">
          <div className="rounded-2xl p-3 border bg-slate-50 border-slate-200/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold font-heading text-slate-800">
                  {t('livePosCloud') || 'Live POS Cloud'}
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                {t('online') || 'Online'}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span>Atmiya Dosa Hub</span>
              <span className="font-mono font-semibold">v2.5</span>
            </div>
          </div>

          {/* Language Selector Button in Sidebar */}
          <button
            type="button"
            onClick={() => setShowGlobalLangModal(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 text-xs font-bold transition border border-orange-200/90 cursor-pointer shadow-2xs active:scale-98"
            title="Change Language / ભાષા બદલો / भाषा चुनें"
          >
            <div className="flex items-center space-x-2">
              <Globe className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
              <span>{t('language') || 'Language / ભાષા'}</span>
            </div>
            <span className="font-mono text-[11px] font-black uppercase px-2 py-0.5 rounded-lg bg-white text-orange-600 border border-orange-200 shadow-2xs">
              {currentLang === 'gu' ? 'ગુજરાતી' : currentLang === 'hi' ? 'हिन्दी' : 'EN'}
            </span>
          </button>

          {/* Sign Out Button in Sidebar */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200/80 cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('signOutSwitchRole') || 'Sign Out / Switch Role'}</span>
          </button>
        </div>

      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        ></div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        
        {/* Real-time Floating Toast Alert for Table Calls, Security Alerts & Incoming Orders */}
        {renderActiveToast()}

        {/* TOP HEADER BAR */}
        <header className={`sticky top-0 z-30 border-b px-3 sm:px-6 py-2.5 transition-colors ${headerClass}`}>
          <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-full">
            
            {/* Mobile Hamburger & Clean Brand Greeting */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="text-sm font-black font-heading tracking-tight flex items-center space-x-1.5 truncate text-slate-900">
                  <span className="truncate">{settings?.restaurantName || 'Atmiya Dosa Hub'}</span>
                  <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                    isChefUser 
                      ? 'bg-amber-50 text-amber-800 border-amber-300' 
                      : isWaiterUser 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  }`}>
                    {isChefUser ? '🍳 Kitchen Station (KDS)' : isWaiterUser ? '🤵 Waiter Terminal' : 'Live Admin POS'}
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                  {authUser?.name || 'Staff'} • <span className="capitalize">{isChefUser ? 'Head Kitchen Station' : isWaiterUser ? 'Floor Staff' : (authUser?.role || 'Admin')}</span>
                </div>
              </div>
            </div>

            {/* Global Search Bar (hidden on mobile and tablet screens to prevent navbar squishing) */}
            <div className="hidden lg:flex items-center flex-1 max-w-xs lg:max-w-sm mx-2">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={isChefUser ? "Search kitchen orders or dishes..." : "Search orders, tables, dishes..."}
                  className="w-full pl-9 pr-10 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition bg-slate-100/90 border border-slate-200/80 text-slate-900 placeholder-slate-400"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border pointer-events-none bg-white border-slate-200 text-slate-400">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right Controls: Guaranteed never to overflow on mobile */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">

              {/* Live Date & Time Badge (Desktop Only) */}
              <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono whitespace-nowrap shrink-0 bg-slate-100/90 border-slate-200 text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="whitespace-nowrap">{currentTimeStr}</span>
              </div>

              {/* Language Selector Button (Visible on ALL devices - Mobile & Desktop) */}
              <button
                type="button"
                onClick={() => setShowGlobalLangModal(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer bg-slate-100/90 hover:bg-orange-50 hover:border-orange-300 border-slate-200 text-slate-800 shadow-2xs active:scale-95 shrink-0"
                title="Change Language / ભાષા બદલો / भाषा चुनें"
              >
                <Globe className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
                <span className="font-heading font-black text-xs uppercase tracking-wider">
                  {currentLang === 'gu' ? 'ગુજરાતી' : currentLang === 'hi' ? 'हिन्दी' : 'English'}
                </span>
              </button>

              {/* Quick POS Rapid Counter Button (Desktop/Tablet for Admin & Waiter) */}
              {!isChefUser && (
                <button
                  onClick={() => setShowQuickPos(true)}
                  className="hidden sm:flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold shadow-sm shadow-orange-600/20 transition cursor-pointer shrink-0"
                  title="Rapid Counter POS"
                >
                  <Zap className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                  <span>Quick POS</span>
                </button>
              )}

              {/* Single Unified Smart Notification Bell (ALWAYS VISIBLE & PROMINENT) */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className={`p-2 rounded-xl relative transition cursor-pointer shrink-0 ${
                    totalAlertsCount > 0 
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 ring-2 ring-rose-500/20' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                  }`}
                  title={`Notifications & Table Calls (${totalAlertsCount} active)`}
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {totalAlertsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-md border-2 border-white animate-pulse">
                      {totalAlertsCount > 99 ? '99+' : totalAlertsCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Modal: Full-screen friendly on mobile, dropdown on desktop */}
                {notificationOpen && (
                  <>
                    <div 
                      onClick={() => setNotificationOpen(false)}
                      className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs sm:hidden"
                    />
                    <div className="fixed sm:absolute top-14 sm:top-full left-2 right-2 sm:left-auto sm:right-0 sm:w-96 rounded-2xl p-4 shadow-2xl border border-slate-200 bg-white text-slate-900 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] sm:max-h-[520px] overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <Bell className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-black font-heading">Notifications & Live Alerts</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-mono">
                          {totalAlertsCount} Active
                        </span>
                      </div>

                      <div className="space-y-3 overflow-y-auto pr-1 flex-1">

                        {/* 1. Table Service Calls */}
                        {activeServiceCalls.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between px-1">
                              <span>Table Service Calls</span>
                              <span className="text-[9px] font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                {activeServiceCalls.length}
                              </span>
                            </div>
                            {activeServiceCalls.map(call => (
                              <div key={call.id} className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center justify-between gap-2 shadow-xs">
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-heading font-black text-xs text-amber-900">
                                      Table {call.tableNumber}
                                    </span>
                                    <span className="text-[10px] text-amber-700 font-mono">• {call.time}</span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-amber-950 truncate">{call.label}</p>
                                </div>
                                <button
                                  onClick={() => handleDismissServiceCall(call.id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-xs transition cursor-pointer shrink-0"
                                >
                                  Attend
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. Active Kitchen Orders */}
                        {activeKitchenOrders.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between px-1">
                              <span>Active Kitchen Orders</span>
                              <span className="text-[9px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                {activeKitchenOrders.length}
                              </span>
                            </div>
                            {activeKitchenOrders.slice(0, 6).map(ord => (
                              <div 
                                key={ord.id} 
                                onClick={() => { setActiveTab('kitchen'); setNotificationOpen(false); }}
                                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-2 cursor-pointer transition shadow-xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-bold text-xs text-slate-900 truncate">
                                      #{ord.order_number || ord.id?.slice(-4)}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      Table {ord.table_number || ord.table}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0">{ord.time || 'Now'}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                    ₹{ord.total_amount || ord.total || 0} • {ord.status} • {ord.items_summary || (ord.items && ord.items.map(i=>`${i.qty}x ${i.name}`).join(', ')) || 'Dishes'}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-orange-600 shrink-0">
                                  Kitchen →
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {totalAlertsCount === 0 && (
                          <div className="py-6 text-center space-y-1">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center text-sm font-bold">
                              ✓
                            </div>
                            <p className="text-xs font-semibold text-slate-700">All caught up</p>
                            <p className="text-[11px] text-slate-400">No pending table service calls or kitchen orders.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center space-x-1 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center font-heading shadow-xs">
                  {authUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 sm:p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </header>

        {/* 3. DYNAMIC BODY ROUTER */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-full overflow-x-hidden">
          
          {activeTab === 'dashboard' && (
            isAdminUser ? (
              <ExecutiveDashboard
                restaurantSettings={settings}
                tables={tables}
                orders={orders}
                liveOrders={orders}
                menuItems={menuItems}
                activity={activity}
                categories={categories}
                currentLang={currentLang}
                theme={theme}
                onThemeChange={setTheme}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenAddOrder={() => setActiveTab('orders')}
                onOpenAddItem={() => setActiveTab('menu')}
                onOpenGenerateQR={() => setActiveTab('qr')}
                onVacateTable={handleVacateTable}
              />
            ) : isChefUser ? (
              <KitchenPanelView
                orders={orders}
                menuItems={menuItems}
                onUpdateStatus={handleUpdateOrderStatus}
                onToggleStock={handleToggleStock}
                onToggleItemReady={handleToggleItemReady}
                onToggleItemServed={handleToggleItemServed}
                onMarkAllTableItemsServed={handleMarkAllTableItemsServed}
                onClearCompletedOrders={handleClearCompletedOrders}
                authUser={authUser}
                onLogout={handleLogout}
                onExitKitchenMode={handleLogout}
                currentLang={currentLang}
                theme={theme}
                restaurantSettings={settings}
              />
            ) : (
              <WaiterView
                tables={tables}
                orders={orders}
                menuItems={menuItems}
                categories={categories}
                serviceCalls={serviceCalls}
                onDismissServiceCall={handleDismissServiceCall}
                onDismissTableServiceCalls={handleDismissTableServiceCalls}
                onVacateTable={handleVacateTable}
                onShiftTable={handleShiftTable}
                onSettleTableBill={handleSettleTableBill}
                onPlaceOrder={handlePlaceCustomerOrder}
                onToggleItemReady={handleToggleItemReady}
                onToggleItemServed={handleToggleItemServed}
                onMarkAllTableItemsServed={handleMarkAllTableItemsServed}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                authUser={authUser}
                onLogout={handleLogout}
                onExitWaiterMode={handleLogout}
                currentLang={currentLang}
                theme={theme}
                restaurantSettings={settings}
              />
            )
          )}

          {activeTab === 'waiter' && (
            <WaiterView
              tables={tables}
              orders={orders}
              menuItems={menuItems}
              categories={categories}
              serviceCalls={serviceCalls}
              onDismissServiceCall={handleDismissServiceCall}
              onDismissTableServiceCalls={handleDismissTableServiceCalls}
              onVacateTable={handleVacateTable}
              onShiftTable={handleShiftTable}
              onSettleTableBill={handleSettleTableBill}
              onPlaceOrder={handlePlaceCustomerOrder}
              onToggleItemReady={handleToggleItemReady}
              onToggleItemServed={handleToggleItemServed}
              onMarkAllTableItemsServed={handleMarkAllTableItemsServed}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              authUser={authUser}
              onLogout={handleLogout}
              onExitWaiterMode={() => {
                if (authUser?.role === 'waiter') {
                  handleLogout();
                } else {
                  setActiveTab('dashboard');
                }
              }}
              currentLang={currentLang}
              theme={theme}
              restaurantSettings={settings}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              seenOrderIds={seenOrderIds}
              onMarkOrderAsSeen={markOrderAsSeen}
              onMarkAllOrdersAsSeen={markAllCurrentOrdersAsSeen}
              onUpdateStatus={handleUpdateOrderStatus}
              onMarkCashPaymentDone={handleMarkCashPaymentDone}
              onCancelOrderWithReason={handleCancelOrderWithReason}
              onAddNewOrder={() => setViewMode('customer')}
              currentStaff={{ name: authUser?.name || 'Admin Owner', role: authUser?.role || 'Admin' }}
              currentLang={currentLang}
              theme={theme}
              restaurantSettings={settings}
            />
          )}

          {activeTab === 'kitchen' && (
            <KitchenPanelView
              orders={orders}
              menuItems={menuItems}
              onUpdateStatus={handleUpdateOrderStatus}
              onToggleStock={handleToggleStock}
              onToggleItemReady={handleToggleItemReady}
              onToggleItemServed={handleToggleItemServed}
              onMarkAllTableItemsServed={handleMarkAllTableItemsServed}
              onClearCompletedOrders={handleClearCompletedOrders}
              authUser={authUser}
              onLogout={handleLogout}
              onExitKitchenMode={() => {
                if (authUser?.role === 'chef') {
                  handleLogout();
                } else {
                  setActiveTab('dashboard');
                }
              }}
              currentLang={currentLang}
              theme={theme}
              restaurantSettings={settings}
            />
          )}

          {activeTab === 'tables' && !isChefUser && (
            <TablesView
              tables={tables}
              orders={orders}
              restaurantSettings={settings}
              onAddTable={handleAddTable}
              onDeleteTable={handleDeleteTable}
              onUpdateTable={handleUpdateTable}
              onReconcileTables={() => handleReconcileFloorTables(orders)}
              onSettleTableBill={handleSettleTableBill}
              onShiftTable={handleShiftTable}
              onSelectQRTable={(t) => {
                setActiveTab('qr');
              }}
              onSimulateCustomer={(tbl) => {
                setCurrentTable(tbl);
                setViewMode('customer');
              }}
              onVacateTable={handleVacateTable}
              onSnoozeTurnover={handleSnoozeTurnover}
              onSimulate30m={handleSimulate30mElapsed}
              currentLang={currentLang}
              theme={theme}
            />
          )}

          {activeTab === 'menu' && isAdminUser && (
            <MenuManagementView
              categories={categories}
              menuItems={menuItems}
              orders={orders}
              onToggleStock={handleToggleStock}
              onAddMenuItem={handleAddMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onClearAllMenuAndCategories={handleClearAllMenuAndCategories}
              onRestoreSampleMenu={handleRestoreSampleMenu}
              onApplyDiscount={handleApplyDiscount}
              onRemoveDiscount={handleRemoveDiscount}
              currentLang={currentLang}
            />
          )}


          {activeTab === 'employees' && isAdminUser && (
            <EmployeesView
              employees={employees}
              activity={activity}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'reports' && isAdminUser && (
            <ReportsAnalytics
              orders={orders}
              restaurantSettings={settings}
            />
          )}

          {activeTab === 'qr' && isAdminUser && (
            <QRManagementView
              tables={tables}
              orders={orders}
              restaurantSettings={settings}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'crm' && isAdminUser && (
            <CustomerCRM
              customers={customers}
              onAddPoints={handleAddCustomerPoints}
              onSaveCustomer={handleSaveCustomerFromAdmin}
              restaurantSettings={settings}
            />
          )}

          {activeTab === 'settings' && isAdminUser && (
            <SettingsView
              restaurantSettings={settings}
              onSaveSettings={handleSaveSettings}
              currentLang={currentLang}
              onLanguageChange={setCurrentLang}
            />
          )}

        </main>

        {/* 4. FOOTER */}
        <footer className="p-4 sm:px-8 border-t border-slate-200/80 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 font-medium">
            <span className="font-bold text-slate-800">{settings?.restaurantName || 'Atmiya Dosa Hub'}</span>
            <span>•</span>
            <span>Enterprise Restaurant Management & POS Suite</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-400">
            <span>Built with ❤️ for Restaurants</span>
            <span>|</span>
            <span className="text-emerald-600 font-bold">Powered by Supabase Real-Time</span>
          </div>
        </footer>

      </div>

      {/* 5. RAPID COUNTER POS MODAL OVERLAY */}
      {showQuickPos && (
        <QuickPosModal
          tables={tables}
          menuItems={menuItems}
          categories={categories}
          coupons={coupons}
          onPlaceOrder={handlePlaceCustomerOrder}
          onClose={() => setShowQuickPos(false)}
          currentStaff={{ name: authUser?.name || 'Admin Owner', role: authUser?.role || 'Admin' }}
        />
      )}

      {/* 6. UNIVERSAL GLOBAL LANGUAGE POPUP MODAL */}
      {showGlobalLangModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-slate-900 animate-scaleUp relative">
            <button
              type="button"
              onClick={() => setShowGlobalLangModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition z-10"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1.5 pb-2 border-b border-slate-100">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md mx-auto mb-1">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                {currentLang === 'gu' 
                  ? 'તમારી ભાષા પસંદ કરો' 
                  : (currentLang === 'hi' ? 'अपनी भाषा चुनें' : 'Select System Language')}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Choose your preferred language for POS, Admin, KDS & Menu
                <br />
                <span className="text-[11px] text-orange-600 font-semibold">
                  ડિજિટલ પોસ અને સિસ્ટમ માટે ભાષા પસંદ કરો • भाषा चुनें
                </span>
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5 pt-1">
              {[
                {
                  code: 'en',
                  title: 'English',
                  native: 'English (US)',
                  desc: 'Standard restaurant operations, executive analytics, and POS in English',
                  tag: 'EN'
                },
                {
                  code: 'gu',
                  title: 'ગુજરાતી',
                  native: 'Gujarati',
                  desc: 'સંપૂર્ણ વહીવટી ડેશબોર્ડ, કેશિયર પોસ અને મેનૂ ગુજરાતી ભાષામાં વાપરો',
                  tag: 'GU'
                },
                {
                  code: 'hi',
                  title: 'हिन्दी',
                  native: 'Hindi',
                  desc: 'पूरा रेस्टोरेंट डैशबोर्ड, ऑर्डर बिलिंग और मेनू हिन्दी में चलाएं',
                  tag: 'HI'
                }
              ].map((langOpt) => {
                const isSelected = currentLang === langOpt.code;
                return (
                  <button
                    key={langOpt.code}
                    type="button"
                    onClick={() => {
                      setCurrentLang(langOpt.code);
                      setShowGlobalLangModal(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/80 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-slate-50/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-orange-500 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-700'
                      }`}>
                        {langOpt.tag}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-heading font-black text-sm text-slate-900 block">
                            {langOpt.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            • {langOpt.native}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate leading-tight">
                          {langOpt.desc}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-orange-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm & Close */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGlobalLangModal(false)}
                className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{currentLang === 'gu' ? 'આગળ વધો (ચાલુ રાખો)' : currentLang === 'hi' ? 'आगे बढ़ें (जारी रखें)' : 'Apply & Continue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
