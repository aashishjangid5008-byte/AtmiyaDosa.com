import React, { useState } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Sparkles, 
  Clock, 
  Plus, 
  Minus, 
  Utensils, 
  UtensilsCrossed,
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
  ChevronDown,
  ChefHat,
  User,
  Phone,
  ShieldCheck,
  Star,
  Award,
  Banknote,
  CreditCard,
  Lock,
  QrCode as QrIcon,
  CheckCircle,
  ExternalLink,
  Copy,
  Printer,
  Info,
  Download,
  FileText
} from 'lucide-react';
import { getTranslation, getCategoryLabel, getDishDisplayName } from '../lib/translations';
import { playSound } from '../lib/sound';
import { saveCustomerProfile, lookupCustomerByPhone } from '../lib/appwrite';
import { createPaymentIntentApi, verifyPaymentApi, settleTableSessionApi } from '../lib/supabase';
import FoodShowcase3D from './customer/FoodShowcase3D';
import CuisineSelector from './customer/CuisineSelector';
import { MASTER_CUISINES, getDishCuisine } from '../lib/cuisines';
import { downloadSinglePageBillPdf, printSinglePageReceipt } from '../lib/generateBillPdf';

// Artisanal Culinary Category Meta (Luxury Gastronomy Palette & Emblems)
const getDishCulinaryMeta = (item, currentLang = 'en', t) => {
  const cat = (item.category || '').toLowerCase();
  const name = (item.english_name || item.name || '').toLowerCase();
  if (cat.includes('mysore') || cat.includes('fancy') || cat.includes('dosa') || name.includes('dosa')) {
    return { symbol: '🥞', label: t ? t('tawaDosa') : 'Tawa Dosa', tone: 'amber' };
  }
  if (cat.includes('pav') || name.includes('bhaji') || name.includes('pav')) {
    return { symbol: '🫓', label: t ? t('pavBhaji') : 'Pav Bhaji', tone: 'orange' };
  }
  if (cat.includes('pulao') || name.includes('pulao') || name.includes('rice') || name.includes('biryani')) {
    return { symbol: '🍛', label: t ? t('tawaPulao') : 'Tawa Pulao', tone: 'amber' };
  }
  if (cat.includes('chinese') || name.includes('noodle') || name.includes('manchurian') || name.includes('bhel')) {
    return { symbol: '🍜', label: t ? t('wokSpecialty') : 'Wok Specialty', tone: 'rose' };
  }
  if (cat.includes('sandwich') || name.includes('sandwich') || name.includes('toast')) {
    return { symbol: '🥪', label: t ? t('sandwich') : 'Sandwich', tone: 'amber' };
  }
  if (cat.includes('pizza') || name.includes('pizza')) {
    return { symbol: '🍕', label: t ? t('tawaPizza') : 'Tawa Pizza', tone: 'orange' };
  }
  if (cat.includes('beverage') || name.includes('chaas') || name.includes('lassi') || name.includes('water') || name.includes('drink')) {
    return { symbol: '🥤', label: t ? t('beverageAndWater') : 'Beverages & Water', tone: 'cyan' };
  }
  if (name.includes('soup') || cat.includes('soup')) {
    return { symbol: '🍲', label: t ? t('warmSoup') : 'Warm Soup', tone: 'amber' };
  }
  if (name.includes('ice cream') || name.includes('dessert') || cat.includes('dessert')) {
    return { symbol: '🍨', label: t ? t('dessert') : 'Dessert', tone: 'amber' };
  }
  return { symbol: '🍽️', label: t ? t('chefSpecialty') : 'Chef Specialty', tone: 'slate' };
};

/**
 * Resilient Multi-Tier Item Resolver for Customer Order Tracker & Floor Bills
 * Guarantees customers can ALWAYS see every ordered item, price, add-on, and cooking status.
 */
export const resolveCustomerOrderItems = (order, menuItems = []) => {
  if (!order) return [];

  let items = [];

  // 1. Direct items array
  if (Array.isArray(order.items) && order.items.length > 0) {
    items = order.items.map((it, idx) => {
      const menuItem = (menuItems || []).find(m => m.id === it.id || m.name === it.name);
      const qty = Number(it.qty || it.quantity || 1);
      const unitPrice = parseFloat(it.price || it.unit_price || menuItem?.price || menuItem?.finalPrice || menuItem?.final_price || 0);
      return {
        id: it.id || `it_${idx}`,
        name: it.name || it.item_name || 'Dish Item',
        qty,
        quantity: qty,
        price: unitPrice,
        total_price: parseFloat((unitPrice * qty).toFixed(2)),
        image_url: it.image_url || it.imageUrl || it.image || it.photo || menuItem?.image_url || null,
        cooking_note: it.cooking_note || it.note || it.customNote || it.customizations || null,
        is_served: Boolean(it.is_served || (order.status || '').toLowerCase() === 'served' || (order.status || '').toLowerCase() === 'completed'),
        kitchen_status: String(it.kitchen_status || it.status || (order.status || 'placed')).toLowerCase(),
        is_addon: Boolean(it.is_addon || (order.round > 1 && it.round === order.round)),
        round: it.round || order.round || 1
      };
    });
  }
  // 2. Fallback to order_items from Supabase relation
  else if (Array.isArray(order.order_items) && order.order_items.length > 0) {
    items = order.order_items.map((oi, idx) => {
      const menuItem = (menuItems || []).find(m => m.id === oi.menu_item_id || m.id === oi.id || m.name === oi.item_name);
      const qty = Number(oi.quantity || oi.qty || 1);
      const unitPrice = parseFloat(oi.unit_price || oi.price || menuItem?.price || menuItem?.finalPrice || menuItem?.final_price || 0);
      const isServed = (oi.status || '').toLowerCase() === 'served' || (order.status || '').toLowerCase() === 'served' || (order.status || '').toLowerCase() === 'completed';
      const kitchenStatus = (oi.status || '').toLowerCase() === 'ready' ? 'ready' : ((oi.status || '').toLowerCase() === 'preparing' ? 'preparing' : 'placed');
      return {
        id: oi.id || `oi_${idx}`,
        name: oi.item_name || oi.name || 'Dish Item',
        qty,
        quantity: qty,
        price: unitPrice,
        total_price: parseFloat((unitPrice * qty).toFixed(2)),
        image_url: oi.image_url || menuItem?.image_url || null,
        cooking_note: oi.cooking_note || null,
        is_served: isServed,
        kitchen_status: isServed ? 'served' : kitchenStatus,
        is_addon: Boolean(order.is_addon || (order.round > 1)),
        round: order.round || 1
      };
    });
  }
  // 3. Fallback to parsing items_summary string (e.g. "5x Mysore Masala, 1x Packaged Mineral Water")
  else if (typeof order.items_summary === 'string' && order.items_summary.trim()) {
    const parts = order.items_summary.split(',').map(s => s.trim()).filter(Boolean);
    items = parts.map((part, pIdx) => {
      const match = part.match(/^(\d+)x?\s+(.+)$/i);
      const qty = match ? parseInt(match[1], 10) : 1;
      const name = match ? match[2].trim() : part.trim();
      const menuItem = (menuItems || []).find(m => m.name.toLowerCase() === name.toLowerCase());
      const unitPrice = parseFloat(menuItem?.price || menuItem?.finalPrice || menuItem?.final_price || (name.toLowerCase().includes('water') ? 20 : 0));
      return {
        id: `summary_it_${pIdx}`,
        name,
        qty,
        quantity: qty,
        price: unitPrice,
        total_price: parseFloat((unitPrice * qty).toFixed(2)),
        image_url: menuItem?.image_url || null,
        cooking_note: null,
        is_served: (order.status || '').toLowerCase() === 'served' || (order.status || '').toLowerCase() === 'completed',
        kitchen_status: (order.status || '').toLowerCase() === 'ready' ? 'ready' : ((order.status || '').toLowerCase() === 'preparing' ? 'preparing' : 'placed'),
        is_addon: Boolean(order.is_addon),
        round: order.round || 1
      };
    });
  }

  // 4. Check special notes for add-on Mineral Water if not already in items
  const note = order.special_notes || order.special_note || '';
  if (note) {
    const waterMatch = note.match(/(?:\+|💧)?\s*(\d+)x?\s*Mineral\s*Water/i);
    if (waterMatch) {
      const waterQty = parseInt(waterMatch[1], 10) || 1;
      const alreadyHasWater = items.some(it => (it.name || '').toLowerCase().includes('water'));
      if (!alreadyHasWater) {
        items.push({
          id: `note_water_${order.id}`,
          name: 'Packaged Mineral Water (1 Litre Bottle)',
          qty: waterQty,
          quantity: waterQty,
          price: 20,
          total_price: waterQty * 20,
          image_url: null,
          cooking_note: 'Chilled bottle',
          is_served: (order.status || '').toLowerCase() === 'served' || (order.status || '').toLowerCase() === 'completed',
          kitchen_status: 'placed',
          is_addon: true,
          round: order.round || 2
        });
      }
    }
  }

  return items;
};

