import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Download, ExternalLink, Sparkles, Check, Copy, Wifi, Smartphone, Globe, Lock } from 'lucide-react';
import { getTranslation } from '../../lib/translations';

export default function QRManagementView({ tables, orders = [], restaurantSettings, currentLang }) {
  const [activeTable, setActiveTable] = useState(tables[0] || { number: 'T01' });
  const [copied, setCopied] = useState(false);

  const t = (key) => getTranslation(currentLang, key);

  // Network IP detection: default to local Wi-Fi IP so phone camera scans actually connect!
  const detectedWifiUrl = 'http://10.82.223.138:5173';
  const defaultHost = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? detectedWifiUrl
    : (typeof window !== 'undefined' ? window.location.origin : detectedWifiUrl);

  const [baseUrl, setBaseUrl] = useState(() => {
    try {
      return localStorage.getItem('qr_base_url') || defaultHost;
    } catch {
      return defaultHost;
    }
  });

  const handleSetBaseUrl = (newUrl) => {
    setBaseUrl(newUrl);
    try {
      localStorage.setItem('qr_base_url', newUrl);
    } catch {}
  };

  // Real URL that bypasses the login wall for the guest
  const tableUrl = `${baseUrl.replace(/\/+$/, '')}/?table=${activeTable.number}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Anti-Duplicate Table QR Lock Matchers
  const normalizeTable = (val) => {
    if (!val) return '';
    const digits = String(val).replace(/[^0-9]/g, '');
    if (digits) return String(parseInt(digits, 10));
    return String(val).trim().toLowerCase();
  };

  const isTableMatch = (t1, t2) => normalizeTable(t1) === normalizeTable(t2);

  const isOrderActive = (order) => {
    if (!order) return false;
    const st = String(order.status || '').toLowerCase().trim();
    return st !== 'completed' && st !== 'cancelled' && st !== 'settled' && st !== 'paid_out';
  };

  const getActiveOrderForTable = (tableNumber) => {
    return orders.find(o => isTableMatch(o.table_number, tableNumber) && isOrderActive(o));
  };

  const activeOrderForCurrentTable = getActiveOrderForTable(activeTable.number);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-black text-slate-900 font-heading">
              {t('qrManagement')} & Digital Table Standees
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real dynamic QR codes for table-side touchless mobile ordering without login barriers.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print Table Standee</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-heading">
            Select Dining Table
          </h3>

          <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
            {tables.map(table => {
              const tblActiveOrder = getActiveOrderForTable(table.number);
              const isSelected = activeTable.number === table.number;
              return (
                <button
                  key={table.id}
                  onClick={() => setActiveTable(table)}
                  className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : (tblActiveOrder 
                          ? 'bg-amber-50/60 border-amber-200 text-slate-800 hover:bg-amber-50' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-1.5 overflow-hidden">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-sm sm:text-base font-black font-heading truncate">{table.number}</span>
                      {tblActiveOrder && (
                        <span className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-200 text-amber-900'
                        }`}>
                          🔒 Busy
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] font-medium truncate block w-full ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {tblActiveOrder ? `#${tblActiveOrder.id} (${tblActiveOrder.status})` : `${table.zone} • Open`}
                    </div>
                  </div>
                  <QrCode className={`w-4 h-4 shrink-0 ${isSelected ? 'opacity-90' : 'opacity-40'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Real QR Preview & Standee Designer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Host Mode Selector for Localhost vs Wi-Fi Network */}
          <div className="bg-orange-50/80 border border-orange-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="font-bold text-slate-800">QR Scan Target:</span>
              <span className="text-[11px] text-slate-600">
                For phones scanning from same Wi-Fi, use Wi-Fi IP (<code className="bg-white px-1.5 py-0.5 rounded border border-orange-200 font-bold text-orange-700">10.82.223.138:5173</code>)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSetBaseUrl('http://10.82.223.138:5173')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center space-x-1 ${
                  baseUrl.includes('10.82.223.138')
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Wi-Fi Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetBaseUrl(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center space-x-1 ${
                  !baseUrl.includes('10.82.223.138')
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Current Host</span>
              </button>
            </div>
          </div>

          {/* URL & Quick Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 truncate w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">Live URL:</span>
              <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg truncate border border-orange-200/80">
                {tableUrl}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1 border border-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <a
                href={tableUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center space-x-1 border border-orange-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live QR Menu</span>
              </a>
            </div>
          </div>

          {/* Real-Time Table QR Lock & Availability Status */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
            activeOrderForCurrentTable 
              ? 'bg-amber-50/90 border-amber-300 text-amber-950' 
              : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-start sm:items-center space-x-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                activeOrderForCurrentTable ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {activeOrderForCurrentTable ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-sm font-heading">
                    Table {activeTable.number}: {activeOrderForCurrentTable ? 'QR In-Use & Locked' : 'QR Open & Available'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    activeOrderForCurrentTable 
                      ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                      : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                  }`}>
                    {activeOrderForCurrentTable ? (activeOrderForCurrentTable.status || 'Cooking') : 'Ready for Guest'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                  {activeOrderForCurrentTable ? (
                    <>Order <span className="font-mono font-bold text-slate-900">#{activeOrderForCurrentTable.id}</span> is actively in the kitchen queue. Second orders from this table are blocked until settled.</>
                  ) : (
                    <>No active orders on this table. Walk-in guests can scan the QR code to open the digital menu and place an order.</>
                  )}
                </p>
              </div>
            </div>

            {activeOrderForCurrentTable && (
              <div className="text-right shrink-0">
                <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wider">Ticket Total</span>
                <span className="font-mono font-black text-sm text-slate-900">₹{activeOrderForCurrentTable.total || activeOrderForCurrentTable.total_amount}</span>
              </div>
            )}
          </div>

          {/* Printable Acrylic Standee Card Preview */}
          <div className="bg-slate-100 p-8 rounded-3xl border border-slate-200 flex justify-center printable-area">
            
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full border-4 border-slate-900 shadow-2xl text-center space-y-5 relative">
              
              {/* Dynamic Table State Indicator */}
              {activeOrderForCurrentTable && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-bold flex items-center space-x-1 shadow-xs">
                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                  <span>In-Use</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                  Touchless Dining
                </div>
                <h3 className="text-2xl font-black text-slate-950 font-heading">
                  {restaurantSettings?.restaurantName || 'Atmiya Dosa'}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {restaurantSettings?.tagline || 'Pure Veg • Authentic Taste'}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
                <QRCodeSVG 
                  value={tableUrl} 
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xl font-black text-slate-950 font-heading bg-slate-100 py-1.5 px-4 rounded-xl inline-block border border-slate-200">
                  TABLE {activeTable.number}
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

        </div>

      </div>

    </div>
  );
}
