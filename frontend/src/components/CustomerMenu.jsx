import React, { useState } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Sparkles, 
  Clock, 
  Plus, 
  Minus, 
  Utensils, 
  Tag, 
  Check, 
  BellRing, 
  GlassWater, 
  IndianRupee, 
  Flame,
  Leaf,
  X,
  CheckCircle2,
  Globe,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Receipt,
  Heart,
  ChevronRight,
  ChefHat,
  User,
  Phone,
  ShieldCheck,
  Star,
  Award,
  Banknote,
  CreditCard
} from 'lucide-react';
import { getTranslation } from '../lib/translations';
import { playSound } from '../lib/sound';
import { saveCustomerProfile, lookupCustomerByPhone } from '../lib/appwrite';

// Instamart / Blinkit Food Visual Category Helpers (pastel aesthetic, 0 stock photos required)
const getDishEmoji = (item) => {
  const name = (item.english_name || item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  if (cat.includes('mysore') || cat.includes('dosa') || name.includes('dosa')) return '🥞';
  if (cat.includes('pav') || name.includes('pav') || name.includes('bhaji')) return '🫓';
  if (cat.includes('pulao') || name.includes('pulao') || name.includes('rice') || name.includes('biryani')) return '🍛';
  if (cat.includes('chinese') || name.includes('noodle') || name.includes('manchurian') || name.includes('bhel')) return '🍜';
  if (cat.includes('sandwich') || name.includes('sandwich') || name.includes('toast')) return '🥪';
  if (cat.includes('pizza') || name.includes('pizza')) return '🍕';
  if (name.includes('chaas') || name.includes('lassi') || name.includes('drink') || name.includes('shake') || cat.includes('beverage')) return '🥤';
  if (name.includes('soup') || cat.includes('soup')) return '🍲';
  if (name.includes('ice cream') || name.includes('dessert') || cat.includes('dessert')) return '🍨';
  if (name.includes('vada') || name.includes('idli')) return '🥯';
  return '🍽️';
};

const getDishGradient = (item) => {
  const cat = (item.category || '').toLowerCase();
  if (cat.includes('mysore') || cat.includes('fancy')) return 'from-amber-100/70 via-orange-50/50 to-amber-50/40 text-amber-900';
  if (cat.includes('pav') || cat.includes('pulao')) return 'from-orange-100/70 via-red-50/40 to-amber-50/40 text-orange-950';
  if (cat.includes('chinese')) return 'from-rose-100/70 via-amber-50/40 to-orange-50/40 text-rose-950';
  if (cat.includes('paper')) return 'from-emerald-100/70 via-teal-50/40 to-green-50/40 text-emerald-950';
  return 'from-slate-100 via-orange-50/30 to-amber-50/30 text-slate-800';
};

export default function CustomerMenu({ 
  currentTable, 
  setCurrentTable, 
  categories, 
  menuItems, 
  orders = [],
  coupons = [], 
  onPlaceOrder, 
  onCallService,
  currentLang, 
  onLanguageChange,
  onBackToAdmin,
  restaurantSettings
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [jainOnly, setJainOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);

  const [cart, setCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoMessage, setPromoMessage] = useState('');

  // Item Customizer Modal State
  const [customizingItem, setCustomizingItem] = useState(null);
  const [extraButter, setExtraButter] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);
  const [isJainPrep, setIsJainPrep] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const [specialNote, setSpecialNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI'); // 'UPI' (Instant Online) or 'Cash' (COD / Pay at Counter)
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [serviceNotice, setServiceNotice] = useState('');

  // Permanent Customer Identification & CRM Details
  const [customerName, setCustomerName] = useState(() => {
    try {
      return localStorage.getItem('guest_customer_name') || '';
    } catch {
      return '';
    }
  });

  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      return localStorage.getItem('guest_customer_phone') || '';
    } catch {
      return '';
    }
  });

  const [recognizedCustomer, setRecognizedCustomer] = useState(() => {
    try {
      const savedPhone = localStorage.getItem('guest_customer_phone');
      if (savedPhone) {
        return lookupCustomerByPhone(savedPhone);
      }
    } catch {
      return null;
    }
    return null;
  });

  const [validationError, setValidationError] = useState('');

  const handlePhoneChange = (val) => {
    const rawDigits = val.replace(/[^0-9]/g, '').slice(0, 10);
    setCustomerPhone(rawDigits);
    setValidationError('');
    if (rawDigits.length === 10) {
      const match = lookupCustomerByPhone(rawDigits);
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
  };

  const t = (key) => getTranslation(currentLang, key);

  // Active table orders (if any placed during this dining session)
  const activeTableOrder = orders.find(o => 
    (o.table_number === currentTable || o.table_number === `Table ${currentTable}`) && 
    o.status !== 'Completed' && 
    o.status !== 'Cancelled'
  );

  // Check for any recent cancelled order for this table (Section 7 of Admin.txt)
  const recentCancelledOrder = orders.find(o => 
    (o.table_number === currentTable || o.table_number === `Table ${currentTable}`) && 
    o.status === 'Cancelled' && 
    o.cancel_reason
  );

  // Filter items
  const filteredItems = menuItems.filter(item => {
    if (!item.is_available) return false;
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (vegOnly && !item.is_veg) return false;
    if (spicyOnly && !item.is_spicy) return false;
    if (jainOnly) {
      const lower = (item.name + ' ' + (item.description || '')).toLowerCase();
      // Items that are typically convertible to Jain
      if (lower.includes('garlic') || lower.includes('onion')) return false;
    }
    if (searchQuery.trim() !== '') {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

  // Sort: Discounted items show FIRST as required in Section 4 of Admin.txt
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.hasDiscount && !b.hasDiscount) return -1;
    if (!a.hasDiscount && b.hasDiscount) return 1;
    return (b.orders_count || 0) - (a.orders_count || 0);
  });

  const getItemCartQty = (id) => {
    const found = cart.find(i => i.id === id);
    return found ? found.qty : 0;
  };

  const handleOpenCustomizer = (item) => {
    setCustomizingItem(item);
    setExtraButter(false);
    setExtraCheese(false);
    setIsJainPrep(jainOnly);
    setCustomNote('');
  };

  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return;
    const basePrice = Number(customizingItem.finalPrice || customizingItem.price || 0);
    let finalUnitPrice = basePrice;
    const tags = [];
    if (extraButter) { finalUnitPrice += 20; tags.push('+Butter'); }
    if (extraCheese) { finalUnitPrice += 30; tags.push('+Cheese'); }
    if (isJainPrep) tags.push('Jain');

    const suffix = tags.length ? ` (${tags.join(', ')})` : '';
    const cartItemId = `${customizingItem.id}_${extraButter ? 'b' : ''}_${extraCheese ? 'c' : ''}_${isJainPrep ? 'j' : ''}`;

    const existing = cart.find(i => i.cartItemId === cartItemId);
    if (existing) {
      setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, {
        ...customizingItem,
        cartItemId,
        name: customizingItem.name + suffix,
        price: finalUnitPrice,
        qty: 1
      }]);
    }
    playSound('order');
    setCustomizingItem(null);
  };

  const handleQuickAdd = (item) => {
    const unitPrice = Number(item.finalPrice || item.price || 0);
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, cartItemId: item.id, price: unitPrice, qty: 1 }]);
    }
    playSound('order');
  };

  const handleRemoveFromCart = (cartItemId) => {
    const existing = cart.find(i => (i.cartItemId || i.id) === cartItemId);
    if (!existing) return;
    if (existing.qty === 1) {
      setCart(cart.filter(i => (i.cartItemId || i.id) !== cartItemId));
    } else {
      setCart(cart.map(i => (i.cartItemId || i.id) === cartItemId ? { ...i, qty: i.qty - 1 } : i));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * 0.05; // 5% GST
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percentage') {
      discount = (subtotal * appliedPromo.discount) / 100;
    } else {
      discount = Math.min(subtotal, appliedPromo.discount);
    }
  }
  const totalAmount = Math.max(0, subtotal + tax - discount);
  const totalCartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleApplyPromo = () => {
    const found = coupons.find(c => c.code.toUpperCase() === promoCodeInput.trim().toUpperCase() && c.active);
    if (found) {
      if (subtotal >= found.min_order) {
        setAppliedPromo(found);
        setPromoMessage(`✅ Coupon ${found.code} applied successfully!`);
      } else {
        setPromoMessage(`⚠️ Minimum order of ₹${found.min_order} required for this coupon.`);
      }
    } else {
      setPromoMessage(`❌ Invalid or expired coupon code.`);
    }
  };

  const handleServiceButton = (type, label) => {
    if (onCallService) {
      onCallService(type, currentTable);
    }
    playSound('waiter');
    setServiceNotice(`🛎️ ${label} requested for Table ${currentTable}! Floor staff notified.`);
    setTimeout(() => setServiceNotice(''), 4000);
  };

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;

    // Validate Customer Full Name
    const trimmedName = (customerName || '').trim();
    if (!trimmedName) {
      setValidationError('Please enter your Name so the kitchen & waiter know who this order is for.');
      return;
    }

    // Validate 10-digit Indian Mobile Phone Number
    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setValidationError('Please enter a valid 10-digit Mobile Number (e.g. 98250 14820) for table order tracking & loyalty rewards.');
      return;
    }

    setValidationError('');

    // Persist locally for recurring orders during this visit
    try {
      localStorage.setItem('guest_customer_name', trimmedName);
      localStorage.setItem('guest_customer_phone', cleanPhone);
    } catch (e) {
      console.error('Local customer storage error:', e);
    }

    const newId = `#ORD${Math.floor(1000 + Math.random() * 9000)}`;
    const isOnline = paymentMode === 'UPI';

    const newOrderObj = {
      id: newId,
      table_number: currentTable,
      customer_name: trimmedName,
      customer_phone: cleanPhone,
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      items_summary: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      subtotal: subtotal,
      tax: tax,
      discount: discount,
      total: totalAmount,
      total_amount: totalAmount,
      status: 'Placed',
      channel: 'Dine-In QR',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      payment_mode: isOnline ? 'UPI' : 'Cash',
      payment_status: isOnline ? 'Paid' : 'Pending Cash',
      payment_verified_online: isOnline,
      paid_collected_by: isOnline ? 'UPI Gateway Direct' : null,
      special_note: specialNote
    };

    // Permanently store & update Customer Relations / CRM profile
    const savedCustomer = saveCustomerProfile({
      name: trimmedName,
      phone: cleanPhone,
      tableNumber: currentTable,
      orderId: newId,
      orderTotal: totalAmount,
      items: cart,
      paymentMode: isOnline ? 'UPI' : 'Cash'
    });

    if (savedCustomer) {
      setRecognizedCustomer(savedCustomer);
    }

    onPlaceOrder(newOrderObj);
    playSound('order');
    setPlacedOrderId(newId);
    setOrderSuccess(true);
    setCart([]);
    setShowCartDrawer(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-28 text-slate-900">
      
      {/* 1. TOP STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2.5 min-w-0">
            {onBackToAdmin && (
              <button 
                onClick={onBackToAdmin}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 cursor-pointer"
                title="Return to Admin POS"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-black text-base sm:text-lg text-slate-900 font-heading truncate">
                  {restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-white shrink-0 shadow-xs">
                  Table {currentTable}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                <span className="inline-flex items-center text-emerald-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  100% Pure Veg
                </span>
                <span>•</span>
                <span>Petlad, Anand</span>
              </div>
            </div>
          </div>

          {/* Table Service Chips & Language Selector */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => handleServiceButton('WAITER', 'Floor Waiter')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-[11px] font-semibold transition flex items-center space-x-1 cursor-pointer"
              title="Call Floor Waiter"
            >
              <BellRing className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Waiter</span>
            </button>

            <button
              onClick={() => handleServiceButton('WATER', 'Water')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-[11px] font-semibold transition flex items-center space-x-1 cursor-pointer"
              title="Request Water"
            >
              <GlassWater className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Water</span>
            </button>

            <button
              onClick={() => handleServiceButton('BILL', 'Bill')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-[11px] font-semibold transition flex items-center space-x-1 cursor-pointer"
              title="Request Bill"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Bill</span>
            </button>

            <div className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
              <Globe className="w-3 h-3 text-slate-600" />
              <select 
                value={currentLang} 
                onChange={(e) => onLanguageChange(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="gu">GU</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* Service Toast Feedback */}
      {serviceNotice && (
        <div className="max-w-md mx-auto mt-3 px-4 animate-bounce">
          <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs font-bold text-center shadow-lg border border-orange-500/50">
            {serviceNotice}
          </div>
        </div>
      )}

      {/* Active Order Tracker Pill (if table has food cooking) */}
      {activeTableOrder && (
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div 
            onClick={() => setShowOrderTracker(true)}
            className="p-3 rounded-2xl bg-orange-50 border border-orange-300 shadow-xs flex items-center justify-between cursor-pointer hover:bg-orange-100 transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
              <div>
                <span className="text-xs font-black text-orange-950 font-heading">
                  Order {activeTableOrder.id} is Cooking!
                </span>
                <p className="text-[11px] text-orange-800">
                  {activeTableOrder.items?.length || 1} dishes on tawa • Tap to track live status
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-xl bg-orange-500 text-white text-xs font-black shadow-xs flex items-center space-x-1">
              <span>Track</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        
        {/* Out-of-Stock / Cancellation Alert Banner */}
        {recentCancelledOrder && (
          <div className="rounded-2xl p-3.5 bg-rose-50 border border-rose-300 text-rose-950 shadow-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-rose-800 flex items-center space-x-2">
                <span>Order Notice for Table {currentTable}</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 font-mono text-[10px] font-bold">
                  {recentCancelledOrder.id}
                </span>
              </div>
              <p className="mt-0.5 font-medium text-rose-900 leading-relaxed">
                Your order could not be fulfilled: <span className="font-bold underline">{recentCancelledOrder.cancel_reason}</span>
              </p>
              <p className="text-[10px] text-rose-700 mt-0.5">
                Please select an alternative dish from our live menu below or notify floor staff.
              </p>
            </div>
          </div>
        )}

        {/* Compact Hospitality Welcome Strip */}
        <div className="rounded-2xl p-3 bg-slate-900 text-white shadow-xs border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0 text-sm">
              🥞
            </div>
            <div>
              <p className="text-xs font-black font-heading leading-tight">
                Authentic Gujarati & South Indian Tawa Specialties
              </p>
              <p className="text-[10px] text-slate-300 font-medium">
                Freshly prepared upon ordering • Jain options available
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold font-mono">
            Pure Veg 100%
          </span>
        </div>

        {/* Sticky Search & Dynamic Category Navigator */}
        <div className="space-y-2 sticky top-[57px] z-20 bg-slate-50/95 backdrop-blur-md pt-1 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes (e.g. Mysore, Pav Bhaji, Cheese...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dynamic Category Pill Slider */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {['All', ...Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)))].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Dietary Toggles: Jain & Spicy */}
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <button
              onClick={() => setJainOnly(!jainOnly)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                jainOnly ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>🌱 Jain (No Onion/Garlic)</span>
            </button>

            <button
              onClick={() => setSpicyOnly(!spicyOnly)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                spicyOnly ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>Spicy Only</span>
            </button>

            <span className="text-[10px] text-slate-400 font-medium ml-auto">
              {sortedItems.length} Dishes
            </span>
          </div>
        </div>

        {/* Menu Items Grid - Ultra Pro Max 2-Column Mobile Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 sm:gap-3.5">
          {sortedItems.map(item => {
            const qty = getItemCartQty(item.id);
            const currentItemPrice = item.finalPrice || item.price;
            const originalItemPrice = item.originalPrice || item.price;

            return (
              <div 
                key={item.id} 
                onClick={() => handleOpenCustomizer(item)}
                className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between relative group cursor-pointer"
              >
                {/* Top Food Visual Card (Soft Pastel Gradient & Centered Artistic Emoji / Image) */}
                <div className={`w-full aspect-[4/3] rounded-xl relative overflow-hidden flex items-center justify-center bg-gradient-to-br ${getDishGradient(item)} border border-slate-100/80`}>
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 group-hover:scale-110 transition duration-300 select-none">
                      <span className="text-3xl sm:text-4xl drop-shadow-xs">
                        {getDishEmoji(item)}
                      </span>
                    </div>
                  )}

                  {/* Top-Left: Standard FSSAI Pure Veg Green Mark */}
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-white/95 backdrop-blur-xs rounded-xs border border-emerald-600 flex items-center justify-center shadow-2xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  </div>

                  {/* Top-Right: Discount or Prep Time Badge */}
                  {item.hasDiscount ? (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider shadow-xs flex items-center space-x-0.5">
                      <span>{item.discountPercent}% OFF</span>
                    </div>
                  ) : item.prepTimeMins ? (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-slate-700 font-mono text-[9px] font-bold border border-slate-200/60 shadow-2xs flex items-center space-x-0.5">
                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                      <span>{item.prepTimeMins}m</span>
                    </div>
                  ) : null}

                  {/* Bottom tags (Spicy) */}
                  {item.is_spicy && (
                    <div className="absolute bottom-1 left-1.5">
                      <span className="px-1 py-0.5 bg-rose-500/90 text-white rounded text-[8px] font-black uppercase tracking-wider shadow-2xs">
                        🌶️ Spicy
                      </span>
                    </div>
                  )}
                </div>

                {/* Dish Details */}
                <div className="mt-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 font-mono truncate block">
                      {item.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-heading line-clamp-2 leading-snug group-hover:text-slate-700 transition mt-0.5 min-h-[2rem]">
                      {item.english_name || item.name}
                    </h3>
                    {item.gujarati_name && (
                      <p className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                        {item.gujarati_name}
                      </p>
                    )}
                  </div>

                  {/* Price & Instamart ADD / Stepper Row */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-black text-slate-950 font-heading">
                        ₹{currentItemPrice}
                      </span>
                      {item.hasDiscount && (
                        <span className="text-[9px] line-through text-slate-400 font-mono">
                          ₹{originalItemPrice}
                        </span>
                      )}
                    </div>

                    {/* Pro ADD / Stepper Button */}
                    <div className="shrink-0">
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                          }}
                          className="px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-600/40 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-2xs flex items-center space-x-1 transition active:scale-95 cursor-pointer"
                        >
                          <span>ADD</span>
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      ) : (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center space-x-1 bg-emerald-600 text-white rounded-xl px-1.5 py-0.5 shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="w-5 h-5 rounded-lg hover:bg-emerald-700 flex items-center justify-center text-white active:scale-90 transition cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                          <span className="text-xs font-black font-mono px-1">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(item)}
                            className="w-5 h-5 rounded-lg hover:bg-emerald-700 flex items-center justify-center text-white active:scale-90 transition cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* 3. DISH CUSTOMIZATION MODAL */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  {customizingItem.name}
                </h3>
                <span className="text-xs font-mono font-bold text-orange-600">
                  Base Price: ₹{customizingItem.finalPrice || customizingItem.price}
                </span>
              </div>
              <button 
                onClick={() => setCustomizingItem(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Select Customizations:
              </span>

              {/* Extra Butter */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🧈</span>
                  <div>
                    <div className="text-xs font-black text-slate-900">Extra Amul Butter</div>
                    <span className="text-[10px] text-slate-400">Rich golden butter layer</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-amber-700">+₹20</span>
                  <input
                    type="checkbox"
                    checked={extraButter}
                    onChange={(e) => setExtraButter(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                </div>
              </label>

              {/* Extra Cheese */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-orange-400 cursor-pointer transition">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🧀</span>
                  <div>
                    <div className="text-xs font-black text-slate-900">Extra Amul Cheese</div>
                    <span className="text-[10px] text-slate-400">Grated molten cheese topping</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-orange-700">+₹30</span>
                  <input
                    type="checkbox"
                    checked={extraCheese}
                    onChange={(e) => setExtraCheese(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                </div>
              </label>

              {/* Jain Prep */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 cursor-pointer transition">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🌱</span>
                  <div>
                    <div className="text-xs font-black text-slate-900">Jain Preparation</div>
                    <span className="text-[10px] text-slate-400">Strictly no onion, garlic or root veggies</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-emerald-700">FREE</span>
                  <input
                    type="checkbox"
                    checked={isJainPrep}
                    onChange={(e) => setIsJainPrep(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Total Item Price</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  ₹{(Number(customizingItem.finalPrice || customizingItem.price) + (extraButter ? 20 : 0) + (extraCheese ? 30 : 0))}
                </span>
              </div>

              <button
                onClick={handleAddCustomizedToCart}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Add to Order
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. FLOATING BOTTOM CART BAR - SWIGGY / BLINKIT / INSTAMART STYLE */}
      {totalCartCount > 0 && !showCartDrawer && (
        <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setShowCartDrawer(true)}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-2xl flex items-center justify-between border border-slate-800 hover:bg-slate-950 active:scale-[0.99] transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs font-mono shadow-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {totalCartCount} {totalCartCount === 1 ? 'Dish' : 'Dishes'} in Cart
                </div>
                <div className="text-sm font-black font-mono text-white">₹{totalAmount.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-black text-xs shadow-xs uppercase tracking-wider transition">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </button>
        </div>
      )}

      {/* 6. CART CHECKOUT DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-black text-slate-900 font-heading">Table {currentTable} Order</h3>
              </div>
              <button 
                onClick={() => setShowCartDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 divide-y divide-slate-100">
              {cart.map(item => (
                <div key={item.cartItemId || item.id} className="pt-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 font-heading">{item.name}</h4>
                    <span className="text-xs font-mono font-bold text-slate-500">₹{item.price} each</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-100 rounded-xl p-1">
                    <button 
                      onClick={() => handleRemoveFromCart(item.cartItemId || item.id)}
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black px-1.5 font-mono">{item.qty}</span>
                    <button 
                      onClick={() => handleQuickAdd(item)}
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions Note */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('specialInstructions')}</label>
              <textarea
                rows="2"
                placeholder="e.g. Extra crisp dosa, less spicy sambhar..."
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
              ></textarea>
            </div>

            {/* Promo Code Input */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-600">Have a Promo Coupon?</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME50"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold uppercase focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Apply
                </button>
              </div>
              {promoMessage && (
                <div className="text-[11px] font-bold text-slate-700">{promoMessage}</div>
              )}
            </div>

            {/* Guest Details & Permanent CRM Association (Required for Table Dining) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 font-heading flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-orange-600" />
                    <span>Guest Details (Table {currentTable})</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Required for food serving & earning permanent loyalty rewards.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200">
                  Required
                </span>
              </div>

              {/* VIP Welcome Banner if Recognized Returning Diner */}
              {recognizedCustomer && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 flex items-center justify-between shadow-xs animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black">
                        Welcome back, {recognizedCustomer.name}!
                      </div>
                      <p className="text-[10px] text-amber-800 font-medium">
                        Visit #{recognizedCustomer.visits + 1} • <strong className="text-amber-900 font-bold">{recognizedCustomer.tier}</strong> • {recognizedCustomer.loyalty_points} Points
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900 shrink-0">
                    VIP REGULAR
                  </span>
                </div>
              )}

              {/* Guest Full Name & 10-Digit Mobile Inputs */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Enter your full name (e.g. Rahul Sharma)"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setValidationError('');
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    10-Digit Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center space-x-1 text-slate-500 font-mono text-xs font-bold pointer-events-none">
                      <Phone className="w-3.5 h-3.5 text-slate-400 mr-1" />
                      <span>+91</span>
                      <span className="text-slate-300">|</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="98250 14820"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-16 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 tracking-wider transition"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Saved permanently for Atmiya Dosa Hub VIP privileges & offers.
                  </span>
                </div>
              </div>
            </div>

            {/* Clear Payment Method Selection: Online UPI vs COD / Counter */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 font-heading">
                  Choose Payment Option
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Select payment mode
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Online Payment Option (Instant UPI) */}
                <div
                  onClick={() => setPaymentMode('UPI')}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    paymentMode === 'UPI'
                      ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-400/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                        paymentMode === 'UPI' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        ⚡
                      </div>
                      <span className="text-xs font-black text-slate-900 font-heading">
                        Pay Online (UPI)
                      </span>
                    </div>
                    {paymentMode === 'UPI' && (
                      <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Instant UPI QR (GPay, PhonePe, Paytm). Auto-verified.
                  </p>
                  <span className="inline-block self-start px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-orange-100 text-orange-800">
                    ⚡ Fast Kitchen Fire
                  </span>
                </div>

                {/* 2. Cash on Delivery / Pay at Counter Option */}
                <div
                  onClick={() => setPaymentMode('Cash')}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    paymentMode === 'Cash'
                      ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                        paymentMode === 'Cash' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        💵
                      </div>
                      <span className="text-xs font-black text-slate-900 font-heading">
                        Cash on Delivery
                      </span>
                    </div>
                    {paymentMode === 'Cash' && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Eat first, pay cash or UPI at the cashier desk upon bill.
                  </p>
                  <span className="inline-block self-start px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-amber-100 text-amber-900">
                    Pay at Cashier Desk
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center space-x-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Price Calculations */}
            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-600">
                <span>{t('subtotal')}:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-600">
                <span>{t('tax')} (5% GST):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>{t('discount')}:</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200 font-heading">
                <span>Total to Pay:</span>
                <span className="text-orange-600 font-mono text-lg">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-orange-500/25 transition flex items-center justify-center space-x-2"
            >
              <span>Confirm Table {currentTable} Order (₹{totalAmount.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      )}

      {/* 7. LIVE ORDER PROGRESS TRACKER MODAL */}
      {showOrderTracker && activeTableOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Order Status: {activeTableOrder.id}
                </h3>
                <span className="text-xs text-slate-400 font-mono">Table {currentTable}</span>
              </div>
              <button 
                onClick={() => setShowOrderTracker(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper */}
            <div className="space-y-4 py-2">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Order Received & KOT Fired</h4>
                  <p className="text-[10px] text-slate-400">Order accepted into central kitchen queue</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0 animate-pulse">
                  🍳
                </div>
                <div>
                  <h4 className="text-xs font-black text-orange-950">Cooking on Tawa</h4>
                  <p className="text-[10px] text-orange-800">Fresh dosas and gravies are currently on the stove</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                  🍽️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500">Ready & Served to Table</h4>
                  <p className="text-[10px] text-slate-400">Floor waiter will deliver piping hot to Table {currentTable}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex justify-between font-mono">
              <span>Bill Total:</span>
              <span className="font-black text-slate-900">₹{activeTableOrder.total || activeTableOrder.total_amount}</span>
            </div>

            <button
              onClick={() => setShowOrderTracker(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close Tracker
            </button>
          </div>
        </div>
      )}

      {/* 8. ORDER PLACED SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 font-heading">Order Received!</h3>
              <p className="text-sm font-black text-orange-600 font-mono tracking-wider">{placedOrderId}</p>
              <p className="text-xs font-semibold text-slate-500">
                Piping hot pure-veg dishes are now being prepared in the kitchen.
              </p>
            </div>

            {/* Order Confirmation Details Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Assigned Table:</span>
                <span className="font-mono font-black text-slate-900 text-sm bg-orange-100 text-orange-900 px-2 py-0.5 rounded-lg">
                  Table {currentTable}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Guest:</span>
                <span className="font-black text-slate-900">{customerName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Mobile:</span>
                <span className="font-mono font-bold text-slate-700">+91 {customerPhone}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold">Payment Method:</span>
                {paymentMode === 'UPI' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✅ Paid Online (UPI)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                    ⚠️ Cash on Delivery (At Counter)
                  </span>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              Permanent customer record saved with loyalty reward points.
            </p>

            <button
              onClick={() => setOrderSuccess(false)}
              className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-md transition"
            >
              Continue to Table Menu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
