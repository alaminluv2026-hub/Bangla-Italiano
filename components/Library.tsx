
import React, { useState } from 'react';
import { INITIAL_VOCABULARY } from '../constants';
import { speakBilingual, preFetchAudio } from '../services/gemini';

type ViewMode = 'categories' | 'words';

export const Library: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = Array.from(new Set(INITIAL_VOCABULARY.map(v => v.category)));

  const categoryMetadata: Record<string, { label: string, bn: string, icon: string, gradient: string }> = {
    'Numbers': { label: 'Numeri', bn: 'সংখ্যা', icon: '🔢', gradient: 'from-blue-500 to-indigo-600' },
    'Ordinals': { label: 'Ordinale', bn: 'ক্রমবাচক সংখ্যা', icon: '🥇', gradient: 'from-amber-500 to-yellow-600' },
    'Weeks': { label: 'Settimana', bn: 'সপ্তাহ', icon: '📅', gradient: 'from-purple-500 to-plum-600' },
    'Months': { label: 'Mesi', bn: 'মাস', icon: '🗓️', gradient: 'from-pink-500 to-rose-600' },
    'Seasons': { label: 'Stagioni', bn: 'ঋতু', icon: '🍂', gradient: 'from-[#006a4e] to-emerald-700' },
    'Colors': { label: 'Colori', bn: 'রঙ', icon: '🎨', gradient: 'from-orange-400 to-[#f42a41]' },
    'Foods': { label: 'Cibo', bn: 'খাবার', icon: '🍕', gradient: 'from-amber-400 to-orange-500' },
    'Vegetables': { label: 'Verdure', bn: 'শাকসবজি', icon: '🥦', gradient: 'from-[#006a4e] to-teal-600' },
    'Fruits': { label: 'Frutta', bn: 'ফল', icon: '🍎', gradient: 'from-[#f42a41] to-red-600' },
    'Drinking': { label: 'Bevande', bn: 'পানীয়', icon: '🥤', gradient: 'from-cyan-400 to-blue-500' },
    'Clothes': { label: 'Vestiti', bn: 'জামাকাপড়', icon: '👕', gradient: 'from-violet-500 to-fuchsia-600' },
    'Vehicles': { label: 'Veicoli', bn: 'যানবাহন', icon: '🚗', gradient: 'from-slate-600 to-slate-800' },
    'Body Parts': { label: 'Corpo', bn: 'শরীরের অঙ্গ', icon: '💪', gradient: 'from-rose-400 to-[#f42a41]' },
    'Animals': { label: 'Animali', bn: 'প্রাণী', icon: '🦁', gradient: 'from-lime-500 to-green-600' },
    'School': { label: 'Scuola', bn: 'স্কুল', icon: '🏫', gradient: 'from-indigo-400 to-purple-500' },
    'Cities': { label: 'Città', bn: 'শহর', icon: '🏙️', gradient: 'from-sky-500 to-blue-600' },
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setViewMode('words');
    window.scrollTo(0, 0);
    
    // Warm up with bilingual payloads
    const categoryWords = INITIAL_VOCABULARY.filter(v => v.category === cat);
    const payloads = categoryWords.map(w => `${w.italian}|||${w.bangla}`);
    preFetchAudio(payloads);
  };

  const handleBack = () => {
    setViewMode('categories');
    setSearchQuery('');
  };

  const filteredWords = INITIAL_VOCABULARY.filter(v => 
    v.category === selectedCategory && 
    (v.italian.toLowerCase().includes(searchQuery.toLowerCase()) || 
     v.bangla.includes(searchQuery))
  );

  if (viewMode === 'categories') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="p-6 bg-white border-b-4 border-[#006a4e]/20 shrink-0">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Biblioteca</h2>
          <p className="text-slate-400 bangla-font font-bold">লাইব্রেরি - বিভাগ নির্বাচন করুন</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-32">
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => {
              const meta = categoryMetadata[cat] || { label: cat, bn: '', icon: '📂', gradient: 'from-[#006a4e] to-emerald-700' };
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`relative h-40 rounded-[2.5rem] p-6 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all bg-gradient-to-br ${meta.gradient} overflow-hidden group`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                  <span className="text-4xl mb-3 drop-shadow-md">{meta.icon}</span>
                  <h3 className="text-white font-black text-lg leading-tight uppercase tracking-tighter">{meta.label}</h3>
                  <p className="text-white/70 bangla-font font-bold text-xs mt-1">{meta.bn}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const meta = categoryMetadata[selectedCategory];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 bg-white border-b border-slate-50 sticky top-0 z-10">
        <button 
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-[#006a4e] font-black uppercase text-[10px] tracking-widest"
        >
          <span className="text-lg">←</span> Indietro
        </button>
        <div 
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{meta?.label || selectedCategory}</h2>
            <p className="text-slate-400 bangla-font font-bold">{meta?.bn}</p>
          </div>
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cerca... (খুঁজুন)" 
            className="w-full pl-10 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-emerald-50 focus:outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg opacity-40">🔍</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-32 bg-slate-50/20">
        {filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <span className="text-5xl mb-4">😶</span>
            <p className="font-bold text-sm uppercase tracking-widest">Nessun risultato</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredWords.map((word, i) => (
              <button 
                key={i} 
                onClick={() => speakBilingual(word.italian, word.bangla)}
                className={`relative group h-24 rounded-2xl overflow-hidden shadow-sm active:scale-90 transition-all text-left bg-gradient-to-br ${meta?.gradient || 'from-[#006a4e] to-teal-600'} flex flex-col items-center justify-center p-2`}
              >
                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4" />
                <div className="relative z-10 w-full text-center">
                  <h3 className="text-[14px] font-black text-white leading-tight mb-1 drop-shadow-sm truncate px-1">
                    {word.italian}
                  </h3>
                  <p className="text-white/90 bangla-font font-bold text-[13px] truncate px-1">
                    {word.bangla}
                  </p>
                </div>
                <div className="absolute bottom-1 right-1 opacity-40">
                  <span className="text-[8px]">🔊</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
