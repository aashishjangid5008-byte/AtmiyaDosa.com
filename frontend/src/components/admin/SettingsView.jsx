import React, { useState } from 'react';
import { Settings, Save, Building2, Phone, MapPin, Receipt, Globe, Check, Cloud, QrCode, ShieldCheck } from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { isPrivateOrLocalAddress, setProductionDomain } from '../../lib/security';

export default function SettingsView({ restaurantSettings, onSaveSettings, currentLang, onLanguageChange }) {
  const [form, setForm] = useState({ ...restaurantSettings });
  const [saved, setSaved] = useState(false);

  const t = (key) => getTranslation(currentLang, key);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.productionDomain) {
      setProductionDomain(form.productionDomain);
    } else {
      setProductionDomain(null);
    }
    onSaveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-black text-slate-900 font-heading">
              Restaurant System Settings
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Universal configuration for restaurant profile, tax compliance, receipts, and default language.
          </p>
        </div>

        {saved && (
          <div className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center space-x-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings Successfully Saved!</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant Trade Name</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={form.restaurantName}
                onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
            <span className="text-[10px] text-slate-400">Used universally across the admin panel, customer menu, and printed tax bills.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tagline & Cuisine Type</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
              <div className="relative">
                <Receipt className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold uppercase focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant Physical Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="₹">Indian Rupee (₹)</option>
                <option value="$">US Dollar ($)</option>
                <option value="€">Euro (€)</option>
                <option value="£">British Pound (£)</option>
                <option value="AED">UAE Dirham (AED)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default System Language</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={currentLang}
                  onChange={(e) => {
                    onLanguageChange(e.target.value);
                    setForm({ ...form, language: e.target.value });
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="en">English (UK/US)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
            </div>
          </div>

          {/* Direct UPI Payment Gateway Configuration (0% Fees / Direct to Bank) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 mb-4">
              <div className="flex items-center space-x-2 text-orange-950 font-bold text-xs">
                <Receipt className="w-4 h-4 text-orange-600" />
                <span>Direct UPI Settlement (Zero Commission & Direct Bank Deposit)</span>
              </div>
              <p className="text-[11px] text-orange-800 mt-1">
                Enter your real business or personal UPI ID. When customers scan the table QR via Google Pay, PhonePe, or Paytm, money is deposited 100% directly into your bank account with ₹0 gateway fee.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant UPI ID (VPA)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. atmiyadosa@icici or 9825014820@paytm"
                  value={form.upiId || ''}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Your linked Google Pay, PhonePe, or BHIM VPA</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Payee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Atmiya Dosa Hub"
                  value={form.payeeName || ''}
                  onChange={(e) => setForm({ ...form, payeeName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Name verified on customer UPI app during payment</span>
              </div>
            </div>
          </div>

          {/* Google Cloud Run & Online Public Deployment (Dynamic QR Code Base) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 mb-4">
              <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs">
                <Cloud className="w-4 h-4 text-indigo-600" />
                <span>Google Cloud Run & Online QR Code Deployment</span>
              </div>
              <p className="text-[11px] text-indigo-800 mt-1">
                When deployed to Google Cloud Run, table QR codes automatically adapt to your live public URL. If you want QR standees printed from this computer to point to your live online domain in advance, enter your Cloud Run URL below.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Public Production URL / Cloud Run Domain</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional • Auto-detects in production</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  placeholder="e.g. https://atmiya-pos-XXXXX.a.run.app or https://menu.atmiyadosa.com"
                  value={form.productionDomain || ''}
                  onChange={(e) => setForm({ ...form, productionDomain: e.target.value.trim() })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="mt-2 text-[11px]">
                {typeof window !== 'undefined' && !isPrivateOrLocalAddress(window.location.hostname) ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Online Detected: {window.location.origin} (QR codes dynamically use this URL)</span>
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {form.productionDomain ? (
                      <span className="text-indigo-700 font-bold">QR codes will point to: {form.productionDomain}</span>
                    ) : (
                      <span>Currently on local dev. When left empty, QR codes automatically link to {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save System Changes</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