export default function CustomerMenu({ 
  currentTable, 
  setCurrentTable, 
  tables = [],
  categories, 
  menuItems, 
  orders = [],
  coupons = [], 
  onPlaceOrder, 
  onCallService,
  currentLang, 
  onLanguageChange,
  authUser = null,
  onBackToAdmin,
  restaurantSettings
}) {
  // 3-Stage QR Menu Navigation Flow:
  // 'landing' (Interactive 3D Food Showcase) -> 'cuisines' (4 Master Cuisines Grid) -> 'dishes' (Zomato-Style Dishes Stream)
  const [menuStage, setMenuStage] = useState(() => {
    try {
      if (sessionStorage.getItem('atmiya_seen_landing') === 'true' || (!menuItems || menuItems.length === 0)) {
        return 'dishes';
      }
    } catch {}
    return 'landing';
  });
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [jainOnly, setJainOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);

  const [cart, setCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [trackerFilter, setTrackerFilter] = useState('all'); // 'all' | 'cooking' | 'delivered'
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
  const [paymentMode, setPaymentMode] = useState('Cash'); // Strictly Cash / COD (Pay at Counter / Table)
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [paidSuccessOrder, setPaidSuccessOrder] = useState(null);
  const [serviceNotice, setServiceNotice] = useState('');


  // Table Concierge Modal State (Water, Waiter, Bill, Clean)
  const [showConciergeModal, setShowConciergeModal] = useState(false);

  // Clean numeric table number for UI display (e.g. 'T10' -> '10', 'T04' -> '4')
  const cleanTableNum = String(currentTable || '1').replace(/^T0*|^t0*/i, '') || '1';

  // Live Dynamic UPI Payment Modal & QR State
  const [showUpiPaymentModal, setShowUpiPaymentModal] = useState(false);
  const [upiIntentData, setUpiIntentData] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
  const [upiUtrInput, setUpiUtrInput] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);

  // Automatic Table Session Termination & Settlement Receipt State
  const [settledSessionReceipt, setSettledSessionReceipt] = useState(null);

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

  // Robust Table & Active Order Matchers (Sections 3 & 4: Anti-Duplicate QR Lock)
  const normalizeTable = (val) => {
    if (!val) return '';
    const digits = String(val).replace(/[^0-9]/g, '');
    if (digits) return String(parseInt(digits, 10));
    return String(val).trim().toLowerCase();
  };

  const isTableMatch = (t1, t2) => {
    return normalizeTable(t1) === normalizeTable(t2);
  };

  const isOrderActive = (order) => {
    if (!order) return false;
    const st = String(order.status || '').toLowerCase().trim();
    if (st === 'completed' || st === 'cancelled' || st === 'settled' || st === 'paid_out') {
      return false;
    }
    return true;
  };

  // Active table order in the kitchen queue (Locks QR and blocks 2nd order)
  const activeTableOrder = orders.find(o => 
    isTableMatch(o.table_number, currentTable) && isOrderActive(o)
  );
  const activeOrderDisplayId = activeTableOrder?.id 
    ? (String(activeTableOrder.id).startsWith('#') ? activeTableOrder.id : `#${activeTableOrder.id}`)
    : '';

  // Check for any recent cancelled order for this table
  const recentCancelledOrder = orders.find(o => 
    isTableMatch(o.table_number, currentTable) && 
    (o.status || '').toLowerCase() === 'cancelled' && 
    o.cancel_reason
  );

  // Real-time synchronization of placed order & official bill state with live orders
  const activeBillOrder = React.useMemo(() => {
    const idToFind = paidSuccessOrder?.id || placedOrderId || activeTableOrder?.id;
    if (idToFind && Array.isArray(orders) && orders.length > 0) {
      const match = orders.find(o => o.id === idToFind);
      if (match) {
        return { ...match, ...paidSuccessOrder };
      }
    }
    return paidSuccessOrder || activeTableOrder;
  }, [orders, paidSuccessOrder, placedOrderId, activeTableOrder]);

  // Synchronize paidSuccessOrder whenever orders update
  React.useEffect(() => {
    const idToFind = paidSuccessOrder?.id || placedOrderId || activeTableOrder?.id;
    if (idToFind && Array.isArray(orders)) {
      const match = orders.find(o => o.id === idToFind);
      if (match) {
        setPaidSuccessOrder(prev => prev ? { ...prev, ...match } : match);
      }
    }
  }, [orders, placedOrderId, activeTableOrder]);

  // Payment Confirmation Gating: Bill PDF download is unlocked ONLY when payment is confirmed
  const isPaymentConfirmed = Boolean(
    (activeBillOrder && (
      (activeBillOrder.payment_status || '').toLowerCase() === 'paid' ||
      activeBillOrder.payment_verified_online === true
    )) ||
    (activeTableOrder && (
      (activeTableOrder.payment_status || '').toLowerCase() === 'paid' ||
      activeTableOrder.payment_verified_online === true
    ))
  );

  // Automatic Real-Time Table Session Termination Listener
  React.useEffect(() => {
    const handleSessionTerminated = (e) => {
      const detail = e.detail || {};
      if (detail.tableNumber && isTableMatch(detail.tableNumber, currentTable)) {
        const matchingOrders = orders.filter(o => isTableMatch(o.table_number, currentTable));
        const totalSettled = matchingOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
        setSettledSessionReceipt({
          tableNumber: currentTable,
          paymentMethod: detail.paymentMethod || 'Settled at Table / Counter',
          amount: totalSettled,
          orderId: detail.orderId,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ordersCount: matchingOrders.length
        });
        setCart([]);
        setShowCartDrawer(false);
        setShowOrderTracker(false);
        setShowUpiPaymentModal(false);
        setPlacedOrderId('');
        setOrderSuccess(false);
        playSound('success');
      }
    };

    window.addEventListener('table_session_terminated', handleSessionTerminated);
    return () => window.removeEventListener('table_session_terminated', handleSessionTerminated);
  }, [currentTable, orders]);

  // Auto-detect when user's running order was settled by cashier/waiter
  React.useEffect(() => {
    if (placedOrderId && !activeTableOrder && !settledSessionReceipt) {
      const foundCompleted = orders.find(o => o.id === placedOrderId && (o.status === 'Completed' || o.status === 'Served'));
      if (foundCompleted && foundCompleted.payment_status === 'Paid') {
        setSettledSessionReceipt({
          tableNumber: currentTable,
          paymentMethod: foundCompleted.payment_mode || 'Cash',
          amount: foundCompleted.total || foundCompleted.total_amount || 0,
          orderId: foundCompleted.id,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ordersCount: 1
        });
        setPlacedOrderId('');
        setOrderSuccess(false);
        playSound('success');
      }
    }
  }, [placedOrderId, activeTableOrder, settledSessionReceipt, orders, currentTable]);

  // If table already has an active order running in the kitchen or menu is empty, default to dishes view
  React.useEffect(() => {
    if ((activeTableOrder || !menuItems || menuItems.length === 0) && menuStage === 'landing') {
      setMenuStage('dishes');
    }
  }, [activeTableOrder, menuItems, menuStage]);

  // Handle mobile hardware back button and browser back navigation inside customer menu
  // Prevents jumping out to the staff login screen when customer hits back
  React.useEffect(() => {
    const handlePopState = () => {
      if (showUpiPaymentModal) {
        setShowUpiPaymentModal(false);
        return;
      }
      if (showConciergeModal) {
        setShowConciergeModal(false);
        return;
      }
      if (customizingItem) {
        setCustomizingItem(null);
        return;
      }
      if (showCartDrawer) {
        setShowCartDrawer(false);
        return;
      }
      if (showOrderTracker) {
        setShowOrderTracker(false);
        return;
      }
      if (menuStage === 'dishes') {
        setSelectedCuisine('all');
        setSelectedCategory('All');
        setMenuStage('cuisines');
        return;
      }
      if (menuStage === 'cuisines') {
        setMenuStage('landing');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    showUpiPaymentModal, 
    showConciergeModal, 
    customizingItem, 
    showCartDrawer, 
    showOrderTracker, 
    menuStage
  ]);

  // Helper: Packaged mineral water is strictly managed via waiter add-ons (disappears from customer menu)
  const isWaterItem = (item) => {
    if (!item) return false;
    if (item.is_water || item.waiter_only || item.customer_hidden) return true;
    if (item.id === 'ATM_WATER_01' || item.id === 'item_atmiya_23' || String(item.id || '').startsWith('ATM_WATER')) return true;
    const n = String(item.name || '').toLowerCase();
    const en = String(item.english_name || '').toLowerCase();
    if (n.includes('mineral water') || en.includes('mineral water') || n.includes('packaged water') || en.includes('packaged water')) return true;
    return false;
  };

  // Dynamically compute available sub-categories scoped to currently selected cuisine (excluding water)
  const availableCategories = React.useMemo(() => {
    const pool = (selectedCuisine === 'all' 
      ? menuItems 
      : menuItems.filter(m => getDishCuisine(m) === selectedCuisine)
    ).filter(m => !isWaterItem(m));
    const uniqueCats = Array.from(new Set([
      ...(categories || []).map(c => c.name),
      ...pool.map(m => m.category)
    ].filter(Boolean)));
    return ['All', ...uniqueCats];
  }, [menuItems, selectedCuisine, categories]);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    // Water cannot be ordered directly by customer from the menu - waiter add-on exclusive
    if (isWaterItem(item)) return false;
    // Check availability (must not be explicitly marked out of stock)
    if (item.is_available === false || item.isAvailable === false) return false;
    // Master Cuisine Filter (South Indian, Chinese, Gujarati, Beverages)
    if (selectedCuisine !== 'all' && getDishCuisine(item) !== selectedCuisine) return false;
    // Sub-Category Filter
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (vegOnly && !item.is_veg) return false;
    if (spicyOnly && !item.is_spicy) return false;
    if (jainOnly) {
      const lower = (item.name + ' ' + (item.description || '')).toLowerCase();
      // Items that are typically convertible to Jain
      if (lower.includes('garlic') || lower.includes('onion')) return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const name = (item.name || '').toLowerCase();
      const engName = (item.english_name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      return name.includes(q) || engName.includes(q) || desc.includes(q) || cat.includes(q);
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
        qty: 1,
        customizations: tags.length ? tags.join(', ') : null,
        cooking_note: tags.length ? tags.join(', ') : null
      }]);
    }
    playSound('click');
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
    playSound('click');
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

  // Dynamic Multi-Model Restaurant Discount Engine
  let discount = 0;
  let promoAppliedDetails = '';

  if (appliedPromo) {
    if (appliedPromo.type === 'bogo') {
      // BOGO: Buy X Get Y Free (e.g. Buy 2 Dosas, Get 1 Free)
      const targetCat = (appliedPromo.target_category || 'Dosa').toLowerCase();
      const buyQty = Number(appliedPromo.buy_qty) || 2;
      const getQty = Number(appliedPromo.get_qty) || 1;

      // Expand all qualifying items into individual unit prices
      const qualifyingPrices = [];
      cart.forEach(item => {
        const cat = (item.category || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        if (cat.includes(targetCat) || name.includes(targetCat) || targetCat === 'all') {
          for (let q = 0; q < item.qty; q++) {
            qualifyingPrices.push(Number(item.price || 0));
          }
        }
      });

      qualifyingPrices.sort((a, b) => a - b); // Lowest priced item is free

      if (qualifyingPrices.length >= buyQty) {
        const numFreeSets = Math.floor(qualifyingPrices.length / (buyQty + getQty)) || 1;
        const freeCount = Math.min(qualifyingPrices.length, numFreeSets * getQty);
        discount = qualifyingPrices.slice(0, freeCount).reduce((sum, p) => sum + p, 0);
        promoAppliedDetails = `Buy ${buyQty} Get ${getQty} Free applied! Complimentary item saving: ₹${discount.toFixed(0)}`;
      } else {
        promoAppliedDetails = `Add ${buyQty - qualifyingPrices.length} more ${appliedPromo.target_category || 'Dosas'} to get 1 Free!`;
      }
    } else if (appliedPromo.type === 'percentage') {
      let rawDisc = (subtotal * (Number(appliedPromo.discount) || 0)) / 100;
      if (appliedPromo.max_discount) {
        rawDisc = Math.min(rawDisc, Number(appliedPromo.max_discount));
      }
      discount = rawDisc;
    } else if (appliedPromo.type === 'category') {
      const targetCat = (appliedPromo.target_category || '').toLowerCase();
      const catSubtotal = cart.reduce((sum, item) => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes(targetCat) ? sum + (item.price * item.qty) : sum;
      }, 0);
      discount = (catSubtotal * (Number(appliedPromo.discount) || 0)) / 100;
    } else if (appliedPromo.type === 'free_item') {
      discount = Number(appliedPromo.free_item_value || appliedPromo.discount || 20);
      promoAppliedDetails = `Complimentary ${appliedPromo.free_item_name || 'Item'} included!`;
    } else {
      // Flat Rupee
      discount = Math.min(subtotal, Number(appliedPromo.discount || 0));
    }
  }

  const totalAmount = Math.max(0, subtotal + tax - discount);
  const totalCartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleApplyPromo = (couponToApply = null) => {
    const targetCode = typeof couponToApply === 'string' 
      ? couponToApply 
      : (couponToApply?.code || promoCodeInput);

    if (!targetCode) return;

    const found = coupons.find(c => c.code.toUpperCase() === targetCode.trim().toUpperCase() && c.active);
    if (found) {
      if (subtotal >= (found.min_order || 0)) {
        if (found.type === 'bogo') {
          const targetCat = (found.target_category || 'Dosa').toLowerCase();
          const qualifyingCount = cart.reduce((count, item) => {
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return (cat.includes(targetCat) || name.includes(targetCat) || targetCat === 'all') ? count + item.qty : count;
          }, 0);

          if (qualifyingCount < (found.buy_qty || 2)) {
            setPromoMessage(`⚠️ Order at least ${found.buy_qty || 2} ${found.target_category || 'Dosas'} to apply this BOGO deal!`);
            playSound('error');
            return;
          }
        }
        setAppliedPromo(found);
        setPromoCodeInput(found.code);
        setPromoMessage(`✅ Coupon "${found.code}" applied successfully!`);
        playSound('success');
      } else {
        setPromoMessage(`⚠️ Minimum order of ₹${found.min_order} required for this coupon. Add ₹${(found.min_order - subtotal).toFixed(0)} more!`);
        playSound('error');
      }
    } else {
      setPromoMessage(`❌ Invalid or expired coupon code.`);
      playSound('error');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoMessage('');
    playSound('click');
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
    const trimmedName = (customerName || activeTableOrder?.customer_name || '').trim();
    if (!trimmedName) {
      setValidationError('Please enter your Name so the kitchen & waiter know who this order is for.');
      return;
    }

    // Validate 10-digit Indian Mobile Phone Number
    const rawPhone = customerPhone || activeTableOrder?.customer_phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
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

    const isOnline = false;
    const isAddon = Boolean(activeTableOrder);

    const orderItems = [
      ...cart.map(i => ({
        id: i.id,
        name: i.name,
        gujarati: i.gujarati || i.gujarati_name || i.name,
        price: i.price,
        qty: i.qty,
        image_url: i.image_url || i.imageUrl || i.image || i.photo || null,
        customizations: i.customizations || null,
        cooking_note: i.cooking_note || i.note || null,
        kitchen_status: 'placed',
        is_served: false
      }))
    ];

    const orderSummary = cart.map(i => `${i.qty}x ${i.name}`).join(', ');

    let finalOrderObj;

    if (activeTableOrder) {
      // NEW ADD-ON / ROUND 2+ ORDER: Creates a distinct ticket for kitchen and billing!
      // NEVER overwrites or wipes previous dishes already cooking or served!
      const newAddonId = `#ORD${Math.floor(1000 + Math.random() * 9000)}`;
      const roundNum = (activeTableOrder.round || 1) + 1;

      finalOrderObj = {
        id: newAddonId,
        order_number: newAddonId.replace('#', ''),
        table_number: currentTable,
        customer_name: trimmedName || activeTableOrder.customer_name,
        customer_phone: cleanPhone || activeTableOrder.customer_phone,
        items: orderItems,
        order_items: orderItems,
        items_summary: orderSummary,
        newly_added_items: orderItems,
        newly_added_summary: orderSummary,
        subtotal: subtotal,
        tax: tax,
        discount: discount || 0,
        promo_code: appliedPromo?.code || null,
        promo_details: appliedPromo,
        total: totalAmount,
        total_amount: totalAmount,
        status: 'Placed',
        channel: activeTableOrder.channel || 'Dine-In QR',
        placed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        payment_mode: 'Cash',
        payment_status: 'Pending Cash',
        payment_verified_online: false,
        paid_collected_by: 'Cashier Desk / Floor Waiter',
        special_note: specialNote 
          ? `[Round ${roundNum}] ${specialNote}`.trim() 
          : `[Round ${roundNum} Add-On]`,
        is_addon: true,
        round: roundNum,
        parent_order_id: activeTableOrder.id
      };
    } else {
      const newId = `#ORD${Math.floor(1000 + Math.random() * 9000)}`;
      finalOrderObj = {
        id: newId,
        order_number: newId.replace('#', ''),
        table_number: currentTable,
        customer_name: trimmedName,
        customer_phone: cleanPhone,
        items: orderItems,
        order_items: orderItems,
        items_summary: orderSummary,
        newly_added_items: orderItems,
        newly_added_summary: orderSummary,
        subtotal: subtotal,
        tax: tax,
        discount: discount || 0,
        promo_code: appliedPromo?.code || null,
        promo_details: appliedPromo,
        total: totalAmount,
        total_amount: totalAmount,
        status: 'Placed',
        channel: 'Dine-In QR',
        placed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        payment_mode: 'Cash',
        payment_status: 'Pending Cash',
        payment_verified_online: false,
        paid_collected_by: 'Cashier Desk / Floor Waiter',
        special_note: specialNote || '',
        is_addon: false,
        round: 1,
        parent_order_id: null
      };
    }

    // Direct Cash at Counter / Floor Ordering (Pure COD Flow)
    finalizeAndPlaceOrder(finalOrderObj);
  };

  const finalizeAndPlaceOrder = (orderObj) => {
    // Permanently store & update Customer Relations / CRM profile
    const savedCustomer = saveCustomerProfile({
      name: orderObj.customer_name,
      phone: orderObj.customer_phone,
      tableNumber: currentTable,
      orderId: orderObj.id,
      orderTotal: orderObj.total_amount,
      items: cart,
      paymentMode: orderObj.payment_mode
    });

    if (savedCustomer) {
      setRecognizedCustomer(savedCustomer);
    }

    onPlaceOrder(orderObj);
    playSound('success');
    setPlacedOrderId(orderObj.id);
    setPaidSuccessOrder(orderObj);
    setOrderSuccess(true);
    setCart([]);
    setShowCartDrawer(false);
    setShowUpiPaymentModal(false);
    setPendingOrderPayload(null);
    setUpiIntentData(null);
  };

  const handleCopyUpiId = (idToCopy) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(idToCopy);
      } else {
        const el = document.createElement('textarea');
        el.value = idToCopy;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setUpiCopied(true);
      playSound('click');
      setTimeout(() => setUpiCopied(false), 2000);
    } catch (e) {
      console.warn('Copy UPI clipboard notice:', e);
    }
  };

  const handleVerifyUpiPayment = async () => {
    if (!pendingOrderPayload) return;
    setIsVerifyingPayment(true);
    const activeRef = upiIntentData?.payment_reference || `PAY-${Date.now().toString().slice(-8).toUpperCase()}`;
    const activeVpa = upiIntentData?.vpa || restaurantSettings?.upiId || 'ranadarshit99@okicici';
    const activePayee = upiIntentData?.payee_name || restaurantSettings?.payeeName || 'darshit rana';

    try {
      if (upiIntentData?.payment_reference) {
        await verifyPaymentApi({
          paymentReference: upiIntentData.payment_reference,
          tableNumber: currentTable,
          orderId: pendingOrderPayload.id,
          transactionId: activeRef,
          method: 'UPI'
        });
      }
    } catch (e) {
      console.warn('Payment verify api notice:', e);
    }

    setTimeout(() => {
      setIsVerifyingPayment(false);
      playSound('cash');
      const confirmedOrder = {
        ...pendingOrderPayload,
        payment_status: 'Paid',
        payment_verified_online: true,
        transaction_id: activeRef,
        paid_collected_by: `Direct UPI (${activePayee} • ${activeVpa})`
      };
      finalizeAndPlaceOrder(confirmedOrder);
    }, 600);
  };

  // 1. STAGE: 3D INTERACTIVE FOOD SHOWCASE (Displayed on QR Scan / First Touch)
  if (menuStage === 'landing' && !activeTableOrder && !settledSessionReceipt) {
    return (
      <>
        <FoodShowcase3D
          restaurantName={restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
          tableNumber={currentTable}
          onOpenTableSelect={() => setShowTableSelectModal(true)}
          onExploreCuisines={() => {
            try { sessionStorage.setItem('atmiya_seen_landing', 'true'); } catch {}
            setMenuStage('cuisines');
          }}
          onViewAllDishes={() => {
            try { sessionStorage.setItem('atmiya_seen_landing', 'true'); } catch {}
            setSelectedCuisine('all');
            setSelectedCategory('All');
            setMenuStage('dishes');
          }}
          onSelectCuisine={(cuisineId) => {
            try { sessionStorage.setItem('atmiya_seen_landing', 'true'); } catch {}
            setSelectedCuisine(cuisineId);
            setSelectedCategory('All');
            setMenuStage('dishes');
          }}
          onQuickSearch={(query) => {
            try { sessionStorage.setItem('atmiya_seen_landing', 'true'); } catch {}
            setSearchQuery(query);
            setSelectedCuisine('all');
            setSelectedCategory('All');
            setMenuStage('dishes');
          }}
          onOpenConcierge={() => setShowConciergeModal(true)}
          currentLang={currentLang}
          onLanguageChange={onLanguageChange}
        />
      </>
    );
  }

  // 2. STAGE: 4 MASTER CUISINES SELECTION (South Indian, Chinese, Gujarati, Beverages)
  if (menuStage === 'cuisines' && !activeTableOrder && !settledSessionReceipt) {
    return (
      <>
        <CuisineSelector
          restaurantName={restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
          tableNumber={currentTable}
          menuItems={menuItems}
          onSelectCuisine={(cuisineId) => {
            setSelectedCuisine(cuisineId);
            setSelectedCategory('All');
            setMenuStage('dishes');
          }}
          onBackToLanding={() => setMenuStage('landing')}
          onViewAll={() => {
            setSelectedCuisine('all');
            setSelectedCategory('All');
            setMenuStage('dishes');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-36 text-slate-900">
      
      {/* 1. UNIFIED STICKY HEADER - All Navigation, Search, & Categories in One Coherent Sticky Shell */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 space-y-2">
          
          {/* Row 1: Brand, Static Locked Table Badge, Language & Concierge Service */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              {menuStage === 'dishes' ? (
                <button 
                  onClick={() => {
                    setSelectedCuisine('all');
                    setSelectedCategory('All');
                    setMenuStage('cuisines');
                    playSound('click');
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 cursor-pointer flex items-center justify-center"
                  title="Back to Cuisines"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : menuStage === 'cuisines' ? (
                <button 
                  onClick={() => {
                    setMenuStage('landing');
                    playSound('click');
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 cursor-pointer flex items-center justify-center"
                  title="Back to Food Showcase"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : onBackToAdmin ? (
                <button 
                  onClick={onBackToAdmin}
                  className="p-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 transition shrink-0 cursor-pointer flex items-center space-x-1"
                  title={authUser ? "Return to Staff POS" : "Staff Login"}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black hidden sm:inline">{authUser ? 'Exit Preview' : 'Staff Login'}</span>
                </button>
              ) : null}

              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-sm sm:text-base text-slate-900 font-heading truncate tracking-tight">
                    {restaurantSettings?.restaurantName || 'Atmiya Dosa Hub'}
                  </span>
                  
                  {/* Static Verified Table Badge - Tamper-Proof & Non-Clickable */}
                  <div className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-orange-50 border border-orange-200 text-orange-900 flex items-center space-x-1 shrink-0 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Table {cleanTableNum}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                  <span className="inline-flex items-center text-emerald-700 font-bold">
                    {t('pureVeg100')}
                  </span>
                  <span>•</span>
                  <span className="truncate">Petlad, Anand</span>
                </div>
              </div>
            </div>

            {/* Language Selector + Luxury Concierge Service Button */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <div className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-slate-100 border border-slate-200/90 text-slate-700 text-xs font-bold">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <select 
                  value={currentLang} 
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="en">EN</option>
                  <option value="hi">हिन्दी</option>
                  <option value="gu">ગુજરાતી</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowConciergeModal(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
                title="Table Service: Water, Waiter, Bill, Table Cleaning"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{t('service')}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search Bar & Dietary Filter Toggles */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchDishesPlaceholder') || 'Search dishes...'}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition text-slate-900 placeholder-slate-400"
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

            {/* Dietary Toggle Pills (Jain & Spicy) */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setJainOnly(!jainOnly)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                  jainOnly ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Jain (No Onion & Garlic)"
              >
                <span>🌱 {t('jain')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSpicyOnly(!spicyOnly)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                  spicyOnly ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Spicy items only"
              >
                <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span className="hidden xs:inline">{t('spicy')}</span>
              </button>
            </div>
          </div>

          {/* Row 3: Master Cuisines Navigator (Airy, Spacious Horizontal Slider) */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => {
                setSelectedCuisine('all');
                setSelectedCategory('All');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                selectedCuisine === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>🍽️ All</span>
              <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                selectedCuisine === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
              }`}>
                {menuItems.filter(m => !isWaterItem(m)).length}
              </span>
            </button>

            {MASTER_CUISINES.map(cuisine => {
              const isSelected = selectedCuisine === cuisine.id;
              const count = menuItems.filter(m => !isWaterItem(m) && getDishCuisine(m) === cuisine.id).length;
              return (
                <button
                  key={cuisine.id}
                  type="button"
                  onClick={() => {
                    setSelectedCuisine(cuisine.id);
                    setSelectedCategory('All');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs font-black ring-1 ring-orange-500'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-xs">{cuisine.icon}</span>
                  <span>{currentLang === 'gu' ? cuisine.gujarati : cuisine.name}</span>
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-white text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 4: Sub-Category Navigator (Dynamically Scoped to Selected Cuisine) */}
          {availableCategories.length > 1 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar scroll-smooth pt-1 border-t border-slate-100">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 font-semibold'
                  }`}
                >
                  {getCategoryLabel(cat, currentLang)}
                </button>
              ))}
              <span className="text-[10px] text-slate-400 font-mono font-medium whitespace-nowrap pl-1">
                {sortedItems.length} {t('dishesCount')}
              </span>
            </div>
          )}

        </div>
      </header>

      {/* Service Toast Feedback */}
      {serviceNotice && (
        <div className="max-w-md mx-auto mt-3 px-4 animate-bounce">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-950 text-xs font-bold text-center shadow-lg border border-amber-300">
            {serviceNotice}
          </div>
        </div>
      )}


      {/* Active Table Session Banner (Supports Multi-Round & Mineral Water Ordering) */}
      {activeTableOrder && (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 mt-3">
          <div className="p-4 rounded-2xl bg-amber-50/95 border border-amber-300 text-amber-950 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-amber-950 font-heading">
                    {t('tableSessionActive').replace('{table}', currentTable).replace('{id}', String(activeTableOrder.id || '').replace(/^#+/, ''))}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-300 animate-pulse">
                    {activeTableOrder.status || 'Cooking'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                  {t('cookingMealNote')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowOrderTracker(true)}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1 transition cursor-pointer"
              >
                <span>{t('trackFood')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-3 pb-28 sm:pt-4 sm:pb-32 space-y-4">
        
        {/* Out-of-Stock / Cancellation Alert Banner */}
        {recentCancelledOrder && (
          <div className="rounded-2xl p-3.5 bg-rose-50 border border-rose-300 text-rose-950 shadow-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-rose-800 flex items-center space-x-2">
                <span>{t('orderNotice').replace('{table}', currentTable)}</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 font-mono text-[10px] font-bold">
                  {recentCancelledOrder.id}
                </span>
              </div>
              <p className="mt-0.5 font-medium text-rose-900 leading-relaxed">
                {t('orderCancelledDesc')} <span className="font-bold underline">{recentCancelledOrder.cancel_reason}</span>
              </p>
              <p className="text-[10px] text-rose-700 mt-0.5">
                {t('selectAlternativeDish')}
              </p>
            </div>
          </div>
        )}

        {/* Menu Items - Zomato / Swiggy Style Mobile-Ready Stream */}
        {sortedItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 text-center shadow-2xs my-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 mx-auto flex items-center justify-center text-3xl shadow-inner">
              🍽️
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">
              {searchQuery || selectedCategory !== 'All' ? 'No dishes match your filter' : 'Menu Under Preparation'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try selecting "All" categories or clearing your search keywords.'
                : 'The kitchen is preparing fresh dishes. Please ask your table server or check back in a moment!'}
            </p>
            {(searchQuery || selectedCategory !== 'All' || selectedCuisine !== 'all' || jainOnly || spicyOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedCuisine('all');
                  setJainOnly(false);
                  setSpicyOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition cursor-pointer shadow-xs"
              >
                View All Dishes
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {sortedItems.map(item => {
            const qty = getItemCartQty(item.id);
            const currentItemPrice = item.finalPrice || item.price;
            const originalItemPrice = item.originalPrice || item.price;
            const culinaryMeta = getDishCulinaryMeta(item, currentLang, t);
            const primaryName = currentLang === 'gu'
              ? getDishDisplayName(item, 'gu')
              : getDishDisplayName(item, 'en');
            const secondaryName = currentLang === 'gu'
              ? getDishDisplayName(item, 'en')
              : getDishDisplayName(item, 'gu');
            const categoryLabel = getCategoryLabel(item.category, currentLang);

            return (
              <div 
                key={item.id} 
                className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex items-stretch justify-between gap-3 sm:gap-4 relative group min-h-[148px]"
              >
                {/* Left: Gastronomy Details & Pricing */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    {/* Top Meta Row: Pure Veg Symbol + Ratings / Bestseller Tag */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mb-1.5">
                      {/* Authentic FSSAI Pure Veg Green Mark */}
                      <div className="w-4 h-4 rounded-xs border border-emerald-600 bg-white flex items-center justify-center p-0.5 shadow-2xs shrink-0" title="100% Pure Veg">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                      </div>

                      {/* Rating / Orders Badge */}
                      <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-black font-mono">
                        <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                        <span>4.8</span>
                        <span className="text-slate-400 font-normal">({item.orders_count || 40}+)</span>
                      </span>

                      {/* Bestseller Tag */}
                      {(item.orders_count > 25 || item.is_featured) && (
                        <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-800 font-black text-[9px] uppercase tracking-wider">
                          🔥 Bestseller
                        </span>
                      )}

                      {item.is_jain_available && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[9px]">
                          {t('jain')}
                        </span>
                      )}
                    </div>

                    {/* Dish Primary Name */}
                    <h3 
                      className="font-heading font-black text-sm sm:text-base text-slate-900 leading-snug group-hover:text-orange-600 transition-colors cursor-pointer"
                      onClick={() => handleOpenCustomizer(item)}
                      title={primaryName}
                    >
                      {primaryName}
                    </h3>

                    {/* Secondary Name (Gujarati/Regional script) */}
                    {secondaryName && secondaryName !== primaryName && (
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {secondaryName}
                      </p>
                    )}

                    {/* Price Row */}
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                      <span className="font-heading font-black text-sm sm:text-base text-slate-950">
                        ₹{currentItemPrice}
                      </span>
                      {item.hasDiscount && originalItemPrice > currentItemPrice && (
                        <>
                          <span className="text-xs line-through text-slate-400 font-mono">
                            ₹{originalItemPrice}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-mono font-black text-[9px] uppercase tracking-wider shadow-2xs">
                            {item.discountPercent || Math.round((1 - currentItemPrice / originalItemPrice) * 100)}% OFF
                          </span>
                        </>
                      )}
                    </div>

                    {/* Appetizing Dish Description */}
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-1">
                      {item.description || (
                        item.category?.toLowerCase().includes('dosa') 
                          ? "Crispy tawa golden dosa roasted with pure Amul butter and savory fillings. Served with fresh coconut chutney & piping hot sambar."
                          : item.category?.toLowerCase().includes('pav')
                            ? "Rich spiced tawa bhaji with fresh coriander and soft toasted Amul butter pavs."
                            : item.category?.toLowerCase().includes('chinese')
                              ? "Fresh wok-tossed specialty with crisp veggies and authentic tangy sauces."
                              : "Authentic chef specialty prepared fresh on order with hand-ground spices."
                      )}
                    </p>
                  </div>

                  {/* Customise Link */}
                  <div className="mt-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenCustomizer(item)}
                      className="text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200/70 inline-flex items-center space-x-1 cursor-pointer transition"
                    >
                      <span>✨ Customise</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Right: Dish Photo & The Signature Overlapping Zomato ADD / Stepper Button */}
                <div className="w-24 sm:w-32 shrink-0 flex flex-col items-center justify-between pb-1 relative select-none">
                  {/* Photo Container - Explicit Height for Both Mobile (h-24 = 96px) and Desktop (sm:h-28 = 112px) */}
                  <div 
                    onClick={() => handleOpenCustomizer(item)}
                    className="w-24 h-24 sm:w-32 sm:h-28 rounded-2xl overflow-hidden relative shadow-2xs border border-stone-200/90 bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center cursor-pointer group-hover:border-orange-300 transition"
                  >
                    {(() => {
                      let dishPhoto = item.image_url || item.imageUrl || item.image || item.photo;
                      if (dishPhoto && typeof dishPhoto === 'string') {
                        dishPhoto = dishPhoto.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000\//i, '/');
                        if (dishPhoto.startsWith('uploads/')) dishPhoto = '/' + dishPhoto;
                      }
                      return (
                        <>
                          {dishPhoto ? (
                            <img 
                              src={dishPhoto} 
                              alt={primaryName} 
                              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.dish-meta-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="dish-meta-fallback flex flex-col items-center justify-center space-y-1 text-center p-2"
                            style={{ display: dishPhoto ? 'none' : 'flex' }}
                          >
                            <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-amber-200 flex items-center justify-center text-xl group-hover:scale-110 transition">
                              {culinaryMeta.symbol}
                            </div>
                            <span className="text-[8.5px] font-bold text-amber-900/80 uppercase tracking-wider font-mono line-clamp-1">
                              {culinaryMeta.label}
                            </span>
                          </div>
                        </>
                      );
                    })()}


                    {/* Top Left: Prep Time */}
                    {item.prepTimeMins && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[8.5px] font-mono font-bold flex items-center space-x-0.5">
                        <Clock className="w-2.5 h-2.5 text-amber-300" />
                        <span>{item.prepTimeMins}m</span>
                      </span>
                    )}

                    {/* Top Right: Spicy */}
                    {item.is_spicy && (
                      <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded-md bg-rose-600/90 text-white text-[8.5px] font-bold shadow-2xs">
                        🌶️
                      </span>
                    )}
                  </div>

                  {/* The Signature Overlapping ADD Pill Button */}
                  <div className="-mt-3.5 z-10 w-22 sm:w-28">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(item);
                        }}
                        className={`w-full py-1 sm:py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                          activeTableOrder 
                            ? 'bg-white hover:bg-amber-50 text-amber-700 border-2 border-amber-600'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border-2 border-emerald-600'
                        }`}
                        title={activeTableOrder ? "Add extra item to Table session" : "Add item to cart"}
                      >
                        <span>{activeTableOrder ? t('extra') : t('add')}</span>
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    ) : (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-1 sm:py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md flex items-center justify-between px-2 cursor-default"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="w-5 h-5 rounded hover:bg-emerald-700 flex items-center justify-center active:scale-90 transition cursor-pointer"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="font-mono text-xs font-black">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(item)}
                          className="w-5 h-5 rounded hover:bg-emerald-700 flex items-center justify-center active:scale-90 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subtle Customizable Hint */}
                  <span className="text-[8px] sm:text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 text-center">
                    customisable
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        )}

      </main>

      {/* 3. DISH CUSTOMIZATION MODAL */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  {getDishDisplayName(customizingItem, currentLang)}
                </h3>
                <span className="text-xs font-mono font-bold text-orange-600">
                  {t('basePrice')}: ₹{customizingItem.finalPrice || customizingItem.price}
                </span>
              </div>
              <button 
                onClick={() => setCustomizingItem(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dish Photo Preview Banner if available */}
            {(() => {
              let custPhoto = customizingItem.image_url || customizingItem.imageUrl || customizingItem.image || customizingItem.photo;
              if (custPhoto && typeof custPhoto === 'string') {
                custPhoto = custPhoto.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000\//i, '/');
                if (custPhoto.startsWith('uploads/')) custPhoto = '/' + custPhoto;
              }
              if (!custPhoto) return null;
              return (
                <div className="w-full h-32 rounded-2xl overflow-hidden relative border border-slate-200 shadow-2xs mb-1">
                  <img 
                    src={custPhoto} 
                    alt={getDishDisplayName(customizingItem, currentLang)} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              );
            })()}

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                {t('selectCustomizations')}
              </span>

              {/* Extra Butter */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🧈</span>
                  <div>
                    <div className="text-xs font-black text-slate-900">{t('extraAmulButter')}</div>
                    <span className="text-[10px] text-slate-400">{t('richButterLayer')}</span>
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
                    <div className="text-xs font-black text-slate-900">{t('extraAmulCheese')}</div>
                    <span className="text-[10px] text-slate-400">{t('moltenCheeseTopping')}</span>
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
                    <div className="text-xs font-black text-slate-900">{t('jainPrep')}</div>
                    <span className="text-[10px] text-slate-400">{t('noOnionGarlic')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-emerald-700">{t('free')}</span>
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
                <span className="text-[10px] text-slate-400 block font-semibold">{t('totalItemPrice')}</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  ₹{(Number(customizingItem.finalPrice || customizingItem.price) + (extraButter ? 20 : 0) + (extraCheese ? 30 : 0))}
                </span>
              </div>

              <button
                onClick={handleAddCustomizedToCart}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                {t('addToOrder')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. FLOATING BOTTOM CART BAR - TOUCHLESS ORDER SUMMARY */}
      {totalCartCount > 0 && !showCartDrawer && (
        <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setShowCartDrawer(true)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white font-black text-sm shadow-xl flex items-center justify-between border border-orange-400 hover:from-orange-700 hover:to-amber-600 active:scale-[0.99] transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-white text-orange-600 flex items-center justify-center font-black text-xs font-mono shadow-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-orange-100">
                  {totalCartCount} {t('dishesInCart')}
                </div>
                <div className="text-sm font-black font-mono text-white">₹{totalAmount.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-white text-orange-600 hover:bg-orange-50 px-3.5 py-1.5 rounded-xl font-black text-xs shadow-xs uppercase tracking-wider transition">
              <span>{t('viewCart')}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </button>
        </div>
      )}

      {/* 5. FLOATING LIVE ORDER TRACKER BAR (When Table Has Active Order in Kitchen Queue) */}
      {activeTableOrder && !showOrderTracker && !showCartDrawer && totalCartCount === 0 && (() => {
        const tableOrders = orders.filter(o => isTableMatch(o.table_number, currentTable) && isOrderActive(o));
        const allDishes = [];
        tableOrders.forEach(ord => {
          const resolved = resolveCustomerOrderItems(ord, menuItems);
          resolved.forEach(it => allDishes.push(it));
        });
        const totalItemsCount = allDishes.length;
        const totalQuantityCount = allDishes.reduce((sum, it) => sum + (it.qty || it.quantity || 1), 0);
        const deliveredItemsCount = allDishes.filter(it => it.is_served).length;
        const allServed = deliveredItemsCount === totalItemsCount && totalItemsCount > 0;

        return (
          <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-40 max-w-md mx-auto">
            <button
              onClick={() => setShowOrderTracker(true)}
              className={`w-full py-3 px-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-between border active:scale-[0.99] transition cursor-pointer ${
                allServed 
                  ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950 hover:bg-emerald-100/80' 
                  : deliveredItemsCount > 0 
                    ? 'bg-amber-50 border-2 border-amber-400 text-amber-950 hover:bg-amber-100/80' 
                    : 'bg-orange-50 border-2 border-orange-400 text-orange-950 hover:bg-orange-100/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs font-mono shadow-xs ${
                  allServed ? 'bg-emerald-600' : deliveredItemsCount > 0 ? 'bg-amber-500' : 'bg-orange-500'
                }`}>
                  {allServed ? '✓' : <Clock className="w-4 h-4 animate-spin text-white" style={{ animationDuration: '4s' }} />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold leading-tight flex items-center space-x-1.5">
                    <span>
                      {allServed 
                        ? 'All Dishes Served to Table' 
                        : deliveredItemsCount > 0 
                          ? `${deliveredItemsCount}/${totalItemsCount} Dishes Delivered` 
                          : t('orderInKitchen').replace('{id}', String(activeTableOrder.id || '').replace(/^#+/, ''))}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${allServed ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`}></span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium capitalize">
                    {deliveredItemsCount > 0 
                      ? `${deliveredItemsCount} on table • ${totalItemsCount - deliveredItemsCount} cooking` 
                      : `${totalItemsCount} ${t('itemsCount')} • Cooking on Tawa`}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs">
                <span>{t('trackFood')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        );
      })()}

      {/* 6. CART CHECKOUT DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  {t('tableOrderTitle').replace('{table}', currentTable)}
                </h3>
              </div>
              <button 
                onClick={() => setShowCartDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Session Add-On Indicator */}
            {activeTableOrder && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🥞</span>
                    <div>
                      <span className="font-black text-amber-950 block">Adding to Active Bill {activeOrderDisplayId}</span>
                      <span className="text-[10px] text-amber-800">Table {currentTable} • New dishes will be added into your existing running bill</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900 shrink-0">
                    Unified Bill
                  </span>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-3 divide-y divide-slate-100">
              {cart.map(item => {
                const itemPhoto = item.image_url || item.imageUrl || item.image || item.photo;
                return (
                  <div key={item.cartItemId || item.id} className="pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                      {itemPhoto ? (
                        <img 
                          src={itemPhoto} 
                          alt={getDishDisplayName(item, currentLang)} 
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-base shadow-2xs">
                          🍽️
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 font-heading truncate">
                          {getDishDisplayName(item, currentLang)}
                        </h4>
                        <span className="text-xs font-mono font-bold text-slate-500">₹{item.price} each</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-100 rounded-xl p-1 shrink-0">
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
                );
              })}
            </div>

            {/* Special Instructions Note — Prominent & Highly Visible */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 border-2 border-amber-300 shadow-2xs space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-black text-amber-950">
                <span className="text-base">📝</span>
                <span>{t('specialInstructions') || 'Special Cooking Instructions'}</span>
                <span className="text-[10px] font-bold text-amber-700 font-mono">(ખાસ સૂચના)</span>
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Extra crisp dosa, less spicy, no onion in sambhar / તીખું બનાવજો, ઓછું તેલ..."
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition shadow-inner"
              ></textarea>
              <p className="text-[10px] text-amber-800 font-medium flex items-center space-x-1">
                <span>⚡ Sent directly to kitchen chef screen in bold highlight</span>
              </p>
            </div>



            {/* Guest Details & Permanent CRM Association (Required for Table Dining) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 font-heading flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-orange-600" />
                    <span>{t('guestDetails').replace('{table}', currentTable)}</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {t('guestRequiredNote')}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200">
                  {t('required')}
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
                    {t('yourName')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder={t('namePlaceholder')}
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
                    {t('mobileNumber')} <span className="text-rose-500">*</span>
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

            {/* Single Method: Cash on Delivery / Pay at Counter (COD) */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 font-heading">
                  {t('choosePayment')}
                </label>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Cash Only • COD
                </span>
              </div>

              {/* Cash on Delivery / Pay at Counter Option */}
              <div
                data-testid="payment-mode-cash"
                className="p-3 rounded-2xl border-2 bg-amber-50/70 border-amber-500 ring-2 ring-amber-400/20 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm shadow-xs font-bold shrink-0">
                    💵
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 font-heading block">
                      {t('codTitle')}
                    </span>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      {t('codDesc')}
                    </p>
                  </div>
                </div>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </span>
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
            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-slate-600">
                <span>{t('subtotal')}:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-600">
                <span>{t('tax')} (5% GST):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>


              {activeTableOrder && (
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-amber-900">
                    <span>Existing Bill ({activeOrderDisplayId}):</span>
                    <span>₹{Number(activeTableOrder.total || activeTableOrder.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-900">
                    <span>New Dishes Added:</span>
                    <span className="text-emerald-700 font-bold">+₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-950 font-black border-t border-amber-200 pt-1 text-sm">
                    <span>Updated Table Bill:</span>
                    <span className="text-orange-700">₹{(Number(activeTableOrder.total || activeTableOrder.total_amount || 0) + totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200 font-heading">
                <span>{activeTableOrder ? 'Add-on Amount Due' : t('totalToPay')}</span>
                <span className="text-orange-600 font-mono text-lg">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-orange-500/25 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>
                {activeTableOrder 
                  ? `Add to Existing Bill ${activeOrderDisplayId} • +₹${totalAmount.toFixed(2)}`
                  : t('confirmOrderBtn').replace('{table}', currentTable).replace('{amount}', totalAmount.toFixed(2))}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      )}

      {/* 7. LIVE ORDER PROGRESS TRACKER MODAL */}
      {showOrderTracker && activeTableOrder && (() => {
        const activeTableOrders = orders.filter(o => isTableMatch(o.table_number, currentTable) && isOrderActive(o));
        const allTableItems = [];
        activeTableOrders.forEach(ord => {
          const resolved = resolveCustomerOrderItems(ord, menuItems);
          resolved.forEach(it => {
            allTableItems.push({
              ...it,
              orderId: ord.id,
              orderNumber: ord.order_number || ord.id,
              orderStatus: ord.status,
              isServed: Boolean(it.is_served)
            });
          });
        });

        const totalDishes = allTableItems.length;
        const totalQuantityCount = allTableItems.reduce((sum, it) => sum + (it.qty || it.quantity || 1), 0);
        const deliveredDishes = allTableItems.filter(it => it.isServed).length;
        const cookingDishes = allTableItems.filter(it => !it.isServed).length;
        const progressPercent = totalDishes > 0 ? Math.round((deliveredDishes / totalDishes) * 100) : 0;
        const allDelivered = deliveredDishes === totalDishes && totalDishes > 0;

        const statusLower = (activeTableOrder.status || '').toLowerCase().trim();
        const isReady = statusLower === 'ready';
        const isServed = allDelivered || statusLower === 'served' || statusLower === 'completed';
        const isCooking = statusLower === 'cooking' || statusLower === 'preparing';
        const isPlaced = statusLower === 'placed' || statusLower === 'pending';

        const totalTableBill = activeTableOrders.reduce((acc, o) => acc + Number(o.total || o.total_amount || 0), 0);
        const totalSubtotal = activeTableOrders.reduce((acc, o) => acc + Number(o.subtotal || 0), 0) || Math.round(totalTableBill / 1.05);
        const totalTax = activeTableOrders.reduce((acc, o) => acc + Number(o.tax || 0), 0) || Math.round(totalTableBill - totalSubtotal);

        // Filter dishes for customer view ('all' | 'cooking' | 'delivered')
        const displayedDishes = allTableItems.filter(it => {
          if (trackerFilter === 'cooking') return !it.isServed;
          if (trackerFilter === 'delivered') return it.isServed;
          return true; // 'all'
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 font-heading">
                      Order {activeTableOrders.map(o => `#${String(o.id || o.order_number || '').replace(/^#+/, '')}`).join(', ')}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      allDelivered 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : (deliveredDishes > 0)
                          ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'
                          : 'bg-orange-100 text-orange-800 border-orange-200'
                    }`}>
                      {allDelivered 
                        ? 'All Served' 
                        : (deliveredDishes > 0)
                          ? `${deliveredDishes}/${totalDishes} Served` 
                          : (activeTableOrder.status || 'Cooking')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono block mt-0.5">
                    {t('assignedTable')} {t('table')} {currentTable} • {totalDishes} Dishes ({totalQuantityCount} Plates)
                  </span>
                </div>
                <button 
                  onClick={() => setShowOrderTracker(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer shrink-0 ml-2"
                  title="Close Tracker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Dish Delivery Progress Meter */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
                    <span>Table Delivery Progress</span>
                  </span>
                  <span className="font-mono font-black text-emerald-700">
                    {deliveredDishes}/{totalDishes} Delivered ({progressPercent}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      allDelivered ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                {allDelivered && totalDishes > 0 ? (
                  <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-300 flex items-center space-x-1.5">
                    <span>🎉</span>
                    <span>{t('allDishesDelivered')}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                    <span>{deliveredDishes} delivered • {cookingDishes} cooking</span>
                    <span className="font-mono font-bold text-orange-600">{progressPercent}%</span>
                  </div>
                )}
              </div>

              {/* ORDERED DISHES INSPECTOR & LIVE STATUS CHECKLIST */}
              <div className="space-y-2 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Utensils className="w-3.5 h-3.5 text-orange-600" />
                    <span>Ordered Dishes · શું ઓર્ડર કર્યું છે</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {totalDishes} Items
                  </span>
                </div>

                {/* Status Filter Chips: All, Cooking, Delivered */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTrackerFilter('all')}
                    className={`flex-1 py-1.5 px-1.5 rounded-lg text-center transition cursor-pointer ${
                      trackerFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({totalDishes})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackerFilter('cooking')}
                    className={`flex-1 py-1.5 px-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1 ${
                      trackerFilter === 'cooking'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🔥 Cooking</span>
                    <span>({cookingDishes})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackerFilter('delivered')}
                    className={`flex-1 py-1.5 px-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1 ${
                      trackerFilter === 'delivered'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>✔ Served</span>
                    <span>({deliveredDishes})</span>
                  </button>
                </div>

                {/* Dishes Cards List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {displayedDishes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-medium border border-dashed border-slate-200">
                      No dishes found in this filter tab.
                    </div>
                  ) : (
                    displayedDishes.map((it, idx) => {
                      const dishServed = it.isServed;
                      const kitchenStatus = (it.kitchen_status || '').toLowerCase();
                      const isReady = kitchenStatus === 'ready';
                      const isCooking = kitchenStatus === 'preparing' || kitchenStatus === 'cooking';
                      const isPlaced = kitchenStatus === 'placed' || !kitchenStatus;
                      const itemPhoto = it.image_url || it.imageUrl || it.image || it.photo;
                      const gujaratiTitle = getDishDisplayName(it, 'gu');

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all ${
                            dishServed
                              ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
                              : isReady
                                ? 'bg-teal-50 border-teal-300 text-teal-950 shadow-xs'
                                : isCooking
                                  ? 'bg-orange-50/60 border-orange-200 text-orange-950'
                                  : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                              {/* Quantity Badge */}
                              <span className={`w-7 h-7 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                                dishServed 
                                  ? 'bg-emerald-600 text-white' 
                                  : isReady 
                                    ? 'bg-teal-600 text-white' 
                                    : isCooking 
                                      ? 'bg-orange-600 text-white animate-pulse' 
                                      : 'bg-slate-900 text-white'
                              }`}>
                                {it.qty || it.quantity || 1}×
                              </span>

                              {itemPhoto && (
                                <img
                                  src={itemPhoto}
                                  alt={it.name}
                                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs bg-slate-100"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className={`text-xs font-bold leading-snug ${
                                    dishServed ? 'line-through text-slate-500' : 'text-slate-900 font-extrabold'
                                  }`}>
                                    {it.name}
                                  </h4>
                                  {gujaratiTitle && gujaratiTitle !== it.name && (
                                    <span className="text-[11px] font-bold text-slate-600">
                                      ({gujaratiTitle})
                                    </span>
                                  )}
                                </div>

                                {/* Custom notes & Round Add-on badge */}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {it.is_addon && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200">
                                      ⚡ Round {it.round || 2} Add-On
                                    </span>
                                  )}

                                  {it.price > 0 && (
                                    <span className="text-[10px] font-mono font-semibold text-slate-500">
                                      ₹{it.price} each {Number(it.qty || it.quantity) > 1 && `• ₹${(it.price * (it.qty || it.quantity)).toFixed(2)}`}
                                    </span>
                                  )}
                                </div>

                                {it.cooking_note && (
                                  <div className="mt-1 text-[10px] text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200 font-bold inline-block">
                                    📝 {it.cooking_note}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="shrink-0 text-right">
                              {dishServed ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Served</span>
                                </span>
                              ) : isReady ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-600 text-white text-[10px] font-bold shadow-xs animate-bounce">
                                  <span>🍽️</span>
                                  <span>Ready</span>
                                </span>
                              ) : isCooking ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-[10px] font-bold animate-pulse">
                                  <span>🔥</span>
                                  <span>Cooking</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold">
                                  <span>⏳</span>
                                  <span>Queued</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dynamic 3-Step Live Progress Timeline */}
              <div className="space-y-2 py-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Kitchen Progress Timeline
                </span>
                <div className="flex items-center justify-between text-xs">
                  {/* Step 1: Placed */}
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      ✓
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">KOT Fired</span>
                  </div>
                  <div className="w-6 h-0.5 bg-emerald-300"></div>

                  {/* Step 2: Cooking */}
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isReady || isServed 
                        ? 'bg-emerald-500 text-white' 
                        : (isCooking || isPlaced ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500')
                    }`}>
                      {isReady || isServed ? '✓' : '🍳'}
                    </div>
                    <span className={`text-[11px] font-bold ${isCooking || isPlaced ? 'text-orange-900' : 'text-slate-800'}`}>Cooking</span>
                  </div>
                  <div className={`w-6 h-0.5 ${isServed || isReady ? 'bg-emerald-300' : 'bg-slate-200'}`}></div>

                  {/* Step 3: Served */}
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isServed 
                        ? 'bg-emerald-500 text-white' 
                        : (isReady ? 'bg-teal-500 text-white animate-bounce' : 'bg-slate-200 text-slate-500')
                    }`}>
                      {isServed ? '✓' : '🍽️'}
                    </div>
                    <span className={`text-[11px] font-bold ${isServed ? 'text-emerald-900' : (isReady ? 'text-teal-900' : 'text-slate-500')}`}>
                      {allDelivered ? 'All Served' : 'Serving'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick More Food Add-on Bar */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <UtensilsCrossed className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">Need extra dosas, chaas or dishes while waiting?</span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderTracker(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition cursor-pointer shadow-xs"
                  >
                    + Add Food
                  </button>
                </div>
              </div>

              {/* Itemized Bill Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Dishes Subtotal</span>
                  <span>₹{totalSubtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>CGST (2.5%)</span>
                  <span>₹{(Number(totalTax || 0) / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>SGST (2.5%)</span>
                  <span>₹{(Number(totalTax || 0) / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-sm font-black text-slate-900">
                  <span>{t('billTotal')}</span>
                  <span className="text-base text-orange-600">₹{totalTableBill || activeTableOrder.total || activeTableOrder.total_amount}</span>
                </div>
              </div>

              {/* Gated Official Bill Access in Order Tracker */}
              {isPaymentConfirmed ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      downloadSinglePageBillPdf({
                        order: activeBillOrder || activeTableOrder,
                        restaurantSettings,
                        customerName,
                        customerPhone,
                        currentTable
                      });
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    <span>Download Bill (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      printSinglePageReceipt({
                        order: activeBillOrder || activeTableOrder,
                        restaurantSettings,
                        customerName,
                        customerPhone,
                        currentTable
                      });
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Bill</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-medium">Cash due at table • Bill unlocks upon staff confirmation</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md shrink-0">
                    Bill Locked
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowOrderTracker(false)}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer transition shadow-xs"
              >
                {t('closeTracker')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* 7. TABLE CONCIERGE SERVICE BOTTOM SHEET / MODAL */}
      {showConciergeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-slate-900 animate-slideUp">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0 shadow-xs">
                  🛎️
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-heading">
                    {t('tableConciergeTitle').replace('{table}', currentTable)}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {t('conciergeSub')}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowConciergeModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Service Action Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* 1. Call Floor Waiter */}
              <button
                type="button"
                onClick={() => {
                  setShowConciergeModal(false);
                  handleServiceButton('WAITER', 'Floor Waiter');
                }}
                className="p-3.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/90 text-left transition active:scale-98 flex items-start space-x-3 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs text-base group-hover:scale-105 transition">
                  <BellRing className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-amber-950 block">{t('callWaiter')}</span>
                  <p className="text-[10px] text-amber-800/90 mt-0.5 leading-snug">
                    {t('callWaiterDesc')}
                  </p>
                </div>
              </button>

              {/* 2. Request Final Bill */}
              <button
                type="button"
                onClick={() => {
                  setShowConciergeModal(false);
                  handleServiceButton('BILL', 'Final Bill');
                }}
                className="p-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/90 text-left transition active:scale-98 flex items-start space-x-3 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs text-base group-hover:scale-105 transition">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-emerald-950 block">{t('requestBill')}</span>
                  <p className="text-[10px] text-emerald-800/90 mt-0.5 leading-snug">
                    {t('requestBillDesc')}
                  </p>
                </div>
              </button>

              {/* 3. Table Clean & Napkins */}
              <button
                type="button"
                onClick={() => {
                  setShowConciergeModal(false);
                  handleServiceButton('CLEAN', 'Table Clean & Napkins');
                }}
                className="p-3.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/90 text-left transition active:scale-98 flex items-start space-x-3 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs text-base group-hover:scale-105 transition">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-blue-950 block">{t('cleanTable')}</span>
                  <p className="text-[10px] text-blue-800/90 mt-0.5 leading-snug">
                    {t('cleanTableDesc')}
                  </p>
                </div>
              </button>

            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowConciergeModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {t('closeService')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 9. PAYMENT SUCCESSFUL & TAX INVOICE BILL DOWNLOAD MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full my-auto text-center space-y-4 shadow-2xl border border-slate-200 animate-slideUp">
            
            {/* Success Glowing Icon */}
            <div className="relative mx-auto w-14 h-14">
              <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                ✓
              </div>
            </div>

            {/* Title & Amount Paid */}
            <div className="space-y-1">
              <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                isPaymentConfirmed
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border border-amber-300 text-amber-800'
              }`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${isPaymentConfirmed ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>
                  {isPaymentConfirmed
                    ? 'Payment Received & Confirmed ✓'
                    : (activeBillOrder?.payment_mode === 'UPI' ? 'Order Placed • UPI Awaiting Verification' : 'Order Placed • Cash Due at Table / Counter')}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                {isPaymentConfirmed ? 'Dining Order Confirmed & Paid!' : 'Dining Order Placed & In Kitchen!'}
              </h3>
              <div className="text-3xl font-black font-mono text-emerald-600 pt-0.5">
                ₹{Number(activeBillOrder?.total || activeBillOrder?.total_amount || 0).toFixed(2)}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Order <span className="font-mono font-bold text-orange-600">{activeBillOrder?.id || placedOrderId}</span> • Table <span className="font-bold text-slate-900">{currentTable}</span>
              </p>
            </div>

            {/* Detailed Itemized Tax Invoice Bill Box (Printable & Downloadable) */}
            <div id="customer-printable-bill" className="printable-area p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-3">
              
              {/* Restaurant Header */}
              <div className="text-center pb-2.5 border-b border-dashed border-slate-300 space-y-0.5">
                <div className="font-black text-slate-900 text-sm tracking-wide">
                  {restaurantSettings?.restaurantName || 'ATMIYA DOSA HUB'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {restaurantSettings?.tagline || 'Pure Veg Authentic Taste • Petlad'}
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  GSTIN: {restaurantSettings?.gstin || '24AAACA1234A1Z5'} • Ph: {restaurantSettings?.phone || '+91 63530 59221'}
                </div>
              </div>

              {/* Order Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-dashed border-slate-300">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Guest Details</span>
                  <span className="font-bold text-slate-800">{customerName || 'Guest'}</span>
                  <div className="text-[10px] font-mono text-slate-500">{customerPhone ? `+91 ${customerPhone}` : 'Walk-in'}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Order Reference</span>
                  <span className="font-mono font-black text-slate-900">{activeBillOrder?.id || placedOrderId}</span>
                  <div className="text-[10px] text-slate-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              {/* Ordered Dishes Table */}
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <span>Item</span>
                  <span className="text-right">Qty & Price</span>
                </div>
                {(activeBillOrder?.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-medium text-slate-800">
                    <span className="truncate pr-2">
                      <span className="font-bold text-slate-900">{it.qty}x</span> {it.name}
                      {it.is_addon && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Add-on
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{(Number(it.price) * it.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals & Tax Calculation */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-mono font-bold">₹{Number(activeBillOrder?.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(activeBillOrder?.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount Applied:</span>
                    <span className="font-mono">-₹{Number(activeBillOrder?.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                {/* Statutory GST Tax Box */}
                <div className="p-2.5 my-1.5 bg-white rounded-xl border border-slate-200 space-y-1 text-[11px]">
                  <div className="font-bold text-slate-800 border-b border-dashed border-slate-200 pb-1 flex justify-between">
                    <span>GST TAX INVOICE DETAILS</span>
                    <span className="text-[10px] text-slate-500 font-normal">SAC: 996331</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Value of Supply:</span>
                    <span className="font-mono font-bold text-slate-700">₹{Math.max(0, Number(activeBillOrder?.subtotal || 0) - Number(activeBillOrder?.discount || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST @ 2.5%):</span>
                    <span className="font-mono font-bold">₹{(Number(activeBillOrder?.tax || 0) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST @ 2.5%):</span>
                    <span className="font-mono font-bold">₹{(Number(activeBillOrder?.tax || 0) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-200 pt-1">
                    <span>Total GST Tax (5%):</span>
                    <span className="font-mono">₹{Number(activeBillOrder?.tax || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1.5 border-t border-slate-300">
                  <span>{isPaymentConfirmed ? 'Grand Total Paid:' : 'Grand Total Due:'}</span>
                  <span className="font-mono text-emerald-700 text-base">₹{Number(activeBillOrder?.total || activeBillOrder?.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Verification Stamp */}
              <div className={`p-2.5 rounded-xl border text-[10px] space-y-1 ${
                isPaymentConfirmed ? 'bg-white border-slate-200' : 'bg-amber-50/80 border-amber-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Payment Method:</span>
                  <span className={`font-bold flex items-center space-x-1 ${
                    isPaymentConfirmed ? 'text-emerald-700' : 'text-amber-800'
                  }`}>
                    {isPaymentConfirmed ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    <span>{activeBillOrder?.payment_mode || 'Cash on Delivery'}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Payment Status:</span>
                  <span className={`font-mono font-bold ${isPaymentConfirmed ? 'text-emerald-700' : 'text-amber-900'}`}>
                    {isPaymentConfirmed 
                      ? `PAID (Verified by ${activeBillOrder?.paid_collected_by || 'Staff'})` 
                      : 'PENDING CASH COLLECTION'}
                  </span>
                </div>
                {activeBillOrder?.transaction_id && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-mono">
                    <span className="text-slate-500 font-bold">Payment Reference:</span>
                    <span className="font-bold text-slate-900 select-all">{activeBillOrder.transaction_id}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Action Buttons: Gated Bill Download, Track Order, and Add More Dishes */}
            <div className="space-y-2 pt-1 print:hidden">
              
              {!isPaymentConfirmed ? (
                /* Gated State: Locked until Admin / Staff confirms cash payment */
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-left space-y-1.5 shadow-xs">
                    <div className="flex items-center space-x-2 text-amber-900 font-black text-xs">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Official Tax Bill PDF Locked</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Please pay <strong>₹{Number(activeBillOrder?.total || activeBillOrder?.total_amount || 0).toFixed(2)}</strong> in cash to your waiter or at the cashier counter. Once our staff confirms payment, your <strong>Official Single-Page Bill (PDF)</strong> will unlock automatically right here.
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-amber-700 font-mono pt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>Listening for cashier payment confirmation in real-time...</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="w-full py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs flex items-center justify-center space-x-2 cursor-not-allowed opacity-80"
                    title="Bill download unlocks once cashier/waiter confirms payment"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Bill PDF Unlocks After Staff Confirms Payment</span>
                  </button>
                </div>
              ) : (
                /* Unlocked State: Payment Confirmed by Admin / Staff */
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-left flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-900">
                          Payment Confirmed by {activeBillOrder?.paid_collected_by || 'Staff'}!
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          Official Single-Page Tax Invoice is ready to download or print.
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[9px] font-black uppercase">
                      Paid ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        downloadSinglePageBillPdf({
                          order: activeBillOrder,
                          restaurantSettings,
                          customerName,
                          customerPhone,
                          currentTable
                        });
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-orange-400" />
                      <span>Download Bill (PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        printSinglePageReceipt({
                          order: activeBillOrder,
                          restaurantSettings,
                          customerName,
                          customerPhone,
                          currentTable
                        });
                      }}
                      className="py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>Print 1-Page Receipt</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(false);
                    setShowOrderTracker(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Live Kitchen Tracker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5 text-slate-500" />
                  <span>Order More Food</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 10. INTERACTIVE UPI PAYMENT GATEWAY MODAL (REMOVED - COD ONLY) */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Instant UPI Payment
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Table {currentTable} • Safe & Encrypted
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowUpiPaymentModal(false);
                  setShowCartDrawer(true);
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verified Payee Header Card */}
            {(() => {
              const activeVpa = upiIntentData?.vpa || restaurantSettings?.upiId || 'ranadarshit99@okicici';
              const activePayee = upiIntentData?.payee_name || restaurantSettings?.payeeName || 'darshit rana';
              const encodedPayee = encodeURIComponent(activePayee);
              const rawAmount = Number(pendingOrderPayload?.total_amount ?? totalAmount ?? 0);
              const amountStr = rawAmount.toFixed(2);
              const noteStr = `Table_${currentTable}`;
              const genericUpiUrl = upiIntentData?.upi_intent_url || `upi://pay?pa=${activeVpa}&pn=${encodedPayee}&am=${amountStr}&cu=INR&tn=${noteStr}`;
              const gpayUrl = genericUpiUrl;
              const phonepeUrl = genericUpiUrl;
              const paytmUrl = genericUpiUrl;

              return (
                <div className="space-y-4">
                  
                  {/* Verified Payee Banner */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white">
                        DR
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-black text-slate-900 text-xs truncate capitalize">
                            {activePayee}
                          </span>
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate select-all">
                          {activeVpa}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyUpiId(activeVpa)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center space-x-1 transition shadow-2xs shrink-0 cursor-pointer"
                    >
                      {upiCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-black">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bill Amount Spotlight */}
                  <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Bill Amount
                    </span>
                    <div className="text-3xl font-black font-mono text-slate-900 font-heading">
                      ₹{amountStr}
                    </div>
                    <p className="text-xs text-orange-800 font-medium">
                      Table {currentTable} • Order {pendingOrderPayload?.id || ''} • 0% Extra Fees
                    </p>
                  </div>

                  {/* Dynamic UPI QR Code Display */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 text-center space-y-3 shadow-xs">
                    <div className="flex items-center justify-center min-h-[192px]">
                      {(() => {
                        const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(genericUpiUrl)}&size=240x240&margin=4`;
                        const activeQrSrc = upiIntentData?.qr_data_url || fallbackQr;
                        return (
                          <img 
                            src={activeQrSrc} 
                            alt="UPI Payment QR Code" 
                            className="w-48 h-48 rounded-xl border border-slate-200 p-2 shadow-xs mx-auto bg-white"
                          />
                        );
                      })()}
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        Scan to Pay with Any UPI App
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Google Pay • PhonePe • Paytm • BHIM • Cred • Any Banking App
                      </p>
                    </div>
                  </div>

                  {/* 1-Tap Mobile App Quick Launchers */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                      Or Tap to Open Directly on Phone
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href={gpayUrl}
                        className="py-2.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center flex flex-col items-center justify-center space-y-0.5 transition shadow-2xs"
                      >
                        <span className="font-black text-xs text-emerald-900">GPay</span>
                        <span className="text-[9px] text-emerald-700">1-Tap Pay</span>
                      </a>
                      <a
                        href={phonepeUrl}
                        className="py-2.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold text-center flex flex-col items-center justify-center space-y-0.5 transition shadow-2xs"
                      >
                        <span className="font-black text-xs text-purple-900">PhonePe</span>
                        <span className="text-[9px] text-purple-700">1-Tap Pay</span>
                      </a>
                      <a
                        href={paytmUrl}
                        className="py-2.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold text-center flex flex-col items-center justify-center space-y-0.5 transition shadow-2xs"
                      >
                        <span className="font-black text-xs text-blue-900">Paytm</span>
                        <span className="text-[9px] text-blue-700">1-Tap Pay</span>
                      </a>
                    </div>

                    <a
                      href={genericUpiUrl}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition"
                    >
                      <span>Open in Any UPI App</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    </a>
                  </div>

                  {/* Security Verification Notice */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] space-y-1 text-left shadow-2xs">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>Payment Verification Security</span>
                    </div>
                    <p className="text-slate-600 text-[10px] leading-relaxed">
                      After completing the UPI payment in your banking app, submit your order below. The kitchen will start preparing your food immediately, and our floor staff will verify the payment on the POS terminal.
                    </p>
                  </div>

                  {/* Submit Order Button (Awaiting Staff Verification) */}
                  <button
                    type="button"
                    disabled={isVerifyingPayment}
                    onClick={() => {
                      if (!pendingOrderPayload) return;
                      setIsVerifyingPayment(true);
                      setTimeout(() => {
                        setIsVerifyingPayment(false);
                        playSound('success');
                        const secureUpiOrder = {
                          ...pendingOrderPayload,
                          payment_mode: 'UPI',
                          payment_status: 'Pending UPI Verification',
                          payment_verified_online: false,
                          paid_collected_by: 'Pending Staff Verification'
                        };
                        finalizeAndPlaceOrder(secureUpiOrder);
                      }, 400);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingPayment ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Sending Order to Kitchen...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Place Order (Pay via UPI)</span>
                      </>
                    )}
                  </button>

                </div>
              );
            })()}

            {/* Switch to Pay Cash link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const cashOrder = {
                    ...pendingOrderPayload,
                    payment_mode: 'Cash',
                    payment_status: 'Pending Cash',
                    payment_verified_online: false,
                    paid_collected_by: 'Cashier / Floor Waiter'
                  };
                  finalizeAndPlaceOrder(cashOrder);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
              >
                Pay Cash at Counter or Table Instead
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 11. DINING SESSION TERMINATION & SETTLED RECEIPT CELEBRATION MODAL */}
      {settledSessionReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-slideUp">
            
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm text-3xl">
              🙏
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider inline-block">
                Bill Settled • Table Vacated
              </span>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Dining Session Concluded
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thank you for visiting Atmiya Dosa Hub, Petlad!
              </p>
            </div>

            {/* Receipt Summary Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Table Session</span>
                <span className="font-mono font-black text-slate-900 bg-orange-100 text-orange-900 px-2 py-0.5 rounded-lg">
                  Table {settledSessionReceipt.tableNumber || currentTable}
                </span>
              </div>

              {settledSessionReceipt.amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Total Bill Settled</span>
                  <span className="font-mono font-black text-emerald-700 text-base">
                    ₹{Number(settledSessionReceipt.amount).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Payment Mode</span>
                <span className="font-bold text-slate-800">
                  {settledSessionReceipt.paymentMethod}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-400 font-mono text-[11px]">
                <span>Closed At</span>
                <span>{settledSessionReceipt.timestamp || 'Just now'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Table {currentTable} has been marked ready for the next guests. We look forward to serving you again!
            </p>

            {/* Download Settled Bill Action */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  downloadSinglePageBillPdf({
                    order: activeBillOrder || {
                      id: settledSessionReceipt.orderId || placedOrderId || 'SETTLED',
                      table_number: settledSessionReceipt.tableNumber || currentTable,
                      total: settledSessionReceipt.amount,
                      payment_mode: settledSessionReceipt.paymentMethod,
                      payment_status: 'Paid',
                      time: settledSessionReceipt.timestamp
                    },
                    restaurantSettings,
                    customerName,
                    customerPhone,
                    currentTable: settledSessionReceipt.tableNumber || currentTable
                  });
                }}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>Download Bill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  printSinglePageReceipt({
                    order: activeBillOrder || {
                      id: settledSessionReceipt.orderId || placedOrderId || 'SETTLED',
                      table_number: settledSessionReceipt.tableNumber || currentTable,
                      total: settledSessionReceipt.amount,
                      payment_mode: settledSessionReceipt.paymentMethod,
                      payment_status: 'Paid',
                      time: settledSessionReceipt.timestamp
                    },
                    restaurantSettings,
                    customerName,
                    customerPhone,
                    currentTable: settledSessionReceipt.tableNumber || currentTable
                  });
                }}
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Bill</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSettledSessionReceipt(null);
                setPlacedOrderId('');
                setOrderSuccess(false);
                setCart([]);
                setShowCartDrawer(false);
                setShowOrderTracker(false);
              }}
              className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition cursor-pointer"
            >
              Start New Order / Preview Menu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
