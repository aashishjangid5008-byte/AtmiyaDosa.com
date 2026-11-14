import React, { useState, useEffect, useRef } from 'react';
import { 
  Utensils, 
  Clock, 
  CheckCircle2, 
  Flame, 
  BellRing, 
  Search, 
  Plus, 
  Minus, 
  X, 
  Check, 
  CheckCheck, 
  ArrowRightLeft, 
  Receipt, 
  Banknote, 
  Sparkles, 
  Lock, 
  RotateCcw, 
  Printer, 
  ChevronRight, 
  GlassWater, 
  AlertTriangle, 
  ChefHat, 
  LogOut, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Coffee,
  ShoppingBag,
  User,
  Phone,
  ShieldAlert,
  KeyRound,
  Heart,
  PanelRightOpen,
  PanelRightClose,
  SlidersHorizontal,
  Layers,
  Trash2
} from 'lucide-react';
import { playSound } from '../../lib/sound';
import { speakTableCleanAlert, speakServiceAlert } from '../../lib/notifications';
import { getTranslation, getDishDisplayName, getCategoryLabel } from '../../lib/translations';

export const OWNER_PIN = '2026';

export const AVAILABLE_WAITERS = [
  { id: 'WTR-101', waiter_id: 'WTR-101', name: 'Riya Patel', role: 'Waiter', pin: '1001', shift: 'Morning Shift', avatar: '👩‍💼' },
  { id: 'WTR-102', waiter_id: 'WTR-102', name: 'Rajesh Kumar', role: 'Waiter', pin: '1002', shift: 'Evening Shift', avatar: '👨‍💼' },
  { id: 'WTR-103', waiter_id: 'WTR-103', name: 'Vikram Shah', role: 'Waiter', pin: '1003', shift: 'Full Day', avatar: '🧑‍💼' }
];

