import React from 'react';
import { BellRing, Check, GlassWater, CreditCard, UserCheck } from 'lucide-react';

export default function WaiterCenter({ waiterCalls, onClearCall }) {
  const pendingCalls = waiterCalls.filter(w => w.status === 'pending');

  return (
    <div className="space-y-6 glass-panel p-6 rounded-3xl border border-slate-800 animate-slide-up">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-400" />
            Guest Service & Waiter Alert Hub
          </h2>
          <p className="text-xs text-slate-400">Live requests from dining room table QR codes.</p>
        </div>

        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-mono text-xs font-bold">
          {pendingCalls.length} Pending Requests
        </span>
      </div>

      {pendingCalls.length === 0 ? (
        <div className="text-center py-12 text-slate-500 space-y-2">
          <UserCheck className="w-12 h-12 mx-auto text-slate-700" />
          <p className="text-sm font-semibold">All guest requests have been attended to!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingCalls.map(call => (
            <div key={call.id} className="p-4 rounded-2xl bg-white border-2 border-amber-400 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xl font-black text-slate-900">{call.table_number}</span>
                <p className="text-xs text-amber-700 uppercase font-black tracking-wider mt-0.5">
                  Request: {call.request_type}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <button
                onClick={() => onClearCall(call.id)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Attend
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
