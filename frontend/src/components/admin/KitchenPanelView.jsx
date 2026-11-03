import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Volume2, 
  VolumeX,
  Check, 
  RotateCcw,
  AlertCircle,
  History,
  Printer,
  X,
  CheckCheck,
  Search,
  Ban,
  TrendingUp,
  Info,
  Trash2,
  LogOut
} from 'lucide-react';
import { playSound, unlockAudio } from '../../lib/sound';
import { getTranslation, getDishDisplayName } from '../../lib/translations';
import { getDishCuisine, CUISINE_CONFIG } from '../../lib/cuisines';
import { speakOrderAlert, speakSystemTestAlert } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

const OWNER_PIN = '2026';

/**
 * Robust Multi-Tier Ticket Items Resolver
 * Guarantees that kitchen chef ALWAYS sees every ordered dish, quantity, and add-on.
 * Never leaves a KOT card blank or missing dishes!
 */
const resolveTicketItems = (order) => {
  if (!order) return [];

  // 1. Direct items array
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }

  // 2. Fallback to order_items from Supabase relation
  if (Array.isArray(order.order_items) && order.order_items.length > 0) {
    return order.order_items.map((oi, idx) => ({
      id: oi.id || `oi_${idx}`,
      name: oi.item_name || oi.name || 'Dish Item',
      qty: oi.quantity || oi.qty || 1,
      price: oi.unit_price || oi.price || 0,
      kitchen_status: String(oi.status || '').toLowerCase() === 'ready' ? 'ready' : 'placed',
      is_served: String(oi.status || '').toLowerCase() === 'served',
      cooking_note: oi.cooking_note || null,
      note: oi.cooking_note || null
    }));
  }

  // 3. Fallback: Parse structured items_summary string
  if (order.items_summary) {
    const parts = String(order.items_summary).split(',').map(s => s.trim()).filter(Boolean);
    const parsed = parts.map((part, pIdx) => {
      const m = part.match(/^(\d+)x?\s*(.+)$/i);
      const qty = m ? parseInt(m[1], 10) : 1;
      const name = m ? m[2].trim() : part;
      return {
        id: `summary_dish_${order.id}_${pIdx}`,
        name: name,
        qty: qty,
        price: 0,
        kitchen_status: (order.status || '').toLowerCase() === 'ready' ? 'ready' : 'placed',
        is_served: (order.status || '').toLowerCase() === 'served',
        cooking_note: null
      };
    });
    if (parsed.length > 0) return parsed;
  }

  // 4. Fallback: Parse from special_note if add-on (e.g. Mineral Water) was recorded
  if (order.special_note) {
    const waterMatch = order.special_note.match(/(?:\+|💧)?\s*(\d+)x?\s*Mineral\s*Water/i);
    if (waterMatch) {
      const waterQty = parseInt(waterMatch[1], 10) || 1;
      return [{
        id: `addon_water_${order.id}`,
        name: 'Packaged Mineral Water (1 Litre Bottle)',
        qty: waterQty,
        price: 20,
        kitchen_status: (order.status || '').toLowerCase() === 'ready' ? 'ready' : 'placed',
        is_addon: true,
        is_served: (order.status || '').toLowerCase() === 'served',
        cooking_note: 'Chilled bottle'
      }];
    }
  }

  return [];
};

