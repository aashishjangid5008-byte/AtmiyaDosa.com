import { supabase, RESTAURANT_ID } from './supabase';

// Supabase Cloud Configuration
export { supabase, RESTAURANT_ID };


// LocalStorage Persistence Layer with Real-Time Event Dispatching
export const getLocalStore = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`restaurant_${key}`) || localStorage.getItem(`atmiya_${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (key === 'menu_items' && Array.isArray(parsed)) {
      if (parsed.length === 0) return fallback;
      return parsed.map(dish => {
        const photo = dish.image_url || dish.imageUrl || dish.image || dish.photo || null;
        return {
          ...dish,
          image_url: photo,
          imageUrl: photo,
          image: photo,
          photo: photo
        };
      });
    }
    if (key === 'categories' && Array.isArray(parsed)) {
      if (parsed.length === 0) return fallback;
    }
    return parsed;
  } catch (e) {
    console.error('Storage Read Error:', e);
    return fallback;
  }
};

export const setLocalStore = (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(`restaurant_${key}`, serialized);
    localStorage.setItem(`atmiya_${key}`, serialized);
    window.dispatchEvent(new Event('restaurant_data_updated'));
    window.dispatchEvent(new Event('atmiya_data_updated'));
  } catch (e) {
    console.error('Storage Write Error:', e);
  }
};

// Activity Recording Helper (Section 1.2 of Admin.txt)
export const recordEmployeeActivity = (
  employeeNameOrObj, 
  employeeRole = 'Admin', 
  actionType = 'GENERAL_ACTION', 
  details = '', 
  tableNumber = null, 
  orderId = null, 
  amount = null, 
  paymentMethod = null
) => {
  let name = employeeNameOrObj;
  let role = employeeRole;
  let action = actionType;
  let det = details;
  let tbl = tableNumber;
  let ord = orderId;
  let amt = amount;
  let payMethod = paymentMethod;

  if (typeof employeeNameOrObj === 'object' && employeeNameOrObj !== null) {
    name = employeeNameOrObj.employeeName || 'Darshit Rana';
    role = employeeNameOrObj.employeeRole || 'Admin';
    action = employeeNameOrObj.actionType || 'GENERAL_ACTION';
    det = employeeNameOrObj.details || employeeNameOrObj.text || '';
    tbl = employeeNameOrObj.tableNumber || null;
    ord = employeeNameOrObj.orderId || null;
    amt = employeeNameOrObj.amount || null;
    payMethod = employeeNameOrObj.paymentMethod || null;
  }

  const currentActivity = getLocalStore('activity', INITIAL_ACTIVITY);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    time: timeStr,
    timestamp: now.toISOString(),
    employeeName: name || 'Darshit Rana',
    employeeRole: role || 'Admin',
    actionType: action,
    tableNumber: tbl,
    orderId: ord,
    amount: amt,
    paymentMethod: payMethod,
    details: det,
    text: det,
    type: action.toLowerCase().includes('payment') ? 'payment' : action.toLowerCase().includes('order') ? 'order' : 'staff',
    color: action.toLowerCase().includes('payment') ? 'emerald' : action.toLowerCase().includes('cancel') ? 'rose' : 'orange'
  };

  const updated = [newEntry, ...currentActivity.slice(0, 99)];
  setLocalStore('activity', updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('restaurant_data_updated'));
  }
  return updated;
};

// Auth Management Helpers
export const getAuthUser = () => {
  return getLocalStore('auth_user', {
    id: 'usr_admin',
    name: 'Darshit Rana',
    username: 'admin',
    email: 'admin@atmiyadosa.com',
    role: 'Admin',
    restaurantName: 'Atmiya Dosa Hub'
  });
};

export const setAuthUser = (user) => {
  setLocalStore('auth_user', user);
};

export const logoutAuthUser = () => {
  try {
    localStorage.removeItem('restaurant_auth_user');
    localStorage.removeItem('atmiya_auth_user');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('atmiya_auth_token');
    sessionStorage.removeItem('restaurant_auth_user');
    sessionStorage.removeItem('atmiya_auth_user');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('atmiya_auth_token');
    sessionStorage.removeItem('atmiya_customer_mode');
    sessionStorage.removeItem('atmiya_bound_table');
    sessionStorage.removeItem('atmiya_seen_landing');
  } catch (e) {
    console.error('Logout Storage Cleanup Error:', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('restaurant_data_updated'));
    window.dispatchEvent(new Event('atmiya_data_updated'));
  }
};

// Real Atmiya Dosa Hub Settings from Uploaded Menu
export const INITIAL_SETTINGS = {
  restaurantName: "Atmiya Dosa Hub",
  tagline: "Pure Veg Authentic Taste • Petlad",
  address: "College Chokdi, Petlad-Khambhat Road, Opp. Harshal Hospital, Nr. Khodiyar Mata Mandir, At. Petlad, Dist. Anand",
  phone: "+91 63530 59221",
  gstin: "24AAACA1234A1Z5",
  currency: "₹",
  language: "en",
  instagram: "@ATMIYA_DOSA_HUB",
  upiId: "ranadarshit99@okicici",
  payeeName: "darshit rana",
  productionDomain: ""
};

export const INITIAL_TABLES = Array.from({ length: 16 }, (_, i) => {
  const num = (i + 1).toString().padStart(2, '0');
  const zones = ['Main Hall', 'AC Section', 'Family Section', 'Patio Garden'];
  return {
    id: `T${num}`,
    number: `T${num}`,
    capacity: (i % 3 === 0) ? 6 : (i % 2 === 0 ? 2 : 4),
    zone: zones[i % zones.length],
    status: 'available',
    current_order_id: null,
    timing: null
  };
});

import { AUTHENTIC_CATEGORIES, AUTHENTIC_MENU_CARD_ITEMS } from './authenticMenuData';

export { AUTHENTIC_CATEGORIES, AUTHENTIC_MENU_CARD_ITEMS };

export const INITIAL_CATEGORIES = AUTHENTIC_CATEGORIES;
export const INITIAL_MENU_ITEMS = AUTHENTIC_MENU_CARD_ITEMS;

// 1-Click Load Authentic 7 Menu Cards or Clear Menu for Manual Creation
export const loadAuthenticMenuCards = () => {
  setLocalStore('categories', AUTHENTIC_CATEGORIES);
  setLocalStore('menu_items', AUTHENTIC_MENU_CARD_ITEMS);
  window.dispatchEvent(new Event('restaurant_data_updated'));
  recordEmployeeActivity('DARSHIT RANA', 'Admin', 'MENU_SEEDED', 'Loaded all 177 authentic dishes from the 7 restaurant menu cards (ATM0001 - ATM0177, pure-veg, zero stock photos)');
  return AUTHENTIC_MENU_CARD_ITEMS;
};

export const clearMenuItems = () => {
  setLocalStore('menu_items', []);
  window.dispatchEvent(new Event('restaurant_data_updated'));
  recordEmployeeActivity('DARSHIT RANA', 'Admin', 'MENU_CLEARED', 'Cleared all menu items so user can create their custom menu from scratch');
  return [];
};

// Real Orders (Cleaned of all demo data - only real orders from Supabase/QR)
export const INITIAL_ORDERS = [];

// Immutable Activity Audit Log (Real staff/order actions)
export const INITIAL_ACTIVITY = [];

// Staff Credentials with creation & deletion support (Section 1 of Admin.txt)
export const INITIAL_EMPLOYEES = [
  { id: 'emp1', name: 'Darshit Rana', username: 'admin', role: 'Admin / Owner', password: 'password123', phone: '+91 63530 59221', shift: 'Full Day', active: true, createdAt: '2026-09-01' },
  { id: 'emp2', name: 'Amit Kumar', username: 'chef_amit', role: 'Head Chef', password: 'password123', phone: '+91 97123 45678', shift: 'Morning Shift', active: true, createdAt: '2026-09-10' },
  { id: 'emp3', waiter_id: 'WTR-101', name: 'Riya Patel', username: 'waiter_riya', role: 'Waiter', password: 'password123', pin: '1001', phone: '+91 99245 67890', shift: 'Morning Shift', active: true, createdAt: '2026-09-15' },
  { id: 'emp3_b', waiter_id: 'WTR-102', name: 'Rajesh Kumar', username: 'waiter_rajesh', role: 'Waiter', password: 'password123', pin: '1002', phone: '+91 98251 22334', shift: 'Evening Shift', active: true, createdAt: '2026-09-20' },
  { id: 'emp3_c', waiter_id: 'WTR-103', name: 'Vikram Shah', username: 'waiter_vikram', role: 'Waiter', password: 'password123', pin: '1003', phone: '+91 97140 44556', shift: 'Full Day', active: true, createdAt: '2026-10-02' },
  { id: 'emp4', name: 'Anjali Patel', username: 'cashier_anjali', role: 'Cashier & POS Lead', password: 'password123', phone: '+91 98980 11223', shift: 'Evening Shift', active: true, createdAt: '2026-10-01' },
  { id: 'emp5', name: 'Rohan Verma', username: 'kitchen_rohan', role: 'Kitchen Helper', password: 'password123', phone: '+91 98220 55667', shift: 'Evening Shift', active: true, createdAt: '2026-10-05' }
];

// Coupons & Promotional Discounts (Section 5 of Admin.txt & Hotel Promotions)
export const INITIAL_COUPONS = [
  {
    id: 'c_bogo_dosa',
    code: 'DOSABOGO',
    title: 'Buy 2 Dosa & Get 1 Free',
    description: 'Order any 2 Dosas and get 1 Dosa free! Lowest priced Dosa is on the house.',
    type: 'bogo',
    target_category: 'Dosa',
    buy_qty: 2,
    get_qty: 1,
    discount: 0,
    min_order: 130,
    active: true,
    badgeText: '🔥 Buy 2 Get 1 Free',
    famousPreset: 'bogo'
  },
  {
    id: 'c_flat_20',
    code: 'ATMIYA20',
    title: 'Flat 20% Off Feast',
    description: 'Get 20% off on all dine-in orders above ₹399. Max discount ₹100.',
    type: 'percentage',
    discount: 20,
    max_discount: 100,
    min_order: 399,
    active: true,
    badgeText: '⚡ 20% OFF',
    famousPreset: 'percentage'
  },
  {
    id: 'c_welcome_50',
    code: 'WELCOME50',
    title: 'Welcome ₹50 Off First Dine-In',
    description: 'Flat ₹50 instant discount on table bills above ₹250.',
    type: 'flat',
    discount: 50,
    min_order: 250,
    active: true,
    badgeText: '💰 Flat ₹50 OFF',
    famousPreset: 'flat'
  },
  {
    id: 'c_free_chaas',
    code: 'FREECHAAS',
    title: 'Free Masala Chaas on Bills > ₹250',
    description: 'Enjoy a chilled glass of Amul Masala Chaas free on orders above ₹250.',
    type: 'free_item',
    free_item_name: 'Amul Masala Chaas',
    free_item_value: 20,
    discount: 20,
    min_order: 250,
    active: true,
    badgeText: '🥤 Free Chaas',
    famousPreset: 'free_item'
  },
  {
    id: 'c_pav_20',
    code: 'PAV20',
    title: 'Pav Bhaji & Pulao Special 20% Off',
    description: '20% off on all Pav Bhaji, Cheese Pav Bhaji, and Pulao items.',
    type: 'category',
    target_category: 'Pav Bhaji & Pulao',
    discount: 20,
    min_order: 120,
    active: true,
    badgeText: '🍛 20% Off Pav Bhaji',
    famousPreset: 'category'
  },
  {
    id: 'c_festive_100',
    code: 'FESTIVE100',
    title: 'Family Feast ₹100 Off',
    description: 'Flat ₹100 off on large family table dining orders above ₹500.',
    type: 'flat',
    discount: 100,
    min_order: 500,
    active: true,
    badgeText: '🎉 Flat ₹100 OFF',
    famousPreset: 'flat'
  }
];


// Live Table Service Requests (Cleaned of demo requests)
export const INITIAL_SERVICE_CALLS = [];

// Permanent Customer Relationship Management (CRM) Database (Real guests only)
export const INITIAL_CUSTOMERS = [];

// Permanent Customer Persistence & Relations Engine
export const saveCustomerProfile = ({ name, phone, tableNumber, orderId, orderTotal = 0, items = [], paymentMode = 'UPI' }) => {
  if (!phone) return null;
  const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
  if (cleanPhone.length < 10) return null;

  const cleanName = (name && name.trim()) ? name.trim() : `Guest ${cleanPhone.slice(-4)}`;
  const currentCustomers = getLocalStore('customers', INITIAL_CUSTOMERS);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short' });
  const visitTimestamp = `${dateStr}, ${timeStr}`;

  const existingIdx = currentCustomers.findIndex(c => String(c.phone).replace(/[^0-9]/g, '').slice(-10) === cleanPhone);

  const pointsEarned = Math.round(Number(orderTotal) * 0.1); // 10% loyalty reward points
  const firstItemName = (items && items.length > 0 && items[0]) ? (items[0].name || items[0].title || 'Mysore Masala Dosa') : 'Special Dosa';

  let updatedCustomers = [];
  let savedProfile = null;

  if (existingIdx > -1) {
    const existing = currentCustomers[existingIdx];
    const newVisits = (Number(existing.visits) || 0) + 1;
    const newTotalSpent = (Number(existing.total_spent) || 0) + Number(orderTotal);
    const newPoints = (Number(existing.loyalty_points) || 0) + pointsEarned;
    
    // Tier threshold calculation
    let newTier = 'Silver Member';
    if (newTotalSpent >= 2000 || newVisits >= 6) {
      newTier = 'VIP Platinum';
    } else if (newTotalSpent >= 1000 || newVisits >= 3) {
      newTier = 'VIP Gold';
    }

    savedProfile = {
      ...existing,
      name: cleanName || existing.name,
      phone: cleanPhone,
      visits: newVisits,
      total_spent: newTotalSpent,
      loyalty_points: newPoints,
      tier: newTier,
      last_table: tableNumber || existing.last_table,
      last_visit: visitTimestamp,
      last_order_id: orderId || existing.last_order_id,
      favorite_dish: existing.favorite_dish || firstItemName,
      history: [
        {
          order_id: orderId,
          table: tableNumber,
          amount: Number(orderTotal),
          payment_mode: paymentMode,
          date: visitTimestamp,
          items_summary: items.map(i => `${i.qty || 1}x ${i.name}`).join(', ')
        },
        ...(existing.history || []).slice(0, 19)
      ]
    };

    updatedCustomers = [...currentCustomers];
    updatedCustomers[existingIdx] = savedProfile;
  } else {
    // New Customer
    let newTier = 'Silver Member';
    if (Number(orderTotal) >= 2000) newTier = 'VIP Platinum';
    else if (Number(orderTotal) >= 1000) newTier = 'VIP Gold';

    savedProfile = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      phone: cleanPhone,
      tier: newTier,
      visits: 1,
      total_spent: Number(orderTotal),
      loyalty_points: pointsEarned,
      last_table: tableNumber || 'T01',
      last_visit: visitTimestamp,
      first_visit: visitTimestamp,
      last_order_id: orderId,
      favorite_dish: firstItemName,
      history: [
        {
          order_id: orderId,
          table: tableNumber,
          amount: Number(orderTotal),
          payment_mode: paymentMode,
          date: visitTimestamp,
          items_summary: items.map(i => `${i.qty || 1}x ${i.name}`).join(', ')
        }
      ]
    };

    updatedCustomers = [savedProfile, ...currentCustomers];
  }

  setLocalStore('customers', updatedCustomers);
  window.dispatchEvent(new Event('restaurant_data_updated'));
  return savedProfile;
};

export const lookupCustomerByPhone = (phone) => {
  if (!phone) return null;
  const clean = String(phone).replace(/[^0-9]/g, '').slice(-10);
  if (clean.length < 10) return null;
  const currentCustomers = getLocalStore('customers', INITIAL_CUSTOMERS);
  return currentCustomers.find(c => String(c.phone).replace(/[^0-9]/g, '').slice(-10) === clean) || null;
};

export const addCustomerLoyaltyPoints = (customerId, points) => {
  const currentCustomers = getLocalStore('customers', INITIAL_CUSTOMERS);
  const updated = currentCustomers.map(c => {
    if (c.id === customerId) {
      const newPoints = (Number(c.loyalty_points) || 0) + points;
      let newTier = c.tier;
      if (newPoints >= 250 || c.total_spent >= 2000) newTier = 'VIP Platinum';
      else if (newPoints >= 100 || c.total_spent >= 1000) newTier = 'VIP Gold';
      return { ...c, loyalty_points: newPoints, tier: newTier };
    }
    return c;
  });
  setLocalStore('customers', updated);
  window.dispatchEvent(new Event('restaurant_data_updated'));
  return updated;
};




