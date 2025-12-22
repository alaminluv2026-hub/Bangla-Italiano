
import React from 'react';
import BottomNav from './BottomNav';
import { Tab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: any;
  onTabChange: (tab: any) => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, title }) => {
  const hideNav = activeTab === 'lesson-active' || activeTab === 'convo-active' || activeTab === 'grammar-active';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden relative border-x border-slate-100">
      {!hideNav && (
        <header className="glass shrink-0 z-40 px-6 py-4 flex justify-between items-center border-b-4 border-[#006a4e] sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006a4e] flex items-center justify-center text-xl shadow-lg">
              🇧🇩
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-800 leading-none">
                {title}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#f42a41] animate-pulse"></div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mastery Fusion</span>
              </div>
            </div>
          </div>
          <div className="bg-[#cd212a] text-white px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md">
            🇮🇹 7 DAYS
          </div>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto ${hideNav ? '' : 'bg-slate-50/10'}`}>
        {children}
      </main>

      {!hideNav && (
        <BottomNav activeTab={activeTab as Tab} setActiveTab={onTabChange as any} />
      )}
    </div>
  );
};

export default Layout;
