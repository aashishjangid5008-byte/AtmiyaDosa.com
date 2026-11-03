import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  Percent, 
  IndianRupee, 
  Gift, 
  Coffee, 
  UtensilsCrossed, 
  Copy, 
  Edit3, 
  Flame, 
  Clock, 
  Search, 
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';
import { playSound } from '../../lib/sound';

// Famous Restaurant & Hotel Promotional Presets
const FAMOUS_PRESETS = [
  {
    id: 'preset_bogo',
    title: 'Buy 2 Dosa Get 1 Free (BOGO)',
    code: 'DOSABOGO',
    description: 'Order any 2 Dosas and get 1 Dosa free! Lowest priced Dosa is complimentary.',
    type: 'bogo',
    target_category: 'Dosa',
    buy_qty: 2,
    get_qty: 1,
    discount: 0,
    min_order: 130,
    badgeText: '🔥 Buy 2 Get 1 Free',
    icon: Flame,
    color: 'from-orange-500 to-amber-500',
    tag: 'Bestseller BOGO'
  },
  {
    id: 'preset_flat20',
    title: 'Flat 20% Off Weekend Feast',
    code: 'ATMIYA20',
    description: 'Get 20% off on table dining orders above ₹399 (Max discount ₹100).',
    type: 'percentage',
    discount: 20,
    max_discount: 100,
    min_order: 399,
    badgeText: '⚡ 20% OFF',
    icon: Percent,
    color: 'from-amber-500 to-orange-500',
    tag: 'Popular Percentage'
  },
  {
    id: 'preset_welcome50',
    title: 'Flat ₹50 Welcome Discount',
    code: 'WELCOME50',
    description: 'Instant ₹50 cash discount for dining guests on bills above ₹250.',
    type: 'flat',
    discount: 50,
    min_order: 250,
    badgeText: '💰 Flat ₹50 OFF',
    icon: IndianRupee,
    color: 'from-emerald-500 to-teal-500',
    tag: 'New Diner Special'
  },
  {
    id: 'preset_free_chaas',
    title: 'Free Masala Chaas on Bills > ₹250',
    code: 'FREECHAAS',
    description: 'Enjoy a chilled glass of Amul Masala Chaas on the house for bills over ₹250.',
    type: 'free_item',
    free_item_name: 'Amul Masala Chaas',
    free_item_value: 20,
    discount: 20,
    min_order: 250,
    badgeText: '🥤 Free Chaas',
    icon: Coffee,
    color: 'from-blue-500 to-cyan-500',
    tag: 'Complimentary Beverage'
  },
  {
    id: 'preset_pav20',
    title: 'Pav Bhaji & Pulao 20% Off',
    code: 'PAV20',
    description: 'Special 20% discount on all Pav Bhaji, Cheese Pav Bhaji, and Pulao items.',
    type: 'category',
    target_category: 'Pav Bhaji & Pulao',
    discount: 20,
    min_order: 120,
    badgeText: '🍛 20% Off Pav Bhaji',
    icon: UtensilsCrossed,
    color: 'from-rose-500 to-orange-500',
    tag: 'Category Special'
  },
  {
    id: 'preset_festive100',
    title: 'Family Feast ₹100 Off',
    code: 'FESTIVE100',
    description: 'Flat ₹100 instant cash discount on large family dining tables above ₹500.',
    type: 'flat',
    discount: 100,
    min_order: 500,
    badgeText: '🎉 Flat ₹100 OFF',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    tag: 'Family Dine-In'
  }
];

