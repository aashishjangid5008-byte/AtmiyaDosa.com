import React, { useState } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Flame, 
  BellRing, 
  Volume2, 
  VolumeX,
  Check, 
  RotateCcw,
  AlertTriangle,
  History,
  Layers,
  Sparkles,
  UtensilsCrossed,
  Printer,
  X,
  CheckCheck
} from 'lucide-react';
import { playSound } from '../../lib/sound';
import { getTranslation } from '../../lib/translations';
import { requestNotificationPermission, speakOrderAlert } from '../../lib/notifications';

export default function KitchenPanelView({ 
  orders = [], 
  onUpdateStatus, 
  currentLang,
  theme = 'light'
}) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stationFilter, setStationFilter] = useState('All');
  const [checkedItems, setCheckedItems] = useState({}); // { `${orderId}_${idx}`: true }
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });

  const t = (key) => getTranslation(currentLang, key);

  // Theme palettes
  const isDark = theme === 'obsidian' || theme === 'sapphire';
  const isSapphire = theme === 'sapphire';
  const cardBg = isDark ? (isSapphire ? 'bg-slate-900/90' : 'bg-slate-900') : 'bg-white';
  const cardBorder = isDark ? (isSapphire ? 'border-sky-900/40' : 'border-slate-800') : 'border-slate-200/80';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Active cooking tickets vs completed tickets (Includes PLACED so incoming tickets ring immediately!)
  const activeOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'placed' || s === 'preparing' || s === 'cooking';
  });
  const bumpedOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'ready' || s === 'served' || s === 'completed';
  });

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      speakOrderAlert('Kitchen Alert Enabled');
      playSound('success');
    }
  };

  // Categorize order by kitchen station based on items
  const matchesStation = (order, station) => {
    if (station === 'All') return true;
    const items = order.items || [];
    if (station === 'Dosa Tawa Station') {
      return items.some(i => i.name.toLowerCase().includes('dosa') || i.name.toLowerCase().includes('uttapam'));
    }
    if (station === 'Pav Bhaji & Pulao') {
      return items.some(i => i.name.toLowerCase().includes('pav') || i.name.toLowerCase().includes('bhaji') || i.name.toLowerCase().includes('pulao'));
    }
    if (station === 'Beverages & Extras') {
      return items.some(i => i.name.toLowerCase().includes('chaas') || i.name.toLowerCase().includes('tea') || i.name.toLowerCase().includes('coffee') || i.name.toLowerCase().includes('water'));
    }
    return true;
  };

  const filteredOrders = activeOrders.filter(o => matchesStation(o, stationFilter));

  // Calculate elapsed prep minutes for urgent color coding
  const getElapsedMins = (timeStr, placedAt) => {
    if (placedAt) {
      const diff = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
      return Math.max(1, diff);
    }
    return 1;
  };

  const toggleItemReady = (orderId, idx) => {
    const key = `${orderId}_${idx}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    playSound('success');
  };

  const handleBumpOrder = (orderId) => {
    if (audioEnabled) playSound('success');
    onUpdateStatus(orderId, 'Ready');
  };

  const handleRecallOrder = (orderId) => {
    onUpdateStatus(orderId, 'Preparing');
    playSound('order');
    setShowRecallModal(false);
  };

  return (
    <div className="space-y-5">
      
      {/* 1. TOP HEADER & TELEMETRY */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-heading shadow-xs shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black font-heading text-white tracking-tight">
                Kitchen Display System (KDS)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] font-mono border border-emerald-500/30">
                LIVE KOT SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Real-time ticket bump bar with instant voice dispatch and station routing.
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mobile Phone Alerts Permission Button */}
          <button
            onClick={handleEnableNotifications}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition border cursor-pointer ${
              notificationStatus === 'granted'
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-orange-500 text-white border-orange-400 hover:bg-orange-600 shadow-xs'
            }`}
            title="Enable lock-screen & background push notifications when orders arrive"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{notificationStatus === 'granted' ? 'Alerts Active' : 'Enable Alerts'}</span>
          </button>

          <button
            onClick={() => setShowRecallModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition border border-slate-700 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-orange-400" />
            <span>Bumped ({bumpedOrders.length})</span>
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border cursor-pointer ${
              audioEnabled 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* 2. KITCHEN KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Kitchen Tickets</span>
          <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{activeOrders.length}</div>
          <span className="text-[10px] text-orange-500 font-medium font-mono">Tawa In-Flight</span>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Preparation Speed</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">8.4m</div>
          <span className="text-[10px] text-emerald-600/80 font-medium font-mono">Target: &lt;12m</span>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} shadow-xs`}>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Shift</span>
          <div className={`text-xl font-black ${textPrimary} font-mono mt-0.5`}>{bumpedOrders.length}</div>
          <span className="text-[10px] text-slate-500 font-semibold font-mono">Dishes Cleared</span>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border border-rose-200 shadow-xs`}>
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Over 15m Delayed</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-0.5">
            {activeOrders.filter(o => getElapsedMins(o.time, o.placed_at) > 15).length}
          </div>
          <span className="text-[10px] text-rose-600 font-semibold">Rush Priority</span>
        </div>
      </div>

      {/* 3. STATION ROUTING TABS */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        {['All', 'Dosa Tawa Station', 'Pav Bhaji & Pulao', 'Beverages & Extras'].map(station => (
          <button
            key={station}
            onClick={() => setStationFilter(station)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              stationFilter === station
                ? 'bg-orange-500 text-white shadow-xs'
                : `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50`
            }`}
          >
            {station}
          </button>
        ))}
      </div>

      {/* 4. ACTIVE KITCHEN TICKETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map(order => {
          const isPlaced = (order.status || '').toLowerCase() === 'placed';
          const elapsed = getElapsedMins(order.time, order.placed_at);
          const isUrgent = elapsed >= 15;
          const isModerate = elapsed >= 10 && elapsed < 15;
          const items = order.items || [];

          return (
            <div 
              key={order.id} 
              className={`${cardBg} rounded-2xl border-2 shadow-xs p-4 space-y-3.5 relative overflow-hidden flex flex-col justify-between transition-all ${
                isPlaced
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : isUrgent 
                    ? 'border-rose-400' 
                    : isModerate 
                      ? 'border-amber-300' 
                      : cardBorder
              }`}
            >
              {/* Placed Alert Banner */}
              {isPlaced && (
                <div className="p-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>NEW ORDER — TABLE {order.table_number || 'DINE-IN'}</span>
                  </div>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">KOT Fired</span>
                </div>
              )}

              {/* Ticket Top Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPlaced ? 'bg-orange-500 animate-ping' : isUrgent ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></span>
                  <span className={`text-lg font-black font-heading ${textPrimary}`}>
                    {order.table_number || 'Dine-In'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                    {order.order_source || order.channel || 'Dine-In'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-600 block">{order.id}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 border ${
                    isPlaced
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : isUrgent 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {isPlaced ? 'Just Arrived' : `${elapsed}m active`}
                  </span>
                </div>
              </div>

              {/* Special Cooking Note if any */}
              {order.special_note && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Note: {order.special_note}</span>
                </div>
              )}

              {/* Individual Item Check-off List */}
              <div className="space-y-1.5 flex-1">
                {items.map((item, idx) => {
                  const itemKey = `${order.id}_${idx}`;
                  const isChecked = checkedItems[itemKey];

                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleItemReady(order.id, idx)}
                      className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isChecked 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 opacity-60 line-through' 
                          : 'bg-slate-50 border-slate-200 hover:border-orange-300 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className={`w-5 h-5 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                        }`}>
                          {item.qty}x
                        </span>
                        <span className="font-heading font-bold text-xs truncate text-slate-900">
                          {item.name}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {isChecked ? (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 hover:border-orange-500"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Bump Bar */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{order.time || 'Now'}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {isPlaced && (
                    <button
                      onClick={() => {
                        onUpdateStatus(order.id, 'Preparing');
                        playSound('order');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Flame className="w-3 h-3 fill-current" />
                      <span>Start</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleBumpOrder(order.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Bump (Ready)</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className={`p-12 rounded-2xl ${cardBg} border ${cardBorder} text-center space-y-2.5 shadow-xs`}>
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className={`text-sm font-bold ${textPrimary} font-heading`}>
            All Orders Cleared
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Kitchen queue is currently clear for station "{stationFilter}". New incoming orders from QR scans or POS orders will fire here in real time.
          </p>
        </div>
      )}

      {/* 5. RECALL BUMPED ORDERS MODAL */}
      {showRecallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className={`${cardBg} rounded-2xl p-5 max-w-md w-full border ${cardBorder} shadow-2xl space-y-3.5`}>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-orange-500" />
                <h3 className={`text-sm font-bold ${textPrimary} font-heading`}>
                  Recently Bumped Kitchen Orders
                </h3>
              </div>
              <button 
                onClick={() => setShowRecallModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Restore any bumped order back to the active kitchen queue.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {bumpedOrders.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4 font-medium">No recently bumped orders.</div>
              ) : (
                bumpedOrders.map(order => (
                  <div key={order.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-heading font-bold text-xs ${textPrimary}`}>
                          {order.table_number || 'Dine-In'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">({order.id})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate max-w-xs font-medium">
                        {order.items_summary || order.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRecallOrder(order.id)}
                      className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] flex items-center space-x-1 border border-orange-200 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Recall</span>
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
