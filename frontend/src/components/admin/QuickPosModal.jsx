import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  Sparkles, 
  Check, 
  X, 
  User, 
  Phone, 
  Utensils, 
  IndianRupee, 
  CreditCard, 
  Flame, 
  Leaf, 
  Users,
  Divide
} from 'lucide-react';
import { playSound } from '../../lib/sound';
import { lookupCustomerByPhone, saveCustomerProfile } from '../../lib/appwrite';

export default function QuickPosModal({ 
  tables = [], 
  menuItems = [], 
  categories = [], 
  coupons = [], 
  onPlaceOrder, 
  onClose, 
  currentStaff = { name: 'Darshit Rana', role: 'Admin' } 
}) {
  const [selectedChannel, setSelectedChannel] = useState('Dine-In'); // 'Dine-In' or 'Takeaway'
  const [selectedTable, setSelectedTable] = useState('T01');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [recognizedCustomer, setRecognizedCustomer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart and Modifiers
  const [cart, setCart] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [splitCount, setSplitCount] = useState(1);
  const [showSplitDrawer, setShowSplitDrawer] = useState(false);

  // Filtered menu items
  const filteredDishes = menuItems.filter(item => {
    if (!item.is_available) return false;
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddDish = (dish) => {
    const unitPrice = Number(dish.finalPrice || dish.price || 0);
    const existingIndex = cart.findIndex(i => i.id === dish.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: dish.id,
        name: dish.name,
        price: unitPrice,
        qty: 1,
        modifiers: {
          extraButter: false,
          extraCheese: false,
          isJain: false,
          spicyLevel: 'Medium'
        }
      }]);
    }
    playSound('order');
  };

  const handleUpdateQty = (idx, delta) => {
    const updated = [...cart];
    updated[idx].qty += delta;
    if (updated[idx].qty <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  const handleToggleModifier = (idx, modKey) => {
    const updated = [...cart];
    updated[idx].modifiers[modKey] = !updated[idx].modifiers[modKey];
    setCart(updated);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    let itemBase = item.price * item.qty;
    if (item.modifiers.extraButter) itemBase += (20 * item.qty);
    if (item.modifiers.extraCheese) itemBase += (30 * item.qty);
    return sum + itemBase;
  }, 0);

  const tax = subtotal * 0.05; // 5% GST
  const grandTotal = Math.max(0, subtotal + tax - appliedDiscount);
  const perPersonSplit = (grandTotal / splitCount).toFixed(2);

  const handleApplyPromo = () => {
    const found = coupons.find(c => c.code.toUpperCase() === promoCode.trim().toUpperCase() && c.active);
    if (found) {
      if (subtotal >= found.min_order) {
        if (found.type === 'percentage') {
          setAppliedDiscount((subtotal * found.discount) / 100);
        } else {
          setAppliedDiscount(found.discount);
        }
        playSound('success');
      } else {
        alert(`Minimum order of ₹${found.min_order} required for coupon ${found.code}`);
      }
    } else {
      alert('Invalid or inactive coupon code');
    }
  };

  const handleFireOrder = () => {
    if (cart.length === 0) {
      alert('Please select at least one dish for the ticket.');
      return;
    }

    const orderId = `#ORD${Math.floor(1000 + Math.random() * 9000)}`;
    const finalCustomerName = (customerName || '').trim() || (selectedChannel === 'Dine-In' ? `Table ${selectedTable} Guest` : 'Walk-in Customer');
    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '').slice(-10);

    const newOrderObj = {
      id: orderId,
      table_number: selectedChannel === 'Dine-In' ? selectedTable : selectedChannel,
      channel: selectedChannel,
      customer_name: finalCustomerName,
      customer_phone: cleanPhone,
      items: cart.map(i => {
        const modTags = [];
        if (i.modifiers.extraButter) modTags.push('+Extra Butter');
        if (i.modifiers.extraCheese) modTags.push('+Extra Cheese');
        if (i.modifiers.isJain) modTags.push('[JAIN]');
        return {
          id: i.id,
          name: i.name + (modTags.length ? ` (${modTags.join(', ')})` : ''),
          price: i.price,
          qty: i.qty
        };
      }),
      items_summary: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      subtotal: subtotal,
      tax: tax,
      discount: appliedDiscount,
      total: grandTotal,
      total_amount: grandTotal,
      status: 'Preparing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      payment_mode: paymentMode,
      payment_status: paymentMode === 'Cash' ? 'Pending Cash' : 'Paid',
      payment_verified_online: paymentMode !== 'Cash',
      paid_collected_by: paymentMode === 'Cash' ? null : `${paymentMode} Direct`,
      punch_by: currentStaff.name
    };

    // Permanently persist in CRM if phone provided
    if (cleanPhone && cleanPhone.length === 10) {
      saveCustomerProfile({
        name: finalCustomerName,
        phone: cleanPhone,
        tableNumber: selectedChannel === 'Dine-In' ? selectedTable : selectedChannel,
        orderId,
        orderTotal: grandTotal,
        items: cart,
        paymentMode
      });
    }

    onPlaceOrder(newOrderObj);
    playSound('cash');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-heading shadow-md shadow-orange-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black font-heading text-slate-900 tracking-tight">
                  ⚡ Rapid Counter POS & Order Punch
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-mono text-[10px] font-bold border border-orange-200">
                  CASHIER DESK
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Staff: <span className="text-slate-900 font-bold">{currentStaff.name}</span> ({currentStaff.role})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body: 2 Columns */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: DISH CATALOG & SEARCH (60% width) */}
          <div className="lg:w-3/5 p-4 sm:p-6 flex flex-col space-y-4 border-r border-slate-200 bg-slate-50/50 overflow-y-auto">
            
            {/* Channel & Table Selector Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 text-xs font-bold">
                {['Dine-In', 'Takeaway'].map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`flex-1 py-1.5 rounded-lg transition text-center ${
                      selectedChannel === ch ? 'bg-orange-500 text-white shadow font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {selectedChannel === 'Dine-In' ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Table:</span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:border-orange-500"
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.number}>
                        {t.number} ({t.zone} - {t.capacity}p) {t.status === 'occupied' ? '• [Dining]' : '• [Free]'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Mode:</span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs">
                    Quick Counter Parcel
                  </span>
                </div>
              )}
            </div>

            {/* Customer VIP Info & Permanent CRM */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Customer Name (e.g. Rahul Sharma)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 shadow-sm"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Mobile No. (e.g. 98250 14820)"
                    value={customerPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setCustomerPhone(digits);
                      if (digits.length === 10) {
                        const match = lookupCustomerByPhone(digits);
                        if (match) {
                          setRecognizedCustomer(match);
                          if (!customerName || customerName.trim() === '') {
                            setCustomerName(match.name);
                          }
                        } else {
                          setRecognizedCustomer(null);
                        }
                      } else {
                        setRecognizedCustomer(null);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-orange-500 shadow-sm tracking-wider"
                  />
                </div>
              </div>

              {/* VIP Recognized Regular Guest Pill */}
              {recognizedCustomer && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Recognized VIP: <strong>{recognizedCustomer.name}</strong></span>
                    <span className="text-[10px] text-amber-800 font-semibold">({recognizedCustomer.tier} • {recognizedCustomer.visits} Visits • {recognizedCustomer.loyalty_points} Pts)</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase font-black">
                    Loyalty Member
                  </span>
                </div>
              )}
            </div>

            {/* Category Filter & Search Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search dish name (e.g. Mysore, Bahubali, Pav Bhaji)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 shadow-sm"
                />
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {['All', 'Mysore Dosa', 'Fancy Dosa', 'Pav Bhaji & Pulao', 'Beverages', 'South Indian'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                      selectedCategory === cat 
                        ? 'bg-orange-500 text-white shadow-sm font-black shadow-orange-500/20' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dish Touch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 flex-1 overflow-y-auto pr-1">
              {filteredDishes.map(dish => {
                const currentPrice = dish.finalPrice || dish.price;
                return (
                  <div
                    key={dish.id}
                    onClick={() => handleAddDish(dish)}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-400 transition cursor-pointer flex flex-col justify-between space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-3 h-3 rounded-sm border-2 border-emerald-600 flex items-center justify-center p-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
                      </span>
                      {dish.hasDiscount && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase">
                          {dish.discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-heading font-black text-xs text-slate-900 leading-tight group-hover:text-orange-600 transition">
                        {dish.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">{dish.category}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-mono font-black text-xs text-slate-900">
                        ₹{currentPrice}
                      </span>
                      <button className="w-6 h-6 rounded-lg bg-orange-500 group-hover:bg-orange-600 text-white flex items-center justify-center shadow">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT COLUMN: RUNNING TICKET & PAYMENT (40% width) */}
          <div className="lg:w-2/5 p-4 sm:p-6 flex flex-col justify-between bg-white overflow-y-auto space-y-4">
            
            {/* Ticket Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-heading font-black text-sm text-slate-900">
                    Running Ticket ({cart.reduce((sum, i) => sum + i.qty, 0)} Items)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: {selectedChannel === 'Dine-In' ? `Table ${selectedTable}` : selectedChannel}
                  </span>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto space-y-3 py-3 pr-1 divide-y divide-slate-100">
                {cart.map((item, idx) => (
                  <div key={idx} className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <h5 className="font-heading font-black text-xs text-slate-900 leading-tight">
                          {item.name}
                        </h5>
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          ₹{item.price} each
                        </span>
                      </div>

                      {/* Qty +/- */}
                      <div className="flex items-center space-x-1.5 bg-slate-100 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="w-5 h-5 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-black px-1.5">{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="w-5 h-5 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Modifiers Pill Row */}
                    <div className="flex items-center space-x-1.5 text-[10px]">
                      <button
                        onClick={() => handleToggleModifier(idx, 'isJain')}
                        className={`px-2 py-0.5 rounded-lg border font-bold transition ${
                          item.modifiers.isJain 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        🌱 Jain
                      </button>

                      <button
                        onClick={() => handleToggleModifier(idx, 'extraButter')}
                        className={`px-2 py-0.5 rounded-lg border font-bold transition ${
                          item.modifiers.extraButter 
                            ? 'bg-amber-500 text-white border-amber-500' 
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        🧈 +Butter ₹20
                      </button>

                      <button
                        onClick={() => handleToggleModifier(idx, 'extraCheese')}
                        className={`px-2 py-0.5 rounded-lg border font-bold transition ${
                          item.modifiers.extraCheese 
                            ? 'bg-orange-500 text-white border-orange-500' 
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        🧀 +Cheese ₹30
                      </button>
                    </div>

                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-12 text-center text-slate-400 space-y-1">
                    <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold">Ticket is Empty</p>
                    <p className="text-[10px]">Click any dish from the left menu to add.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations & Payment Controls */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              

              {/* Bill Breakdown */}
              <div className="space-y-1 text-xs text-slate-600 font-mono">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%) + SGST (2.5%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Discount:</span>
                    <span>-₹{appliedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 font-heading pt-1 border-t border-slate-100">
                  <span>Grand Total:</span>
                  <span className="text-orange-600 text-base">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Mode Selector - Pure Cash / COD */}
              <div className="pt-1">
                <div className="py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>💵</span>
                    <span>Cash on Delivery / Counter (COD)</span>
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md font-black">
                    Selected
                  </span>
                </div>
              </div>

              {/* Fire KOT Action Button */}
              <button
                onClick={handleFireOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-orange-500/20 flex items-center justify-center space-x-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Fire KOT & Confirm Bill (₹{grandTotal.toFixed(2)})</span>
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
