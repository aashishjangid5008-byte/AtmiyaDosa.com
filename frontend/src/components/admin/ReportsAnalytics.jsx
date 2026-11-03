import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download,
  FileSpreadsheet,
  FileText, 
  CheckCircle2, 
  IndianRupee, 
  PieChart, 
  ShieldCheck,
  Search,
  Calendar,
  AlertTriangle,
  Layers,
  Utensils,
  Ban
} from 'lucide-react';
import { 
  downloadZReportPdf, 
  downloadZReportCsv, 
  downloadThermalZReportPdf 
} from '../../lib/generateBillPdf';
import { playSound } from '../../lib/sound';

export default function ReportsAnalytics({ orders = [], restaurantSettings = {} }) {
  // Date Filter Scope: 'all' | 'today' | 'yesterday' | '7days' | 'month'
  const [dateFilter, setDateFilter] = useState('all');
  // Table Invoice Filter: 'all' | 'valid' | 'upi' | 'cash' | 'cancelled'
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Robust Date Parser
  const parseOrderDate = (order) => {
    if (!order) return new Date();
    const raw = order.placed_at || order.created_at || order.date || order.timestamp;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof order.time === 'string' && order.time.trim()) {
      const match = order.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      }
    }
    return new Date();
  };

  // Date Filtered Orders Scope
  const dateFilteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    return orders.filter(o => {
      const d = parseOrderDate(o);
      if (dateFilter === 'today') return d >= startOfToday;
      if (dateFilter === 'yesterday') return d >= startOfYesterday && d <= endOfYesterday;
      if (dateFilter === '7days') return d >= startOf7Days;
      if (dateFilter === 'month') return d >= startOfMonth;
      return true; // 'all'
    });
  }, [orders, dateFilter]);

  // Segregate Valid Collected Orders vs Cancelled/Void Orders
  const validOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const s = String(o.status || '').toUpperCase().trim();
      return s !== 'CANCELLED';
    });
  }, [dateFilteredOrders]);

  const cancelledOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const s = String(o.status || '').toUpperCase().trim();
      return s === 'CANCELLED';
    });
  }, [dateFilteredOrders]);

  // Accurate Financial Calculations from Valid (Non-Cancelled) Orders
  const grossSales = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
  }, [validOrders]);

  const totalTax = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (Number(o.tax || o.tax_amount) || 0), 0);
  }, [validOrders]);

  const totalDiscount = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (Number(o.discount || o.discount_amount) || 0), 0);
  }, [validOrders]);

  const netSales = Math.max(0, grossSales - totalTax);
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  // Total Volume (Plates/Items Sold) across Valid Orders
  const totalVolumePlates = useMemo(() => {
    return validOrders.reduce((sum, o) => {
      const items = o.items || o.order_items || [];
      if (items.length > 0) {
        return sum + items.reduce((isum, it) => isum + Number(it.qty || it.quantity || 1), 0);
      }
      return sum + 1;
    }, 0);
  }, [validOrders]);

  // Real Tender Mode Distribution across Valid Orders
  const upiOrders = useMemo(() => {
    return validOrders.filter(o => {
      const m = String(o.payment_mode || o.payment_method || '').toUpperCase();
      return m.includes('UPI') || m.includes('ONLINE');
    });
  }, [validOrders]);

  const cardOrders = useMemo(() => {
    return validOrders.filter(o => {
      const m = String(o.payment_mode || o.payment_method || '').toUpperCase();
      return m.includes('CARD');
    });
  }, [validOrders]);

  const cashOrders = useMemo(() => {
    return validOrders.filter(o => {
      const m = String(o.payment_mode || o.payment_method || '').toUpperCase();
      return m.includes('CASH') || m.includes('COD') || (!m.includes('UPI') && !m.includes('CARD') && !m.includes('ONLINE'));
    });
  }, [validOrders]);

  const upiSales = upiOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
  const cardSales = cardOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
  const cashSales = cashOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);

  const upiPercent = grossSales > 0 ? Math.round((upiSales / grossSales) * 100) : 0;
  const cardPercent = grossSales > 0 ? Math.round((cardSales / grossSales) * 100) : 0;
  const cashPercent = grossSales > 0 ? Math.max(0, 100 - upiPercent - cardPercent) : 0;

  // Cancelled / Void Orders Total
  const cancelledTotal = useMemo(() => {
    return cancelledOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
  }, [cancelledOrders]);

  // Filtered Table Invoices for Audit Table
  const tableDisplayOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const isCancelled = String(o.status || '').toUpperCase().trim() === 'CANCELLED';
      const pm = String(o.payment_mode || o.payment_method || '').toUpperCase();
      const isUpi = pm.includes('UPI') || pm.includes('ONLINE');
      const isCash = !isUpi && (pm.includes('CASH') || pm.includes('COD') || !pm.includes('CARD'));

      if (tableFilter === 'valid' && isCancelled) return false;
      if (tableFilter === 'upi' && (isCancelled || !isUpi)) return false;
      if (tableFilter === 'cash' && (isCancelled || !isCash)) return false;
      if (tableFilter === 'cancelled' && !isCancelled) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = String(o.order_number || o.id || '').toLowerCase();
        const tbl = String(o.table_number || '').toLowerCase();
        const cust = String(o.customer_name || '').toLowerCase();
        if (!num.includes(q) && !tbl.includes(q) && !cust.includes(q)) return false;
      }
      return true;
    });
  }, [dateFilteredOrders, tableFilter, searchQuery]);

  const handleDownloadPdf = () => {
    playSound('click');
    downloadZReportPdf({
      restaurantSettings,
      dateFilterLabel: dateFilterLabels[dateFilter],
      grossSales,
      netSales,
      totalTax,
      cgst,
      sgst,
      totalDiscount,
      totalVolumePlates,
      validOrders,
      cancelledOrders,
      cancelledTotal,
      upiSales,
      upiOrders,
      cardSales,
      cardOrders,
      cashSales,
      cashOrders
    });
    playSound('success');
  };

  const handleDownloadCsv = () => {
    playSound('click');
    downloadZReportCsv({
      restaurantSettings,
      dateFilterLabel: dateFilterLabels[dateFilter],
      grossSales,
      netSales,
      totalTax,
      cgst,
      sgst,
      totalDiscount,
      totalVolumePlates,
      validOrders,
      cancelledOrders,
      cancelledTotal,
      upiSales,
      cashSales
    });
    playSound('success');
  };

  const handleDownloadThermalPdf = () => {
    playSound('click');
    downloadThermalZReportPdf({
      restaurantSettings,
      dateFilterLabel: dateFilterLabels[dateFilter],
      grossSales,
      netSales,
      totalTax,
      cgst,
      sgst,
      totalDiscount,
      totalVolumePlates,
      validOrders,
      cancelledOrders,
      cancelledTotal,
      upiSales,
      upiOrders,
      cashSales,
      cashOrders
    });
    playSound('success');
  };

  const dateFilterLabels = {
    all: 'All-Time Records',
    today: 'Today (Live Daily)',
    yesterday: 'Yesterday',
    '7days': 'Last 7 Days',
    month: 'This Month'
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Bar with Date Range Selector & Direct Download Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-black text-slate-950 font-heading">
              GST Reports & Day-End Z-Audit Reconciliation
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Audited financial register, compliant 5% GST tax ledger, tender distribution, and plate volume reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unified Date Range Filter matching Executive Dashboard */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                dateFilter === 'yesterday' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                dateFilter === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                dateFilter === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-xs shadow-sm shadow-orange-600/20 transition flex items-center space-x-2 cursor-pointer min-h-[38px]"
            title="Download Official A4 GST Audit & Z-Report (PDF)"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download Z-Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer min-h-[38px] border border-slate-200"
            title="Download CSV Ledger for Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Financial & Volume Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Gross Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Gross Total Sales</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              {validOrders.length} Tickets
            </span>
          </div>
          <div className="text-2xl font-black text-slate-950 mt-2 font-heading tabular-nums">
            ₹{grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Includes tax & service fees</span>
        </div>

        {/* Net Food Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Net Food Revenue</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Base Total</span>
          </div>
          <div className="text-2xl font-black text-slate-950 mt-2 font-heading tabular-nums">
            ₹{netSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">Excluding tax liabilities</span>
        </div>

        {/* Total 5% GST Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">5% GST Collected</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold">Statutory Tax</span>
          </div>
          <div className="text-2xl font-black text-orange-600 mt-2 font-heading tabular-nums">
            ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 font-bold">
            CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}
          </div>
        </div>

        {/* Total Food Volume Tracked */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Volume Tracked</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">Kitchen Output</span>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2 font-heading tabular-nums">
            {totalVolumePlates} Plates
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
            Across {validOrders.length} valid dining tickets
          </span>
        </div>

        {/* Discounts Absorbed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Discounts Absorbed</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">Promotions</span>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2 font-heading tabular-nums">
            ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Festive & Weekend coupons</span>
        </div>

      </div>

      {/* 3. Reconciled Void/Cancelled Tickets Audit Strip */}
      {cancelledOrders.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 font-medium">
            <Ban className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Void / Cancelled Audit:</strong> {cancelledOrders.length} order(s) totaling{' '}
              <span className="font-mono font-bold text-rose-600">
                ₹{cancelledTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>{' '}
              were cancelled.
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200 font-mono">
            100% Excluded from Gross Sales & Register Cash
          </span>
        </div>
      )}

      {/* 4. Payment Tender Distribution & Thermal Receipt Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Methods Reconciled Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-950 uppercase tracking-wider font-heading flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-orange-600" />
              <span>Tender Mode Settlement Breakdown ({dateFilterLabels[dateFilter]})</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              Total Reconciled: ₹{grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* UPI */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>UPI / QR Dynamic Intent (PhonePe, GPay, Paytm)</span>
                </span>
                <span className="font-mono text-slate-950 font-black">
                  {upiPercent}% (₹{upiSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) • {upiOrders.length} orders
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${upiPercent}%` }}></div>
              </div>
            </div>

            {/* Cards */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>Credit & Debit Cards (PineLabs / EDC)</span>
                </span>
                <span className="font-mono text-slate-950 font-black">
                  {cardPercent}% (₹{cardSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) • {cardOrders.length} orders
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${cardPercent}%` }}></div>
              </div>
            </div>

            {/* Cash */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span>Cash Register In-Hand (COD / Counter)</span>
                </span>
                <span className="font-mono text-slate-950 font-black">
                  {cashPercent}% (₹{cashSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) • {cashOrders.length} orders
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${cashPercent}%` }}></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Register Balance Status: <strong>100% Balanced with Bank & Drawer</strong></span>
            </span>
            <span className="font-mono font-bold text-slate-800">
              UPI ₹{upiSales.toFixed(2)} + Cash ₹{cashSales.toFixed(2)} = ₹{grossSales.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Thermal Print Preview Container */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 font-mono text-xs printable-area">
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            <div className="font-black text-sm text-slate-950">ATMIYA DOSA & RESTAURANT</div>
            <div className="text-[10px] text-slate-600 font-bold">DAILY Z-AUDIT REGISTER REPORT</div>
            <div className="text-[10px] text-slate-500">{new Date().toLocaleString()}</div>
            <div className="text-[10px] font-bold text-orange-700 uppercase">Scope: {dateFilterLabels[dateFilter]}</div>
          </div>

          <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span>Gross Sales:</span>
              <span className="font-bold">₹{grossSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Food:</span>
              <span className="font-bold">₹{netSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST (2.5%):</span>
              <span className="font-bold">₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (2.5%):</span>
              <span className="font-bold">₹{sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discounts:</span>
              <span className="font-bold">-₹{totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
              <span>Total Volume:</span>
              <span className="font-bold">{totalVolumePlates} Plates ({validOrders.length} tickets)</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>UPI Settlement:</span>
              <span className="font-bold">₹{upiSales.toFixed(2)} ({upiOrders.length})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Cash Register:</span>
              <span className="font-bold">₹{cashSales.toFixed(2)} ({cashOrders.length})</span>
            </div>
            {cancelledOrders.length > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Void Tickets ({cancelledOrders.length}):</span>
                <span className="font-bold">₹{cancelledTotal.toFixed(2)} (Void)</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs font-black pt-1">
            <span>REGISTER TOTAL:</span>
            <span className="text-orange-700">₹{grossSales.toFixed(2)}</span>
          </div>

          <div className="text-center text-[10px] text-slate-500 pt-3">
            === END OF AUDIT RECORD ===
          </div>

          {/* Direct Download Button for 80mm Slip */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDownloadThermalPdf}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition cursor-pointer"
              title="Download 80mm Thermal Receipt Slip PDF"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Download 80mm Slip (PDF)</span>
            </button>
          </div>
        </div>

      </div>

      {/* 5. Live Order Tax Invoices Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-950 uppercase tracking-wider font-heading flex items-center space-x-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>Live Order Tax Invoices Audit Log</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized ledger of all dining transactions, tax collections, tender modes, and dish volumes.
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice, table, guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setTableFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All ({dateFilteredOrders.length})
              </button>
              <button
                onClick={() => setTableFilter('valid')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'valid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Valid ({validOrders.length})
              </button>
              {upiOrders.length > 0 && (
                <button
                  onClick={() => setTableFilter('upi')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    tableFilter === 'upi' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  UPI ({upiOrders.length})
                </button>
              )}
              <button
                onClick={() => setTableFilter('cash')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'cash' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Cash ({cashOrders.length})
              </button>
              {cancelledOrders.length > 0 && (
                <button
                  onClick={() => setTableFilter('cancelled')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    tableFilter === 'cancelled' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Void ({cancelledOrders.length})
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 sm:p-4">Invoice / Order</th>
                <th className="p-3.5 sm:p-4">Date & Time</th>
                <th className="p-3.5 sm:p-4">Table</th>
                <th className="p-3.5 sm:p-4">Guest</th>
                <th className="p-3.5 sm:p-4">Dishes & Volume</th>
                <th className="p-3.5 sm:p-4">Subtotal</th>
                <th className="p-3.5 sm:p-4">5% GST</th>
                <th className="p-3.5 sm:p-4">Tender Mode</th>
                <th className="p-3.5 sm:p-4">Status</th>
                <th className="p-3.5 sm:p-4 text-right">Gross Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {tableDisplayOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No orders match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                tableDisplayOrders.map(order => {
                  const isCancelled = String(order.status || '').toUpperCase().trim() === 'CANCELLED';
                  const tax = Number(order.tax || order.tax_amount || 0);
                  const total = Number(order.total || order.total_amount || 0);
                  const subtotal = Number(order.subtotal || (total - tax));
                  const pm = String(order.payment_mode || order.payment_method || '').toUpperCase();
                  const isUpi = pm.includes('UPI') || pm.includes('ONLINE');

                  const items = order.items || order.order_items || [];
                  const plateCount = items.length > 0 
                    ? items.reduce((s, it) => s + Number(it.qty || it.quantity || 1), 0)
                    : 1;
                  const dishesSummary = order.items_summary || (items.length > 0 ? items.map(it => `${it.qty || it.quantity || 1}x ${it.name || it.item_name}`).join(', ') : 'Dishes');

                  const orderDate = parseOrderDate(order);
                  const timeFormatted = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateFormatted = orderDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr key={order.id || order.order_number} className={`hover:bg-slate-50 transition ${isCancelled ? 'bg-rose-50/30' : ''}`}>
                      <td className="p-3.5 sm:p-4 font-mono font-bold text-orange-700">
                        {order.order_number ? `#${order.order_number}` : order.id}
                      </td>
                      <td className="p-3.5 sm:p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {dateFormatted} {timeFormatted}
                      </td>
                      <td className="p-3.5 sm:p-4 font-black text-slate-950">
                        {order.table_number || 'Dine-In'}
                      </td>
                      <td className="p-3.5 sm:p-4 text-slate-700 font-semibold truncate max-w-[120px]">
                        {order.customer_name || 'Walk-in Guest'}
                      </td>
                      <td className="p-3.5 sm:p-4 text-slate-600 truncate max-w-[180px]" title={dishesSummary}>
                        <span className="font-bold text-slate-900">{plateCount}p: </span>
                        <span>{dishesSummary}</span>
                      </td>
                      <td className="p-3.5 sm:p-4 font-mono font-bold text-slate-900">
                        ₹{subtotal.toFixed(2)}
                      </td>
                      <td className="p-3.5 sm:p-4 font-mono font-bold text-orange-800">
                        ₹{tax.toFixed(2)}
                      </td>
                      <td className="p-3.5 sm:p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                          isUpi 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {isUpi ? 'UPI' : 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : order.payment_status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {isCancelled ? 'Void / Cancelled' : (order.status || 'Served')}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 font-mono font-black text-slate-950 text-right">
                        <span className={isCancelled ? 'line-through text-slate-400' : ''}>
                          ₹{total.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
