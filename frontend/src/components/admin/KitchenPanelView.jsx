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
  X
} from 'lucide-react';
import { playSound } from '../../lib/sound';
import { getTranslation } from '../../lib/translations';
import { requestNotificationPermission, speakOrderAlert } from '../../lib/notifications';

export default function KitchenPanelView({ orders, onUpdateStatus, currentLang }) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stationFilter, setStationFilter] = useState('All');
  const [checkedItems, setCheckedItems] = useState({}); // { `${orderId}_${idx}`: true }
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });

  const t = (key) => getTranslation(currentLang, key);

  // Active cooking tickets vs completed tickets (Now includes PLACED orders so incoming orders show immediately!)
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
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & TELEMETRY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-heading shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black font-heading text-white tracking-tight">
                Kitchen Display System (KDS)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] font-mono border border-emerald-500/30">
                LIVE REAL-TIME SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Real-time digital ticket dispatch with instant voice alerts, table routing & mobile lock-screen push.
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mobile & Lock Screen Alerts Permission Button */}
          <button
            onClick={handleEnableNotifications}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition border ${
              notificationStatus === 'granted'
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-orange-500 text-white border-orange-400 hover:bg-orange-600 animate-bounce'
            }`}
            title="Enable lock-screen & background alerts when orders arrive"
          >
            <BellRing className="w-4 h-4" />
            <span>{notificationStatus === 'granted' ? '🔔 Phone Alerts Active' : '🔔 Enable Phone Alerts'}</span>
          </button>

          <button
            onClick={() => setShowRecallModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition border border-slate-700"
          >
            <History className="w-4 h-4 text-orange-400" />
            <span>Bumped ({bumpedOrders.length})</span>
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
              audioEnabled 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* 2. KITCHEN KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Active Kitchen Tickets</span>
          <div className="text-2xl font-black text-slate-900 font-heading mt-0.5">{activeOrders.length}</div>
          <span className="text-[10px] text-orange-600 font-semibold font-mono">Tawa In-Flight</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Avg Preparation Speed</span>
          <div className="text-2xl font-black text-emerald-600 font-heading mt-0.5 font-mono">8.4m</div>
          <span className="text-[10px] text-emerald-600 font-semibold font-mono">Target: &lt;12m</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Completed Today</span>
          <div className="text-2xl font-black text-slate-900 font-heading mt-0.5">{bumpedOrders.length + 28}</div>
          <span className="text-[10px] text-slate-400 font-semibold font-mono">Dishes Cleared</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-700 uppercase">Delayed (Over 15m)</span>
          <div className="text-2xl font-black text-rose-600 font-heading mt-0.5 font-mono">
            {activeOrders.filter(o => getElapsedMins(o.time, o.placed_at) > 15).length}
          </div>
          <span className="text-[10px] text-rose-600/80 font-bold">Priority Attention</span>
        </div>
      </div>

      {/* 3. STATION ROUTING TABS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['All', 'Dosa Tawa Station', 'Pav Bhaji & Pulao', 'Beverages & Extras'].map(station => (
          <button
            key={station}
            onClick={() => setStationFilter(station)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              stationFilter === station
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {station}
          </button>
        ))}
      </div>

      {/* 4. ACTIVE KITCHEN TICKETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.map(order => {
          const isPlaced = (order.status || '').toLowerCase() === 'placed';
          const elapsed = getElapsedMins(order.time, order.placed_at);
          const isUrgent = elapsed >= 15;
          const isModerate = elapsed >= 10 && elapsed < 15;
          const items = order.items || [];

          return (
            <div 
              key={order.id} 
              className={`bg-white rounded-3xl border-2 shadow-lg p-5 space-y-4 relative overflow-hidden flex flex-col justify-between transition-all ${
                isPlaced
                  ? 'border-orange-500 ring-4 ring-orange-500/20'
                  : isUrgent 
                    ? 'border-rose-400 ring-2 ring-rose-500/20' 
                    : isModerate 
                      ? 'border-amber-300' 
                      : 'border-slate-200'
              }`}
            >
              {/* Placed Alert Banner */}
              {isPlaced && (
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white font-black text-xs flex items-center justify-between shadow-md animate-pulse">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                    <span>🚨 NEW ORDER ARRIVED — START MAKING!</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">KOT Fired</span>
                </div>
              )}

              {/* Ticket Top Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-3 h-3 rounded-full ${isPlaced ? 'bg-orange-500 animate-ping' : isUrgent ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></span>
                  <span className="text-xl font-black text-slate-900 font-heading">
                    {order.table_number || 'Dine-In'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                    {order.channel || 'Dine-In'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-black text-slate-700 block">{order.id}</span>
                  <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                    isPlaced
                      ? 'bg-orange-100 text-orange-800 font-black'
                      : isUrgent 
                        ? 'bg-rose-100 text-rose-700 font-bold' 
                        : 'bg-slate-100 text-slate-500 font-semibold'
                  }`}>
                    {isPlaced ? '⚡ Just Arrived' : `⏱️ ${elapsed}m on tawa`}
                  </span>
                </div>
              </div>

              {/* Special Cooking Note if any */}
              {order.special_note && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Chef Note: {order.special_note}</span>
                </div>
              )}

              {/* Individual Item Check-off List */}
              <div className="space-y-2 flex-1">
                {items.map((item, idx) => {
                  const itemKey = `${order.id}_${idx}`;
                  const isChecked = checkedItems[itemKey];

                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleItemReady(order.id, idx)}
                      className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isChecked 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-60 line-through' 
                          : 'bg-slate-50 border-slate-200 hover:bg-orange-50/50 hover:border-orange-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                        }`}>
                          {item.qty}x
                        </span>
                        <span className="font-heading font-black text-xs truncate">
                          {item.name}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {isChecked ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-slate-300 hover:border-orange-500"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Bump Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Placed: {order.time || '11:30 AM'}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {isPlaced && (
                    <button
                      onClick={() => {
                        onUpdateStatus(order.id, 'Preparing');
                        playSound('order');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 flex items-center space-x-1 transition"
                    >
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleBumpOrder(order.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Bump (Mark Ready)</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-2xl font-bold">
            ✨
          </div>
          <h3 className="text-base font-black text-slate-800 font-heading">
            Tawa & Counter Clean! All Orders Cleared
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Kitchen queue is currently empty for station "{stationFilter}". New tickets from QR scans or POS orders will ring here automatically.
          </p>
        </div>
      )}

      {/* 5. RECALL BUMPED ORDERS MODAL */}
      {showRecallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Recently Bumped Kitchen Orders
                </h3>
              </div>
              <button 
                onClick={() => setShowRecallModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Need to remake or double-check a dish? Click "Recall to Tawa" to restore any bumped order back to the active KDS.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
              {bumpedOrders.map(order => (
                <div key={order.id} className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-heading font-black text-xs text-slate-900">
                        {order.table_number || 'Dine-In'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">({order.id})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">
                      {order.items_summary || order.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRecallOrder(order.id)}
                    className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center space-x-1 border border-orange-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Recall to Tawa</span>
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
