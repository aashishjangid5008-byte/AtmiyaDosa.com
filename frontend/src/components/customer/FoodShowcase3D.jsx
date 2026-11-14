import React, { useState } from 'react';
import { 
  Sparkles, 
  Utensils, 
  ArrowRight, 
  ArrowLeft,
  Search, 
  Globe, 
  BellRing, 
  Check,
  ShieldCheck,
  Flame,
  Clock,
  Heart,
  Award
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';

const MASTER_CUISINES = [
  {
    id: 'south_indian',
    name: 'South Indian Dosas',
    gujarati: 'દક્ષિણ ભારતીય ઢોસા',
    image: '/hero_mysore_dosa.jpg',
    tag: '28 Dishes',
    price: 'From ₹60',
    highlight: 'Mysore Masala, Cheese Burst & Gwalior',
    badge: 'Best Seller',
    badgeColor: 'bg-amber-500/20 text-amber-950 border-amber-300'
  },
  {
    id: 'gujarati',
    name: 'Amul Pav Bhaji & Pulao',
    gujarati: 'અમૂલ પાંઉભાજી અને પુલાવ',
    image: '/hero_pav_bhaji.jpg',
    tag: '14 Dishes',
    price: 'From ₹70',
    highlight: 'Melting Amul Butter Pool & Tawa Pulao',
    badge: '100% Amul',
    badgeColor: 'bg-orange-500/20 text-orange-950 border-orange-300'
  },
  {
    id: 'chinese',
    name: 'Indo-Chinese Sizzler',
    gujarati: 'ચાઈનીઝ રાઈસ અને નુડલ્સ',
    image: '/hero_chinese_wok.jpg',
    tag: '32 Dishes',
    price: 'From ₹110',
    highlight: 'Schezwan Wok Rice, Hakka Noodles & Manchurian',
    badge: 'Live Wok',
    badgeColor: 'bg-rose-500/20 text-rose-950 border-rose-300'
  },
  {
    id: 'beverages',
    name: 'Coolers & Desserts',
    gujarati: 'ઠંડા પીણા અને છાસ',
    image: '/hero_masala_chaas.jpg',
    tag: '10 Coolers',
    price: 'From ₹20',
    highlight: 'Clay Matka Masala Chaas, Lassi & Cold Drinks',
    badge: 'Chilled Matka',
    badgeColor: 'bg-sky-500/20 text-sky-950 border-sky-300'
  }
];

export default function FoodShowcase3D({
  restaurantName = 'Atmiya Dosa Hub',
  tableNumber = '01',
  onBackToAdmin,
  onExploreCuisines,
  onViewAllDishes,
  onSelectCuisine,
  onQuickSearch,
  onOpenConcierge,
  currentLang = 'en',
  onLanguageChange,
  onOpenLanguageModal
}) {
  const [searchInput, setSearchInput] = useState('');
  const t = (key) => getTranslation(currentLang, key);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim() && onQuickSearch) {
      onQuickSearch(searchInput.trim());
    } else {
      onViewAllDishes();
    }
  };

  const cleanTableNum = String(tableNumber || '01').replace(/[^0-9]/g, '').padStart(2, '0');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between select-none relative overflow-x-hidden font-sans pb-36">
      
      {/* 1. TOP STATUS & SECURITY BAR (LOCKED TABLE PILL - ZERO DROPDOWN) */}
      <header className="sticky top-0 z-30 px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 border-b border-slate-200 bg-white shadow-2xs">
        
        {/* Verified Dining Table Badge (Non-clickable, table securely locked) */}
        <div className="flex items-center space-x-2">
          {onBackToAdmin && (
            <button
              type="button"
              onClick={onBackToAdmin}
              className="p-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 transition shrink-0 cursor-pointer flex items-center space-x-1"
              title="Return to Staff POS"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black hidden sm:inline">Exit Preview</span>
            </button>
          )}
          <div className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800 flex items-center space-x-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>📍 Table T-{cleanTableNum}</span>
            <span className="text-[10px] text-slate-500 font-sans font-medium hidden xs:inline">• {currentLang === 'gu' ? 'ચકાસાયેલ' : (currentLang === 'hi' ? 'सत्यापित' : 'Verified')}</span>
          </div>

          <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>{t('pureVeg100') || '100% Pure Veg'}</span>
          </span>
        </div>

        {/* Action Controls: Language & Concierge Waiter Call */}
        <div className="flex items-center space-x-2">
          {onOpenLanguageModal ? (
            <button
              type="button"
              onClick={onOpenLanguageModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-950 text-xs font-black transition cursor-pointer shadow-2xs active:scale-95"
              title="Change Language / ભાષા બદલો / भाषा चुनें"
            >
              <Globe className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span>{currentLang === 'gu' ? 'ગુજરાતી' : (currentLang === 'hi' ? 'हिन्दी' : 'English')}</span>
            </button>
          ) : (
            onLanguageChange && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                <select
                  value={currentLang}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="en">English</option>
                  <option value="gu">ગુજરાતી</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>
            )
          )}

          {onOpenConcierge && (
            <button
              type="button"
              onClick={onOpenConcierge}
              className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-black transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Call Captain / Request Water"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t('callServer') || t('service') || 'Call Server'}</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER (PURE WHITE THEME, AIRY & ELEGANT) */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-3.5 sm:px-6 pt-4 space-y-4">
        
        {/* 2. RESTAURANT IDENTITY & WELCOMING CREST */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-orange-600" />
            <span>{currentLang === 'gu' ? 'અસલ લાઈવ તવા અને ગુજરાતની મહેમાનગતિ' : (currentLang === 'hi' ? 'प्रामाणिक लाइव तवा और गुजरात का सत्कार' : 'Authentic Live Tawa & Gujarat Hospitality')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-slate-900">
            {restaurantName}
          </h1>
          <p className="text-xs text-orange-700 font-bold">
            {currentLang === 'gu' ? 'આત્મીય ઢોસા હબ • શુદ્ધ શાકાહારી લાઈવ તવા સ્પેશિયાલિટી' : (currentLang === 'hi' ? 'आत्मीय डोसा हब • शुद्ध शाकाहारी लाइव तवा स्पेशियलिटी' : 'Atmiya Dosa Hub • 100% Pure Veg Live Tawa Specialty')}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            📍 {currentLang === 'gu' ? `સ્ટેશન રોડ, પેટલાદ, આણંદ • ટેબલ T-${cleanTableNum} પર ડિજિટલ મેનૂ` : (currentLang === 'hi' ? `स्टेशन रोड, पेटलाद, आणंद • टेबल T-${cleanTableNum} पर डिजिटल मेन्यू` : `Station Road, Petlad, Anand District • Touchless Dining at Table T-${cleanTableNum}`)}
          </p>
        </div>

        {/* 3. QUICK SEARCH INPUT */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={currentLang === 'gu' ? '૧૭૭+ વાનગીઓ શોધો (દા.ત. મૈસુર, પાવભાજી, મંચુરિયન)...' : (currentLang === 'hi' ? '१७७+ व्यंजन खोजें (उदा. मैसूर, पाव भाजी, मंचूरियन)...' : 'Search 177+ dishes (e.g. Mysore, Pav Bhaji, Manchurian)...')}
            className="w-full pl-10 pr-24 py-3 rounded-2xl bg-white border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-2xs"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black active:scale-95 text-white font-black text-xs transition cursor-pointer shadow-xs"
          >
            {t('search') || 'Search'}
          </button>
        </form>

        {/* 4. 4 MASTER CULINARY STATIONS (CLEAN 2X2 WHITE CARDS - ZERO CONGESTION) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <Utensils className="w-3.5 h-3.5 text-orange-600" />
              <span>{currentLang === 'gu' ? 'મુખ્ય વાનગીઓ અને કેટેગરીઝ' : (currentLang === 'hi' ? 'मुख्य व्यंजन और श्रेणियां' : 'Explore Menu Categories')}</span>
            </span>
            <button
              type="button"
              onClick={onViewAllDishes}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-0.5 cursor-pointer"
            >
              <span>{t('viewAll') || 'View All'} (177)</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {MASTER_CUISINES.map((cuisine) => (
              <button
                key={cuisine.id}
                type="button"
                onClick={() => {
                  if (onSelectCuisine) onSelectCuisine(cuisine.id);
                  else onViewAllDishes();
                }}
                className="rounded-3xl bg-white hover:bg-orange-50/20 border border-slate-200/90 hover:border-orange-400 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer group shadow-xs hover:shadow-lg flex flex-col justify-between overflow-hidden"
              >
                {/* Visual Gourmet Food Photograph */}
                <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-slate-100">
                  <img 
                    src={cuisine.image} 
                    alt={cuisine.name} 
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-black/10 to-transparent pointer-events-none" />
                  
                  {/* Category Badge */}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono backdrop-blur-md shadow-xs border ${cuisine.badgeColor} bg-white/95`}>
                    {cuisine.badge}
                  </span>

                  {/* Volume Tag */}
                  <span className="absolute bottom-1.5 left-2.5 text-[10px] font-mono font-bold text-white drop-shadow-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{cuisine.tag}</span>
                  </span>
                </div>

                {/* Text Content */}
                <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 group-hover:text-orange-600 transition-colors leading-tight">
                      {currentLang === 'gu' ? cuisine.gujarati : cuisine.name}
                    </h3>
                    <p className="text-[10px] text-orange-700 font-bold mt-0.5">
                      {currentLang === 'gu' ? cuisine.name : cuisine.gujarati}
                    </p>
                    <p className="text-[10px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                      {cuisine.highlight}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-900 font-black flex items-center justify-between">
                    <span className="text-orange-600 font-black">{cuisine.price}</span>
                    <span className="text-slate-400 group-hover:text-orange-600 font-bold flex items-center gap-0.5 text-[9px] transition-colors">
                      {currentLang === 'gu' ? 'જુઓ' : (currentLang === 'hi' ? 'देखें' : 'Explore')} <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 5. QUALITY & HOSPITALITY PILLARS (CLEAN WHITE TIER) */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-amber-950 block">{currentLang === 'gu' ? '૧૦૦% અમૂલ' : (currentLang === 'hi' ? '१००% अमूल' : '100% Amul')}</span>
            <span className="text-[9px] text-slate-500 block leading-tight font-medium">{currentLang === 'gu' ? 'શુદ્ધ બટર માત્ર' : (currentLang === 'hi' ? 'केवल शुद्ध मक्खन' : 'Pure Butter Only')}</span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-emerald-950 block">{currentLang === 'gu' ? 'શુદ્ધ શાકાહારી' : (currentLang === 'hi' ? 'शुद्ध शाकाहारी' : 'Pure Veg')}</span>
            <span className="text-[9px] text-slate-500 block leading-tight font-medium">{currentLang === 'gu' ? 'જૈન વિકલ્પ ઉપલબ્ધ' : (currentLang === 'hi' ? 'जैन विकल्प उपलब्ध' : 'Jain Options Ready')}</span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 mx-auto flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-orange-950 block">{currentLang === 'gu' ? 'લાઈવ તવા' : (currentLang === 'hi' ? 'लाइव तवा' : 'Live Tawa')}</span>
            <span className="text-[9px] text-slate-500 block leading-tight font-medium">{currentLang === 'gu' ? 'તાજું તૈયાર' : (currentLang === 'hi' ? 'ताज़ा तैयार' : 'Fresh Cooked')}</span>
          </div>
        </div>

      </main>

      {/* 6. BOTTOM STICKY CALL TO ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-xl">
        <div className="max-w-md mx-auto space-y-1.5">
          
          <button
            type="button"
            onClick={onViewAllDishes}
            className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.99] text-white font-black text-sm sm:text-base font-heading shadow-md flex items-center justify-between transition cursor-pointer"
          >
            <div className="text-left">
              <span className="block leading-tight">{currentLang === 'gu' ? 'આખું મેનૂ જુઓ અને ઓર્ડર કરો' : (currentLang === 'hi' ? 'पूरा मेन्यू देखें और ऑर्डर करें' : 'Explore Full Menu & Order')}</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                {currentLang === 'gu' ? '૧૭૭+ વાનગીઓ • આખું મેનૂ જુઓ' : (currentLang === 'hi' ? '१७७+ व्यंजन • पूरा मेन्यू देखें' : '177+ Dishes • View Full Menu')}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>

          <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{currentLang === 'gu' ? `ટેબલ T-${cleanTableNum} પર બેઠેલા છો` : (currentLang === 'hi' ? `टेबल T-${cleanTableNum} पर बैठे हैं` : `Seated at Table T-${cleanTableNum}`)}</span>
            <span>•</span>
            <span>{currentLang === 'gu' ? 'જોવા અને ઓર્ડર કરવા માટે કોઈપણ વાનગી પસંદ કરો' : (currentLang === 'hi' ? 'देखने और ऑर्डर करने के लिए किसी भी व्यंजन को चुनें' : 'Touch any dish to browse & customize')}</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
