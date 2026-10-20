import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  IndianRupee, 
  Users, 
  Clock, 
  Plus, 
  QrCode, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight, 
  CheckCircle2, 
  Sparkles,
  Printer, 
  Download, 
  Phone, 
  Search, 
  AlertCircle, 
  Database, 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  TrendingDown,
  ShieldCheck, 
  Receipt, 
  X, 
  Layers, 
  Activity, 
  Flame, 
  Award, 
  Calendar, 
  Utensils,
  PieChart as PieChartIcon,
  BarChart2,
  Filter,
  Zap,
  Sun,
  Moon,
  Tag,
  RefreshCw,
  Trophy,
  Coffee,
  ChefHat,
  Eye,
  Sliders,
  Settings,
  Check,
  Edit2,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { supabase, RESTAURANT_ID, recordEmployeeActivity } from '../../lib/supabase';

export default function ExecutiveDashboard({ 
  restaurantSettings,
  tables = [], 
  orders = [], 
  menuItems = [], 
  categories = [], 
  currentLang = 'en', 
  theme = 'light',
  onThemeChange,
  onNavigate,
  onOpenAddOrder,
  onOpenAddItem,
  onOpenGenerateQR,
  onOpenApplyCoupon
}) {
  // 1. Dashboard Customization State (persisted in localStorage)
  const [dashboardConfig, setDashboardConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_dashboard_config');
      return saved ? JSON.parse(saved) : {
        showKpis: true,
        showPieChart: true,
        showSalesWave: true,
        showItemCommandCenter: true,
        showLiveTables: true,
        showRushHeatmap: true,
        chartType: 'donut', // 'donut' | 'pie'
        viewDensity: 'standard' // 'standard' | 'compact'
      };
    } catch {
      return {
        showKpis: true,
        showPieChart: true,
        showSalesWave: true,
        showItemCommandCenter: true,
        showLiveTables: true,
        showRushHeatmap: true,
        chartType: 'donut',
        viewDensity: 'standard'
      };
    }
  });

  const updateConfig = (key, val) => {
    const updated = { ...dashboardConfig, [key]: val };
    setDashboardConfig(updated);
    try {
      localStorage.setItem('admin_dashboard_config', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // 2. Editable Daily Target Sales Goal (persisted in localStorage)
  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_daily_sales_target');
      return saved ? Number(saved) : 40000;
    } catch {
      return 40000;
    }
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInputVal, setTargetInputVal] = useState(dailyTarget);

  const handleSaveDailyTarget = () => {
    const num = Number(targetInputVal);
    if (!isNaN(num) && num > 0) {
      setDailyTarget(num);
      try {
        localStorage.setItem('admin_daily_sales_target', num.toString());
      } catch (e) {
        console.warn(e);
      }
      setIsEditingTarget(false);
    }
  };

  // 3. Analytics Controls
  const [timeframe, setTimeframe] = useState('hourly'); // 'hourly' | 'weekly' | 'monthly'
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | '7days' | 'month'
  const [selectedPointIndex, setSelectedPointIndex] = useState(5);
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'volume'
  const [pieMetric, setPieMetric] = useState('volume'); // 'volume' | 'revenue'
  const [pieChartStyle, setPieChartStyle] = useState(dashboardConfig.chartType || 'donut'); // 'donut' | 'pie'

  // 4. All-In-One Item Command Center State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [demandTab, setDemandTab] = useState('all'); // 'all' | 'bestsellers' | 'low_demand'
  const [dishSearch, setDishSearch] = useState('');
  const [dishSortBy, setDishSortBy] = useState('volume'); // 'volume' | 'revenue' | 'margin' | 'price'
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [selectedSlice, setSelectedSlice] = useState('all');
  const [categoryViewMode, setCategoryViewMode] = useState('active'); // 'active' | 'all'

  // Inline Price Editing State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingPriceVal, setEditingPriceVal] = useState('');

  // Modals & Real-time Sessions
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [crmSearch, setCrmSearch] = useState('');
  const [liveSessions, setLiveSessions] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);

  const isDark = theme !== 'light';

  // Ultra-Professional Theme Palette
  const palette = useMemo(() => {
    if (theme === 'sapphire') {
      return {
        bg: 'bg-[#070D1E]',
        cardBg: 'bg-[#0D1836]',
        cardBorder: 'border-indigo-900/50',
        cardHover: 'hover:border-indigo-700/60',
        innerBox: 'bg-[#091228]/80 border-indigo-950/80',
        textPrimary: 'text-slate-100',
        textSecondary: 'text-slate-400',
        accentGrad: 'from-indigo-600 to-blue-600',
        activePill: 'bg-indigo-600 text-white shadow-xs font-semibold'
      };
    }
    if (theme === 'obsidian') {
      return {
        bg: 'bg-[#090D16]',
        cardBg: 'bg-[#111827]',
        cardBorder: 'border-slate-800/80',
        cardHover: 'hover:border-slate-700',
        innerBox: 'bg-[#0D1322] border-slate-800/90',
        textPrimary: 'text-slate-100',
        textSecondary: 'text-slate-400',
        accentGrad: 'from-amber-600 to-amber-500',
        activePill: 'bg-slate-800 text-white border border-slate-700 shadow-xs font-semibold'
      };
    }
    // Default: 'light' — Classic, High-End Enterprise Hospitality (Toast / Square / Linear)
    return {
      bg: 'bg-[#F8FAFC]',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-200/80',
      cardHover: 'hover:border-slate-300 hover:shadow-xs',
      innerBox: 'bg-slate-50 border-slate-200/70',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-500',
      accentGrad: 'from-amber-600 to-amber-500',
      activePill: 'bg-slate-900 text-white shadow-xs font-semibold'
    };
  }, [theme]);

  // Real Data Aggregation Engine from Supabase orders & props
  const effectiveOrders = useMemo(() => {
    if (liveOrders && liveOrders.length > 0) return liveOrders;
    return orders || [];
  }, [liveOrders, orders]);

  const getOrderItems = (order) => {
    if (Array.isArray(order.order_items) && order.order_items.length > 0) {
      return order.order_items.map(i => ({
        name: i.item_name || i.name,
        qty: Number(i.quantity || i.qty) || 1,
        price: Number(i.unit_price || i.price) || 0
      }));
    }
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map(i => ({
        name: i.name,
        qty: Number(i.qty || i.quantity) || 1,
        price: Number(i.price) || 0
      }));
    }
    return [];
  };

  const validOrders = useMemo(() => {
    return effectiveOrders.filter(o => {
      const s = (o.status || '').toUpperCase();
      return s !== 'CANCELLED';
    });
  }, [effectiveOrders]);

  const realTotalRevenue = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (Number(o.total_amount || o.total) || 0), 0);
  }, [validOrders]);

  const realTotalVolume = useMemo(() => {
    return validOrders.reduce((sum, o) => {
      const itms = getOrderItems(o);
      return sum + itms.reduce((isum, itm) => isum + itm.qty, 0);
    }, 0);
  }, [validOrders]);

  const realAov = validOrders.length > 0 ? Math.round(realTotalRevenue / validOrders.length) : 0;

  const activeSessionsCount = liveSessions.filter(s => s.status === 'ACTIVE').length;
  const occupiedTablesCount = activeSessionsCount > 0 
    ? activeSessionsCount 
    : tables.filter(t => (t.status || '').toLowerCase() === 'occupied' || (t.status || '').toLowerCase() === 'busy').length;
  const totalTablesCount = Math.max(tables.length, 16);
  const occupancyPercent = totalTablesCount > 0 ? Math.round((occupiedTablesCount / totalTablesCount) * 100) : 0;

  // Executive Timeframe Datasets - Realtime Database Aggregation
  const chartDatasets = useMemo(() => {
    // 1. Hourly Buckets
    const hourlySlots = [
      { key: '10 AM', label: '10 AM', minH: 0, maxH: 11, status: 'Breakfast' },
      { key: '12 PM', label: '12 PM', minH: 11, maxH: 13, status: 'Lunch Rush' },
      { key: '02 PM', label: '02 PM', minH: 13, maxH: 15, status: 'Afternoon' },
      { key: '04 PM', label: '04 PM', minH: 15, maxH: 17, status: 'Snacks' },
      { key: '06 PM', label: '06 PM', minH: 17, maxH: 19, status: 'Early Evening' },
      { key: '08 PM', label: '08 PM', minH: 19, maxH: 21, status: '🔥 Mega Peak Dinner' },
      { key: '10 PM', label: '10 PM', minH: 21, maxH: 24, status: 'Late Dining' }
    ];

    const hourlyPoints = hourlySlots.map(slot => {
      const slotOrders = validOrders.filter(o => {
        const ts = o.placed_at || o.time;
        if (!ts) return false;
        const d = new Date(ts);
        const h = isNaN(d.getTime()) ? 12 : d.getHours();
        return h >= slot.minH && h < slot.maxH;
      });

      const rev = slotOrders.reduce((sum, o) => sum + (Number(o.total_amount || o.total) || 0), 0);
      const vol = slotOrders.reduce((sum, o) => {
        const itms = getOrderItems(o);
        return sum + itms.reduce((isum, itm) => isum + itm.qty, 0);
      }, 0);

      const dishCounts = {};
      slotOrders.forEach(o => {
        getOrderItems(o).forEach(i => {
          dishCounts[i.name] = (dishCounts[i.name] || 0) + i.qty;
        });
      });
      let topDish = '-';
      let topCount = 0;
      Object.entries(dishCounts).forEach(([name, count]) => {
        if (count > topCount) {
          topCount = count;
          topDish = name;
        }
      });

      return {
        label: slot.label,
        revenue: rev,
        orders: slotOrders.length,
        volume: vol,
        peakDish: topDish,
        status: slot.status
      };
    });

    // 2. Weekly Buckets
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderedWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyPoints = orderedWeekDays.map(dayName => {
      const dayOrders = validOrders.filter(o => {
        const ts = o.placed_at || o.time;
        if (!ts) return false;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return false;
        return weekDays[d.getDay()] === dayName;
      });
      const rev = dayOrders.reduce((sum, o) => sum + (Number(o.total_amount || o.total) || 0), 0);
      const vol = dayOrders.reduce((sum, o) => {
        const itms = getOrderItems(o);
        return sum + itms.reduce((isum, itm) => isum + itm.qty, 0);
      }, 0);
      return {
        label: dayName,
        revenue: rev,
        orders: dayOrders.length,
        volume: vol,
        peakDish: dayOrders.length > 0 ? 'Live Order' : '-',
        status: dayName === 'Sat' || dayName === 'Sun' ? 'Weekend' : 'Weekday'
      };
    });

    // 3. Monthly Buckets
    const monthlyPoints = [1, 2, 3, 4].map(w => {
      const weekOrders = validOrders.filter(o => {
        const ts = o.placed_at || o.time;
        if (!ts) return false;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return false;
        const dom = d.getDate();
        return dom >= (w - 1) * 7 + 1 && dom <= (w === 4 ? 31 : w * 7);
      });
      const rev = weekOrders.reduce((sum, o) => sum + (Number(o.total_amount || o.total) || 0), 0);
      const vol = weekOrders.reduce((sum, o) => {
        const itms = getOrderItems(o);
        return sum + itms.reduce((isum, itm) => isum + itm.qty, 0);
      }, 0);
      return {
        label: `Week ${w}`,
        revenue: rev,
        orders: weekOrders.length,
        volume: vol,
        peakDish: weekOrders.length > 0 ? 'Live Menu' : '-',
        status: `Week ${w}`
      };
    });

    return {
      hourly: {
        title: "Today's Sales & Volume Velocity",
        subtitle: validOrders.length > 0 
          ? `Recorded ${validOrders.length} orders & ${realTotalVolume} plates live in Supabase` 
          : 'Waiting for orders. Scan table QR code to start.',
        total: `₹${realTotalRevenue.toLocaleString('en-IN')}`,
        totalOrders: validOrders.length,
        totalVolume: realTotalVolume,
        points: hourlyPoints
      },
      weekly: {
        title: 'This Week Sales & Volume Trajectory',
        subtitle: `Total weekly revenue ₹${realTotalRevenue.toLocaleString('en-IN')} across ${validOrders.length} orders`,
        total: `₹${realTotalRevenue.toLocaleString('en-IN')}`,
        totalOrders: validOrders.length,
        totalVolume: realTotalVolume,
        points: weeklyPoints
      },
      monthly: {
        title: 'Monthly Revenue & Volume Milestones',
        subtitle: `Compounded monthly sales ₹${realTotalRevenue.toLocaleString('en-IN')} from Supabase database`,
        total: `₹${realTotalRevenue.toLocaleString('en-IN')}`,
        totalOrders: validOrders.length,
        totalVolume: realTotalVolume,
        points: monthlyPoints
      }
    };
  }, [validOrders, realTotalRevenue, realTotalVolume]);

  const currentDataset = chartDatasets[timeframe] || chartDatasets.hourly;
  const maxRevenue = Math.max(1, ...currentDataset.points.map(p => p.revenue));
  const maxVolume = Math.max(1, ...currentDataset.points.map(p => p.volume || p.orders * 2.2));
  const activePointIndex = Math.min(selectedPointIndex, currentDataset.points.length - 1);
  const activePoint = currentDataset.points[activePointIndex] || currentDataset.points[0];

  // SVG Spline Wave Calculations
  const numPoints = currentDataset.points.length;
  const svgCoords = currentDataset.points.map((pt, i) => {
    const x = numPoints > 1 ? (i / (numPoints - 1)) * 900 + 50 : 500;
    const value = chartMetric === 'revenue' ? pt.revenue : (pt.volume || pt.orders * 2.2);
    const maxValue = chartMetric === 'revenue' ? maxRevenue : maxVolume;
    const y = 160 - ((value / maxValue) * 120);
    return { x, y, pt };
  });

  const generateSvgPath = (coords) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const splinePath = generateSvgPath(svgCoords);
  const areaPath = svgCoords.length > 0 
    ? `${splinePath} L ${svgCoords[svgCoords.length - 1].x} 190 L ${svgCoords[0].x} 190 Z` 
    : '';

  // 5. CATEGORY PIE / DONUT BREAKDOWN DATASET - REALTIME SUPABASE AGGREGATION
  const categoryStats = useMemo(() => {
    const catColors = ['#F59E0B', '#6366F1', '#EC4899', '#10B981', '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6'];
    const catMap = {};

    (categories || []).forEach((c, idx) => {
      catMap[c.name] = {
        id: `cat_${c.id || idx}`,
        name: c.name,
        guj: c.gujarati || c.name,
        color: catColors[idx % catColors.length],
        volume: 0,
        revenue: 0,
        dishCounts: {}
      };
    });

    const itemCatLookup = {};
    (menuItems || []).forEach(m => {
      itemCatLookup[m.name] = m.category || 'Other';
      if (!catMap[m.category]) {
        catMap[m.category] = {
          id: `cat_${Object.keys(catMap).length}`,
          name: m.category,
          guj: m.category,
          color: catColors[Object.keys(catMap).length % catColors.length],
          volume: 0,
          revenue: 0,
          dishCounts: {}
        };
      }
    });

    validOrders.forEach(o => {
      getOrderItems(o).forEach(i => {
        const catName = itemCatLookup[i.name] || 'Mysore Dosa';
        if (!catMap[catName]) {
          catMap[catName] = {
            id: `cat_${Object.keys(catMap).length}`,
            name: catName,
            guj: catName,
            color: catColors[Object.keys(catMap).length % catColors.length],
            volume: 0,
            revenue: 0,
            dishCounts: {}
          };
        }
        catMap[catName].volume += i.qty;
        catMap[catName].revenue += i.qty * i.price;
        catMap[catName].dishCounts[i.name] = (catMap[catName].dishCounts[i.name] || 0) + i.qty;
      });
    });

    const list = Object.values(catMap);
    const totalVol = list.reduce((s, c) => s + c.volume, 0);

    return list.map(c => {
      let topDish = '-';
      let maxC = 0;
      Object.entries(c.dishCounts).forEach(([name, cnt]) => {
        if (cnt > maxC) { maxC = cnt; topDish = name; }
      });
      const percentage = totalVol > 0 ? Math.round((c.volume / totalVol) * 100) : 0;
      return {
        ...c,
        percentage,
        avgPlatePrice: c.volume > 0 ? `₹${Math.round(c.revenue / c.volume)}` : '₹0',
        topDish: topDish !== '-' ? topDish : c.name
      };
    }).sort((a, b) => b.volume - a.volume);
  }, [categories, menuItems, validOrders]);

  const totalCategoryVolume = categoryStats.reduce((sum, c) => sum + c.volume, 0);
  const totalCategoryRevenue = categoryStats.reduce((sum, c) => sum + c.revenue, 0);

  // SVG Pie & Donut Angle Calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82

  let accumulatedDonutOffset = 0;
  let accumulatedAngle = 0;

  const pieAndDonutSegments = useMemo(() => {
    let currAngle = -Math.PI / 2; // start from top (12 o'clock)
    let donutOffset = 0;

    return categoryStats.map((cat) => {
      const val = pieMetric === 'volume' ? cat.volume : cat.revenue;
      const total = pieMetric === 'volume' ? totalCategoryVolume : totalCategoryRevenue;
      const share = (val / total) * 100;
      const angle = (share / 100) * (2 * Math.PI);

      // Donut dash values
      const strokeLength = (share / 100) * circumference;
      const dashoffset = -donutOffset;
      donutOffset += strokeLength;

      // Solid Pie Path calculation
      const startAngle = currAngle;
      const endAngle = currAngle + angle;
      currAngle += angle;

      const pieR = 82;
      const cx = 100;
      const cy = 100;
      const x1 = cx + pieR * Math.cos(startAngle);
      const y1 = cy + pieR * Math.sin(startAngle);
      const x2 = cx + pieR * Math.cos(endAngle);
      const y2 = cy + pieR * Math.sin(endAngle);
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const piePath = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${pieR} ${pieR} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

      return {
        ...cat,
        share: share.toFixed(1),
        strokeLength,
        dashoffset,
        piePath,
        midAngle: (startAngle + endAngle) / 2
      };
    });
  }, [categoryStats, pieMetric, totalCategoryVolume, totalCategoryRevenue, circumference]);

  const activeCategoryData = categoryStats.find(c => c.id === selectedSlice) || categoryStats[0];

  const activeHoveredOrSelected = useMemo(() => {
    const targetId = hoveredSlice || (selectedSlice !== 'all' ? selectedSlice : null);
    if (!targetId) return null;
    return pieAndDonutSegments.find(s => s.id === targetId) || null;
  }, [hoveredSlice, selectedSlice, pieAndDonutSegments]);

  const activeCategorySegments = useMemo(() => {
    return pieAndDonutSegments.filter(c => (pieMetric === 'volume' ? c.volume : c.revenue) > 0);
  }, [pieAndDonutSegments, pieMetric]);

  const displayedCategorySegments = useMemo(() => {
    if (categoryViewMode === 'active' && activeCategorySegments.length > 0) {
      return activeCategorySegments;
    }
    return pieAndDonutSegments;
  }, [categoryViewMode, activeCategorySegments, pieAndDonutSegments]);

  // 6. ALL-IN-ONE MENU ITEM COMMAND CENTER DATASET - BOUND TO SUPABASE MENU ITEMS
  const defaultDishes = useMemo(() => {
    if (!menuItems || menuItems.length === 0) return [];
    
    const salesMap = {};
    validOrders.forEach(o => {
      getOrderItems(o).forEach(i => {
        salesMap[i.name] = (salesMap[i.name] || 0) + i.qty;
      });
    });

    return menuItems.map((item, idx) => {
      const qty = salesMap[item.name] || 0;
      const price = Number(item.finalPrice || item.price || 0);
      const rev = qty * price;
      const cost = Math.round(price * 0.4);
      const margin = price > 0 ? `${Math.round(((price - cost) / price) * 100)}%` : '60%';

      return {
        id: item.id || `dish_${idx}`,
        rank: idx + 1,
        name: item.name,
        guj: item.gujarati_name || item.name,
        category: item.category || 'Menu',
        price: price,
        costPrice: cost,
        volumeQty: qty,
        revenue: rev,
        prepTime: item.prepTimeMins ? `${item.prepTimeMins}m` : '10m',
        rating: 4.8,
        isAvailable: item.is_available !== false,
        velocity: qty > 5 ? '🚀 Super Bestseller' : qty > 0 ? '🔥 Active Mover' : 'Available',
        velocityType: qty > 5 ? 'super' : qty > 0 ? 'hot' : 'steady',
        margin: margin,
        recommendation: qty > 0 ? `${qty} plates ordered. Popular choice.` : 'Ready on menu.'
      };
    }).sort((a, b) => b.volumeQty - a.volumeQty);
  }, [menuItems, validOrders]);

  // Synchronized dishes list (allowing inline availability toggle & price edit)
  const [itemsList, setItemsList] = useState(defaultDishes);

  useEffect(() => {
    if (defaultDishes.length > 0) {
      setItemsList(defaultDishes);
    }
  }, [defaultDishes]);

  // Handle Availability 1-Click Toggle
  const handleToggleItemAvailability = (itemId) => {
    const updated = itemsList.map(dish => {
      if (dish.id === itemId) {
        return { ...dish, isAvailable: !dish.isAvailable };
      }
      return dish;
    });
    setItemsList(updated);
    try {
      localStorage.setItem('restaurant_dashboard_dishes', JSON.stringify(updated));
      window.dispatchEvent(new Event('restaurant_data_updated'));
    } catch (e) {
      console.warn(e);
    }
    const target = updated.find(d => d.id === itemId);
    recordEmployeeActivity(
      'DARSHIT RANA',
      'admin',
      'ITEM_AVAILABILITY_CHANGED',
      `Toggled "${target.name}" to ${target.isAvailable ? 'AVAILABLE (In Stock)' : 'OUT OF STOCK'}`
    );
  };

  // Handle Inline Price Edit Save
  const handleSaveItemPrice = (itemId) => {
    const newPrice = Number(editingPriceVal);
    if (isNaN(newPrice) || newPrice <= 0) return;

    const updated = itemsList.map(dish => {
      if (dish.id === itemId) {
        const cost = dish.costPrice || Math.round(dish.price * 0.4);
        const marginVal = Math.round(((newPrice - cost) / newPrice) * 100);
        return { 
          ...dish, 
          price: newPrice,
          margin: `${marginVal}%`,
          revenue: dish.volumeQty * newPrice
        };
      }
      return dish;
    });

    setItemsList(updated);
    setEditingItemId(null);
    setEditingPriceVal('');

    try {
      localStorage.setItem('restaurant_dashboard_dishes', JSON.stringify(updated));
      window.dispatchEvent(new Event('restaurant_data_updated'));
    } catch (e) {
      console.warn(e);
    }

    const target = updated.find(d => d.id === itemId);
    recordEmployeeActivity(
      'DARSHIT RANA',
      'admin',
      'MENU_PRICE_UPDATED',
      `Updated price of "${target.name}" to ₹${newPrice}`
    );
  };

  const maxDishVolume = Math.max(...itemsList.map(d => d.volumeQty));

  // Filtered Dishes for All-in-One Command Table
  const filteredDishes = useMemo(() => {
    return itemsList
      .filter(dish => {
        if (demandTab === 'bestsellers') return dish.rank <= 6;
        if (demandTab === 'low_demand') return dish.rank >= 9;
        return true;
      })
      .filter(dish => {
        if (selectedCategory === 'all') return true;
        return dish.category.toLowerCase().includes(selectedCategory.toLowerCase());
      })
      .filter(dish => {
        if (selectedSlice !== 'all') {
          const cat = categoryStats.find(c => c.id === selectedSlice);
          if (cat) {
            return dish.category.toLowerCase().includes(cat.name.toLowerCase());
          }
        }
        return true;
      })
      .filter(dish => {
        if (!dishSearch.trim()) return true;
        const q = dishSearch.toLowerCase();
        return dish.name.toLowerCase().includes(q) || dish.guj.includes(q) || dish.category.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (dishSortBy === 'volume') return b.volumeQty - a.volumeQty;
        if (dishSortBy === 'revenue') return b.revenue - a.revenue;
        if (dishSortBy === 'margin') return parseInt(b.margin) - parseInt(a.margin);
        if (dishSortBy === 'price') return b.price - a.price;
        return a.rank - b.rank;
      });
  }, [itemsList, demandTab, selectedCategory, selectedSlice, dishSearch, dishSortBy, categoryStats]);

  // Hourly Peak Rush Heatmap Data - Dynamically calculated from live orders
  const rushHours = useMemo(() => {
    const slots = [
      { hour: '10 AM - 12 PM', session: 'Morning Breakfast', minH: 10, maxH: 12, tip: 'Idli & Medu Vada counters active' },
      { hour: '12 PM - 03 PM', session: 'Lunch Rush', minH: 12, maxH: 15, tip: 'Pav Bhaji & Mysore Dosa combo peak' },
      { hour: '03 PM - 07 PM', session: 'Afternoon & Snacks', minH: 15, maxH: 19, tip: 'Cold Drinks, Chaas & Light Dosa' },
      { hour: '07 PM - 10 PM', session: '🔥 Mega Peak Dinner', minH: 19, maxH: 22, tip: 'Bahubali, Gotala, Jini Roll peak demand' },
      { hour: '10 PM - 11 PM', session: 'Late Dining & Takeout', minH: 22, maxH: 24, tip: 'Kitchen closing & parcel orders' },
    ];

    return slots.map(s => {
      const ords = validOrders.filter(o => {
        const ts = o.placed_at || o.time;
        if (!ts) return false;
        const d = new Date(ts);
        const h = isNaN(d.getTime()) ? 12 : d.getHours();
        return h >= s.minH && h < s.maxH;
      });
      const plates = ords.reduce((sum, o) => {
        const itms = getOrderItems(o);
        return sum + itms.reduce((isum, itm) => isum + itm.qty, 0);
      }, 0);
      const rushLevel = ords.length >= 10 ? 'HOUSEFULL' : ords.length >= 5 ? 'High' : ords.length >= 2 ? 'Medium' : ords.length > 0 ? 'Active' : 'Quiet';
      const load = Math.min(100, ords.length * 20);

      return {
        hour: s.hour,
        session: s.session,
        orders: ords.length,
        plates: plates,
        rush: rushLevel,
        speed: '10m avg',
        load: `${load}%`,
        tip: ords.length > 0 ? `${ords.length} orders recorded` : s.tip
      };
    });
  }, [validOrders]);

  // Fetch live Supabase data
  const fetchLiveSupabaseData = async () => {
    try {
      const { data: sessData } = await supabase
        .from('table_sessions')
        .select('*, restaurant_tables(table_number, floor)')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('opened_at', { ascending: false });

      if (sessData && sessData.length > 0) {
        setLiveSessions(sessData);
      }

      const { data: ordData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('placed_at', { ascending: false });

      if (ordData && ordData.length > 0) {
        setLiveOrders(ordData);
      }
    } catch (err) {
      console.warn('Supabase fetch error, fallback to props:', err);
    }
  };

  useEffect(() => {
    fetchLiveSupabaseData();

    const channel = supabase
      .channel('executive_dashboard_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchLiveSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
        fetchLiveSupabaseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displaySessions = liveSessions;

  const handleSettleSession = async (session) => {
    if (!window.confirm(`Settle and close session for ${session.table_number || session.session_code}? Table will become clean and VACANT.`)) {
      return;
    }
    try {
      if (session.id && !session.id.startsWith('sess_')) {
        await supabase
          .from('table_sessions')
          .update({ status: 'COMPLETED', closed_at: new Date().toISOString() })
          .eq('id', session.id);

        if (session.table_id) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'VACANT' })
            .eq('id', session.table_id);
        }
      }
      await recordEmployeeActivity(
        'DARSHIT RANA',
        'admin',
        'SESSION_SETTLED',
        `Settled session for ${session.table_number || 'table'} - ₹${session.total_amount}`,
        session.table_number
      );
      fetchLiveSupabaseData();
      alert(`✅ Session settled successfully! ${session.table_number || 'Table'} is now VACANT.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Target Goal Calculations
  const currentTodaySales = realTotalRevenue;
  const targetPercent = dailyTarget > 0 ? Math.min(100, Math.round((currentTodaySales / dailyTarget) * 100)) : 0;

  return (
    <div className={`space-y-6 pb-20 font-sans transition-colors duration-200 ${palette.textPrimary}`}>
      
      {/* 1. EXECUTIVE IDENTITY & CUSTOMIZATION COMMAND BAR */}
      <div className={`p-5 sm:p-6 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all`}>
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xl tracking-tight shadow-md shadow-orange-500/20 shrink-0 font-heading">
            DR
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`text-xl sm:text-2xl font-black font-heading tracking-tight ${palette.textPrimary}`}>
                DARSHIT RANA
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
                Restaurant Owner & Director
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Cloud POS Online</span>
              </span>
            </div>
            <p className={`text-xs ${palette.textSecondary} font-medium mt-1`}>
              Atmiya Dosa Hub • Executive Operations & Analytics (Petlad, Anand)
            </p>
          </div>
        </div>

        {/* Action Controls: Customize View, Floor QRs, Add Item */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          
          {/* Quick Date Range Filter */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl transition ${dateFilter === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-xl transition ${dateFilter === 'yesterday' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 rounded-xl transition ${dateFilter === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              7 Days
            </button>
          </div>

          {/* CUSTOMIZE DASHBOARD BUTTON */}
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Adjust & customize what you see on the dashboard"
          >
            <SlidersHorizontal className="w-4 h-4 text-orange-600" />
            <span>Customize View</span>
          </button>

          <button
            onClick={onOpenGenerateQR}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>Floor QRs</span>
          </button>
          
          <button
            onClick={onOpenAddItem}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPIS + EDITABLE DAILY SALES GOAL METER */}
      {dashboardConfig.showKpis && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          
          {/* Tile 1: Total Revenue */}
          <div className={`p-5 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm transition`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Today's Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm">
                ₹
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${palette.textPrimary}`}>
                {currentDataset.total}
              </span>
            </div>
            <div className="mt-2.5 flex items-center text-[11px] font-bold text-emerald-700 space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Realtime Live Sync</span>
            </div>
          </div>

          {/* Tile 2: Volume Tracked */}
          <div className={`p-5 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm transition`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Volume Tracked</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${palette.textPrimary}`}>
                {currentDataset.totalVolume} Plates
              </span>
            </div>
            <div className="mt-2.5 text-[11px] font-semibold text-slate-600">
              Across {currentDataset.totalOrders} dining tickets
            </div>
          </div>

          {/* Tile 3: Average Order Value */}
          <div className={`p-5 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm transition`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Avg Ticket (AOV)</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs">
                AOV
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${palette.textPrimary}`}>
                ₹{realAov}
              </span>
            </div>
            <div className="mt-2.5 text-[11px] font-semibold text-slate-600">
              {validOrders.length > 0 ? `Calculated across ${validOrders.length} live orders` : 'Calculated live from orders'}
            </div>
          </div>

          {/* Tile 4: Active Occupancy */}
          <div className={`p-5 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm transition`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Floor Seated</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${palette.textPrimary}`}>
                {occupiedTablesCount} / {totalTablesCount} Tables
              </span>
            </div>
            <div className="mt-2.5 text-[11px] font-semibold text-slate-600">
              {occupancyPercent}% Current Floor Seated
            </div>
          </div>

          {/* Tile 5: EDITABLE DAILY SALES GOAL CARD */}
          <div className={`col-span-2 lg:col-span-1 p-5 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm transition flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Daily Target</span>
              <button
                onClick={() => { setIsEditingTarget(true); setTargetInputVal(dailyTarget); }}
                className="text-[10px] font-bold text-slate-700 hover:text-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer flex items-center space-x-1"
                title="Click to edit your daily target goal"
              >
                <Edit2 className="w-2.5 h-2.5" />
                <span>Edit</span>
              </button>
            </div>

            {isEditingTarget ? (
              <div className="mt-2 bg-slate-50 p-2 rounded-xl border border-slate-300 text-slate-900 flex items-center space-x-1.5">
                <span className="font-bold text-xs text-slate-600">₹</span>
                <input
                  type="number"
                  value={targetInputVal}
                  onChange={(e) => setTargetInputVal(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveDailyTarget}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${palette.textPrimary}`}>
                    {targetPercent}%
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    ₹{currentTodaySales.toLocaleString()} / ₹{dailyTarget.toLocaleString()}
                  </span>
                </div>
                
                {/* Target Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 mt-2.5 overflow-hidden border border-slate-200">
                  <div 
                    style={{ width: `${Math.min(100, targetPercent)}%` }} 
                    className={`h-full rounded-full transition-all duration-500 ${targetPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                </div>
                <span className="block text-[11px] text-slate-600 mt-1.5 font-semibold">
                  {targetPercent >= 100 ? '🎉 Goal Achieved!' : `₹${(dailyTarget - currentTodaySales).toLocaleString()} remaining`}
                </span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. UNIFIED VISUAL ANALYTICS: INTERACTIVE CATEGORY PIE CHART + SALES VELOCITY WAVE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT / PIE CHART (6 COLS): WORLD-CLASS INTERACTIVE PIE & DONUT VISUALIZER */}
        {dashboardConfig.showPieChart && (
          <div className={`lg:col-span-6 p-6 sm:p-7 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm space-y-5 transition-all`}>
            
            {/* Header with Visual Style & Metric Toggles */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/80'} pb-4`}>
              <div>
                <div className="flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5 text-orange-500" />
                  <h2 className={`text-base font-black font-heading ${palette.textPrimary}`}>
                    Category Demand Pie & Volume
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Click any slice to filter and inspect items in that category
                </p>
              </div>

              {/* Toggles: Donut vs Pie & Volume vs Revenue */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Pie vs Donut Style Toggle */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-xs">
                  <button
                    onClick={() => { setPieChartStyle('donut'); updateConfig('chartType', 'donut'); }}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                      pieChartStyle === 'donut' 
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Donut
                  </button>
                  <button
                    onClick={() => { setPieChartStyle('pie'); updateConfig('chartType', 'pie'); }}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                      pieChartStyle === 'pie' 
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Pie
                  </button>
                </div>

                {/* Metric: Volume vs Revenue */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-xs">
                  <button
                    onClick={() => setPieMetric('volume')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                      pieMetric === 'volume' 
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Volume
                  </button>
                  <button
                    onClick={() => setPieMetric('revenue')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                      pieMetric === 'revenue' 
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Revenue (₹)
                  </button>
                </div>

              </div>
            </div>

            {/* Quick Category Chips Strip: Scroll Over & Hover to Select */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedSlice('all')}
                onMouseEnter={() => setHoveredSlice(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 border ${
                  selectedSlice === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                All Categories
              </button>
              {pieAndDonutSegments.map((cat) => {
                const isSelected = selectedSlice === cat.id;
                const isHovered = hoveredSlice === cat.id;
                const hasSales = (pieMetric === 'volume' ? cat.volume : cat.revenue) > 0;
                if (!hasSales && categoryViewMode === 'active') return null;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedSlice(selectedSlice === cat.id ? 'all' : cat.id)}
                    onMouseEnter={() => setHoveredSlice(cat.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 border shadow-2xs ${
                      isSelected || isHovered
                        ? 'ring-2 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                    style={{
                      borderColor: isSelected || isHovered ? cat.color : '#e2e8f0',
                      backgroundColor: isSelected || isHovered ? `${cat.color}15` : '#ffffff',
                      color: isSelected || isHovered ? cat.color : '#0f172a'
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-black text-slate-900">{cat.name}</span>
                    <span className="font-mono text-[10px] text-slate-600 font-bold">({cat.share}%)</span>
                  </button>
                );
              })}
            </div>

            {/* SVG Canvas & Rich Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              
              {/* SVG Visual (Solid Pie or Donut) */}
              <div className="sm:col-span-6 flex flex-col items-center justify-center relative p-2">
                <div className="relative w-56 h-56 sm:w-60 sm:h-60">
                  
                  {pieChartStyle === 'donut' ? (
                    /* DONUT CHART */
                    <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform">
                      {pieAndDonutSegments.map((segment) => {
                        const isHovered = hoveredSlice === segment.id;
                        const isSelected = selectedSlice === segment.id;

                        return (
                          <circle
                            key={segment.id}
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={isSelected ? '28' : (isHovered ? '25' : '21')}
                            strokeDasharray={`${segment.strokeLength} ${circumference}`}
                            strokeDashoffset={segment.dashoffset}
                            strokeLinecap="round"
                            onClick={() => setSelectedSlice(selectedSlice === segment.id ? 'all' : segment.id)}
                            onMouseEnter={() => setHoveredSlice(segment.id)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            className="cursor-pointer transition-all duration-300"
                            style={{
                              filter: isSelected ? `drop-shadow(0px 0px 6px ${segment.color})` : 'none',
                              opacity: (selectedSlice !== 'all' && !isSelected && !isHovered) ? 0.45 : 1
                            }}
                          />
                        );
                      })}
                    </svg>
                  ) : (
                    /* SOLID PIE CHART */
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {pieAndDonutSegments.map((segment) => {
                        const isHovered = hoveredSlice === segment.id;
                        const isSelected = selectedSlice === segment.id;

                        return (
                          <path
                            key={segment.id}
                            d={segment.piePath}
                            fill={segment.color}
                            stroke="#FFFFFF"
                            strokeWidth={isSelected ? '3' : '2'}
                            onClick={() => setSelectedSlice(selectedSlice === segment.id ? 'all' : segment.id)}
                            onMouseEnter={() => setHoveredSlice(segment.id)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            className="cursor-pointer transition-all duration-300 hover:brightness-110"
                            style={{
                              transformOrigin: '100px 100px',
                              transform: (isHovered || isSelected) ? 'scale(1.05)' : 'scale(1)',
                              opacity: (selectedSlice !== 'all' && !isSelected && !isHovered) ? 0.45 : 1
                            }}
                          />
                        );
                      })}
                    </svg>
                  )}

                  {/* Donut Center Label (Visible in Donut mode - Updates dynamically on hover!) */}
                  {pieChartStyle === 'donut' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                      {activeHoveredOrSelected ? (
                        <>
                          <span 
                            className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[130px]"
                            style={{ color: activeHoveredOrSelected.color }}
                          >
                            {activeHoveredOrSelected.name}
                          </span>
                          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 mt-0.5">
                            {pieMetric === 'volume' ? `${activeHoveredOrSelected.volume}p` : `₹${activeHoveredOrSelected.revenue.toLocaleString()}`}
                          </span>
                          <span 
                            className="text-[9px] font-bold mt-1 px-2 py-0.2 rounded-full"
                            style={{ backgroundColor: `${activeHoveredOrSelected.color}20`, color: activeHoveredOrSelected.color }}
                          >
                            {activeHoveredOrSelected.share}% Share
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {pieMetric === 'volume' ? 'Total Volume' : 'Total Revenue'}
                          </span>
                          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 mt-0.5">
                            {pieMetric === 'volume' ? `${totalCategoryVolume}p` : `₹${(totalCategoryRevenue / 1000).toFixed(1)}k`}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold mt-1 px-2 py-0.2 rounded-full bg-emerald-50 border border-emerald-200">
                            100% Demand
                          </span>
                        </>
                      )}
                    </div>
                  )}

                </div>

                {/* Status Indicator Under Pie / Donut */}
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => { setSelectedSlice('all'); setHoveredSlice(null); }}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      selectedSlice === 'all' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    Reset Filter
                  </button>
                  {selectedSlice !== 'all' && (
                    <span className="text-[11px] font-bold text-orange-600 truncate max-w-[140px]">
                      Filtered: {categoryStats.find(c => c.id === selectedSlice)?.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Category Breakdown Cards on Right of Pie: Scrollable & Active Filtered */}
              <div className="sm:col-span-6 flex flex-col">
                {/* Header with Active vs All Toggle */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</span>
                    <span className="text-[10px] font-mono font-bold text-orange-600 bg-orange-100 px-1.5 py-0.2 rounded">
                      {displayedCategorySegments.length}
                    </span>
                  </div>

                  {/* Active vs All Segmented Filter */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-xs">
                    <button
                      onClick={() => setCategoryViewMode('active')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                        categoryViewMode === 'active'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      Active ({activeCategorySegments.length})
                    </button>
                    <button
                      onClick={() => setCategoryViewMode('all')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                        categoryViewMode === 'all'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      All ({pieAndDonutSegments.length})
                    </button>
                  </div>
                </div>

                {/* Scrollable Category List with Fixed Max Height */}
                <div className="max-h-72 overflow-y-auto pr-1.5 space-y-2">
                  {displayedCategorySegments.map((cat) => {
                    const isSelected = selectedSlice === cat.id;
                    const isHovered = hoveredSlice === cat.id;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedSlice(selectedSlice === cat.id ? 'all' : cat.id)}
                        onMouseEnter={() => setHoveredSlice(cat.id)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-xs ${
                          isSelected || isHovered
                            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div 
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white" 
                            style={{ backgroundColor: cat.color }} 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className={`truncate text-xs ${isSelected || isHovered ? 'text-amber-800 font-black' : 'text-slate-900 font-bold'}`}>
                                {cat.name}
                              </span>
                              <span className="font-mono font-black text-slate-900 text-xs ml-2 shrink-0">
                                {pieMetric === 'volume' ? `${cat.volume}p` : `₹${cat.revenue.toLocaleString()}`}
                              </span>
                            </div>
                            
                            {/* Mini Progress Bar */}
                            <div className="w-full h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden border border-slate-200/60">
                              <div 
                                style={{ width: `${Math.max(1, Number(cat.share))}%`, backgroundColor: cat.color }} 
                                className="h-full rounded-full transition-all duration-300"
                              />
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70 shrink-0">
                          {cat.share}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* RIGHT / SALES VELOCITY (6 COLS): DUAL-METRIC SALES VELOCITY WAVE */}
        {dashboardConfig.showSalesWave && (
          <div className={`lg:col-span-6 p-6 sm:p-7 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm space-y-4 transition-all`}>
            
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/80'} pb-4`}>
              <div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <h2 className={`text-base font-black font-heading ${palette.textPrimary}`}>
                    {currentDataset.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {currentDataset.subtitle}
                </p>
              </div>

              {/* Timeframe & Metric Toggle */}
              <div className="flex items-center space-x-1.5">
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer font-bold ${chartMetric === 'revenue' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Revenue (₹)
                  </button>
                  <button
                    onClick={() => setChartMetric('volume')}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer font-bold ${chartMetric === 'volume' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Volume (Plates)
                  </button>
                </div>

                <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => { setTimeframe('hourly'); setSelectedPointIndex(5); }}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer font-bold ${timeframe === 'hourly' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => { setTimeframe('weekly'); setSelectedPointIndex(5); }}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer font-bold ${timeframe === 'weekly' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => { setTimeframe('monthly'); setSelectedPointIndex(3); }}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer font-bold ${timeframe === 'monthly' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Month
                  </button>
                </div>
              </div>
            </div>

            {/* Active Milestone Card */}
            <div className={`p-3.5 rounded-2xl ${palette.innerBox} flex items-center justify-between text-xs transition border border-slate-200`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs font-mono">
                  {activePoint.label}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-black text-sm font-mono ${palette.textPrimary}`}>
                      {chartMetric === 'revenue' 
                        ? `₹${activePoint.revenue.toLocaleString('en-IN')}` 
                        : `${activePoint.volume || activePoint.orders * 2} Plates`}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold text-[10px] border border-slate-200 shadow-2xs">
                      {activePoint.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {activePoint.orders} tickets • Top Dish: <strong className="font-bold text-slate-900">{activePoint.peakDish}</strong>
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-mono font-bold text-[11px] text-slate-700 shadow-xs">
                Turn: 18m
              </span>
            </div>

            {/* Precision SVG Canvas & Pillars */}
            <div className="pt-2 relative">
              
              {/* Spline Wave SVG Line */}
              <div className="w-full h-24 mb-2">
                <svg viewBox="0 0 1000 200" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="whiteWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {areaPath && (
                    <path d={areaPath} fill="url(#whiteWaveGrad)" />
                  )}
                  {splinePath && (
                    <path 
                      d={splinePath} 
                      fill="none" 
                      stroke="#EA580C" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                    />
                  )}
                  {svgCoords.map((coord, idx) => (
                    <circle
                      key={idx}
                      cx={coord.x}
                      cy={coord.y}
                      r={idx === activePointIndex ? 6 : 4}
                      fill={idx === activePointIndex ? '#EA580C' : '#FFFFFF'}
                      stroke="#EA580C"
                      strokeWidth="2.5"
                    />
                  ))}
                </svg>
              </div>

              {/* Slender Data Columns */}
              <div className="grid grid-cols-7 gap-2 items-end pt-1">
                {currentDataset.points.map((pt, index) => {
                  const val = chartMetric === 'revenue' ? pt.revenue : (pt.volume || pt.orders * 2.2);
                  const max = chartMetric === 'revenue' ? maxRevenue : maxVolume;
                  const heightPct = Math.max(16, Math.min(100, Math.round((val / max) * 100)));
                  const isSelected = index === activePointIndex;

                  return (
                    <div 
                      key={index}
                      onClick={() => setSelectedPointIndex(index)}
                      className="flex flex-col items-center justify-end h-full group cursor-pointer"
                    >
                      <div className={`mb-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition shadow-2xs ${
                        isSelected ? 'bg-orange-600 text-white scale-105' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {chartMetric === 'revenue' 
                          ? (pt.revenue >= 1000 ? `₹${(pt.revenue / 1000).toFixed(1)}k` : `₹${pt.revenue}`)
                          : `${pt.volume || pt.orders * 2}p`}
                      </div>

                      <div className="w-full max-w-[34px] h-28 bg-slate-100 rounded-xl p-1 flex flex-col justify-end items-center border border-slate-200/80">
                        <div 
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-lg transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-t from-orange-600 to-amber-500 shadow-xs' 
                              : 'bg-slate-300 group-hover:bg-orange-400'
                          }`}
                        />
                      </div>

                      <span className={`text-[11px] font-bold mt-1.5 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`}>
                        {pt.label}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* 4. "CHECKS THE ITEMS IN ONE PLACE" — ALL-IN-ONE MENU ITEM COMMAND CENTER & QUICK-EDITOR */}
      {dashboardConfig.showItemCommandCenter && (
        <div className={`p-6 sm:p-7 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm space-y-5 transition-all`}>
          
          {/* Header & Controls Bar */}
          <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/80'} pb-4`}>
            <div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-orange-500" />
                <h2 className={`text-base sm:text-lg font-black font-heading ${palette.textPrimary}`}>
                  Menu Items Demand & Live Control Center ({filteredDishes.length} Items)
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Check and customize dish demand, volume sold, live stock availability, and edit prices right in one place
              </p>
            </div>

            {/* Sub-Filters: All, Bestsellers, Dead Stock */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setDemandTab('all')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold ${demandTab === 'all' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All Menu Items ({itemsList.length})
                </button>
                <button
                  onClick={() => setDemandTab('bestsellers')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold ${demandTab === 'bestsellers' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Top Sellers
                </button>
                <button
                  onClick={() => setDemandTab('low_demand')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold ${demandTab === 'low_demand' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Low Demand
                </button>
              </div>

              {/* Dynamic Category Filter Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSlice('all'); }}
                className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set([
                  ...categories.map(c => c.name),
                  ...menuItems.map(m => m.category)
                ].filter(Boolean))).map(cat => (
                  <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                ))}
              </select>

              {/* Sort By Dropdown */}
              <select
                value={dishSortBy}
                onChange={(e) => setDishSortBy(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="volume">Sort by: Quantity Volume (Plates)</option>
                <option value="revenue">Sort by: Revenue (₹)</option>
                <option value="margin">Sort by: Profit Margin %</option>
                <option value="price">Sort by: Selling Price (₹)</option>
              </select>
            </div>
          </div>

          {/* Search Bar & Active Slice Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search dish by English name, Gujarati (માયસોર, બાહુબલી) or category..."
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {selectedSlice !== 'all' && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-slate-500">Filtered by Pie Slice:</span>
                <span className="px-2.5 py-1 rounded-xl bg-orange-100 text-orange-800 font-bold border border-orange-200 flex items-center space-x-1.5">
                  <span>{categoryStats.find(c => c.id === selectedSlice)?.name}</span>
                  <button onClick={() => setSelectedSlice('all')} className="hover:text-red-600">×</button>
                </span>
              </div>
            )}
          </div>

          {/* THE ALL-IN-ONE DATA & ACTION TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Rank & Dish Details</th>
                  <th className="py-3 px-4">Demand Velocity</th>
                  <th className="py-3 px-4">Live Availability</th>
                  <th className="py-3 px-4">Selling Price (Editable)</th>
                  <th className="py-3 px-4">Volume (Plates Sold)</th>
                  <th className="py-3 px-4">Total Revenue</th>
                  <th className="py-3 px-4">Margin %</th>
                  <th className="py-3 px-4">AI Turnaround Tip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredDishes.map((dish) => {
                  const volumePct = Math.round((dish.volumeQty / maxDishVolume) * 100);
                  const isEditingThisPrice = editingItemId === dish.id;

                  return (
                    <tr key={dish.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* 1. Rank & Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                            dish.rank === 1 ? 'bg-amber-100 text-amber-800 font-black' : (dish.rank <= 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600')
                          }`}>
                            #{dish.rank}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {dish.name}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 block">
                              {dish.guj}
                            </span>
                            <span className="text-[10px] font-bold text-orange-600 mt-0.5 inline-block">
                              {dish.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Demand Velocity Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          dish.velocityType === 'super'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : (dish.velocityType === 'hot' || dish.velocityType === 'fast'
                              ? 'bg-orange-50 text-orange-800 border-orange-200'
                              : (dish.velocityType === 'low'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'))
                        }`}>
                          {dish.velocity}
                        </span>
                      </td>

                      {/* 3. Live Stock Availability Toggle Switch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleItemAvailability(dish.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                            dish.isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle In Stock vs Sold Out in real-time"
                        >
                          <span className={`w-2 h-2 rounded-full ${dish.isAvailable ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          <span>{dish.isAvailable ? 'In Stock 🟢' : 'Sold Out 🔴'}</span>
                        </button>
                      </td>

                      {/* 4. Inline Price Editor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEditingThisPrice ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-500 font-bold">₹</span>
                            <input
                              type="number"
                              value={editingPriceVal}
                              onChange={(e) => setEditingPriceVal(e.target.value)}
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-orange-300 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveItemPrice(dish.id)}
                              className="p-1 rounded bg-orange-600 hover:bg-orange-700 text-white"
                              title="Save Price"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => { setEditingItemId(dish.id); setEditingPriceVal(dish.price); }}
                            className="flex items-center space-x-1.5 group cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-lg transition"
                            title="Click to edit item price"
                          >
                            <span className="font-mono font-black text-slate-900 text-xs">
                              ₹{dish.price}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* 5. Volume Sold */}
                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono font-black text-slate-900">{dish.volumeQty} Plates</span>
                            <span className="font-mono text-[10px] text-slate-400">{volumePct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              style={{ width: `${volumePct}%` }} 
                              className={`h-full rounded-full ${dish.rank <= 3 ? 'bg-orange-500' : 'bg-slate-400'}`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Total Gross Revenue */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-slate-900">
                        ₹{dish.revenue.toLocaleString()}
                      </td>

                      {/* 7. Margin % */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          parseInt(dish.margin) >= 65 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {dish.margin}
                        </span>
                      </td>

                      {/* 8. AI Strategy Tip */}
                      <td className="py-3.5 px-4 min-w-[200px] text-[11px] text-slate-600">
                        {dish.recommendation}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 5. ACTIVE TABLE SESSIONS & COD VS ONLINE RECONCILIATION */}
      {dashboardConfig.showLiveTables && (
        <div className={`p-6 sm:p-7 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm space-y-5 transition-all`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/80'} pb-4`}>
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className={`text-base sm:text-lg font-black font-heading ${palette.textPrimary}`}>
                  Live Table Sessions & Bill Settlement ({displaySessions.filter(s => s.status === 'ACTIVE').length} Tables Seated)
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Clear distinction between online paid and COD (Cash on Table). Includes 30-min auto-vacate calculation and 1-click vacate.
              </p>
            </div>

            <button
              onClick={fetchLiveSupabaseData}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Live Supabase Tables</span>
            </button>
          </div>

          {displaySessions.filter(s => s.status === 'ACTIVE').length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-700">All dining tables are currently clean & VACANT</p>
              <p className="text-xs text-slate-400 mt-1">Live table sessions will appear here as soon as guests scan table QR codes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displaySessions.filter(s => s.status === 'ACTIVE').map(session => {
              const elapsedMinutes = Math.round((Date.now() - new Date(session.opened_at).getTime()) / 60000);
              const isOvertime = elapsedMinutes > 30;
              const isOnlinePaid = session.payment_status === 'PAID';

              return (
                <div 
                  key={session.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isOvertime 
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20' 
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center">
                        {session.table_number || 'T01'}
                      </span>
                      <div>
                        <h4 className="font-black text-xs text-slate-900">{session.customer_name || 'Guest'}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{session.customer_phone || ''}</span>
                      </div>
                    </div>

                    {/* Online vs COD Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isOnlinePaid 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-orange-100 text-orange-800 border-orange-300'
                    }`}>
                      {isOnlinePaid ? 'Online Paid (UPI) 🟢' : 'COD (Cash Due) 🟠'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Items:</span>
                      <strong className="text-slate-800 font-medium truncate max-w-[170px]">{session.items_summary || 'Mysore Masala + Chaas'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Elapsed Time:</span>
                      <span className={`font-mono font-bold ${isOvertime ? 'text-amber-700' : 'text-slate-700'}`}>
                        {elapsedMinutes} mins {isOvertime && '(Eligible for Auto-Vacate)'}
                      </span>
                    </div>
                    <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-100">
                      <span>Total Bill:</span>
                      <span className="font-mono text-orange-600">₹{session.total_amount}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleSettleSession(session)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Vacate & Settle</span>
                    </button>

                    <button
                      onClick={() => setSelectedReceiptOrder({
                        order_number: session.session_code,
                        table_number: session.table_number,
                        customer_name: session.customer_name,
                        customer_phone: session.customer_phone,
                        items_summary: session.items_summary,
                        total_amount: session.total_amount,
                        payment_method: session.payment_method,
                        payment_status: session.payment_status,
                        placed_at: session.opened_at
                      })}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                      title="Download or Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* 6. PEAK DINING RUSH HEATMAP */}
      {dashboardConfig.showRushHeatmap && (
        <div className={`p-6 sm:p-7 rounded-3xl ${palette.cardBg} border ${palette.cardBorder} shadow-xs hover:shadow-sm space-y-4 transition-all`}>
          <div className={`flex items-center justify-between border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/80'} pb-3`}>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h2 className={`text-base font-black font-heading ${palette.textPrimary}`}>
                Hourly Kitchen Prep & Tawa Staffing Heatmap
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Kitchen Turnaround: 11m Average
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {rushHours.map((slot, i) => (
              <div 
                key={i}
                className={`p-4 rounded-2xl border transition ${
                  slot.rush === 'HOUSEFULL' 
                    ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-400/20' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  {slot.hour}
                </span>
                <h4 className="font-black text-sm text-slate-900 mt-1">
                  {slot.session}
                </h4>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-700">{slot.plates} Plates</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    slot.rush === 'HOUSEFULL' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {slot.rush}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                  <div 
                    style={{ width: slot.load }} 
                    className={`h-full rounded-full ${slot.rush === 'HOUSEFULL' ? 'bg-orange-500' : 'bg-slate-400'}`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  {slot.tip}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DASHBOARD CUSTOMIZE MODAL / DRAWER */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black font-heading text-slate-900">
                  Customize Executive Dashboard
                </h3>
              </div>
              <button 
                onClick={() => setShowCustomizeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customization Options */}
            <div className="space-y-4 text-xs">
              
              {/* Daily Sales Target Goal Setting */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-2">
                <span className="font-bold text-slate-900 block">Daily Target Sales Goal (₹)</span>
                <p className="text-[11px] text-slate-600">Set your restaurant's daily sales milestone. The progress bar updates in real time.</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="font-bold text-sm text-slate-800">₹</span>
                  <input
                    type="number"
                    value={targetInputVal}
                    onChange={(e) => setTargetInputVal(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-orange-300 bg-white text-xs font-mono font-bold focus:outline-none"
                  />
                  <button
                    onClick={handleSaveDailyTarget}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
                  >
                    Save Target
                  </button>
                </div>
              </div>

              {/* Toggle Sections Visibility */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider text-slate-400">
                  Visible Dashboard Sections
                </span>

                <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <span className="font-medium text-slate-800">1. Executive KPI Cards & Daily Goal</span>
                  <input
                    type="checkbox"
                    checked={dashboardConfig.showKpis}
                    onChange={(e) => updateConfig('showKpis', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <span className="font-medium text-slate-800">2. Interactive Category Pie / Donut Chart</span>
                  <input
                    type="checkbox"
                    checked={dashboardConfig.showPieChart}
                    onChange={(e) => updateConfig('showPieChart', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <span className="font-medium text-slate-800">3. Sales Velocity & Order Volume Spline Wave</span>
                  <input
                    type="checkbox"
                    checked={dashboardConfig.showSalesWave}
                    onChange={(e) => updateConfig('showSalesWave', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <span className="font-medium text-slate-800">4. Menu Items Demand & Live Control Table</span>
                  <input
                    type="checkbox"
                    checked={dashboardConfig.showItemCommandCenter}
                    onChange={(e) => updateConfig('showItemCommandCenter', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <span className="font-medium text-slate-800">5. Live Table Sessions & Bill Settlement</span>
                  <input
                    type="checkbox"
                    checked={dashboardConfig.showLiveTables}
                    onChange={(e) => updateConfig('showLiveTables', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <span className="font-medium text-slate-800">6. Hourly Kitchen Prep & Staffing Heatmap</span>
                  <input
                    type="checkbox"
                    checked={dashboardConfig.showRushHeatmap}
                    onChange={(e) => updateConfig('showRushHeatmap', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </label>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. PRINTABLE TAX INVOICE & THERMAL RECEIPT MODAL */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 bg-white p-6 space-y-4 relative animate-in fade-in zoom-in-95 text-slate-900">
            
            <button
              onClick={() => setSelectedReceiptOrder(null)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 absolute top-4 right-4 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Body */}
            <div id="printable-receipt" className="p-5 rounded-2xl bg-white border border-slate-200 font-mono text-xs space-y-3 text-slate-900">
              <div className="text-center space-y-1">
                <h4 className="font-black text-base uppercase tracking-tight text-slate-900">
                  ATMIYA DOSA HUB
                </h4>
                <p className="text-[10px] text-slate-500">
                  Opp. New Bus Station, Station Road, Petlad, Anand, Gujarat - 388450
                </p>
                <p className="text-[10px] text-slate-500">GSTIN: 24AAACA1234A1Z5 • Phone: +91 98765 43210</p>
                <div className="border-b border-dashed border-slate-300 pt-2"></div>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Order: {selectedReceiptOrder.order_number}</span>
                <span>Table: {selectedReceiptOrder.table_number}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Guest: {selectedReceiptOrder.customer_name || 'Walk-in'}</span>
                <span>{selectedReceiptOrder.customer_phone || ''}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Date: {new Date(selectedReceiptOrder.placed_at || Date.now()).toLocaleString()}
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Items */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{selectedReceiptOrder.items_summary || 'Mysore Masala Dosa + Pav Bhaji'}</span>
                  <span>₹{selectedReceiptOrder.total_amount}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Calculations */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{(selectedReceiptOrder.total_amount * 0.952).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>GST (5% Included):</span>
                  <span>₹{(selectedReceiptOrder.total_amount * 0.048).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300 text-slate-900">
                  <span>NET TOTAL:</span>
                  <span>₹{selectedReceiptOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              <div className="text-center text-[10px] text-slate-500">
                Payment: {selectedReceiptOrder.payment_method} ({selectedReceiptOrder.payment_status})
                <br />
                Thank you for dining with Atmiya Dosa Hub! Visit again.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill (KOT / Thermal)</span>
              </button>
              <button
                onClick={() => {
                  alert('Tax Invoice downloaded to receipts folder.');
                  setSelectedReceiptOrder(null);
                }}
                className="py-2.5 px-4 rounded-xl border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
