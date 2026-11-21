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
  Check,
  Volume2,
  VolumeX
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
  cancelOrderInSupabase,
  settleTableSessionInSupabase, 
  settleTableSessionApi,
  verifyStaffTokenApi,
  fetchLiveOrdersFromSupabase,
  normalizeTableNumber,
  isTakeawayTable,
  updateOrderItemStatusInSupabase,
  updateAllOrderItemsServedInSupabase,
  fetchLiveMenuFromSupabase,
  fetchLiveTablesFromSupabase,
  saveTableToSupabaseApi,
  deleteTableFromSupabaseApi,
  updateTableInSupabaseApi,
  purgeAllMenuFromSupabase,
  saveCategoryToSupabaseCloud,
  deleteCategoryFromSupabaseCloud,
  assignDishesToCategoryCloud,
  saveMenuItemToSupabaseCloud,
  deleteMenuItemFromSupabaseCloud,
  permanentlyDeleteOrdersFromSupabase,
  purgeAllOrdersFromSupabaseCloud,
  purgeTodayOrdersFromSupabaseCloud,
  ensureValidUuid,
  API_BASE_URL
} from './lib/supabase';
import { getDishCuisine } from './lib/cuisines';
import { getTranslation, normalizeDishName, deduplicateOrderItems } from './lib/translations';
import { playSound } from './lib/sound';
import { sanitizeOrderPayload } from './lib/sanitizer';
import { isFancyDosaItem } from './lib/authenticMenuData';
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
  speakTableCleanAlert,
  isVoiceNotificationEnabled,
  setVoiceNotificationEnabled,
  speakSystemTestAlert
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

import CustomerMenu from './components/CustomerMenu';

const DEMO_ORDER_IDS = new Set([
  '#ORD1048', '#ORD1047', '#ORD1046', '#ORD1045', '#ORD1044', '#ORD1043', 
  '#ORD1042', '#ORD1041', '#ORD1049', '#ORD1050', 'ORD-TEST-001', 'ORD-TEST-999', 
  'ORD-T04-1001', '#ORD3908', '#ORD3451', '#ORD2842', 'ORD3908', 'ORD3451', 'ORD2842'
]);

