import React, { useState, useEffect } from 'react';
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
  Package,
  Zap,
  BellRing,
  Moon
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
  INITIAL_INVENTORY,
  INITIAL_SERVICE_CALLS,
  INITIAL_CUSTOMERS,
  saveCustomerProfile,
  addCustomerLoyaltyPoints,
  recordEmployeeActivity
} from './lib/appwrite';
import { 
  supabase, 
  RESTAURANT_ID, 
  dispatchOrderToSupabase, 
  updateOrderStatusInSupabase, 
  settleTableSessionInSupabase, 
  fetchLiveOrdersFromSupabase,
  normalizeTableNumber
} from './lib/supabase';
import { getTranslation } from './lib/translations';
import { playSound } from './lib/sound';
import { registerServiceWorker, triggerStaffOrderNotification } from './lib/notifications';

import AuthPage from './components/auth/AuthPage';
import ExecutiveDashboard from './components/admin/ExecutiveDashboard';
import OrdersView from './components/admin/OrdersView';
import KitchenPanelView from './components/admin/KitchenPanelView';
import TablesView from './components/admin/TablesView';
import MenuManagementView from './components/admin/MenuManagementView';
import EmployeesView from './components/admin/EmployeesView';
import ReportsAnalytics from './components/admin/ReportsAnalytics';
import OffersView from './components/admin/OffersView';
import QRManagementView from './components/admin/QRManagementView';
import SettingsView from './components/admin/SettingsView';
import InventoryView from './components/admin/InventoryView';
import QuickPosModal from './components/admin/QuickPosModal';
import CustomerCRM from './components/admin/CustomerCRM';

import CustomerMenu from './components/CustomerMenu';

