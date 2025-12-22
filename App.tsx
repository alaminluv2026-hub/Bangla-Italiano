
import React, { useState } from 'react';
import Layout from './components/Layout';
import { Tab, DifficultyLevel, Lesson, ConversationScenario, LessonContent } from './types';
import { LESSONS, CONVERSATIONS } from './constants';
import VerboEssereAvere from './components/VerboEssereAvere';
import { Library } from './components/Library';
import { performTranslation, speakBilingual, speakItalian, speakAlphabetTile } from './services/gemini';

type ViewState = Tab | 'lesson-active' | 'convo-active' | 'grammar-active';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState>(Tab.HOME);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<ConversationScenario | null>(null);
  const [lessonStep, setLessonStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  
  const [translateText, setTranslateText] = useState('');
  const [translationResult, setTranslationResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const startLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLessonStep(0);
    setActiveTab('lesson-active');
  };

  const startConversation = (convo: ConversationScenario) => {
    setSelectedConvo(convo);
    setActiveTab('convo-active');
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) return;
    setIsTranslating(true);
    const result = await performTranslation(translateText);
    setTranslationResult(result);
    setIsTranslating(false);
  };

  const playTranslationResult = async () => {
    if (!translationResult || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const hasRoman = /[a-zA-Z]/.test(translationResult);
      await speakBilingual(hasRoman ? translationResult : "", hasRoman ? "" : translationResult);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleVoiceRequest = async (it: string, bn: string, id: string | null = null) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    if (id) setCurrentlySpeakingId(id);
    try {
      await speakBilingual(it, bn);
    } finally {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    }
  };

  const handleAlphabetTileClick = async (content: LessonContent) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    setCurrentlySpeakingId(content.id);
    
    try {
      await speakAlphabetTile(
        content.letter || "", 
        content.exampleWord || "", 
        content.bangla
      );
    } finally {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    }
  };

  const renderHome = () => {
    const levels = [DifficultyLevel.ALPHABET, DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    return (
      <div className="p-6 space-y-8 pb-32">
        {/* Flag Fusion Hero Card */}
        <div className="flag-fusion-bg p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border-b-8 border-[#cd212a]">
           {/* Ciao Amico - Minimal/Little */}
           <div className="mb-6">
             <div className="flex justify-between items-start">
               <div>
                 <h1 className="text-sm font-bold opacity-60 uppercase tracking-widest">Ciao, Amico!</h1>
                 <p className="opacity-40 bangla-font font-medium text-[10px] mt-0.5">সুপ্রভাত, বন্ধু!</p>
               </div>
               <div className="w-9 h-9 bg-white/10 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                 🇮🇹
               </div>
             </div>
           </div>

           {/* Cosa Impariamo - Primary Focus */}
           <div className="relative z-10">
             <h2 className="text-3xl font-black mb-1 drop-shadow-sm">Cosa impariamo?</h2>
             <p className="bangla-font font-semibold text-lg text-emerald-100 opacity-90">আজ আমরা কী শিখব?</p>
           </div>

           {/* Decorative elements representing the BD Red Disc & IT Tricolor */}
           <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-32 h-32 bg-[#f42a41] rounded-full blur-2xl opacity-40" />
           <div className="absolute top-0 left-0 w-full h-1 flag-gradient-it opacity-30" />
        </div>

        {levels.map(level => {
          const levelLessons = LESSONS.filter(l => l.level === level);
          if (levelLessons.length === 0) return null;
          return (
            <div key={level} className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-2 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#006a4e] rounded-full"></span>
                {level === DifficultyLevel.ALPHABET ? "PRIMI PASSI" : `${level.toUpperCase()} LEVEL`}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {levelLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => startLesson(lesson)}
                    className="bg-white p-4 rounded-[1.75rem] shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2 active:scale-95 transition-all hover:border-[#006a4e]/30"
                  >
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl">
                      {lesson.icon}
                    </div>
                    <div className="w-full">
                      <h3 className="font-black text-slate-800 text-[11px] leading-tight">{lesson.title}</h3>
                      <p className="text-[8px] text-slate-400 bangla-font font-bold uppercase tracking-widest mt-0.5">{lesson.banglaTitle}</p>
                    </div>
                  </button>
                ))}
                {level === DifficultyLevel.BEGINNER && (
                  <button onClick={() => setActiveTab('grammar-active')} className="bg-orange-50 p-4 rounded-[1.75rem] border border-orange-100 flex flex-col items-center text-center gap-2 active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl">🏛️</div>
                    <div>
                      <h3 className="font-black text-slate-800 text-[11px] leading-tight">Essere & Avere</h3>
                      <p className="text-[8px] text-slate-400 bangla-font font-bold uppercase mt-0.5">মৌলিক ক্রিয়া</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLessonActive = () => {
    if (!selectedLesson) return null;

    if (selectedLesson.level === DifficultyLevel.ALPHABET) {
      return (
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
          <div className="p-6 pb-0">
            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-50/90 z-10 py-2 backdrop-blur-md">
              <button onClick={() => setActiveTab(Tab.HOME)} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl text-slate-400">✕</button>
              <h2 className="text-2xl font-black text-slate-800">L'Alfabeto Italiano</h2>
            </div>
          </div>
          
          <div className="px-4 grid grid-cols-4 gap-2 pb-24">
            {selectedLesson.content.map((item, idx) => {
              const gradients = ['from-purple-400 to-pink-500', 'from-[#006a4e] to-teal-500', 'from-[#f42a41] to-red-500', 'from-blue-400 to-indigo-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500'];
              const grad = gradients[idx % gradients.length];
              const isActive = currentlySpeakingId === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleAlphabetTileClick(item)}
                  className={`relative min-h-[110px] rounded-2xl bg-gradient-to-br ${grad} p-2 shadow-lg active:scale-90 transition-all overflow-hidden border-2 border-white/40 flex flex-col items-center justify-center`}
                >
                  <div className={`absolute inset-0 bg-white/10 ${isActive ? 'animate-pulse bg-white/30' : ''}`} />
                  <div className="flex flex-col items-center justify-center text-white relative z-10 w-full">
                    <span className="text-3xl font-black drop-shadow-md leading-none mb-1">{item.letter}</span>
                    <div className="bg-black/20 w-full py-1 rounded-lg backdrop-blur-[2px]">
                      <span className="text-[8px] font-black uppercase tracking-tighter block text-center truncate px-1">{item.exampleWord}</span>
                      <span className="text-[9px] font-bold bangla-font block text-center leading-tight truncate px-1 opacity-90">{item.bangla}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const content = selectedLesson.content[lessonStep];
    const progress = ((lessonStep + 1) / selectedLesson.content.length) * 100;

    return (
      <div className="h-full flex flex-col p-6 bg-white">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setActiveTab(Tab.HOME)} className="text-2xl text-slate-300">✕</button>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flag-gradient-it opacity-20"></div>
            <div className="h-full bg-[#006a4e] transition-all relative z-10" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <button 
            onClick={() => handleVoiceRequest(content.italian, `মানে ${content.bangla}`)}
            className={`p-10 rounded-[4rem] border-4 transition-all w-full ${isSpeaking ? 'border-[#f42a41] scale-105 shadow-2xl' : 'border-emerald-50 bg-white shadow-xl hover:border-emerald-100'}`}
          >
            <h2 className="text-5xl font-black text-slate-900 mb-2">{content.italian}</h2>
            <div className="text-3xl mt-4">🔊</div>
          </button>
          <p className="text-4xl font-black text-slate-800 bangla-font">{content.bangla}</p>
        </div>
        <button 
          onClick={() => lessonStep < selectedLesson.content.length - 1 ? setLessonStep(lessonStep + 1) : setActiveTab(Tab.HOME)}
          className="w-full bg-[#006a4e] text-white py-6 rounded-[2rem] font-black text-lg shadow-xl mt-8 active:scale-95 transition-all"
        >
          {lessonStep < selectedLesson.content.length - 1 ? 'PROSSIMO' : 'FINISH'}
        </button>
      </div>
    );
  };

  const renderTranslateView = () => (
    <div className="p-6 flex flex-col h-full space-y-6">
      <div className="bg-[#006a4e] p-8 rounded-[3rem] text-white shadow-lg border-b-4 border-[#f42a41]">
        <h2 className="text-3xl font-black">Traduttore</h2>
        <p className="opacity-80 bangla-font text-lg">অনুবাদ ও উচ্চারণ</p>
      </div>
      <textarea
        value={translateText}
        onChange={(e) => setTranslateText(e.target.value)}
        placeholder="Write here... (এখানে লিখুন)"
        className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] text-xl font-bold min-h-[150px] shadow-inner focus:outline-none focus:ring-4 focus:ring-emerald-50"
      />
      {translationResult && (
        <div onClick={playTranslationResult} className="bg-emerald-50 p-6 rounded-[2rem] border-l-8 border-[#f42a41] relative cursor-pointer active:scale-95 transition-all">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Result</p>
          <p className="text-2xl font-black text-[#006a4e] bangla-font">{translationResult}</p>
          <span className="absolute right-6 bottom-6 text-xl">🔊</span>
        </div>
      )}
      <button
        onClick={handleTranslate}
        disabled={isTranslating || !translateText.trim()}
        className="w-full bg-[#f42a41] text-white py-6 rounded-[2rem] font-black text-lg shadow-xl disabled:opacity-50 active:scale-95 transition-all"
      >
        {isTranslating ? 'Translating...' : 'TRADUCI • অনুবাদ করুন'}
      </button>
    </div>
  );

  const renderConvoView = () => (
    <div className="p-6 space-y-8">
      <div className="bg-[#cd212a] p-8 rounded-[3rem] text-white shadow-lg border-b-4 border-[#006a4e]">
        <h2 className="text-3xl font-black">Dialoghi</h2>
        <p className="opacity-80 bangla-font text-lg">আলাপচারিতা</p>
      </div>
      <div className="grid gap-4">
        {CONVERSATIONS.map(convo => (
          <button key={convo.id} onClick={() => startConversation(convo)} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 active:scale-95 transition-all hover:border-[#cd212a]/20">
            <span className="text-4xl">{convo.icon}</span>
            <div className="text-left flex-1">
              <h4 className="font-black text-slate-800 text-lg">{convo.title}</h4>
              <p className="text-[10px] text-slate-400 bangla-font uppercase tracking-widest">{convo.banglaTitle}</p>
            </div>
            <div className="text-[#cd212a]">→</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Layout 
      activeTab={activeTab === 'lesson-active' || activeTab === 'grammar-active' ? Tab.HOME : activeTab as any} 
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSelectedLesson(null);
        setSelectedConvo(null);
      }}
      title="Bangla-Italiano"
    >
      {activeTab === Tab.HOME && renderHome()}
      {activeTab === Tab.LIBRARY && <Library />}
      {activeTab === Tab.CONVERSATIONS && renderConvoView()}
      {activeTab === Tab.TRANSLATE && renderTranslateView()}
      {activeTab === 'lesson-active' && renderLessonActive()}
      {activeTab === 'convo-active' && selectedConvo && (
        <div className="p-6 pb-32">
          <button onClick={() => setActiveTab(Tab.CONVERSATIONS)} className="mb-6 font-bold text-[#cd212a] flex items-center gap-2">
            <span className="text-xl">✕</span> Close
          </button>
          <div className="space-y-6">
            {selectedConvo.dialogue.map((line, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
                 <div onClick={() => handleVoiceRequest(line.italian, line.bangla)} className={`p-5 rounded-[2rem] border-2 max-w-[85%] cursor-pointer active:scale-95 transition-all ${i % 2 === 0 ? 'bg-white border-emerald-50' : 'bg-[#006a4e] text-white border-emerald-800'}`}>
                    <p className="text-xl font-black mb-1 leading-tight">{line.italian}</p>
                    <p className="text-sm font-bold bangla-font opacity-80">{line.bangla}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'grammar-active' && <VerboEssereAvere onBack={() => setActiveTab(Tab.HOME)} />}
    </Layout>
  );
};

export default App;