export const matchesOrderId = (o, targetId) => {
  if (!o || !targetId) return false;
  const cleanTarget = String(targetId).replace(/^#+/, '').trim();
  if (!cleanTarget || cleanTarget === 'undefined' || cleanTarget === 'null') return false;

  const oId = String(o.id || '').replace(/^#+/, '').trim();
  const oNum = String(o.order_number || '').replace(/^#+/, '').trim();
  const oDbId = String(o.supabase_order_id || '').trim();

  if (o.id === targetId || o.order_number === targetId || o.supabase_order_id === targetId) return true;
  if (oId && oId !== 'undefined' && oId !== 'null' && oId === cleanTarget) return true;
  if (oNum && oNum !== 'undefined' && oNum !== 'null' && oNum === cleanTarget) return true;
  if (oDbId && oDbId !== 'undefined' && oDbId !== 'null' && oDbId === String(targetId).trim()) return true;

  return false;
};

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
  const payStatusLower = String(dbOrd.payment_status || '').toLowerCase().trim();
  const rawStatusUpper = String(dbOrd.status || '').toUpperCase().trim();
  const isOrderFullyFinished = rawStatusUpper === 'COMPLETED' || 
                               rawStatusUpper === 'SETTLED' || 
                               (rawStatusUpper === 'SERVED' && (payStatusLower === 'paid' || payStatusLower === 'void')) ||
                               payStatusLower === 'paid';

  let itms = (dbOrd.order_items || []).filter(i => {
    const rawItemStatus = String(i.status || '').toLowerCase().trim();
    return rawItemStatus !== 'cancelled';
  }).map((i) => {
    const rawItemStatus = String(i.status || '').toLowerCase().trim();
    const cleanNameKey = String(i.item_name || i.name || '').toLowerCase().trim();
    const savedState = (i.id && itemStates[i.id]) || 
                       (i.item_id && itemStates[i.item_id]) || 
                       (cleanNameKey && itemStates[cleanNameKey]) ||
                       (i.item_name && itemStates[i.item_name]) || 
                       (i.name && itemStates[i.name]);
    const isSavedReady = savedState === 'ready';
    const isSavedServed = savedState === 'served';
    const isSavedPrep = savedState === 'preparing' || savedState === 'cooking' || savedState === 'placed';

    let isItemServed = false;
    if (isOrderFullyFinished) {
      isItemServed = true;
    } else if (rawItemStatus === 'placed' || rawItemStatus === 'preparing' || rawItemStatus === 'cooking') {
      isItemServed = false;
    } else if (isSavedServed) {
      isItemServed = true;
    } else if (isSavedReady || isSavedPrep) {
      isItemServed = false;
    } else if (rawItemStatus === 'served') {
      isItemServed = true;
    }

    let isItemReady = false;
    if (!isItemServed) {
      if (isSavedReady) {
        isItemReady = true;
      } else if (isSavedPrep || rawItemStatus === 'placed' || rawItemStatus === 'preparing' || rawItemStatus === 'cooking') {
        isItemReady = false;
      } else if (rawItemStatus === 'ready') {
        isItemReady = true;
      }
    }

    const kitchenStatus = isItemServed 
      ? 'served' 
      : (isItemReady ? 'ready' : (savedState === 'preparing' || rawItemStatus === 'preparing' || rawItemStatus === 'cooking' ? 'preparing' : 'placed'));

    return {
      id: i.id,
      name: i.item_name,
      price: parseFloat(i.unit_price) || 0,
      qty: i.quantity || 1,
      kitchen_status: kitchenStatus,
      is_served: isItemServed,
      is_free_offer: Boolean(i.is_free_offer || i.menu_item_id === 'free_mysore_offer' || String(i.item_name || '').toLowerCase().includes('offer - free')),
      offer_tag: i.offer_tag || (String(i.item_name || '').toLowerCase().includes('offer - free') ? 'Buy 2 Fancy Dosa Get 1 Free' : null),
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
      const isWaterServed = isOrderFullyFinished || savedWaterState === 'served' || (!hasSpecificStates && dbOrd.status === 'SERVED') || dbOrd.status === 'COMPLETED' || dbOrd.status === 'SETTLED';
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

  // Guarantee clean deduplication of items coming from database
  itms = deduplicateOrderItems(itms);

  let mappedStatus = statusDisplayMap[dbOrd.status] || dbOrd.status || 'Preparing';
  
  const allItemsServed = itms.length > 0 && itms.every(it => it.is_served);
  const hasUnserved = itms.some(it => !it.is_served);
  const anyItemServed = itms.some(it => it.is_served);
  const allItemsReadyOrServed = itms.length > 0 && itms.every(it => it.is_served || it.kitchen_status === 'ready');

  if (rawStatusUpper === 'CANCELLED' || mappedStatus === 'Cancelled') {
    mappedStatus = 'Cancelled';
  } else if (isOrderFullyFinished || rawStatusUpper === 'COMPLETED' || rawStatusUpper === 'SETTLED' || mappedStatus === 'Completed' || (allItemsServed && (payStatusLower === 'paid' || payStatusLower === 'settled')) || payStatusLower === 'paid') {
    mappedStatus = 'Completed';
  } else if (hasUnserved) {
    // CRITICAL: If there are unserved items (e.g. from an add-on after previous round handover),
    // status CANNOT be 'Served' or 'Completed'! If raw status is PLACED, keep it Placed so KDS chimes and flags as new order!
    mappedStatus = allItemsReadyOrServed 
      ? 'Ready' 
      : ((rawStatusUpper === 'PLACED') ? 'Placed' : ((rawStatusUpper === 'PREPARING' || rawStatusUpper === 'COOKING') ? 'Preparing' : 'Placed'));
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

  const rawNum = dbOrd.order_number || (dbOrd.id ? String(dbOrd.id).replace(/-/g, '').slice(-4).toUpperCase() : `ORD${Date.now().toString().slice(-4)}`);
  const cleanOrderNum = String(rawNum).replace(/^#+/, '').trim();
  const formattedOrderId = `#${cleanOrderNum}`;

  const isTakeawayDbOrder = !dbOrd.table_number || isTakeawayTable(dbOrd.table_number);
  const resolvedChannel = isTakeawayDbOrder ? 'Takeaway' : 'Dine-In';
  const resolvedOrderSource = isTakeawayDbOrder ? 'Takeaway' : (dbOrd.table_number ? 'Table QR' : 'Takeaway');

  return {
    id: formattedOrderId,
    order_number: cleanOrderNum,
    supabase_order_id: dbOrd.id,
    session_id: dbOrd.session_id,
    table_number: isTakeawayDbOrder ? 'Takeaway' : dbOrd.table_number,
    customer_name: dbOrd.customer_name || (isTakeawayDbOrder ? 'Walk-in Customer' : 'Walk-in Guest'),
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
    channel: resolvedChannel,
    order_source: resolvedOrderSource,
    placed_at: dbOrd.placed_at,
    created_at: dbOrd.created_at || dbOrd.placed_at,
    served_at: dbOrd.served_at,
    settled_at: orderSettledAt,
    completed_at: orderSettledAt,
    time: dbOrd.placed_at ? new Date(dbOrd.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
    payment_mode: isOnline ? 'UPI' : 'Cash',
    payment_method: dbOrd.payment_method || (isOnline ? 'UPI_COUNTER' : 'CASH'),
    payment_status: isCancelledOrder ? 'Void' : (isCompletedOrder || isOrderFullyFinished || payStatusLower === 'paid' || dbOrd.payment_status === 'PAID' ? 'Paid' : 'Pending Cash'),
    payment_verified_online: isOnline,
    special_note: cleanSpecialNote,
    kds_cleared: isCancelledOrder ? true : false
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
                if (oTbl !== existingBound) return false;
                const st = String(o?.status || '').toLowerCase().trim();
                const paySt = String(o?.payment_status || '').toLowerCase().trim();
                if (st === 'cancelled' || st === 'completed' || st === 'settled') return false;
                if (paySt === 'paid' || paySt === 'settled' || paySt === 'void') return false;
                const orderTime = new Date(o?.placed_at || o?.created_at || o?.timestamp || 0).getTime();
                if (orderTime > 0 && (Date.now() - orderTime) > 30 * 60 * 1000) return false;
                if (st === 'served') return false;
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

  // Admin & Staff Voice Notifications Toggle State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => isVoiceNotificationEnabled());

  const handleToggleVoiceNotifications = () => {
    const nextVal = !isVoiceEnabled;
    setIsVoiceEnabled(nextVal);
    setVoiceNotificationEnabled(nextVal);
    if (nextVal) {
      playSound('success');
      speakSystemTestAlert();
      setActiveToast({
        title: '🔊 Voice Notifications Enabled',
        message: 'Kitchen & staff voice speech alerts are now active.',
        type: 'success'
      });
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      playSound('click');
      setActiveToast({
        title: '🔇 Voice Notifications Muted',
        message: 'Voice speech announcements are disabled. Visual & chime alerts remain active.',
        type: 'info'
      });
    }
  };

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
        const hasActiveOrder = orders.some(o => {
          if (normalizeTableNumber(o.table_number) !== bound) return false;
          const st = String(o.status || '').toLowerCase();
          const paySt = String(o.payment_status || '').toLowerCase();
          if (st === 'completed' || st === 'cancelled' || st === 'settled') return false;
          if (paySt === 'paid' || paySt === 'settled' || paySt === 'void') return false;
          const orderTime = new Date(o.placed_at || o.created_at || o.timestamp || 0).getTime();
          if (orderTime > 0 && (Date.now() - orderTime) > 30 * 60 * 1000) return false;
          if (st === 'served') return false;
          return true;
        });

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
            items: (o.items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'served' }))
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

      let finalMergedOrders = mappedDbOrders;
      setOrders(prev => {
        const merged = mappedDbOrders.map(mo => {
          const localMatch = (prev || []).find(po => 
            matchesOrderId(po, mo.id) || 
            matchesOrderId(po, mo.order_number) || 
            matchesOrderId(po, mo.supabase_order_id)
          );
          if (!localMatch) return mo;

          // If this order is cancelled either locally or in DB, preserve cancellation immediately!
          if (localMatch.status === 'Cancelled' || mo.status === 'Cancelled' || String(localMatch.payment_status).toLowerCase() === 'void' || String(mo.payment_status).toLowerCase() === 'void') {
            return {
              ...mo,
              ...localMatch,
              status: 'Cancelled',
              payment_status: 'Void',
              kds_cleared: true,
              items: (localMatch.items || mo.items || []).map(it => ({ ...it, kitchen_status: 'cancelled', is_served: false, status: 'CANCELLED' })),
              order_items: (localMatch.order_items || mo.order_items || []).map(it => ({ ...it, kitchen_status: 'cancelled', is_served: false, status: 'CANCELLED' })),
              last_modified_at: localMatch.last_modified_at || mo.last_modified_at || new Date().toISOString()
            };
          }

          // If items were recently modified on this local client (<25s), protect in-flight deletions and additions
          const isRecentlyModified = localMatch.last_modified_at && (syncNow - new Date(localMatch.last_modified_at).getTime() < 25000);
          const hasDbItems = Array.isArray(mo.items) && mo.items.length > 0;
          const hasLocalItems = Array.isArray(localMatch.items) && localMatch.items.length > 0;

          let mergedItems = [];
          if (isRecentlyModified && hasLocalItems) {
            // Local items are authoritative because staff just deleted or modified items on this terminal!
            // Map over local items; only update kitchen status from mo.items if matched, but DO NOT resurrect deleted items!
            const matchedDbIndices = new Set();
            mergedItems = localMatch.items.map(localIt => {
              const cleanLocalName = normalizeDishName(localIt.name || localIt.item_name);
              let matchedDbIdx = -1;
              const dbItem = (mo.items || []).find((di, diIdx) => {
                if (matchedDbIndices.has(diIdx)) return false;
                const matchId = Boolean(di.id && localIt.id && di.id === localIt.id);
                const matchName = Boolean(cleanLocalName && normalizeDishName(di.name || di.item_name) === cleanLocalName);
                if (matchId || matchName) {
                  matchedDbIdx = diIdx;
                  return true;
                }
                return false;
              });
              if (matchedDbIdx >= 0) {
                matchedDbIndices.add(matchedDbIdx);
              }
              if (!dbItem) return localIt;

              const isLocalPreparing = Boolean(localIt.kitchen_status === 'preparing' || localIt.status === 'PREPARING');
              const isDbPreparing = Boolean(dbItem.kitchen_status === 'preparing' || String(dbItem.status || '').toLowerCase() === 'preparing');
              const isExplicitlyPreparing = isLocalPreparing || isDbPreparing;

              const isFreshAddonUnserved = Boolean(localIt.is_addon && !localIt.is_served);
              const isLocalServed = Boolean(localIt.is_served);
              const isDbServed = Boolean(dbItem.is_served || dbItem.kitchen_status === 'served');
              const finalServed = !isFreshAddonUnserved && !isExplicitlyPreparing && (isLocalServed || isDbServed);

              const isDbReady = Boolean(dbItem.kitchen_status === 'ready' || String(dbItem.status || '').toLowerCase() === 'ready');
              const isLocalReady = Boolean(localIt.kitchen_status === 'ready' || localIt.kitchen_status === 'prepared');
              const finalReady = !finalServed && !isExplicitlyPreparing && (isDbReady || isLocalReady);

              return {
                ...localIt,
                round: localIt.round || dbItem.round || 1,
                kitchen_status: finalServed ? 'served' : (finalReady ? 'ready' : (isExplicitlyPreparing ? 'preparing' : (localIt.kitchen_status || dbItem.kitchen_status || 'placed'))),
                is_served: finalServed,
                ready_at: isExplicitlyPreparing ? null : (localIt.ready_at || dbItem.ready_at),
                served_at: isExplicitlyPreparing ? null : (localIt.served_at || dbItem.served_at)
              };
            });

            // Append any fresh items from DB that were placed on another device and not in local items
            (mo.items || []).forEach((dbIt, dbIdx) => {
              if (!matchedDbIndices.has(dbIdx)) {
                mergedItems.push(dbIt);
              }
            });
          } else {
            // Standard sync from Supabase items with local state merging
            const dbItems = hasDbItems ? mo.items : (hasLocalItems ? localMatch.items : (mo.items || []));
            const matchedLocalIndices = new Set();
            mergedItems = dbItems.map((dbItem) => {
              const cleanDbName = normalizeDishName(dbItem.name || dbItem.item_name);
              let localItem = null;
              let matchedIdx = -1;

              (localMatch.items || []).forEach((it, lIdx) => {
                if (matchedIdx >= 0 || matchedLocalIndices.has(lIdx)) return;
                if (it.id && dbItem.id && it.id === dbItem.id) {
                  localItem = it;
                  matchedIdx = lIdx;
                } else if (cleanDbName) {
                  const cleanLocalName = normalizeDishName(it.name || it.item_name);
                  if (cleanLocalName && cleanLocalName === cleanDbName) {
                    localItem = it;
                    matchedIdx = lIdx;
                  }
                }
              });

              if (matchedIdx >= 0) {
                matchedLocalIndices.add(matchedIdx);
              }

              const isLocalPreparing = Boolean(localItem && (localItem.kitchen_status === 'preparing' || localItem.status === 'PREPARING'));
              const isDbPreparing = Boolean(dbItem.kitchen_status === 'preparing' || String(dbItem.status || '').toLowerCase() === 'preparing');
              const isExplicitlyPreparing = isLocalPreparing || isDbPreparing;

              const isLocalServed = Boolean(localItem?.is_served);
              const isDbServed = Boolean(dbItem.is_served || dbItem.kitchen_status === 'served');
              const finalServed = !isExplicitlyPreparing && (isLocalServed || isDbServed);

              const isDbReady = Boolean(dbItem.kitchen_status === 'ready' || String(dbItem.status || '').toLowerCase() === 'ready');
              const isLocalReady = Boolean(localItem && (localItem.kitchen_status === 'ready' || localItem.kitchen_status === 'prepared'));
              const finalReady = !finalServed && !isExplicitlyPreparing && (isDbReady || isLocalReady);

              return {
                ...dbItem,
                round: localItem?.round || dbItem.round || 1,
                is_addon: Boolean(localItem?.is_addon || dbItem.is_addon),
                kitchen_status: finalServed ? 'served' : (finalReady ? 'ready' : (isExplicitlyPreparing ? 'preparing' : (localItem?.kitchen_status || dbItem.kitchen_status || 'placed'))),
                is_served: finalServed,
                ready_at: isExplicitlyPreparing ? null : (localItem?.ready_at || dbItem.ready_at),
                served_at: isExplicitlyPreparing ? null : (localItem?.served_at || dbItem.served_at)
              };
            });

            // Retain any local items (e.g. fresh add-ons) not yet populated in dbItems
            (localMatch.items || []).forEach((locIt, locIdx) => {
              if (!matchedLocalIndices.has(locIdx)) {
                mergedItems.push(locIt);
              }
            });
          }

          // CRITICAL: Guarantee zero item duplication across tickets
          mergedItems = deduplicateOrderItems(mergedItems);

          const isLocalCompleted = localMatch.status === 'Completed' || localMatch.payment_status === 'Paid';
          const isDbCompleted = mo.status === 'Completed' || mo.status === 'Settled' || mo.payment_status?.toLowerCase() === 'paid';
          const isOrderFinished = isLocalCompleted || isDbCompleted;

          if (isOrderFinished) {
            mergedItems = mergedItems.map(it => ({ ...it, is_served: true, kitchen_status: 'served' }));
          }

          const hasUnserved = isOrderFinished ? false : mergedItems.some(i => !i.is_served);
          const allMergedReady = mergedItems.length > 0 && mergedItems.every(i => i.kitchen_status === 'ready' || i.is_served);
          let preservedStatus = mo.status;
          if (localMatch.status === 'Cancelled' || mo.status === 'Cancelled' || String(localMatch.payment_status).toLowerCase() === 'void' || String(mo.payment_status).toLowerCase() === 'void') {
            preservedStatus = 'Cancelled';
          } else if (isOrderFinished) {
            preservedStatus = 'Completed';
          } else if (hasUnserved) {
            // CRITICAL: If there are unserved items (e.g. from an add-on or fresh round), status CANNOT be 'Served' or 'Completed'!
            preservedStatus = (String(mo.status || '').toLowerCase() === 'placed') ? 'Placed' : (allMergedReady ? 'Ready' : 'Preparing');
          } else if (localMatch.status === 'Completed' || mo.status === 'Completed' || mo.status === 'Settled' || ((mo.status === 'Served' || localMatch.status === 'Served') && (mo.payment_status?.toLowerCase() === 'paid' || localMatch.payment_status?.toLowerCase() === 'paid')) || localMatch.payment_status === 'Paid') {
            preservedStatus = 'Completed';
          } else if (localMatch.status === 'Served' || mo.status === 'Served') {
            preservedStatus = (localMatch.payment_status?.toLowerCase() === 'paid' || mo.payment_status?.toLowerCase() === 'paid') ? 'Completed' : 'Served';
          } else if (allMergedReady) {
            preservedStatus = 'Ready';
          } else if (mergedItems.some(i => i.kitchen_status === 'ready' || i.is_served || i.kitchen_status === 'preparing') || localMatch.status === 'Preparing') {
            preservedStatus = 'Preparing';
          }

          const orderSettledAt = mo.settled_at || localMatch.settled_at || (preservedStatus === 'Completed' ? (mo.served_at || mo.placed_at || new Date().toISOString()) : null);
          const calcSubtotal = Number(mergedItems.reduce((acc, it) => acc + (Number(it.price || it.unit_price || 0) * Number(it.qty || it.quantity || 1)), 0).toFixed(2));
          const calcTotal = Number(calcSubtotal.toFixed(2));
          const calcSummary = mergedItems.map(i => `${i.qty || i.quantity || 1}x ${i.name || i.item_name}`).join(', ');

          return {
            ...mo,
            items: mergedItems,
            order_items: mergedItems,
            round: localMatch.round || mo.round || 1,
            is_addon: Boolean(localMatch.is_addon || mo.is_addon),
            status: preservedStatus,
            kds_cleared: preservedStatus === 'Cancelled' ? true : (hasUnserved ? false : (mo.kds_cleared || localMatch.kds_cleared)),
            newly_added_items: hasUnserved ? (localMatch.newly_added_items || mo.newly_added_items) : null,
            newly_added_summary: hasUnserved ? (localMatch.newly_added_summary || mo.newly_added_summary) : null,
            last_addon_at: localMatch.last_addon_at || mo.last_addon_at || null,
            last_modified_at: localMatch.last_modified_at || mo.last_modified_at || null,
            subtotal: isRecentlyModified ? (localMatch.subtotal || calcSubtotal) : (hasDbItems ? mo.subtotal : calcSubtotal),
            total: isRecentlyModified ? (localMatch.total || calcTotal) : (hasDbItems ? mo.total : calcTotal),
            total_amount: isRecentlyModified ? (localMatch.total_amount || calcTotal) : (hasDbItems ? mo.total_amount : calcTotal),
            items_summary: isRecentlyModified ? (localMatch.items_summary || calcSummary) : (hasDbItems ? mo.items_summary : calcSummary),
            payment_status: (preservedStatus === 'Completed' || isOrderFinished || localMatch.payment_status === 'Paid') ? 'Paid' : (mo.payment_status || localMatch.payment_status),
            settled_at: orderSettledAt,
            completed_at: orderSettledAt
          };
        });

        // Retain fresh offline/local orders that haven't synced to DB yet (never resurrect DB-deleted or stale orders)
        (prev || []).forEach(po => {
          // If this order previously existed in Supabase, and is now gone from DB, it was deleted/reset in DB!
          if (po.supabase_order_id) return;

          const orderTime = po.placed_at || po.created_at;
          const isStale = orderTime && (syncNow - new Date(orderTime).getTime() > 2 * 3600 * 1000);
          if (isStale) return;

          const isAlreadyInDb = merged.some(mo => 
            matchesOrderId(mo, po.id) || 
            matchesOrderId(mo, po.order_number) || 
            matchesOrderId(mo, po.supabase_order_id)
          );
          const isTestDummy = String(po.id || '').includes('TEST') || DEMO_ORDER_IDS.has(po.id) || !po.table_number;
          const st = String(po.status || '').toLowerCase();
          const isUnsettled = st !== 'completed' && st !== 'cancelled' && st !== 'settled';
          if (!isAlreadyInDb && !isTestDummy && isUnsettled) {
            merged.push(po);
          }
        });
        finalMergedOrders = merged;
        setLocalStore('orders', merged);
        return merged;
      });

      // Reconcile tables with latest orders
      setTables(prevTables => {
        const activeTbls = new Set(
          finalMergedOrders
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
            const matchOrd = finalMergedOrders.find(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0') === code);
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
            const matchOrd = finalMergedOrders.find(o => (o.table_number || '').replace(/\D/g, '').padStart(2, '0') === code);
            const rawTbl = matchOrd?.table_number || `T${code}`;
            const cleanDigits = rawTbl.replace(/[^0-9]/g, '');
            const tableNumStr = cleanDigits 
              ? (parseInt(cleanDigits, 10) < 10 ? `T0${parseInt(cleanDigits, 10)}` : `T${parseInt(cleanDigits, 10)}`) 
              : rawTbl;
            reconciled.push({
              id: tableNumStr,
              number: tableNumStr,
              capacity: 4,
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

  // Live Floor Tables Synchronizer: Guarantees newly created tables reflect across all devices
  const refreshTablesFromSupabase = useCallback(async () => {
    try {
      const liveTables = await fetchLiveTablesFromSupabase();
      if (liveTables && Array.isArray(liveTables) && liveTables.length > 0) {
        setTables(prevTables => {
          // Parse deleted tables tombstone list to prevent resurrecting deleted tables
          let deletedSet = new Set();
          try {
            const rawDel = localStorage.getItem('restaurant_deleted_tables');
            if (rawDel) {
              const arr = JSON.parse(rawDel);
              if (Array.isArray(arr)) {
                arr.forEach(x => {
                  const s = String(x).trim().toUpperCase();
                  deletedSet.add(s);
                  const d = s.replace(/\D/g, '');
                  if (d) {
                    deletedSet.add(d);
                    deletedSet.add(parseInt(d, 10));
                    deletedSet.add(`T${d}`);
                    deletedSet.add(`T-${d.padStart(2, '0')}`);
                  }
                });
              }
            }
          } catch (e) {}

          const map = new Map();
          // Populate live tables from Supabase Cloud (ignoring tombstoned deleted tables)
          liveTables.forEach(lt => {
            const rawNum = String(lt.number || '').trim().toUpperCase();
            const code = rawNum.replace(/\D/g, '');
            const key = code ? parseInt(code, 10) : rawNum;
            if (deletedSet.has(rawNum) || deletedSet.has(code) || deletedSet.has(key)) {
              return; // Table was deleted
            }
            map.set(key, lt);
          });

          // Preserve local dynamic runtime properties (active orders, seated timing, delivered timestamps)
          (prevTables || []).forEach(pt => {
            const rawNum = String(pt.number || '').trim().toUpperCase();
            const code = rawNum.replace(/\D/g, '');
            const key = code ? parseInt(code, 10) : rawNum;
            if (deletedSet.has(rawNum) || deletedSet.has(code) || deletedSet.has(key)) {
              return; // Table was deleted
            }
            if (map.has(key)) {
              const existing = map.get(key);
              const isLocallyVacated = (pt.status === 'available' || pt.status === 'vacant') && !pt.current_order_id;
              const isDbVacant = String(existing.status || '').toLowerCase() === 'vacant' || String(existing.status || '').toLowerCase() === 'available';
              const isVacant = isLocallyVacated || isDbVacant;
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
            }
            // Tables deleted in Supabase are NOT re-added here!
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
      try {
        // 1. Sync live authoritative menu and categories from Supabase Cloud
      try {
        const liveMenu = await fetchLiveMenuFromSupabase();
        if (liveMenu && Array.isArray(liveMenu.categories) && Array.isArray(liveMenu.items)) {
          setCategories(liveMenu.categories);
          setLocalStore('categories', liveMenu.categories);
          setMenuItems(liveMenu.items);
          setLocalStore('menu_items', liveMenu.items);
          try {
            localStorage.setItem('atmiya_categories', JSON.stringify(liveMenu.categories));
            localStorage.setItem('restaurant_categories', JSON.stringify(liveMenu.categories));
            localStorage.setItem('atmiya_menu_items', JSON.stringify(liveMenu.items));
            localStorage.setItem('restaurant_menu_items', JSON.stringify(liveMenu.items));
          } catch (e) {}
        }
      } catch (mErr) {
        console.warn('[MENU SYNC] Live menu sync notice:', mErr);
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
            const isInsert = payload?.eventType === 'INSERT';
            const isAddonUpdate = payload?.eventType === 'UPDATE' && 
              (String(payload?.new?.status || '').toUpperCase() === 'PLACED') &&
              (String(payload?.old?.status || '').toUpperCase() !== 'PLACED');

            if ((isInsert || isAddonUpdate) && payload?.new && isStaffLoggedIn) {
              const newOrd = payload.new;
              const tbl = (newOrd.table_number || '01').replace(/\D/g, '');
              const ordNum = newOrd.order_number || '';
              const cust = newOrd.customer_name || 'Guest';

              if (currentRole === 'chef' || currentRole === 'admin') {
                const isAddon = isAddonUpdate || Boolean(newOrd.is_addon || (newOrd.round && newOrd.round > 1));
                const addonSummary = newOrd.newly_added_summary || 
                  (Array.isArray(newOrd.newly_added_items) && newOrd.newly_added_items.length > 0
                    ? newOrd.newly_added_items.map(i => `${i.qty || i.quantity || 1} ${i.name}`).join(', ')
                    : '');
                triggerStaffOrderNotification({
                  tableNumber: tbl,
                  orderNumber: ordNum,
                  customerName: cust,
                  paymentMode: newOrd.payment_method || 'Cash',
                  itemsSummary: isAddon ? (addonSummary || 'Add-on items') : (newOrd.items_summary || ''),
                  isAddon: isAddon
                });
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: isAddon ? `🚨 Table ${tbl} — Add-On Order Placed!` : `🚨 Table ${tbl} — New KOT Placed!`,
                  message: isAddon
                    ? `Table ${tbl}: Added ${addonSummary || 'new items'}. Start prep now!`
                    : `Order #${ordNum} (${newOrd.payment_method || 'Cash'}) from ${cust}. Start prep now!`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              } else if (currentRole === 'waiter') {
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: isAddonUpdate ? `📝 Table ${tbl}: Add-On Items Placed` : `📝 Table ${tbl}: New Order Placed`,
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

            // Instantly apply new order or add-on items to in-memory orders state across ALL screens
            if (payload && (payload.order_id || payload.order_number || payload.items)) {
              setOrders(prevOrders => {
                const targetNum = String(payload.order_number || payload.order_id || '').replace('#', '');
                const targetTbl = String(payload.table_number || '').replace(/\D/g, '');
                const hasExisting = prevOrders.some(o => 
                  matchesOrderId(o, payload.order_id) || 
                  matchesOrderId(o, payload.order_number) ||
                  (targetTbl && String(o.table_number || '').replace(/\D/g, '') === targetTbl && o.status !== 'Completed' && o.status !== 'Cancelled')
                );

                if (hasExisting && payload.items && payload.items.length > 0) {
                  return prevOrders.map(o => {
                    const isMatch = matchesOrderId(o, payload.order_id) || 
                                    matchesOrderId(o, payload.order_number) ||
                                    (targetTbl && String(o.table_number || '').replace(/\D/g, '') === targetTbl && o.status !== 'Completed' && o.status !== 'Cancelled');
                    if (isMatch) {
                      return {
                        ...o,
                        items: payload.items,
                        order_items: payload.items,
                        subtotal: payload.subtotal !== undefined ? payload.subtotal : o.subtotal,
                        tax: payload.tax !== undefined ? payload.tax : o.tax,
                        total: payload.total !== undefined ? payload.total : o.total,
                        total_amount: payload.total !== undefined ? payload.total : o.total_amount,
                        items_summary: payload.items_summary || o.items_summary,
                        status: payload.status || 'Placed',
                        kds_cleared: false,
                        round: payload.round || o.round || 1,
                        is_addon: Boolean(payload.is_addon || o.is_addon),
                        newly_added_items: payload.newly_added_items || null,
                        last_addon_at: payload.last_addon_at || new Date().toISOString(),
                        last_modified_at: new Date().toISOString()
                      };
                    }
                    return o;
                  });
                } else if (!hasExisting && payload.items && payload.items.length > 0) {
                  const newOrdObj = {
                    id: payload.order_id ? (String(payload.order_id).startsWith('#') ? payload.order_id : `#${payload.order_id}`) : `#ORD${Date.now().toString().slice(-4)}`,
                    order_number: targetNum || Date.now().toString().slice(-4),
                    table_number: payload.table_number,
                    customer_name: payload.customer_name || 'Guest',
                    items: payload.items,
                    order_items: payload.items,
                    subtotal: payload.subtotal || payload.total || 0,
                    tax: payload.tax || 0,
                    total: payload.total || 0,
                    total_amount: payload.total || 0,
                    items_summary: payload.items_summary || payload.items.map(i => `${i.qty || 1}x ${i.name}`).join(', '),
                    status: payload.status || 'Placed',
                    round: payload.round || 1,
                    is_addon: Boolean(payload.is_addon),
                    payment_mode: payload.payment_mode || 'Cash',
                    payment_status: 'Pending Cash',
                    placed_at: payload.placed_at || new Date().toISOString(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    kds_cleared: false,
                    last_modified_at: new Date().toISOString()
                  };
                  return [newOrdObj, ...prevOrders];
                }
                return prevOrders;
              });
            }

            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            // Trigger alerts strictly on authenticated staff terminals!
            if (isStaffLoggedIn) {
              const tbl = (payload.table_number || '01').replace(/\D/g, '');
              const ordNum = payload.order_number || '';
              const cust = payload.customer_name || 'Guest';

              if (currentRole === 'chef' || currentRole === 'admin') {
                const isAddon = Boolean(payload.is_addon || payload.round > 1);
                const addonSummary = payload.newly_added_summary || 
                  (Array.isArray(payload.newly_added_items) && payload.newly_added_items.length > 0
                    ? payload.newly_added_items.map(i => `${i.qty || i.quantity || 1} ${i.name}`).join(', ')
                    : '');
                triggerStaffOrderNotification({
                  tableNumber: tbl,
                  orderNumber: ordNum,
                  customerName: cust,
                  itemsSummary: isAddon ? (addonSummary || 'Add-on items') : (payload.items_summary || ''),
                  paymentMode: payload.payment_mode || 'Cash',
                  isAddon: isAddon
                });
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: isAddon ? `🚨 Table ${tbl} — Add-On Order Placed!` : `🚨 Table ${tbl} — New KOT Placed!`,
                  message: isAddon
                    ? `Table ${tbl}: Added ${addonSummary || 'new items'}. Start prep now!`
                    : `Order #${ordNum} (${payload.payment_mode || 'Cash'}) from ${cust}. Start prep now!`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              } else if (currentRole === 'waiter') {
                setActiveToast({
                  id: `ord_${Date.now()}`,
                  title: payload.is_addon ? `📝 Table ${tbl}: Add-On Items Placed` : `📝 Table ${tbl}: New Order Placed`,
                  message: `Order #${ordNum} placed for Table ${tbl}. Ticket queued in kitchen.`,
                  type: 'order',
                  time: 'Just now',
                  orderId: ordNum
                });
              }
            }

            await refreshOrdersFromSupabase();
            loadFreshState();
            await refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'order_status_updated' }, async ({ payload }) => {
            console.log('[SUPABASE REALTIME] Order status update broadcast:', payload);
            if (payload && (payload.orderId || payload.orderNumber || payload.tableNumber)) {
              setOrders(prevOrders => {
                const targetNum = String(payload.orderNumber || payload.orderId || '').replace('#', '');
                const targetTbl = String(payload.tableNumber || '').replace(/\D/g, '');
                return prevOrders.map(o => {
                  const oNum = String(o.order_number || o.id || '').replace('#', '');
                  const oTbl = String(o.table_number || '').replace(/\D/g, '');
                  const isMatch = (payload.orderId && matchesOrderId(o, payload.orderId)) ||
                                  (targetNum && oNum === targetNum) ||
                                  (targetTbl && oTbl === targetTbl && o.status !== 'Completed' && o.status !== 'Cancelled');
                  if (isMatch) {
                    const isCancelled = payload.status === 'Cancelled' || String(payload.status).toLowerCase() === 'cancelled';
                    return {
                      ...o,
                      ...(payload.items ? { items: payload.items, order_items: payload.items } : {}),
                      ...(payload.subtotal !== undefined ? { subtotal: payload.subtotal } : {}),
                      ...(payload.tax !== undefined ? { tax: payload.tax } : {}),
                      ...(payload.total !== undefined ? { total: payload.total, total_amount: payload.total } : {}),
                      ...(payload.items_summary ? { items_summary: payload.items_summary } : (payload.items ? { items_summary: payload.items.map(i => `${i.qty || 1}x ${i.name}`).join(', ') } : {})),
                      ...(payload.status ? { status: payload.status } : {}),
                      ...(isCancelled ? { payment_status: 'Void', cancel_reason: payload.reason || o.cancel_reason } : {}),
                      kds_cleared: isCancelled ? true : false,
                      last_modified_at: new Date().toISOString()
                    };
                  }
                  return o;
                });
              });
            }
            await refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'order_items_updated' }, async ({ payload }) => {
            console.log('[SUPABASE REALTIME] Order items updated broadcast:', payload);
            if (payload && (payload.orderId || payload.orderNumber || payload.tableNumber)) {
              setOrders(prevOrders => {
                const targetNum = String(payload.orderNumber || payload.orderId || '').replace('#', '');
                const targetTbl = String(payload.tableNumber || '').replace(/\D/g, '');
                return prevOrders.map(o => {
                  const oNum = String(o.order_number || o.id || '').replace('#', '');
                  const oTbl = String(o.table_number || '').replace(/\D/g, '');
                  const isMatch = (payload.orderId && matchesOrderId(o, payload.orderId)) ||
                                  (targetNum && oNum === targetNum);
                  if (isMatch) {
                    return {
                      ...o,
                      items: payload.items || o.items,
                      order_items: payload.items || o.order_items,
                      subtotal: payload.subtotal !== undefined ? payload.subtotal : o.subtotal,
                      tax: payload.tax !== undefined ? payload.tax : o.tax,
                      total: payload.total !== undefined ? payload.total : o.total,
                      total_amount: payload.total !== undefined ? payload.total : o.total_amount,
                      items_summary: payload.items_summary || (payload.items ? payload.items.map(i => `${i.qty || 1}x ${i.name}`).join(', ') : o.items_summary),
                      status: payload.status || o.status,
                      is_addon: payload.is_addon !== undefined ? payload.is_addon : o.is_addon,
                      newly_added_items: payload.newly_added_items !== undefined ? payload.newly_added_items : o.newly_added_items,
                      newly_added_summary: payload.newly_added_summary !== undefined ? payload.newly_added_summary : o.newly_added_summary,
                      kds_cleared: false,
                      last_modified_at: new Date().toISOString()
                    };
                  }
                  return o;
                });
              });
            }
            await refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'table_session_settled' }, async ({ payload }) => {
            try {
              window.dispatchEvent(new CustomEvent('table_session_terminated', { detail: payload || {} }));
            } catch (e) {}
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

            // 1. Immediately update local orders state in memory so Waiter Panel switches to Ready instantly
            setOrders(prev => {
              const updated = (prev || []).map(o => {
                const isMatch = matchesOrderId(o, payload.orderId) || 
                                matchesOrderId(o, payload.orderNumber);
                if (!isMatch) return o;
                if (o.status === 'Cancelled' || String(o.payment_status).toLowerCase() === 'void') return o;
                const items = (o.items || []).map((it, idx) => {
                  const isItemMatch = (payload.itemIndex !== undefined && idx === payload.itemIndex) ||
                                      (payload.itemName && (it.name === payload.itemName || it.item_name === payload.itemName));
                  if (!isItemMatch) return it;
                  return {
                    ...it,
                    kitchen_status: 'ready',
                    ready_at: payload.readyAt || Date.now()
                  };
                });
                const allReady = items.length > 0 && items.every(i => i.kitchen_status === 'ready' || i.is_served);
                const anyPrepOrReady = items.some(i => i.kitchen_status === 'ready' || i.kitchen_status === 'preparing');
                const nextStatus = allReady ? 'Ready' : (anyPrepOrReady ? 'Preparing' : o.status);
                return {
                  ...o,
                  items,
                  order_items: items,
                  status: nextStatus
                };
              });
              setLocalStore('orders', updated);
              return updated;
            });

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
          .on('broadcast', { event: 'order_item_rollback' }, ({ payload }) => {
            console.log('[SUPABASE REALTIME] Incoming order_item_rollback broadcast:', payload);
            if (!payload) return;

            const cleanTbl = payload.tableNumber ? String(payload.tableNumber).replace(/\D/g, '') : null;

            // 1. Update local orders: set item to preparing
            setOrders(prev => {
              const updated = prev.map(o => {
                const oTbl = o.table_number ? String(o.table_number).replace(/\D/g, '') : null;
                const matchesTbl = cleanTbl && oTbl === cleanTbl;
                const matchesId = matchesOrderId(o, payload.orderId) || matchesOrderId(o, payload.orderNumber);
                if (!matchesId && !matchesTbl) return o;
                if (o.status === 'Cancelled' || String(o.payment_status).toLowerCase() === 'void') return o;

                const items = (o.items || []).map((it, idx) => {
                  const isMatch = (payload.itemIndex !== undefined && idx === payload.itemIndex) ||
                                  (payload.itemName && (
                                    (it.name && it.name.toLowerCase() === payload.itemName.toLowerCase()) ||
                                    (it.item_name && it.item_name.toLowerCase() === payload.itemName.toLowerCase())
                                  ));
                  if (!isMatch) return it;
                  return {
                    ...it,
                    kitchen_status: 'preparing',
                    ready_at: null,
                    is_served: false
                  };
                });
                const anyReady = items.some(i => i.kitchen_status === 'ready');
                return {
                  ...o,
                  items,
                  order_items: items,
                  status: anyReady ? 'Ready' : (o.status === 'Ready' || o.status === 'Food Ready' ? 'Preparing' : o.status)
                };
              });
              setLocalStore('orders', updated);
              return updated;
            });

            // 2. Dismiss any ready call for this item / order
            setServiceCalls(prev => {
              const updated = prev.filter(c => {
                if (c.type !== 'food_ready') return true;
                const cTbl = c.tableNumber ? String(c.tableNumber).replace(/\D/g, '') : null;
                const matchesTbl = cleanTbl && cTbl === cleanTbl;
                const matchesOrder = matchesOrderId(payload.orderId, c.orderId) || matchesOrderId(payload.orderNumber, c.orderId);
                const matchesItem = (payload.itemIndex !== undefined && c.itemIndex === payload.itemIndex) ||
                                    !payload.itemName ||
                                    (payload.itemName && (
                                      c.itemName === payload.itemName || 
                                      c.dishName === payload.itemName || 
                                      (c.itemsSummary && c.itemsSummary.toLowerCase().includes(payload.itemName.toLowerCase())) ||
                                      (c.label && c.label.toLowerCase().includes(payload.itemName.toLowerCase()))
                                    ));
                if (matchesOrder && (matchesItem || payload.itemIndex === undefined)) return false;
                if (matchesTbl && matchesItem) return false;
                return true;
              });
              setLocalStore('service_calls', updated);
              return updated;
            });

            // 3. Announce rollback to Waiter and Admin staff with audio & toast!
            const isCustomerScreen = viewModeRef.current === 'customer' || Boolean(scannedTable);
            const isStaffLoggedIn = Boolean(authUserRef.current) && !isCustomerScreen;
            const currentRole = isStaffLoggedIn ? (authUserRef.current?.role || 'admin') : 'customer';

            if (isStaffLoggedIn && (currentRole === 'waiter' || currentRole === 'admin')) {
              const dishSummary = payload.itemName || 'Dish';
              const tblLabel = payload.tableNumber ? `Table ${payload.tableNumber}` : 'Table';
              playSound('alert');

              if ('speechSynthesis' in window) {
                try {
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(`Attention waiter: ${tblLabel}, ${dishSummary} rolled back to cooking in kitchen!`);
                  utterance.rate = 1.05;
                  utterance.pitch = 1.0;
                  window.speechSynthesis.speak(utterance);
                } catch (e) {}
              }

              setActiveToast({
                id: `rollback_${Date.now()}`,
                title: `⚠️ ${tblLabel}: ${dishSummary} Rolled Back!`,
                message: `Chef pulled item back to Preparing/Cooking. Please hold delivery.`,
                type: 'warning',
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
          .on('broadcast', { event: 'orders_permanently_deleted' }, () => {
            console.log('[SUPABASE REALTIME] Detected orders_permanently_deleted broadcast');
            loadFreshState();
            refreshOrdersFromSupabase();
          })
          .on('broadcast', { event: 'restaurant_data_reset' }, () => {
            console.log('[SUPABASE REALTIME] Detected restaurant_data_reset broadcast');
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
    if (!orderId || orderId === 'undefined' || orderId === 'null') return;
    const targetOrder = orders.find(o => matchesOrderId(o, orderId));
    const isNowServed = newStatus === 'Served' || newStatus === 'Completed';
    const isNowReady = newStatus === 'Ready';
    const deliveredAt = isNowServed ? Date.now() : targetOrder?.food_delivered_at;
    const actorName = staffName || authUser?.name || 'Staff';
    const actorRole = staffRole ? (staffRole === 'chef' ? 'Head Chef' : staffRole === 'waiter' ? 'Floor Waiter' : staffRole === 'cashier' ? 'Cashier' : 'Admin') : (authUser?.role || 'Admin');

    const updated = orders.map(o => matchesOrderId(o, orderId) ? { 
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
  // Toggle individual dish item served/delivered state (Syncs between Kitchen KDS and Customer QR Menu)
  const handleToggleItemServed = (orderId, itemIndex, staffName = null, staffId = null, itemObj = null) => {
    if (!orderId || orderId === 'undefined' || orderId === 'null') return;
    const targetOrder = orders.find(o => matchesOrderId(o, orderId));
    if (!targetOrder) return;

    let targetIndex = itemIndex;
    if (itemObj && Array.isArray(targetOrder.items)) {
      let fIdx = -1;
      if (itemObj.id) {
        fIdx = targetOrder.items.findIndex(it => it.id === itemObj.id);
      }
      if (fIdx < 0 && itemObj.name) {
        const cleanName = itemObj.name.toLowerCase().trim();
        // Prioritize unserved ready item
        fIdx = targetOrder.items.findIndex(it => 
          !it.is_served && 
          (it.kitchen_status === 'ready' || it.kitchen_status === 'prepared') &&
          it.name && it.name.toLowerCase().trim() === cleanName &&
          (it.round === itemObj.round || !itemObj.round)
        );
      }
      if (fIdx < 0 && itemObj.name) {
        const cleanName = itemObj.name.toLowerCase().trim();
        fIdx = targetOrder.items.findIndex(it => 
          !it.is_served &&
          it.name && it.name.toLowerCase().trim() === cleanName &&
          (it.round === itemObj.round || !itemObj.round)
        );
      }
      if (fIdx >= 0) targetIndex = fIdx;
    }

    const collectorName = staffName || authUser?.name || 'Floor Server';
    const collectorId = staffId || authUser?.waiter_id || authUser?.id || 'WTR-101';

    let newlyDeliveredAt = null;
    let updatedItems = [];
    let updatedNextStatus = 'Served';

    const updated = orders.map(o => {
      if (!matchesOrderId(o, orderId)) return o;
      const items = (o.items || []).map((it, idx) => {
        if (idx !== targetIndex) return it;
        return {
          ...it,
          is_served: true,
          kitchen_status: 'served',
          served_at: it.served_at || Date.now(),
          served_by_waiter_id: collectorId,
          served_by_waiter_name: collectorName
        };
      });
      updatedItems = items;

      const allServed = items.length > 0 && items.every(i => i.is_served);
      const anyServed = items.some(i => i.is_served);
      const hasUnservedReady = items.some(i => !i.is_served && (i.kitchen_status === 'ready' || i.kitchen_status === 'prepared'));
      const allReadyOrServed = items.length > 0 && items.every(i => i.is_served || i.kitchen_status === 'ready');
      const nextStatus = allServed ? 'Served' : (allReadyOrServed && hasUnservedReady ? 'Ready' : (anyServed ? 'Preparing' : o.status));
      updatedNextStatus = nextStatus;
      const deliveredAt = anyServed ? (o.food_delivered_at || Date.now()) : (allServed ? Date.now() : o.food_delivered_at);
      if (anyServed && !o.food_delivered_at) {
        newlyDeliveredAt = deliveredAt;
      }

      return {
        ...o,
        items,
        order_items: items,
        status: nextStatus,
        food_delivered_at: deliveredAt,
        delivered_by_waiter_id: collectorId,
        delivered_by_waiter_name: collectorName,
        last_modified_at: new Date().toISOString()
      };
    });

    setOrders(updated);
    setLocalStore('orders', updated);

    // If marked served, clear any matching food_ready service call
    const targetItem = targetOrder.items?.[targetIndex];
    const isNowServed = true;
    if (isNowServed) {
      setServiceCalls(prev => {
        const nextCalls = prev.filter(c => !(c.type === 'food_ready' && (c.orderId === orderId || String(c.orderId) === String(orderId)) && (c.itemIndex === targetIndex || c.itemIndex === undefined)));
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

    // Broadcast update via Supabase Realtime so Customer Menu and KDS update live
    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'order_item_served_updated',
        payload: { orderId, itemIndex: targetIndex }
      });
      channel.send({
        type: 'broadcast',
        event: 'order_items_updated',
        payload: {
          orderId: targetOrder.id,
          orderNumber: targetOrder.order_number,
          tableNumber: targetOrder.table_number,
          items: updatedItems,
          status: updatedNextStatus
        }
      });
    } catch (e) {
      console.warn('Realtime item served broadcast error:', e);
    }

    // Persist item served state to Supabase Cloud & Local Backend
    try {
      updateOrderItemStatusInSupabase(
        targetOrder.supabase_order_id || targetOrder.id || targetOrder.order_number || orderId,
        targetItem?.name || targetIndex,
        isNowServed ? 'SERVED' : 'READY',
        { ...targetOrder, items: updatedItems }
      );
      const cleanOrdId = String(targetOrder.id || orderId).replace('#', '');
      fetch(`/api/orders/${cleanOrdId}/items/${targetIndex}/status`, {
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
  const handleToggleItemReady = (orderId, itemIndex, itemObj = null) => {
    if (!orderId || orderId === 'undefined' || orderId === 'null') return;
    const targetOrder = orders.find(o => matchesOrderId(o, orderId));
    if (!targetOrder) return;

    let targetIndex = itemIndex;
    if (itemObj && Array.isArray(targetOrder.items)) {
      let fIdx = -1;
      if (itemObj.id) {
        fIdx = targetOrder.items.findIndex(it => it.id === itemObj.id);
      }
      if (fIdx < 0 && itemObj.name) {
        const cleanName = itemObj.name.toLowerCase().trim();
        fIdx = targetOrder.items.findIndex(it => 
          !it.is_served &&
          it.name && it.name.toLowerCase().trim() === cleanName &&
          (it.round === itemObj.round || !itemObj.round)
        );
      }
      if (fIdx >= 0) targetIndex = fIdx;
    }

    const targetItem = targetOrder.items?.[targetIndex];
    if (!targetItem || targetItem.is_served) return;

    const nextReadyState = targetItem.kitchen_status === 'ready' ? 'preparing' : 'ready';

    let updatedItems = [];
    let updatedNextStatus = 'Preparing';
    const updated = orders.map(o => {
      if (!matchesOrderId(o, orderId)) return o;
      const items = (o.items || []).map((it, idx) => {
        if (idx !== targetIndex) return it;
        return {
          ...it,
          kitchen_status: nextReadyState,
          ready_at: nextReadyState === 'ready' ? Date.now() : null
        };
      });
      updatedItems = items;

      const allServed = items.length > 0 && items.every(i => i.is_served);
      const hasUnservedReady = items.some(i => !i.is_served && (i.kitchen_status === 'ready' || i.kitchen_status === 'prepared'));
      const allReady = items.length > 0 && items.every(i => i.kitchen_status === 'ready' || i.is_served);
      const nextStatus = allServed ? 'Served' : (allReady && hasUnservedReady ? 'Ready' : (o.status === 'Ready' || o.status === 'Placed' ? 'Preparing' : o.status));
      updatedNextStatus = nextStatus;

      return {
        ...o,
        items,
        order_items: items,
        status: nextStatus,
        last_modified_at: new Date().toISOString()
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
        id: `ready_item_${orderId}_${targetIndex}_${Date.now()}`,
        tableNumber: cleanTbl,
        label: `Dish Ready: ${qty}x ${itemName}`,
        type: 'food_ready',
        orderId,
        orderNumber: targetOrder.order_number || targetOrder.id,
        itemIndex: targetIndex,
        itemsSummary: `${qty}x ${itemName}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      setServiceCalls(prev => {
        const nextCalls = [foodReadyCall, ...prev.filter(c => {
          if (c.type !== 'food_ready') return true;
          const matchesOrder = matchesOrderId(targetOrder, c.orderId);
          const matchesItem = (c.itemIndex === targetIndex) || (itemName && (c.itemName === itemName || c.dishName === itemName || c.itemsSummary?.includes(itemName)));
          return !(matchesOrder && matchesItem);
        })];
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
        // Kitchen Chef ticked dish ready: gentle chime
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
            itemIndex: targetIndex,
            tableNumber: cleanTbl,
            itemName,
            qty,
            readyAt: Date.now()
          }
        });
        channel.send({
          type: 'broadcast',
          event: 'order_items_updated',
          payload: {
            orderId: targetOrder.id,
            orderNumber: targetOrder.order_number,
            tableNumber: targetOrder.table_number,
            items: updatedItems,
            status: updatedNextStatus
          }
        });
      } catch (e) {
        console.warn('Realtime item ready broadcast notice:', e);
      }
    } else {
      // Dish unticked back to preparing - remove ready call locally & broadcast rollback to waiters
      setServiceCalls(prev => {
        const nextCalls = prev.filter(c => {
          if (c.type !== 'food_ready') return true;
          const matchesOrder = matchesOrderId(targetOrder, c.orderId);
          const matchesItem = (c.itemIndex === targetIndex) || (itemName && (c.itemName === itemName || c.dishName === itemName || c.itemsSummary?.includes(itemName)));
          return !(matchesOrder && matchesItem);
        });
        setLocalStore('service_calls', nextCalls);
        return nextCalls;
      });

      // Broadcast rollback over Supabase Realtime channel
      try {
        const channel = supabase.channel('restaurant_alerts');
        channel.send({
          type: 'broadcast',
          event: 'order_item_rollback',
          payload: {
            orderId: targetOrder.id,
            orderNumber: targetOrder.order_number || targetOrder.id,
            itemIndex: targetIndex,
            itemName,
            tableNumber: cleanTbl
          }
        });
        channel.send({
          type: 'broadcast',
          event: 'order_items_updated',
          payload: {
            orderId: targetOrder.id,
            orderNumber: targetOrder.order_number,
            tableNumber: targetOrder.table_number,
            items: updatedItems,
            status: updatedNextStatus
          }
        });
      } catch (e) {
        console.warn('Realtime item rollback broadcast notice:', e);
      }
    }

    // Persist item ready state to Supabase Cloud & Local Backend
    try {
      updateOrderItemStatusInSupabase(
        targetOrder.supabase_order_id || targetOrder.id || targetOrder.order_number || orderId,
        targetItem.name || targetIndex,
        nextReadyState === 'ready' ? 'READY' : 'PREPARING',
        { ...targetOrder, items: updatedItems }
      );
      // Dual persistence: sync with FastAPI local orders database
      const cleanOrdId = String(targetOrder.id || orderId).replace('#', '');
      fetch(`/api/orders/${cleanOrdId}/items/${targetIndex}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextReadyState })
      }).catch(() => {});
    } catch (dbErr) {
      console.warn('Item ready sync error:', dbErr);
    }

    playSound('success');
  };

  // Mark all dishes for a specific dining table as Delivered/Served
  const handleMarkAllTableItemsServed = (tableNum, staffName = null, staffId = null) => {
    if (isTakeawayTable(tableNum)) return;
    const normalizeTbl = (val) => String(val || '').replace(/[^0-9]/g, '');
    const targetCode = normalizeTbl(tableNum);
    if (!targetCode) return;
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

  const handleCancelOrderWithReason = (orderId, reason = 'Customer requested cancellation', staffName = null) => {
    if (!orderId) return;
    const targetOrder = orders.find(o => matchesOrderId(o, orderId));
    if (!targetOrder) return;
    const staff = staffName || authUser?.name || 'Staff';
    const updated = orders.map(o => matchesOrderId(o, orderId) ? {
      ...o,
      status: 'Cancelled',
      payment_status: 'Void',
      cancel_reason: reason,
      cancelled_by: staff,
      cancelled_at: new Date().toISOString(),
      kds_cleared: true,
      items: (o.items || []).map(it => ({ ...it, kitchen_status: 'cancelled', is_served: false, status: 'CANCELLED' })),
      order_items: (o.order_items || []).map(it => ({ ...it, kitchen_status: 'cancelled', is_served: false, status: 'CANCELLED' })),
      last_modified_at: new Date().toISOString()
    } : o);
    setOrders(updated);
    setLocalStore('orders', updated);
    try {
      localStorage.setItem('orders', JSON.stringify(updated));
      localStorage.setItem('atmiya_orders', JSON.stringify(updated));
      window.dispatchEvent(new Event('restaurant_data_updated'));
    } catch (e) {}

    // Also persist to kds_cleared_order_ids so KDS on this browser or refreshed screens immediately clears it
    try {
      const saved = localStorage.getItem('kds_cleared_order_ids');
      const clearedList = saved ? JSON.parse(saved) : [];
      const newIds = [
        targetOrder.id,
        targetOrder.order_number,
        targetOrder.supabase_order_id,
        orderId
      ].filter(Boolean).map(x => String(x).replace(/^#+/, ''));
      const updatedCleared = Array.from(new Set([...clearedList, ...newIds]));
      localStorage.setItem('kds_cleared_order_ids', JSON.stringify(updatedCleared));
    } catch (e) {}

    // Dismiss any pending cancel_request calls for this table/order
    setServiceCalls(prev => {
      const nextCalls = prev.filter(c => !(
        (c.type === 'cancel_request' || c.type === 'CANCEL_REQUEST') &&
        (matchesOrderId(targetOrder, c.orderId) || String(c.tableNumber).replace(/\D/g, '') === String(targetOrder.table_number).replace(/\D/g, ''))
      ));
      setLocalStore('service_calls', nextCalls);
      return nextCalls;
    });

    // If order was cancelled, immediately free table if no other active dining orders remain
    const targetTableNum = targetOrder?.table_number;
    if (targetTableNum) {
      const normalizeTbl = (val) => String(val || '').replace(/[^0-9]/g, '');
      const tCode = normalizeTbl(targetTableNum);
      const hasOtherActive = updated.some(o => 
        !matchesOrderId(o, orderId) && 
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
      employeeRole: authUser?.role || 'Staff',
      tableNumber: targetOrder.table_number || 'Dine-In',
      actionType: 'ORDER_CANCELLED',
      amount: targetOrder.total,
      details: `Order #${targetOrder.id} cancelled. Reason: ${reason} (Authorized by ${staff})`,
      type: 'order',
      color: 'rose'
    });
    playSound('alert');

    // Broadcast Realtime cancellation to customer phones & kitchen KDS
    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'order_status_updated',
        payload: {
          orderId: targetOrder.id,
          orderNumber: targetOrder.order_number,
          tableNumber: targetOrder.table_number,
          status: 'Cancelled',
          payment_status: 'Void',
          reason,
          total: 0,
          kds_cleared: true
        }
      });
    } catch (e) {}

    // Sync Cancellation to Supabase Cloud
    cancelOrderInSupabase(targetOrder?.supabase_order_id || targetOrder?.id || orderId, targetOrder?.table_number, reason);
  };

  // Waiter & Admin Order Ticket Modifier: Add, remove, or modify items within an order
  const handleUpdateOrderItems = async (orderId, newItems, staffName = null, staffRole = null) => {
    if (!orderId) return;
    const targetOrder = orders.find(o => matchesOrderId(o, orderId));
    if (!targetOrder) return;
    const actorName = staffName || authUser?.name || 'Floor Waiter';

    // If all items removed, automatically cancel the ticket
    if (!newItems || newItems.length === 0) {
      handleCancelOrderWithReason(orderId, 'All items removed from ticket by waiter', actorName);
      return;
    }

    // Recalculate financial breakdown (no GST on food)
    const subtotal = Number(newItems.reduce((acc, it) => acc + (Number(it.price || it.unit_price || 0) * (Number(it.qty || it.quantity || 1))), 0).toFixed(2));
    const tax = 0; // GST removed per customer instruction
    const discount = Number(targetOrder.discount || 0);
    const total = Number((subtotal - discount).toFixed(2));
    const summaryStr = newItems.map(i => `${i.qty || i.quantity || 1}x ${i.name || i.item_name}`).join(', ');

    const allServed = newItems.every(i => i.is_served);
    const allReady = newItems.every(i => i.kitchen_status === 'ready' || i.is_served);
    const anyReadyOrCooking = newItems.some(i => i.kitchen_status === 'ready' || i.kitchen_status === 'preparing');
    const nextStatus = allServed ? 'Served' : (allReady ? 'Ready' : (anyReadyOrCooking ? 'Preparing' : 'Placed'));

    const hasAnyAddon = newItems.some(it => it.is_addon || (it.round && it.round > 1));
    const filteredNewlyAdded = (targetOrder.newly_added_items || []).filter(nai => 
      newItems.some(it => 
        (it.id && nai.id && it.id === nai.id) ||
        (it.name && nai.name && it.name.toLowerCase().trim() === nai.name.toLowerCase().trim())
      )
    );
    const filteredNewlyAddedSummary = filteredNewlyAdded.length > 0 
      ? filteredNewlyAdded.map(i => `${i.qty || i.quantity || 1}x ${i.name || i.item_name}`).join(', ')
      : null;

    const updated = orders.map(o => {
      if (!matchesOrderId(o, orderId)) return o;
      return {
        ...o,
        items: newItems,
        order_items: newItems,
        subtotal,
        tax,
        total,
        total_amount: total,
        items_summary: summaryStr,
        status: nextStatus,
        is_addon: hasAnyAddon,
        newly_added_items: filteredNewlyAdded.length > 0 ? filteredNewlyAdded : null,
        newly_added_summary: filteredNewlyAddedSummary,
        last_modified_at: new Date().toISOString(),
        modified_by: actorName
      };
    });

    setOrders(updated);
    setLocalStore('orders', updated);

    // Sync to Supabase Cloud DB: Update orders, order_items AND table_sessions
    try {
      const ordUuid = targetOrder.supabase_order_id || targetOrder.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ordUuid);
      const cleanOrderNumber = String(targetOrder.order_number || targetOrder.id).replace(/^#+/, '').trim();

      let resolvedOrderUuid = isUuid ? ordUuid : null;
      if (!resolvedOrderUuid && cleanOrderNumber) {
        const rawDigits = cleanOrderNumber.replace(/\D/g, '');
        const candidates = Array.from(new Set([cleanOrderNumber, rawDigits, `ORD${rawDigits}`, `ORD-${rawDigits}`])).filter(Boolean);
        const { data: ord } = await supabase.from('orders').select('id').in('order_number', candidates).maybeSingle();
        if (ord) resolvedOrderUuid = ord.id;
      }

      if (!resolvedOrderUuid && targetOrder.table_number) {
        const formattedTableNum = normalizeTableNumber(targetOrder.table_number);
        const digits = String(targetOrder.table_number).replace(/\D/g, '');
        const { data: ord } = await supabase.from('orders')
          .select('id')
          .or(`table_number.eq.${formattedTableNum},table_number.eq.T${digits},table_number.eq.${digits}`)
          .neq('status', 'CANCELLED')
          .order('placed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ord) resolvedOrderUuid = ord.id;
      }

      if (resolvedOrderUuid) {
        // 1. Update orders table with new subtotal, total, status (items_summary column does NOT exist in orders)
        const { error: ordErr } = await supabase.from('orders').update({
          subtotal,
          tax_amount: tax,
          total_amount: total,
          status: nextStatus.toUpperCase()
        }).eq('id', resolvedOrderUuid);
        if (ordErr) console.warn('[SUPABASE] Update orders table notice:', ordErr.message);

        // 2. Fetch known valid menu_items ids to prevent foreign key constraint violations
        let validMenuIds = new Set();
        try {
          const { data: menuList } = await supabase.from('menu_items').select('id');
          if (menuList && Array.isArray(menuList)) {
            menuList.forEach(m => validMenuIds.add(m.id));
          }
        } catch (e) {}

        const orderItemRows = newItems.map(item => {
          const isItemUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
          const safeMenuId = (isItemUuid && validMenuIds.has(item.id)) ? item.id : null;
          const qty = parseInt(item.qty || item.quantity, 10) || 1;
          const unitPrice = parseFloat(item.price || item.unit_price) || 0;
          const rawStatus = String(item.kitchen_status || item.status || 'PLACED').toUpperCase();
          const safeItemStatus = (rawStatus === 'PREPARING' || rawStatus === 'COOKING')
            ? 'PREPARING'
            : ((rawStatus === 'SERVED' || rawStatus === 'DELIVERED' || item.is_served) ? 'SERVED' : (rawStatus === 'READY' ? 'READY' : 'PLACED'));

          return {
            order_id: resolvedOrderUuid,
            menu_item_id: safeMenuId,
            item_name: item.name || item.item_name || 'Dish Item',
            quantity: qty,
            unit_price: unitPrice,
            total_price: parseFloat((unitPrice * qty).toFixed(2)),
            cooking_note: item.cooking_note || item.note || item.customizations || null,
            status: safeItemStatus
          };
        });

        if (orderItemRows.length > 0) {
          // Clear previous items and insert updated list
          await supabase.from('order_items').delete().eq('order_id', resolvedOrderUuid);
          const { error: insErr } = await supabase.from('order_items').insert(orderItemRows);
          if (insErr) {
            console.warn('[SUPABASE] order_items insert retry with menu_item_id: null:', insErr.message);
            const safeRows = orderItemRows.map(r => ({ ...r, menu_item_id: null }));
            await supabase.from('order_items').insert(safeRows);
          }
        }

        // 3. Update table_sessions running total & summary if present
        if (targetOrder.session_id) {
          try {
            await supabase.from('table_sessions').update({
              total_amount: total
            }).eq('id', targetOrder.session_id);
          } catch (sessErr) {
            console.warn('[SUPABASE] Session total update notice:', sessErr);
          }
        }

        console.log(`[SUPABASE] Successfully updated items for Order #${cleanOrderNumber} (${newItems.length} items, Total: ₹${total})`);
      }

      // Broadcast updated order items and total to all connected staff & customer terminals
      const alertPayload = {
        orderId: targetOrder.id,
        orderNumber: targetOrder.order_number,
        tableNumber: targetOrder.table_number,
        items: newItems,
        subtotal,
        tax,
        total,
        items_summary: summaryStr,
        status: nextStatus,
        is_addon: hasAnyAddon,
        newly_added_items: filteredNewlyAdded.length > 0 ? filteredNewlyAdded : null,
        newly_added_summary: filteredNewlyAddedSummary,
        last_modified_at: new Date().toISOString()
      };

      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'order_items_updated',
        payload: alertPayload
      });
      channel.send({
        type: 'broadcast',
        event: 'order_status_updated',
        payload: alertPayload
      });
    } catch (e) {
      console.warn('Sync order items error:', e);
    }

    recordEmployeeActivity({
      employeeName: actorName,
      employeeRole: staffRole || authUser?.role || 'Waiter',
      tableNumber: targetOrder.table_number || 'Dine-In',
      actionType: 'ORDER_ITEMS_MODIFIED',
      amount: total,
      details: `Modified ticket for Table ${targetOrder.table_number}: ${newItems.length} items (Total: ₹${total}) by ${actorName}`,
      type: 'order',
      color: 'blue'
    });

    playSound('success');
  };

  const handlePlaceCustomerOrder = async (rawOrder) => {
    try {
      // Client-side XSS and injection sanitization
      const newOrder = sanitizeOrderPayload(rawOrder);

      // Auto-validate Buy 2 Fancy Dosas, Get 1 Mysore Dosa FREE Promotion
      const orderItemsList = Array.isArray(newOrder.items) && newOrder.items.length > 0
        ? newOrder.items
        : (Array.isArray(newOrder.order_items) && newOrder.order_items.length > 0 ? newOrder.order_items : []);
      const qualifyingFancyCount = orderItemsList
        .filter(it => !it.is_free_offer && it.id !== 'free_mysore_offer' && isFancyDosaItem(it, categories))
        .reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);
      const expectedFreeQty = Math.floor(qualifyingFancyCount / 2);
      const existingOfferItem = orderItemsList.find(it => it.is_free_offer || it.id === 'free_mysore_offer' || String(it.name || '').toLowerCase().includes('offer - free'));

      if (expectedFreeQty > 0) {
        if (!existingOfferItem) {
          const promoItem = {
            id: 'free_mysore_offer',
            name: 'Mysore Dosa (Offer - Free)',
            english_name: 'Mysore Dosa (Offer - Free)',
            gujarati: 'માયસોર ઢોસા (ઓફર - ફ્રી)',
            price: 0,
            unit_price: 0,
            finalPrice: 0,
            qty: expectedFreeQty,
            quantity: expectedFreeQty,
            is_free_offer: true,
            offer_tag: 'Buy 2 Fancy Dosa Get 1 Free',
            customizations: 'Special Offer: Buy 2 Fancy Dosas, Get 1 Free (₹0)',
            kitchen_status: 'placed',
            is_served: false,
            round: newOrder.round || 1
          };
          if (Array.isArray(newOrder.items)) newOrder.items.push(promoItem);
          if (Array.isArray(newOrder.order_items)) newOrder.order_items.push(promoItem);
        } else {
          existingOfferItem.qty = expectedFreeQty;
          existingOfferItem.quantity = expectedFreeQty;
          existingOfferItem.price = 0;
          existingOfferItem.is_free_offer = true;
        }
        newOrder.items_summary = (newOrder.items || orderItemsList).map(i => `${i.qty || i.quantity || 1}x ${i.name || i.item_name}`).join(', ');
      }

      const isCustomerScreen = viewMode === 'customer' || Boolean(scannedTable);
      const isStaffSession = Boolean(authUser) && !isCustomerScreen;
      const userRole = isStaffSession ? authUser?.role : 'customer';

      // Identify Takeaway / Parcel orders
      const isTakeawayOrder = 
        newOrder.channel === 'Takeaway' || 
        newOrder.order_source === 'Takeaway' || 
        newOrder.order_source === 'Counter' ||
        newOrder.order_source === 'Counter POS' ||
        isTakeawayTable(newOrder.table_number) ||
        (!newOrder.table_number && isStaffSession);

      if (isTakeawayOrder) {
        newOrder.table_number = 'Takeaway';
        newOrder.channel = 'Takeaway';
        newOrder.order_source = 'Takeaway';
      }

      // Ensure session table lock is reinforced upon customer order placement (DINE-IN ONLY)
      if (viewMode === 'customer' && !authUser && !isTakeawayOrder) {
        if (!newOrder.table_number) {
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
      }
      if (!isTakeawayOrder && newOrder.table_number) {
        bindSessionTable(newOrder.table_number);
      }

      // 0. Table Session Round & Multi-Round Add-on Architecture
      const normalizeTbl = (val) => {
        const digits = String(val || '').replace(/[^0-9]/g, '');
        return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
      };

      // Locate active live order for this table session (NEVER FOR TAKEAWAY!)
      let activeParent = null;

      if (!isTakeawayOrder) {
        const isOrderEligibleParent = (o) => {
          if (!o) return false;
          const st = String(o.status || '').toLowerCase().trim();
          const paySt = String(o.payment_status || '').toLowerCase().trim();
          return st !== 'cancelled' && st !== 'completed' && st !== 'settled' && paySt !== 'paid' && paySt !== 'void';
        };

        // Check 1: Direct match by order ID if passed
        if (newOrder.id) {
          activeParent = orders.find(o => matchesOrderId(o, newOrder.id) && isOrderEligibleParent(o));
        }

        // Check 2: Match by table occupancy & recent orders (< 2.5 hours)
        if (!activeParent && newOrder.table_number) {
          const normTarget = normalizeTbl(newOrder.table_number);
          const tblObj = tables.find(t => normalizeTbl(t.number) === normTarget || t.id === newOrder.table_number);

          if (tblObj && tblObj.current_order_id) {
            activeParent = orders.find(o => matchesOrderId(o, tblObj.current_order_id) && isOrderEligibleParent(o));
          }

          if (!activeParent) {
            const candidateOrders = orders.filter(o => {
              if (normalizeTbl(o.table_number) !== normTarget) return false;
              if (!isOrderEligibleParent(o)) return false;
              const orderTime = new Date(o.placed_at || o.created_at || 0).getTime();
              return orderTime > 0 && (Date.now() - orderTime) < 2.5 * 60 * 60 * 1000;
            });

            if (candidateOrders.length > 0) {
              candidateOrders.sort((a, b) => new Date(b.placed_at || b.created_at || 0) - new Date(a.placed_at || a.created_at || 0));
              const isTableVacated = tblObj && (tblObj.status === 'available' || tblObj.status === 'vacant' || tblObj.is_occupied === false);
              if (!isTableVacated) {
                activeParent = candidateOrders[0];
              }
            }
          }
        }
      }

    // An order is strictly an add-on ONLY IF explicitly flagged by CustomerMenu/Waiter OR matching activeParent id directly
    const isAddonOrder = Boolean(
      newOrder.is_addon || 
      (activeParent && (
        matchesOrderId(activeParent, newOrder.id) || 
        matchesOrderId(activeParent, newOrder.parent_order_id)
      ))
    );
    const roundNumber = isAddonOrder && activeParent ? ((activeParent.round || 1) + 1) : 1;

    // Tag order with round metadata and link to parent table session
    newOrder.is_addon = isAddonOrder;
    newOrder.round = roundNumber;
    newOrder.parent_order_id = (isAddonOrder && activeParent) ? (activeParent.id || activeParent.order_number) : null;

    // Enforce proper payment classification
    const isOnline = newOrder.payment_mode === 'UPI' || newOrder.payment_verified_online === true;
    newOrder.payment_mode = isOnline ? 'UPI' : 'Cash';
    newOrder.payment_status = isOnline ? 'Paid' : 'Pending Cash';
    newOrder.payment_verified_online = isOnline;

    let finalOrder = newOrder;
    let updated = [];

    if (isAddonOrder && activeParent) {
      // MERGE INTO CONTINUOUS TABLE BILL: Do not generate a separate bill for water or add-ons!
      const parentBaseItems = (Array.isArray(activeParent.items) && activeParent.items.length > 0)
        ? activeParent.items
        : (Array.isArray(activeParent.order_items) && activeParent.order_items.length > 0
            ? activeParent.order_items.map(oi => ({
                id: oi.id,
                name: oi.item_name || oi.name,
                qty: oi.quantity || oi.qty || 1,
                quantity: oi.quantity || oi.qty || 1,
                price: Number(oi.unit_price || oi.price) || 0,
                kitchen_status: String(oi.status || '').toLowerCase() === 'ready' ? 'ready' : (String(oi.status || '').toLowerCase() === 'served' ? 'served' : 'placed'),
                is_served: String(oi.status || '').toLowerCase() === 'served',
                round: 1
              }))
            : (activeParent.items_summary
                ? String(activeParent.items_summary).split(',').map((p, idx) => {
                    const m = p.trim().match(/^(\d+)x?\s*(.+)$/i);
                    return {
                      id: `parent_dish_${activeParent.id}_${idx}`,
                      name: m ? m[2].trim() : p.trim(),
                      qty: m ? parseInt(m[1], 10) : 1,
                      price: 0,
                      kitchen_status: 'placed',
                      is_served: false,
                      round: 1
                    };
                  })
                : []));
      const deduplicatedBase = deduplicateOrderItems(parentBaseItems);
      const mergedItems = [...deduplicatedBase];

      const newItemsList = (Array.isArray(newOrder.items) && newOrder.items.length > 0)
        ? newOrder.items
        : (Array.isArray(newOrder.order_items) && newOrder.order_items.length > 0 ? newOrder.order_items : []);

      newItemsList.forEach(newItem => {
        const addedQty = Number(newItem.quantity || newItem.qty || 1);
        const isDeliveredByWaiter = Boolean(newItem.is_served);
        const targetKitchenStatus = isDeliveredByWaiter 
          ? 'served' 
          : (newItem.kitchen_status || 'placed');

        // Check if this item is already in mergedItems FOR THIS ADD-ON ROUND
        const cleanNewName = normalizeDishName(newItem.name || newItem.item_name);
        const isAlreadyInMerged = mergedItems.some(mi => {
          const miRound = Number(mi.round) || 1;
          const isSameRound = miRound === roundNumber;
          if (isSameRound) {
            if (mi.id && newItem.id && mi.id === newItem.id) return true;
            const cleanMiName = normalizeDishName(mi.name || mi.item_name);
            if (cleanMiName && cleanNewName && cleanMiName === cleanNewName) return true;
          }
          return false;
        });

        if (!isAlreadyInMerged) {
          mergedItems.push({
            ...newItem,
            id: `addon_r${roundNumber}_${newItem.id || Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            quantity: addedQty,
            qty: addedQty,
            price: Number(newItem.price || newItem.unit_price || newItem.finalPrice || 0),
            round: roundNumber,
            is_addon: true,
            kitchen_status: targetKitchenStatus,
            is_served: isDeliveredByWaiter,
            served_at: isDeliveredByWaiter ? (newItem.served_at || Date.now()) : null
          });
        }
      });

      const finalDeduplicatedItems = deduplicateOrderItems(mergedItems);

      const addedSubtotal = parseFloat(newOrder.subtotal || 0);
      const addedTax = 0;
      const addedDiscount = parseFloat(newOrder.discount || 0);
      const addedTotal = parseFloat(newOrder.total || newOrder.total_amount || 0);

      const itemsSum = Number(finalDeduplicatedItems.reduce((acc, it) => acc + (Number(it.price || it.unit_price || it.finalPrice || 0) * Number(it.quantity || it.qty || 1)), 0).toFixed(2));
      const fallbackSubtotal = Number((parseFloat(activeParent.subtotal || 0) + addedSubtotal).toFixed(2));
      const cumulativeSubtotal = itemsSum > 0 ? Math.max(itemsSum, fallbackSubtotal) : fallbackSubtotal;
      const cumulativeTax = 0;
      const cumulativeDiscount = Number((parseFloat(activeParent.discount || 0) + addedDiscount).toFixed(2));
      const cumulativeTotal = Math.max(0, Number((cumulativeSubtotal - cumulativeDiscount).toFixed(2)));
      const summaryStr = finalDeduplicatedItems.map(i => `${i.quantity || i.qty || 1}x ${i.name || i.item_name}`).join(', ');

      const allItemsServed = finalDeduplicatedItems.length > 0 && finalDeduplicatedItems.every(i => i.is_served);
      const allItemsReady = finalDeduplicatedItems.length > 0 && finalDeduplicatedItems.every(i => i.kitchen_status === 'ready' || i.is_served);
      const nextOrderStatus = allItemsServed ? 'Served' : (allItemsReady ? 'Ready' : 'Placed');

      finalOrder = {
        ...activeParent,
        id: activeParent.id,
        order_number: activeParent.order_number || String(activeParent.id).replace('#', ''),
        supabase_order_id: activeParent.supabase_order_id || null,
        session_id: activeParent.session_id || null,
        table_number: activeParent.table_number || newOrder.table_number,
        items: finalDeduplicatedItems,
        order_items: finalDeduplicatedItems,
        subtotal: cumulativeSubtotal,
        tax: cumulativeTax,
        discount: cumulativeDiscount,
        total: cumulativeTotal,
        total_amount: cumulativeTotal,
        items_summary: summaryStr,
        round: roundNumber,
        is_addon: true,
        status: nextOrderStatus,
        payment_status: 'Pending Cash', // Continuous bill remains pending until final table checkout
        kds_cleared: false, // CRITICAL: Reset kds_cleared so fresh add-on appears in KDS!
        newly_added_items: newItemsList,
        newly_added_summary: newOrder.items_summary || newItemsList.map(i => `${i.qty || i.quantity || 1}x ${i.name}`).join(', '),
        last_addon_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
        special_note: [activeParent.special_note, newOrder.special_note]
          .filter(Boolean)
          .map(s => String(s).replace(/\[Round\s*\d+(\s*Add-On)?\]/gi, '').trim())
          .filter(Boolean)
          .join(' • ') || null
      };

      const existsInOrders = orders.some(o => o.id === activeParent.id || matchesOrderId(o, activeParent.id));
      if (existsInOrders) {
        updated = orders.map(o => (o.id === activeParent.id || matchesOrderId(o, activeParent.id)) ? finalOrder : o);
      } else {
        updated = [finalOrder, ...orders];
      }
    } else {
      const cleanItems = deduplicateOrderItems(newOrder.items || []);
      finalOrder = {
        ...newOrder,
        items: cleanItems,
        order_items: cleanItems,
        newly_added_items: null,
        newly_added_summary: null
      };
      updated = [finalOrder, ...orders];
    }

    // 1. Immediately update UI & local state for zero-latency UX
    setOrders(updated);
    setLocalStore('orders', updated);

    // Un-clear order from KDS cleared IDs so it immediately pops up on Kitchen Display screen
    try {
      const savedCleared = localStorage.getItem('kds_cleared_order_ids');
      if (savedCleared) {
        const parsed = JSON.parse(savedCleared);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const matchKeys = new Set([
            String(finalOrder.id || '').replace(/^#+/, '').replace(/^ORD-?/i, '').trim(),
            String(finalOrder.order_number || '').replace(/^#+/, '').replace(/^ORD-?/i, '').trim(),
            String(finalOrder.supabase_order_id || '').trim(),
            String(activeParent?.id || '').replace(/^#+/, '').replace(/^ORD-?/i, '').trim(),
            String(activeParent?.order_number || '').replace(/^#+/, '').replace(/^ORD-?/i, '').trim(),
            String(activeParent?.supabase_order_id || '').trim()
          ].filter(Boolean));
          const filtered = parsed.filter(id => {
            const clean = String(id || '').replace(/^#+/, '').replace(/^ORD-?/i, '').trim();
            return !matchKeys.has(clean) && !matchKeys.has(String(id).trim());
          });
          localStorage.setItem('kds_cleared_order_ids', JSON.stringify(filtered));
        }
      }
    } catch (e) {}

    // Dispatch real-time KDS un-clear event to instantly restore ticket on kitchen screen
    try {
      window.dispatchEvent(new CustomEvent('kds_ticket_reactivated', {
        detail: {
          orderId: finalOrder.id,
          orderNumber: finalOrder.order_number,
          supabaseId: finalOrder.supabase_order_id,
          tableNumber: finalOrder.table_number
        }
      }));
    } catch (e) {}

    // Update corresponding dining table status to occupied with guest info (DINE-IN ONLY)
    if (!isTakeawayOrder) {
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
    }

    // Permanently record customer profile in local CRM
    if (finalOrder.customer_phone) {
      saveCustomerProfile({
        name: finalOrder.customer_name,
        phone: finalOrder.customer_phone,
        tableNumber: isTakeawayOrder ? 'Takeaway' : finalOrder.table_number,
        orderId: finalOrder.id,
        orderTotal: finalOrder.total || finalOrder.total_amount,
        items: finalOrder.items || [],
        paymentMode: finalOrder.payment_mode || 'UPI'
      });
      setCustomers(getLocalStore('customers', INITIAL_CUSTOMERS));
    }

    const isWaiterOrder = Boolean(newOrder.placed_by_waiter_id || newOrder.order_source === 'Waiter Terminal');
    const actionLabel = isTakeawayOrder
      ? 'COUNTER TAKEAWAY'
      : (isAddonOrder 
          ? `ADD-ON ROUND ${roundNumber}` 
          : (isWaiterOrder ? `WAITER ORDER (${newOrder.placed_by_waiter_id || 'TERMINAL'})` : 'QR SELF-ORDER'));

    recordEmployeeActivity({
      employeeName: isWaiterOrder ? (newOrder.placed_by_waiter_name || authUser?.name || 'Waiter') : (finalOrder.customer_name || 'Guest User'),
      employeeRole: isWaiterOrder ? 'Floor Waiter' : (isTakeawayOrder ? 'Counter POS' : `Guest / ${actionLabel}`),
      tableNumber: isTakeawayOrder ? 'Takeaway' : (finalOrder.table_number || 'Online'),
      actionType: isTakeawayOrder ? 'TAKEAWAY_ORDER_PLACED' : (isAddonOrder ? 'ORDER_ADDON_PLACED' : (isWaiterOrder ? 'ORDER_PLACED_WAITER' : 'ORDER_PLACED_QR')),
      amount: newOrder.total || newOrder.total_amount || 0,
      paymentMethod: finalOrder.payment_mode || 'Cash',
      details: isTakeawayOrder
        ? `Counter Takeaway order #${finalOrder.id} placed for ${finalOrder.customer_name} (${finalOrder.items_summary}) — ₹${finalOrder.total}`
        : `${actionLabel} placed at Table ${finalOrder.table_number} by ${isWaiterOrder ? `Waiter ${newOrder.placed_by_waiter_name || 'Staff'}` : (finalOrder.customer_name || 'Guest')} (+${newOrder.items_summary}) — Continuous Bill: ₹${finalOrder.total}`,
      type: 'order',
      color: isTakeawayOrder ? 'purple' : (isWaiterOrder ? 'indigo' : (isAddonOrder ? 'blue' : 'orange'))
    });

    // Kitchen & Admin audible chime and clear voice alert for the exact table
    if (isStaffSession) {
      if (userRole === 'chef' || userRole === 'admin') {
        triggerStaffOrderNotification({
          tableNumber: isTakeawayOrder ? 'Takeaway' : (finalOrder.table_number || '01'),
          orderNumber: finalOrder.id || '',
          itemsSummary: isAddonOrder ? (newOrder.items_summary || 'Add-on round') : finalOrder.items_summary,
          customerName: finalOrder.customer_name || (isTakeawayOrder ? 'Walk-in Customer' : 'Guest'),
          isAddon: isAddonOrder,
          paymentMode: finalOrder.payment_mode
        });
      } else if (userRole === 'waiter') {
        playSound('waiter');
      }

      // Display floating staff banner toast on the POS
      setActiveToast({
        title: isTakeawayOrder
          ? '📦 New Counter Takeaway Order!'
          : (isAddonOrder ? `💧 Table ${finalOrder.table_number} Add-On Added to Bill (Round ${roundNumber})!` : `🔔 Table ${finalOrder.table_number} New Order!`),
        message: isTakeawayOrder
          ? `${finalOrder.customer_name || 'Walk-in Customer'}: ${finalOrder.items_summary} • Total: ₹${finalOrder.total}`
          : `${finalOrder.customer_name || 'Guest'}: Added ${newOrder.items_summary} • Continuous Bill: ₹${finalOrder.total}`,
        type: isTakeawayOrder ? 'success' : (isAddonOrder ? 'info' : 'success')
      });
    }

    // 1.5 Fresh orders and add-ons start in PREPARING in the kitchen. Chef manually taps [Tap Ready] when prepared.

    // 2. DISPATCH LIVE TO SUPABASE CLOUD POSTGRESQL (table_sessions, orders, order_items, customers)
    try {
      const supaResult = await dispatchOrderToSupabase({
        table_number: isTakeawayOrder ? 'Takeaway' : finalOrder.table_number,
        channel: isTakeawayOrder ? 'Takeaway' : (finalOrder.channel || 'Dine-In'),
        order_source: isTakeawayOrder ? 'Takeaway' : (finalOrder.order_source || 'Table QR'),
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
        const enrichedOrders = updated.map(o => (o.id === finalOrder.id || matchesOrderId(o, finalOrder.id)) ? {
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
      const orderBroadcastPayload = {
        order_id: finalOrder.id,
        order_number: finalOrder.order_number || finalOrder.id,
        orderId: finalOrder.id,
        orderNumber: finalOrder.order_number || finalOrder.id,
        table_number: finalOrder.table_number,
        tableNumber: finalOrder.table_number,
        customer_name: finalOrder.customer_name,
        customerName: finalOrder.customer_name,
        items: finalOrder.items || [],
        order_items: finalOrder.items || [],
        items_summary: finalOrder.items_summary || (newOrder.items || []).map(i => `${i.qty || i.quantity || 1}x ${i.name}`).join(', '),
        subtotal: finalOrder.subtotal,
        tax: finalOrder.tax,
        total: finalOrder.total || finalOrder.total_amount || 0,
        status: finalOrder.status,
        payment_mode: finalOrder.payment_mode || 'Cash',
        is_addon: isAddonOrder,
        round: roundNumber,
        newly_added_items: finalOrder.newly_added_items || [],
        last_addon_at: finalOrder.last_addon_at || new Date().toISOString(),
        placed_at: new Date().toISOString()
      };

      alertChannel.send({
        type: 'broadcast',
        event: 'new_order_placed',
        payload: orderBroadcastPayload
      });
      alertChannel.send({
        type: 'broadcast',
        event: 'order_items_updated',
        payload: orderBroadcastPayload
      });
    } catch (bcErr) {
      console.warn('[SUPABASE] Broadcast new_order_placed notice:', bcErr);
    }

      return finalOrder.id;
    } catch (orderPlacementError) {
      console.error('[ORDER] Critical failure in handlePlaceCustomerOrder:', orderPlacementError);
      setActiveToast({
        title: '⚠️ Order Notice',
        message: `Order could not be saved: ${orderPlacementError?.message || 'Internal processing error'}`,
        type: 'error'
      });
      return null;
    }
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
    const digits = cleanNumber.replace(/\D/g, '');

    // Clear from deleted tables tombstone list if re-adding
    try {
      const rawDel = localStorage.getItem('restaurant_deleted_tables');
      if (rawDel) {
        let arr = JSON.parse(rawDel);
        if (Array.isArray(arr)) {
          arr = arr.filter(x => {
            const s = String(x).trim().toUpperCase();
            const d = s.replace(/\D/g, '');
            if (s === cleanNumber) return false;
            if (digits && d && digits === d) return false;
            return true;
          });
          localStorage.setItem('restaurant_deleted_tables', JSON.stringify(arr));
        }
      }
    } catch (e) {}

    const tableObj = {
      id: cleanNumber,
      number: cleanNumber,
      capacity: parseInt(tableData.capacity, 10) || 4,
      status: 'available',
      current_order_id: null,
      timing: null
    };

    const updated = [...tables.filter(t => {
      const tNum = String(t.number || '').trim().toUpperCase();
      const tDigits = tNum.replace(/\D/g, '');
      if (tNum === cleanNumber) return false;
      if (digits && tDigits && digits === tDigits) return false;
      return true;
    }), tableObj].sort((a, b) => {
      const numA = parseInt(String(a.number).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.number).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    setTables(updated);
    setLocalStore('tables', updated);

    // PERMANENT CLOUD PERSISTENCE: Save directly to Supabase Cloud PostgreSQL
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
      details: `Added new dining table ${cleanNumber} (Capacity: ${tableObj.capacity})`,
      type: 'table',
      color: 'blue'
    });
    playSound('success');
  };

  const handleDeleteTable = async (id) => {
    const cleanId = String(id || '').trim().toUpperCase();
    const targetDigits = cleanId.replace(/\D/g, '');
    const targetTable = tables.find(t => {
      const tId = String(t.id || '').trim().toUpperCase();
      const tNum = String(t.number || '').trim().toUpperCase();
      if (tId === cleanId || tNum === cleanId) return true;
      if (targetDigits) {
        const tDigits = tNum.replace(/\D/g, '') || tId.replace(/\D/g, '');
        if (tDigits && parseInt(tDigits, 10) === parseInt(targetDigits, 10)) return true;
      }
      return false;
    });

    const tableNum = targetTable?.number || cleanId;
    if (!window.confirm(`Are you sure you want to permanently delete Table ${tableNum}?`)) {
      return;
    }

    // 1. Immediately record in deleted tombstone list
    try {
      const rawDel = localStorage.getItem('restaurant_deleted_tables');
      const arr = rawDel ? JSON.parse(rawDel) : [];
      arr.push(tableNum);
      if (cleanId) arr.push(cleanId);
      if (targetDigits) arr.push(targetDigits, `T${targetDigits}`, `T-${targetDigits.padStart(2, '0')}`);
      localStorage.setItem('restaurant_deleted_tables', JSON.stringify(Array.from(new Set(arr))));
    } catch (e) {}

    // 2. Filter out immediately from local state & storage
    const updated = tables.filter(t => {
      const tId = String(t.id || '').trim().toUpperCase();
      const tNum = String(t.number || '').trim().toUpperCase();
      if (tId === cleanId || tNum === cleanId || tNum === String(tableNum).toUpperCase()) return false;
      if (targetDigits) {
        const tDigits = tNum.replace(/\D/g, '') || tId.replace(/\D/g, '');
        if (tDigits && parseInt(tDigits, 10) === parseInt(targetDigits, 10)) return false;
      }
      return true;
    });
    setTables(updated);
    setLocalStore('tables', updated);

    playSound('trash');

    // 3. PERMANENT CLOUD PERSISTENCE: Delete directly from Supabase Cloud PostgreSQL
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

  const handleDeleteOrders = async (orderIdsOrNumbers = []) => {
    if (!orderIdsOrNumbers || orderIdsOrNumbers.length === 0) return;

    const idsSet = new Set(orderIdsOrNumbers.map(x => String(x || '').toLowerCase().replace('#', '').trim()));
    
    // Find affected orders to know which tables were occupied
    const affectedOrders = (orders || []).filter(o => {
      const ordId = String(o.id || '').toLowerCase().replace('#', '').trim();
      const ordNum = String(o.order_number || '').toLowerCase().replace('#', '').trim();
      const ordDbId = String(o.supabase_order_id || '').toLowerCase().replace('#', '').trim();
      return idsSet.has(ordId) || idsSet.has(ordNum) || idsSet.has(ordDbId);
    });

    const updatedOrders = (orders || []).filter(o => {
      const ordId = String(o.id || '').toLowerCase().replace('#', '').trim();
      const ordNum = String(o.order_number || '').toLowerCase().replace('#', '').trim();
      const ordDbId = String(o.supabase_order_id || '').toLowerCase().replace('#', '').trim();
      return !idsSet.has(ordId) && !idsSet.has(ordNum) && !idsSet.has(ordDbId);
    });

    setOrders(updatedOrders);
    setLocalStore('orders', updatedOrders);
    try {
      localStorage.setItem('atmiya_orders', JSON.stringify(updatedOrders));
    } catch (e) {}

    // Clean seen orders
    setSeenOrderIds(prev => (prev || []).filter(id => !idsSet.has(String(id).toLowerCase().replace('#', '').trim())));

    // Check affected dining tables and vacate them if they have no other active orders
    const affectedTables = Array.from(new Set(
      affectedOrders.map(o => o.table_number).filter(t => t && String(t).toLowerCase() !== 'takeaway' && String(t).toLowerCase() !== 'quick pos')
    ));

    affectedTables.forEach(tNum => {
      const remainingTableOrders = updatedOrders.filter(o => 
        String(o.table_number).toLowerCase().trim() === String(tNum).toLowerCase().trim() &&
        o.status !== 'Cancelled' && o.status !== 'Completed' && o.status !== 'Served'
      );
      if (remainingTableOrders.length === 0) {
        handleVacateTable(tNum);
      }
    });

    playSound('trash');

    setActiveToast({
      title: '🗑️ Order(s) Permanently Deleted',
      message: `Permanently removed ${orderIdsOrNumbers.length} order(s) from Supabase Cloud DB.`,
      type: 'success'
    });

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Orders',
      actionType: 'ORDERS_DELETED',
      details: `Permanently deleted ${orderIdsOrNumbers.length} order(s) from Cloud DB (${orderIdsOrNumbers.slice(0, 5).join(', ')})`,
      type: 'order',
      color: 'rose'
    });

    // Cloud DB deletion (order_items, orders, table_sessions)
    try {
      await permanentlyDeleteOrdersFromSupabase(orderIdsOrNumbers);
    } catch (err) {
      console.warn('Error deleting orders from Supabase:', err);
    }
  };

  const handleResetDashboardData = async (mode = 'today') => {
    playSound('alert');

    if (mode === 'all') {
      // 1. Wipe all orders locally
      setOrders([]);
      setLocalStore('orders', []);
      try {
        localStorage.removeItem('atmiya_orders');
        localStorage.removeItem('kds_cleared_order_ids');
      } catch (e) {}
      setSeenOrderIds([]);
      setServiceCalls([]);
      setLocalStore('service_calls', []);

      // 2. Vacate all dining tables
      const vacatedTables = tables.map(t => ({
        ...t,
        status: 'available',
        current_order_id: null,
        current_customer_name: null,
        current_customer_phone: null,
        timing: null,
        food_delivered_at: null,
        turnover_notified: false
      }));
      setTables(vacatedTables);
      setLocalStore('tables', vacatedTables);

      recordEmployeeActivity({
        employeeName: authUser?.name || 'Admin',
        employeeRole: authUser?.role || 'Admin',
        tableNumber: 'Dashboard',
        actionType: 'DATA_FACTORY_RESET',
        details: 'Full operational factory reset executed (All orders wiped; Menu 100% preserved)',
        type: 'system',
        color: 'rose'
      });

      setActiveToast({
        title: '✨ Full Operational Reset Completed',
        message: 'All orders, sessions, and live queues wiped. Menu items 100% preserved.',
        type: 'success'
      });

      // 3. Purge from Supabase Cloud
      try {
        await purgeAllOrdersFromSupabaseCloud();
      } catch (err) {
        console.warn('Error purging all orders from Supabase:', err);
      }
    } else {
      // Mode === 'today'
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startMs = startOfToday.getTime();

      // Filter out today's orders
      const remainingOrders = (orders || []).filter(o => {
        const t = new Date(o.placed_at || o.time || o.created_at).getTime();
        return !isNaN(t) && t < startMs;
      });

      setOrders(remainingOrders);
      setLocalStore('orders', remainingOrders);
      try {
        localStorage.setItem('atmiya_orders', JSON.stringify(remainingOrders));
      } catch (e) {}

      // Vacate active dining tables that only had orders from today
      const vacatedTables = tables.map(t => ({
        ...t,
        status: 'available',
        current_order_id: null,
        current_customer_name: null,
        current_customer_phone: null,
        timing: null,
        food_delivered_at: null,
        turnover_notified: false
      }));
      setTables(vacatedTables);
      setLocalStore('tables', vacatedTables);

      recordEmployeeActivity({
        employeeName: authUser?.name || 'Admin',
        employeeRole: authUser?.role || 'Admin',
        tableNumber: 'Dashboard',
        actionType: 'TODAY_QUEUE_RESET',
        details: "Reset today's orders queue and floor occupancy (Menu preserved)",
        type: 'system',
        color: 'orange'
      });

      setActiveToast({
        title: "✨ Today's Operational Queue Reset",
        message: "Today's live queue cleared and tables vacated. Previous days preserved.",
        type: 'success'
      });

      // Cloud purge today
      try {
        await purgeTodayOrdersFromSupabaseCloud();
      } catch (err) {
        console.warn('Error purging today orders from Supabase:', err);
      }
    }

    refreshOrdersFromSupabase();
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
    const safeItemId = ensureValidUuid(updatedItem.id);
    const matchedCategory = categories.find(c => 
      (updatedItem.category && c.name.toLowerCase().trim() === updatedItem.category.toLowerCase().trim()) || 
      (updatedItem.category_id && c.id === updatedItem.category_id)
    );
    const resolvedCatId = matchedCategory?.id || (isValidUuid(updatedItem.category_id) ? updatedItem.category_id : null);
    const resolvedCatName = matchedCategory?.name || (updatedItem.category && updatedItem.category.trim()) || 'Uncategorized';

    const normalized = {
      ...updatedItem,
      id: safeItemId,
      category: resolvedCatName,
      category_id: resolvedCatId,
      image_url: photoUrl,
      image: photoUrl,
      imageUrl: photoUrl,
      photo: photoUrl,
      cuisine: determinedCuisine,
      is_available: updatedItem.is_available !== false,
      isAvailable: updatedItem.is_available !== false
    };

    const matchesUpdated = (item) => (
      (item.id && (item.id === updatedItem.id || item.id === safeItemId)) ||
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

    // Cloud persistence via supabaseAdmin & backend
    await saveMenuItemToSupabaseCloud(normalized, resolvedCatId);

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin Owner',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'MENU_ITEM_UPDATED',
      details: `Updated dish "${normalized.name}" (Price: ₹${normalized.finalPrice || normalized.price}, Category: ${resolvedCatName}) with photo`,
      type: 'menu',
      color: 'orange'
    });
    playSound('success');
  };

  const handleAddMenuItem = async (itemData) => {
    const photoUrl = itemData.image_url || itemData.image || itemData.imageUrl || itemData.photo || null;
    const determinedCuisine = itemData.cuisine || getDishCuisine(itemData);
    const priceNum = Number(itemData.price);
    const itemId = ensureValidUuid(itemData.id);
    const matchedCategory = categories.find(c => 
      (itemData.category && c.name.toLowerCase().trim() === itemData.category.toLowerCase().trim()) || 
      (itemData.category_id && c.id === itemData.category_id)
    );
    const resolvedCatId = matchedCategory?.id || (isValidUuid(itemData.category_id) ? itemData.category_id : null);
    const resolvedCatName = matchedCategory?.name || (itemData.category && itemData.category.trim()) || 'Uncategorized';

    const itemObj = {
      ...itemData,
      id: itemId,
      category: resolvedCatName,
      category_id: resolvedCatId,
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
      localStorage.removeItem('restaurant_menu_cleared');
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updated));
    } catch (e) {}

    // Dispatch update events for instant customer & staff synchronization
    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updated } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

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

    // Cloud Authoritative persistence to Supabase PostgreSQL & Backend
    await saveMenuItemToSupabaseCloud(itemObj, resolvedCatId);

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

  const handleDeleteMenuItem = async (id) => {
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

    // Asynchronous cloud delete from Supabase Cloud & Backend API
    await deleteMenuItemFromSupabaseCloud(id);

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

  const handleAddCategory = async (categoryData) => {
    const catName = (categoryData.name || '').trim();
    if (!catName) return null;
    const catId = ensureValidUuid(categoryData.id);
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

    // Cloud Authoritative persistence to Supabase Cloud & Backend
    await saveCategoryToSupabaseCloud(newCategory);

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

  const handleUpdateCategory = async (categoryId, updatedData) => {
    const safeCatId = ensureValidUuid(categoryId);
    const oldCat = categories.find(c => c.id === categoryId || c.id === safeCatId);
    if (!oldCat) return;
    const oldName = oldCat.name;
    const newName = (updatedData.name || oldName).trim();
    const photoUrl = updatedData.image_url !== undefined ? updatedData.image_url : (oldCat.image_url || oldCat.imageUrl || null);

    const updatedCat = {
      ...oldCat,
      ...updatedData,
      id: safeCatId,
      name: newName,
      gujarati: (updatedData.gujarati || updatedData.gujarati_name || oldCat.gujarati || newName).trim(),
      image_url: photoUrl,
      imageUrl: photoUrl,
      image: photoUrl,
      photo: photoUrl
    };

    const updatedCats = categories.map(c => (c.id === categoryId || c.id === safeCatId) ? updatedCat : c);
    setCategories(updatedCats);
    setLocalStore('categories', updatedCats);
    try {
      localStorage.setItem('restaurant_categories', JSON.stringify(updatedCats));
      localStorage.setItem('atmiya_categories', JSON.stringify(updatedCats));
    } catch (e) {}

    if (oldName !== newName) {
      const updatedDishes = menuItems.map(item => {
        if (item.category === oldName || item.category_id === safeCatId) {
          return { ...item, category: newName, category_id: safeCatId };
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

    // Cloud Authoritative persistence
    await saveCategoryToSupabaseCloud(updatedCat);

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

  const handleDeleteCategory = async (categoryId) => {
    const safeCatId = ensureValidUuid(categoryId);
    const targetCat = categories.find(c => 
      c.id === categoryId || 
      c.id === safeCatId || 
      (c.name && c.name.toLowerCase().trim() === String(categoryId).toLowerCase().trim())
    );
    if (!targetCat) return;

    const remainingCats = categories.filter(c => 
      c.id !== targetCat.id && 
      c.id !== safeCatId && 
      c.name.toLowerCase().trim() !== targetCat.name.toLowerCase().trim()
    );
    setCategories(remainingCats);
    setLocalStore('categories', remainingCats);
    try {
      localStorage.setItem('restaurant_categories', JSON.stringify(remainingCats));
      localStorage.setItem('atmiya_categories', JSON.stringify(remainingCats));
    } catch (e) {}

    const fallbackCat = remainingCats.length > 0 ? remainingCats[0] : null;
    const fallbackCatName = fallbackCat ? fallbackCat.name : 'Uncategorized';
    const fallbackCatId = fallbackCat ? fallbackCat.id : null;

    const updatedDishes = menuItems.map(item => {
      if (
        (item.category && item.category.toLowerCase().trim() === targetCat.name.toLowerCase().trim()) || 
        item.category_id === targetCat.id || 
        item.category_id === safeCatId
      ) {
        return { ...item, category: fallbackCatName, category_id: fallbackCatId };
      }
      return item;
    });
    setMenuItems(updatedDishes);
    setLocalStore('menu_items', updatedDishes);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updatedDishes));
      localStorage.setItem('restaurant_menu_items', JSON.stringify(updatedDishes));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('atmiya_categories_updated', { detail: { categories: remainingCats } }));
    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updatedDishes } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    // Cloud delete from Supabase Cloud (passes fallbackCatId to avoid foreign key errors)
    await deleteCategoryFromSupabaseCloud(targetCat.id || safeCatId, fallbackCatId);

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'CATEGORY_DELETED',
      details: `Deleted category "${targetCat.name}"`,
      type: 'menu',
      color: 'rose'
    });
    playSound('trash');
  };

  const handleAssignDishesToCategory = async (dishIds, targetCatId, targetCatName) => {
    if (!dishIds || !Array.isArray(dishIds) || dishIds.length === 0) return;

    // Resolve category against existing categories list
    const matchedCategory = categories.find(c => 
      (targetCatId && c.id === targetCatId) || 
      (targetCatName && (c.name || '').toLowerCase().trim() === targetCatName.toLowerCase().trim())
    );
    const resolvedCatId = matchedCategory?.id || (isValidUuid(targetCatId) ? targetCatId : null);
    const resolvedCatName = matchedCategory?.name || targetCatName || 'Uncategorized';

    const updatedDishes = menuItems.map(item => {
      if (dishIds.includes(item.id)) {
        return {
          ...item,
          category: resolvedCatName,
          category_id: resolvedCatId
        };
      }
      return item;
    });
    setMenuItems(updatedDishes);
    setLocalStore('menu_items', updatedDishes);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updatedDishes));
      localStorage.setItem('restaurant_menu_items', JSON.stringify(updatedDishes));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updatedDishes } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    try {
      supabase.channel('restaurant_alerts').send({
        type: 'broadcast',
        event: 'category_dishes_reassigned',
        payload: { dishIds, category_id: resolvedCatId, category_name: resolvedCatName }
      });
    } catch (e) {}

    await assignDishesToCategoryCloud(dishIds, resolvedCatId, resolvedCatName);

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'CATEGORY_UPDATED',
      details: `Assigned ${dishIds.length} dishes to category "${resolvedCatName}"`,
      type: 'menu',
      color: 'emerald'
    });
    playSound('success');
  };

  const handleUnassignDishFromCategory = async (dishId) => {
    const updatedDishes = menuItems.map(item => {
      if (item.id === dishId) {
        return {
          ...item,
          category: 'Uncategorized',
          category_id: null
        };
      }
      return item;
    });
    setMenuItems(updatedDishes);
    setLocalStore('menu_items', updatedDishes);
    try {
      localStorage.setItem('atmiya_menu_items', JSON.stringify(updatedDishes));
      localStorage.setItem('restaurant_menu_items', JSON.stringify(updatedDishes));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('atmiya_menu_updated', { detail: { items: updatedDishes } }));
    window.dispatchEvent(new Event('restaurant_data_updated'));

    await assignDishesToCategoryCloud([dishId], null);
    playSound('trash');
  };

  const handleClearAllMenuAndCategories = async () => {
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

    // Cloud Authoritative Purge
    await purgeAllMenuFromSupabase();

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

  // Direct Table Vacate (Used by Admin Table Operations, Floor Waiters & Dashboard)
  const handleVacateTable = async (tableNum, paymentMethod = 'Cash') => {
    const cleanMethod = (String(paymentMethod || '').trim().toUpperCase() === 'UPI' || String(paymentMethod || '').trim().toUpperCase() === 'ONLINE') ? 'UPI' : 'Cash';
    const supaMethod = cleanMethod === 'UPI' ? 'UPI_COUNTER' : 'CASH';

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

    const isOrderForTable = (o) => {
      if (!o) return false;
      const oTblCode = normalizeTbl(o.table_number);
      if (oTblCode && targetTblCode && oTblCode === targetTblCode) return true;
      if (String(o.table_number || '').trim().toLowerCase() === String(tableNum || '').trim().toLowerCase()) return true;
      return false;
    };

    // Complete any active orders for this table, set payment method & remove all hold flags
    const updatedOrders = orders.map(o => {
      if (isOrderForTable(o) && o.status !== 'Cancelled') {
        return {
          ...o,
          status: 'Completed',
          payment_status: 'Paid',
          payment_mode: o.payment_verified_online ? (o.payment_mode || cleanMethod) : cleanMethod,
          paid_collected_by: authUser?.name || 'Staff',
          settled_at: o.settled_at || new Date().toISOString(),
          completed_at: o.completed_at || new Date().toISOString(),
          session_id: null,
          current_session_id: null,
          items: (o.items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'served' })),
          order_items: (o.order_items || []).map(it => ({ ...it, is_served: true, kitchen_status: 'served', status: 'SERVED' })),
          on_hold: false,
          is_hold: false,
          hold: false,
          table_held: false,
          kitchen_status: 'served',
          kds_cleared: true
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    setLocalStore('orders', updatedOrders);
    try {
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
      localStorage.setItem('atmiya_orders', JSON.stringify(updatedOrders));
      window.dispatchEvent(new Event('restaurant_data_updated'));
      window.dispatchEvent(new CustomEvent('table_session_terminated', {
        detail: {
          tableNumber: tableNum,
          targetTblCode,
          paymentMethod: cleanMethod,
          sessionId: null,
          terminatedAt: new Date().toISOString()
        }
      }));
    } catch (e) {}

    // Sync session closure to Supabase Cloud with selected payment method
    settleTableSessionApi({
      tableNumber: tableNum,
      paymentMethod: cleanMethod,
      settledBy: authUser?.name || 'Staff'
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
      const orderPayload = { 
        session_id: null,
        payment_status: 'PAID', 
        payment_mode: cleanMethod,
        payment_method: supaMethod,
        settled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'COMPLETED'
      };

      // 1. Settle orders by primary IDs
      const targetOrderIds = updatedOrders
        .filter(isOrderForTable)
        .map(o => o.supabase_order_id || o.id)
        .filter(Boolean);

      if (targetOrderIds.length > 0) {
        try {
          const { error: idErr } = await supabase
            .from('orders')
            .update(orderPayload)
            .in('id', targetOrderIds);

          if (idErr) {
            await supabase
              .from('orders')
              .update({ ...orderPayload, status: 'SERVED' })
              .in('id', targetOrderIds);
          }

          await supabase
            .from('order_items')
            .update({ status: 'SERVED' })
            .in('order_id', targetOrderIds);
        } catch (itemErr) {}
      }

      if (orFilter) {
        // 2. Settle all active dining orders for this table in Supabase
        const { error: ordErr } = await supabase
          .from('orders')
          .update(orderPayload)
          .or(orFilter);

        if (ordErr) {
          // If DB check constraint restricts status to SERVED, retry with 'SERVED'
          await supabase
            .from('orders')
            .update({ ...orderPayload, status: 'SERVED' })
            .or(orFilter);
        }

        // 3. Mark restaurant_tables as VACANT (only valid column in schema)
        await supabase
          .from('restaurant_tables')
          .update({ status: 'VACANT' })
          .or(orFilter);

        // 4. Resolve table_id to close active sessions in table_sessions
        const { data: matchedTbls } = await supabase
          .from('restaurant_tables')
          .select('id')
          .or(orFilter);

        if (matchedTbls && matchedTbls.length > 0) {
          const tIds = matchedTbls.map(t => t.id);
          await supabase
            .from('table_sessions')
            .update({ 
              status: 'COMPLETED', 
              payment_method: supaMethod,
              payment_status: 'PAID',
              closed_at: new Date().toISOString() 
            })
            .in('table_id', tIds)
            .eq('status', 'ACTIVE');
        }
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

    playSound('cash');

    const cleanCall = {
      id: `clean_${targetTblCode}_${Date.now()}`,
      tableNumber: tableNum,
      type: 'table_clean',
      label: `🧹 Table Vacated — Clean & Reset Table ${tableNum}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      status: 'pending',
      dispatchedBy: authUser?.name || 'Staff',
      priority: 'high'
    };

    // Realtime broadcast to all waiter and kitchen devices
    try {
      const channel = supabase.channel('restaurant_alerts');
      channel.send({
        type: 'broadcast',
        event: 'service_call',
        payload: cleanCall
      }).catch(err => console.warn('Realtime cleaning broadcast error:', err));

      channel.send({
        type: 'broadcast',
        event: 'table_updated',
        payload: { tableNumber: tableNum, status: 'available' }
      }).catch(err => console.warn('Realtime table update broadcast error:', err));

      channel.send({
        type: 'broadcast',
        event: 'table_session_settled',
        payload: { tableNumber: tableNum, sessionId: null, targetTblCode }
      }).catch(err => console.warn('Realtime table settlement broadcast error:', err));

      channel.send({
        type: 'broadcast',
        event: 'table_session_terminated',
        payload: { tableNumber: tableNum, sessionId: null, targetTblCode }
      }).catch(err => console.warn('Realtime table termination broadcast error:', err));
    } catch (err) {
      console.warn('Realtime cleaning broadcast error:', err);
    }

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Staff',
      employeeRole: authUser?.role || 'Staff',
      tableNumber: tableNum,
      actionType: 'TABLE_VACATED_CLEAN_DISPATCH',
      details: `Table ${tableNum} vacated & settled via ${cleanMethod} by ${authUser?.name || 'Staff'}. Payment recorded in order.`,
      type: 'table',
      color: 'emerald'
    });

    setActiveToast({
      title: `🟢 Table ${tableNum} Vacated & Settled`,
      message: `Table marked empty. Payment recorded via ${cleanMethod}.`,
      type: 'success'
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
      CLEAN: 'Table Cleaning',
      CANCEL_REQUEST: 'Order Cancel / Edit Request (5m Window)',
      cancel_request: 'Order Cancel / Edit Request (5m Window)'
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
      label: labels[type] || 'Floor Assistance',
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

    // 2. Play service chime or cleaning/cancel siren
    if (type === 'CLEAN' || String(type).toLowerCase().includes('clean') || String(type).toLowerCase().includes('cancel')) {
      playSound('alert');
      if (type === 'CLEAN') speakTableCleanAlert(cleanTbl);
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
    const readyItems = (o.items || []).filter(i => (i.kitchen_status === 'ready' || i.kitchen_status === 'prepared') && !i.is_served);
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

              {/* Voice Notification Toggle Button */}
              <button
                type="button"
                onClick={handleToggleVoiceNotifications}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                  isVoiceEnabled
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'
                }`}
                title={isVoiceEnabled ? 'Voice Alerts Active (Click to Mute Voice)' : 'Voice Alerts Muted (Click to Enable Voice)'}
                aria-label="Toggle Voice Alerts"
              >
                {isVoiceEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                    <span className="hidden md:inline font-mono text-[11px] font-black uppercase text-emerald-800">Voice: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="hidden md:inline font-mono text-[11px] font-black uppercase text-slate-500">Voice: OFF</span>
                  </>
                )}
              </button>

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
                onResetDashboardData={handleResetDashboardData}
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
                isVoiceEnabled={isVoiceEnabled}
                onToggleVoiceNotifications={handleToggleVoiceNotifications}
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
                onCancelOrder={handleCancelOrderWithReason}
                onUpdateOrderItems={handleUpdateOrderItems}
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
              onCancelOrder={handleCancelOrderWithReason}
              onUpdateOrderItems={handleUpdateOrderItems}
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
              tables={tables}
              seenOrderIds={seenOrderIds}
              onMarkOrderAsSeen={markOrderAsSeen}
              onMarkAllOrdersAsSeen={markAllCurrentOrdersAsSeen}
              onUpdateStatus={handleUpdateOrderStatus}
              onMarkCashPaymentDone={handleMarkCashPaymentDone}
              onCancelOrderWithReason={handleCancelOrderWithReason}
              onAddNewOrder={() => setViewMode('customer')}
              onDeleteOrders={handleDeleteOrders}
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
              isVoiceEnabled={isVoiceEnabled}
              onToggleVoiceNotifications={handleToggleVoiceNotifications}
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
              onAssignDishesToCategory={handleAssignDishesToCategory}
              onUnassignDishFromCategory={handleUnassignDishFromCategory}
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
