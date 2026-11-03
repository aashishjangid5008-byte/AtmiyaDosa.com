import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Copy, 
  Lock, 
  Search, 
  Layers, 
  CheckCircle2, 
  UtensilsCrossed,
  Globe,
  Cloud,
  ShieldCheck,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { playSound } from '../../lib/sound';
import { generateTableSecurityKey, getTableQrUrl, getActiveQrBaseUrl, isPrivateOrLocalAddress } from '../../lib/security';

export default function QRManagementView({ tables = [], orders = [], restaurantSettings, currentLang }) {
  const [activeTable, setActiveTable] = useState(() => tables[0] || { number: 'T01', zone: 'Main Hall', capacity: 4 });
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const t = (key) => getTranslation(currentLang, key);

  // Canonical base URL: dynamically adapts to deployed Cloud Run domain or configured production domain
  const baseUrl = useMemo(() => {
    return getActiveQrBaseUrl(restaurantSettings?.productionDomain);
  }, [restaurantSettings?.productionDomain]);

  // Real guest-facing URL that includes security cryptographic signature
  const tableUrl = useMemo(() => {
    return getTableQrUrl(activeTable.number, baseUrl);
  }, [activeTable.number, baseUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopiedLink(true);
    playSound('success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // High-Resolution PNG Download of Standee QR Code
  const handleDownloadQR = (targetTbl = null) => {
    try {
      const tblToUse = targetTbl || activeTable;
      const svg = document.getElementById(`qr-standee-svg-${tblToUse.number}`);
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 600;
        canvas.height = 600;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 600, 600);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `Atmiya_Table_${tblToUse.number}_QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        playSound('success');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error('QR download failed:', e);
    }
  };

  // High-Resolution Acrylic Standee Card PNG Image Generator
  const handleDownloadStandeeCard = (targetTbl = null) => {
    try {
      const tblToUse = targetTbl || activeTable;
      const svg = document.getElementById(`qr-standee-svg-${tblToUse.number}`);
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const W = 800;
      const H = 1140;
      canvas.width = W;
      canvas.height = H;

      const img = new Image();
      img.onload = () => {
        // 1. Crisp white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // 2. Outer decorative acrylic border
        ctx.strokeStyle = '#fed7aa'; // amber-200
        ctx.lineWidth = 6;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(24, 24, W - 48, H - 48, 40);
          ctx.stroke();
        } else {
          ctx.strokeRect(24, 24, W - 48, H - 48);
        }

        // 3. Top Header Capsule: "TOUCHLESS TABLE ORDERING"
        const grad = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
        grad.addColorStop(0, '#ea580c');
        grad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad;

        const capW = 320;
        const capH = 44;
        const capX = (W - capW) / 2;
        const capY = 65;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(capX, capY, capW, capH, 22);
          ctx.fill();
        } else {
          ctx.fillRect(capX, capY, capW, capH);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TOUCHLESS TABLE ORDERING', W / 2, capY + capH / 2);

        // 4. Restaurant Name & Tagline
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(restaurantName, W / 2, 165);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(tagline, W / 2, 208);

        // 5. QR Code Box with dashed border
        const qrBoxSize = 440;
        const qrBoxX = (W - qrBoxSize) / 2;
        const qrBoxY = 250;

        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
          ctx.stroke();
        } else {
          ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
        }
        ctx.setLineDash([]); // Reset dash

        // Draw QR Image inside the frame
        const qrPad = 25;
        ctx.drawImage(img, qrBoxX + qrPad, qrBoxY + qrPad, qrBoxSize - qrPad * 2, qrBoxSize - qrPad * 2);

        // 6. Table Number Emblem
        const tblCapW = 300;
        const tblCapH = 64;
        const tblCapX = (W - tblCapW) / 2;
        const tblCapY = 735;
        ctx.fillStyle = '#fff7ed';
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 2.5;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(tblCapX, tblCapY, tblCapW, tblCapH, 18);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(tblCapX, tblCapY, tblCapW, tblCapH);
        }
        ctx.fillStyle = '#431407';
        ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`TABLE ${tblToUse.number}`, W / 2, tblCapY + tblCapH / 2);

        // 7. Instructions
        ctx.fillStyle = '#ea580c';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Scan with Phone Camera to View Menu & Order', W / 2, 845);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Zero App Download • Instant Mobile Ordering', W / 2, 885);

        // 8. Divider & Footer
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(90, 950);
        ctx.lineTo(W - 90, 950);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Pure Veg Kitchen • Clean & Hygienic • Cloud POS Powered', W / 2, 990);

        // 9. Trigger instant PNG download
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `Atmiya_Table_${tblToUse.number}_Standee.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        playSound('success');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error('Standee card download failed:', e);
    }
  };

  // Sequential Batch PNG Downloader for All Tables (Guaranteed Zero Blank Pages!)
  const handleDownloadAllStandees = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    playSound('click');
    const originalTable = activeTable;
    for (let i = 0; i < tables.length; i++) {
      const tbl = tables[i];
      setActiveTable(tbl);
      await new Promise(r => setTimeout(r, 260));
      handleDownloadStandeeCard(tbl);
    }
    setActiveTable(originalTable);
    setIsDownloadingAll(false);
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

  // Filter tables by Search query (direct table verification by number)
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase().trim();
    return tables.filter(tbl => 
      tbl.number.toLowerCase().includes(q) || 
      (tbl.zone || '').toLowerCase().includes(q)
    );
  }, [tables, searchQuery]);

  // Compute overall table status counts
  const tableStats = useMemo(() => {
    let busyCount = 0;
    tables.forEach(t => {
      if (getActiveOrderForTable(t.number)) busyCount++;
    });
    return {
      total: tables.length,
      busy: busyCount,
      available: Math.max(0, tables.length - busyCount)
    };
  }, [tables, orders]);

  const restaurantName = restaurantSettings?.restaurantName || 'Atmiya Dosa Hub';
  const tagline = restaurantSettings?.tagline || 'Pure Veg Authentic Taste • Petlad';

  return (
    <div className="space-y-5 pb-10">
      
      {/* 1. COMPACT TOP HEADER & QUICK ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-slate-900 font-heading">
              {t('qrManagement')} & Digital Table Standees
            </h2>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
              Touchless Dining
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real dynamic QR codes for table-side touchless mobile ordering without login barriers.
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-slate-500 text-[11px] font-medium">QR Domain:</span>
              <span className="font-mono text-slate-800 font-bold text-[11px] truncate max-w-[220px] sm:max-w-none">{baseUrl}</span>
            </div>
            {typeof window !== 'undefined' && !isPrivateOrLocalAddress(window.location.hostname) ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Cloud Run</span>
              </span>
            ) : (
              restaurantSettings?.productionDomain && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Custom Domain Active
                </span>
              )
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownloadQR(activeTable)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center space-x-1.5 border border-slate-200 cursor-pointer active:scale-95"
            title="Download QR code image as PNG"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-600" />
            <span>Download QR PNG</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAllStandees}
            disabled={isDownloadingAll}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 border cursor-pointer active:scale-95 ${
              isDownloadingAll
                ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
            title="Download Standee PNGs for all tables at once"
          >
            {isDownloadingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                <span>Saving All ({tables.length})...</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Download All Standees ({tables.length})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownloadStandeeCard(activeTable)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Save acrylic table standee card as high-resolution PNG image"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Save Standee Image (PNG)</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: TABLE SELECTOR & ACRYLIC STANDEE DESIGNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Ergonomic Dining Table Selector (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-[400px] sm:h-[480px] lg:h-[600px]">
          
          {/* Header & Direct Table Verification */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-heading flex items-center space-x-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
                <span>Verify by Table Number</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                {tableStats.available} Open • {tableStats.busy} Busy
              </span>
            </div>

            {/* Quick Table Search / Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find table number (e.g. T01, T08)..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Table Grid with Zero Cutoffs */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {filteredTables.map(table => {
                const tblActiveOrder = getActiveOrderForTable(table.number);
                const isSelected = activeTable.number === table.number;

                return (
                  <button
                    key={table.id || table.number}
                    onClick={() => {
                      setActiveTable(table);
                      playSound('click');
                    }}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm shadow-orange-500/20'
                        : (tblActiveOrder 
                            ? 'bg-amber-50/70 border-amber-300 text-slate-800 hover:bg-amber-100/60' 
                            : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-white hover:border-orange-300 hover:shadow-xs')
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-base font-black font-heading ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {table.number}
                      </span>
                      {tblActiveOrder ? (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          isSelected ? 'bg-white text-orange-700' : 'bg-amber-200 text-amber-900'
                        }`}>
                          🔒 Busy
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          ✨ Open
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className={`font-medium truncate ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                        {table.zone || 'Dining Area'}
                      </span>
                      <span className={`font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {table.capacity || 4}p
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400">
                No dining tables match your search.
              </div>
            )}
          </div>

          {/* Bottom Table Selector Summary */}
          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {filteredTables.length} of {tables.length} tables</span>
            <span className="font-bold text-orange-600">Click any table to preview standee</span>
          </div>

        </div>

        {/* Right Column: Acrylic Table Standee Showcase (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-b from-orange-50/30 to-slate-100/70 p-4 sm:p-6 lg:p-8 rounded-2xl border border-orange-200/70 shadow-xs flex flex-col items-center justify-center relative min-h-[480px] lg:min-h-[600px]">
          
          {/* Top Standee Meta Tag */}
          <div className="w-full flex items-center justify-between mb-4 max-w-sm">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Acrylic Standee Preview</span>
            </span>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 border shadow-2xs ${
              activeOrderForCurrentTable 
                ? 'bg-amber-50 text-amber-900 border-amber-300' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}>
              {activeOrderForCurrentTable ? (
                <>
                  <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                  <span>Table {activeTable.number}: Busy</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Table {activeTable.number}: Open & Ready</span>
                </>
              )}
            </div>
          </div>

          {/* PRINTABLE ACRYLIC STANDEE CARD */}
          <div className="printable-area w-full flex justify-center">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-[340px] w-full border-2 border-orange-200/90 shadow-xl shadow-orange-500/10 text-center space-y-4 relative">
              
              {/* Dynamic Table State Indicator */}
              {activeOrderForCurrentTable && (
                <div className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-bold flex items-center space-x-1 shadow-xs no-print">
                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                  <span>In-Use</span>
                </div>
              )}

              {/* Restaurant Header */}
              <div className="space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                  Touchless Table Ordering
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-heading pt-1">
                  {restaurantName}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {tagline}
                </p>
              </div>

              {/* High-Resolution QR Code Frame */}
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-orange-200 inline-block shadow-sm">
                <QRCodeSVG 
                  id={`qr-standee-svg-${activeTable.number}`}
                  value={tableUrl} 
                  size={190}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>

              {/* Table Identification & Clear Instruction */}
              <div className="space-y-2">
                <div className="text-xl font-black text-slate-950 font-heading bg-orange-50/80 py-1.5 px-5 rounded-xl inline-block border border-orange-200/90 text-orange-950">
                  TABLE {activeTable.number}
                </div>
                
                <p className="text-xs font-black text-orange-600">
                  Scan with Phone Camera to View Menu & Order
                </p>

                <p className="text-[10px] text-slate-400 font-medium">
                  Zero App Download • Instant Mobile Ordering
                </p>
              </div>

              {/* Standee Footer */}
              <div className="text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                Pure Veg Kitchen • Clean & Hygienic • Cloud POS Powered
              </div>

            </div>
          </div>

          {/* Standee Base Effect (Visual Delight for Owner) */}
          <div className="h-2.5 w-44 rounded-full bg-gradient-to-r from-slate-200 via-orange-100 to-slate-200 border border-slate-300 shadow-md mx-auto -mt-1 opacity-90 no-print" />

          {/* Bottom Standee Helper Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadStandeeCard(activeTable)}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Save full acrylic table standee card as high-resolution PNG image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Standee Image (PNG)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadQR(activeTable)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Download standalone high-resolution QR code PNG"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600" />
              <span>Download High-Res QR</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Copy Table QR Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>

            <a
              href={tableUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Open customer menu in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Test Live Menu</span>
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}
