import React from 'react';
import { ArrowRight, ChevronRight, Sparkles, Utensils, ArrowLeft } from 'lucide-react';
import { MASTER_CUISINES } from '../../lib/cuisines';

export default function CuisineSelector({
  restaurantName = 'Atmiya Dosa Hub',
  tableNumber = '1',
  menuItems = [],
  onOpenTableSelect,
  onSelectCuisine,
  onBackToLanding,
  onViewAll
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 max-w-lg mx-auto">
      
      {/* 1. HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Back to 3D Intro"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-black text-slate-900 font-heading leading-tight">
              Select Cuisine / વાનગી પસંદ કરો
            </h1>
            <div className="text-[11px] text-slate-600 font-bold flex items-center space-x-1">
              <span>📍 Table {tableNumber}</span>
              <span className="text-slate-400 font-normal">• Atmiya Dosa Hub</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-bold text-orange-600 hover:text-orange-700 underline underline-offset-2 cursor-pointer"
        >
          View All ({menuItems.length})
        </button>
      </header>

      {/* 2. PROMPT BANNER */}
      <div className="px-4 pt-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md space-y-1">
          <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-amber-100">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Pure Veg Live Kitchen</span>
          </div>
          <h2 className="text-sm font-black font-heading leading-snug">
            Choose a cuisine below to view dishes & order directly
          </h2>
          <p className="text-[11px] text-amber-100 font-medium">
            તાજી અને ગરમાગરમ વાનગીઓ • ટેબલ પર સીધા ઓર્ડર કરો
          </p>
        </div>
      </div>

      {/* 3. THE 4 PRIMARY CUISINE CARDS (2x2 Grid on Mobile) */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {MASTER_CUISINES.map((cuisine) => {
          return (
            <div
              key={cuisine.id}
              data-cuisine-id={cuisine.id}
              onClick={() => onSelectCuisine(cuisine.id)}
              className="bg-white rounded-3xl p-4 border border-slate-200 hover:border-orange-500 shadow-xs hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group relative overflow-hidden"
            >
              {/* Top Accent Gradient Ribbon */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cuisine.bgGradient}`}></div>

              {/* Visual Gourmet Food Photography Header */}
              <div className="relative w-full h-28 sm:h-32 -mx-4 -mt-4 mb-1 overflow-hidden bg-slate-100">
                <img 
                  src={cuisine.image} 
                  alt={cuisine.name} 
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                <span className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono shadow-xs backdrop-blur-md bg-white/95 border ${cuisine.badgeColor}`}>
                  {cuisine.tagline}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h3 className="text-base font-black text-slate-900 font-heading group-hover:text-orange-600 transition-colors">
                  {cuisine.name}
                </h3>
                <p className="text-xs font-bold text-emerald-800 font-heading mt-0.5">
                  {cuisine.gujarati}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {cuisine.desc}
                </p>
              </div>

              {/* Popular Items Pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {cuisine.popularItems.map((dish, i) => (
                  <span key={i} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    {dish}
                  </span>
                ))}
              </div>

              {/* Action Button */}
              <div 
                className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-orange-600 group-hover:text-orange-700"
              >
                <span>View Dishes</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. BOTTOM VIEW ALL CTA */}
      <div className="px-4 pt-1">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs font-heading shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
        >
          <span>View Entire Menu (બધી વાનગીઓ એકસાથે)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