export default function App() {
  // Check if opened via QR code scanning (e.g. ?table=T04)
  const urlParams = new URLSearchParams(window.location.search);
  const scannedTable = urlParams.get('table');

  const [viewMode, setViewMode] = useState(scannedTable ? 'customer' : 'admin'); // 'admin' or 'customer'
  const [currentTable, setCurrentTable] = useState(scannedTable || 'T04');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, orders, kitchen, tables, menu, employees, reports, offers, qr, settings
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication State
  const [authUser, setAuthState] = useState(() => getLocalStore('auth_user', null));

  // Global State (persisted & synchronized)
  const [settings, setSettings] = useState(() => getLocalStore('settings', INITIAL_SETTINGS));
  const [currentLang, setCurrentLang] = useState(settings?.language || 'en');
  // 100% Clean White Classic Theme Only (No Dark / Sapphire Mode)
  const [theme, setThemeState] = useState('light');
  const setTheme = () => {
    setThemeState('light');
    setLocalStore('app_theme', 'light');
  };
  const [tables, setTables] = useState(() => getLocalStore('tables', INITIAL_TABLES));
  const [categories, setCategories] = useState(() => getLocalStore('categories', INITIAL_CATEGORIES));
  const [menuItems, setMenuItems] = useState(() => getLocalStore('menu_items', INITIAL_MENU_ITEMS));
  const [orders, setOrders] = useState(() => getLocalStore('orders', INITIAL_ORDERS));
  const [activity, setActivity] = useState(() => getLocalStore('activity', INITIAL_ACTIVITY));
  const [employees, setEmployees] = useState(() => getLocalStore('employees', INITIAL_EMPLOYEES));
  const [coupons, setCoupons] = useState(() => getLocalStore('coupons', INITIAL_COUPONS));
  const [inventory, setInventory] = useState(() => getLocalStore('inventory', INITIAL_INVENTORY));
  const [serviceCalls, setServiceCalls] = useState(() => getLocalStore('service_calls', INITIAL_SERVICE_CALLS));
  const [customers, setCustomers] = useState(() => getLocalStore('customers', INITIAL_CUSTOMERS));

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [showQuickPos, setShowQuickPos] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('Wed, 15 Oct 2025 | 11:42 AM');

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
    setInventory(getLocalStore('inventory', INITIAL_INVENTORY));
    setServiceCalls(getLocalStore('service_calls', INITIAL_SERVICE_CALLS));
    setCustomers(getLocalStore('customers', INITIAL_CUSTOMERS));
    setAuthState(getLocalStore('auth_user', null));
  };

  useEffect(() => {
    window.addEventListener('restaurant_data_updated', loadFreshState);
    return () => window.removeEventListener('restaurant_data_updated', loadFreshState);
  }, []);

  // Register Service Worker on mount for mobile lock screen & background push notifications
  useEffect(() => {
    registerServiceWorker();

    // Purge old mock demo orders from localStorage so only authentic Supabase orders exist
    const cachedOrders = getLocalStore('orders', []);
    const demoIds = new Set(['#ORD1048', '#ORD1047', '#ORD1046', '#ORD1045', '#ORD1044', '#ORD1043', '#ORD1042', '#ORD1041', '#ORD1049', '#ORD1050', 'ORD-TEST-001', 'ORD-TEST-999', 'ORD-T04-1001']);
    const cleaned = cachedOrders.filter(o => !demoIds.has(o.id) && !demoIds.has(o.order_number));
    if (cleaned.length !== cachedOrders.length) {
      setLocalStore('orders', cleaned);
      setOrders(cleaned);
    }
  }, []);

  // Live Supabase Synchronization Hook (keeps QR Menu, Admin POS & Kitchen in 100% real-time sync)
  useEffect(() => {
    let orderChannel = null;

    const mapDbOrderToFrontend = (dbOrd) => {
      const isOnline = dbOrd.payment_method === 'UPI_COUNTER' || dbOrd.payment_method === 'ONLINE_RAZORPAY';
      const statusDisplayMap = {
        'PLACED': 'Placed',
        'PREPARING': 'Preparing',
        'READY': 'Ready',
        'SERVED': 'Completed',
        'CANCELLED': 'Cancelled'
      };
      const itms = (dbOrd.order_items || []).map(i => ({
        id: i.id,
        name: i.item_name,
        price: parseFloat(i.unit_price) || 0,
        qty: i.quantity || 1
      }));
      return {
        id: dbOrd.order_number?.startsWith('#') ? dbOrd.order_number : `#${dbOrd.order_number}`,
        supabase_order_id: dbOrd.id,
        session_id: dbOrd.session_id,
        table_number: dbOrd.table_number,
        customer_name: dbOrd.customer_name || 'Walk-in Guest',
        customer_phone: dbOrd.customer_phone || '',
        items: itms,
        items_summary: itms.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Dishes',
        subtotal: parseFloat(dbOrd.subtotal) || 0,
        tax: parseFloat(dbOrd.tax_amount) || 0,
        discount: parseFloat(dbOrd.discount_amount) || 0,
        total: parseFloat(dbOrd.total_amount) || 0,
        total_amount: parseFloat(dbOrd.total_amount) || 0,
        status: statusDisplayMap[dbOrd.status] || dbOrd.status || 'Preparing',
        channel: 'Dine-In QR',
        time: dbOrd.placed_at ? new Date(dbOrd.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
        payment_mode: isOnline ? 'UPI' : 'Cash',
        payment_status: dbOrd.payment_status === 'PAID' ? 'Paid' : 'Pending Cash',
        payment_verified_online: isOnline,
        special_note: dbOrd.special_notes || ''
      };
    };

    async function syncFromSupabase() {
      try {
        const { data: supaCategories, error: catErr } = await supabase
          .from('menu_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        const { data: supaItems, error: itemErr } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true);

        if (!catErr && supaCategories && supaCategories.length > 0) {
          const catMap = {};
          supaCategories.forEach(c => { catMap[c.id] = c.name; });

          if (!itemErr && supaItems && supaItems.length > 0) {
            const mappedItems = supaItems.map((item, idx) => ({
              id: item.id,
              name: item.name,
              english_name: item.name,
              gujarati_name: item.gujarati_name || item.name,
              category: catMap[item.category_id] || 'Other',
              price: parseFloat(item.price) || 0,
              originalPrice: parseFloat(item.price) || 0,
              finalPrice: parseFloat(item.price) || 0,
              hasDiscount: false,
              discountPercent: 0,
              description: item.description || '',
              image_url: item.image_url || null,
              is_veg: true,
              is_spicy: (item.name || '').toLowerCase().includes('sezwan') || 
                        (item.name || '').toLowerCase().includes('chilly') || 
                        (item.name || '').toLowerCase().includes('garlic'),
              is_available: item.is_available,
              orders_count: 20 + (idx % 30),
              prepTimeMins: item.prep_time_mins || 10,
              rating: 4.8,
              notes: ''
            }));

            setMenuItems(mappedItems);
            setLocalStore('menu_items', mappedItems);

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

        // Live Orders sync from Supabase
        const dbOrders = await fetchLiveOrdersFromSupabase();
        if (dbOrders && dbOrders.length > 0) {
          const mappedDbOrders = dbOrders.map(mapDbOrderToFrontend);
          setOrders(prev => {
            const merged = [...mappedDbOrders];
            prev.forEach(po => {
              if (!merged.some(mo => mo.id === po.id || (po.supabase_order_id && mo.supabase_order_id === po.supabase_order_id))) {
                merged.push(po);
              }
            });
            setLocalStore('orders', merged);
            return merged;
          });
        }

        // Subscribe to live order updates from Supabase Realtime
        orderChannel = supabase
          .channel('realtime:app_orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
            console.log('[SUPABASE REALTIME] Order event:', payload?.eventType);

            // If a new order is placed from ANY phone/device, trigger spoken & lock-screen alert!
            if (payload?.eventType === 'INSERT' && payload?.new) {
              const newOrd = payload.new;
              triggerStaffOrderNotification({
                tableNumber: newOrd.table_number || '01',
                orderNumber: newOrd.order_number || '',
                customerName: newOrd.customer_name || 'Guest'
              });
            }

            const fresh = await fetchLiveOrdersFromSupabase();
            if (fresh && fresh.length > 0) {
              const mapped = fresh.map(mapDbOrderToFrontend);
              setOrders(mapped);
              setLocalStore('orders', mapped);
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
    };
  }, []);

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

  const handleLoginSuccess = (user) => {
    setAuthUser(user);
    setAuthState(user);
    if (user?.role === 'chef') {
      setActiveTab('kitchen');
    } else if (user?.role === 'waiter') {
      setActiveTab('tables');
    } else {
      setActiveTab('dashboard');
    }
    playSound('success');
  };

  const handleLogout = () => {
    logoutAuthUser();
    setAuthState(null);
  };

  // State Mutation Handlers
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    setLocalStore('orders', updated);

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Darshit Rana',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: targetOrder?.table_number || 'Kitchen',
      actionType: `ORDER_${newStatus.toUpperCase()}`,
      amount: targetOrder?.total || null,
      details: `Order #${orderId} status changed to "${newStatus}" by ${authUser?.name || 'Staff'}`,
      type: 'order',
      color: newStatus === 'Completed' ? 'emerald' : newStatus === 'Preparing' ? 'amber' : 'orange'
    });
    playSound('order');

    // Update in Supabase Cloud
    updateOrderStatusInSupabase(targetOrder?.supabase_order_id || targetOrder?.id || orderId, newStatus);
  };

  const handleMarkCashPaymentDone = (orderId, staffName) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const collector = staffName || authUser?.name || 'Anjali Patel';
    const updated = orders.map(o => o.id === orderId ? {
      ...o,
      payment_status: 'Paid',
      payment_mode: 'Cash',
      paid_collected_by: collector,
      payment_verified_online: false
    } : o);
    setOrders(updated);
    setLocalStore('orders', updated);

    recordEmployeeActivity({
      employeeName: collector,
      employeeRole: 'Cashier & POS Lead',
      tableNumber: targetOrder.table_number || 'Dine-In',
      actionType: 'PAYMENT_COLLECTED_CASH',
      amount: targetOrder.total,
      paymentMethod: 'Cash',
      details: `Cash payment of ₹${targetOrder.total} collected & confirmed for Table ${targetOrder.table_number || 'Dine-In'} by ${collector}`,
      type: 'payment',
      color: 'emerald'
    });
    playSound('success');

    // Sync to Supabase Cloud
    updateOrderStatusInSupabase(targetOrder?.supabase_order_id || targetOrder?.id || orderId, targetOrder.status || 'PLACED');
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
      cancel_reason: reason,
      cancelled_by: staff
    } : o);
    setOrders(updated);
    setLocalStore('orders', updated);

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

  const handlePlaceCustomerOrder = async (newOrder) => {
    // 0. Anti-duplicate verification: ensure this table does not already have an active order in progress
    const normalizeTbl = (val) => {
      const digits = String(val || '').replace(/[^0-9]/g, '');
      return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
    };
    const isOrderActive = (o) => {
      const st = String(o?.status || '').toLowerCase().trim();
      return st !== 'completed' && st !== 'cancelled' && st !== 'settled';
    };

    const hasActiveOrder = orders.some(o => 
      normalizeTbl(o.table_number) === normalizeTbl(newOrder.table_number) && isOrderActive(o)
    );

    if (hasActiveOrder) {
      alert(`⚠️ Table ${newOrder.table_number} already has an active order in the kitchen queue! Additional orders are locked until the current order is completed.`);
      return false;
    }

    // 1. Immediately update UI & local state for zero-latency customer UX
    const updated = [newOrder, ...orders];
    setOrders(updated);
    setLocalStore('orders', updated);

    // Update corresponding dining table status to occupied with guest info
    const updatedTables = tables.map(t => {
      if (t.number === newOrder.table_number || t.number === `Table ${newOrder.table_number}` || t.id === newOrder.table_number) {
        return {
          ...t,
          status: 'occupied',
          current_order_id: newOrder.id,
          current_customer_name: newOrder.customer_name,
          current_customer_phone: newOrder.customer_phone,
          timing: '1m'
        };
      }
      return t;
    });
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    // Permanently record customer profile in local CRM
    if (newOrder.customer_phone) {
      saveCustomerProfile({
        name: newOrder.customer_name,
        phone: newOrder.customer_phone,
        tableNumber: newOrder.table_number,
        orderId: newOrder.id,
        orderTotal: newOrder.total || newOrder.total_amount,
        items: newOrder.items || [],
        paymentMode: newOrder.payment_mode || 'UPI'
      });
      setCustomers(getLocalStore('customers', INITIAL_CUSTOMERS));
    }

    recordEmployeeActivity({
      employeeName: newOrder.customer_name || 'Guest User',
      employeeRole: 'Guest / QR Self-Order',
      tableNumber: newOrder.table_number || 'Online',
      actionType: 'ORDER_PLACED_QR',
      amount: newOrder.total,
      paymentMethod: newOrder.payment_mode || 'UPI',
      details: `Order #${newOrder.id} placed via QR at Table ${newOrder.table_number} by ${newOrder.customer_name || 'Guest'} (₹${newOrder.total})`,
      type: 'order',
      color: 'orange'
    });
    playSound('order');
    triggerStaffOrderNotification({
      tableNumber: newOrder.table_number || '01',
      orderNumber: newOrder.id || '',
      customerName: newOrder.customer_name || 'Guest'
    });

    // 2. DISPATCH LIVE TO SUPABASE CLOUD POSTGRESQL (table_sessions, orders, order_items, customers)
    try {
      const supaResult = await dispatchOrderToSupabase({
        table_number: newOrder.table_number,
        customer_name: newOrder.customer_name,
        customer_phone: newOrder.customer_phone,
        items: newOrder.items || [],
        subtotal: newOrder.subtotal || 0,
        tax: newOrder.tax || 0,
        discount: newOrder.discount || 0,
        total: newOrder.total || newOrder.total_amount || 0,
        payment_mode: newOrder.payment_mode || 'Cash',
        special_note: newOrder.special_note || '',
        order_id: newOrder.id
      });

      if (supaResult && supaResult.sessionId) {
        // Enrich local order record with Supabase Session ID and DB Order UUID
        const enrichedOrders = updated.map(o => o.id === newOrder.id ? {
          ...o,
          supabase_order_id: supaResult.order?.id || null,
          session_id: supaResult.sessionId,
          session_code: supaResult.sessionCode
        } : o);
        setOrders(enrichedOrders);
        setLocalStore('orders', enrichedOrders);
      }
    } catch (err) {
      console.warn('[SUPABASE] Cloud sync notice:', err);
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

  const handleAddTable = (tableData) => {
    const tableObj = {
      id: tableData.number,
      number: tableData.number,
      capacity: parseInt(tableData.capacity, 10),
      zone: tableData.zone,
      status: 'available',
      current_order_id: null,
      timing: null
    };
    const updated = [...tables, tableObj];
    setTables(updated);
    setLocalStore('tables', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: tableData.number,
      actionType: 'TABLE_ADDED',
      details: `Added new dining table ${tableData.number} (${tableData.zone}, Capacity: ${tableData.capacity})`,
      type: 'table',
      color: 'blue'
    });
    playSound('success');
  };

  const handleDeleteTable = (id) => {
    if (!window.confirm('Delete this dining table?')) return;
    const updated = tables.filter(t => t.id !== id);
    setTables(updated);
    setLocalStore('tables', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: id,
      actionType: 'TABLE_DELETED',
      details: `Deleted dining table ${id}`,
      type: 'table',
      color: 'rose'
    });
  };

  const handleToggleStock = (itemId) => {
    const updated = menuItems.map(item => {
      if (item.id === itemId) {
        const nextState = !item.is_available;
        recordEmployeeActivity({
          employeeName: authUser?.name || 'Admin',
          employeeRole: authUser?.role || 'Admin',
          tableNumber: 'Kitchen Store',
          actionType: nextState ? 'DISH_IN_STOCK' : 'DISH_OUT_OF_STOCK',
          details: `Dish "${item.name}" marked as ${nextState ? 'Available / In-Stock' : 'OUT OF STOCK'}`,
          type: 'menu',
          color: nextState ? 'emerald' : 'rose'
        });
        return { ...item, is_available: nextState };
      }
      return item;
    });
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
  };

  const handleApplyDiscount = (itemId, percent) => {
    const p = Number(percent) || 0;
    const updated = menuItems.map(item => {
      if (item.id === itemId) {
        const origPrice = Number(item.originalPrice || item.price || 0);
        const discountAmt = Math.round((origPrice * p) / 100);
        const finalPrice = Math.max(0, origPrice - discountAmt);
        return {
          ...item,
          originalPrice: origPrice,
          finalPrice: finalPrice,
          price: finalPrice,
          hasDiscount: true,
          discountPercent: p
        };
      }
      return item;
    });
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    const affectedItem = menuItems.find(i => i.id === itemId);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Darshit Rana',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISCOUNT_APPLIED',
      details: `Applied ${p}% discount on "${affectedItem?.name || itemId}" (Discounted Price: ₹${Math.max(0, Math.round((affectedItem?.originalPrice || affectedItem?.price || 0) * (1 - p/100)))})`,
      type: 'menu',
      color: 'rose'
    });
    playSound('success');
  };

  const handleRemoveDiscount = (itemId) => {
    const updated = menuItems.map(item => {
      if (item.id === itemId) {
        const origPrice = Number(item.originalPrice || item.price || 0);
        return {
          ...item,
          finalPrice: origPrice,
          price: origPrice,
          hasDiscount: false,
          discountPercent: 0
        };
      }
      return item;
    });
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    const affectedItem = menuItems.find(i => i.id === itemId);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Darshit Rana',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISCOUNT_REMOVED',
      details: `Removed discount on "${affectedItem?.name || itemId}". Restored original price ₹${affectedItem?.originalPrice || affectedItem?.price}`,
      type: 'menu',
      color: 'slate'
    });
    playSound('success');
  };

  const handleUpdateMenuItem = (updatedItem) => {
    const updated = menuItems.map(item => item.id === updatedItem.id ? updatedItem : item);
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Darshit Rana',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'MENU_ITEM_UPDATED',
      details: `Updated dish "${updatedItem.name}" (Price: ₹${updatedItem.finalPrice || updatedItem.price})`,
      type: 'menu',
      color: 'orange'
    });
    playSound('success');
  };

  const handleAddMenuItem = (itemData) => {
    const itemObj = {
      ...itemData,
      id: `m_${Date.now()}`,
      originalPrice: Number(itemData.price),
      finalPrice: Number(itemData.price),
      hasDiscount: false,
      discountPercent: 0,
      orders_count: 0
    };
    const updated = [...menuItems, itemObj];
    setMenuItems(updated);
    setLocalStore('menu_items', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: authUser?.role || 'Admin',
      tableNumber: 'Menu',
      actionType: 'DISH_ADDED',
      details: `Created new dish "${itemObj.name}" in category "${itemObj.category}" (₹${itemObj.price})`,
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

  const handleAddEmployee = (empData) => {
    const updated = [...employees, empData];
    setEmployees(updated);
    setLocalStore('employees', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Darshit Rana',
      employeeRole: 'Admin / Owner',
      tableNumber: 'System',
      actionType: 'CREDENTIAL_GENERATED',
      details: `Generated login credentials for ${empData.name} (Role: ${empData.role}, Username: ${empData.username})`,
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
      employeeName: authUser?.name || 'Darshit Rana',
      employeeRole: 'Admin / Owner',
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

  const handleRestockItem = (itemId, qty) => {
    const updated = inventory.map(item => {
      if (item.id === itemId) {
        return { ...item, currentStock: (Number(item.currentStock) || 0) + Number(qty) };
      }
      return item;
    });
    setInventory(updated);
    setLocalStore('inventory', updated);
    const affected = inventory.find(i => i.id === itemId);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Chef Amit',
      employeeRole: 'Head Chef',
      tableNumber: 'Pantry Store',
      actionType: 'STOCK_RESTOCKED',
      details: `Restocked +${qty} ${affected?.unit || 'units'} of "${affected?.name || itemId}"`,
      type: 'inventory',
      color: 'emerald'
    });
    playSound('success');
  };

  const handleAddInventoryItem = (itemData) => {
    const itemObj = { ...itemData, id: `inv_${Date.now()}` };
    const updated = [...inventory, itemObj];
    setInventory(updated);
    setLocalStore('inventory', updated);
    recordEmployeeActivity({
      employeeName: authUser?.name || 'Admin',
      employeeRole: 'Admin / Owner',
      tableNumber: 'Inventory',
      actionType: 'RAW_MATERIAL_ADDED',
      details: `Added new raw material SKU "${itemObj.name}" (${itemObj.category})`,
      type: 'inventory',
      color: 'indigo'
    });
    playSound('success');
  };

  const handleSettleTableBill = (orderId, tableNum, method = 'Cash') => {
    const targetOrder = orders.find(o => o.id === orderId);
    const updatedOrders = orders.map(o => o.id === orderId ? {
      ...o,
      status: 'Completed',
      payment_status: 'Paid',
      payment_mode: method,
      paid_collected_by: authUser?.name || 'Cashier',
      payment_verified_online: method !== 'Cash'
    } : o);
    setOrders(updatedOrders);
    setLocalStore('orders', updatedOrders);

    // Free the table
    const updatedTables = tables.map(t => 
      (t.number === tableNum || t.number === `Table ${tableNum}`) ? {
        ...t,
        status: 'available',
        current_order_id: null,
        timing: null
      } : t
    );
    setTables(updatedTables);
    setLocalStore('tables', updatedTables);

    recordEmployeeActivity({
      employeeName: authUser?.name || 'Cashier',
      employeeRole: 'Cashier & POS Lead',
      tableNumber: tableNum,
      actionType: 'TABLE_BILL_SETTLED',
      amount: targetOrder?.total || null,
      paymentMethod: method,
      details: `Settled Table ${tableNum} bill of ₹${targetOrder?.total || 0} via ${method}. Table freed for next guest.`,
      type: 'payment',
      color: 'emerald'
    });
    playSound('cash');

    // Settle & close session in Supabase Cloud
    settleTableSessionInSupabase(tableNum, targetOrder?.supabase_order_id || targetOrder?.id || orderId, method);
  };

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
    playSound('success');
  };

  const handleCallService = (type, tableNumber) => {
    const labels = {
      WAITER: 'Floor Waiter Assistance',
      WATER: 'Drinking Water Refill',
      BILL: 'Bill Settlement Request',
      CLEAN: 'Table Cleaning'
    };
    const newCall = {
      id: `srv_${Date.now()}`,
      tableNumber,
      type,
      label: labels[type] || 'Assistance',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending'
    };
    const updated = [newCall, ...serviceCalls.slice(0, 19)];
    setServiceCalls(updated);
    setLocalStore('service_calls', updated);

    recordEmployeeActivity({
      employeeName: `Table ${tableNumber} Guest`,
      employeeRole: 'Customer QR',
      tableNumber,
      actionType: `CALL_${type}`,
      details: `Table ${tableNumber} guest requested: ${labels[type] || type}`,
      type: 'table',
      color: 'orange'
    });
    playSound('waiter');
  };

  const handleDismissServiceCall = (callId) => {
    const updated = serviceCalls.filter(s => s.id !== callId);
    setServiceCalls(updated);
    setLocalStore('service_calls', updated);
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setLocalStore('settings', newSettings);
  };

  // IF CUSTOMER VIEW (OR SCANNED QR CODE) -> DIRECTLY SHOW TOUCH-FRIENDLY CUSTOMER MENU (NO LOGIN WALL)
  if (viewMode === 'customer') {
    return (
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
        onBackToAdmin={() => setViewMode('admin')}
      />
    );
  }

  // IF NOT AUTHENTICATED -> SHOW SIGNUP / LOGIN WALL (WITH DATABASE SYNC)
  if (!authUser) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenCustomerPreview={() => setViewMode('customer')}
      />
    );
  }

  const isDark = false;
  const appBgClass = 'bg-[#F8FAFC] text-slate-900';
  const sidebarClass = 'bg-white border-slate-200/80 text-slate-700';
  const headerClass = 'bg-white/95 border-slate-200/80 backdrop-blur-xl shadow-xs';
  const navActiveStyle = 'bg-slate-900 text-white font-semibold shadow-xs';
  const navInactiveStyle = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium';

  const recentOrders = (orders || []).slice(0, 5);
  const pendingOrdersCount = (orders || []).filter(o => (o.status || '').toUpperCase() === 'PENDING').length;
  const totalAlertsCount = (serviceCalls?.length || 0) + pendingOrdersCount;

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
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 text-amber-500 border border-slate-800 dark:border-slate-700 flex items-center justify-center font-heading font-black shadow-xs">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black font-heading tracking-tight leading-tight">
                  {settings?.restaurantName || 'Atmiya Dosa Hub'}
                </h1>
                <p className="text-[10px] font-bold text-slate-400">
                  {t('adminPanel')} • Petlad
                </p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className={`lg:hidden p-1.5 rounded-xl ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items List */}
          <nav className="p-4 space-y-1">
            
            {/* Dashboard */}
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'dashboard' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('dashboard')}</span>
            </button>

            {/* Orders */}
            <button
              onClick={() => { setActiveTab('orders'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'orders' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4" />
                <span>{t('orders')}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-400/20 text-orange-400">
                {orders?.length || 0}
              </span>
            </button>

            {/* Kitchen Panel */}
            <button
              onClick={() => { setActiveTab('kitchen'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'kitchen' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>{t('kitchenPanel')}</span>
            </button>

            {/* Tables */}
            <button
              onClick={() => { setActiveTab('tables'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'tables' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>{t('tables')}</span>
            </button>

            {/* Menu Management */}
            <button
              onClick={() => { setActiveTab('menu'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'menu' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>{t('menuManagement')}</span>
            </button>

            {/* Raw Materials & Kitchen Inventory */}
            <button
              onClick={() => { setActiveTab('inventory'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'inventory' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <div className="flex items-center space-x-3">
                <Package className="w-4 h-4" />
                <span>Raw Materials</span>
              </div>
              {inventory.filter(i => (Number(i.currentStock) || 0) <= (Number(i.minThreshold) || 0)).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400">
                  {inventory.filter(i => (Number(i.currentStock) || 0) <= (Number(i.minThreshold) || 0)).length} LOW
                </span>
              )}
            </button>

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
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'crm' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Guest CRM & Loyalty</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-400">
                {customers.length}
              </span>
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

            {/* Offers & Coupons */}
            <button
              onClick={() => { setActiveTab('offers'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                activeTab === 'offers' ? navActiveStyle : navInactiveStyle
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>{t('offersCoupons')}</span>
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

          </nav>
        </div>

        {/* Sidebar Footer with Live POS Status */}
        <div className="p-4 space-y-2 border-t border-slate-200/60 dark:border-slate-800/80">
          <div className={`rounded-2xl p-3 border ${
            isDark 
              ? 'bg-slate-900/60 border-slate-800/80' 
              : 'bg-slate-50 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className={`text-[11px] font-bold font-heading ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Live POS Cloud
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                Online
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span>Atmiya Dosa Hub</span>
              <span className="font-mono font-semibold">v2.5</span>
            </div>
          </div>
        </div>

      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        ></div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        
        {/* TOP HEADER BAR */}
        <header className={`sticky top-0 z-30 border-b px-4 sm:px-6 py-2.5 transition-colors ${headerClass}`}>
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            
            {/* Mobile Hamburger & Clean Brand Greeting */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className={`lg:hidden p-2 rounded-xl transition cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className={`text-sm font-black font-heading tracking-tight flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>{settings?.restaurantName || 'Atmiya Dosa Hub'}</span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                    Live POS
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-400">
                  {authUser?.name || 'Darshit Rana'} • <span className="capitalize">{authUser?.role || 'Admin'}</span>
                </div>
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-sm mx-2">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search orders, tables, dishes..."
                  className={`w-full pl-9 pr-10 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition ${
                    isDark 
                      ? 'bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500' 
                      : 'bg-slate-100/90 border border-slate-200/80 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <kbd className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border pointer-events-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right Controls: Live Clock, Theme, Language, Quick POS, Smart Notifications, Profile */}
            <div className="flex items-center space-x-2 shrink-0">

              {/* Live Date & Time Badge (Non-wrapping!) */}
              <div className={`hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono whitespace-nowrap shrink-0 ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="whitespace-nowrap">{currentTimeStr}</span>
              </div>

              {/* Language Selector */}
              <div className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl border text-xs font-semibold shrink-0 ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
              }`}>
                <Globe className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <select
                  value={currentLang}
                  onChange={(e) => setCurrentLang(e.target.value)}
                  className={`bg-transparent font-semibold focus:outline-none cursor-pointer text-xs ${
                    isDark ? 'text-slate-200 bg-slate-900' : 'text-slate-800'
                  }`}
                >
                  <option value="en" className={isDark ? 'bg-slate-900 text-white' : ''}>EN</option>
                  <option value="hi" className={isDark ? 'bg-slate-900 text-white' : ''}>हिन्दी</option>
                  <option value="gu" className={isDark ? 'bg-slate-900 text-white' : ''}>ગુજરાતી</option>
                  <option value="hinglish" className={isDark ? 'bg-slate-900 text-white' : ''}>Hinglish</option>
                </select>
              </div>

              {/* Quick POS Rapid Counter Button */}
              <button
                onClick={() => setShowQuickPos(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
                title="Rapid Counter POS (Punch order in seconds)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="hidden sm:inline">Quick POS</span>
              </button>

              {/* Single Unified Smart Notification Bell */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className={`p-2 rounded-xl relative transition cursor-pointer ${
                    totalAlertsCount > 0 
                      ? (isDark ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-50 text-orange-600 border border-orange-200') 
                      : (isDark ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80')
                  }`}
                  title="Notifications & Table Calls"
                >
                  <Bell className="w-4 h-4" />
                  {totalAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow">
                      {totalAlertsCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl p-4 shadow-2xl border space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-700/20 pb-2">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold font-heading">Notifications & Service</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-mono">
                        {totalAlertsCount} Active
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {/* Table Service Calls */}
                      {serviceCalls.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            Table Service Calls
                          </div>
                          {serviceCalls.map(call => (
                            <div key={call.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50/80 border-orange-200'
                            }`}>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-heading font-black text-xs text-orange-600 dark:text-orange-400">
                                    Table {call.tableNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{call.time}</span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{call.label}</p>
                              </div>
                              <button
                                onClick={() => handleDismissServiceCall(call.id)}
                                className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] shadow-sm transition cursor-pointer"
                              >
                                Attend
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Real Live Kitchen Orders */}
                      {recentOrders.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            Recent Orders
                          </div>
                          {recentOrders.map(ord => (
                            <div 
                              key={ord.id} 
                              onClick={() => { setActiveTab('orders'); setNotificationOpen(false); }}
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                isDark ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-xs">
                                    #{ord.order_number || ord.id?.slice(-4)}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    Table {ord.table_number || ord.table}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{ord.time || 'Just now'}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  ₹{ord.total_amount || ord.total || 0} • {ord.payment_mode || 'Cash'} • {ord.status}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-orange-500 hover:underline">
                                View →
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
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">All caught up</p>
                          <p className="text-[11px] text-slate-400">No pending table service calls or urgent alerts.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Logout */}
              <div className={`flex items-center space-x-2 pl-2 border-l shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center font-heading shadow-xs">
                  {authUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </header>

        {/* 3. DYNAMIC BODY ROUTER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          
          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              restaurantSettings={settings}
              tables={tables}
              orders={orders}
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
              onOpenApplyCoupon={() => setActiveTab('offers')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
              onMarkCashPaymentDone={handleMarkCashPaymentDone}
              onCancelOrderWithReason={handleCancelOrderWithReason}
              onAddNewOrder={() => setViewMode('customer')}
              currentStaff={{ name: authUser?.name || 'Darshit Rana', role: authUser?.role || 'Admin' }}
              currentLang={currentLang}
              theme={theme}
            />
          )}

          {activeTab === 'kitchen' && (
            <KitchenPanelView
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
              currentLang={currentLang}
              theme={theme}
            />
          )}

          {activeTab === 'tables' && (
            <TablesView
              tables={tables}
              orders={orders}
              restaurantSettings={settings}
              onAddTable={handleAddTable}
              onDeleteTable={handleDeleteTable}
              onSettleTableBill={handleSettleTableBill}
              onShiftTable={handleShiftTable}
              onSelectQRTable={(t) => {
                setActiveTab('qr');
              }}
              onSimulateCustomer={(tbl) => {
                setCurrentTable(tbl);
                setViewMode('customer');
              }}
              currentLang={currentLang}
              theme={theme}
            />
          )}

          {activeTab === 'menu' && (
            <MenuManagementView
              categories={categories}
              menuItems={menuItems}
              onToggleStock={handleToggleStock}
              onAddMenuItem={handleAddMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              onApplyDiscount={handleApplyDiscount}
              onRemoveDiscount={handleRemoveDiscount}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onRestockItem={handleRestockItem}
              onAddInventoryItem={handleAddInventoryItem}
              currentStaff={{ name: authUser?.name || 'Chef Amit', role: authUser?.role || 'Head Chef' }}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              activity={activity}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsAnalytics
              orders={orders}
            />
          )}

          {activeTab === 'offers' && (
            <OffersView
              coupons={coupons}
              onAddCoupon={handleAddCoupon}
              onToggleCoupon={handleToggleCoupon}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'qr' && (
            <QRManagementView
              tables={tables}
              orders={orders}
              restaurantSettings={settings}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'crm' && (
            <CustomerCRM
              customers={customers}
              onAddPoints={handleAddCustomerPoints}
              onSaveCustomer={handleSaveCustomerFromAdmin}
              restaurantSettings={settings}
            />
          )}

          {activeTab === 'settings' && (
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
          currentStaff={{ name: authUser?.name || 'Darshit Rana', role: authUser?.role || 'Admin' }}
        />
      )}

    </div>
  );
}
