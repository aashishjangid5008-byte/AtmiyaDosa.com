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
  Map,
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
  Wifi,
  Share2,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Banknote,
  Zap,
  CheckCheck,
  User,
  Phone
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { playSound } from '../../lib/sound';

export default function TablesView({ 
  tables, 
  orders = [],
  restaurantSettings = {},
  onAddTable, 
  onDeleteTable, 
  onUpdateTable,
  onSettleTableBill,
  onShiftTable,
  onSelectQRTable, 
  onSimulateCustomer, 
  currentLang,
  theme = 'light'
}) {
  const [selectedZone, setSelectedZone] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'floorplan'
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState('form'); // 'form' or 'created'
  const [createdTable, setCreatedTable] = useState(null);
  const [previewQRTable, setPreviewQRTable] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTargetTable, setShiftTargetTable] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [autoVacatePaidTables, setAutoVacatePaidTables] = useState(false);
  
  const [newTable, setNewTable] = useState({ number: '', capacity: 4, zone: 'Main Hall' });

  // 30-Minute Automatic Table Vacate Engine for Online Paid Orders
  useEffect(() => {
    if (!autoVacatePaidTables) return;
    const interval = setInterval(() => {
      tables.forEach(table => {
        if (table.status === 'occupied') {
          const order = getTableActiveOrder(table.number);
          if (order && (order.status === 'Served' || order.status === 'Ready')) {
            const isOrderPaid = Boolean(
              order.payment_status?.toLowerCase() === 'paid' || 
              order.payment_mode === 'Razorpay' || 
              order.payment_mode === 'Online' || 
              order.payment_mode === 'ONLINE_RAZORPAY' ||
              order.payment_mode === 'UPI' ||
              order.payment_verified_online === true
            );
            const m = (table.timing || '').match(/\d+/);
            const mins = m ? parseInt(m[0], 10) : 0;
            // If table dining time reached 30 minutes and bill is already paid online
            if (isOrderPaid && mins >= 30) {
              if (onSettleTableBill) {
                onSettleTableBill(order.id, table.number, order.payment_mode || 'UPI');
              }
            }
          }
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [autoVacatePaidTables, tables, orders]);

  const t = (key) => getTranslation(currentLang, key);
  const zones = ['All', 'Main Hall', 'AC Section', 'Patio Garden', 'Family Section'];

  const filteredTables = selectedZone === 'All' 
    ? tables 
    : tables.filter(t => t.zone === selectedZone);

  // Financial and occupancy telemetry
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const vacantTables = totalTables - occupiedTables;
  const totalCapacity = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  const activeFloorRevenue = orders
    .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);

  // Helper to get active order for a table
  const getTableActiveOrder = (tableNum) => {
    return orders.find(o => 
      (o.table_number === tableNum || o.table_number === `Table ${tableNum}` || o.table_number === tableNum.replace('T', 'Table ')) &&
      o.status !== 'Completed' && 
      o.status !== 'Cancelled'
    );
  };

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

  const handleQuickSettle = (table, method = 'Cash') => {
    const activeOrder = getTableActiveOrder(table.number);
    if (onSettleTableBill && activeOrder) {
      onSettleTableBill(activeOrder.id, table.number, method);
    } else {
      // Fallback: clear table status
      if (onUpdateTable) {
        onUpdateTable(table.id, { status: 'available', current_order_id: null, timing: null });
      }
    }
    playSound('cash');
    setSelectedTable(null);
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

  // Theme palettes
  const isDark = theme === 'obsidian' || theme === 'sapphire';
  const isSapphire = theme === 'sapphire';
  const cardBg = isDark ? (isSapphire ? 'bg-slate-900/90' : 'bg-slate-900') : 'bg-white';
  const cardBorder = isDark ? (isSapphire ? 'border-sky-900/40' : 'border-slate-800') : 'border-slate-200/80';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

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
              Floor Plan & Table Sessions
            </h2>
            <p className={`text-xs ${textMuted} font-medium`}>
              Real-time table occupancy, QR standees, dining durations, and turnover control.
            </p>
          </div>
        </div>

        {/* View Switcher & Add Table Action */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('floorplan')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'floorplan' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Floor Map</span>
            </button>
          </div>

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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tables</span>
            <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{totalTables}</div>
            <span className="text-[10px] text-slate-400 font-medium">{totalCapacity} Total Seats</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
            <LayoutGrid className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</span>
            <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">{vacantTables}</div>
            <span className="text-[10px] text-emerald-600/80 font-medium">Ready for Seating</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Occupied</span>
            <div className="text-xl font-black text-orange-500 font-mono mt-0.5">{occupiedTables}</div>
            <span className="text-[10px] text-orange-500/80 font-medium">Active Dining</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Floor Running Bill</span>
            <div className="text-xl font-black text-blue-600 font-mono mt-0.5">₹{activeFloorRevenue.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-blue-500/80 font-medium">Unsettled Value</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
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
                    ? 'bg-slate-900 text-white dark:bg-orange-500 shadow-xs' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{z}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  selectedZone === z ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 30m Turnover Engine Auto-Vacate Switch */}
        <button
          onClick={() => {
            const nextState = !autoVacatePaidTables;
            setAutoVacatePaidTables(nextState);
            playSound(nextState ? 'success' : 'click');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 border cursor-pointer ${
            autoVacatePaidTables 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
          title="Turn on 30-minute automatic table vacation for online prepaid orders"
        >
          <Zap className={`w-3.5 h-3.5 ${autoVacatePaidTables ? 'text-emerald-600 fill-emerald-600 animate-pulse' : 'text-slate-400'}`} />
          <span>Auto-Vacate (30m): <strong className={autoVacatePaidTables ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}>{autoVacatePaidTables ? 'ON' : 'OFF'}</strong></span>
        </button>
      </div>

      {/* 4. MAIN TABLE RENDERING */}
      {viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filteredTables.map(table => {
            const isOccupied = table.status === 'occupied';
            const activeOrder = getTableActiveOrder(table.number);
            const orderTotal = activeOrder ? (activeOrder.total || activeOrder.total_amount || 0) : null;

            return (
              <div 
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`p-4 rounded-2xl border transition space-y-3 cursor-pointer hover:shadow-md relative overflow-hidden flex flex-col justify-between group ${
                  isOccupied 
                    ? 'bg-orange-500/5 border-orange-400/60 dark:border-orange-500/40 hover:border-orange-500' 
                    : `${cardBg} ${cardBorder} hover:border-emerald-400 dark:hover:border-emerald-500`
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
                    (() => {
                      const isOrderPaid = Boolean(
                        activeOrder && (
                          activeOrder.payment_status === 'Paid' || 
                          activeOrder.payment_status === 'PAID' || 
                          activeOrder.payment_mode === 'Razorpay' || 
                          activeOrder.payment_mode === 'Online' || 
                          activeOrder.payment_mode === 'ONLINE_RAZORPAY' ||
                          activeOrder.payment_mode === 'UPI' ||
                          activeOrder.payment_verified_online === true
                        )
                      );
                      return (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          isOrderPaid 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {isOrderPaid ? 'Paid' : 'Cash Due'}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Vacant
                    </span>
                  )}
                </div>

                {/* Table Metadata */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-400">Zone:</span>
                    <span className={`font-bold ${textPrimary}`}>{table.zone}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-400">Capacity:</span>
                    <span className={`font-bold ${textPrimary} flex items-center space-x-1`}>
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{table.capacity} Guests</span>
                    </span>
                  </div>

                  {isOccupied && (
                    <div className="pt-1.5 border-t border-orange-200/40 dark:border-orange-900/40 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${textPrimary} truncate max-w-[120px] flex items-center gap-1`}>
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{activeOrder?.customer_name || table.current_customer_name || 'Guest'}</span>
                        </span>
                        {(activeOrder?.customer_phone || table.current_customer_phone) && (
                          <span className="font-mono text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{(activeOrder?.customer_phone || table.current_customer_phone).slice(-4)}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 font-bold font-mono">
                        <span className="flex items-center space-x-1 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>{table.timing || '18m'}</span>
                        </span>
                        {orderTotal !== null && (
                          <span className={`text-xs font-black ${textPrimary}`}>₹{orderTotal}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Quick Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setPreviewQRTable(table)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    title="View & Print QR Standee"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSimulateCustomer(table.number)}
                    className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold text-[10px] flex-1 text-center transition truncate cursor-pointer"
                  >
                    Menu
                  </button>

                  <button
                    onClick={() => onDeleteTable(table.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* 2D VISUAL FLOOR MAP MODE */
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Restaurant Floor Visualizer</span>
              <h3 className="text-lg font-black font-heading text-white">Atmiya Dosa Hub Floor Plan</h3>
            </div>
            <div className="flex items-center space-x-4 text-xs font-bold text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span>Vacant</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block animate-pulse"></span>
                <span>Occupied</span>
              </span>
            </div>
          </div>

          {/* Graphical Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['Main Hall', 'AC Section', 'Patio Garden', 'Family Section'].map(zoneName => {
              const zoneTables = tables.filter(t => t.zone === zoneName);
              return (
                <div key={zoneName} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-heading font-black text-sm text-slate-200">{zoneName}</span>
                    <span className="text-xs text-slate-500 font-mono">{zoneTables.length} Tables</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {zoneTables.map(tbl => {
                      const occ = tbl.status === 'occupied';
                      return (
                        <div
                          key={tbl.id}
                          onClick={() => setSelectedTable(tbl)}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition transform hover:scale-105 ${
                            occ 
                              ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-lg shadow-orange-500/10' 
                              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-emerald-500'
                          }`}
                        >
                          <div className="text-base font-black font-heading">{tbl.number}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{tbl.capacity}P</div>
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            occ ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {occ ? 'Eating' : 'Free'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE TABLE OPERATIONS DRAWER / MODAL */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
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
              const activeOrder = getTableActiveOrder(selectedTable.number);
              if (!activeOrder) {
                return (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <span className="text-2xl">🟢</span>
                    <h4 className="text-sm font-black text-emerald-900 font-heading">Table is Currently Vacant</h4>
                    <p className="text-xs text-emerald-700">Ready for walk-in seating or QR customer self-order.</p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => onSimulateCustomer(selectedTable.number)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow flex items-center space-x-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open QR Menu</span>
                      </button>
                      <button
                        onClick={() => setPreviewQRTable(selectedTable)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 border border-slate-200"
                      >
                        <QrCode className="w-3.5 h-3.5 text-orange-600" />
                        <span>View QR Standee</span>
                      </button>
                    </div>
                  </div>
                );
              }

              const orderItems = activeOrder.items || [];
              const totalAmt = activeOrder.total || activeOrder.total_amount || 0;

              // Authoritative Payment Status Classification
              const isPaidOnline = Boolean(
                (activeOrder.payment_status?.toLowerCase() === 'paid' && 
                 (activeOrder.payment_mode?.toLowerCase().includes('upi') || 
                  activeOrder.payment_mode?.toLowerCase().includes('razorpay') || 
                  activeOrder.payment_mode?.toLowerCase().includes('online') || 
                  activeOrder.payment_verified_online === true)) ||
                activeOrder.payment_mode === 'ONLINE_RAZORPAY' ||
                activeOrder.payment_mode === 'Razorpay' ||
                activeOrder.payment_mode === 'Online (Prepaid)'
              );

              const isCashPaid = Boolean(
                !isPaidOnline && 
                activeOrder.payment_status?.toLowerCase() === 'paid' && 
                (activeOrder.payment_mode?.toLowerCase().includes('cash') || activeOrder.payment_mode?.toLowerCase().includes('counter'))
              );

              const isCashUnpaid = Boolean(!isPaidOnline && !isCashPaid);

              // 30-Minute Turnover Calculation
              const elapsedMins = (() => {
                if (selectedTable?.timing) {
                  const m = selectedTable.timing.match(/\d+/);
                  if (m) return parseInt(m[0], 10);
                }
                if (activeOrder.time) {
                  const m = activeOrder.time.match(/\d+/);
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
                  
                  {/* 1. ORDER OVERVIEW HEADER */}
                  <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200/90 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-orange-900 font-mono text-sm">{activeOrder.id}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-orange-200/80 text-orange-950 text-[10px] font-bold">
                          {activeOrder.order_source || 'QR Self-Order'}
                        </span>
                      </div>
                      <div className="text-[11px] text-orange-700 font-medium mt-0.5">
                        Guest: <span className="font-bold text-orange-900">{activeOrder.customer_name || 'Guest'}</span>
                        {(activeOrder.customer_phone || selectedTable.current_customer_phone) && (
                          <span className="ml-2 font-mono text-[10px] bg-orange-200/80 px-2 py-0.5 rounded-full text-orange-950 font-bold">
                            📞 +91 {activeOrder.customer_phone || selectedTable.current_customer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider inline-flex items-center space-x-1 ${
                        activeOrder.status === 'Served'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : activeOrder.status === 'Ready'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-orange-200 text-orange-900'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                        <span>{activeOrder.status}</span>
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Placed: {activeOrder.time || '12m ago'}
                      </div>
                    </div>
                  </div>

                  {/* 2. PROMINENT PAYMENT VERIFICATION BANNER */}
                  {isPaidOnline ? (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300/80 shadow-sm flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                              PAID ONLINE (Razorpay / UPI)
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black text-[9px] tracking-wider">
                              VERIFIED
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Settled directly via Gateway • <strong className="text-emerald-900">₹0.00 Balance Due</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <div className="text-sm font-black text-emerald-900 font-mono">₹{totalAmt}</div>
                        <div className="text-[9px] font-bold text-emerald-600 uppercase">Paid in Full</div>
                      </div>
                    </div>
                  ) : isCashPaid ? (
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                          <CheckCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                            Cash Collected at Counter
                          </span>
                          <p className="text-[11px] text-blue-700 font-medium">
                            Collected by {activeOrder.paid_collected_by || 'Cashier'} • ₹0.00 Due
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <div className="text-sm font-black text-blue-900 font-mono">₹{totalAmt}</div>
                        <div className="text-[9px] font-bold text-blue-600 uppercase">Settled</div>
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
                              ⚠️ CASH ON TABLE (UNPAID)
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[9px] tracking-wider">
                              COLLECT CASH
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800 font-medium">
                            Guest chose COD / Cash • Must collect before clearing table!
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <div className="text-sm font-black text-rose-600 font-mono">₹{totalAmt}</div>
                        <div className="text-[9px] font-bold text-rose-500 uppercase">Cash Due</div>
                      </div>
                    </div>
                  )}

                  {/* 3. 30-MINUTE DINING TURNOVER ENGINE */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    isOvertime 
                      ? (isPaidOnline ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-200' : 'bg-rose-50 border-rose-300 ring-2 ring-rose-200')
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center space-x-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isOvertime ? 'text-rose-600' : 'text-slate-600'}`} />
                        <span className="font-bold text-slate-800 font-heading">
                          Dining Turnover Tracker
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">(Avg. 30m Target)</span>
                      </div>
                      <div className="font-mono font-black text-xs">
                        <span className={isOvertime ? 'text-rose-600' : 'text-slate-900'}>
                          {elapsedMins}m
                        </span>
                        <span className="text-slate-400"> / 30m</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isOvertime ? 'bg-rose-500' : isFinishedEarly ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${diningProgressPercent}%` }}
                      />
                    </div>

                    {/* Turnover Prompts & Edge Cases */}
                    <div className="mt-2.5">
                      {isOvertime ? (
                        isPaidOnline ? (
                          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-orange-200 text-xs">
                            <div className="text-[11px] text-orange-950 font-medium">
                              ⚡ <span className="font-black">30m Target Reached:</span> Bill is 100% paid online. Free table for waiting guests:
                            </div>
                            <button
                              onClick={() => handleQuickSettle(selectedTable, activeOrder.payment_mode || 'UPI')}
                              className="ml-2 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[11px] shadow whitespace-nowrap transition"
                            >
                              Vacate Table Now
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-950 space-y-1">
                            <div className="flex items-center space-x-1.5 font-black text-rose-900">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>🚨 CRITICAL WALKOUT GUARD: 30+ Mins Elapsed!</span>
                            </div>
                            <p className="text-[11px] text-rose-800">
                              Guest selected COD / Cash on Table. Do <span className="font-bold underline">NOT</span> clear table until <span className="font-bold font-mono">₹{totalAmt}</span> cash is physically collected!
                            </p>
                          </div>
                        )
                      ) : isFinishedEarly ? (
                        <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-xs">
                          <span className="text-[11px] text-slate-600 font-medium">
                            Guests finished eating in {elapsedMins} mins?
                          </span>
                          <button
                            onClick={() => {
                              if (isPaidOnline || isCashPaid) {
                                handleQuickSettle(selectedTable, activeOrder.payment_mode || 'UPI');
                              } else {
                                handleQuickSettle(selectedTable, 'Cash');
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] shadow transition"
                          >
                            ⚡ Vacate Early ({elapsedMins}m)
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium">
                          <span>Guests dining comfortably</span>
                          <span className="font-mono">~{Math.max(30 - elapsedMins, 0)}m typical dining left</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. ITEMIZED BILL PREVIEW */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ordered Items</span>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold font-mono text-orange-600">{item.qty}x</span>
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">₹{(item.price || 0) * (item.qty || 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. TOTAL BAR & BALANCE DUE */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Order Subtotal: </span>
                      <span className="font-bold font-mono text-slate-800">₹{totalAmt}</span>
                    </div>
                    <div className="text-right">
                      {isPaidOnline || isCashPaid ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Balance Due:</span>
                          <span className="text-sm font-black font-mono text-emerald-600">₹0.00 (PAID)</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-900 font-bold uppercase text-[10px]">Cash To Collect:</span>
                          <span className="text-base font-black font-mono text-rose-600">₹{totalAmt}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. CONTEXT-AWARE ACTION BUTTONS */}
                  {isPaidOnline || isCashPaid ? (
                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => handleQuickSettle(selectedTable, activeOrder.payment_mode || 'UPI')}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition"
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        <span>⚡ Vacate & Clean Table (Bill Already Paid Online)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowShiftModal(true)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Shift Table</span>
                        </button>

                        <button
                          onClick={() => window.print()}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200"
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
                          onClick={() => handleQuickSettle(selectedTable, 'Cash')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow flex items-center justify-center space-x-1.5 transition"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Collect ₹{totalAmt} Cash & Vacate</span>
                        </button>

                        <button
                          onClick={() => handleQuickSettle(selectedTable, 'UPI')}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow flex items-center justify-center space-x-1.5 transition"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Collect via QR UPI & Vacate</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowShiftModal(true)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Shift Table</span>
                        </button>

                        <button
                          onClick={() => window.print()}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-slate-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
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
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
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
                        value={`${window.location.origin}/?table=${encodeURIComponent((newTable.number || 'T00').trim().toUpperCase())}`}
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
                      <div className="text-[9px] font-mono text-slate-400">
                        Wi-Fi: <span className="font-bold text-slate-600">Atmiya_Guest</span> | Pass: <span className="font-bold text-slate-600">delicious123</span>
                      </div>
                    </div>

                    <div className="text-[8px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                      Powered by Appwrite Real-Time Cloud
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
                        value={`${window.location.origin}/?table=${encodeURIComponent(createdTable.number)}`}
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
                      <div className="text-[10px] font-mono text-slate-400">
                        Wi-Fi: <span className="font-bold text-slate-600">Atmiya_Guest</span> | Pass: <span className="font-bold text-slate-600">delicious123</span>
                      </div>
                    </div>

                    <div className="text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                      Powered by Appwrite Real-Time Cloud
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
                    className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow flex items-center space-x-2 transition"
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
                    <span>Done (View Floor Map)</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* 8. QUICK QR STANDEE MODAL FOR ANY TABLE */}
      {previewQRTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
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
                    value={`${window.location.origin}/?table=${encodeURIComponent(previewQRTable.number)}`}
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
                  <div className="text-[10px] font-mono text-slate-400">
                    Wi-Fi: <span className="font-bold text-slate-600">Atmiya_Guest</span> | Pass: <span className="font-bold text-slate-600">delicious123</span>
                  </div>
                </div>

                <div className="text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                  Powered by Appwrite Real-Time Cloud
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
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow flex items-center justify-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </button>

              <button
                onClick={() => handleCopyLink(`${window.location.origin}/?table=${previewQRTable.number}`)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>

              <a
                href={`${window.location.origin}/?table=${previewQRTable.number}`}
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

    </div>
  );
}