export default function WaiterView({
  tables = [],
  orders = [],
  menuItems = [],
  categories = [],
  serviceCalls = [],
  onDismissServiceCall,
  onVacateTable,
  onShiftTable,
  onSettleTableBill,
  onPlaceOrder,
  onToggleItemReady,
  onToggleItemServed,
  onMarkAllTableItemsServed,
  onDismissTableServiceCalls = null,
  onUpdateOrderStatus,
  onCancelOrder = null,
  onUpdateOrderItems = null,
  authUser = null,
  onLogout,
  onExitWaiterMode,
  currentLang = 'en',
  theme = 'light',
  restaurantSettings = {}
}) {
  // Active Waiter profile & Fast Switcher
  const [currentWaiter, setCurrentWaiter] = useState(() => {
    const rawId = authUser?.waiter_id || authUser?.id;
    if (rawId && rawId.toLowerCase() !== 'waiter') {
      const match = AVAILABLE_WAITERS.find(w => w.id === rawId || w.waiter_id === rawId);
      if (match) return match;
      return {
        id: rawId,
        waiter_id: rawId,
        name: authUser.name || 'Floor Server',
        role: 'Waiter',
        shift: 'Floor Duty',
        avatar: '👩‍💼'
      };
    }
    return AVAILABLE_WAITERS[0];
  });
  const activeWaiterId = currentWaiter.waiter_id || currentWaiter.id;
  const activeWaiterName = currentWaiter.name;

  const [showWaiterSwitchModal, setShowWaiterSwitchModal] = useState(false);
  const [selectedWaiterCandidate, setSelectedWaiterCandidate] = useState(null);
  const [switchPinInput, setSwitchPinInput] = useState('');
  const [switchPinError, setSwitchPinError] = useState('');

  // Navigation & Sub-views: 'floor' | 'calls'
  const [activeSubTab, setActiveSubTab] = useState('floor');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('all'); // 'all' | 'ready' | 'calls'
  const [showShiftDrawer, setShowShiftDrawer] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  
  // Modals
  const [orderingTable, setOrderingTable] = useState(null); // Table object when taking order
  const [tableDishesModal, setTableDishesModal] = useState(null); // Table object when inspecting delivered dishes
  const [shiftingTable, setShiftingTable] = useState(null); // Table object when shifting
  const [shiftTarget, setShiftTarget] = useState('');
  const [viewingBillTable, setViewingBillTable] = useState(null); // Table object when viewing running bill
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Handheld Order Pad States
  const [orderPadSearch, setOrderPadSearch] = useState('');
  const [orderPadCategory, setOrderPadCategory] = useState('All');
  const [orderPadCart, setOrderPadCart] = useState([]); // [ { id, name, price, qty, customizations, note } ]

  // 5-Minute Grace Window & Order Ticket Manager states
  const [nowTick, setNowTick] = useState(Date.now());
  const [showAddDishSection, setShowAddDishSection] = useState(false);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState('All');
  const [confirmCancelModal, setConfirmCancelModal] = useState(null); // { order, reason }
  const [cancelReasonChoice, setCancelReasonChoice] = useState('Customer requested cancellation (5m grace window)');

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRemainingGraceSeconds = (targetOrder) => {
    if (!targetOrder) return 0;
    const placedTimeStr = targetOrder.placed_at || targetOrder.created_at || targetOrder.timestamp;
    if (!placedTimeStr) return 0;
    const placedTime = new Date(placedTimeStr).getTime();
    if (isNaN(placedTime)) return 0;
    const elapsedSecs = Math.max(0, Math.floor((nowTick - placedTime) / 1000));
    return Math.max(0, 300 - elapsedSecs);
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const [isJainPreset, setIsJainPreset] = useState(false);
  const [extraButterPreset, setExtraButterPreset] = useState(false);
  const [extraCheesePreset, setExtraCheesePreset] = useState(false);
  const [spicyLevel, setSpicyLevel] = useState('Regular');
  const [orderNote, setOrderNote] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');

  // Audio & Kiosk
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Second-by-second ticker for precise dining & turnover elapsed times
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Reactive Audio Alert Watcher for Table Cleaning & Guest Calls on Waiter Terminal
  const knownServiceCallsRef = useRef(new Set());
  const isInitialServiceRunRef = useRef(true);

  useEffect(() => {
    if (isInitialServiceRunRef.current) {
      (serviceCalls || []).forEach(c => {
        if (c.id) knownServiceCallsRef.current.add(c.id);
      });
      isInitialServiceRunRef.current = false;
      return;
    }

    const newCalls = (serviceCalls || []).filter(c => c.id && !knownServiceCallsRef.current.has(c.id));
    if (newCalls.length > 0) {
      newCalls.forEach(call => {
        knownServiceCallsRef.current.add(call.id);
        const isCleaning = (call.type || '').toLowerCase().includes('clean') || (call.label || '').toLowerCase().includes('clean');
        const digits = String(call.tableNumber || '').replace(/\D/g, '');
        const displayTable = digits ? parseInt(digits, 10) : (call.tableNumber || 'Floor');

        if (audioEnabled) {
          if (isCleaning) {
            playSound('alert');
            speakTableCleanAlert(displayTable);
          } else if (call.type !== 'food_ready') {
            playSound('waiter');
            speakServiceAlert(displayTable, call.label || 'Assistance');
          }
        }

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(isCleaning ? [400, 150, 400, 150, 400] : [300, 100, 300]);
          } catch (e) {}
        }
      });
    }
  }, [serviceCalls, audioEnabled]);

  const t = (key) => getTranslation(currentLang, key);

  // Helpers to resolve active orders for each table
  const normalizeTbl = (val) => {
    const digits = String(val || '').replace(/[^0-9]/g, '');
    return digits ? String(parseInt(digits, 10)) : String(val || '').trim().toLowerCase();
  };

  const getTableActiveOrders = (tableNum) => {
    const tCode = normalizeTbl(tableNum);
    return orders.filter(o => {
      const oCode = normalizeTbl(o.table_number);
      if (oCode !== tCode) return false;
      const st = String(o.status || '').toLowerCase().trim();
      const paySt = String(o.payment_status || '').toLowerCase().trim();
      if (st === 'completed' || st === 'cancelled' || st === 'settled') return false;
      // If order is served AND already paid, the dining session has completed!
      if (st === 'served' && (paySt === 'paid' || paySt === 'void')) return false;
      return true;
    });
  };

  // Waiter Order Ticket Item Operations: Adjust quantity, delete dish, add dish, cancel ticket
  const handleAdjustItemQty = (orderId, itemIndex, delta) => {
    const targetOrder = orders.find(o => o.id === orderId || o.order_number === orderId);
    if (!targetOrder || !onUpdateOrderItems) return;
    const currentItems = targetOrder.items || [];
    const updated = currentItems.map((it, idx) => {
      if (idx !== itemIndex) return it;
      const curQty = Number(it.qty || it.quantity || 1);
      const nextQty = curQty + delta;
      return { ...it, qty: nextQty, quantity: nextQty };
    }).filter(it => Number(it.qty || it.quantity || 1) > 0);

    onUpdateOrderItems(orderId, updated, activeWaiterName, 'Waiter');
  };

  const handleDeleteTicketItem = (orderId, itemIndex, itemName) => {
    const targetOrder = orders.find(o => o.id === orderId || o.order_number === orderId);
    if (!targetOrder || !onUpdateOrderItems) return;
    const currentItems = targetOrder.items || [];
    const updated = currentItems.filter((_, idx) => idx !== itemIndex);
    if (updated.length === 0) {
      if (window.confirm(`Removing "${itemName}" will leave no items on Order #${targetOrder.order_number || targetOrder.id}. Do you want to CANCEL this order ticket?`)) {
        if (onCancelOrder) {
          onCancelOrder(orderId, 'All items removed from ticket by waiter', activeWaiterName);
          setTableDishesModal(null);
        }
      }
      return;
    }
    onUpdateOrderItems(orderId, updated, activeWaiterName, 'Waiter');
  };

  const handleAddDishToOrder = (orderId, menuItem) => {
    const targetOrder = orders.find(o => o.id === orderId || o.order_number === orderId);
    if (!targetOrder || !onUpdateOrderItems) return;
    const currentItems = targetOrder.items || [];
    const existingIdx = currentItems.findIndex(i => i.id === menuItem.id || i.name === menuItem.name);
    let updated;
    if (existingIdx >= 0) {
      updated = currentItems.map((it, idx) => {
        if (idx !== existingIdx) return it;
        const q = Number(it.qty || it.quantity || 1) + 1;
        return { ...it, qty: q, quantity: q };
      });
    } else {
      const newItem = {
        id: menuItem.id || `dish_${Date.now()}`,
        name: menuItem.name,
        price: Number(menuItem.price || 0),
        qty: 1,
        quantity: 1,
        category: menuItem.category || 'General',
        image_url: menuItem.image_url || menuItem.imageUrl || null,
        kitchen_status: 'placed',
        is_served: false
      };
      updated = [...currentItems, newItem];
    }
    onUpdateOrderItems(orderId, updated, activeWaiterName, 'Waiter');
    if (audioEnabled) playSound('click');
  };

  const handleConfirmCancelOrder = (orderId, reason) => {
    if (onCancelOrder) {
      onCancelOrder(orderId, reason || cancelReasonChoice, activeWaiterName);
    }
    setConfirmCancelModal(null);
    setTableDishesModal(null);
    if (audioEnabled) playSound('success');
  };

  // Kitchen Pickup Shelf: Individual Dishes marked "Ready" by chefs waiting for food runner
  const readyDishesQueue = orders.reduce((acc, order) => {
    const st = String(order.status || '').toLowerCase().trim();
    if (st === 'completed' || st === 'cancelled' || st === 'settled') return acc;
    const isOrderReady = st === 'ready';
    const hasExplicitItemStatuses = (order.items || []).some(it => it.kitchen_status);

    (order.items || []).forEach((item, itemIdx) => {
      const isItemReady = (item.kitchen_status === 'ready' || item.kitchen_status === 'prepared') || (!hasExplicitItemStatuses && isOrderReady);
      if (isItemReady && !item.is_served) {
        acc.push({
          orderId: order.id,
          orderNumber: order.order_number || order.id,
          tableNumber: order.table_number,
          customerName: order.customer_name || 'Guest',
          itemIndex: itemIdx,
          dishName: item.name,
          gujaratiName: item.gujarati || item.gujarati_name || item.name,
          image_url: item.image_url || item.imageUrl || item.image || item.photo || null,
          qty: item.qty || item.quantity || 1,
          station: item.station || 'Kitchen Station',
          customizations: item.customizations,
          readyAt: item.ready_at || order.placed_at
        });
      }
    });
    return acc;
  }, []);

  // Separate guest calls from food ready alerts
  const guestCalls = (serviceCalls || []).filter(c => c.type !== 'food_ready');
  
  // Combine ready items from orders with any food_ready serviceCalls (de-duplicated)
  const allReadyDishes = [...readyDishesQueue];
  (serviceCalls || []).filter(c => c.type === 'food_ready').forEach(call => {
    // 1. Skip demo/test calls
    const callOid = String(call?.orderId || call?.orderNumber || '');
    const callCust = String(call?.customerName || '');
    if (callCust === 'Test Guest' || callOid.includes('TEST') || callOid.includes('ORD7611') || callOid.includes('ORD9436')) {
      return;
    }

    // 2. If table is available/vacant or has no active dining session, skip orphaned calls!
    const callTbl = normalizeTbl(call.tableNumber);
    const tableObj = (tables || []).find(t => normalizeTbl(t.number) === callTbl);
    const activeOrdersForTable = getTableActiveOrders(call.tableNumber);
    if ((tableObj && tableObj.status === 'available') || activeOrdersForTable.length === 0) {
      return; // Skip stale ready calls for unoccupied/available tables
    }

    // 3. If matching order exists and is finished or item is already served, skip
    const matchingOrder = orders.find(o => 
      o.id === call.orderId || 
      o.order_number === call.orderId ||
      String(o.id || '').replace(/^#+/, '') === String(call.orderId || '').replace(/^#+/, '')
    );
    if (matchingOrder) {
      const ordSt = String(matchingOrder.status || '').toLowerCase().trim();
      const ordPaySt = String(matchingOrder.payment_status || '').toLowerCase().trim();
      if (ordSt === 'completed' || ordSt === 'cancelled' || ordSt === 'settled' || (ordSt === 'served' && (ordPaySt === 'paid' || ordPaySt === 'void'))) {
        return;
      }
      // Check specific item if index or name provided
      const itemObj = (call.itemIndex !== undefined && matchingOrder.items?.[call.itemIndex]) ||
                      (matchingOrder.items || []).find(it => it.name === call.dishName || it.name === call.itemName);
      if (itemObj) {
        if (itemObj.is_served) return;
        const ks = String(itemObj.kitchen_status || '').toLowerCase();
        if (ks && ks !== 'ready' && ks !== 'prepared') {
          return; // Item was rolled back in kitchen to preparing or placed!
        }
      }
      // If the order has items and NONE of them are ready, skip this ready call entirely
      const hasAnyReadyItem = (matchingOrder.items || []).some(it => !it.is_served && ((it.kitchen_status || '').toLowerCase() === 'ready' || (it.kitchen_status || '').toLowerCase() === 'prepared'));
      if (matchingOrder.items && matchingOrder.items.length > 0 && !hasAnyReadyItem && ordSt !== 'ready') {
        return;
      }
    }

    const exists = allReadyDishes.some(d => d.orderId === call.orderId && (call.itemIndex === undefined || d.itemIndex === call.itemIndex));
    if (!exists) {
      // Clean dishName and quantity (avoid "1x 2x ...")
      let cleanName = String(call.dishName || call.itemsSummary || call.label || 'Ready Dish').replace(/^Deliver:\s*/i, '').trim();
      let parsedQty = Number(call.qty) || 1;
      const matchLeadingQty = cleanName.match(/^(\d+)x\s*(.+)$/i);
      if (matchLeadingQty) {
        parsedQty = parseInt(matchLeadingQty[1], 10);
        cleanName = matchLeadingQty[2].trim();
      }

      allReadyDishes.push({
        id: call.id,
        callId: call.id,
        orderId: call.orderId || `call_${call.id}`,
        orderNumber: call.orderNumber || call.orderId || call.id,
        tableNumber: call.tableNumber,
        customerName: call.customerName || 'Guest',
        itemIndex: call.itemIndex !== undefined ? call.itemIndex : 0,
        dishName: cleanName,
        gujaratiName: call.gujaratiName || cleanName,
        qty: parsedQty,
        station: 'Kitchen Pass',
        customizations: null,
        readyAt: call.timestamp || Date.now()
      });
    }
  });

  const totalAlertsCount = guestCalls.length + allReadyDishes.length;

  const formatElapsed = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffSec = Math.max(0, Math.floor((now - Number(timestamp)) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ${diffMin % 60}m ago`;
  };

  const handleDeliverReadyDish = (dish) => {
    if (dish.orderId && dish.itemIndex !== undefined && onToggleItemServed) {
      onToggleItemServed(dish.orderId, dish.itemIndex, activeWaiterName, activeWaiterId);
    } else if (dish.orderId && dish.dishName && onToggleItemServed) {
      const ord = orders.find(o => o.id === dish.orderId || o.order_number === dish.orderId);
      const matchIdx = ord?.items?.findIndex(it => it.name === dish.dishName || it.id === dish.id);
      if (matchIdx !== undefined && matchIdx >= 0) {
        onToggleItemServed(dish.orderId, matchIdx, activeWaiterName, activeWaiterId);
      } else if (dish.tableNumber && onMarkAllTableItemsServed) {
        onMarkAllTableItemsServed(dish.tableNumber, activeWaiterName, activeWaiterId);
      }
    } else if (dish.tableNumber && onMarkAllTableItemsServed) {
      onMarkAllTableItemsServed(dish.tableNumber, activeWaiterName, activeWaiterId);
    }

    // Dismiss matching service call(s)
    if (dish.callId && onDismissServiceCall) {
      onDismissServiceCall(dish.callId, activeWaiterName, activeWaiterId);
    }
    (serviceCalls || [])
      .filter(c => c.type === 'food_ready' && (
        c.id === dish.callId ||
        c.orderId === dish.orderId || 
        normalizeTbl(c.tableNumber) === normalizeTbl(dish.tableNumber)
      ) && (
        c.itemIndex === dish.itemIndex || 
        c.itemsSummary?.toLowerCase().includes(String(dish.dishName || '').toLowerCase()) ||
        dish.itemIndex === undefined
      ))
      .forEach(c => {
        if (onDismissServiceCall) onDismissServiceCall(c.id, activeWaiterName, activeWaiterId);
      });
    if (audioEnabled) playSound('success');
  };

  const handleDeliverAllTableReady = (tableNum) => {
    if (onMarkAllTableItemsServed) {
      onMarkAllTableItemsServed(tableNum, activeWaiterName, activeWaiterId);
    }
    if (onDismissTableServiceCalls) {
      onDismissTableServiceCalls(tableNum, 'food_ready', activeWaiterName, activeWaiterId);
    } else {
      (serviceCalls || [])
        .filter(c => c.type === 'food_ready' && normalizeTbl(c.tableNumber) === normalizeTbl(tableNum))
        .forEach(c => {
          if (onDismissServiceCall) onDismissServiceCall(c.id, activeWaiterName, activeWaiterId);
        });
    }
    if (audioEnabled) playSound('success');
  };

  // Backwards compatibility for whole ready orders count
  const readyOrders = orders.filter(o => {
    const st = String(o.status || '').toLowerCase().trim();
    if (st === 'completed' || st === 'cancelled' || st === 'settled') return false;
    const isOrderReady = st === 'ready';
    const hasReadyItems = (o.items || []).some(it => (it.kitchen_status === 'ready' || it.kitchen_status === 'prepared') && !it.is_served);
    const hasUnservedItems = (o.items || []).some(it => !it.is_served);
    return (isOrderReady || hasReadyItems) && hasUnservedItems;
  });

  // All Valid Settled Cash Transactions (Floor-wide)
  const allValidCashOrders = orders.filter(o => {
    const s = String(o.status || '').toLowerCase().trim();
    if (s === 'cancelled') return false;
    const pm = String(o.payment_mode || o.payment_method || '').toLowerCase();
    const isCash = pm.includes('cash') || pm.includes('cod') || (!pm.includes('upi') && !pm.includes('online') && !pm.includes('card'));
    const paySt = String(o.payment_status || '').toLowerCase().trim();
    const isSettled = paySt === 'paid' || s === 'completed' || s === 'served' || s === 'settled';
    return isCash && isSettled;
  });

  // Shift Statistics strictly attributed to THIS active Waiter ID
  const waiterShiftCashOrders = allValidCashOrders.filter(o => {
    const matchesId = 
      (o.paid_collected_by_id && String(o.paid_collected_by_id).toLowerCase() === String(activeWaiterId).toLowerCase()) ||
      (o.paid_collected_by_waiter_id && String(o.paid_collected_by_waiter_id).toLowerCase() === String(activeWaiterId).toLowerCase());
    const matchesName = o.paid_collected_by && String(o.paid_collected_by).toLowerCase().includes(String(activeWaiterName).toLowerCase());

    return matchesId || matchesName;
  });

  const waiterShiftCash = waiterShiftCashOrders.reduce((acc, o) => acc + Number(o.total || o.total_amount || 0), 0);
  const totalFloorCash = allValidCashOrders.reduce((acc, o) => acc + Number(o.total || o.total_amount || 0), 0);
  const totalShiftCash = waiterShiftCash > 0 ? waiterShiftCash : totalFloorCash;
  const shiftCashOrders = waiterShiftCashOrders.length > 0 ? waiterShiftCashOrders : allValidCashOrders;

  // Total Active Running Bills Across All Floor Tables (To be collected at Cashier Counter)
  const activeDiningOrders = orders.filter(o => {
    const st = String(o?.status || '').toLowerCase().trim();
    const paySt = String(o?.payment_status || '').toLowerCase().trim();
    if (st === 'completed' || st === 'cancelled' || st === 'settled') return false;
    if (st === 'served' && (paySt === 'paid' || paySt === 'void')) return false;
    return true;
  });

  const totalActiveFloorBill = activeDiningOrders.reduce((acc, o) => {
    const paySt = String(o.payment_status || '').toLowerCase().trim();
    if (paySt === 'paid') return acc;
    return acc + Number(o.total || o.total_amount || 0);
  }, 0);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // PIN Unlock
  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (enteredPin === OWNER_PIN || enteredPin === 'admin2026') {
      setShowPinModal(false);
      setEnteredPin('');
      setPinError('');
      if (onExitWaiterMode) onExitWaiterMode();
      else if (onLogout) onLogout();
    } else {
      setPinError('Incorrect Owner PIN. Access restricted to Floor Managers.');
      playSound('error');
    }
  };

  // Waiter Profile Switcher Handlers
  const handleSelectWaiterForSwitch = (waiter) => {
    setSelectedWaiterCandidate(waiter);
    setSwitchPinInput('');
    setSwitchPinError('');
  };

  const handleConfirmWaiterSwitch = (e) => {
    if (e) e.preventDefault();
    if (!selectedWaiterCandidate) return;
    const isMasterPin = switchPinInput === OWNER_PIN || switchPinInput === 'admin2026';
    const isWaiterPin = switchPinInput === selectedWaiterCandidate.pin;
    if (isWaiterPin || isMasterPin) {
      setCurrentWaiter(selectedWaiterCandidate);
      setShowWaiterSwitchModal(false);
      setSelectedWaiterCandidate(null);
      setSwitchPinInput('');
      setSwitchPinError('');
      if (audioEnabled) playSound('success');
    } else {
      setSwitchPinError(`Incorrect 4-digit PIN for ${selectedWaiterCandidate.name}. Try ${selectedWaiterCandidate.pin}`);
      if (audioEnabled) playSound('error');
    }
  };

  // Handheld Order Pad Handlers
  const handleOpenOrderPad = (table) => {
    setOrderingTable(table);
    setOrderPadCart([]);
    setIsJainPreset(false);
    setExtraButterPreset(false);
    setExtraCheesePreset(false);
    setSpicyLevel('Regular');
    setOrderNote('');
    setOrderPadSearch('');
    setOrderPadCategory('All');
    setCustomerNameInput(table.current_customer_name || '');
    setCustomerPhoneInput(table.current_customer_phone || '');
  };

  const handlePadAddDish = (item) => {
    if (!item.is_available) return;
    setOrderPadCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        gujarati: item.gujarati || item.gujarati_name || item.name,
        price: Number(item.finalPrice || item.price || 0),
        qty: 1,
        station: item.category?.includes('Dosa') ? 'Dosa Tawa Station' : (item.category?.includes('Pav') ? 'Pav Bhaji & Pulao' : 'Beverages & Extras')
      }];
    });
    if (audioEnabled) playSound('click');
  };

  const handlePadRemoveDish = (itemId) => {
    setOrderPadCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (!existing) return prev;
      if (existing.qty <= 1) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const calculatePadTotal = () => {
    if (orderPadCart.length === 0) return { subtotal: 0, tax: 0, total: 0 };
    let subtotal = orderPadCart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    if (extraButterPreset) subtotal += 20;
    if (extraCheesePreset) subtotal += 30;
    const tax = 0; // GST removed per customer instruction
    return { subtotal, tax, total: subtotal };
  };

  const handleFireKOTFromPad = () => {
    if (!orderingTable || orderPadCart.length === 0) return;
    const { subtotal, tax, total } = calculatePadTotal();
    
    const customTags = [];
    if (isJainPreset) customTags.push('Jain (No Onion/Garlic)');
    if (extraButterPreset) customTags.push('Extra Butter');
    if (extraCheesePreset) customTags.push('Extra Cheese');
    if (spicyLevel !== 'Regular') customTags.push(`${spicyLevel} Spicy`);
    if (orderNote.trim()) customTags.push(orderNote.trim());

    // Check if table already has an active order running!
    const activeOrders = getTableActiveOrders(orderingTable.number);
    const hasActiveOrder = activeOrders.length > 0;
    const activeParent = activeOrders[0];
    const roundNumber = hasActiveOrder ? (activeParent.round || 1) + 1 : 1;

    const formattedItems = orderPadCart.map((i, idx) => ({
      id: i.id || `item_${Date.now()}_${idx}`,
      name: i.name,
      quantity: i.qty,
      qty: i.qty,
      price: i.price,
      station: i.station,
      image_url: i.image_url || i.imageUrl || i.image || i.photo || null,
      is_served: false,
      kitchen_status: 'placed',
      is_addon: hasActiveOrder,
      round: roundNumber,
      placed_at: Date.now(),
      customizations: customTags.join(', ') || null
    }));

    const itemsSummary = formattedItems.map(i => `${i.qty}x ${i.name}`).join(', ');

    const newTicketId = `#ORD${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = {
      id: newTicketId,
      order_number: newTicketId.replace('#', ''),
      parent_order_id: hasActiveOrder ? activeParent.id : null,
      session_id: hasActiveOrder ? activeParent.session_id : null,
      table_number: String(orderingTable.number).toLowerCase().startsWith('table') ? orderingTable.number : `Table ${orderingTable.number}`,
      customer_name: customerNameInput || activeParent?.customer_name || `Guest ${orderingTable.number}`,
      customer_phone: customerPhoneInput || activeParent?.customer_phone || '9825010000',
      items: formattedItems,
      items_summary: itemsSummary,
      subtotal,
      tax,
      total,
      total_amount: total,
      status: 'Placed',
      round: roundNumber,
      is_addon: hasActiveOrder,
      payment_status: hasActiveOrder ? (activeParent.payment_status || 'Pending Cash') : 'Pending Cash',
      payment_mode: 'Cash_Waiter',
      order_source: 'Waiter Terminal',
      placed_by_waiter_id: activeWaiterId,
      placed_by_waiter_name: activeWaiterName,
      is_waiter_order: true,
      placed_at: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      special_note: customTags.join(' • ') || null
    };

    if (onPlaceOrder) {
      onPlaceOrder(newTicket);
    }
    if (audioEnabled) playSound('success');
    setOrderingTable(null);
  };

  // 1-Tap Quick Mineral Water KOT Dispatch (Instantly adds ₹20 bottle to table & kitchen queue)
  const handleQuickTableWater = (table) => {
    const activeOrders = getTableActiveOrders(table.number);
    const activeParent = activeOrders[0];
    const newTicketId = `#ORD${Math.floor(1000 + Math.random() * 9000)}`;
    const waterItem = {
      id: 'ATM_WATER_01',
      name: 'Packaged Mineral Water (1 Litre Bottle)',
      category: 'Beverages & Water',
      price: 20,
      finalPrice: 20,
      qty: 1,
      quantity: 1,
      unit_price: 20,
      total_price: 20,
      kitchen_status: 'served',
      is_served: true,
      served_at: new Date().toISOString(),
      served_by: activeWaiterName || 'Waiter',
      is_addon: Boolean(activeParent),
      station: 'Beverages & Extras'
    };
    const waterTicket = {
      id: newTicketId,
      order_number: newTicketId.replace('#', ''),
      parent_order_id: activeParent ? activeParent.id : null,
      session_id: activeParent ? activeParent.session_id : null,
      table_number: String(table.number).toLowerCase().startsWith('table') ? table.number : `Table ${table.number}`,
      customer_name: activeParent?.customer_name || `Guest ${table.number}`,
      customer_phone: activeParent?.customer_phone || '9825010000',
      items: [waterItem],
      order_items: [waterItem],
      items_summary: '1x Packaged Mineral Water (1L)',
      subtotal: 20,
      tax: 0,
      total: 20,
      total_amount: 20,
      status: 'Served',
      is_served: true,
      is_addon: Boolean(activeParent),
      payment_status: 'Pending Cash',
      payment_mode: 'Cash_Waiter',
      order_source: 'Waiter Terminal',
      placed_by_waiter_id: activeWaiterId,
      placed_by_waiter_name: activeWaiterName,
      is_waiter_order: true,
      placed_at: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      special_note: '💧 1x Chilled Packaged Mineral Water (Delivered by Waiter)'
    };
    if (onPlaceOrder) {
      onPlaceOrder(waterTicket);
    }
    if (audioEnabled) playSound('success');
  };


  // Table Shift Handler
  const handleConfirmTableShift = () => {
    if (!shiftingTable || !shiftTarget) return;
    if (onShiftTable) {
      onShiftTable(shiftingTable.number, shiftTarget);
    }
    setShiftingTable(null);
    setShiftTarget('');
  };

  // Resolve table zone robustly
  const getTableZone = (tbl) => {
    if (tbl.zone) return tbl.zone;
    const num = parseInt(String(tbl.number || '').replace(/\D/g, ''), 10) || 0;
    if (num >= 13) return 'Main Counter';
    if (num >= 7) return 'Garden Outdoor';
    return 'AC Family Hall';
  };

  // Filter Tables
  const filteredTables = tables.filter(tbl => {
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      const numMatch = String(tbl.number || '').toLowerCase().includes(q);
      const custMatch = String(tbl.current_customer_name || '').toLowerCase().includes(q);
      if (!numMatch && !custMatch) return false;
    }
    if (selectedZone !== 'All') {
      const zoneStr = getTableZone(tbl);
      if (zoneStr !== selectedZone) return false;
    }
    if (selectedStatusFilter === 'Available') return tbl.status === 'available';
    if (selectedStatusFilter === 'Occupied') return tbl.status === 'occupied';
    if (selectedStatusFilter === 'Food Ready') {
      const tOrders = getTableActiveOrders(tbl.number);
      const tReadyDishes = allReadyDishes.filter(d => normalizeTbl(d.tableNumber) === normalizeTbl(tbl.number));
      return tOrders.some(o => (o.status || '').toLowerCase() === 'ready') || tReadyDishes.length > 0;
    }
    if (selectedStatusFilter === 'Bill Due') {
      const tOrders = getTableActiveOrders(tbl.number);
      return tOrders.some(o => (o.payment_status || '').toLowerCase() === 'pending cash');
    }
    return true;
  });

  // Render Unified Calls & Food Ready Queue Stream
  const renderServiceStream = (isDrawer = false) => {
    const displayedReady = serviceFilter === 'calls' ? [] : allReadyDishes;
    const displayedCalls = serviceFilter === 'ready' ? [] : guestCalls;
    const totalVisible = displayedReady.length + displayedCalls.length;

    // Group ready dishes by table number so waiter can deliver whole table with 1 tap
    const readyByTable = displayedReady.reduce((acc, dish) => {
      const tCode = normalizeTbl(dish.tableNumber);
      if (!acc[tCode]) acc[tCode] = [];
      acc[tCode].push(dish);
      return acc;
    }, {});

    return (
      <div className="space-y-3.5 font-sans">
        {/* Stream Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
              totalAlertsCount > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-900 text-white'
            }`}>
              🛎️
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-slate-900 leading-tight">
                Live Floor & Kitchen Calls
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Plated runner items & guest bells
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black ${
              totalAlertsCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {totalAlertsCount} Active
            </span>
            {isDrawer && (
              <button
                type="button"
                onClick={() => setSideDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-[10px] sm:text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setServiceFilter('all')}
            className={`flex-1 py-1 px-1 rounded-lg transition text-center cursor-pointer min-h-[30px] flex items-center justify-center whitespace-nowrap ${
              serviceFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalAlertsCount})
          </button>
          <button
            type="button"
            onClick={() => setServiceFilter('ready')}
            className={`flex-1 py-1 px-1 rounded-lg transition text-center cursor-pointer flex items-center justify-center space-x-1 min-h-[30px] whitespace-nowrap ${
              serviceFilter === 'ready' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">Ready ({allReadyDishes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setServiceFilter('calls')}
            className={`flex-1 py-1 px-1 rounded-lg transition text-center cursor-pointer flex items-center justify-center space-x-1 min-h-[30px] whitespace-nowrap ${
              serviceFilter === 'calls' ? 'bg-amber-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">Calls ({guestCalls.length})</span>
          </button>
        </div>

        {/* Content Stream */}
        {totalVisible === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-heading font-black text-xs text-slate-900">All Clear!</h4>
            <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
              No pending guest bells or food waiting on counter. Orders bumped from kitchen will appear here live.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. FOOD READY SECTION */}
            {displayedReady.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center space-x-1">
                    <ChefHat className="w-3.5 h-3.5 text-blue-600 inline" />
                    <span>Food Ready to Serve ({displayedReady.length})</span>
                  </span>
                  <span className="text-[9px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    Plated Hot
                  </span>
                </div>

                {displayedReady.map((dish, idx) => (
                  <div
                    key={`${dish.orderId}_${dish.itemIndex}_${idx}`}
                    className="p-3.5 rounded-2xl bg-white border-2 border-blue-400/90 shadow-sm space-y-2.5 transition hover:shadow-md animate-in fade-in"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-2xs">
                          {String(dish.tableNumber).replace(/\D/g, '') || dish.tableNumber}
                        </span>
                        <div>
                          <span className="font-heading font-black text-sm text-slate-900 block leading-tight">
                            Table {dish.tableNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Guest: {dish.customerName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 block">
                          Ready {formatElapsed(dish.readyAt)}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {dish.station || 'Kitchen Pass'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {(() => {
                        const dImg = dish.image_url || dish.dishPhoto || (menuItems.find(m => m.id === dish.id || m.name === dish.dishName)?.image_url);
                        if (!dImg) return null;
                        return (
                          <img
                            src={dImg}
                            alt={dish.dishName}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        );
                      })()}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900 leading-snug">
                          {dish.qty}x {dish.dishName}
                        </div>
                        {dish.gujaratiName && dish.gujaratiName !== dish.dishName && (
                          <div className="text-xs font-semibold text-slate-500 mt-0.5">
                            {dish.gujaratiName}
                          </div>
                        )}
                        {dish.customizations && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                            {dish.customizations}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action: 1-Tap Deliver to Table */}
                    <div className="pt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeliverReadyDish(dish)}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98 min-h-[38px]"
                        title="Mark dish delivered to table and start dining timer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>✓ Deliver · ટેબલ પર આપ્યું</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. GUEST CALLING BELLS SECTION */}
            {displayedCalls.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center space-x-1">
                    <BellRing className="w-3.5 h-3.5 text-amber-600 inline" />
                    <span>Guest Calling Bells ({displayedCalls.length})</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono font-bold animate-ping">●</span>
                </div>

                {displayedCalls.map(call => {
                  const isCleanCall = call.type === 'table_clean' || call.type === 'cleaning';
                  const isCancelRequest = call.type === 'cancel_request' || call.type === 'CANCEL_REQUEST';
                  const targetTable = (tables || []).find(t => normalizeTbl(t.number) === normalizeTbl(call.tableNumber)) || { number: call.tableNumber };

                  return (
                    <div
                      key={call.id}
                      className={`p-3.5 rounded-2xl bg-white border-2 ${
                        isCancelRequest
                          ? 'border-rose-500 ring-2 ring-rose-300/50 shadow-md bg-rose-50/30'
                          : isCleanCall 
                            ? 'border-amber-500 ring-2 ring-amber-300/40 shadow-md' 
                            : 'border-amber-400 shadow-sm'
                      } space-y-2.5 transition hover:shadow-md animate-in fade-in`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-8 h-8 rounded-xl ${
                            isCancelRequest 
                              ? 'bg-rose-600 text-white' 
                              : isCleanCall 
                                ? 'bg-amber-600 text-white' 
                                : 'bg-amber-500 text-white'
                          } font-mono font-black text-xs flex items-center justify-center shadow-2xs`}>
                            {isCancelRequest ? '🚨' : isCleanCall ? '🧹' : (String(call.tableNumber).replace(/\D/g, '') || 'T')}
                          </span>
                          <div>
                            <span className="font-heading font-black text-sm text-slate-900 block leading-tight">
                              Table {call.tableNumber}
                            </span>
                            <span className={`text-xs font-bold ${
                              isCancelRequest ? 'text-rose-900' : isCleanCall ? 'text-amber-900' : 'text-amber-800'
                            } block`}>
                              {call.label || (isCancelRequest ? 'Order Cancel / Edit Request (5m Window)' : isCleanCall ? 'Clean & Reset Table' : 'Assistance Needed')}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {call.time || 'Just now'}
                        </span>
                      </div>

                      {isCancelRequest ? (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTableDishesModal(targetTable);
                              if (audioEnabled) playSound('click');
                            }}
                            className="py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1 cursor-pointer active:scale-98 min-h-[38px]"
                          >
                            <Utensils className="w-3.5 h-3.5" />
                            <span>Open Ticket</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDismissServiceCall) onDismissServiceCall(call.id, activeWaiterName, activeWaiterId);
                              if (audioEnabled) playSound('success');
                            }}
                            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center space-x-1 cursor-pointer active:scale-98 min-h-[38px]"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2]" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onDismissServiceCall) onDismissServiceCall(call.id, activeWaiterName, activeWaiterId);
                            if (audioEnabled) playSound('success');
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98 min-h-[38px]"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isCleanCall ? '✓ Mark Table Cleaned · સાફ કર્યું' : '✓ Attend Call · પહોંચી ગયા'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-3 sm:space-y-4 font-sans select-none pb-28 md:pb-12">

      {/* 1. TOP WAITER CONTROL HEADER (Streamlined & Clutter-Free) */}
      {/* Mobile Streamlined Top Bar */}
      <div className="flex md:hidden items-center justify-between p-3 rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xs gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-heading font-black text-base shadow-xs shrink-0">
            {currentWaiter?.avatar || '🤵'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="text-xs font-black text-slate-900 truncate">{currentWaiter.name}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono font-bold text-[9px]">
                {activeWaiterId}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedWaiterCandidate(null);
                setSwitchPinInput('');
                setSwitchPinError('');
                setShowWaiterSwitchModal(true);
              }}
              className="text-[10px] text-blue-700 font-bold hover:underline cursor-pointer flex items-center space-x-1 mt-0.5"
            >
              <User className="w-2.5 h-2.5 text-blue-600" />
              <span>Switch Server</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Live Alerts Trigger Pill */}
          <button
            type="button"
            onClick={() => setSideDrawerOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border cursor-pointer min-h-[36px] ${
              totalAlertsCount > 0
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs animate-pulse'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Open Live Calls and Ready Food side drawer"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span className="font-mono font-black">{totalAlertsCount}</span>
          </button>

          {/* Active Running Floor Bills */}
          <div
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono font-black text-xs flex items-center space-x-1 min-h-[36px] shadow-2xs"
            title="Total running table bills on floor"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-700" />
            <span>₹{totalActiveFloorBill}</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl text-xs font-bold transition border cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
              audioEnabled 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
            title="Toggle Bell Sound Chimes"
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Lock / Exit PIN Button */}
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Lock Waiter Terminal"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
          </button>
        </div>
      </div>

      {/* Desktop & Tablet Full Header */}
      <div className="hidden md:flex p-4 sm:p-5 rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-sm flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Brand & Floor Server Identity */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-heading font-black text-xl shadow-xs shrink-0">
            {currentWaiter?.avatar || '🤵'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black font-heading tracking-tight text-slate-900">
                Floor Service & Waiter Terminal
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] font-mono border border-blue-200 shrink-0">
                CAPTAIN DISPATCH ACTIVE
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5 flex-wrap">
              <p className="text-xs text-slate-600 font-medium truncate">
                Server: <span className="text-slate-900 font-black">{currentWaiter.name}</span>
              </p>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[10px] shrink-0">
                {activeWaiterId}
              </span>
              <span className="text-[11px] text-slate-400 font-medium shrink-0">
                • {currentWaiter.shift}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedWaiterCandidate(null);
                  setSwitchPinInput('');
                  setSwitchPinError('');
                  setShowWaiterSwitchModal(true);
                }}
                className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer transition flex items-center space-x-1 shrink-0"
                title="Switch active server profile with PIN"
              >
                <User className="w-3 h-3 text-blue-600" />
                <span>Switch Server</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & Ergonomic Side Panel Switchers */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full sm:flex-wrap shrink-0">
          {/* Side Panel Toggle Button (Opens Slide Drawer on laptop/tablet, docks on 2xl) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1536) {
                setSideDrawerOpen(true);
              } else {
                setIsSidePanelOpen(!isSidePanelOpen);
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border shadow-xs shrink-0 whitespace-nowrap ${
              totalAlertsCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                : (isSidePanelOpen || sideDrawerOpen)
                  ? 'bg-slate-900 hover:bg-black text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Open Live Calls and Ready Food drawer"
          >
            {isSidePanelOpen ? <PanelRightClose className="w-4 h-4 shrink-0" /> : <PanelRightOpen className="w-4 h-4 shrink-0" />}
            <span>Calls & Ready Panel</span>
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black shrink-0 ${
              totalAlertsCount > 0 ? 'bg-white text-amber-950' : (isSidePanelOpen || sideDrawerOpen) ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {totalAlertsCount}
            </span>
          </button>

          {/* Active Running Bills Indicator */}
          <div
            className="px-3 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-black font-mono flex items-center space-x-1.5 shadow-xs shrink-0 whitespace-nowrap"
            title="Total running table bills on floor"
          >
            <Receipt className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Active Bills: ₹{totalActiveFloorBill}</span>
          </div>

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl text-xs font-bold transition border cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0 ${
              audioEnabled 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs' 
                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Bell Sound Chimes"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-xs min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Toggle Fullscreen Waiter Terminal"
          >
            {isFullscreen ? <Minimize className="w-4 h-4 shrink-0" /> : <Maximize className="w-4 h-4 shrink-0" />}
          </button>

          {/* Lock / Exit PIN Button (Guaranteed never to crop or overflow) */}
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs min-h-[36px] shrink-0 whitespace-nowrap"
            title="Lock Waiter Terminal (Requires Manager PIN)"
          >
            <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="whitespace-nowrap">Lock / Exit</span>
          </button>
        </div>
      </div>

      {/* 3. SHIFT TELEMETRY QUICK TILES */}
      {/* Mobile Compact 4-col Metric Ribbon */}
      <div className="grid grid-cols-4 gap-1.5 md:hidden">
        <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-slate-400 block uppercase">Free</span>
          <span className="text-sm font-black text-emerald-600 font-mono">
            {tables.filter(t => t.status === 'available').length}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-slate-400 block uppercase">Seated</span>
          <span className="text-sm font-black text-amber-600 font-mono">
            {tables.filter(t => t.status === 'occupied').length}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-slate-400 block uppercase">Ready</span>
          <span className="text-sm font-black text-blue-600 font-mono">
            {readyDishesQueue.length}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-2xs text-center min-w-0">
          <span className="text-[9px] font-bold text-amber-700 block uppercase">Bills</span>
          <span className="text-xs sm:text-sm font-black text-amber-700 font-mono block truncate">
            ₹{totalActiveFloorBill}
          </span>
        </div>
      </div>

      {/* Desktop & Tablet Spacious Metric Cards */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Tables</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
            {tables.filter(t => t.status === 'available').length}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Ready for Seating</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dining Tables</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-0.5">
            {tables.filter(t => t.status === 'occupied').length}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Guests Seated</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ready at Counter</span>
          <div className="text-2xl font-black text-blue-600 font-mono mt-0.5">
            {readyDishesQueue.length}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Dishes Ready to Run</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Running Table Bills</span>
          <div className="text-2xl font-black text-amber-700 font-mono mt-0.5">
            ₹{totalActiveFloorBill}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Payable at Cashier Counter</span>
        </div>
      </div>

      {/* 4. MAIN SPLIT-VIEW LAYOUT: FLOOR MAP + SIDE ACTIVITY DOCK */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* 4A. MAIN FLOOR MAP CANVAS */}
        <div className="w-full lg:flex-1 min-w-0 space-y-3.5">
          
          {/* Zone & Status Filter Bar + Search (Adaptive 2-Tier Mobile-Friendly Layout) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
            {/* Tier 1: Floor Zones (Full Width Horizontal Scrollable Pills with Counts) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full py-0.5">
              {(() => {
                const zoneList = [{ id: 'All', label: 'All Floor Zones' }];
                const seenZones = new Set(['All']);
                (tables || []).forEach(t => {
                  const z = getTableZone(t);
                  if (z && !seenZones.has(z)) {
                    seenZones.add(z);
                    zoneList.push({ id: z, label: z });
                  }
                });
                return zoneList;
              })().map(z => {
                const zoneCount = z.id === 'All' 
                  ? tables.length 
                  : tables.filter(t => getTableZone(t) === z.id).length;
                const isSelected = selectedZone === z.id;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setSelectedZone(z.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 flex items-center space-x-1.5 min-h-[36px] ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{z.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                      isSelected ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {zoneCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tier 2: Search Input + Status Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {/* Table Search Input */}
              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search table number..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
                />
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Chips (Guaranteed never to clip on mobile, tablet, or laptop) */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                {[
                  { id: 'All', label: 'All Status' },
                  { id: 'Available', label: 'Free', color: 'bg-emerald-500' },
                  { id: 'Occupied', label: 'Seated', color: 'bg-amber-500' },
                  { id: 'Food Ready', label: 'Dish Ready', color: 'bg-blue-600' },
                  { id: 'Bill Due', label: 'Bill Due', color: 'bg-rose-500' }
                ].map(st => {
                  const isSelected = selectedStatusFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStatusFilter(st.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 flex items-center space-x-1.5 min-h-[34px] ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200/80'
                      }`}
                    >
                      {st.color && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : st.color}`}></span>}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real Dining Table Architectural Floor Grid (1 column on mobile phones, 2 on tablets, 3-4 on desktop) */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isSidePanelOpen ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-3 sm:gap-4`}>
            {filteredTables.map(table => {
              const activeTableOrders = getTableActiveOrders(table.number);
              const isOccupied = table.status === 'occupied' && activeTableOrders.length > 0;
              const tableCalls = guestCalls.filter(c => normalizeTbl(c.tableNumber) === normalizeTbl(table.number));
              const tableCleanCall = tableCalls.find(c => 
                (c.type || '').toLowerCase().includes('clean') || 
                (c.label || '').toLowerCase().includes('clean')
              );
              const tableReadyDishes = isOccupied ? allReadyDishes.filter(d => normalizeTbl(d.tableNumber) === normalizeTbl(table.number)) : [];
              // Aggregate items across orders for this table
              const allDishes = [];
              activeTableOrders.forEach(o => {
                (o.items || []).forEach((it, itIdx) => {
                  allDishes.push({
                    ...it,
                    orderId: o.id || o.order_number,
                    itemIndex: itIdx,
                    tableNumber: table.number,
                    dishName: it.name || it.item_name
                  });
                });
              });
              const totalItems = allDishes.length;
              const deliveredItems = allDishes.filter(it => it.is_served).length;
              const readyDishes = allDishes.filter(it => !it.is_served && ((it.kitchen_status || '').toLowerCase() === 'ready' || (it.kitchen_status || '').toLowerCase() === 'prepared'));
              const cookingDishes = allDishes.filter(it => !it.is_served && ((it.kitchen_status || '').toLowerCase() !== 'ready' && ((it.kitchen_status || '').toLowerCase() !== 'prepared')));
              const hasReadyFood = isOccupied && (
                activeTableOrders.some(o => (o.status || '').toLowerCase() === 'ready') || 
                tableReadyDishes.length > 0 || 
                readyDishes.length > 0
              );
              const percent = totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0;
              const totalBillAmount = activeTableOrders
                .filter(o => (o.payment_status || '').toLowerCase() !== 'paid')
                .reduce((acc, o) => acc + Number(o.total || o.total_amount || 0), 0);

              // Dining elapsed time
              const seatedTime = table.timing ? table.timing : (activeTableOrders[0]?.placed_at ? new Date(activeTableOrders[0].placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
              const tableCap = Number(table.capacity) || 4;
              const tableZone = getTableZone(table);

              // Dining duration
              const elapsedDiningMins = table.food_delivered_at ? Math.floor((now - Number(table.food_delivered_at)) / 60000) : null;

              return (
                <div
                  key={table.id || table.number}
                  className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 relative overflow-hidden ${
                    tableCleanCall
                      ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/50 shadow-md'
                      : tableCalls.length > 0
                        ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-400/40 shadow-md'
                        : hasReadyFood
                          ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/40 shadow-md'
                          : isOccupied 
                            ? percent === 100 
                              ? 'border-emerald-300 bg-emerald-50/20 shadow-xs' 
                              : 'border-amber-300 bg-amber-50/20 shadow-xs'
                            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md shadow-xs'
                  }`}
                >
                  {/* Top Bar: Table Number Header & Status Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <h4 className="font-heading font-black text-base sm:text-lg text-slate-900 tracking-tight">
                            Table {table.number}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold font-mono px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {tableCap} Seats
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {tableZone}
                        </p>
                      </div>

                      {/* Status Badge Pill */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight border shadow-2xs shrink-0 ${
                        tableCleanCall
                          ? 'bg-amber-100 text-amber-950 border-amber-300 animate-pulse'
                          : tableCalls.length > 0
                            ? 'bg-amber-100 text-amber-950 border-amber-300 animate-pulse'
                            : hasReadyFood 
                              ? 'bg-blue-100 text-blue-950 border-blue-300 animate-pulse'
                              : isOccupied 
                                ? (percent === 100 
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                    : 'bg-amber-100 text-amber-950 border-amber-300')
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {tableCleanCall ? (
                          <>
                            <span className="mr-1 text-xs">🧹</span>
                            <span>Needs Cleaning</span>
                          </>
                        ) : tableCalls.length > 0 ? (
                          <>
                            <BellRing className="w-2.5 h-2.5 inline mr-1 text-amber-700 animate-bounce" />
                            <span>Call: {tableCalls[0].label || 'Assistance'}</span>
                          </>
                        ) : hasReadyFood ? (
                          <>
                            <ChefHat className="w-2.5 h-2.5 inline mr-1 text-blue-700 animate-pulse" />
                            <span>
                              {readyDishes.length > 0 ? readyDishes.length : (tableReadyDishes.length || 1)} Ready
                              {cookingDishes.length > 0 ? ` (${cookingDishes.length} Cooking)` : ''}
                            </span>
                          </>
                        ) : isOccupied ? (
                          percent === 100 ? (
                            <>
                              <Check className="w-2.5 h-2.5 inline mr-1 text-emerald-700" />
                              <span>Food Served • Dining</span>
                            </>
                          ) : (
                            <>
                              <Flame className="w-2.5 h-2.5 inline mr-1 text-amber-700" />
                              <span>Cooking on Tawa</span>
                            </>
                          )
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                            <span>Available & Clean</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* REALISTIC ARCHITECTURAL DINING TABLE VISUAL (Compact on Mobile) */}
                    <div className="py-1.5 sm:py-2.5 px-1 flex flex-col items-center justify-center my-0.5 select-none bg-slate-50/60 rounded-2xl border border-slate-100">
                      {/* Top Chairs Row */}
                      <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-0.5 sm:mb-1">
                        {Array.from({ length: Math.max(1, Math.min(3, Math.ceil(tableCap / 2))) }).map((_, i) => (
                          <div
                            key={`top-chair-${i}`}
                            className={`w-6 sm:w-8 h-2 sm:h-2.5 rounded-t-md border transition-all flex items-center justify-center ${
                              isOccupied
                                ? 'bg-amber-400 border-amber-500 shadow-2xs'
                                : 'bg-slate-200 border-slate-300'
                            }`}
                            title={isOccupied ? 'Guest Seated' : 'Available Chair Cushion'}
                          >
                            {isOccupied && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-700"></span>}
                          </div>
                        ))}
                      </div>

                      {/* Physical Tabletop */}
                      <div
                        className={`relative transition-all duration-300 flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2.5 border-2 ${
                          tableCap <= 2
                            ? 'w-24 sm:w-32 h-12 sm:h-16 rounded-full'
                            : tableCap >= 6
                              ? 'w-36 sm:w-48 h-14 sm:h-18 rounded-2xl'
                              : 'w-32 sm:w-40 h-14 sm:h-18 rounded-2xl'
                        } ${
                          tableCalls.length > 0
                            ? 'bg-amber-100/90 border-amber-400 shadow-sm ring-2 ring-amber-400/40'
                            : hasReadyFood
                              ? 'bg-blue-100/90 border-blue-400 shadow-sm ring-2 ring-blue-400/40'
                              : isOccupied
                                ? 'bg-gradient-to-br from-amber-50 to-orange-100/80 border-amber-300/90 shadow-2xs'
                                : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Table Number Emblem */}
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-heading font-black text-xs shadow-2xs border ${
                            tableCalls.length > 0
                              ? 'bg-amber-600 text-white border-amber-400 animate-bounce'
                              : hasReadyFood
                                ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                                : isOccupied
                                  ? 'bg-slate-900 text-amber-300 border-amber-400/30'
                                  : 'bg-emerald-600 text-white border-emerald-400/30'
                          }`}>
                            {String(table.number).replace(/\D/g, '') || table.number}
                          </div>
                        </div>

                        {/* Centerpiece Table Status / Bill Icon */}
                        <div className="text-right">
                          {isOccupied ? (
                            <button
                              type="button"
                              onClick={() => setViewingBillTable(table)}
                              className="text-right p-1 -m-1 rounded-lg hover:bg-amber-200/50 transition cursor-pointer group"
                              title="Click to view running table bill"
                            >
                              <span className="text-xs font-mono font-black text-slate-900 block leading-tight group-hover:text-amber-900">
                                ₹{totalBillAmount}
                              </span>
                              <span className="text-[9px] font-bold text-amber-800 flex items-center justify-end space-x-0.5 group-hover:underline">
                                <Receipt className="w-2.5 h-2.5 inline text-amber-700" />
                                <span>{activeTableOrders[0]?.round && activeTableOrders[0].round > 1 ? `Rnd ${activeTableOrders[0].round} • Bill` : 'View Bill'}</span>
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center space-x-1 text-emerald-700 text-[10px] font-bold">
                              <Sparkles className="w-3 h-3 text-emerald-600 inline" />
                              <span>Ready</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Chairs Row */}
                      <div className="flex items-center justify-center space-x-3 sm:space-x-4 mt-1">
                        {Array.from({ length: Math.max(1, Math.min(3, Math.ceil(tableCap / 2))) }).map((_, i) => (
                          <div
                            key={`bot-chair-${i}`}
                            className={`w-7 sm:w-8 h-2.5 rounded-b-md border transition-all flex items-center justify-center ${
                              isOccupied
                                ? 'bg-amber-400 border-amber-500 shadow-2xs'
                                : 'bg-slate-200 border-slate-300'
                            }`}
                            title={isOccupied ? 'Guest Seated' : 'Available Chair Cushion'}
                          >
                            {isOccupied && <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Direct Ready Dishes List with Specific Dish Names on Table Card */}
                    {isOccupied && (tableReadyDishes.length > 0 || readyDishes.length > 0) && (
                      <div className="p-2.5 rounded-2xl bg-blue-50/95 border-2 border-blue-400 text-blue-950 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-1.5">
                          <div className="flex items-center space-x-1.5 text-xs font-black text-blue-900">
                            <ChefHat className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                            <span>Ready for Pickup ({(readyDishes.length > 0 ? readyDishes : tableReadyDishes).length})</span>
                          </div>
                          {cookingDishes.length > 0 && (
                            <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              {cookingDishes.length} Cooking
                            </span>
                          )}
                        </div>

                        {/* List each ready dish with exact dish name and Deliver button */}
                        <div className="space-y-1.5">
                          {(readyDishes.length > 0 ? readyDishes : tableReadyDishes).map((rd, rdIdx) => (
                            <div 
                              key={rdIdx} 
                              className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-200 shadow-2xs gap-1.5"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-heading font-black text-xs text-slate-900 block truncate">
                                  🟢 {rd.qty || rd.quantity || 1}x {String(rd.name || rd.dishName || rd.itemsSummary || 'Dish').replace(/^(\d+x\s*)+/i, '').replace(/^Deliver:\s*/i, '')}
                                </span>
                                {rd.gujaratiName && rd.gujaratiName !== (rd.name || rd.dishName) && (
                                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                                    {rd.gujaratiName}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeliverReadyDish(rd)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-[11px] cursor-pointer shadow-xs transition shrink-0 flex items-center space-x-1"
                                title={`Mark ${rd.name || rd.dishName} delivered`}
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Deliver</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Guest Calling Bell Alert on Table Card */}
                    {tableCalls.length > 0 && (
                      <div className={`p-2.5 rounded-xl ${tableCleanCall ? 'bg-amber-100/95 border-amber-400' : 'bg-amber-100/90 border-amber-300'} text-amber-950 flex items-center justify-between gap-2 animate-pulse shadow-2xs`}>
                        <div className="flex items-center space-x-1.5 text-xs font-bold min-w-0">
                          {tableCleanCall ? (
                            <span className="text-sm">🧹</span>
                          ) : (
                            <BellRing className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          )}
                          <span className="truncate">{tableCalls[0].label || (tableCleanCall ? 'Clean & Reset Table' : 'Guest Calling')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDismissServiceCall) onDismissServiceCall(tableCalls[0].id, activeWaiterName, activeWaiterId);
                            if (audioEnabled) playSound('success');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-xs transition flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>{tableCleanCall ? 'Cleaned' : 'Attend'}</span>
                        </button>
                      </div>
                    )}

                    {/* Occupied Table Details: Customer & Dining Duration */}
                    {isOccupied ? (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex justify-between items-center text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800 truncate max-w-[140px] flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400 inline" />
                            <span>{table.current_customer_name || activeTableOrders[0]?.customer_name || 'Dine-In Guest'}</span>
                          </span>
                          {elapsedDiningMins !== null ? (
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded flex items-center space-x-1 bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="w-2.5 h-2.5 inline text-slate-500" />
                              <span>{elapsedDiningMins}m dining</span>
                            </span>
                          ) : seatedTime ? (
                            <span className="text-slate-500 font-mono text-[10px] flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5 text-slate-400 inline" />
                              <span>Seated {seatedTime}</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Dish Delivery Progress Bar */}
                        {totalItems > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono font-bold">
                              <span className="text-slate-500">Dish Delivery</span>
                              <span className={percent === 100 ? 'text-emerald-700' : 'text-amber-800'}>
                                {deliveredItems}/{totalItems} Served ({percent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-0.5">
                        <p className="text-[11px] text-slate-500 font-medium">
                          {tableCleanCall ? '🧹 Table Vacated & Clean • Ready to Seat' : 'Table Clean & Sanitized • Ready to Seat'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                    {!isOccupied ? (
                      /* Table is available: 1-Tap Seat Guests & Take Order */
                      <div className="w-full space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (tableCleanCall && onDismissServiceCall) {
                              onDismissServiceCall(tableCleanCall.id, activeWaiterName, activeWaiterId);
                            }
                            handleOpenOrderPad(table);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
                        >
                          <Plus className="w-4 h-4 text-white" />
                          <span>Seat Guests & Take Order</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 w-full">
                        <div className="grid grid-cols-5 gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => handleOpenOrderPad(table)}
                            className="col-span-3 py-2.5 px-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs min-h-[42px]"
                            title="Add more dishes directly to this table's running bill"
                          >
                            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                            <span className="truncate">+ Add Dishes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickTableWater(table)}
                            className="col-span-2 py-2.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-black text-xs flex items-center justify-center space-x-1 transition cursor-pointer shadow-xs min-h-[42px]"
                            title="1-Tap Order Water (₹20): Immediately adds bottle to table bill and kitchen queue"
                          >
                            <GlassWater className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                            <span className="truncate">+ Water (₹20)</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => setViewingBillTable(table)}
                            className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 font-bold text-xs flex items-center justify-center space-x-1 transition cursor-pointer min-h-[40px]"
                            title="View itemized table running bill (Payment is collected at cashier counter)"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="truncate">See Bill: ₹{totalBillAmount}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTableDishesModal(table)}
                            className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer min-h-[40px] ${
                              readyDishes.length > 0 || tableReadyDishes.length > 0
                                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-400/60 animate-pulse font-black'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200'
                            }`}
                            title={readyDishes.length > 0 ? "Deliver ready dishes to table" : "View dish delivery checklist"}
                          >
                            {readyDishes.length > 0 || tableReadyDishes.length > 0 ? (
                              <>
                                <CheckCheck className="w-4 h-4 text-white stroke-[3] shrink-0" />
                                <span className="truncate">🍽️ Deliver ({readyDishes.length || tableReadyDishes.length} Ready)</span>
                              </>
                            ) : (
                              <>
                                <Utensils className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">Dishes ({deliveredItems}/{totalItems})</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Table Actions Row: Shift Table & Vacate Table */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setShiftingTable(table);
                              setShiftTarget('');
                            }}
                            className="text-slate-500 hover:text-slate-800 font-semibold flex items-center space-x-1.5 transition cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                            <span>Shift Table</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Vacate Table ${table.number} and mark it available?`)) {
                                if (onVacateTable) onVacateTable(table.number);
                              }
                            }}
                            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 transition cursor-pointer py-1 px-2 rounded-lg hover:bg-emerald-50"
                            title="Vacate and free this table"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Vacate Table</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* 4B. RIGHT SIDE SERVICE & RUNNER PANEL (Docked side panel only on ultra-wide screens >= 2xl) */}
        {isSidePanelOpen && (
          <aside className="hidden 2xl:block w-88 xl:w-96 shrink-0 sticky top-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3.5 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {renderServiceStream(false)}
          </aside>
        )}

      </div>

      {/* 4C. FLOATING ACTION PILL FOR LIVE CALLS & READY FOOD (< 2xl screens) */}
      {totalAlertsCount > 0 && !isSidePanelOpen && (
        <div className="fixed bottom-4 right-4 z-40 2xl:hidden animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => setSideDrawerOpen(true)}
            className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-2xl flex items-center space-x-2 border border-slate-700 active:scale-95 cursor-pointer animate-bounce"
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>{totalAlertsCount} Floor Alerts</span>
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono font-bold">
              {totalAlertsCount}
            </span>
          </button>
        </div>
      )}

      {/* 4D. SLIDE-OVER SERVICE DRAWER (< 2xl screens) */}
      {sideDrawerOpen && (
        <div className="fixed inset-0 z-50 2xl:hidden flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm sm:max-w-md h-full bg-white shadow-2xl p-4 overflow-y-auto space-y-4 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {renderServiceStream(true)}
            </div>
            <div className="pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setSideDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer min-h-[40px]"
              >
                Close Drawer · પાછા ટેબલ પર જાવ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4E. SHIFT CASH DRAWER & AUDIT MODAL */}
      {showShiftDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-xs">
                  {currentWaiter.avatar || '🤵'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-heading font-black text-sm text-slate-900">
                      {currentWaiter.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                      {activeWaiterId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Shift: <span className="font-bold text-slate-700">{currentWaiter.shift}</span> • Cash Audit Drawer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {waiterShiftCash > 0 ? `Settled by ${currentWaiter.name}` : 'Cash Register Tickets'}
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900">{shiftCashOrders.length}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {waiterShiftCash > 0 ? `ID: ${activeWaiterId}` : 'All Floor Cash Orders'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    {waiterShiftCash > 0 ? 'My Shift Cash' : 'Floor Register In-Hand'}
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-700">₹{totalShiftCash}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {waiterShiftCash > 0 ? `Floor Total: ₹${totalFloorCash}` : 'Physical Drawer Balance'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {waiterShiftCash > 0 ? `My Collected Orders (${shiftCashOrders.length}):` : `Floor Cash Register Orders (${shiftCashOrders.length}):`}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    Total: ₹{totalShiftCash}
                  </span>
                </div>

                {shiftCashOrders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                    No cash settled under Waiter ID <span className="font-mono font-bold text-slate-700">{activeWaiterId}</span> yet.
                    When you collect cash from tables, it will record here automatically.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 divide-y divide-slate-100 pr-1">
                    {shiftCashOrders.map(o => (
                      <div key={o.id || o.order_number} className="pt-2 flex items-center justify-between text-xs">
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{o.table_number || 'Dine-In'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{o.order_number || o.id}</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[9px] font-mono font-bold border border-emerald-200">
                              Cash
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {o.customer_name || 'Guest'} • {o.settled_at ? new Date(o.settled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (o.time || 'Today')}
                          </div>
                        </div>
                        <span className="font-mono font-black text-sm text-emerald-700 shrink-0">₹{o.total || o.total_amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Handover Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  playSound('success');
                  alert(`Shift Handover Confirmed!\n\nWaiter: ${currentWaiter.name} (${activeWaiterId})\nTotal Cash Balance: ₹${totalShiftCash}\nTables Settled: ${shiftCashOrders.length}\n\nHandover receipt recorded for manager audit.`);
                  if (onLogout) onLogout();
                }}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirm Cash Handover (₹{totalShiftCash}) & End Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. HANDHELD MOBILE ORDER PAD MODAL (Blinkit / Zepto E-Commerce Layout matching user reference photo) */}
      {orderingTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 w-full max-w-full overflow-hidden">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 mx-auto">
            
            {/* Top Bar: Brand, Table Badge, Waiter Attribution & Close */}
            <div className="p-3 sm:p-3.5 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-heading font-black text-base shadow-xs shrink-0">
                  🥞
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-heading font-black text-sm text-slate-900 truncate">
                      Order Pad: Table {orderingTable.number}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shrink-0">
                      {orderingTable.status === 'occupied' ? 'Round 2 / Add-On' : 'New Table Session'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Server: <span className="text-slate-900 font-bold">{activeWaiterName}</span> ({activeWaiterId}) • Atmiya Dosa Hub
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderingTable(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MOBILE CATEGORY SLIDER (Visible on mobile screens, hidden on md+) */}
            <div className="md:hidden flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-2 px-3 bg-slate-50 border-b border-slate-200 shrink-0">
              {[
                { id: 'All', name: 'All Specials', icon: '🌟' },
                { id: 'Mysore Dosa', name: 'Mysore Dosa', icon: '🥞' },
                { id: 'Fancy Dosa', name: 'Fancy Dosa', icon: '✨' },
                { id: 'Plain Paper Dosa', name: 'Paper Crisp', icon: '🫓' },
                { id: 'Pav Bhaji & Pulao', name: 'Pav Bhaji & Pulao', icon: '🥘' },
                { id: 'Beverages & Water', name: 'Drinks & Chaas', icon: '🥤' }
              ].map(cat => {
                const isActive = orderPadCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setOrderPadCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* DUAL-PANE BODY: Left Vertical Category Rail (Desktop/Tablet) + Right Products Stream */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
              
              {/* LEFT PANE: Vertical Category Navigation Rail (Only for tablets / desktop >= md) */}
              <div className="hidden md:flex w-24 shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto no-scrollbar flex-col py-2 space-y-1">
                {[
                  { id: 'All', name: 'All Specials', icon: '🌟', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
                  { id: 'Mysore Dosa', name: 'Mysore Dosa', icon: '🥞', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
                  { id: 'Fancy Dosa', name: 'Fancy Dosa', icon: '✨', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
                  { id: 'Plain Paper Dosa', name: 'Paper Crisp', icon: '🫓', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                  { id: 'Pav Bhaji & Pulao', name: 'Pav Bhaji & Pulao', icon: '🥘', bg: 'bg-red-100 text-red-800 border-red-300' },
                  { id: 'Beverages & Water', name: 'Drinks & Chaas', icon: '🥤', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' }
                ].map(cat => {
                  const isActive = orderPadCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setOrderPadCategory(cat.id)}
                      className={`w-full py-2.5 px-1 flex flex-col items-center justify-center transition cursor-pointer relative ${
                        isActive
                          ? 'bg-white text-slate-900 border-l-4 border-emerald-600 font-black shadow-2xs'
                          : 'border-l-4 border-transparent text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 font-medium'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-2xs border transition-all ${
                        isActive ? `${cat.bg} ring-2 ring-emerald-500/30 scale-105` : 'bg-white border-slate-200'
                      }`}>
                        {cat.icon}
                      </div>
                      <span className="text-[10px] text-center leading-tight mt-1.5 line-clamp-2 px-0.5">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* RIGHT PANE: Search, Quick Filters & Adaptive Food Cards Grid */}
              <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-3">
                
                {/* Search Bar & Top Filter Chips */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Mysore Dosa, Pav Bhaji, Chaas..."
                      value={orderPadSearch}
                      onChange={(e) => setOrderPadSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-200/80 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    />
                    {orderPadSearch && (
                      <button
                        type="button"
                        onClick={() => setOrderPadSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Top Dietary Presets Bar */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    <button
                      type="button"
                      onClick={() => setIsJainPreset(!isJainPreset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap flex items-center space-x-1 min-h-[34px] ${
                        isJainPreset 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🌱</span>
                      <span>Jain</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExtraButterPreset(!extraButterPreset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap flex items-center space-x-1 min-h-[34px] ${
                        extraButterPreset 
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🧈</span>
                      <span>Extra Butter (+₹20)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExtraCheesePreset(!extraCheesePreset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap flex items-center space-x-1 min-h-[34px] ${
                        extraCheesePreset 
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🧀</span>
                      <span>Extra Cheese (+₹30)</span>
                    </button>
                  </div>
                </div>

                {/* Products Grid: 1-Column List on Mobile Phones, 2 on Tablets, 3 on Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                  {menuItems
                    .filter(i => {
                      if (orderPadCategory !== 'All' && i.category !== orderPadCategory) return false;
                      if (orderPadSearch.trim()) {
                        const q = orderPadSearch.toLowerCase();
                        const enName = (i.name || '').toLowerCase();
                        const gujName = (i.gujarati_name || '').toLowerCase();
                        const cat = (i.category || '').toLowerCase();
                        return enName.includes(q) || gujName.includes(q) || cat.includes(q);
                      }
                      return true;
                    })
                    .map(item => {
                      const cartEntry = orderPadCart.find(c => c.id === item.id);
                      const qty = cartEntry?.qty || 0;
                      const isSoldOut = item.is_available === false;
                      const englishName = getDishDisplayName(item, 'en') || item.name;
                      const gujaratiName = getDishDisplayName(item, 'gu') || item.gujarati_name || '';
                      const finalPrice = item.finalPrice || item.price;
                      const mrpPrice = Math.round(finalPrice * 1.2);
                      const discountAmount = mrpPrice - finalPrice;

                      // Culinary icon matching & Dish Photo
                      const catLower = (item.category || '').toLowerCase();
                      const nameLower = englishName.toLowerCase();
                      const dishIcon = catLower.includes('mysore') || nameLower.includes('mysore') ? '🥞'
                        : catLower.includes('fancy') ? '✨'
                        : catLower.includes('paper') ? '🫓'
                        : catLower.includes('pav') || nameLower.includes('pav') ? '🥘'
                        : catLower.includes('pulao') || nameLower.includes('rice') ? '🍛'
                        : catLower.includes('beverage') || nameLower.includes('chaas') ? '🥤'
                        : '🍽️';
                      const dishPhoto = item.image_url || item.imageUrl || item.image || item.photo || null;

                      return (
                        <div
                          key={item.id}
                          className={`bg-white rounded-2xl border transition-all duration-200 p-2.5 sm:p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs relative ${
                            isSoldOut
                              ? 'border-slate-200 opacity-50 cursor-not-allowed bg-slate-50'
                              : qty > 0
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          {/* 1. MOBILE PHONE LAYOUT (<640px): Clean horizontal card with full width */}
                          <div className="sm:hidden flex items-center justify-between gap-3 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 mb-1">
                                <div className="w-3.5 h-3.5 rounded-xs border border-emerald-600 bg-white flex items-center justify-center p-0.5 shrink-0" title="Pure Veg">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">1 Plate</span>
                                <span className="text-amber-500 font-bold text-[10px] flex items-center">
                                  ★ 4.8
                                </span>
                                <span className="text-slate-400 text-[10px] flex items-center">
                                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                  {item.prepTimeMins || 10}m
                                </span>
                              </div>

                              <h5 className="font-heading font-black text-sm text-slate-900 leading-snug truncate">
                                {englishName}
                              </h5>
                              {gujaratiName && gujaratiName !== englishName && (
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                  {gujaratiName}
                                </p>
                              )}

                              <div className="flex items-center space-x-1.5 mt-1.5">
                                <span className="font-mono font-black text-sm text-slate-900">
                                  ₹{finalPrice}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono line-through">
                                  ₹{mrpPrice}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[9px]">
                                  ₹{discountAmount} OFF
                                </span>
                              </div>
                            </div>

                            {/* Right: Food Image / Icon & Touch-Friendly Stepper / Add Button */}
                            <div className="flex flex-col items-end shrink-0 space-y-1.5">
                              {dishPhoto ? (
                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-amber-200/50 flex items-center justify-center bg-slate-100 shadow-2xs relative shrink-0">
                                  <img 
                                    src={dishPhoto} 
                                    alt={englishName} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="w-full h-full hidden items-center justify-center text-2xl bg-gradient-to-br from-amber-50 to-orange-50">
                                    {dishIcon}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 flex items-center justify-center text-2xl shadow-2xs">
                                  {dishIcon}
                                </div>
                              )}
                              {qty > 0 ? (
                                <div className="w-24 h-9 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs flex items-center justify-between overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => handlePadRemoveDish(item.id)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 text-base font-black transition cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono font-bold text-xs text-white">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handlePadAddDish(item)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 text-base font-black transition cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSoldOut}
                                  onClick={() => handlePadAddDish(item)}
                                  className="w-24 h-9 rounded-xl bg-white border-2 border-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 font-black text-xs uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                                >
                                  <span>+ Add</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 2. TABLET & DESKTOP LAYOUT (sm:flex): Blinkit-style vertical card */}
                          <div className="hidden sm:flex flex-col justify-between h-full">
                            <div>
                              <div className="w-full h-28 sm:h-32 rounded-xl bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100/60 border border-amber-200/40 relative flex items-center justify-center overflow-hidden">
                                {dishPhoto ? (
                                  <>
                                    <img 
                                      src={dishPhoto} 
                                      alt={englishName} 
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="w-full h-full hidden items-center justify-center">
                                      <span className="text-4xl sm:text-5xl select-none filter drop-shadow-xs">
                                        {dishIcon}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-4xl sm:text-5xl select-none filter drop-shadow-xs transform transition-transform group-hover:scale-110">
                                    {dishIcon}
                                  </span>
                                )}

                                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 backdrop-blur-2xs flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-2xs cursor-pointer">
                                  <Heart className="w-3.5 h-3.5" />
                                </div>

                                <div className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-xs border border-emerald-600 bg-white flex items-center justify-center p-0.5 shadow-2xs" title="100% Pure Vegetarian">
                                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                                </div>

                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-2xs text-[9px] font-mono font-bold text-slate-700 shadow-2xs border border-slate-200/60">
                                  1 Plate
                                </span>
                              </div>

                              <div className="mt-2">
                                {qty > 0 ? (
                                  <div className="w-full rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs flex items-center justify-between overflow-hidden min-h-[34px]">
                                    <button
                                      type="button"
                                      onClick={() => handlePadRemoveDish(item.id)}
                                      className="w-9 h-8 flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 text-base font-black transition cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold text-xs text-white">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => handlePadAddDish(item)}
                                      className="w-9 h-8 flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 text-base font-black transition cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isSoldOut}
                                    onClick={() => handlePadAddDish(item)}
                                    className="w-full py-1.5 rounded-xl bg-white border-2 border-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 font-black text-xs uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1 min-h-[34px]"
                                  >
                                    <span>+ Add</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 space-y-1">
                              <div className="flex items-center flex-wrap gap-1">
                                <span className="font-mono font-black text-sm sm:text-base text-slate-900 leading-none">
                                  ₹{finalPrice}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono line-through">
                                  ₹{mrpPrice}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono font-black text-[9px] border border-amber-200">
                                  ₹{discountAmount} OFF
                                </span>
                              </div>

                              <div>
                                <h5 className="font-heading font-black text-xs text-slate-900 leading-snug line-clamp-2">
                                  {englishName}
                                </h5>
                                {gujaratiName && gujaratiName !== englishName && (
                                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                    {gujaratiName}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
                                <span className="text-amber-500 font-bold flex items-center">
                                  ★ 4.8
                                </span>
                                <span className="text-slate-400 font-mono">(450+)</span>
                                <span>•</span>
                                <span className="flex items-center text-slate-600">
                                  <Clock className="w-2.5 h-2.5 inline mr-0.5 text-slate-400" />
                                  {item.prepTimeMins || 10}m
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                </div>

                {/* Quick 1-Tap Cooking Notes Suggestions */}
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 mt-2">
                  <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                    {[
                      'Extra Crispy Paper',
                      'Double Coconut Chutney',
                      'Sambhar Hot in Bowl',
                      'Less Spicy for Kids',
                      'Butter on Side'
                    ].map(quickNote => (
                      <button
                        key={quickNote}
                        type="button"
                        onClick={() => setOrderNote(prev => prev ? `${prev}, ${quickNote}` : quickNote)}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold whitespace-nowrap cursor-pointer transition shadow-2xs"
                      >
                        +{quickNote}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Special instructions for kitchen chef (e.g. Extra crisp, sambhar on side)..."
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

              </div>

            </div>

            {/* Bottom Floating Order Summary & Fire KOT Bar (Matching Image 2 Bottom Action Bar) */}
            <div className="p-3 sm:p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block font-bold truncate">
                  {orderPadCart.reduce((acc, i) => acc + i.qty, 0)} Items Selected • Atmiya Dosa Hub
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-slate-900">
                  ₹{calculatePadTotal().total}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderingTable(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={orderPadCart.length === 0}
                  onClick={handleFireKOTFromPad}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95 min-h-[44px]"
                >
                  <Flame className="w-4 h-4 fill-current text-white" />
                  <span>Fire KOT to Kitchen</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. TABLE ORDER TICKET & DISHES MANAGER MODAL */}
      {tableDishesModal && (() => {
        const tOrders = getTableActiveOrders(tableDishesModal.number);
        const primaryOrder = tOrders[0];
        const allDishes = [];
        tOrders.forEach(ord => {
          (ord.items || []).forEach((it, idx) => {
            const hasExplicitStatuses = (ord.items || []).some(i => i.kitchen_status);
            const isItemServed = Boolean(it.is_served);
            const isItemReady = !isItemServed && (it.kitchen_status === 'ready' || it.kitchen_status === 'prepared' || (!hasExplicitStatuses && ord.status === 'Ready'));
            allDishes.push({
              ...it,
              orderId: ord.id,
              orderNumber: ord.order_number || ord.id,
              itemIndex: idx,
              isServed: isItemServed,
              isReady: isItemReady,
              isCooking: !isItemServed && !isItemReady,
              cookingNote: it.cooking_note || it.note || it.customizations || ord.special_note
            });
          });
        });

        const readyDishes = allDishes.filter(d => d.isReady);
        const cookingDishes = allDishes.filter(d => d.isCooking);
        const deliveredDishes = allDishes.filter(d => d.isServed);
        const totalTicketPrice = tOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);
        const totalSubtotal = tOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
        const totalTax = tOrders.reduce((sum, o) => sum + Number(o.tax || 0), 0);
        const remainingGraceSecs = primaryOrder ? getRemainingGraceSeconds(primaryOrder) : 0;

        // Filter menu items for Add Dish picker
        const filteredMenuItems = (menuItems || []).filter(item => {
          if (ticketCategoryFilter !== 'All' && (item.category || '').toLowerCase() !== ticketCategoryFilter.toLowerCase()) {
            return false;
          }
          if (ticketSearchQuery.trim()) {
            const q = ticketSearchQuery.toLowerCase();
            return (item.name || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
          }
          return true;
        });

        const uniqueCategories = ['All', ...new Set((menuItems || []).map(m => m.category).filter(Boolean))];

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl border border-slate-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 leading-tight truncate">
                      Table {tableDishesModal.number} — Order Ticket & Dishes
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {tOrders.map(o => `#${o.order_number || o.id}`).join(', ') || 'No Active Ticket'}
                      {primaryOrder?.customer_name ? ` • ${primaryOrder.customer_name}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTableDishesModal(null);
                    setShowAddDishSection(false);
                    setTicketSearchQuery('');
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 5-Minute Cancellation Grace Window Banner */}
              {primaryOrder && (
                <div className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                  remainingGraceSecs > 0 
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center space-x-2 font-bold">
                    <Clock className={`w-4 h-4 ${remainingGraceSecs > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                    <span>
                      {remainingGraceSecs > 0 ? '5-Minute Grace Window Active' : 'Grace Window Expired (Food Cooking)'}
                    </span>
                  </div>
                  {remainingGraceSecs > 0 ? (
                    <span className="font-mono font-black text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-lg text-xs">
                      ⏱️ {formatCountdown(remainingGraceSecs)} left
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Closed
                    </span>
                  )}
                </div>
              )}

              {/* View Switcher: Ticket Items vs. Add Extra Dish */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowAddDishSection(false)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    !showAddDishSection 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ticket Dishes ({allDishes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDishSection(true)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1 ${
                    showAddDishSection 
                      ? 'bg-orange-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Dish to Ticket</span>
                </button>
              </div>

              {/* Scrollable Body: Add Dish Picker OR Ticket Items Inspector */}
              <div className="overflow-y-auto space-y-3 pr-1 flex-1 min-h-[220px]">
                {showAddDishSection ? (
                  /* 1. ADD DISH TO ACTIVE TICKET PICKER */
                  <div className="space-y-2.5">
                    {/* Search and Category Filters */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search menu item to add..."
                          value={ticketSearchQuery}
                          onChange={(e) => setTicketSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-orange-500 font-medium"
                        />
                      </div>

                      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
                        {uniqueCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setTicketCategoryFilter(cat)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition ${
                              ticketCategoryFilter === cat
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Menu items list */}
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {filteredMenuItems.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200">
                          No menu items matched your search.
                        </div>
                      ) : (
                        filteredMenuItems.map(item => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 bg-white flex items-center justify-between gap-2 shadow-2xs transition"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" onError={(e)=>{e.currentTarget.style.display='none';}} />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  🍽️
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-xs text-slate-900 block truncate">{item.name}</span>
                                <span className="text-[11px] font-mono font-black text-emerald-700">₹{Number(item.price || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (primaryOrder) {
                                  handleAddDishToOrder(primaryOrder.id, item);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-[11px] shadow-xs cursor-pointer flex items-center space-x-1 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* 2. ITEM-BY-ITEM TICKET MANAGER (EDIT QTY, DELETE ITEM, DELIVER) */
                  <div className="space-y-2">
                    {allDishes.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-500 font-medium border border-dashed border-slate-200 space-y-1">
                        <p className="font-bold text-slate-700">No dishes in this ticket</p>
                        <p className="text-[11px] text-slate-400">Tap "+ Add Dish to Ticket" above to add items.</p>
                      </div>
                    ) : (
                      allDishes.map((d, i) => {
                        const dPhoto = d.image_url || d.imageUrl || d.image || d.photo || (menuItems.find(m => m.id === d.id || m.name === d.name)?.image_url);
                        return (
                          <div
                            key={`dish_row_${i}`}
                            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 shadow-2xs ${
                              d.isServed 
                                ? 'bg-slate-50/80 border-slate-200 opacity-80' 
                                : d.isReady 
                                  ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300' 
                                  : 'bg-white border-slate-200'
                            }`}
                          >
                            {/* Dish image */}
                            {dPhoto ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                                <img src={dPhoto} alt={d.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-base shrink-0">
                                🍽️
                              </div>
                            )}

                            {/* Dish details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className={`font-bold text-xs text-slate-900 truncate ${d.isServed ? 'line-through text-slate-500' : ''}`}>
                                  {d.name}
                                </span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                  d.isServed 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : d.isReady 
                                      ? 'bg-blue-100 text-blue-800 animate-pulse' 
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {d.isServed ? 'Served' : d.isReady ? 'Ready' : 'Cooking'}
                                </span>
                              </div>

                              <div className="text-[11px] font-mono font-bold text-slate-600 mt-0.5">
                                ₹{Number(d.price || d.unit_price || 0)} × {d.qty || d.quantity || 1} = <span className="text-slate-900 font-black">₹{(Number(d.price || d.unit_price || 0) * (d.qty || d.quantity || 1)).toFixed(2)}</span>
                              </div>

                              {d.cookingNote && (
                                <span className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium block truncate mt-0.5">
                                  📝 {d.cookingNote}
                                </span>
                              )}
                            </div>

                            {/* Dish actions: Qty +/- and Delete Trash button */}
                            <div className="flex items-center space-x-1.5 shrink-0">
                              {/* Quantity controls */}
                              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustItemQty(d.orderId, d.itemIndex, -1)}
                                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-mono font-bold text-xs text-slate-900">
                                  {d.qty || d.quantity || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustItemQty(d.orderId, d.itemIndex, 1)}
                                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                                  title="Increase quantity"
                                >
                                  +
                                </button>
                              </div>

                              {/* 1-Tap Delete Item button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTicketItem(d.orderId, d.itemIndex, d.name)}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center cursor-pointer transition"
                                title="Delete dish from ticket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Deliver status button */}
                              {!d.isServed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onToggleItemServed) onToggleItemServed(d.orderId, d.itemIndex, activeWaiterName, activeWaiterId);
                                    if (audioEnabled) playSound('success');
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-white font-bold text-[10px] cursor-pointer flex items-center space-x-1 ${
                                    d.isReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-800'
                                  }`}
                                  title="Deliver to table"
                                >
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                  <span>{d.isReady ? 'Deliver' : 'Served'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Order Financial Totals Box */}
              {!showAddDishSection && allDishes.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800">₹{Number(totalSubtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-200 pt-1">
                    <span>Ticket Total:</span>
                    <span className="font-mono text-emerald-700 text-base">₹{Number(totalTicketPrice || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Bottom Actions: Cancel Entire Ticket */}
              <div className="space-y-2 pt-1">

                {primaryOrder && onCancelOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmCancelModal({ order: primaryOrder });
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-300 font-black text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>❌ Cancel Entire Order Ticket · સંપૂર્ણ ઓર્ડર રદ કરો</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* 6b. CONFIRM ORDER CANCELLATION MODAL */}
      {confirmCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-200 text-slate-900">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-slate-900">
                  Cancel Order Ticket #{confirmCancelModal.order.order_number || confirmCancelModal.order.id}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Table {confirmCancelModal.order.table_number || 'Dine-In'} • Total ₹{confirmCancelModal.order.total || confirmCancelModal.order.total_amount}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Reason for Cancellation:
              </label>
              <select
                value={cancelReasonChoice}
                onChange={(e) => setCancelReasonChoice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="Customer requested cancellation (5m grace window)">Customer requested cancellation (5m grace window)</option>
                <option value="Customer changed mind / Left table">Customer changed mind / Left table</option>
                <option value="Accidental duplicate QR order">Accidental duplicate QR order</option>
                <option value="Wrong table number scanned">Wrong table number scanned</option>
                <option value="Kitchen ingredients out of stock">Kitchen ingredients out of stock</option>
                <option value="Other staff authorization">Other staff authorization</option>
              </select>
              <p className="text-[11px] text-slate-500 leading-snug">
                Cancelling this order will remove it from the kitchen KDS, free the table if no other orders exist, and notify the customer phone screen in real time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmCancelModal(null)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCancelOrder(confirmCancelModal.order.id, cancelReasonChoice)}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md cursor-pointer transition active:scale-98"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TABLE SHIFT MODAL */}
      {shiftingTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                <h3 className="font-heading font-black text-sm text-slate-900">
                  Shift Table {shiftingTable.number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShiftingTable(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select target table to move active guest session, tickets, and bill:
            </p>

            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {tables
                .filter(t => t.number !== shiftingTable.number && t.status === 'available')
                .map(t => (
                  <button
                    key={t.number}
                    type="button"
                    onClick={() => setShiftTarget(t.number)}
                    className={`p-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                      shiftTarget === t.number
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    T{t.number}
                  </button>
                ))}
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={!shiftTarget}
                onClick={handleConfirmTableShift}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Confirm Shift to T{shiftTarget}
              </button>
              <button
                type="button"
                onClick={() => setShiftingTable(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILL COLLECTION NOTE: Waiters only view running bill & add items. Settlement occurs at Cashier Counter. */}


      {/* 8B. DEDICATED TABLE RUNNING BILL MODAL (Unified Bill with Round 1 + Water / Add-Ons) */}
      {viewingBillTable && (() => {
        const tOrders = getTableActiveOrders(viewingBillTable.number);
        const activeOrder = tOrders[0] || null;
        const allItems = [];
        tOrders.forEach(o => {
          (o.items || []).forEach(it => allItems.push(it));
        });

        const subtotal = tOrders.reduce((acc, o) => acc + Number(o.subtotal || o.total || 0), 0);
        const tax = tOrders.reduce((acc, o) => acc + Number(o.tax || 0), 0);
        const discount = tOrders.reduce((acc, o) => acc + Number(o.discount || 0), 0);
        const total = tOrders.reduce((acc, o) => acc + Number(o.total || o.total_amount || 0), 0);

        // Group items by round or addon status
        const round1Items = allItems.filter(it => !it.is_addon && (it.round === 1 || !it.round));
        const addOnItems = allItems.filter(it => it.is_addon || (it.round && it.round > 1));

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Receipt Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-heading font-black text-base sm:text-lg">
                        Table {viewingBillTable.number} Running Bill
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
                        {tOrders.length > 0 ? (activeOrder?.order_number || activeOrder?.id || 'Active') : 'No Bill'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-100 font-medium">
                      {viewingBillTable.current_customer_name || activeOrder?.customer_name || 'Dine-In Guest'} • Server: {activeWaiterName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingBillTable(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bill Details & Itemized Breakdown */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {allItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No active dishes ordered for Table {viewingBillTable.number} yet.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Round 1 / Initial Orders */}
                    {round1Items.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                            <Utensils className="w-3 h-3 text-slate-400" />
                            <span>Round 1: Initial Order ({round1Items.length} items)</span>
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {round1Items.map((item, idx) => (
                            <div key={`r1_${idx}`} className="py-2 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900">{item.qty || item.quantity || 1}×</span>
                                  <span className="font-medium text-slate-800 truncate">{item.name}</span>
                                </div>
                                {item.customizations && (
                                  <span className="text-[10px] text-amber-800 font-medium block truncate">
                                    {item.customizations}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-slate-900">
                                  ₹{Number(item.price || 0) * Number(item.qty || item.quantity || 1)}
                                </span>
                                <span className={`text-[10px] block font-medium ${item.is_served ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {item.is_served ? '✓ Served' : '🍳 In Kitchen'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add-On Items / Round 2 (Water, Extra Pav, etc.) */}
                    {addOnItems.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Add-On Items & Water ({addOnItems.length} items)</span>
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                            Unified in Same Bill
                          </span>
                        </div>
                        <div className="divide-y divide-amber-100">
                          {addOnItems.map((item, idx) => (
                            <div key={`addon_${idx}`} className="py-2 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-amber-950">{item.qty || item.quantity || 1}×</span>
                                  <span className="font-semibold text-amber-950 truncate">{item.name}</span>
                                  {item.name?.toLowerCase().includes('water') && (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                                      💧 Water
                                    </span>
                                  )}
                                </div>
                                {item.customizations && (
                                  <span className="text-[10px] text-amber-800 font-medium block truncate">
                                    {item.customizations}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-slate-900">
                                  ₹{Number(item.price || 0) * Number(item.qty || item.quantity || 1)}
                                </span>
                                <span className={`text-[10px] block font-medium ${item.is_served ? 'text-emerald-700' : 'text-amber-700 font-bold'}`}>
                                  {item.is_served ? '✓ Served' : '🍳 Preparing'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subtotal & Taxes Breakdown Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-800">₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black pt-2 border-t border-slate-200 text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-600 text-lg">₹{total}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Payment Status:</span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                      {activeOrder?.payment_status || 'Pending Cash'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice: Bill Collection at Cashier Counter Only */}
              <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-center">
                <span className="text-[11px] font-bold text-amber-900 flex items-center justify-center gap-1.5">
                  <span>🏛️</span>
                  <span>Payment is collected at Cashier Counter. Floor staff can only view and add items.</span>
                </span>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const tbl = viewingBillTable;
                    setViewingBillTable(null);
                    handleOpenOrderPad(tbl);
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-xs flex items-center justify-center space-x-1.5 shadow-md transition cursor-pointer min-h-[46px]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add More Items to this Continued Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Vacate Table ${viewingBillTable.number} and mark it available?`)) {
                      if (onVacateTable) onVacateTable(viewingBillTable.number);
                      setViewingBillTable(null);
                    }
                  }}
                  className="px-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs transition cursor-pointer min-h-[46px] flex items-center justify-center space-x-1 shadow-sm shrink-0"
                  title="Vacate and free Table"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Vacate Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingBillTable(null)}
                  className="px-4 py-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer min-h-[46px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. PIN SECURITY UNLOCK MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-heading font-black text-base text-slate-900">
                Floor Manager PIN Required
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter Owner/Manager PIN to unlock admin privileges or exit Waiter mode.
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-1.5 text-left">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                maxLength={8}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                placeholder="Enter 4-digit PIN (2026)"
                autoFocus
                className="w-full py-3 text-center tracking-widest font-mono text-lg font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Verify & Unlock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Stay in Waiter Mode
                </button>
              </div>

              {/* Direct Sign Out / Switch User Option */}
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setEnteredPin('');
                  setPinError('');
                  if (onLogout) onLogout();
                  else if (onExitWaiterMode) onExitWaiterMode();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Sign Out / Switch Role</span>
              </button>
            </form>

            <div className="text-[10px] text-slate-400">
              🔒 Admin security layer protecting sensitive restaurant settings.
            </div>

          </div>
        </div>
      )}

      {/* 10. FAST WAITER PROFILE SWITCHER MODAL */}
      {showWaiterSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-xs">
                  🤵
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-slate-900">
                    Switch Active Server Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select your waiter profile to attribute orders & cash drawer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWaiterSwitchModal(false);
                  setSelectedWaiterCandidate(null);
                  setSwitchPinInput('');
                  setSwitchPinError('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Waiter Roster Cards */}
            <div className="space-y-2">
              {AVAILABLE_WAITERS.map(w => {
                const isCurrent = (w.waiter_id || w.id) === activeWaiterId;
                const isSelected = selectedWaiterCandidate?.waiter_id === w.waiter_id;

                return (
                  <div
                    key={w.waiter_id || w.id}
                    onClick={() => handleSelectWaiterForSwitch(w)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : isCurrent
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg shadow-xs">
                        {w.avatar || '🤵'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{w.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold text-[10px]">
                            {w.waiter_id}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block">
                          {w.shift} • PIN: {w.pin}
                        </span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ Active
                      </span>
                    ) : (
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-400'}`}>
                        {isSelected ? 'Selected' : 'Select →'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PIN Entry for Selected Waiter */}
            {selectedWaiterCandidate && (
              <form onSubmit={handleConfirmWaiterSwitch} className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Enter 4-Digit PIN for {selectedWaiterCandidate.name}:
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={switchPinInput}
                    onChange={(e) => {
                      setSwitchPinInput(e.target.value.replace(/\D/g, ''));
                      setSwitchPinError('');
                    }}
                    placeholder={`PIN (${selectedWaiterCandidate.pin})`}
                    autoFocus
                    className="w-full py-2.5 text-center tracking-widest font-mono text-base font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {switchPinError && (
                  <p className="text-xs font-bold text-rose-600 text-center">
                    {switchPinError}
                  </p>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    disabled={switchPinInput.length < 4}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    Confirm Switch to {selectedWaiterCandidate.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWaiterCandidate(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="text-[10px] text-slate-400 text-center">
              All cash settlements & manual orders will be permanently tied to the selected Waiter ID.
            </div>

          </div>
        </div>
      )}

      {/* 11. MOBILE BOTTOM ERGONOMIC TAB BAR (THUMB-FIRST COCKPIT) */}
      <nav 
        aria-label="Waiter Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('floor');
            setSideDrawerOpen(false);
            setShowShiftDrawer(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition cursor-pointer min-h-[48px] ${
            activeSubTab === 'floor' && !sideDrawerOpen && !showShiftDrawer
              ? 'text-blue-600 font-black bg-blue-50/80' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Utensils className={`w-5 h-5 ${activeSubTab === 'floor' && !sideDrawerOpen && !showShiftDrawer ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-bold mt-0.5">Tables</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('calls');
            setServiceFilter('calls');
            setSideDrawerOpen(true);
            setShowShiftDrawer(false);
          }}
          className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition cursor-pointer min-h-[48px] ${
            sideDrawerOpen && serviceFilter === 'calls'
              ? 'text-amber-600 font-black bg-amber-50/80' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <BellRing className={`w-5 h-5 ${sideDrawerOpen && serviceFilter === 'calls' ? 'stroke-[2.5]' : ''}`} />
            {guestCalls.length > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[17px] h-4 px-1 rounded-full bg-amber-600 text-white text-[9px] font-mono font-bold flex items-center justify-center animate-ping">
                {guestCalls.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-0.5">Calls</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('ready');
            setServiceFilter('ready');
            setSideDrawerOpen(true);
            setShowShiftDrawer(false);
          }}
          className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition cursor-pointer min-h-[48px] ${
            sideDrawerOpen && serviceFilter === 'ready'
              ? 'text-blue-600 font-black bg-blue-50/80' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <ChefHat className={`w-5 h-5 ${sideDrawerOpen && serviceFilter === 'ready' ? 'stroke-[2.5]' : ''}`} />
            {allReadyDishes.length > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[17px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
                {allReadyDishes.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-0.5">Food Ready</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('summary');
            setShowShiftDrawer(true);
            setSideDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition cursor-pointer min-h-[48px] ${
            showShiftDrawer
              ? 'text-emerald-600 font-black bg-emerald-50/80' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className={`w-5 h-5 ${showShiftDrawer ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-bold mt-0.5">Shift (₹{totalShiftCash})</span>
        </button>
      </nav>

    </div>
  );
}
