
import React from 'react';
import BottomNav from './BottomNav';
import { Tab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: any;
  onTabChange: (tab: any) => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const hideNav = activeTab === 'lesson-active' || activeTab === 'convo-active' || activeTab === 'grammar-active';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden relative border-x border-slate-100">
      {!hideNav && (
        <header className="glass shrink-0 z-50 px-5 py-5 flex justify-between items-center border-b-[1px] border-slate-100 sticky top-0">
          <div className="flex items-center gap-3.5">
            {/* Custom Brand Logo */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#006a4e] via-[#cd212a] to-[#006a4e] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-100">
                <div className="absolute inset-0 bg-gradient-to-br from-[#006a4e]/10 to-transparent"></div>
                <div className="flex items-center justify-center flex-col leading-none">
                  <div className="w-5 h-5 bg-[#f42a41] rounded-full flex items-center justify-center text-[10px] text-white font-black border-2 border-white shadow-sm z-10">B</div>
                  <div className="w-6 h-1 mt-0.5 rounded-full flag-gradient-it"></div>
                </div>
              </div>
            </div>

            {/* Brand Name */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-0">
                <span className="text-xl font-black tracking-tighter text-vibrant">BANGLA-ITALIANO</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.25em]">Premium Learning</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
             <div className="bg-slate-900 text-white pl-2.5 pr-1 py-1 rounded-full text-[8px] font-black tracking-widest flex items-center gap-2 shadow-xl border border-white/10 scale-95 origin-right">
              STREAK <span className="bg-[#cd212a] h-5 px-2 rounded-full flex items-center justify-center text-[9px]">7D</span>
            </div>
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
