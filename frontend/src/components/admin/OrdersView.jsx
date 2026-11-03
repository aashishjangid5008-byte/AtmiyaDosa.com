import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Clock, 
  Calendar,
  CheckCircle2, 
  Printer, 
  Eye, 
  IndianRupee, 
  Filter,
  Plus,
  X,
  AlertTriangle,
  Check,
  Ban,
  ArrowRight,
  Globe,
  Utensils,
  Receipt,
  Download,
  ChefHat,
  Flame,
  BellRing,
  Lock
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { downloadSinglePageBillPdf, printSinglePageReceipt } from '../../lib/generateBillPdf';

export default function OrdersView({ 
  orders = [], 
  seenOrderIds = [],
  onMarkOrderAsSeen,
  onMarkAllOrdersAsSeen,
  onUpdateStatus, 
  onMarkCashPaymentDone,
  onCancelOrderWithReason,
  onAddNewOrder, 
  currentStaff = { name: 'Darshit Rana', role: 'Admin' },
  currentLang,
  theme = 'light',
  restaurantSettings = {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelTab, setChannelTab] = useState('all'); // 'all', 'dine_in', 'online_queue', 'completed'
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday'
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Mark all current orders as seen after user has spent 2s viewing the Orders page
  useEffect(() => {
    const timer = setTimeout(() => {
      onMarkAllOrdersAsSeen?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [orders?.length]);
  
  // Cancel Order Modal State
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('Dish ingredients / Batter out of stock');
  const [customReasonNote, setCustomReasonNote] = useState('');

  // Cash Collection Modal State
  const [cashCollectingOrder, setCashCollectingOrder] = useState(null);
  const [collectorName, setCollectorName] = useState(currentStaff?.name || 'Darshit Rana');

  const t = (key) => getTranslation(currentLang, key);

  // Theme palettes - pure authentic light surfaces
  const isDark = false;
  const cardBg = 'bg-white';
  const cardBorder = 'border-slate-200/80';
  const textPrimary = 'text-slate-900';
  const textMuted = 'text-slate-500';
  const headerBg = 'bg-slate-50 text-slate-600 border-slate-200';
  const rowHover = 'hover:bg-slate-50/70';
  const rowBorder = 'border-slate-100';
  const inputBg = 'bg-slate-100 border-transparent text-slate-800 placeholder-slate-400';

  // Helper: Determine if order is completed or settled
  const isOrderCompleted = (o) => {
    if (!o) return false;
    const st = String(o.status || '').toLowerCase().trim();
    const paySt = String(o.payment_status || '').toLowerCase().trim();
    if (st === 'completed' || st === 'settled') return true;
    if (st === 'served' && (paySt === 'paid' || paySt === 'settled')) return true;
    return false;
  };

  // Helper: Resolve timestamp for chronological date-wise and time-wise ordering
  const getOrderTimestamp = (ord) => {
    if (!ord) return 0;
    const candidates = [
      ord.settled_at,
      ord.completed_at,
      ord.served_at,
      ord.placed_at,
      ord.created_at
    ];
    for (const c of candidates) {
      if (c) {
        const ts = new Date(c).getTime();
        if (!isNaN(ts) && ts > 0) return ts;
      }
    }
    if (ord.time) {
      const ts = new Date(ord.time).getTime();
      if (!isNaN(ts) && ts > 0) return ts;
    }
    return 0;
  };

  // Helper: Format human-friendly date and time for audit display
  const formatOrderDateTime = (order) => {
    if (!order) return { dateStr: 'Today', timeStr: '--:--', fullStr: 'Today' };
    const rawDate = order.settled_at || order.completed_at || order.placed_at || order.created_at;
    let d = rawDate ? new Date(rawDate) : null;
    if (!d || isNaN(d.getTime())) {
      return {
        dateStr: 'Today',
        timeStr: order.time || '12:00 PM',
        fullStr: `Today • ${order.time || '12:00 PM'}`
      };
    }

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isYesterday) {
      dateStr = 'Yesterday';
    } else {
      dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      dateStr,
      timeStr,
      fullStr: `${dateStr} • ${timeStr}`
    };
  };

  // Telemetry metrics
  const safeSeenOrderIds = Array.isArray(seenOrderIds) ? seenOrderIds : [];
  const validOrders = orders.filter(o => String(o.status || '').toUpperCase() !== 'CANCELLED');
  const cancelledOrdersCount = orders.filter(o => String(o.status || '').toUpperCase() === 'CANCELLED').length;
  const totalOrdersCount = orders.length;
  const activeOrdersCount = orders.filter(o => !isOrderCompleted(o) && o.status !== 'Cancelled').length;
  const completedOrdersCount = orders.filter(isOrderCompleted).length;
  const unseenOrdersCount = orders.filter(o => !safeSeenOrderIds.includes(o.id) && !isOrderCompleted(o) && o.status !== 'Cancelled').length;
  const dineInCount = orders.filter(o => !o.order_source || o.order_source === 'Dine-In' || o.order_source === 'Table QR' || o.order_source === 'Waiter POS').length;
  const takeawayCount = orders.filter(o => o.order_source === 'Takeaway' || o.order_source === 'Counter').length;
  const cashPendingOrders = orders.filter(o => 
    o.status !== 'Cancelled' && 
    o.payment_mode === 'Cash' && 
    o.payment_status !== 'Paid' && 
    (o.payment_status || '').toLowerCase() !== 'paid' && 
    o.payment_status !== 'Void'
  );
  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
  const totalPlatesVolume = validOrders.reduce((sum, o) => {
    const items = o.items || o.order_items || [];
    return sum + (items.length > 0 ? items.reduce((isum, it) => isum + Number(it.qty || it.quantity || 1), 0) : 1);
  }, 0);

  // Helper to calculate wait time elapsed
  const getElapsedWaitMinutes = (placedTimeStr) => {
    if (!placedTimeStr) return 10;
    try {
      const placedDate = new Date(placedTimeStr);
      if (isNaN(placedDate.getTime())) return 12;
      const diffMs = Date.now() - placedDate.getTime();
      return Math.max(1, Math.floor(diffMs / 60000));
    } catch {
      return 10;
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (channelTab === 'dine_in' && (o.order_source === 'Takeaway' || o.order_source === 'Counter')) return false;
    if (channelTab === 'takeaway' && o.order_source !== 'Takeaway' && o.order_source !== 'Counter') return false;
    if (channelTab === 'completed' && !isOrderCompleted(o)) return false;

    const dt = formatOrderDateTime(o);

    // Optional Quick Day Filter when browsing Completed Orders
    if (channelTab === 'completed' && dateFilter !== 'all') {
      if (dateFilter === 'today' && dt.dateStr !== 'Today') return false;
      if (dateFilter === 'yesterday' && dt.dateStr !== 'Yesterday') return false;
    }

    // Search filter
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = (o.id || '').toLowerCase().includes(searchLow) || 
                          (o.table_number || '').toLowerCase().includes(searchLow) ||
                          (o.customer_name && o.customer_name.toLowerCase().includes(searchLow)) ||
                          (o.customer_phone && o.customer_phone.includes(searchTerm)) ||
                          (dt.fullStr.toLowerCase().includes(searchLow));
    // Status filter
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Strict Date-wise and Time-wise Chronological Sort (most recent first)
  const sortedFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const tsA = getOrderTimestamp(a);
      const tsB = getOrderTimestamp(b);
      return tsB - tsA; // Newest first
    });
  }, [filteredOrders]);

  const handleConfirmCashPayment = () => {
    if (!cashCollectingOrder) return;
    onMarkCashPaymentDone(cashCollectingOrder.id, collectorName || currentStaff?.name || 'Darshit Rana');
    setCashCollectingOrder(null);
  };

  const handleConfirmCancelOrder = () => {
    if (!cancellingOrder) return;
    const finalReason = customReasonNote ? `${cancelReason}: ${customReasonNote}` : cancelReason;
    onCancelOrderWithReason(cancellingOrder.id, finalReason, currentStaff?.name || 'Darshit Rana');
    setCancellingOrder(null);
    setCustomReasonNote('');
  };

  const handlePrintKOT = (order) => {
    printSinglePageReceipt({
      order,
      restaurantSettings,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      currentTable: order.table_number
    });
  };

  return (
    <div className="space-y-5">
      
      {/* 1. TOP HEADER & TELEMETRY */}
      <div className={`p-5 rounded-2xl ${cardBg} border ${cardBorder} shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-black ${textPrimary} tracking-tight font-heading`}>
              Orders Dispatch & Queue
            </h2>
            <p className={`text-xs ${textMuted} font-medium`}>
              Live synchronization across Table QR, Waiter Handheld POS, and Kitchen KDS.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {unseenOrdersCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{unseenOrdersCount} {t('newBadge') || 'NEW'}</span>
            </div>
          )}

          {cashPendingOrders.length > 0 && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setChannelTab('all');
                setSearchTerm('');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition cursor-pointer"
              title="Click to view orders with pending cash collection"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>{cashPendingOrders.length} Cash Uncollected</span>
            </button>
          )}

          <button
            onClick={onAddNewOrder}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tickets</span>
          <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{activeOrdersCount}</div>
          <span className="text-[10px] text-orange-500 font-medium">In Kitchen / Dining</span>
        </div>

        <div className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dine-In Tables</span>
          <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{dineInCount}</div>
          <span className="text-[10px] text-blue-500 font-medium">QR Scans & Waiter POS</span>
        </div>

        <div className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Counter Takeaway</span>
          <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{takeawayCount}</div>
          <span className="text-[10px] text-purple-600 font-medium">Parcel & Counter Pickup</span>
        </div>

        <div className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift Revenue</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-medium">
            {validOrders.length} Valid Orders • {totalPlatesVolume} Plates{cancelledOrdersCount > 0 ? ` (${cancelledOrdersCount} void)` : ''}
          </span>
        </div>
      </div>

      {/* 3. CHANNEL TABS & FILTER BAR */}
      <div className={`p-3 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        {/* Channel Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-0.5 bg-slate-100 rounded-xl">
          <button
            onClick={() => setChannelTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'all' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Channels</span>
            <span className="bg-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-700">{orders.length}</span>
          </button>

          <button
            onClick={() => setChannelTab('dine_in')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'dine_in' 
                ? 'bg-orange-500 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dine-In</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${channelTab === 'dine_in' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{dineInCount}</span>
          </button>

          <button
            onClick={() => setChannelTab('takeaway')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'takeaway' 
                ? 'bg-orange-500 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Takeaway / Parcel</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${channelTab === 'takeaway' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{takeawayCount}</span>
          </button>

          <button
            onClick={() => setChannelTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'completed' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${channelTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 font-bold'}`}>{completedOrdersCount}</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Quick Date Pills when browsing Completed Section */}
          {channelTab === 'completed' && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates ({completedOrdersCount})
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  dateFilter === 'today' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  dateFilter === 'yesterday' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
            </div>
          )}

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${inputBg} border focus:outline-none cursor-pointer`}
          >
            <option value="All">All Statuses</option>
            <option value="Placed">Placed</option>
            <option value="Cooking">Cooking</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
            <option value="Served">Served</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, table, date, phone..."
              className={`w-full pl-8 pr-7 py-1.5 rounded-xl ${inputBg} text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500`}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. ORDERS DATA TABLE (TOAST / SQUARE STYLE) */}
      <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-xs overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`${headerBg} uppercase text-[10px] font-black tracking-wider border-b`}>
              <tr>
                <th className="py-3 px-4">Order ID & Source</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">{channelTab === 'completed' ? 'Archive Status' : 'Elapsed'}</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Live Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${rowBorder}`}>
              {sortedFilteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400 font-medium">
                    {channelTab === 'completed' 
                      ? 'No completed orders found. Orders settled with cash or UPI are stored here permanently with full dates and times.'
                      : 'No orders matching the active criteria.'}
                  </td>
                </tr>
              ) : (
                sortedFilteredOrders.map((order, idx) => {
                  const isCancelled = order.status === 'Cancelled';
                  const isCompleted = isOrderCompleted(order);
                  const dt = formatOrderDateTime(order);
                  const payStatusLower = (order.payment_status || '').toLowerCase();
                  const isPaid = payStatusLower === 'paid';
                  const isOnline = Boolean(order.payment_verified_online || order.payment_mode === 'UPI' || order.payment_mode?.includes('Online') || order.payment_mode?.includes('Razorpay'));

                  const isOnlinePaid = !isCancelled && isPaid && isOnline;
                  const isCashPaid = !isCancelled && isPaid && !isOnline;
                  const isUpiPending = !isCancelled && !isPaid && isOnline && order.payment_status !== 'Void';
                  const isCashPending = !isCancelled && !isPaid && !isOnline && order.payment_status !== 'Void';
                  const elapsedMins = getElapsedWaitMinutes(order.placed_at || order.time);

                  return (
                    <tr key={`${order.id}-${idx}`} className={`${rowHover} transition ${isCancelled ? 'bg-rose-50/40 opacity-60' : ''}`}>
                      
                      {/* Order ID & Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{order.id}</span>
                          {/* Mark NEW only when order is not seen or not completed, not permanent */}
                          {(!safeSeenOrderIds.includes(order.id) || order.status === 'Placed' || order.status === 'Pending') && !isCompleted && order.status !== 'Cancelled' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500 text-white shadow-xs animate-pulse">
                              <span className="w-1 h-1 rounded-full bg-white"></span>
                              {t('newBadge') || 'NEW'}
                            </span>
                          )}
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                          order.order_source === 'Waiter_POS' || order.order_source === 'Waiter POS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : order.order_source === 'Takeaway' || order.order_source === 'Counter'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {order.order_source === 'Waiter_POS' || order.order_source === 'Waiter POS'
                            ? 'Waiter POS'
                            : order.order_source === 'Takeaway' || order.order_source === 'Counter'
                              ? 'Takeaway'
                              : 'Table QR'}
                        </span>
                      </td>

                      {/* Table Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 font-mono font-bold rounded-md border border-orange-200 text-xs">
                            {order.table_number || 'Takeaway'}
                          </span>
                          {(order.round > 1 || order.is_addon) && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200">
                              Round {order.round || 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dt.dateStr}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{dt.timeStr}</span>
                        </div>
                      </td>

                      {/* Customer Name & Mobile */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`font-bold ${textPrimary}`}>{order.customer_name || 'Guest'}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          {order.customer_phone ? (
                            <span className="text-[10px] text-slate-600 font-mono font-medium">
                              +91 {order.customer_phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Walk-in</span>
                          )}
                        </div>
                      </td>

                      {/* Elapsed / Archive Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Settled</span>
                          </span>
                        ) : !isCancelled ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            elapsedMins >= 15 
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : elapsedMins >= 10
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${elapsedMins >= 15 ? 'bg-rose-500 animate-ping' : elapsedMins >= 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span>{elapsedMins}m</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">—</span>
                        )}
                      </td>

                      {/* Items Summary */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-800 font-medium">
                        <div className="line-clamp-2 leading-relaxed text-xs">
                          {order.items_summary || (order.items?.map(it => `${it.qty}x ${it.name}`).join(', ')) || 'Items list'}
                        </div>
                        {order.cancel_reason && (
                          <div className="text-[10px] font-bold text-rose-700 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Cancelled: {order.cancel_reason}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className={`py-3.5 px-4 text-right whitespace-nowrap font-mono font-black text-sm ${textPrimary}`}>
                        ₹{order.total || order.total_amount || 0}
                      </td>

                      {/* Payment Verification Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCancelled ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Cancelled (Void)
                            </span>
                            <div className="text-[9px] text-slate-400 font-mono">No Payment Due</div>
                          </div>
                        ) : isOnlinePaid ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>{order.payment_mode || 'UPI'} Paid</span>
                            </span>
                            <div className="text-[9px] font-mono font-bold text-slate-700 truncate max-w-[130px]">
                              {order.transaction_id ? `Ref: ${order.transaction_id}` : 'Verified UPI'}
                            </div>
                            {order.paid_collected_by && (
                              <div className="text-[8px] text-slate-500 font-mono truncate max-w-[130px]" title={order.paid_collected_by}>
                                {order.paid_collected_by}
                              </div>
                            )}
                          </div>
                        ) : isUpiPending ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>UPI Awaiting Check</span>
                            </span>
                            <button
                              onClick={() => {
                                onMarkCashPaymentDone(order.id, currentStaff?.name || 'Darshit Rana');
                              }}
                              className="block px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] shadow-xs transition cursor-pointer"
                              title="Check your phone/soundbox for UPI payment, then click to verify"
                            >
                              Verify UPI Received
                            </button>
                          </div>
                        ) : isCashPending ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              Cash Pending
                            </span>
                            <button
                              onClick={() => { setCashCollectingOrder(order); setCollectorName(currentStaff?.name || 'Darshit Rana'); }}
                              className="block px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] shadow-xs transition cursor-pointer"
                            >
                              Receive Cash
                            </button>
                          </div>
                        ) : isCashPaid ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Paid in Cash</span>
                            </span>
                            {order.paid_collected_by && (
                              <div className="text-[9px] text-slate-500 font-mono">
                                by {order.paid_collected_by}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              Cash Pending
                            </span>
                            <button
                              onClick={() => { setCashCollectingOrder(order); setCollectorName(currentStaff?.name || 'Darshit Rana'); }}
                              className="block px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] shadow-xs transition cursor-pointer"
                            >
                              Receive Cash
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Order Live Automatic Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {(() => {
                          if (isCancelled) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                <Ban className="w-3.5 h-3.5 text-rose-500" />
                                <span>Cancelled</span>
                              </span>
                            );
                          }
                          
                          const st = String(order.status || '').toLowerCase().trim();

                          if (isCompleted || st === 'completed' || st === 'settled') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            );
                          }

                          // Active orders: allow admin to change live status directly
                          const currentDisplayStatus = st === 'ready' ? 'Ready' : (st === 'preparing' || st === 'cooking' ? 'Preparing' : (st === 'served' ? 'Served' : 'Placed'));
                          return (
                            <select
                              value={currentDisplayStatus}
                              onChange={(e) => onUpdateStatus?.(order.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs cursor-pointer focus:outline-none transition ${
                                st === 'ready'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200 focus:ring-1 focus:ring-blue-400'
                                  : st === 'preparing' || st === 'cooking'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 focus:ring-1 focus:ring-amber-400'
                                    : st === 'served'
                                      ? 'bg-teal-50 text-teal-800 border-teal-200 focus:ring-1 focus:ring-teal-400'
                                      : 'bg-slate-100 text-slate-700 border-slate-200 focus:ring-1 focus:ring-slate-400'
                              }`}
                              title="Click to update order live status"
                            >
                              <option value="Placed">⚪ Placed</option>
                              <option value="Preparing">🟡 Preparing</option>
                              <option value="Ready">🔵 Ready</option>
                              <option value="Served">🟢 Served</option>
                              <option value="Completed">✅ Completed</option>
                            </select>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              onMarkOrderAsSeen?.(order.id);
                            }}
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 transition cursor-pointer border border-orange-200"
                            title="View Full Order Breakdown & KOT Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              handlePrintKOT(order);
                              onMarkOrderAsSeen?.(order.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                            title="Print Thermal KOT Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              downloadSinglePageBillPdf({
                                order,
                                restaurantSettings,
                                customerName: order.customer_name,
                                customerPhone: order.customer_phone,
                                currentTable: order.table_number
                              });
                              onMarkOrderAsSeen?.(order.id);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer border border-emerald-200"
                            title="Download 1-Page GST Tax Invoice (PDF)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {!isCancelled && !isCompleted && (
                            <button
                              onClick={() => { setCancellingOrder(order); setCancelReason('Dish ingredients / Batter out of stock'); }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer border border-rose-200"
                              title="Cancel Order with Reason"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CASH PAYMENT COLLECTION WITH STAFF ATTRIBUTION */}
      {cashCollectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className={`${cardBg} rounded-2xl p-6 max-w-sm w-full border ${cardBorder} shadow-2xl space-y-4`}>
            <div className={`flex items-center justify-between border-b ${rowBorder} pb-3`}>
              <div>
                <h3 className={`text-base font-black ${textPrimary} font-heading`}>Confirm Cash Payment</h3>
                <p className="text-xs text-slate-500 font-mono">Order {cashCollectingOrder.id} • Table {cashCollectingOrder.table_number}</p>
              </div>
              <button onClick={() => setCashCollectingOrder(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                <span className="text-xs font-bold text-slate-600 uppercase">Exact Cash to Collect</span>
                <div className={`text-3xl font-black ${textPrimary} font-mono mt-1`}>₹{cashCollectingOrder.total || cashCollectingOrder.total_amount}</div>
                <div className="text-xs text-slate-600 mt-1 font-semibold">Guest: {cashCollectingOrder.customer_name || 'Counter Guest'}</div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Collecting Staff Member</label>
                <input
                  type="text"
                  required
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${cardBorder} ${inputBg} text-xs font-bold focus:outline-none focus:border-orange-500 text-slate-900`}
                  placeholder="e.g. Darshit Rana"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Logged in staff audit trail for cash accountability.
                </p>
              </div>

              <button
                onClick={handleConfirmCashPayment}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Cash Received & Settle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL ORDER WITH SPECIFIC REASON */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className={`${cardBg} rounded-2xl p-6 max-w-md w-full border ${cardBorder} shadow-2xl space-y-4`}>
            <div className={`flex items-center justify-between border-b ${rowBorder} pb-3`}>
              <div>
                <h3 className="text-base font-black text-rose-600 font-heading flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Cancel Customer Order</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">Order {cancellingOrder.id} • Table {cancellingOrder.table_number}</p>
              </div>
              <button onClick={() => setCancellingOrder(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className={`text-xs ${textMuted} font-medium`}>
                State the reason for cancelling this order:
              </p>

              <div>
                <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${cardBorder} ${inputBg} text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer`}
                >
                  <option value="Dish ingredients / Batter out of stock">Dish ingredients / Batter out of stock</option>
                  <option value="Chef overload / Kitchen equipment rush delay">Chef overload / Kitchen rush delay</option>
                  <option value="Customer requested cancellation at counter">Customer requested cancellation at counter</option>
                  <option value="Table relocated or guest left">Table relocated or guest left</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Additional Staff Notes (Optional)</label>
                <textarea
                  rows="2"
                  value={customReasonNote}
                  onChange={(e) => setCustomReasonNote(e.target.value)}
                  placeholder="e.g. Dosa batter exhausted for Mysore Masala."
                  className={`w-full px-3 py-2 rounded-xl border ${cardBorder} ${inputBg} text-xs font-medium focus:outline-none focus:border-orange-500`}
                />
              </div>

              <button
                onClick={handleConfirmCancelOrder}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Order Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE KOT BILL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between border-b pb-2 print:hidden">
              <span className="font-heading font-black text-sm text-slate-900">Thermal KOT Tax Receipt</span>
              <button onClick={() => setSelectedOrder(null)} className="p-1 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="text-center font-mono space-y-1 text-slate-900">
              <div className="font-bold text-base">ATMIYA DOSA HUB</div>
              <div className="text-[10px] text-slate-500">Petlad - Anand Road, Gujarat</div>
              <div className="text-[10px] text-slate-500">GSTIN: 24AAACA1234A1Z5</div>
              <div className="border-b border-dashed my-2 border-slate-300"></div>
              <div className="flex justify-between text-xs font-bold">
                <span>{selectedOrder.id}</span>
                <span>Table: {selectedOrder.table_number}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Time: {selectedOrder.time || 'Now'}</span>
                <span>Source: {selectedOrder.order_source || 'Dine-In'}</span>
              </div>
              <div className="border-b border-dashed my-2 border-slate-300"></div>
              
              <div className="space-y-1 text-left text-xs">
                {(selectedOrder.items || selectedOrder.order_items || []).map((it, idx) => {
                  const qty = it.qty || it.quantity || 1;
                  const price = it.price || it.finalPrice || it.unit_price || 0;
                  const name = it.name || it.item_name || 'Dish Item';
                  return (
                    <div key={idx} className="flex justify-between">
                      <span>{qty}x {name}</span>
                      <span>₹{price * qty}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-b border-dashed my-2 border-slate-300"></div>
              <div className="flex justify-between text-xs">
                <span>Subtotal:</span>
                <span>₹{selectedOrder.subtotal || selectedOrder.total || selectedOrder.total_amount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>GST (5%):</span>
                <span>₹{selectedOrder.tax || 0}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{selectedOrder.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-dashed pt-1 border-slate-300">
                <span>TOTAL:</span>
                <span>₹{selectedOrder.total || selectedOrder.total_amount}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>Payment: <span className="font-bold text-slate-700">{selectedOrder.payment_mode || 'UPI'}</span> ({selectedOrder.payment_status || 'Paid'})</div>
                {selectedOrder.transaction_id && (
                  <div className="font-mono font-bold text-emerald-700">Payment Ref: {selectedOrder.transaction_id}</div>
                )}
                {selectedOrder.paid_collected_by && (
                  <div className="text-slate-500 text-[9px]">Verified: {selectedOrder.paid_collected_by}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs rounded-xl shadow-sm shadow-orange-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => downloadSinglePageBillPdf({
                  order: selectedOrder,
                  restaurantSettings,
                  customerName: selectedOrder.customer_name,
                  customerPhone: selectedOrder.customer_phone,
                  currentTable: selectedOrder.table_number
                })}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition"
                title="Download Official 1-Page Tax Invoice (PDF)"
              >
                <Download className="w-4 h-4" />
                <span>PDF Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