export default function OffersView({ 
  coupons = [], 
  onAddCoupon, 
  onUpdateCoupon, 
  onDeleteCoupon, 
  onToggleCoupon, 
  categories = [], 
  menuItems = [],
  currentLang = 'en' 
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const initialFormState = {
    code: '',
    title: '',
    description: '',
    type: 'percentage',
    discount: '',
    min_order: 250,
    max_discount: '',
    target_category: 'Dosa',
    buy_qty: 2,
    get_qty: 1,
    free_item_name: 'Amul Masala Chaas',
    free_item_value: 20,
    badgeText: '',
    active: true
  };

  const [formData, setFormData] = useState(initialFormState);

  const t = (key) => getTranslation(currentLang, key);

  // Open modal for new coupon
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  // Open modal for editing existing coupon
  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      title: coupon.title || '',
      description: coupon.description || '',
      type: coupon.type || 'percentage',
      discount: coupon.discount || '',
      min_order: coupon.min_order ?? 200,
      max_discount: coupon.max_discount || '',
      target_category: coupon.target_category || 'Dosa',
      buy_qty: coupon.buy_qty || 2,
      get_qty: coupon.get_qty || 1,
      free_item_name: coupon.free_item_name || 'Amul Masala Chaas',
      free_item_value: coupon.free_item_value || 20,
      badgeText: coupon.badgeText || '',
      active: coupon.active !== false
    });
    setShowModal(true);
  };

  // Quick Load Preset into Form
  const handleApplyPreset = (preset) => {
    setEditingCoupon(null);
    setFormData({
      code: preset.code,
      title: preset.title,
      description: preset.description,
      type: preset.type,
      discount: preset.discount || '',
      min_order: preset.min_order,
      max_discount: preset.max_discount || '',
      target_category: preset.target_category || 'Dosa',
      buy_qty: preset.buy_qty || 2,
      get_qty: preset.get_qty || 1,
      free_item_name: preset.free_item_name || 'Amul Masala Chaas',
      free_item_value: preset.free_item_value || 20,
      badgeText: preset.badgeText,
      active: true
    });
    setShowModal(true);
    playSound('click');
  };

  const handleCopyCode = (code) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      playSound('click');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code) return;

    const cleanCode = formData.code.trim().toUpperCase().replace(/\s+/g, '');

    const couponPayload = {
      id: editingCoupon ? editingCoupon.id : `c_${Date.now()}`,
      code: cleanCode,
      title: formData.title.trim() || cleanCode,
      description: formData.description.trim() || `${formData.discount || ''} discount on dine-in bill.`,
      type: formData.type,
      discount: parseFloat(formData.discount) || 0,
      min_order: parseFloat(formData.min_order) || 0,
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      target_category: formData.target_category || 'Dosa',
      buy_qty: parseInt(formData.buy_qty, 10) || 2,
      get_qty: parseInt(formData.get_qty, 10) || 1,
      free_item_name: formData.free_item_name,
      free_item_value: parseFloat(formData.free_item_value) || 20,
      badgeText: formData.badgeText.trim() || (formData.type === 'bogo' ? '🔥 Buy 2 Get 1 Free' : (formData.type === 'percentage' ? `${formData.discount}% OFF` : `₹${formData.discount} OFF`)),
      active: formData.active
    };

    if (editingCoupon) {
      if (onUpdateCoupon) onUpdateCoupon(couponPayload);
    } else {
      if (onAddCoupon) onAddCoupon(couponPayload);
    }

    setShowModal(false);
    setEditingCoupon(null);
    setFormData(initialFormState);
    playSound('success');
  };

  const handleDelete = (id) => {
    if (onDeleteCoupon) {
      onDeleteCoupon(id);
    }
    setDeleteConfirmId(null);
    playSound('trash');
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      // Type Filter
      if (filterType !== 'all') {
        if (filterType === 'bogo' && c.type !== 'bogo') return false;
        if (filterType === 'percentage' && c.type !== 'percentage') return false;
        if (filterType === 'flat' && c.type !== 'flat') return false;
        if (filterType === 'free_item' && c.type !== 'free_item') return false;
        if (filterType === 'category' && c.type !== 'category') return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (c.code || '').toLowerCase();
        const title = (c.title || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        return code.includes(q) || title.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [coupons, filterType, searchQuery]);

  const activeCount = coupons.filter(c => c.active).length;
  const bogoCount = coupons.filter(c => c.type === 'bogo').length;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. HERO HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading flex items-center space-x-2">
                <span>{t('offersCoupons')} & Hotel Promotions</span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                  {activeCount} Active Deals
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Launch BOGO (Buy 2 Get 1 Free), flat rupee discounts, free beverages, and festival deals for QR & handheld orders.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Custom Coupon</span>
        </button>
      </div>

      {/* 2. FAMOUS RESTAURANT PROMOTIONAL PRESETS (1-TAP QUICK LAUNCH) */}
      <div className="bg-gradient-to-br from-orange-50/50 via-white to-amber-50/40 p-4 sm:p-5 rounded-3xl border border-orange-200/60 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading uppercase tracking-wide">
              Famous Hotel & Restaurant Promotional Deals (1-Tap Templates)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Click any template to customize & launch instantly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FAMOUS_PRESETS.map(preset => {
            const Icon = preset.icon;
            const alreadyExists = coupons.some(c => c.code === preset.code);

            return (
              <div 
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-orange-400 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono font-black text-[10px] tracking-wider">
                      {preset.code}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {preset.tag}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900 font-heading group-hover:text-orange-600 transition flex items-center space-x-1.5">
                    <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>{preset.title}</span>
                  </h4>

                  <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">
                    Min Bill: ₹{preset.min_order}
                  </span>
                  <span className="text-[10px] font-black text-orange-600 group-hover:underline flex items-center space-x-1">
                    <span>{alreadyExists ? 'Edit / Re-launch' : 'Launch Deal →'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SEARCH & TYPE FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupon codes or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Deals', count: coupons.length },
            { id: 'bogo', label: '🔥 BOGO (Buy 2 Get 1)', count: bogoCount },
            { id: 'percentage', label: '% Off', count: coupons.filter(c => c.type === 'percentage').length },
            { id: 'flat', label: '₹ Cash Off', count: coupons.filter(c => c.type === 'flat').length },
            { id: 'free_item', label: '🥤 Free Dish', count: coupons.filter(c => c.type === 'free_item').length },
            { id: 'category', label: '🍛 Category Deals', count: coupons.filter(c => c.type === 'category').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterType(tab.id); playSound('click'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
                filterType === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="opacity-75 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

      </div>

      {/* 4. COUPONS GRID */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <Tag className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-900 font-heading">No Promo Coupons Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? `No deals matching "${searchQuery}". Clear your search or launch a new template above.` : 'No coupons active in this category. Click any famous preset template above to launch.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCoupons.map(coupon => {
            const isBogo = coupon.type === 'bogo';
            const isPercent = coupon.type === 'percentage';
            const isFlat = coupon.type === 'flat';
            const isFreeItem = coupon.type === 'free_item';
            const isCategory = coupon.type === 'category';

            return (
              <div 
                key={coupon.id} 
                className={`bg-white p-5 rounded-3xl border transition-all duration-300 shadow-2xs hover:shadow-xl hover:-translate-y-1 space-y-3 relative overflow-hidden flex flex-col justify-between group ${
                  coupon.active 
                    ? 'border-slate-200/90 hover:border-orange-400' 
                    : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                }`}
              >
                
                {/* Header Row: Code Pill + Copy + Active Toggle */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-3 py-1 rounded-xl bg-orange-50 text-orange-700 font-mono font-black text-xs border border-orange-200/80 tracking-wider flex items-center space-x-1.5 shadow-2xs">
                        <span>{coupon.code}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-1 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                        title="Copy Promo Code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => { onToggleCoupon(coupon.id); playSound('click'); }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center space-x-1 ${
                        coupon.active 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' 
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={coupon.active ? 'Click to pause this deal' : 'Click to activate this deal'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${coupon.active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                      <span>{coupon.active ? 'Active' : 'Paused'}</span>
                    </button>
                  </div>

                  {/* Main Value Banner */}
                  <div className="mt-3 space-y-1">
                    <div className="text-xl sm:text-2xl font-black text-slate-900 font-heading flex items-center space-x-2">
                      {isBogo && (
                        <span className="text-orange-600 flex items-center space-x-1">
                          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                          <span>Buy {coupon.buy_qty || 2} Get {coupon.get_qty || 1} Free</span>
                        </span>
                      )}
                      {isPercent && <span>{coupon.discount}% OFF</span>}
                      {isFlat && <span>₹{coupon.discount} OFF</span>}
                      {isFreeItem && (
                        <span className="text-emerald-700 flex items-center space-x-1">
                          <Gift className="w-5 h-5 text-emerald-600" />
                          <span>Free {coupon.free_item_name || 'Dish'}</span>
                        </span>
                      )}
                      {isCategory && (
                        <span className="text-rose-600">
                          {coupon.discount}% Off {coupon.target_category}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-800">
                      {coupon.title || coupon.code}
                    </h4>

                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {coupon.description || 'Promotional dine-in discount valid during table checkout.'}
                    </p>
                  </div>

                  {/* Rule Chips */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-600">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70">
                      Min Order: ₹{coupon.min_order}
                    </span>

                    {coupon.max_discount && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/70">
                        Max Cap: ₹{coupon.max_discount}
                      </span>
                    )}

                    {coupon.target_category && (isBogo || isCategory) && (
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200/70">
                        Category: {coupon.target_category}
                      </span>
                    )}

                    {isFreeItem && coupon.free_item_value && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                        Value: ₹{coupon.free_item_value}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Edit, Delete, Live Customer Badge Preview */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-[10px] font-bold text-orange-600">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Customer view: "{coupon.badgeText || 'Discount'}"</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(coupon)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition cursor-pointer hover:scale-110 active:scale-95"
                      title="Edit this coupon"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(coupon.id)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer hover:scale-110 active:scale-95"
                      title="Delete this coupon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. CREATE & EDIT COUPON MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-black text-slate-900 font-heading">
                  {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promotional Deal / Coupon'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Row 1: Code & Badge Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Coupon Code (All Caps)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DOSABOGO or WELCOME50"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold uppercase focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Dish Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. 🔥 Buy 2 Get 1 Free"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Row 2: Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Promotion Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buy 2 Dosa & Get 1 Free"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Order any 2 Dosas and get 1 Dosa free! Lowest priced Dosa is on the house."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Row 4: Discount Model Type Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount Model Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'bogo', label: '🔥 Buy X Get Y Free', desc: 'BOGO Deal' },
                    { id: 'percentage', label: '% Percentage Off', desc: 'e.g. 20% Off' },
                    { id: 'flat', label: '₹ Flat Rupee Off', desc: 'e.g. ₹50 Off' },
                    { id: 'free_item', label: '🥤 Free Dish / Drink', desc: 'Complimentary' },
                    { id: 'category', label: '🍛 Category Deal', desc: 'e.g. 20% Pav Bhaji' }
                  ].map(dt => (
                    <button
                      type="button"
                      key={dt.id}
                      onClick={() => setFormData({ ...formData, type: dt.id })}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        formData.type === dt.id
                          ? 'border-orange-500 bg-orange-50/80 ring-1 ring-orange-300'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-black text-slate-900 text-[11px]">{dt.label}</div>
                      <div className="text-[9.5px] text-slate-500">{dt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields based on Discount Type */}
              {formData.type === 'bogo' && (
                <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-2.5">
                  <div className="font-bold text-orange-950 flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-600" />
                    <span>BOGO (Buy X Get Y Free) Parameters</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Buy Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.buy_qty}
                        onChange={(e) => setFormData({ ...formData, buy_qty: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Get Free Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.get_qty}
                        onChange={(e) => setFormData({ ...formData, get_qty: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Target Category</label>
                      <select
                        value={formData.target_category}
                        onChange={(e) => setFormData({ ...formData, target_category: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                      >
                        <option value="Dosa">Any Dosa</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-800/80">
                    💡 When customer has {formData.buy_qty} or more items in "{formData.target_category}", the lowest-priced qualifying item is discounted as ₹0.
                  </p>
                </div>
              )}

              {formData.type === 'percentage' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Discount Percentage (%)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      placeholder="e.g. 20"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Cap (₹, Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 100 (No limit if empty)"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                    />
                  </div>
                </div>
              )}

              {formData.type === 'flat' && (
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                  <label className="block font-bold text-slate-700 mb-1">Flat Cash Discount Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 50 or 100"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                  />
                </div>
              )}

              {formData.type === 'category' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Eligible Category</label>
                    <select
                      value={formData.target_category}
                      onChange={(e) => setFormData({ ...formData, target_category: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category % Off</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      placeholder="e.g. 20"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                    />
                  </div>
                </div>
              )}

              {formData.type === 'free_item' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Complimentary Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amul Masala Chaas"
                      value={formData.free_item_name}
                      onChange={(e) => setFormData({ ...formData, free_item_name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deduction Value (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.free_item_value}
                      onChange={(e) => setFormData({ ...formData, free_item_value: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Row 5: Minimum Order Requirement */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="250"
                    value={formData.min_order}
                    onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Coupon Status</label>
                  <select
                    value={formData.active ? 'active' : 'paused'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-orange-500"
                  >
                    <option value="active">Active (Available to Guests)</option>
                    <option value="paused">Paused (Temporarily Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-xs shadow-md shadow-orange-500/20 cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingCoupon ? 'Save Changes' : 'Launch Promo Deal'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 font-heading">Delete Promo Coupon?</h3>
              <p className="text-xs text-slate-500">
                This will remove the coupon immediately from customer checkout and staff order pads.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm cursor-pointer"
              >
                Yes, Delete Coupon
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
