
import React from 'react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: Tab.HOME, label: 'Casa', bangla: 'বাড়ি', icon: '🏠' },
    { id: Tab.LIBRARY, label: 'Libri', bangla: 'লাইব্রেরি', icon: '📚' },
    { id: Tab.CONVERSATIONS, label: 'Parla', bangla: 'সংলাপ', icon: '💬' },
    { id: Tab.TRANSLATE, label: 'Traduci', bangla: 'অনুবাদ', icon: '✨' },
  ];

  return (
    <nav className="glass border-t-4 border-[#006a4e]/10 px-4 py-3 pb-8 flex justify-around shrink-0 z-40">
      {navItems.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center flex-1 transition-all active:scale-95 ${active ? 'text-[#006a4e]' : 'text-slate-400'}`}
          >
            <div className={`text-2xl mb-1 ${active ? 'scale-110 drop-shadow-md' : 'opacity-40 grayscale blur-[0.5px]'}`}>
              {item.icon}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
            <span className={`text-[9px] font-bold bangla-font ${active ? 'text-[#f42a41]' : 'opacity-60'}`}>
              {item.bangla}
            </span>
            {active && <div className="w-1 h-1 bg-[#f42a41] rounded-full mt-1"></div>}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
