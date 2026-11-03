import React, { useState } from 'react';
import { 
  Users, 
  Star, 
  Award, 
  Phone, 
  Search, 
  Gift, 
  Send, 
  Sparkles, 
  Utensils, 
  Calendar, 
  IndianRupee, 
  Plus, 
  X, 
  History, 
  Check, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { playSound } from '../../lib/sound';

export default function CustomerCRM({ 
  customers = [], 
  onAddPoints,
  onSaveCustomer,
  restaurantSettings = {}
}) {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    last_table: 'T01',
    favorite_dish: 'Mysore Masala Dosa'
  });

  const restaurantName = restaurantSettings?.restaurantName || 'Atmiya Dosa Hub (આત્મીય ઢોસા હબ)';

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) || 
      (c.phone && c.phone.includes(search)) ||
      (c.last_table && c.last_table.toLowerCase().includes(search.toLowerCase()));
    const matchesTier = selectedTier === 'All' || c.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  // Calculate CRM KPIs
  const totalGuests = customers.length;
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
  const totalPoints = customers.reduce((sum, c) => sum + (Number(c.loyalty_points) || 0), 0);
  const vipCount = customers.filter(c => c.tier === 'VIP Platinum' || c.tier === 'VIP Gold').length;

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'VIP Platinum':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-600 text-white border border-purple-500 shadow-sm flex items-center space-x-1 inline-flex">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Platinum VIP</span>
          </span>
        );
      case 'VIP Gold':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-400 flex items-center space-x-1 inline-flex">
            <Star className="w-3 h-3 text-amber-600" />
            <span>Gold VIP</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300 inline-flex">
            Silver Member
          </span>
        );
    }
  };

  const handleSendWhatsApp = (customer) => {
    const cleanPhone = String(customer.phone).replace(/[^0-9]/g, '').slice(-10);
    const msg = `Namaste ${customer.name}! Greetings from ${restaurantName}, Petlad.\n\nThank you for dining with us at ${customer.last_table || 'our restaurant'}. You have ${customer.loyalty_points || 0} loyalty reward points waiting in your account.\n\nUse promo code WELCOME50 on your next visit to get ₹50 OFF, or enjoy our signature Mysore Masala Dosa! We look forward to serving you again.`;
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCreateCustomer = (e) => {
    e.preventDefault();
    if (!newCustomerForm.phone || newCustomerForm.phone.replace(/[^0-9]/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (onSaveCustomer) {
      onSaveCustomer({
        name: newCustomerForm.name || `Guest ${newCustomerForm.phone.slice(-4)}`,
        phone: newCustomerForm.phone,
        tableNumber: newCustomerForm.last_table || 'T01',
        orderId: `#MANUAL_${Date.now()}`,
        orderTotal: 0,
        items: [{ name: newCustomerForm.favorite_dish || 'Mysore Masala Dosa' }],
        paymentMode: 'Cash'
      });
    }

    playSound('success');
    setShowAddCustomerModal(false);
    setNewCustomerForm({ name: '', phone: '', last_table: 'T01', favorite_dish: 'Mysore Masala Dosa' });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 font-heading">
                  Permanent Customer CRM & Guest Relations
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Active CRM
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Long-term customer retention, visit history, table relations, lifetime spend tracking, and WhatsApp promotions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone, name, table..."
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-amber-500 w-60 shadow-xs"
            />
          </div>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Registered Guests</span>
            <div className="text-2xl font-black font-heading text-slate-900 mt-0.5">{totalGuests}</div>
            <span className="text-[10px] text-slate-400 font-semibold">Permanent Database</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            👥
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Lifetime Spend</span>
            <div className="text-2xl font-black font-heading text-emerald-600 mt-0.5">₹{totalLifetimeSpend.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-emerald-600/80 font-bold">Cumulative Dine-In</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase">VIP Loyalty Club</span>
            <div className="text-2xl font-black font-heading text-amber-600 mt-0.5">{vipCount} Members</div>
            <span className="text-[10px] text-amber-600/80 font-bold">Gold & Platinum</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            👑
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-orange-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-orange-700 uppercase">Reward Points</span>
            <div className="text-2xl font-black font-heading text-orange-600 mt-0.5">{totalPoints} Pts</div>
            <span className="text-[10px] text-orange-600/80 font-bold">In Circulation</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            💎
          </div>
        </div>
      </div>

      {/* 3. Guest Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5">
            {['All', 'VIP Platinum', 'VIP Gold', 'Silver Member'].map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedTier === tier 
                    ? 'bg-orange-500 text-white shadow-xs font-black' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-bold">
            Showing {filteredCustomers.length} of {customers.length} registered diners
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Customer Name & Table</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Loyalty Tier</th>
                <th className="p-4">Visits</th>
                <th className="p-4">Lifetime Spent</th>
                <th className="p-4">Points Balance</th>
                <th className="p-4">Favorite Dish</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <tr key={`${customer.id || customer.phone || 'cust'}-${idx}`} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <div className="font-black text-slate-950 font-heading text-sm">
                        {customer.name}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-900 text-[10px] font-mono font-bold">
                          {customer.last_table ? `Table ${customer.last_table.replace('Table ', '')}` : 'Table T01'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {customer.last_visit || 'Recently'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <span>+91 {customer.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {getTierBadge(customer.tier)}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                        {customer.visits} Visits
                      </span>
                    </td>
                    <td className="p-4 font-mono font-black text-slate-950 text-sm">
                      ₹{Number(customer.total_spent || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 font-mono font-black text-amber-700">
                      💎 {customer.loyalty_points || 0} Pts
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      <span className="truncate max-w-[140px] block" title={customer.favorite_dish || 'Mysore Masala Dosa'}>
                        {customer.favorite_dish || 'Mysore Masala Dosa'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* View History */}
                      <button
                        onClick={() => setSelectedCustomerHistory(customer)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center space-x-1"
                        title="View visit history"
                      >
                        <History className="w-3 h-3" />
                        <span>History</span>
                      </button>

                      {/* Add Points */}
                      <button
                        onClick={() => onAddPoints(customer.id, 100)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] shadow-xs inline-flex items-center space-x-1"
                        title="Award +100 Loyalty Points"
                      >
                        <Gift className="w-3 h-3" />
                        <span>+100</span>
                      </button>

                      {/* WhatsApp Offer */}
                      <button
                        onClick={() => handleSendWhatsApp(customer)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-xs inline-flex items-center space-x-1"
                        title="Send personalized WhatsApp coupon"
                      >
                        <Send className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Customer History Drawer / Modal */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  {selectedCustomerHistory.name} - Order History
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500">
                  +91 {selectedCustomerHistory.phone} • {selectedCustomerHistory.tier}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomerHistory(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visit Stats */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">TOTAL VISITS</span>
                <span className="font-mono font-black text-slate-900 text-sm">{selectedCustomerHistory.visits}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">LIFETIME SPENT</span>
                <span className="font-mono font-black text-emerald-600 text-sm">₹{Number(selectedCustomerHistory.total_spent || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">REWARD POINTS</span>
                <span className="font-mono font-black text-amber-700 text-sm">{selectedCustomerHistory.loyalty_points || 0}</span>
              </div>
            </div>

            {/* Past Visits List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-black text-slate-700 font-heading">Recorded Table Sessions:</h4>
              {(selectedCustomerHistory.history && selectedCustomerHistory.history.length > 0) ? (
                selectedCustomerHistory.history.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{h.order_id || `#ORD${1000 + i}`}</span>
                        <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-900 text-[10px] font-bold">
                          Table {h.table || selectedCustomerHistory.last_table || 'T01'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[240px]">
                        {h.items_summary || 'Mysore Masala Dosa, Cold Drink'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-slate-900">₹{h.amount || 315}</div>
                      <span className="text-[10px] text-slate-400 font-semibold">{h.date || 'Past Visit'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  Recent visit at <strong>Table {selectedCustomerHistory.last_table || 'T04'}</strong> ({selectedCustomerHistory.last_visit || 'Today'})
                </div>
              )}
            </div>

            <button
              onClick={() => handleSendWhatsApp(selectedCustomerHistory)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send WhatsApp VIP Reward & Coupon</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Add New Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleCreateCustomer} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-heading">
                Enroll Regular Guest into Permanent CRM
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">10-Digit Mobile Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="e.g. 98250 14820"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold font-mono tracking-wider focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Preferred Table</label>
                  <input
                    type="text"
                    placeholder="e.g. T04"
                    value={newCustomerForm.last_table}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, last_table: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Favorite Dish</label>
                  <input
                    type="text"
                    placeholder="e.g. Cheese Mysore"
                    value={newCustomerForm.favorite_dish}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, favorite_dish: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition"
            >
              Save Customer Permanently
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
