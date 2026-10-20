import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Clock, 
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
  Users
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';

export default function OrdersView({ 
  orders = [], 
  onUpdateStatus, 
  onMarkCashPaymentDone,
  onCancelOrderWithReason,
  onAddNewOrder, 
  currentStaff = { name: 'Darshit Rana', role: 'Admin' },
  currentLang,
  theme = 'light'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelTab, setChannelTab] = useState('all'); // 'all', 'dine_in', 'online_queue', 'completed'
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Cancel Order Modal State
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('Dish ingredients / Batter out of stock');
  const [customReasonNote, setCustomReasonNote] = useState('');

  // Cash Collection Modal State
  const [cashCollectingOrder, setCashCollectingOrder] = useState(null);
  const [collectorName, setCollectorName] = useState(currentStaff?.name || 'Darshit Rana');

  const t = (key) => getTranslation(currentLang, key);

  // Theme palettes
  const isDark = theme === 'obsidian' || theme === 'sapphire';
  const isSapphire = theme === 'sapphire';
  const cardBg = isDark ? (isSapphire ? 'bg-slate-900/90' : 'bg-slate-900') : 'bg-white';
  const cardBorder = isDark ? (isSapphire ? 'border-sky-900/40' : 'border-slate-800') : 'border-slate-200/80';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const headerBg = isDark ? 'bg-slate-800/80 text-slate-300 border-slate-700/60' : 'bg-slate-50 text-slate-500 border-slate-200';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/70';
  const rowBorder = isDark ? 'border-slate-800/80' : 'border-slate-100';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-100 border-transparent text-slate-800 placeholder-slate-400';

  // Telemetry metrics
  const totalOrdersCount = orders.length;
  const activeOrdersCount = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length;
  const dineInCount = orders.filter(o => !o.order_source || o.order_source === 'Dine-In').length;
  const onlineCount = orders.filter(o => o.order_source && o.order_source !== 'Dine-In').length;
  const cashPendingOrders = orders.filter(o => o.payment_mode === 'Cash' && o.payment_status !== 'Paid');
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);

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
    if (channelTab === 'dine_in' && o.order_source && o.order_source !== 'Dine-In') return false;
    if (channelTab === 'online_queue' && (!o.order_source || o.order_source === 'Dine-In')) return false;
    if (channelTab === 'completed' && o.status !== 'Completed') return false;

    // Search filter
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = (o.id || '').toLowerCase().includes(searchLow) || 
                          (o.table_number || '').toLowerCase().includes(searchLow) ||
                          (o.customer_name && o.customer_name.toLowerCase().includes(searchLow)) ||
                          (o.customer_phone && o.customer_phone.includes(searchTerm));
    // Status filter
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    setSelectedOrder(order);
    setTimeout(() => window.print(), 200);
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
              Live synchronization across Table QR, Waiter POS, Kitchen KDS, and Delivery Channels.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {cashPendingOrders.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>{cashPendingOrders.length} Cash Uncollected</span>
            </div>
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
          <span className="text-[10px] text-blue-500 font-medium">QR Scans & Counter</span>
        </div>

        <div className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online Deliveries</span>
          <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{onlineCount}</div>
          <span className="text-[10px] text-emerald-500 font-medium">Zomato / Swiggy Queue</span>
        </div>

        <div className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift Revenue</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-medium">{totalOrdersCount} Completed & Active</span>
        </div>
      </div>

      {/* 3. CHANNEL TABS & FILTER BAR */}
      <div className={`p-3 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        {/* Channel Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setChannelTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'all' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>All Channels</span>
            <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded text-[10px] font-mono">{orders.length}</span>
          </button>

          <button
            onClick={() => setChannelTab('dine_in')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'dine_in' 
                ? 'bg-orange-500 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dine-In</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${channelTab === 'dine_in' ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'}`}>{dineInCount}</span>
          </button>

          <button
            onClick={() => setChannelTab('online_queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'online_queue' 
                ? 'bg-orange-500 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Online Queue</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${channelTab === 'online_queue' ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'}`}>{onlineCount}</span>
          </button>

          <button
            onClick={() => setChannelTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              channelTab === 'completed' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
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
              placeholder="Search ID, table, phone..."
              className={`w-full pl-8 pr-7 py-1.5 rounded-xl ${inputBg} text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500`}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Elapsed</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${rowBorder}`}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                    No orders matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isOnlinePayment = order.payment_verified_online || order.payment_mode === 'UPI' || order.payment_mode?.includes('Online') || order.payment_mode?.includes('Razorpay');
                  const isCashPending = order.payment_mode === 'Cash' && order.payment_status !== 'Paid';
                  const isCancelled = order.status === 'Cancelled';
                  const elapsedMins = getElapsedWaitMinutes(order.placed_at || order.time);

                  return (
                    <tr key={order.id} className={`${rowHover} transition ${isCancelled ? 'bg-rose-50/20 dark:bg-rose-950/20 opacity-60' : ''}`}>
                      
                      {/* Order ID & Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{order.id}</span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                          order.order_source === 'Zomato' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800' :
                          order.order_source === 'Swiggy' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {order.order_source || 'Dine-In'}
                        </span>
                      </td>

                      {/* Table Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-mono font-bold rounded-md border border-orange-200 dark:border-orange-900/60 text-xs">
                          {order.table_number || 'Takeaway'}
                        </span>
                      </td>

                      {/* Customer Name & Mobile */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`font-bold ${textPrimary}`}>{order.customer_name || 'Guest'}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          {order.customer_phone ? (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              +91 {order.customer_phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Walk-in</span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">• {order.time || 'Now'}</span>
                        </div>
                      </td>

                      {/* Elapsed Wait Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {!isCancelled && order.status !== 'Completed' ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            elapsedMins >= 15 
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                              : elapsedMins >= 10
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${elapsedMins >= 15 ? 'bg-rose-500 animate-ping' : elapsedMins >= 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span>{elapsedMins}m</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">—</span>
                        )}
                      </td>

                      {/* Items Summary */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                        <div className="line-clamp-2 leading-relaxed text-xs">
                          {order.items_summary || (order.items?.map(it => `${it.qty}x ${it.name}`).join(', ')) || 'Items list'}
                        </div>
                        {order.cancel_reason && (
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Cancelled: {order.cancel_reason}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className={`py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm ${textPrimary}`}>
                        ₹{order.total || order.total_amount || 0}
                      </td>

                      {/* Payment Verification Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isOnlinePayment ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-3 h-3" />
                              <span>{order.payment_mode || 'UPI'} Paid</span>
                            </span>
                            <div className="text-[9px] text-slate-400">Verified</div>
                          </div>
                        ) : isCashPending ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Cash Pending
                            </span>
                            <button
                              onClick={() => { setCashCollectingOrder(order); setCollectorName(currentStaff?.name || 'Darshit Rana'); }}
                              className="block px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] shadow-xs transition cursor-pointer"
                            >
                              Receive Cash
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <Check className="w-3 h-3" />
                              <span>Paid in Cash</span>
                            </span>
                            {order.paid_collected_by && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                by {order.paid_collected_by}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Order Status Select Pill */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <select
                          value={order.status}
                          disabled={isCancelled || order.status === 'Completed'}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                            order.status === 'Preparing' ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' :
                            order.status === 'Ready' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' :
                            order.status === 'Cooking' ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800' :
                            order.status === 'Served' ? 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800' :
                            order.status === 'Completed' ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-800 dark:border-slate-700' :
                            order.status === 'Cancelled' ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="Placed">Placed</option>
                          <option value="Cooking">Cooking</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Ready">Ready</option>
                          <option value="Served">Served</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handlePrintKOT(order)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Print KOT Tax Bill"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {!isCancelled && order.status !== 'Completed' && (
                            <button
                              onClick={() => { setCancellingOrder(order); setCancelReason('Dish ingredients / Batter out of stock'); }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className={`${cardBg} rounded-2xl p-6 max-w-sm w-full border ${cardBorder} shadow-2xl space-y-4`}>
            <div className={`flex items-center justify-between border-b ${rowBorder} pb-3`}>
              <div>
                <h3 className={`text-base font-black ${textPrimary} font-heading`}>Confirm Cash Payment</h3>
                <p className="text-xs text-slate-500 font-mono">Order {cashCollectingOrder.id} • Table {cashCollectingOrder.table_number}</p>
              </div>
              <button onClick={() => setCashCollectingOrder(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Exact Cash to Collect</span>
                <div className={`text-3xl font-black ${textPrimary} font-mono mt-1`}>₹{cashCollectingOrder.total || cashCollectingOrder.total_amount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Guest: {cashCollectingOrder.customer_name || 'Counter Guest'}</div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Collecting Staff Member</label>
                <input
                  type="text"
                  required
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${cardBorder} ${inputBg} text-xs font-bold focus:outline-none focus:border-orange-500`}
                  placeholder="e.g. Darshit Rana"
                />
                <p className="text-[10px] text-slate-400 mt-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className={`${cardBg} rounded-2xl p-6 max-w-md w-full border ${cardBorder} shadow-2xl space-y-4`}>
            <div className={`flex items-center justify-between border-b ${rowBorder} pb-3`}>
              <div>
                <h3 className="text-base font-black text-rose-600 font-heading flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Cancel Customer Order</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">Order {cancellingOrder.id} • Table {cancellingOrder.table_number}</p>
              </div>
              <button onClick={() => setCancellingOrder(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs print:p-0 print:bg-white print:static">
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
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.qty}x {it.name}</span>
                    <span>₹{(it.price || it.finalPrice || 0) * it.qty}</span>
                  </div>
                ))}
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
              <div className="text-[10px] text-slate-500 mt-2">
                Payment: {selectedOrder.payment_mode || 'UPI'} ({selectedOrder.payment_status || 'Paid'})
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl print:hidden flex items-center justify-center gap-1 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Receipt</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
