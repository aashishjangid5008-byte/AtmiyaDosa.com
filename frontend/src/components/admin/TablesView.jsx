import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Utensils, 
  Plus, 
  Trash2, 
  QrCode, 
  Clock, 
  Users, 
  CheckCircle2, 
  X,
  LayoutGrid,
  ArrowRightLeft,
  Receipt,
  Check,
  Sparkles,
  IndianRupee,
  AlertCircle,
  Eye,
  Coffee,
  Printer,
  Download,
  Copy,
  ExternalLink,
  Share2,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Banknote,
  Zap,
  CheckCheck,
  User,
  Phone,
  RotateCcw
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { playSound } from '../../lib/sound';
import { printSinglePageReceipt, downloadSinglePageBillPdf } from '../../lib/generateBillPdf';
import { getTableQrUrl } from '../../lib/security';

export default function TablesView({ 
  tables, 
  orders = [], 
  restaurantSettings = {}, 
  onAddTable, 
  onDeleteTable, 
  onUpdateTable,
  onReconcileTables,
  onSettleTableBill, 
  onShiftTable, 
  onSelectQRTable, 
  onSimulateCustomer, 
  onVacateTable,
  onSnoozeTurnover,
  onSimulate30m,
  currentLang,
  theme = 'light'
}) {
  const [selectedZone, setSelectedZone] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState('form'); // 'form' or 'created'
  const [createdTable, setCreatedTable] = useState(null);
  const [previewQRTable, setPreviewQRTable] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTargetTable, setShiftTargetTable] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [autoVacatePaidTables, setAutoVacatePaidTables] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [vacateConfirmState, setVacateConfirmState] = useState(null); // { step: 1 | 2, table, method, amount }
  
  const [newTable, setNewTable] = useState({ number: '', capacity: 4, zone: 'Main Hall' });

  // 10-Second Reactive Clock for Dining & Turnover Tracking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // 30-Minute Automatic Table Vacate Engine removed as requested: Tables remain occupied until staff explicitly settles or vacates
  const t = (key) => getTranslation(currentLang, key);
  const zones = ['All', 'Main Hall', 'AC Section', 'Patio Garden', 'Family Section'];

  const filteredTables = selectedZone === 'All' 
    ? tables 
    : tables.filter(t => t.zone === selectedZone);

  const normalizeTable = (val) => {
    if (!val) return '';
    const digits = String(val).replace(/[^0-9]/g, '');
    if (digits) return String(parseInt(digits, 10));
    return String(val).trim().toLowerCase();
  };

  const isTableMatch = (t1, t2) => {
    return normalizeTable(t1) === normalizeTable(t2);
  };

  // Helper to determine if an order is active for dining / billing
  const isOrderDiningActive = (o) => {
    if (!o) return false;
    const st = String(o.status || '').toLowerCase().trim();
    const paySt = String(o.payment_status || '').toLowerCase().trim();
    const isPaid = paySt === 'paid' || paySt === 'void';
    
    // 1. Cancelled orders are never active
    if (st === 'cancelled') return false;

    // 2. Completed, settled, or served orders that are PAID -> dining is finished, table is vacant!
    if ((st === 'completed' || st === 'settled' || st === 'served') && isPaid) {
      return false;
    }

    // 3. Stale orders older than 2 hours that are served or completed are not active dining
    const orderTime = o.placed_at || o.created_at;
    const isOlderThan2h = orderTime && (Date.now() - new Date(orderTime).getTime() > 2 * 60 * 60 * 1000);
    if (isOlderThan2h && (isPaid || st === 'served')) {
      return false;
    }

    // 4. Completed or settled but UNPAID -> guest is seated waiting to settle bill with cashier
    if (st === 'completed' || st === 'settled') {
      return !isPaid;
    }

    return true;
  };

  // Helper to get ALL active orders for a table session (e.g. Round 1 Food + Round 2 Mineral Water)
  const getTableActiveOrders = (tableNum) => {
    return orders.filter(o => 
      isTableMatch(o.table_number, tableNum) &&
      isOrderDiningActive(o)
    );
  };

  // Helper to get primary active order for a table
  const getTableActiveOrder = (tableNum) => {
    const list = getTableActiveOrders(tableNum);
    return list.length > 0 ? list[0] : null;
  };

  // Financial and occupancy telemetry:
  // A table is occupied IF AND ONLY IF it has active orders!
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => getTableActiveOrders(t.number).length > 0).length;
  const vacantTables = totalTables - occupiedTables;
  const totalCapacity = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  const activeFloorRevenue = tables.reduce((sum, t) => {
    const tableOrders = getTableActiveOrders(t.number);
    const tableTotal = tableOrders.reduce((ts, o) => ts + Number(o.total || o.total_amount || 0), 0);
    return sum + tableTotal;
  }, 0);

  // Helper to dynamically calculate elapsed dining time
  const getElapsedTiming = (ord) => {
    if (!ord) return null;
    if (ord.placed_at) {
      const mins = Math.max(1, Math.floor((Date.now() - new Date(ord.placed_at).getTime()) / 60000));
      return `${mins}m`;
    }
    if (ord.time) {
      return ord.time;
    }
    return '5m';
  };

  // Post-delivery Turnover Calculation (Counts 30 minutes from when food was served to table)
  const getTableFoodDeliveredAt = (table) => {
    if (table.food_delivered_at) return Number(table.food_delivered_at);
    const activeOrder = getTableActiveOrder(table.number);
    if (activeOrder?.food_delivered_at) return Number(activeOrder.food_delivered_at);
    return null;
  };

  const getTableMinutesSinceServed = (table) => {
    const deliveredAt = getTableFoodDeliveredAt(table);
    if (!deliveredAt) return null;
    return Math.max(0, Math.floor((currentTime - deliveredAt) / 60000));
  };

  const isTableTurnoverDue = () => false;
  const turnoverDueTables = [];

  // Auto-calculate next table code (e.g. T17)
  const getNextTableNumber = () => {
    const nums = tables
      .map(t => {
        const match = (t.number || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const nextNum = max + 1;
    return `T${nextNum < 10 ? '0' + nextNum : nextNum}`;
  };

  const handleOpenAddModal = () => {
    const autoNum = getNextTableNumber();
    setNewTable({ number: autoNum, capacity: 4, zone: 'Main Hall' });
    setAddStep('form');
    setCreatedTable(null);
    setShowAddModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const cleanNumber = (newTable.number || '').trim().toUpperCase();
    if (!cleanNumber) return;

    // Check duplicate
    const exists = tables.some(t => t.number.toUpperCase() === cleanNumber);
    if (exists) {
      alert(`Table "${cleanNumber}" already exists in the system. Please use a distinct table code.`);
      return;
    }

    const tableObj = {
      ...newTable,
      number: cleanNumber,
      capacity: parseInt(newTable.capacity, 10) || 4
    };

    onAddTable(tableObj);
    setCreatedTable(tableObj);
    setAddStep('created');
    playSound('success');
  };

  const handleDownloadQR = (tableNum, svgId = 'qr-svg-new-table') => {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `AtmiyaDosa-QR-Table-${tableNum}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const promptVacateWithDoubleConfirm = (table, method = 'Cash', amount = 0) => {
    setVacateConfirmState({
      step: 1,
      table,
      method,
      amount: Number(amount || 0)
    });
  };

  const handleExecuteVacate = () => {
    if (!vacateConfirmState?.table) return;
    const { table, method } = vacateConfirmState;
    const activeOrder = getTableActiveOrder(table.number);
    if (onSettleTableBill && activeOrder) {
      onSettleTableBill(activeOrder.id, table.number, method);
    }
    if (onVacateTable) {
      onVacateTable(table.number);
    } else if (onUpdateTable) {
      onUpdateTable(table.id, { status: 'available', is_occupied: false, on_hold: false, current_order_id: null, timing: null });
    }
    playSound('cash');
    setVacateConfirmState(null);
    setSelectedTable(null);
  };

  const handleQuickSettle = (table, method = 'Cash') => {
    const activeOrders = getTableActiveOrders(table.number);
    const balance = activeOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
    promptVacateWithDoubleConfirm(table, method, balance);
  };

  const handleShiftTableSubmit = (e) => {
    e.preventDefault();
    if (!shiftTargetTable || !selectedTable) return;
    if (onShiftTable) {
      onShiftTable(selectedTable.number, shiftTargetTable);
    }
    playSound('success');
    setShowShiftModal(false);
    setSelectedTable(null);
    setShiftTargetTable('');
  };

  // Theme palettes - pure authentic light surfaces
  const isDark = false;
  const cardBg = 'bg-white';
  const cardBorder = 'border-slate-200/80';
  const textPrimary = 'text-slate-900';
  const textMuted = 'text-slate-500';

  return (
    <div className="space-y-5">
      
      {/* 1. TOP HEADER & TELEMETRY */}
      <div className={`p-5 rounded-2xl ${cardBg} border ${cardBorder} shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-black ${textPrimary} tracking-tight font-heading`}>
              Restaurant Tables & Sessions
            </h2>
            <p className={`text-xs ${textMuted} font-medium`}>
              Real-time table occupancy, QR standees, dining durations, and turnover control.
            </p>
          </div>
        </div>

        {/* Add Table Action */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPI PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tables</span>
            <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{totalTables}</div>
            <span className="text-[10px] text-slate-500 font-semibold">{totalCapacity} Total Seats</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <LayoutGrid className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available</span>
            <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">{vacantTables}</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Ready for Seating</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Occupied</span>
            <div className="text-xl font-black text-orange-600 font-mono mt-0.5">{occupiedTables}</div>
            <span className="text-[10px] text-orange-700 font-semibold">Active Dining</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Floor Running Bill</span>
            <div className="text-xl font-black text-blue-600 font-mono mt-0.5">₹{activeFloorRevenue.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-blue-700 font-semibold">Unsettled Value</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. ZONE TABS & TURNOVER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {zones.map(z => {
            const count = z === 'All' ? tables.length : tables.filter(t => t.zone === z).length;
            return (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  selectedZone === z 
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{z}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  selectedZone === z ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Vacate All Tables Action */}
          {occupiedTables > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Vacate and mark all floor tables as clean & available?')) {
                  tables.forEach(t => {
                    if (onVacateTable) onVacateTable(t.number);
                  });
                  if (onReconcileTables) onReconcileTables();
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 cursor-pointer shadow-2xs"
              title="Vacate and clear all floor dining tables"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vacate All ({occupiedTables})</span>
            </button>
          )}

          {/* Sync Floor / Free Empty Tables Button */}
          {onReconcileTables && (
            <button
              onClick={() => {
                onReconcileTables();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              title="Clean up and free all tables with no active orders"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Sync Floor (Free Empty)</span>
            </button>
          )}



          {/* Test / Simulation 30m Elapsed Trigger */}
        </div>
      </div>

      {/* 4. MAIN TABLE RENDERING */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredTables.map(table => {
            const activeOrders = getTableActiveOrders(table.number);
            // STRICT OPERATIONAL TRUTH: Table is occupied IF AND ONLY IF it has active orders!
            const isOccupied = activeOrders.length > 0;
            const activeOrder = activeOrders[0] || null;
            const orderTotal = activeOrders.length > 0
              ? activeOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0)
              : 0;
            const totalPaid = activeOrders
              .filter(o => o.payment_status?.toLowerCase() === 'paid')
              .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
            const balanceDue = Math.max(0, orderTotal - totalPaid);
            const isFullyPaid = isOccupied && balanceDue === 0 && orderTotal > 0;

            return (
              <div 
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`p-4 rounded-2xl border transition space-y-3 cursor-pointer hover:shadow-md relative overflow-hidden flex flex-col justify-between group ${
                  isOccupied 
                    ? 'bg-orange-50/40 border-orange-300 hover:border-orange-500' 
                    : 'bg-white border-slate-200 hover:border-emerald-400 shadow-2xs'
                }`}
              >
                {/* Status Indicator Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xl font-black font-heading ${textPrimary}`}>{table.number}</span>
                    {isOccupied && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                    )}
                  </div>

                  {isOccupied ? (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      isFullyPaid 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {isFullyPaid ? `Paid • ₹${orderTotal}` : `Due: ₹${balanceDue}`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Vacant
                    </span>
                  )}
                </div>

                {/* Table Metadata */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Zone:</span>
                    <span className={`font-bold ${textPrimary}`}>{table.zone}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Capacity:</span>
                    <span className={`font-bold ${textPrimary} flex items-center space-x-1`}>
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{table.capacity} Guests</span>
                    </span>
                  </div>

                  {isOccupied && (() => {
                    const minsSinceServed = getTableMinutesSinceServed(table);
                    const turnoverDue = isTableTurnoverDue(table);
                    return (
                      <div className="pt-1.5 border-t border-orange-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] gap-1 min-w-0 overflow-hidden">
                          <span className={`font-bold ${textPrimary} flex items-center gap-1 min-w-0 flex-1 truncate`}>
                            <User className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{activeOrder?.customer_name || 'Guest'}</span>
                          </span>
                          {activeOrder?.customer_phone && (
                            <span className="font-mono text-[10px] text-slate-500 font-bold flex items-center gap-0.5 shrink-0">
                              <Phone className="w-2.5 h-2.5 text-slate-500" />
                              <span>{String(activeOrder.customer_phone).slice(-4)}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-orange-700 font-bold font-mono">
                          <span className="flex items-center space-x-1 text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>{minsSinceServed !== null ? `Served ${minsSinceServed}m ago` : (getElapsedTiming(activeOrder) || table.timing || '5m')}</span>
                          </span>
                          {orderTotal > 0 && (
                            <span className={`text-xs font-black ${textPrimary}`}>₹{orderTotal}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Card Bottom Quick Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setPreviewQRTable(table)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="View & Print QR Standee"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSimulateCustomer(table.number)}
                    className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[10px] flex-1 text-center transition truncate cursor-pointer border border-orange-200"
                  >
                    Menu
                  </button>

                  <button
                    onClick={() => onDeleteTable(table.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      {/* 5. INTERACTIVE TABLE OPERATIONS DRAWER / MODAL */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-xl font-black font-heading shadow-md">
                  {selectedTable.number}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Table {selectedTable.number} Details
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedTable.zone} • {selectedTable.capacity} Seating Capacity
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTable(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Ticket Status */}
            {(() => {
              const activeOrders = getTableActiveOrders(selectedTable.number);
              if (activeOrders.length === 0) {
                return (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <span className="text-2xl">🟢</span>
                    <h4 className="text-sm font-black text-emerald-900 font-heading">Table {selectedTable.number} is Currently Vacant</h4>
                    <p className="text-xs text-emerald-700">No active dining orders or unpaid tickets. Clean and ready for walk-in seating or QR customer self-order.</p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => onSimulateCustomer(selectedTable.number)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow flex items-center space-x-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open QR Menu</span>
                      </button>
                      <button
                        onClick={() => setPreviewQRTable(selectedTable)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-orange-600" />
                        <span>View QR Standee</span>
                      </button>
                      {selectedTable.status === 'occupied' && (
                        <button
                          onClick={() => {
                            if (onUpdateTable) {
                              onUpdateTable(selectedTable.id, { status: 'available', current_order_id: null, timing: null, current_customer_name: null, current_customer_phone: null });
                            }
                            setSelectedTable(null);
                            playSound('success');
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center space-x-1.5 border border-amber-300 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Clear Stale Status</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const primaryOrder = activeOrders[0];
              const totalGrossAmt = activeOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);

              // Authoritative Payment Status Classification
              const isOrderPaidOnline = (o) => Boolean(
                (o.payment_status?.toLowerCase() === 'paid' && 
                 (o.payment_mode?.toLowerCase().includes('upi') || 
                  o.payment_mode?.toLowerCase().includes('razorpay') || 
                  o.payment_mode?.toLowerCase().includes('online') || 
                  o.payment_verified_online === true)) ||
                o.payment_mode === 'ONLINE_RAZORPAY' ||
                o.payment_mode === 'Razorpay' ||
                o.payment_mode === 'Online (Prepaid)'
              );

              const isOrderCashPaid = (o) => Boolean(
                !isOrderPaidOnline(o) && 
                o.payment_status?.toLowerCase() === 'paid' && 
                (o.payment_mode?.toLowerCase().includes('cash') || o.payment_mode?.toLowerCase().includes('counter'))
              );

              const totalPaidOnline = activeOrders.filter(isOrderPaidOnline).reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
              const totalPaidCash = activeOrders.filter(isOrderCashPaid).reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
              const totalPaidSoFar = totalPaidOnline + totalPaidCash;
              const balanceDue = Math.max(0, totalGrossAmt - totalPaidSoFar);

              // 30-Minute Turnover Calculation from Food Delivery
              const minsSinceDelivered = getTableMinutesSinceServed(selectedTable);
              const elapsedMins = minsSinceDelivered !== null ? minsSinceDelivered : (() => {
                if (selectedTable?.timing) {
                  const m = selectedTable.timing.match(/\d+/);
                  if (m) return parseInt(m[0], 10);
                }
                if (primaryOrder.time) {
                  const m = primaryOrder.time.match(/\d+/);
                  if (m) return parseInt(m[0], 10);
                }
                return 18;
              })();

              const targetDiningMins = 30;
              const diningProgressPercent = Math.min(Math.round((elapsedMins / targetDiningMins) * 100), 100);
              const isOvertime = elapsedMins >= targetDiningMins;
              const isFinishedEarly = elapsedMins >= 15 && elapsedMins < targetDiningMins;

              return (
                <div className="space-y-4">
                  
                  {/* 1. SESSION OVERVIEW HEADER */}
                  <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200/90 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-orange-900 font-mono text-sm">{primaryOrder.id}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-orange-200/80 text-orange-950 text-[10px] font-bold">
                          {activeOrders.length > 1 ? `${activeOrders.length} Rounds Active` : (primaryOrder.order_source || 'QR Self-Order')}
                        </span>
                      </div>
                      <div className="text-[11px] text-orange-700 font-medium mt-0.5">
                        Guest: <span className="font-bold text-orange-900">{primaryOrder.customer_name || 'Guest'}</span>
                        {(primaryOrder.customer_phone || selectedTable.current_customer_phone) && (
                          <span className="ml-2 font-mono text-[10px] bg-orange-200/80 px-2 py-0.5 rounded-full text-orange-950 font-bold">
                            📞 +91 {primaryOrder.customer_phone || selectedTable.current_customer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider inline-flex items-center space-x-1 ${
                        balanceDue === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                        <span>{balanceDue === 0 ? 'All Paid' : `Collect ₹${balanceDue}`}</span>
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        First Order: {primaryOrder.time || '12m ago'}
                      </div>
                    </div>
                  </div>

                  {/* 2. PROMINENT PAYMENT VERIFICATION BANNER */}
                  {balanceDue === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300/80 shadow-sm flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                              ALL ROUNDS 100% PAID
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black text-[9px] tracking-wider">
                              VERIFIED
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Paid via UPI / Gateway • <strong className="text-emerald-900">₹0.00 Balance Due</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <div className="text-sm font-black text-emerald-900 font-mono">₹{totalGrossAmt}</div>
                        <div className="text-[9px] font-bold text-emerald-600 uppercase">Settled</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm flex items-center justify-between animate-pulse">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                              ⚠️ CASH TO COLLECT: ₹{balanceDue}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[9px] tracking-wider">
                              PENDING
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800 font-medium">
                            {totalPaidOnline > 0 ? `Meal (₹${totalPaidOnline}) was paid online. Collect ₹${balanceDue} cash for add-ons (Water/extras)!` : 'Guest selected Cash / Table payment.'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <div className="text-sm font-black text-rose-600 font-mono">₹{balanceDue}</div>
                        <div className="text-[9px] font-bold text-rose-500 uppercase">Cash Due</div>
                      </div>
                    </div>
                  )}

                  {/* 3. DINING DURATION TRACKER */}
                  <div className="p-3 rounded-2xl border bg-slate-50 border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span className="font-bold text-slate-800 font-heading">
                          Dining Duration
                        </span>
                      </div>
                      <div className="font-mono font-black text-xs text-slate-900">
                        {elapsedMins} mins elapsed
                      </div>
                    </div>
                  </div>

                  {/* 4. MULTI-ROUND ITEMIZED ORDERS BREAKDOWN */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                        Table Session Orders ({activeOrders.length} {activeOrders.length === 1 ? 'Round' : 'Rounds'})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Itemized Breakdown
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeOrders.map((ord, idx) => {
                        const ordPaidOnline = isOrderPaidOnline(ord);
                        const ordCashPaid = isOrderCashPaid(ord);
                        const ordItems = ord.items || [];
                        const ordAmt = ord.total || ord.total_amount || 0;

                        return (
                          <div key={ord.id || idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-black text-[9px] font-mono border border-orange-200">
                                  R{ord.round || (idx + 1)}
                                </span>
                                <span className="font-bold text-slate-800 font-mono text-[11px]">{ord.id}</span>
                                {ord.is_addon && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold text-[9px]">
                                    💧 Water / Add-On
                                  </span>
                                )}
                              </div>
                              <div>
                                {ordPaidOnline ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✅ Paid Online
                                  </span>
                                ) : ordCashPaid ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                    ✅ Settled Cash
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                    💵 Collect ₹{ordAmt} Cash
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              {ordItems.map((it, itIdx) => (
                                <div key={itIdx} className="flex items-center justify-between text-slate-700">
                                  <span className="font-medium">
                                    <strong className="text-orange-600 font-mono mr-1.5">{it.qty}x</strong>
                                    {it.name}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900">
                                    ₹{(it.price || 0) * (it.qty || 1)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {ord.special_note && (
                              <div className="text-[10px] text-slate-500 italic bg-white p-1 rounded border border-slate-100">
                                Note: {ord.special_note}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. FINANCIAL RECONCILIATION BAR */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-slate-900 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Gross Bill:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">₹{totalGrossAmt}</span>
                    </div>
                    {totalPaidOnline > 0 && (
                      <div className="flex justify-between items-center text-emerald-700">
                        <span>Paid Online (UPI / Gateway):</span>
                        <span className="font-mono font-bold">-₹{totalPaidOnline}</span>
                      </div>
                    )}
                    {totalPaidCash > 0 && (
                      <div className="flex justify-between items-center text-blue-700">
                        <span>Paid Cash at Counter:</span>
                        <span className="font-mono font-bold">-₹{totalPaidCash}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-amber-200/80 flex justify-between items-center">
                      <span className="font-black uppercase tracking-wider text-xs">
                        {balanceDue > 0 ? '⚠️ Cash Balance to Collect:' : '✅ Table Session Status:'}
                      </span>
                      <span className={`text-base font-black font-mono ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {balanceDue > 0 ? `₹${balanceDue}` : 'Fully Settled (₹0.00 Due)'}
                      </span>
                    </div>
                  </div>

                  {/* 6. CONTEXT-AWARE ACTION BUTTONS */}
                  {balanceDue === 0 ? (
                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => promptVacateWithDoubleConfirm(selectedTable, totalPaidOnline > 0 ? 'UPI' : 'Cash', totalGrossAmt)}
                        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition cursor-pointer"
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        <span>⚡ Vacate Table (All ₹{totalGrossAmt} Paid in Full)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowShiftModal(true)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Shift Table</span>
                        </button>

                        <button
                          onClick={() => {
                            const allItems = activeOrders.flatMap(o => Array.isArray(o.items) ? o.items : []);
                            const primaryOrder = activeOrders[0] || {};
                            printSinglePageReceipt({
                              order: {
                                ...primaryOrder,
                                id: primaryOrder.id || `TBL-${selectedTable.number}`,
                                table_number: selectedTable.number,
                                total: totalGrossAmt,
                                payment_mode: totalPaidOnline > 0 ? 'UPI' : 'Cash',
                                payment_status: 'Paid',
                                items: allItems.length > 0 ? allItems : (primaryOrder.items || [])
                              },
                              restaurantSettings,
                              currentTable: selectedTable.number
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Tax Invoice</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => promptVacateWithDoubleConfirm(selectedTable, 'Cash', balanceDue)}
                          className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow flex items-center justify-center space-x-1.5 transition cursor-pointer"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Collect ₹{balanceDue} Cash & Vacate</span>
                        </button>

                        <button
                          onClick={() => promptVacateWithDoubleConfirm(selectedTable, 'UPI', balanceDue)}
                          className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow flex items-center justify-center space-x-1.5 transition cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Collect ₹{balanceDue} via UPI & Vacate</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowShiftModal(true)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Shift Table</span>
                        </button>

                        <button
                          onClick={() => {
                            const allItems = activeOrders.flatMap(o => Array.isArray(o.items) ? o.items : []);
                            const primaryOrder = activeOrders[0] || {};
                            printSinglePageReceipt({
                              order: {
                                ...primaryOrder,
                                id: primaryOrder.id || `TBL-${selectedTable.number}`,
                                table_number: selectedTable.number,
                                total: totalGrossAmt,
                                payment_mode: 'Cash on Delivery',
                                payment_status: 'Payment Due',
                                items: allItems.length > 0 ? allItems : (primaryOrder.items || [])
                              },
                              restaurantSettings,
                              currentTable: selectedTable.number
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print KOT / Bill</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QR Standee Quick Action */}
                  <div className="pt-1">
                    <button
                      onClick={() => setPreviewQRTable(selectedTable)}
                      className="w-full py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center space-x-1.5 border border-orange-200 transition"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View & Print Table Standee QR</span>
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* 6. SHIFT TABLE MODAL */}
      {showShiftModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 font-heading">
              Transfer Table {selectedTable.number}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Select destination vacant table to move the running order:
            </p>

            <form onSubmit={handleShiftTableSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Table</label>
                <select
                  required
                  value={shiftTargetTable}
                  onChange={(e) => setShiftTargetTable(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-orange-500"
                >
                  <option value="">Choose target table...</option>
                  {tables
                    .filter(t => t.number !== selectedTable.number && t.status !== 'occupied')
                    .map(t => (
                      <option key={t.id} value={t.number}>
                        {t.number} ({t.zone} - {t.capacity} seats)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!shiftTargetTable}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs shadow-md"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DYNAMIC ADD TABLE & QR STANDEE GENERATOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-4xl w-full border border-slate-200 shadow-2xl space-y-6 my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider mb-1">
                    Touchless Dining QR System
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                    {addStep === 'created' ? 'Table Created with Dynamic QR Code' : 'Add Dining Table & Generate QR Standee'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {addStep === 'created' 
                      ? 'The new dining table is live. Scan the QR code below to test customer ordering.'
                      : 'Assign table number and capacity — a live touchless QR standee is instantly generated.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setAddStep('form');
                  setCreatedTable(null);
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Configuration Form & Real-time Live Preview */}
            {addStep === 'form' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Table Setup Form (6 cols) */}
                <form onSubmit={handleAddSubmit} className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                      Table Identifier / Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. T17, VIP-1, P04"
                        value={newTable.number}
                        onChange={(e) => setNewTable({ ...newTable, number: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm font-bold focus:outline-none focus:border-orange-500 transition uppercase font-mono"
                      />
                      <span className="absolute right-3.5 top-3.5 text-[11px] font-bold text-slate-400">
                        Floor Code
                      </span>
                    </div>
                    {tables.some(t => t.number.toUpperCase() === (newTable.number || '').trim().toUpperCase()) && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Table code already taken on floor plan!</span>
                      </p>
                    )}
                  </div>

                  {/* Seating Capacity with Quick Pills */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Seating Capacity
                      </label>
                      <span className="text-xs font-bold text-orange-600 font-mono">
                        {newTable.capacity} Guests
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-1.5 mb-2">
                      {[2, 4, 6, 8, 10, 12].map(seats => (
                        <button
                          key={seats}
                          type="button"
                          onClick={() => setNewTable({ ...newTable, capacity: seats })}
                          className={`py-1.5 rounded-xl text-xs font-black transition border ${
                            Number(newTable.capacity) === seats 
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/20' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {seats}P
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={newTable.capacity}
                      onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-orange-500 transition"
                      placeholder="Custom capacity count"
                    />
                  </div>

                  {/* Floor Zone Selection */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                      Floor Zone Section
                    </label>
                    <select
                      value={newTable.zone}
                      onChange={(e) => setNewTable({ ...newTable, zone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer bg-white"
                    >
                      <option value="Main Hall">Main Hall</option>
                      <option value="AC Section">AC Section</option>
                      <option value="Patio Garden">Patio Garden</option>
                      <option value="Family Section">Family Section</option>
                      <option value="Rooftop Lounge">Rooftop Lounge</option>
                    </select>
                  </div>

                  {/* Touchless QR Guest Flow Highlight Card */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Same Touchless QR Purpose & Flow</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-emerald-800 font-medium">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Direct URL: <code className="font-mono bg-emerald-100 px-1 rounded">/?table={(newTable.number || 'T00').trim().toUpperCase()}</code></span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Bypasses admin login screen — guests land directly on live menu.</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Jain & dietary filter toggles + live cooking cart.</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Service buttons (Call Waiter, Water, Bill) & Kitchen KDS dispatch.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newTable.number || tables.some(t => t.number.toUpperCase() === (newTable.number || '').trim().toUpperCase())}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-orange-500/20 flex items-center space-x-1.5 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Confirm & Add Table with QR</span>
                    </button>
                  </div>
                </form>

                {/* Right Side: Dynamic Acrylic Standee Card Live Preview (6 cols) */}
                <div className="lg:col-span-6 flex flex-col items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <div className="w-full text-center space-y-1 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Live Acrylic Standee Preview
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Dynamic preview updates instantly as you customize table code.
                    </p>
                  </div>

                  {/* Printable Standee Card */}
                  <div className="bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-xl text-center space-y-3.5 max-w-xs w-full relative printable-area">
                    <div className="space-y-1">
                      <div className="inline-block px-3 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider">
                        Touchless Dining
                      </div>
                      <h4 className="text-xl font-black text-slate-950 font-heading">
                        {restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500">
                        {restaurantSettings?.tagline || 'Pure Veg • Authentic Taste'}
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
                      <QRCodeSVG
                        id="qr-svg-new-table"
                        value={getTableQrUrl(newTable.number || 'T00')}
                        size={160}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-base font-black text-slate-950 font-heading bg-slate-100 py-1 px-4 rounded-xl inline-block border border-slate-200 font-mono">
                        TABLE {(newTable.number || 'T00').trim().toUpperCase()}
                      </div>
                      <p className="text-[11px] font-black text-orange-600">
                        Scan to View Menu, Order & Pay
                      </p>
                    </div>

                    <div className="text-[8px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                      Pure Veg Kitchen • Clean & Hygienic
                    </div>
                  </div>

                  {/* Standee Action Buttons Bar */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleDownloadQR((newTable.number || 'T00').trim().toUpperCase(), 'qr-svg-new-table')}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-200 shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5 text-orange-600" />
                      <span>Download PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-200 shadow-sm transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-700" />
                      <span>Print Standee</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(`${window.location.origin}/?table=${(newTable.number || 'T00').trim().toUpperCase()}`)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-200 shadow-sm transition"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedUrl ? 'Copied Link' : 'Copy Menu URL'}</span>
                    </button>

                    <a
                      href={`${window.location.origin}/?table=${(newTable.number || 'T00').trim().toUpperCase()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center space-x-1.5 border border-orange-200 shadow-sm transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test Live Menu</span>
                    </a>
                  </div>

                </div>

              </div>
            )}

            {/* Step 2: Table Successfully Created Celebration Screen */}
            {addStep === 'created' && createdTable && (
              <div className="space-y-6 text-center animate-fadeIn">
                
                {/* Celebration Badge */}
                <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 max-w-lg mx-auto space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-lg font-black text-emerald-950 font-heading">
                    Table {createdTable.number} is Live on the Floor Plan!
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium">
                    The dining table has been provisioned ({createdTable.zone}, {createdTable.capacity} Guests). Its dedicated QR code is ready for customer table ordering.
                  </p>
                </div>

                {/* Standee Preview */}
                <div className="flex justify-center">
                  <div className="bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-2xl text-center space-y-3.5 max-w-xs w-full relative printable-area">
                    <div className="space-y-1">
                      <div className="inline-block px-3 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider">
                        Touchless Dining
                      </div>
                      <h4 className="text-xl font-black text-slate-950 font-heading">
                        {restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500">
                        {restaurantSettings?.tagline || 'Pure Veg • Authentic Taste'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
                      <QRCodeSVG
                        id="qr-svg-created-table"
                        value={getTableQrUrl(createdTable.number)}
                        size={170}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-lg font-black text-slate-950 font-heading bg-slate-100 py-1.5 px-4 rounded-xl inline-block border border-slate-200 font-mono">
                        TABLE {createdTable.number}
                      </div>
                      <p className="text-xs font-black text-orange-600">
                        Scan to View Menu, Order & Pay
                      </p>
                    </div>

                    <div className="text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                      Pure Veg Kitchen • Clean & Hygienic
                    </div>
                  </div>
                </div>

                {/* Final Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleDownloadQR(createdTable.number, 'qr-svg-created-table')}
                    className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center space-x-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Standee PNG</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center space-x-2 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Standee Card</span>
                  </button>

                  <a
                    href={`${window.location.origin}/?table=${createdTable.number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 flex items-center space-x-1.5 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Test Customer Menu</span>
                  </a>

                  <button
                    onClick={() => {
                      const autoNum = getNextTableNumber();
                      setNewTable({ number: autoNum, capacity: 4, zone: 'Main Hall' });
                      setAddStep('form');
                      setCreatedTable(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Table</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setAddStep('form');
                      setCreatedTable(null);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow transition"
                  >
                    <span>Done (View Tables)</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* 8. QUICK QR STANDEE MODAL FOR ANY TABLE */}
      {previewQRTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Table {previewQRTable.number} QR Standee
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {previewQRTable.zone} • {previewQRTable.capacity} Guests
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewQRTable(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standee Preview */}
            <div className="flex justify-center">
              <div className="bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-xl text-center space-y-3.5 max-w-xs w-full relative printable-area">
                <div className="space-y-1">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider">
                    Touchless Dining
                  </div>
                  <h4 className="text-xl font-black text-slate-950 font-heading">
                    {restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500">
                    {restaurantSettings?.tagline || 'Pure Veg • Authentic Taste'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
                  <QRCodeSVG
                    id="qr-svg-preview-table"
                    value={getTableQrUrl(previewQRTable.number)}
                    size={170}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-lg font-black text-slate-950 font-heading bg-slate-100 py-1.5 px-4 rounded-xl inline-block border border-slate-200 font-mono">
                    TABLE {previewQRTable.number}
                  </div>
                  <p className="text-xs font-black text-orange-600">
                    Scan to View Menu, Order & Pay
                  </p>
                </div>

                <div className="text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                  Pure Veg Kitchen • Clean & Hygienic
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleDownloadQR(previewQRTable.number, 'qr-svg-preview-table')}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow flex items-center justify-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </button>

              <button
                onClick={() => handleCopyLink(getTableQrUrl(previewQRTable.number))}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>

              <a
                href={getTableQrUrl(previewQRTable.number)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center space-x-1.5 border border-orange-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live Menu</span>
              </a>
            </div>

          </div>
        </div>
      )}

      {/* 2-STEP CONFIRMATION MODAL: CASH RECEIVED & VACATE TABLE */}
      {vacateConfirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-slate-200 shadow-2xl space-y-4 text-center">
            
            {vacateConfirmState.step === 1 ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl shadow-xs">
                  💵
                </div>

                <div className="space-y-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                    Step 1 of 2 • Cash Verification
                  </span>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Did you receive the cash?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Table <strong>{vacateConfirmState.table?.number}</strong> bill balance:
                  </p>
                  <div className="text-3xl font-black font-mono text-emerald-700 py-1">
                    ₹{vacateConfirmState.amount}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Please confirm that the guest has finished dining and the cash amount has been handed over.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVacateConfirmState(null)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Not Yet / Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setVacateConfirmState(prev => ({ ...prev, step: 2 }))}
                    className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Yes, Cash Received</span>
                    <span>→</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl shadow-xs">
                  ⚡
                </div>

                <div className="space-y-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Step 2 of 2 • Final Confirmation
                  </span>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Double Check: Settle & Vacate?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Are you 100% sure you received <strong>₹{vacateConfirmState.amount} in cash</strong>?
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-[11px] text-slate-700 space-y-1.5">
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Orders marked COMPLETED & PAID</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Remove all holds from orders and KDS</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Remove hold from Table {vacateConfirmState.table?.number} & mark VACANT</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>🧹 Auto-dispatch cleaning alert to floor waiters</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVacateConfirmState(null)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Back / Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteVacate}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>✓ Confirm & Vacate</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
