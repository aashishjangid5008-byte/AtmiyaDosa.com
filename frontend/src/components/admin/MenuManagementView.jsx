import React, { useState, useMemo } from 'react';
import { 
  Utensils, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  IndianRupee, 
  Percent, 
  Sparkles, 
  Tag, 
  Edit2, 
  Check, 
  AlertCircle, 
  Zap, 
  RotateCcw,
  Trophy,
  Flame,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  TrendingUp,
  Layers,
  ArrowUpDown,
  Eye,
  EyeOff,
  Upload,
  Camera,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { loadAuthenticMenuCards, clearMenuItems } from '../../lib/appwrite';
import { playSound } from '../../lib/sound';
import { MASTER_CUISINES, getDishCuisine } from '../../lib/cuisines';
import { API_BASE_URL } from '../../lib/supabase';


export const FOOD_PHOTO_PRESETS = [
  {
    name: 'Mysore Masala Dosa',
    icon: '🥞',
    cuisine: 'south_indian',
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Cheese Paper Dosa',
    icon: '🧀',
    cuisine: 'south_indian',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Amul Pav Bhaji',
    icon: '🫓',
    cuisine: 'gujarati',
    url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Tawa Pulao',
    icon: '🍛',
    cuisine: 'gujarati',
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Hakka Noodles',
    icon: '🍜',
    cuisine: 'chinese',
    url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Manchurian Dry',
    icon: '🥢',
    cuisine: 'chinese',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Masala Chaas',
    icon: '🥛',
    cuisine: 'beverages',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Chilled Cold Drink',
    icon: '🥤',
    cuisine: 'beverages',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'
  }
];

export default function MenuManagementView({ 
  categories = [], 
  menuItems = [], 
  orders = [],
  onToggleStock, 
  onAddMenuItem, 
  onUpdateMenuItem, 
  onDeleteMenuItem, 
  onApplyDiscount, 
  onRemoveDiscount, 
  currentLang 
}) {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table' | 'stock'
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock' | 'discounted' | 'bestsellers'
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'revenue' | 'price_asc' | 'price_desc' | 'name'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // Modals & Inline Editors
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [discountModalItem, setDiscountModalItem] = useState(null);
  const [discountPercentInput, setDiscountPercentInput] = useState(15);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Inline Quick Price Edit State
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlinePriceVal, setInlinePriceVal] = useState('');

  const [newItem, setNewItem] = useState({
    name: '',
    gujarati_name: '',
    category: 'Mysore Dosa',
    cuisine: 'south_indian',
    price: '',
    description: '',
    is_veg: true,
    is_spicy: false,
    is_available: true,
    image_url: null
  });

  const t = (key) => getTranslation(currentLang, key);

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
    if (name.includes('chaas') || name.includes('lassi') || name.includes('drink') || name.includes('water') || cat.includes('beverage')) return '🥤';
    if (name.includes('soup') || cat.includes('soup')) return '🍲';
    if (name.includes('dessert') || name.includes('ice cream')) return '🍨';
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

  // Real Data Aggregation: Sales Volume, Revenue, Demand Velocity per dish
  const dishSalesMap = useMemo(() => {
    const map = {};
    (orders || []).forEach(o => {
      if ((o.status || '').toUpperCase() === 'CANCELLED') return;
      const itms = Array.isArray(o.order_items) && o.order_items.length > 0
        ? o.order_items.map(i => ({ name: i.item_name || i.name, qty: Number(i.quantity || i.qty) || 1 }))
        : (Array.isArray(o.items) ? o.items.map(i => ({ name: i.name, qty: Number(i.qty || i.quantity) || 1 })) : []);
      
      itms.forEach(i => {
        if (!i.name) return;
        map[i.name] = (map[i.name] || 0) + i.qty;
      });
    });
    return map;
  }, [orders]);

  // Enrich each menu item with telemetry
  const enrichedItems = useMemo(() => {
    return menuItems.map(item => {
      // Find volume sold
      let volume = dishSalesMap[item.name] || 0;
      if (!volume && item.english_name) {
        volume = dishSalesMap[item.english_name] || 0;
      }
      if (!volume && item.orders_count) {
        volume = item.orders_count;
      }

      const currentPrice = Number(item.finalPrice || item.price || 0);
      const originalPrice = Number(item.originalPrice || item.price || currentPrice);
      const revenue = volume * currentPrice;
      const cost = Math.round(currentPrice * 0.4);
      const margin = currentPrice > 0 ? `${Math.round(((currentPrice - cost) / currentPrice) * 100)}%` : '60%';

      let velocity = 'Available';
      let velocityType = 'normal';
      if (volume >= 10) {
        velocity = '🚀 Super Bestseller';
        velocityType = 'super';
      } else if (volume >= 4) {
        velocity = '🔥 Fast Mover';
        velocityType = 'hot';
      } else if (volume > 0) {
        velocity = 'Active';
        velocityType = 'active';
      }

      return {
        ...item,
        currentPrice,
        originalPrice,
        volume,
        revenue,
        margin,
        velocity,
        velocityType
      };
    });
  }, [menuItems, dishSalesMap]);

  // Filter items by category, search term, and status
  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      // Category filter
      if (selectedCat !== 'All' && item.category !== selectedCat) return false;

      // Status filter
      if (statusFilter === 'in_stock' && item.is_available === false) return false;
      if (statusFilter === 'out_of_stock' && item.is_available !== false) return false;
      if (statusFilter === 'discounted' && !item.hasDiscount) return false;
      if (statusFilter === 'bestsellers' && item.volume < 4) return false;

      // Search query
      if (search.trim() !== '') {
        const query = search.toLowerCase();
        const nameMatch = (item.name || '').toLowerCase().includes(query);
        const engMatch = (item.english_name || '').toLowerCase().includes(query);
        const gujMatch = (item.gujarati_name || '').toLowerCase().includes(query);
        const catMatch = (item.category || '').toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        return nameMatch || engMatch || gujMatch || catMatch || descMatch;
      }
      return true;
    });
  }, [enrichedItems, selectedCat, statusFilter, search]);

  // Sort items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    switch (sortBy) {
      case 'popular':
        return list.sort((a, b) => b.volume - a.volume);
      case 'revenue':
        return list.sort((a, b) => b.revenue - a.revenue);
      case 'price_asc':
        return list.sort((a, b) => a.currentPrice - b.currentPrice);
      case 'price_desc':
        return list.sort((a, b) => b.currentPrice - a.currentPrice);
      case 'name':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      default:
        return list;
    }
  }, [filteredItems, sortBy]);

  // Pagination calculation
  const totalItemsCount = sortedItems.length;
  const effectivePerPage = itemsPerPage === -1 ? totalItemsCount : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / (effectivePerPage || 1)));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * effectivePerPage;
  const paginatedItems = itemsPerPage === -1 
    ? sortedItems 
    : sortedItems.slice(startIndex, startIndex + effectivePerPage);

  // Metrics Overview
  const totalDishesCount = menuItems.length;
  const inStockCount = menuItems.filter(i => i.is_available !== false).length;
  const outOfStockCount = totalDishesCount - inStockCount;
  const discountedCount = menuItems.filter(i => i.hasDiscount).length;
  const totalMenuRevenue = enrichedItems.reduce((sum, i) => sum + i.revenue, 0);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: menuItems.length };
    menuItems.forEach(i => {
      if (i.category) {
        counts[i.category] = (counts[i.category] || 0) + 1;
      }
    });
    return counts;
  }, [menuItems]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set([
      ...categories.map(c => c.name),
      ...menuItems.map(m => m.category)
    ].filter(Boolean)));
  }, [categories, menuItems]);

  const compressImage = (file, maxWidth = 600, maxHeight = 600, quality = 0.78) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(event.target.result);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      try {
        const compressed = await compressImage(file, 600, 600, 0.78);
        if (compressed) {
          // Instant local preview while uploading
          setImagePreview(compressed);
          if (editingItem) {
            setEditingItem(prev => ({ ...prev, image_url: compressed }));
          } else {
            setNewItem(prev => ({ ...prev, image_url: compressed }));
          }
          playSound('click');

          // Persist to server uploads disk (available across all phones & terminals)
          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE_URL}/menu/upload-photo`, {
              method: 'POST',
              body: formData
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.url) {
                console.log('[MENU] Photo uploaded successfully to server disk:', data.url);
                setImagePreview(data.url);
                if (editingItem) {
                  setEditingItem(prev => ({ ...prev, image_url: data.url }));
                } else {
                  setNewItem(prev => ({ ...prev, image_url: data.url }));
                }
              }
            }
          } catch (uploadErr) {
            console.warn('[MENU] Server disk upload fallback to compressed base64:', uploadErr);
          }
        }
      } catch (err) {
        console.error('Image compression error:', err);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };


  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    const priceNum = parseFloat(newItem.price);
    const photoUrl = newItem.image_url || imagePreview || null;
    const determinedCuisine = newItem.cuisine || getDishCuisine(newItem);
    
    onAddMenuItem({
      ...newItem,
      english_name: newItem.name,
      gujarati_name: newItem.gujarati_name || null,
      name: newItem.gujarati_name ? `${newItem.name} (${newItem.gujarati_name})` : newItem.name,
      originalPrice: priceNum,
      finalPrice: priceNum,
      price: priceNum,
      hasDiscount: false,
      discountPercent: 0,
      image_url: photoUrl,
      image: photoUrl,
      imageUrl: photoUrl,
      photo: photoUrl,
      cuisine: determinedCuisine,
      is_available: newItem.is_available !== false,
      isAvailable: newItem.is_available !== false,
      orders_count: 0,
      rating: 4.8,
      prepTimeMins: 10
    });

    setShowAddModal(false);
    setImagePreview('');
    setNewItem({
      name: '',
      gujarati_name: '',
      category: 'Mysore Dosa',
      cuisine: 'south_indian',
      price: '',
      description: '',
      is_veg: true,
      is_spicy: false,
      is_available: true,
      image_url: null
    });
    playSound('success');
  };

  const handleOpenEditModal = (item) => {
    const photo = item.image_url || item.imageUrl || item.image || item.photo || '';
    setEditingItem({ 
      ...item, 
      price: item.originalPrice || item.price,
      cuisine: item.cuisine || getDishCuisine(item),
      image_url: photo
    });
    setImagePreview(photo);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.price) return;
    const priceNum = parseFloat(editingItem.price);
    
    const hasDisc = editingItem.hasDiscount;
    const discPct = editingItem.discountPercent || 0;
    const calcFinalPrice = hasDisc ? Math.round(priceNum * (1 - discPct / 100)) : priceNum;
    const photoUrl = editingItem.image_url || imagePreview || null;
    const determinedCuisine = editingItem.cuisine || getDishCuisine(editingItem);

    onUpdateMenuItem({
      ...editingItem,
      originalPrice: priceNum,
      finalPrice: calcFinalPrice,
      price: calcFinalPrice,
      image_url: photoUrl,
      image: photoUrl,
      imageUrl: photoUrl,
      photo: photoUrl,
      cuisine: determinedCuisine,
      is_available: editingItem.is_available !== false,
      isAvailable: editingItem.is_available !== false
    });

    setEditingItem(null);
    setImagePreview('');
    playSound('success');
  };

  const handleApplyDiscountSubmit = (e) => {
    e.preventDefault();
    if (!discountModalItem) return;
    const pct = Math.max(1, Math.min(90, parseInt(discountPercentInput) || 15));
    onApplyDiscount(discountModalItem.id, pct);
    setDiscountModalItem(null);
    playSound('success');
  };

  // Quick Inline Price Save Handler
  const handleSaveInlinePrice = (item) => {
    const newPrice = Number(inlinePriceVal);
    if (isNaN(newPrice) || newPrice <= 0) return;

    const hasDisc = item.hasDiscount;
    const discPct = item.discountPercent || 0;
    const calcFinalPrice = hasDisc ? Math.round(newPrice * (1 - discPct / 100)) : newPrice;

    onUpdateMenuItem({
      ...item,
      originalPrice: newPrice,
      finalPrice: calcFinalPrice,
      price: calcFinalPrice
    });

    setInlineEditingId(null);
    setInlinePriceVal('');
    playSound('success');
  };

  return (
    <div className="w-full max-w-full space-y-4 font-sans text-slate-900 overflow-x-hidden">
      
      {/* 1. TOP EXECUTIVE TELEMETRY STRIP (4 High-Contrast KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Dishes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Menu Dishes</span>
            <div className="text-xl sm:text-2xl font-black font-heading text-slate-900 mt-0.5">{totalDishesCount}</div>
            <span className="text-[10px] text-slate-400 font-medium">{uniqueCategories.length} Categories</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        {/* In Stock Active */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active In Stock</span>
            <div className="text-xl sm:text-2xl font-black font-heading text-emerald-700 mt-0.5">{inStockCount}</div>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live on QR Menu
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Sold Out / 86'd */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sold Out (86'd)</span>
            <div className="text-xl sm:text-2xl font-black font-heading text-rose-600 mt-0.5">{outOfStockCount}</div>
            <span className="text-[10px] text-rose-500 font-medium">Temporarily Paused</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>

        {/* Highlighted Discounts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Promos & Discounts</span>
            <div className="text-xl sm:text-2xl font-black font-heading text-amber-700 mt-0.5">{discountedCount}</div>
            <span className="text-[10px] text-amber-600 font-medium">Special Pricing Active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. COMMAND HEADER & BULK ACTIONS BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading truncate">
                Menu Management & Live Control Center
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate">
                Manage stock, edit prices in ₹, track dish sales volume & run promotional discounts.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (window.confirm("Load all 177 authentic dishes from the 7 physical menu cards of Atmiya Dosa Hub?")) {
                loadAuthenticMenuCards();
                playSound('success');
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Populate all 177 real items from 7 menu cards"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>⚡ Load 7 Menu Cards (177)</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all menu dishes and start fresh?")) {
                clearMenuItems();
                playSound('trash');
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer"
            title="Clear menu to create all items by yourself"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={() => { setImagePreview(''); setShowAddModal(true); }}
            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-600/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add New Dish</span>
          </button>
        </div>

      </div>

      {/* 3. DYNAMIC TOOLBAR (View Switcher + Search + Sort + Status Filters) */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        
        {/* Top Controls Row: View Switcher & Search & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* View Modes Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold shrink-0 self-start md:self-auto">
            <button
              onClick={() => { setViewMode('cards'); playSound('click'); }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-orange-600" />
              <span>Dynamic Cards</span>
            </button>

            <button
              onClick={() => { setViewMode('table'); playSound('click'); }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Demand & Control Table</span>
            </button>

            <button
              onClick={() => { setViewMode('stock'); playSound('click'); }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'stock'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fast 86 Stock</span>
            </button>
          </div>

          {/* Search Bar & Sort Dropdown */}
          <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search dish (English, ગુજરાતી, category)..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:bg-white focus:border-slate-800 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center space-x-1 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-slate-800"
              >
                <option value="popular">🔥 Most Popular</option>
                <option value="revenue">💰 Highest Revenue</option>
                <option value="price_asc">₹ Price: Low to High</option>
                <option value="price_desc">₹ Price: High to Low</option>
                <option value="name">🔤 Name (A - Z)</option>
              </select>
            </div>

          </div>

        </div>

        {/* Quick Filter Chips: All, Top Sellers, Discounted, In Stock, Sold Out */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          {[
            { id: 'all', label: `All Dishes (${menuItems.length})`, icon: null },
            { id: 'bestsellers', label: '🔥 Top Sellers', icon: null },
            { id: 'discounted', label: `🏷️ Discounted (${discountedCount})`, icon: null },
            { id: 'in_stock', label: `🟢 In Stock (${inStockCount})`, icon: null },
            { id: 'out_of_stock', label: `🔴 Sold Out (${outOfStockCount})`, icon: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Items Per Page Selector */}
          <div className="ml-auto flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
            <span>Show:</span>
            {[24, 48, 96, -1].map(limit => (
              <button
                key={limit}
                onClick={() => { setItemsPerPage(limit); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  itemsPerPage === limit
                    ? 'bg-orange-600 text-white shadow-2xs font-mono'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-mono'
                }`}
              >
                {limit === -1 ? 'All' : limit}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Category Pill Bar (Auto-wrapping to guarantee 0 screen overflow) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => { setSelectedCat('All'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              selectedCat === 'All'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories ({menuItems.length})
          </button>
          {uniqueCategories.map(cat => {
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCat(cat); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCat === cat
                    ? 'bg-orange-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className="ml-1 opacity-75 font-mono text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* 4. MAIN CONTENT AREA (Based on selected View Mode) */}

      {/* MODE A: DYNAMIC CARDS VIEW (PRO-MAX RESPONSIVE, 0 TEXT OVERFLOW) */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 w-full min-w-0">
            {paginatedItems.map(item => {
              const isDiscounted = item.hasDiscount;
              const isEditingPrice = inlineEditingId === item.id;
              const rawName = item.english_name || item.name || '';
              const parenMatch = rawName.match(/^([^(]+)\s*\(([^)]+)\)$/);
              const primaryName = parenMatch ? parenMatch[1].trim() : rawName;
              const secondaryName = item.gujarati_name && item.gujarati_name !== rawName
                ? item.gujarati_name
                : (parenMatch ? parenMatch[2].trim() : null);

              return (
                <div 
                  key={item.id}
                  className={`bg-white rounded-2xl p-2.5 sm:p-3 border transition-all duration-300 ease-out shadow-2xs hover:shadow-xl hover:shadow-orange-500/15 hover:-translate-y-1.5 hover:border-orange-400 active:scale-[0.99] flex flex-col justify-between overflow-hidden relative min-w-0 w-full group ${
                    isDiscounted 
                      ? 'border-rose-400 ring-1 ring-rose-200' 
                      : (item.is_available === false ? 'border-slate-200 opacity-75 bg-slate-50/50' : 'border-slate-200/90')
                  }`}
                >
                  
                  {/* Top Image & Pure-Veg & Stock Header */}
                  <div>
                    <div className={`w-full h-24 sm:h-28 rounded-xl relative overflow-hidden flex items-center justify-center bg-gradient-to-br ${getDishGradient(item)} border border-slate-100 mb-2 shrink-0 group-hover:border-orange-200 transition-colors`}>
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
                                className={`w-full h-full object-cover group-hover:scale-108 transition duration-300 ${!item.is_available ? 'grayscale opacity-60' : ''}`}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.dish-kpi-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="dish-kpi-fallback flex flex-col items-center justify-center p-2 group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 ease-out select-none"
                              style={{ display: dishPhoto ? 'none' : 'flex' }}
                            >
                              <span className="text-3.5xl sm:text-4xl drop-shadow-sm">
                                {getDishEmoji(item)}
                              </span>
                            </div>
                          </>
                        );
                      })()}

                      {/* Top-Left: Pure Veg Icon */}
                      <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 bg-white/95 backdrop-blur-xs rounded-xs border border-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                      </div>

                      {/* Top-Right: Stock Toggle Switch */}
                      <div className="absolute top-1.5 right-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => { onToggleStock(item.id); playSound('click'); }}
                          className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider shadow-xs transition cursor-pointer flex items-center space-x-1 hover:scale-105 active:scale-95 ${
                            item.is_available 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                          title="Click to toggle In Stock vs Sold Out in real-time"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          <span>{item.is_available ? 'In Stock' : 'Sold Out'}</span>
                        </button>
                      </div>

                      {/* Bottom-Left: Category Tag */}
                      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-orange-600/90 backdrop-blur-xs text-white text-[8.5px] font-bold font-mono truncate max-w-[75%] shadow-xs">
                        {item.category}
                      </div>

                      {/* Bottom-Right: Discount Tag */}
                      {isDiscounted && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[8.5px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                          {item.discountPercent}% OFF
                        </div>
                      )}
                    </div>

                    {/* Dish Identity: Primary Name + Gujarati + Description */}
                    <div className="min-w-0 w-full overflow-hidden space-y-0.5">
                      <h3 
                        className="text-xs font-black text-slate-900 font-heading truncate leading-tight group-hover:text-orange-600 transition"
                        title={rawName}
                      >
                        {primaryName}
                      </h3>
                      {secondaryName && (
                        <p className="text-[10.5px] font-bold text-emerald-800 font-heading truncate leading-tight">
                          {secondaryName}
                        </p>
                      )}
                      <p className="text-[9.5px] text-slate-500 line-clamp-1 leading-snug pt-0.5">
                        {item.description || 'Authentic pure-veg dish freshly prepared using premium ingredients and desi butter.'}
                      </p>
                    </div>

                    {/* Telemetry Strip: Demand Velocity & Plates Sold */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        item.velocityType === 'super' ? 'bg-amber-100 text-amber-900' : (item.velocityType === 'hot' ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-700')
                      }`}>
                        {item.velocity}
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {item.volume} Sold
                      </span>
                    </div>
                  </div>

                  {/* Price & Action Row */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 w-full min-w-0">
                    
                    {/* Inline Price Editor or Normal Display */}
                    <div className="min-w-0 flex-1">
                      {isEditingPrice ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            value={inlinePriceVal}
                            onChange={(e) => setInlinePriceVal(e.target.value)}
                            className="w-14 px-1 py-0.5 text-xs font-mono font-black border border-orange-400 rounded-md focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlinePrice(item)}
                            className="p-1 rounded bg-orange-600 hover:bg-orange-700 text-white cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                            title="Save Price"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineEditingId(null)}
                            className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                            title="Cancel"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => { setInlineEditingId(item.id); setInlinePriceVal(item.currentPrice); }}
                          className="flex items-baseline space-x-1 cursor-pointer group/price hover:bg-orange-50/60 px-1 py-0.5 rounded transition"
                          title="Click to quickly edit price"
                        >
                          <span className={`text-xs sm:text-sm font-black font-heading font-mono ${isDiscounted ? 'text-rose-600' : 'text-slate-900'}`}>
                            ₹{item.currentPrice}
                          </span>
                          {isDiscounted && item.originalPrice > item.currentPrice && (
                            <span className="text-[9px] line-through text-slate-400 font-mono">
                              ₹{item.originalPrice}
                            </span>
                          )}
                          <Edit2 className="w-2 h-2 text-slate-400 opacity-0 group-hover/price:opacity-100 transition" />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Discount, Edit, Delete with pop hover */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {isDiscounted ? (
                        <button
                          type="button"
                          onClick={() => onRemoveDiscount(item.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition cursor-pointer hover:scale-110 active:scale-95"
                          title="Remove discount"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setDiscountModalItem(item); setDiscountPercentInput(15); }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition cursor-pointer hover:scale-110 active:scale-95"
                          title="Apply highlighted discount"
                        >
                          <Percent className="w-2.5 h-2.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer hover:scale-110 active:scale-95"
                        title="Edit full dish details"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteMenuItem(item.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer hover:scale-110 active:scale-95"
                        title="Delete dish from menu"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE B: ALL-IN-ONE DEMAND & SALES CONTROL TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600 select-none">
                <tr>
                  <th className="py-3 px-4">Rank & Dish Details</th>
                  <th className="py-3 px-4">Demand Velocity</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4">Selling Price (₹)</th>
                  <th className="py-3 px-4">Volume (Plates)</th>
                  <th className="py-3 px-4">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item, idx) => {
                  const isEditingThisPrice = inlineEditingId === item.id;
                  const isDiscounted = item.hasDiscount;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* 1. Rank & Identity with Photo Thumbnail */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{startIndex + idx + 1}
                          </span>
                          {/* Dish Photo Thumbnail */}
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
                            {(() => {
                              let tblPhoto = item.image_url || item.imageUrl || item.image || item.photo;
                              if (tblPhoto && typeof tblPhoto === 'string') {
                                tblPhoto = tblPhoto.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000\//i, '/');
                                if (tblPhoto.startsWith('uploads/')) tblPhoto = '/' + tblPhoto;
                              }
                              return tblPhoto ? (
                                <img 
                                  src={tblPhoto} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <span className="text-base select-none">{getDishEmoji(item)}</span>
                              );
                            })()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-black text-slate-900 block truncate text-xs font-heading">
                              {item.english_name || item.name}
                            </span>
                            {item.gujarati_name && (
                              <span className="text-[10px] font-bold text-emerald-800 block truncate">
                                {item.gujarati_name}
                              </span>
                            )}
                            <span className="text-[9px] font-bold text-orange-600 block uppercase font-mono">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Demand Velocity Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.velocityType === 'super'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : (item.velocityType === 'hot'
                              ? 'bg-orange-50 text-orange-900 border-orange-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200')
                        }`}>
                          {item.velocity}
                        </span>
                      </td>

                      {/* 3. Live Stock Toggle */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => { onToggleStock(item.id); playSound('click'); }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                            item.is_available
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${item.is_available ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          <span>{item.is_available ? 'In Stock 🟢' : 'Sold Out 🔴'}</span>
                        </button>
                      </td>

                      {/* 4. Inline Price Editor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEditingThisPrice ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-500 font-bold">₹</span>
                            <input
                              type="number"
                              value={inlinePriceVal}
                              onChange={(e) => setInlinePriceVal(e.target.value)}
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-black border border-orange-400 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlinePrice(item)}
                              className="p-1 rounded bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => setInlineEditingId(null)}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => { setInlineEditingId(item.id); setInlinePriceVal(item.currentPrice); }}
                            className="flex items-center space-x-1.5 group cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-lg transition"
                            title="Click to edit price"
                          >
                            <span className={`font-mono font-black text-xs ${isDiscounted ? 'text-rose-600' : 'text-slate-900'}`}>
                              ₹{item.currentPrice}
                            </span>
                            {isDiscounted && item.originalPrice > item.currentPrice && (
                              <span className="text-[10px] line-through text-slate-400 font-mono">
                                ₹{item.originalPrice}
                              </span>
                            )}
                            {isDiscounted && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black font-mono">
                                -{item.discountPercent || (item.originalPrice > item.currentPrice ? Math.round((1 - item.currentPrice / item.originalPrice) * 100) : 15)}%
                              </span>
                            )}
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* 5. Volume Plates Sold */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                        {item.volume} Plates
                      </td>

                      {/* 6. Total Gross Revenue */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-black text-slate-900">
                        ₹{item.revenue.toLocaleString()}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {isDiscounted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => { setDiscountModalItem(item); setDiscountPercentInput(item.discountPercent || 15); }}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200 transition cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95"
                                title="Edit active promotional discount"
                              >
                                <Percent className="w-3 h-3 text-rose-600 stroke-[2.5]" />
                                <span>{item.discountPercent || 15}%</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveDiscount(item.id)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer hover:scale-110 active:scale-95"
                                title="Remove discount & restore original price"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setDiscountModalItem(item); setDiscountPercentInput(15); }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition cursor-pointer hover:scale-110 active:scale-95"
                              title="Apply promotional discount"
                            >
                              <Percent className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMenuItem(item.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE C: FAST 86 STOCK CONTROL (QUICK BATCH TOGGLE) */}
      {viewMode === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 font-heading">Fast Stock 86 Control Grid</h3>
              <p className="text-xs text-slate-500">Instantly toggle dishes in-stock or sold-out during high dining rush.</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {inStockCount} In Stock • {outOfStockCount} Sold Out
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {sortedItems.map(item => (
              <div
                key={item.id}
                onClick={() => { onToggleStock(item.id); playSound('click'); }}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                  item.is_available
                    ? 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-100/60'
                    : 'bg-rose-50/50 border-rose-300 hover:bg-rose-100/60'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-black text-slate-900 block truncate font-heading">
                    {item.english_name || item.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">
                    {item.category} • ₹{item.currentPrice}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                  item.is_available ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {item.is_available ? 'In Stock' : '86\'d'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DYNAMIC PAGINATION CONTROLS (Safeguards Viewport & Screen Layout) */}
      {totalPages > 1 && itemsPerPage !== -1 && (
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 font-mono">{startIndex + 1}</strong> to <strong className="text-slate-900 font-mono">{Math.min(startIndex + effectivePerPage, totalItemsCount)}</strong> of <strong className="text-slate-900 font-mono">{totalItemsCount}</strong> dishes
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => { setCurrentPage(Math.max(1, safeCurrentPage - 1)); playSound('click'); }}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              if (totalPages > 7 && Math.abs(p - safeCurrentPage) > 2 && p !== 1 && p !== totalPages) {
                return null;
              }
              return (
                <button
                  key={p}
                  onClick={() => { setCurrentPage(p); playSound('click'); }}
                  className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition cursor-pointer ${
                    safeCurrentPage === p
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => { setCurrentPage(Math.min(totalPages, safeCurrentPage + 1)); playSound('click'); }}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* 6. APPLY DISCOUNT MODAL */}
      {discountModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading">Apply Highlight Discount</h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">{discountModalItem.name}</p>
              </div>
              <button onClick={() => setDiscountModalItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyDiscountSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Original Selling Price</label>
                <div className="text-lg font-black text-slate-900 font-mono">₹{discountModalItem.originalPrice || discountModalItem.price}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Discount %</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[10, 15, 20, 25].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercentInput(pct)}
                      className={`py-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                        discountPercentInput === pct 
                          ? 'bg-rose-600 text-white border-rose-600' 
                          : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={discountPercentInput}
                  onChange={(e) => setDiscountPercentInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-center focus:border-rose-500 focus:outline-none"
                  placeholder="Custom %"
                />
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>New Discounted Price:</span>
                  <span className="font-mono text-base font-black text-rose-700">
                    ₹{Math.round((discountModalItem.originalPrice || discountModalItem.price) * (1 - discountPercentInput / 100))}
                  </span>
                </div>
                <p className="text-[10px] text-rose-800">
                  Highlighted with red discount badge and shown first to customers on the QR menu.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Apply Discount</span>
              </button>

              {discountModalItem.hasDiscount && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveDiscount(discountModalItem.id);
                    setDiscountModalItem(null);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 hover:border-rose-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Remove Discount & Restore ₹{discountModalItem.originalPrice || discountModalItem.price}</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 7. EDIT DISH DETAILS MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-heading">Edit Dish Details & Price</h3>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name (English)</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gujarati Name</label>
                <input
                  type="text"
                  value={editingItem.gujarati_name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, gujarati_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Master Cuisine Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master Cuisine / વાનગી પ્રકાર (Customer QR Section)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MASTER_CUISINES.map(c => {
                    const isSel = (editingItem.cuisine || getDishCuisine(editingItem)) === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, cuisine: c.id })}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer flex items-center space-x-1.5 ${
                          isSel 
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold ring-1 ring-orange-400' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base shrink-0">{c.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-black block truncate leading-tight">{c.name.split(' ')[0]}</span>
                          <span className="text-[9px] text-slate-400 block truncate leading-tight">{c.gujarati.split(' ')[0]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  >
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* 1-Click Food Photo Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  1-Click HD Food Photo Presets (ઝડપી ફોટો પસંદ કરો):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {FOOD_PHOTO_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setEditingItem(prev => ({ 
                          ...prev, 
                          image_url: p.url,
                          cuisine: prev.cuisine || p.cuisine 
                        }));
                        setImagePreview(p.url);
                        playSound('click');
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                        (editingItem.image_url === p.url || imagePreview === p.url)
                          ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Dish Photo Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Dish Photo (વાનગીનો ફોટો)
                  </label>
                  {(editingItem.image_url || imagePreview) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(prev => ({ ...prev, image_url: null }));
                        setImagePreview('');
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {(editingItem.image_url || imagePreview) ? (
                  <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-xs">
                      <img 
                        src={editingItem.image_url || imagePreview} 
                        alt="Dish Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Photo Attached</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Visible on customer phone QR menu & admin dish card
                      </p>
                      <label 
                        htmlFor="edit-dish-file-input"
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 mt-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Change Photo</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-3 bg-slate-50/50 hover:bg-orange-50/20 transition-all text-center">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <label 
                          htmlFor="edit-dish-file-input"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Upload from camera or gallery
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  id="edit-dish-file-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                <div className="relative pt-0.5">
                  <input
                    type="url"
                    placeholder="Or paste web image URL (https://...)"
                    value={editingItem.image_url && !editingItem.image_url.startsWith('data:') ? editingItem.image_url : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setEditingItem(prev => ({ ...prev, image_url: val || null }));
                      setImagePreview(val || '');
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 mt-0.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploadingPhoto}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                {isUploadingPhoto ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Uploading Photo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Dish Changes</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. ADD NEW DISH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-heading">Add New Dish to Menu</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name (English)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cheese Mysore Dosa"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gujarati Name (ઓપ્શનલ)</label>
                  <input
                    type="text"
                    placeholder="જેમ કે: ચીઝ માયસોર ઢોસા"
                    value={newItem.gujarati_name}
                    onChange={(e) => setNewItem({ ...newItem, gujarati_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Master Cuisine Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master Cuisine / વાનગી પ્રકાર (Customer QR Section)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MASTER_CUISINES.map(c => {
                    const isSel = (newItem.cuisine || 'south_indian') === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, cuisine: c.id })}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer flex items-center space-x-1.5 ${
                          isSel 
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold ring-1 ring-orange-400' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base shrink-0">{c.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-black block truncate leading-tight">{c.name.split(' ')[0]}</span>
                          <span className="text-[9px] text-slate-400 block truncate leading-tight">{c.gujarati.split(' ')[0]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                  >
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="180"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Freshly prepared crispy pure veg dish..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* 1-Click Food Photo Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  1-Click HD Food Photo Presets (ઝડપી ફોટો પસંદ કરો):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {FOOD_PHOTO_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewItem(prev => ({ 
                          ...prev, 
                          image_url: p.url,
                          cuisine: prev.cuisine || p.cuisine 
                        }));
                        setImagePreview(p.url);
                        playSound('click');
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                        (newItem.image_url === p.url || imagePreview === p.url)
                          ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Dish Photo Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Dish Photo (વાનગીનો ફોટો)
                  </label>
                  {(newItem.image_url || imagePreview) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewItem(prev => ({ ...prev, image_url: null }));
                        setImagePreview('');
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {(newItem.image_url || imagePreview) ? (
                  <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-xs">
                      <img 
                        src={newItem.image_url || imagePreview} 
                        alt="Dish Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Photo Ready</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Will appear on customer phone QR menu & admin dish card
                      </p>
                      <label 
                        htmlFor="add-dish-file-input"
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 mt-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Change Photo</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-3 bg-slate-50/50 hover:bg-orange-50/20 transition-all text-center">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <label 
                          htmlFor="add-dish-file-input"
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Take camera photo or choose from gallery (JPG, PNG)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  id="add-dish-file-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                <div className="relative pt-0.5">
                  <input
                    type="url"
                    placeholder="Or paste web image URL (https://...)"
                    value={newItem.image_url && !newItem.image_url.startsWith('data:') ? newItem.image_url : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setNewItem(prev => ({ ...prev, image_url: val || null }));
                      setImagePreview(val || '');
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 mt-0.5" />
                </div>
              </div>

              {/* Dietary Toggles */}
              <div className="flex items-center space-x-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItem.is_veg}
                    onChange={(e) => setNewItem({ ...newItem, is_veg: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-700">🟢 100% Pure Veg</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItem.is_spicy}
                    onChange={(e) => setNewItem({ ...newItem, is_spicy: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-rose-700">🌶️ Spicy</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploadingPhoto}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                {isUploadingPhoto ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Uploading Photo...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Dish to Menu</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