export default function KitchenPanelView({ 
  orders = [], 
  menuItems = [],
  onUpdateStatus, 
  onToggleStock, 
  onToggleItemReady,
  onToggleItemServed,
  onMarkAllTableItemsServed,
  onClearCompletedOrders,
  authUser = null,
  onLogout,
  onExitKitchenMode,
  currentLang = 'en',
  theme = 'light',
  restaurantSettings = {}
}) {
  // Navigation & Tab state - Strict 4 Kitchen Stages ('all' removed as requested)
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'cooking' | 'ready' | 'history'
  const [selectedTableFilter, setSelectedTableFilter] = useState('all');

  // Persistent KDS item checklist state (survives browser refresh)
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('kds_checked_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persistent KDS cleared tickets state (survives refresh and eliminates cleared orders from Done tab)
  const [clearedOrderIds, setClearedOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('kds_cleared_order_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const audioEnabled = true;
  const voiceAlertsEnabled = true;
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null); // Real-time banner alert
  const [soundTestSuccess, setSoundTestSuccess] = useState(false);
  
  // Modals & Drawers
  const [showStockDrawer, setShowStockDrawer] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [printingKotOrder, setPrintingKotOrder] = useState(null);

  // Live second-by-second ticker for precise prep timers
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = (key) => getTranslation(currentLang, key);

  // 1. All Active Live KOTs (Default View): All uncompleted tickets (Placed, Cooking, Food Ready)
  const activeKitchenOrders = useMemo(() => {
    return orders.filter(o => {
      const s = String(o?.status || '').toLowerCase().trim();
      if (s === 'cancelled') return false;
      const items = resolveTicketItems(o);
      const allItemsServed = items.length > 0 && items.every(it => it.is_served);
      if (allItemsServed) return false;
      return true;
    });
  }, [orders]);

  // Placed orders (Used for new-order chimes)
  const placedOrders = useMemo(() => {
    return orders.filter(o => {
      const s = String(o?.status || '').toLowerCase().trim();
      return s === 'placed' || s === 'pending';
    });
  }, [orders]);

  // 2. Cooking Tab: Orders with items being prepared or ready on pass (Never disappears on marking ready!)
  const preparingOrders = useMemo(() => {
    return orders.filter(o => {
      const s = String(o?.status || '').toLowerCase().trim();
      if (s === 'cancelled') return false;
      const items = resolveTicketItems(o);
      const allItemsServed = items.length > 0 && items.every(it => it.is_served);
      if (allItemsServed) return false;
      return true; // Retains order card until every dish is delivered
    });
  }, [orders]);

  // 3. Food Ready: Any ticket that has dishes prepared & ready for waiter runner pickup
  const readyOrders = useMemo(() => {
    return orders.filter(o => {
      const s = String(o?.status || '').toLowerCase().trim();
      if (s === 'cancelled') return false;
      const items = resolveTicketItems(o);
      const allItemsServed = items.length > 0 && items.every(it => it.is_served);
      if (allItemsServed) return false;
      return items.some((it, idx) => 
        !it.is_served && (
          (it.kitchen_status || '').toLowerCase() === 'ready' || 
          checkedItems[`${o.id}_${idx}`] ||
          (o.order_number && checkedItems[`${o.order_number}_${idx}`]) ||
          (o.supabase_order_id && checkedItems[`${o.supabase_order_id}_${idx}`])
        )
      );
    });
  }, [orders, checkedItems]);

  const activeOrders = useMemo(() => {
    return activeKitchenOrders;
  }, [activeKitchenOrders]);

  // 4. History / Done: Tickets where all items have been served or marked completed (Filtered to recent shift/today)
  const completedOrders = useMemo(() => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const clearedSet = new Set(clearedOrderIds.map(String));

    return orders.filter(o => {
      const idKey = String(o?.id || o?.order_number || o?.supabase_order_id || '');
      const orderNumKey = String(o?.order_number || '');
      const dbIdKey = String(o?.supabase_order_id || '');
      if (o?.kds_cleared || clearedSet.has(idKey) || (orderNumKey && clearedSet.has(orderNumKey)) || (dbIdKey && clearedSet.has(dbIdKey))) {
        return false;
      }

      const s = String(o?.status || '').toLowerCase().trim();
      if (s === 'cancelled') return false;
      const items = resolveTicketItems(o);
      // Under NO circumstances may a ticket enter Done if ANY dish is still unserved!
      const hasUnservedDishes = items.some(it => !it.is_served);
      if (hasUnservedDishes && items.length > 0) return false;

      const allItemsServed = items.length > 0 && items.every(it => it.is_served);
      const isFinished = s === 'served' || s === 'completed' || allItemsServed;
      if (!isFinished && !allItemsServed) return false;

      // Only display recent orders from today / last 24 hours
      const orderTime = o.placed_at || o.created_at;
      if (orderTime && (now - new Date(orderTime).getTime() > ONE_DAY_MS)) {
        return false;
      }
      return true;
    });
  }, [orders, now, clearedOrderIds]);

  const handleClearAllDone = () => {
    const idsToClear = completedOrders.map(o => String(o.id || o.order_number || o.supabase_order_id || '')).filter(Boolean);
    if (idsToClear.length === 0) return;

    const updated = Array.from(new Set([...clearedOrderIds, ...idsToClear]));
    setClearedOrderIds(updated);
    try {
      localStorage.setItem('kds_cleared_order_ids', JSON.stringify(updated));
    } catch (e) {}
    playSound('success');

    if (onClearCompletedOrders) {
      onClearCompletedOrders(idsToClear);
    }
  };

  // Aggregate live workload dishes currently in queue
  const aggregatedQueueDishes = useMemo(() => {
    const counts = {};
    activeOrders.forEach(o => {
      const items = resolveTicketItems(o);
      items.forEach(item => {
        const name = (item.name || 'Dish').trim();
        const qty = Number(item.qty || item.quantity || 1);
        counts[name] = (counts[name] || 0) + qty;
      });
    });
    return Object.entries(counts).map(([name, qty]) => ({ name, qty }));
  }, [activeOrders]);

  // ---------------------------------------------------------------------------
  // INCOMING ORDER SOUND ALERT & NOTIFICATION SYSTEM
  // ---------------------------------------------------------------------------
  const knownOrderIdsRef = useRef(new Set());
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      placedOrders.forEach(o => {
        const id = o.id || o.order_number;
        if (id) knownOrderIdsRef.current.add(id);
      });
      isFirstRunRef.current = false;
      return;
    }

    const newlyArrived = placedOrders.filter(o => {
      const id = o.id || o.order_number;
      return id && !knownOrderIdsRef.current.has(id);
    });

    if (newlyArrived.length > 0) {
      newlyArrived.forEach(ord => {
        const id = ord.id || ord.order_number;
        if (id) knownOrderIdsRef.current.add(id);
      });

      const latest = newlyArrived[0];
      const tbl = latest.table_number || 'Dine-In';

      // 1. Kitchen Chime Sound
      if (audioEnabled) {
        playSound('kitchen_bell');
      }

      // 2. Phone Vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([400, 150, 400, 150, 600]);
        } catch (e) {}
      }

      // 3. Spoken Voice Announcement
      if (voiceAlertsEnabled) {
        const items = latest.items_summary || (latest.items || []).map(i => `${i.qty || 1} ${i.name}`).join(', ');
        speakOrderAlert(tbl, latest.is_addon, items, latest.payment_mode);
      }

      // 4. Alert Banner & Auto-switch to 'new'
      setNewOrderAlert(latest);
      setActiveTab('new');
    }
  }, [placedOrders, audioEnabled, voiceAlertsEnabled]);

  // Audio unlock helper for mobile browsers
  const handleUnlockAudio = () => {
    unlockAudio();
    playSound('kitchen_bell');
    setAudioUnlocked(true);
    setSoundTestSuccess(true);
    setTimeout(() => setSoundTestSuccess(false), 2000);
  };

  // Sound Test Trigger
  const handleTestChime = () => {
    unlockAudio();
    playSound('kitchen_bell');
    if (selectedTableFilter && selectedTableFilter !== 'all') {
      speakOrderAlert(selectedTableFilter, false, 'Audio Test Order', 'Cash');
    } else {
      speakSystemTestAlert();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 250]);
      } catch (e) {}
    }
    setSoundTestSuccess(true);
    setTimeout(() => setSoundTestSuccess(false), 2000);
  };

  // Timer calculation
  const getElapsedSeconds = (order) => {
    const timeVal = order.placed_at || order.created_at;
    if (timeVal) {
      const diffMs = now - new Date(timeVal).getTime();
      return Math.max(0, Math.floor(diffMs / 1000));
    }
    return 60;
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  };

  const getUrgencyLevel = (totalSeconds) => {
    if (totalSeconds >= 12 * 60) return 'rush'; // >12 mins
    if (totalSeconds >= 7 * 60) return 'warning'; // 7-12 mins
    return 'normal'; // <7 mins
  };

  // Item Check-off / Ready to Serve Trigger
  const toggleItemCheck = (orderId, idx) => {
    const key = `${orderId}_${idx}`;
    setCheckedItems(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('kds_checked_items', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    if (audioEnabled) playSound('click');
    if (onToggleItemReady) {
      onToggleItemReady(orderId, idx);
    } else if (onToggleItemServed) {
      onToggleItemServed(orderId, idx);
    }
  };

  const areAllItemsChecked = (order) => {
    const items = resolveTicketItems(order);
    if (!items || items.length === 0) return false;
    return items.every((item, idx) => 
      item.is_served || 
      item.kitchen_status === 'ready' || 
      checkedItems[`${order.id}_${idx}`] ||
      (order.order_number && checkedItems[`${order.order_number}_${idx}`]) ||
      (order.supabase_order_id && checkedItems[`${order.supabase_order_id}_${idx}`])
    );
  };

  // Status transitions
  const handleStartCooking = (orderId) => {
    playSound('order');
    onUpdateStatus(orderId, 'Preparing');
  };

  const handleMarkReady = (order) => {
    playSound('success');
    const items = resolveTicketItems(order);
    setCheckedItems(prev => {
      const next = { ...prev };
      items.forEach((item, idx) => {
        next[`${order.id}_${idx}`] = true;
        if (order.order_number) next[`${order.order_number}_${idx}`] = true;
        if (order.supabase_order_id) next[`${order.supabase_order_id}_${idx}`] = true;
      });
      try {
        localStorage.setItem('kds_checked_items', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    onUpdateStatus(order.id, 'Ready');
  };

  const handleMarkServed = (orderId) => {
    playSound('success');
    onUpdateStatus(orderId, 'Served');
  };

  // Identify stale tickets older than 2 hours in active queue
  const staleActiveOrders = useMemo(() => {
    return activeOrders.filter(o => {
      const elapsed = getElapsedSeconds(o);
      return elapsed > 120 * 60; // > 2 hours
    });
  }, [activeOrders, now]);

  const handleSweepStaleOrders = () => {
    staleActiveOrders.forEach(o => {
      if (onUpdateStatus) {
        onUpdateStatus(o.id, 'Served');
      }
    });
    if (audioEnabled) playSound('success');
  };

  // Filtered Menu Items for Out of Stock Drawer
  const outOfStockItems = (menuItems || []).filter(item => item.is_available === false);
  const filteredMenuItems = (menuItems || []).filter(item => {
    if (!stockSearchQuery) return true;
    const q = stockSearchQuery.toLowerCase();
    return (item.name || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
  });

  // Determine list of orders for the active tab (Strictly 4 stages: Live KOTs, Cooking, Ready, History)
  const getOrdersForTab = () => {
    switch (activeTab) {
      case 'new':
      case 'live':
        return activeKitchenOrders;
      case 'cooking':
        return preparingOrders;
      case 'ready':
        return readyOrders;
      case 'history':
      case 'done':
        return completedOrders;
      default:
        return activeKitchenOrders;
    }
  };

  const tabOrders = getOrdersForTab();

  return (
    <div className="min-h-screen bg-slate-50 font-sans select-none pb-28 text-slate-900 max-w-lg mx-auto">
      
      {/* 1. MINIMAL, SOPHISTICATED KDS HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          
          {/* Brand Identity & Status */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs tracking-wider shrink-0 shadow-xs">
              KDS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Kitchen Display
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'} · {activeOrders.length} active tickets
              </p>
            </div>
          </div>

          {/* Clean Controls */}
          <div className="flex items-center space-x-1.5">
            
            {/* Audio Toggle / Test Button */}
            <button
              type="button"
              onClick={handleTestChime}
              className={`p-2 rounded-lg border text-xs font-semibold transition flex items-center justify-center cursor-pointer active:scale-95 ${
                soundTestSuccess 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Test Kitchen Chime"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Sold Out / 86 Drawer Button */}
            <button
              type="button"
              onClick={() => setShowStockDrawer(true)}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              title="Manage Sold Out Items"
            >
              <Ban className="w-3.5 h-3.5 text-slate-500" />
              <span>86 Items</span>
              {outOfStockItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold font-mono">
                  {outOfStockItems.length}
                </span>
              )}
            </button>

            {/* Sweep Stale Tickets Button (Visible only when tickets are older than 2 hours) */}
            {staleActiveOrders.length > 0 && (
              <button
                type="button"
                onClick={handleSweepStaleOrders}
                className="px-2.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer active:scale-95 animate-pulse"
                title="Dismiss tickets older than 2 hours"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear {staleActiveOrders.length} Stale</span>
              </button>
            )}

            {/* Exit / Sign Out Button */}
            <button
              type="button"
              onClick={() => {
                if (onExitKitchenMode) onExitKitchenMode();
                else if (onLogout) onLogout();
              }}
              className="px-2.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              title="Sign Out / Exit Kitchen"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Exit</span>
            </button>

          </div>
        </div>

        {/* 2. AUDIO ACTIVATION CALLOUT (Understated, High Contrast) */}
        {!audioUnlocked && (
          <div 
            onClick={handleUnlockAudio}
            className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs cursor-pointer hover:bg-black transition active:scale-98"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs block leading-tight">
                  Enable Audio Alerts
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  નવા ઓર્ડર માટે બેલ ચાલુ કરવા ટેપ કરો
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-white text-slate-900 font-bold text-[11px] shrink-0">
              Enable
            </span>
          </div>
        )}

        {/* 3. INCOMING REAL-TIME ORDER TOAST (Sleek Dark Card) */}
        {newOrderAlert && (
          <div className="p-3.5 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="font-bold text-xs tracking-wide uppercase text-amber-300">
                  New Order · Table {newOrderAlert.table_number || 'Dine-In'}
                </span>
              </div>
              <button 
                onClick={() => setNewOrderAlert(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 truncate font-medium">
              {newOrderAlert.items_summary || (newOrderAlert.items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}
            </p>
            <button
              onClick={() => {
                handleStartCooking(newOrderAlert.id);
                setNewOrderAlert(null);
              }}
              className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-bold text-xs shadow-xs transition"
            >
              Start Cooking Now
            </button>
          </div>
        )}

        {/* 4. DISCIPLINED SEGMENTED CONTROL TABS */}
        <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 gap-1">
          
          {/* Live KOTs / Active Tab (Default View) */}
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'new'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <span>Live KOTs</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              activeTab === 'new' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeKitchenOrders.length}
            </span>
          </button>

          {/* Cooking Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('cooking')}
            className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cooking'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <span>Cooking</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              activeTab === 'cooking' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {preparingOrders.length}
            </span>
          </button>

          {/* Ready Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('ready')}
            className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ready'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <span>Ready</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              activeTab === 'ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {readyOrders.length}
            </span>
          </button>

          {/* Done / Completed Tab (Strictly Done, All option removed) */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <span>Done</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              activeTab === 'history' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {completedOrders.length}
            </span>
          </button>

        </div>
      </header>

      {/* 5. LIVE WORKLOAD SUMMARY (Clean, Monochromatic Tags) */}
      {aggregatedQueueDishes.length > 0 && activeTab !== 'history' && (
        <div className="px-3 pt-3">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-slate-500" />
              <span>Queue:</span>
            </span>
            {aggregatedQueueDishes.map((dish, i) => (
              <span 
                key={i} 
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium shrink-0"
              >
                <span className="font-mono font-bold text-slate-900">{dish.qty}×</span>
                <span>{dish.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. MAIN ORDER TICKET STREAM (PHONE-FIRST SINGLE-COLUMN LAYOUT) */}
      <main className="p-3 space-y-3">
        {/* Done / History Section Header with 1-Tap Clear Button */}
        {activeTab === 'history' && completedOrders.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div>
              <div className="text-xs font-black text-slate-800">
                Completed Tickets ({completedOrders.length})
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Served & fulfilled kitchen orders
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearAllDone}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All Done</span>
            </button>
          </div>
        )}

        {tabOrders.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs my-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {activeTab === 'new' 
                  ? 'No Active Tickets Pending' 
                  : activeTab === 'cooking' 
                    ? 'Station is Clear' 
                    : activeTab === 'ready' 
                      ? 'All Ready Food Delivered' 
                      : 'No Orders in this View'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {activeTab === 'new' 
                  ? 'New customer orders will chime automatically.'
                  : 'All kitchen tasks are currently up to date.'}
              </p>
            </div>
          </div>
        ) : (
          tabOrders.map((order, cardIdx) => renderMobileOrderCard(order, cardIdx))
        )}
      </main>

      {/* 7. CHEF "86 / SOLD OUT" QUICK BOTTOM DRAWER */}
      {showStockDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] border-t border-slate-200">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Manage 86 / Sold Out Items
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Toggle items off when kitchen runs out of ingredients.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStockDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="Search dish (e.g. Mysore, Pav Bhaji)..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Dish List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
              {filteredMenuItems.map(dish => {
                const isAvail = dish.is_available !== false;
                const dishPhoto = dish.image_url || dish.imageUrl || dish.image || dish.photo;
                return (
                  <div key={dish.id} className="pt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {dishPhoto ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                          <img src={dishPhoto} alt={dish.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-lg shrink-0">
                          🍳
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {dish.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {dish.category} · ₹{dish.finalPrice || dish.price}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleStock(dish.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 shrink-0 cursor-pointer ${
                        isAvail
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      {isAvail ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Available</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Sold Out</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 text-center font-medium flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Items marked sold out are instantly hidden from customer phone menus.</span>
            </div>

          </div>
        </div>
      )}

      {/* 8. THERMAL KOT SLIP PREVIEW MODAL */}
      {printingKotOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Kitchen Order Ticket (KOT)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrintingKotOrder(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Slip Simulation */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 space-y-2">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <div className="font-bold text-sm uppercase">ATMIYA DOSA HUB</div>
                <div className="text-[10px] text-slate-500">PETLAD · KITCHEN COPY</div>
                <div className="font-bold text-base mt-1 text-slate-900">
                  TABLE: {printingKotOrder.table_number || 'DINE-IN'}
                </div>
                <div className="text-[10px] text-slate-500">
                  KOT #{printingKotOrder.id} · {printingKotOrder.time || 'NOW'}
                </div>
              </div>

              {printingKotOrder.special_note && (
                <div className="p-1.5 rounded-md bg-amber-50 text-amber-900 font-semibold text-[11px] border border-amber-200">
                  Note: {printingKotOrder.special_note}
                </div>
              )}

              <div className="space-y-1 py-1 border-b border-dashed border-slate-300">
                {(printingKotOrder.items || []).map((i, idx) => (
                  <div key={idx} className="flex justify-between font-semibold text-xs">
                    <span>{i.qty}× {i.name}</span>
                    <span>Kitchen</span>
                  </div>
                ))}
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-1">
                -- KITCHEN DISPATCH --
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintingKotOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // ---------------------------------------------------------------------------
  // ULTRA-LEGIBLE, PHONE-OPTIMIZED ORDER TICKET CARD (HUMAN-MADE & PREMIUM)
  // ---------------------------------------------------------------------------
  function renderMobileOrderCard(order, cardIdx = 0) {
    const totalSecs = getElapsedSeconds(order);
    const urgency = getUrgencyLevel(totalSecs);
    const isRush = urgency === 'rush';
    const isWarning = urgency === 'warning';
    const isVeryOld = totalSecs > 120 * 60; // Older than 2 hours
    
    const s = String(order.status || '').toLowerCase().trim();
    const isPlaced = s === 'placed' || s === 'pending';
    const isCooking = s === 'preparing' || s === 'cooking';
    const isReady = s === 'ready';
    // 1. Multi-tier resilient items resolution (guarantees dishes are NEVER missing or blank)
    const displayItems = resolveTicketItems(order);

    // If order has special_note mentioning Mineral Water, ensure it's in displayItems
    if (order.special_note) {
      const waterMatch = order.special_note.match(/(?:\+|💧)?\s*(\d+)x?\s*Mineral\s*Water/i);
      if (waterMatch) {
        const waterQty = parseInt(waterMatch[1], 10) || 1;
        const alreadyHasWater = displayItems.some(it => (it.name || '').toLowerCase().includes('water'));
        if (!alreadyHasWater) {
          displayItems.push({
            id: `addon_water_${order.id}`,
            name: 'Packaged Mineral Water (1 Litre Bottle)',
            qty: waterQty,
            price: 20,
            kitchen_status: 'placed',
            is_addon: true,
            is_served: false,
            cooking_note: 'Chilled bottle'
          });
        }
      }
    }

    const allItemsServed = displayItems.length > 0 && displayItems.every(it => it.is_served);
    const isServed = allItemsServed || (displayItems.length === 0 && (s === 'served' || s === 'completed'));

    const totalItemsCount = displayItems.length;
    const checkedCount = displayItems.filter((item, idx) => {
      const itemKey = `${order.id}_${idx}`;
      return item.is_served || 
        item.kitchen_status === 'ready' || 
        checkedItems[itemKey] ||
        (order.order_number && checkedItems[`${order.order_number}_${idx}`]) ||
        (order.supabase_order_id && checkedItems[`${order.supabase_order_id}_${idx}`]);
    }).length;
    const progressPercent = totalItemsCount > 0 ? Math.round((checkedCount / totalItemsCount) * 100) : 0;
    const allChecked = totalItemsCount > 0 && checkedCount === totalItemsCount;

    return (
      <div 
        key={`${order.id}-${cardIdx}`}
        className={`bg-white rounded-2xl border shadow-xs p-4 space-y-3 transition-all ${
          isPlaced
            ? 'border-amber-300 ring-1 ring-amber-300/50'
            : isCooking 
              ? 'border-blue-300' 
              : (isReady || allChecked)
                ? 'border-emerald-300 bg-emerald-50/10'
                : 'border-slate-200 opacity-90'
        }`}
      >
        {/* Card Header: Table Identification & Status */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                {String(order.table_number || '').toLowerCase().startsWith('table') 
                  ? order.table_number 
                  : `Table ${order.table_number || 'Dine-In'}`}
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                isPlaced && checkedCount === 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : (checkedCount > 0 && checkedCount < totalItemsCount)
                    ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                    : isCooking 
                      ? 'bg-blue-50 text-blue-800 border-blue-200' 
                      : (isReady || allChecked)
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {isPlaced && checkedCount === 0
                  ? 'New Order · નવો ઓર્ડર' 
                  : (checkedCount > 0 && checkedCount < totalItemsCount)
                    ? `🔥 ${checkedCount}/${totalItemsCount} Ready (${totalItemsCount - checkedCount} Cooking)`
                    : isCooking 
                      ? 'Cooking · રસોઈ ચાલુ' 
                      : (isReady || allChecked)
                        ? '✨ Food Ready on Pass · તૈયાર છે' 
                        : 'Completed'}
              </span>
              {(order.round > 1 || order.is_addon) && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border bg-purple-50 text-purple-800 border-purple-200">
                  ⚡ Round {order.round || 2} Add-on
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center space-x-1.5 flex-wrap">
              <span className="font-semibold text-slate-800 font-mono">Ticket {String(order.id || '').startsWith('#') ? order.id : `#${order.id}`}</span>
              <span>·</span>
              <span>{order.time || 'Just now'}</span>
              <span>·</span>
              <span className="font-semibold text-slate-700">{order.customer_name || 'Guest'}</span>
            </div>
          </div>

          {/* Prep Timer Badge */}
          <div className="shrink-0">
            <div className={`px-2.5 py-1 rounded-md font-mono font-semibold text-xs inline-flex items-center space-x-1.5 border ${
              isVeryOld
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse'
                : isRush 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' 
                  : isWarning 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : (isReady || allChecked)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(totalSecs)}</span>
            </div>
          </div>
        </div>

        {/* Stale Ticket Warning Banner with 1-Tap Dismiss */}
        {isVeryOld && !isServed && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold truncate">Stale ticket from past session ({Math.floor(totalSecs / 60)}m ago)</span>
            </div>
            <button
              type="button"
              onClick={() => handleMarkServed(order.id)}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Dismiss Ticket
            </button>
          </div>
        )}

        {/* Newly Added Add-on Banner for Kitchen */}
        {order.newly_added_summary && (order.round > 1 || order.is_addon) && (
          <div className="p-2.5 rounded-xl bg-purple-50/90 border border-purple-200 text-purple-950 text-xs flex items-start space-x-2">
            <span className="text-base shrink-0">⚡</span>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-800 block">
                Fresh Add-on Dishes To Cook (નવો ઓર્ડર):
              </span>
              <span className="font-black text-purple-900 break-words">{order.newly_added_summary}</span>
            </div>
          </div>
        )}

        {/* Special Instructions Box - Ultra-Prominent Kitchen Instruction Card */}
        {order.special_note && (
          <div className="p-3.5 rounded-2xl bg-amber-400 text-slate-950 border-2 border-amber-500 shadow-sm flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 text-slate-950 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] uppercase font-black tracking-wider text-slate-950 block">
                  ⚠️ CUSTOMER SPECIAL INSTRUCTIONS / ખાસ સૂચના:
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black text-amber-300 text-[9px] font-black uppercase tracking-wider shrink-0">
                  Chef Attention
                </span>
              </div>
              <p className="font-black text-sm text-slate-950 mt-1 leading-snug break-words">
                "{order.special_note}"
              </p>
            </div>
          </div>
        )}

        {/* Minimal Progress Line */}
        {totalItemsCount > 1 && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 font-mono">
              <span>Dishes Plated: {checkedCount}/{totalItemsCount}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  allChecked ? 'bg-emerald-500' : 'bg-slate-900'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Dish Items Checklist (Never Blank, Full Bilingual English + Gujarati Display) */}
        <div className="space-y-2 py-1">
          {displayItems.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-100 text-center text-xs text-slate-500 font-medium">
              No dishes recorded for this ticket.
            </div>
          ) : (
            displayItems.map((item, idx) => {
              const itemKey = `${order.id}_${idx}`;
              const isItemServed = Boolean(item.is_served || (isServed && allItemsServed));
              const isItemReady = Boolean(
                !isItemServed && (
                  item.kitchen_status === 'ready' || 
                  checkedItems[itemKey] || 
                  (order.order_number && checkedItems[`${order.order_number}_${idx}`]) ||
                  (order.supabase_order_id && checkedItems[`${order.supabase_order_id}_${idx}`])
                )
              );
              const isItemAddon = Boolean(item.is_addon || (order.round > 1 && item.round === order.round));
              const dishPhoto = item.image_url || item.imageUrl || item.image || item.photo || (menuItems.find(m => m.id === item.id || m.name === item.name)?.image_url);
              const gujaratiTitle = getDishDisplayName({ name: item.name }, 'gu');
              const cuisineKey = getDishCuisine({ name: item.name, category: item.category });
              const cuisineInfo = CUISINE_CONFIG[cuisineKey] || { label: 'Kitchen Station', gujaratiLabel: 'રસોઈ', icon: '🍳' };

              return (
                <div
                  key={idx}
                  onClick={() => !isItemServed && toggleItemCheck(order.id, idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                    isItemServed 
                      ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-75' 
                      : isItemReady
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                        : isItemAddon
                          ? 'bg-purple-50/60 hover:bg-purple-50/90 border-purple-200 text-slate-900 ring-1 ring-purple-300/40'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Left Quantity / Right Tick Badge */}
                    {isItemServed ? (
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs" title="Delivered to table">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-xs font-black">
                          {item.qty || item.quantity || 1}×
                        </span>
                      </div>
                    ) : (
                      <span className={`w-7 h-7 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 shadow-xs ${
                        isItemReady
                          ? 'bg-emerald-600 text-white'
                          : isItemAddon 
                            ? 'bg-purple-700 text-white' 
                            : 'bg-slate-900 text-white'
                      }`}>
                        {item.qty || item.quantity || 1}×
                      </span>
                    )}

                    {dishPhoto && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                        <img src={dishPhoto} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    )}
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold block truncate ${
                          isItemServed ? 'line-through text-slate-400' : isItemReady ? 'font-black text-emerald-950' : 'text-slate-900'
                        }`}>
                          {item.name}
                        </span>
                        {gujaratiTitle && gujaratiTitle !== item.name && (
                          <span className={`text-[11px] font-bold ${isItemServed ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                            ({gujaratiTitle})
                          </span>
                        )}
                      </div>

                      {/* Station and metadata badges */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span>{cuisineInfo.icon}</span>
                          <span>{cuisineInfo.gujaratiLabel || cuisineInfo.label}</span>
                        </span>

                        {isItemAddon && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200">
                            ⚡ Fresh Add-on
                          </span>
                        )}

                        {isItemReady && !isItemServed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✔ Plated & Ready · તૈયાર છે
                          </span>
                        )}

                        {isItemServed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Served at Table · ગ્રાહકને આપ્યું</span>
                          </span>
                        )}

                        {!isItemReady && !isItemServed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            ⏳ In Prep / રસોઈ ચાલુ
                          </span>
                        )}
                      </div>

                      {(item.cooking_note || item.note || item.customNote || item.customizations) && (
                        <div className="mt-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-bold text-[11px] flex items-center space-x-1 max-w-full">
                          <span className="text-amber-800 font-black shrink-0">📝 Note:</span>
                          <span className="break-words font-extrabold">{item.cooking_note || item.note || item.customNote || item.customizations}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Status Action Button */}
                  <div className="shrink-0">
                    {isItemServed ? (
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-1 text-[11px] font-bold shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                        <span>Delivered</span>
                      </div>
                    ) : isItemReady ? (
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white flex items-center space-x-1 text-[11px] font-black shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Ready</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-bold hover:bg-amber-100 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Tap Ready</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Button Section */}
        <div className="pt-2 space-y-2">
          
          {isPlaced && checkedCount === 0 && (
            <button
              type="button"
              onClick={() => handleStartCooking(order.id)}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Start Preparation · રસોઈ શરૂ કરો</span>
            </button>
          )}

          {(!allChecked && (isCooking || checkedCount > 0)) && (
            <button
              type="button"
              onClick={() => handleMarkReady(order)}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Mark All Remaining Ready · બધા તૈયાર છે</span>
            </button>
          )}

          {allChecked && !isServed && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound('kitchen_bell');
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
                  }
                  try {
                    const channel = supabase.channel('restaurant_alerts');
                    channel.send({
                      type: 'broadcast',
                      event: 'food_ready_for_pickup',
                      payload: {
                        tableNumber: (order.table_number || '').replace(/table/i, '').trim(),
                        orderId: order.id,
                        orderNumber: order.order_number || order.id,
                        itemsSummary: displayItems.map(i => `${i.qty || 1}x ${i.name}`).join(', ')
                      }
                    });
                  } catch (e) {}
                }}
                className="py-3 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                title="Ring chime on Waiter Terminal to pick up food"
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Ring Bell · વેઈટર બોલાવો</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkServed(order.id)}
                className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                title="Handover dishes to waiter runner and complete kitchen ticket"
              >
                <CheckCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Handover · આપ્યું</span>
              </button>
            </div>
          )}

          {/* Secondary Links: KOT Slip and Quick Bump */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              onClick={() => setPrintingKotOrder({ ...order, items: displayItems })}
              className="text-slate-400 hover:text-slate-800 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print KOT Ticket</span>
            </button>

            {!isServed && (
              <button
                type="button"
                onClick={() => handleMarkServed(order.id)}
                className="text-slate-400 hover:text-emerald-700 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer transition"
                title="Directly mark order served and clear from active board"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Quick Bump</span>
              </button>
            )}

            {isServed && (
              <span className="text-emerald-700 font-semibold text-xs flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Delivered to Table</span>
              </span>
            )}
          </div>

        </div>

      </div>
    );
  }
}
