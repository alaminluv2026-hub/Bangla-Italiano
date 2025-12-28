
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { Tab, DifficultyLevel, Lesson, ConversationScenario, LessonContent } from './types';
import { LESSONS, CONVERSATIONS } from './constants';
import VerboEssereAvere from './components/VerboEssereAvere';
import { Library } from './components/Library';
import { performTranslation, speakBilingual, speakAlphabetTile, preFetchAudio } from './services/gemini';

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
    const payloads = lesson.content.map(c => `${c.italian}|||${c.bangla}`);
    preFetchAudio(payloads);
  };

  const startConversation = (convo: ConversationScenario) => {
    setSelectedConvo(convo);
    setActiveTab('convo-active');
    const payloads = convo.dialogue.map(d => `${d.italian}|||${d.bangla}`);
    preFetchAudio(payloads);
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) return;
    setIsTranslating(true);
    const result = await performTranslation(translateText);
    setTranslationResult(result);
    setIsTranslating(false);
    if (result) {
      const hasRoman = /[a-zA-Z]/.test(result);
      speakBilingual(hasRoman ? result : "", hasRoman ? "" : result);
    }
  };

  const playTranslationResult = () => {
    if (!translationResult) return;
    const hasRoman = /[a-zA-Z]/.test(translationResult);
    speakBilingual(hasRoman ? translationResult : "", hasRoman ? "" : translationResult);
  };

  const handleVoiceRequest = (it: string, bn: string, id: string | null = null) => {
    if (id) setCurrentlySpeakingId(id);
    setIsSpeaking(true);
    speakBilingual(it, bn).finally(() => {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    });
  };

  const handleAlphabetTileClick = (content: LessonContent) => {
    setCurrentlySpeakingId(content.id);
    setIsSpeaking(true);
    speakAlphabetTile(
      content.letter || "", 
      content.exampleWord || "", 
      content.bangla
    ).finally(() => {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    });
  };

  const renderHome = () => {
    const levels = [DifficultyLevel.ALPHABET, DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    
    // Mapping specific lesson IDs to vibrant color profiles
    const lessonColorProfiles: Record<string, { bg: string, text: string, iconBg: string, border: string }> = {
      'l-alphabet': {
        bg: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800',
        text: 'text-white',
        iconBg: 'bg-white/20',
        border: 'border-white/20'
      },
      'l-greetings': {
        bg: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700',
        text: 'text-white',
        iconBg: 'bg-white/20',
        border: 'border-white/20'
      },
      'l-verbs': {
        bg: 'bg-gradient-to-br from-rose-500 via-orange-500 to-red-600',
        text: 'text-white',
        iconBg: 'bg-white/20',
        border: 'border-white/20'
      }
    };

    return (
      <div className="p-4 space-y-10 pb-32">
        {/* Header Hero */}
        <div className="vibrant-mesh p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border-b-[8px] border-black/10">
           <div className="mb-10">
             <div className="flex justify-between items-start">
               <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                 <h1 className="text-[10px] font-black opacity-90 uppercase tracking-[0.4em]">CIAO AMICO!</h1>
                 <p className="opacity-60 bangla-font font-bold text-[10px] mt-0.5">হ্যালো বন্ধু!</p>
               </div>
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/50">
                 <span className="text-2xl">🇮🇹</span>
               </div>
             </div>
           </div>
           <div className="relative z-10">
             <h2 className="text-4xl font-black mb-1 drop-shadow-lg leading-none tracking-tighter">Cosa impariamo?</h2>
             <p className="bangla-font font-bold text-2xl text-white drop-shadow-md">আজ আমরা কী শিখব?</p>
           </div>
           <div className="absolute top-0 left-0 w-full h-1 flag-gradient-it opacity-30" />
        </div>

        {levels.map(level => {
          const levelLessons = LESSONS.filter(l => l.level === level);
          if (levelLessons.length === 0 && level !== DifficultyLevel.BEGINNER) return null;
          
          return (
            <div key={level} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="w-1.5 h-6 rounded-full bg-slate-200" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                  {level === DifficultyLevel.ALPHABET ? "START HERE" : `${level.toUpperCase()} MODULE`}
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {levelLessons.map(lesson => {
                  const profile = lessonColorProfiles[lesson.id];
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => startLesson(lesson)}
                      className={`w-full ${profile?.bg || 'bg-white'} p-6 rounded-[2.5rem] shadow-xl border-b-4 border-black/10 flex items-center gap-5 active:scale-95 transition-all text-left group overflow-hidden relative`}
                    >
                      {/* Animated glow background */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                      
                      <div className={`w-16 h-16 ${profile?.iconBg || 'bg-slate-100'} rounded-3xl flex items-center justify-center text-4xl shrink-0 border border-white/10 shadow-inner group-hover:scale-110 transition-transform`}>
                        {lesson.icon}
                      </div>
                      <div className="flex-1 overflow-hidden relative z-10">
                        <h3 className={`font-black ${profile?.text || 'text-slate-800'} text-xl leading-none mb-1.5 truncate tracking-tight`}>
                          {lesson.title}
                        </h3>
                        <p className={`text-xs ${profile?.text ? 'opacity-80' : 'text-slate-400'} bangla-font font-bold truncate`}>
                          {lesson.banglaTitle}
                        </p>
                      </div>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${profile?.border || 'border-black/5'} ${profile?.text || 'text-slate-300'} group-hover:bg-white group-hover:text-black transition-all`}>
                        <span className="text-sm">→</span>
                      </div>
                    </button>
                  );
                })}
                
                {level === DifficultyLevel.BEGINNER && (
                  <button 
                    onClick={() => setActiveTab('grammar-active')} 
                    className="w-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 p-6 rounded-[2.5rem] shadow-xl border-b-4 border-black/10 flex items-center gap-5 active:scale-95 transition-all text-left group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-4xl shrink-0 border border-white/20 shadow-inner group-hover:rotate-12 transition-transform">
                      🏛️
                    </div>
                    <div className="flex-1 overflow-hidden relative z-10">
                      <h3 className="font-black text-white text-xl leading-none mb-1.5 truncate tracking-tight">Essere & Avere</h3>
                      <p className="text-xs text-white/80 bangla-font font-bold truncate">মৌলিক ক্রিয়া (হওয়া ও থাকা)</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/10 relative z-10 group-hover:scale-110 transition-transform">
                      <span className="text-sm">→</span>
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
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">L'Alfabeto</h2>
            </div>
          </div>
          
          <div className="px-4 grid grid-cols-4 gap-2 pb-24">
            {selectedLesson.content.map((item, idx) => {
              const gradients = ['from-purple-500 to-indigo-600', 'from-emerald-600 to-teal-700', 'from-rose-500 to-red-600', 'from-blue-500 to-blue-700', 'from-orange-500 to-amber-600', 'from-fuchsia-500 to-purple-600'];
              const grad = gradients[idx % gradients.length];
              const isActive = currentlySpeakingId === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleAlphabetTileClick(item)}
                  className={`relative min-h-[110px] rounded-3xl bg-gradient-to-br ${grad} p-2 shadow-lg active:scale-90 transition-all overflow-hidden border border-white/20 flex flex-col items-center justify-center`}
                >
                  <div className={`absolute inset-0 bg-white/5 ${isActive ? 'animate-pulse bg-white/20' : ''}`} />
                  <div className="flex flex-col items-center justify-center text-white relative z-10 w-full">
                    <span className="text-3xl font-black drop-shadow-xl leading-none mb-1">{item.letter}</span>
                    <div className="bg-black/20 w-full py-2 rounded-2xl backdrop-blur-md">
                      <span className="text-[10px] font-black uppercase tracking-tighter block text-center truncate px-1">{item.exampleWord}</span>
                      <span className="text-[12px] font-bold bangla-font block text-center leading-tight truncate px-1 opacity-90">{item.bangla}</span>
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
          <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden relative shadow-inner">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all relative z-10 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <button 
            onClick={() => handleVoiceRequest(content.italian, content.bangla, content.id)}
            className={`p-10 rounded-[4.5rem] border-[1px] transition-all w-full relative group ${currentlySpeakingId === content.id ? 'border-emerald-500 scale-105 shadow-2xl' : 'border-slate-100 bg-white shadow-xl hover:border-emerald-200'}`}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-2 rounded-full border border-slate-100 shadow-sm opacity-50">
              <span className="text-[10px] font-black tracking-widest text-slate-400">PRONUNCIA</span>
            </div>
            <h2 className={`text-5xl font-black mb-2 transition-colors ${currentlySpeakingId === content.id ? 'text-emerald-600' : 'text-slate-900'}`}>{content.italian}</h2>
            <div className={`text-3xl mt-4 transition-transform ${currentlySpeakingId === content.id ? 'scale-125' : 'group-hover:scale-110'}`}>🔊</div>
            {currentlySpeakingId === content.id && (
               <div className="absolute top-6 right-6 flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-75"></div>
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-150"></div>
               </div>
            )}
          </button>
          <div onClick={() => handleVoiceRequest("", content.bangla)} className="cursor-pointer group">
            <p className="text-4xl font-black text-slate-800 bangla-font group-hover:text-emerald-700 transition-colors">{content.bangla}</p>
            <div className="h-1.5 w-12 bg-emerald-100 rounded-full mx-auto mt-4 group-hover:w-24 transition-all"></div>
          </div>
        </div>
        <button 
          onClick={() => lessonStep < selectedLesson.content.length - 1 ? setLessonStep(lessonStep + 1) : setActiveTab(Tab.HOME)}
          className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg shadow-2xl mt-8 active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-black"
        >
          {lessonStep < selectedLesson.content.length - 1 ? 'PROSSIMO' : 'COMPLETATO'} 
          <span className="text-xl">→</span>
        </button>
      </div>
    );
  };

  const renderTranslateView = () => (
    <div className="p-6 flex flex-col h-full space-y-6">
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden border-b-8 border-emerald-800">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight italic">Traduttore</h2>
          <p className="opacity-60 bangla-font text-lg font-bold">অনুবাদ ও উচ্চারণ</p>
        </div>
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <span className="text-8xl">✨</span>
        </div>
      </div>
      <div className="relative group">
        <textarea
          value={translateText}
          onChange={(e) => setTranslateText(e.target.value)}
          placeholder="Scrivi qui... (এখানে লিখুন)"
          className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] text-xl font-bold min-h-[180px] shadow-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all"
        />
        <button 
          onClick={() => setTranslateText('')} 
          className={`absolute bottom-6 right-6 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors ${!translateText && 'hidden'}`}
        >✕</button>
      </div>

      {translationResult && (
        <div onClick={playTranslationResult} className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-100 shadow-md relative cursor-pointer active:scale-95 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
          <p className="text-[10px] font-black uppercase text-emerald-500 mb-2 tracking-[0.2em]">Traduzione</p>
          <p className="text-3xl font-black text-slate-800 bangla-font leading-tight">{translationResult}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="text-xl">🔊</span> Tappa per ascoltare
          </div>
        </div>
      )}

      <button
        onClick={handleTranslate}
        disabled={isTranslating || !translateText.trim()}
        className="w-full bg-[#f42a41] text-white py-6 rounded-[2.5rem] font-black text-lg shadow-xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-red-800"
      >
        {isTranslating ? 'Elaborazione...' : (
          <>TRADUCI <span className="text-white/40 font-normal">|</span> অনুবাদ</>
        )}
      </button>
    </div>
  );

  const renderConvoView = () => {
    const gradients = [
      'from-blue-600 to-indigo-700',
      'from-emerald-600 to-teal-700',
      'from-rose-600 to-red-700',
      'from-purple-600 to-fuchsia-700',
      'from-orange-500 to-red-600',
      'from-amber-500 to-orange-600',
      'from-violet-600 to-indigo-800',
      'from-slate-700 to-slate-900'
    ];

    return (
      <div className="p-6 space-y-8 h-full overflow-y-auto bg-slate-50/20">
        <div className="bg-[#cd212a] p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border-b-8 border-black/10">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tighter italic">Dialoghi</h2>
            <p className="opacity-70 bangla-font text-lg font-bold">আলাপচারিতা নির্বাচন করুন</p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-32">
          {CONVERSATIONS.map((convo, idx) => {
            const grad = gradients[idx % gradients.length];
            return (
              <button 
                key={convo.id} 
                onClick={() => startConversation(convo)} 
                className={`relative h-52 rounded-[3rem] p-6 flex flex-col items-center justify-center text-center shadow-lg active:scale-95 transition-all bg-gradient-to-br ${grad} overflow-hidden group border border-white/10`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125" />
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-5xl mb-4 backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                  {convo.icon}
                </div>
                <div className="flex flex-col gap-0.5 relative z-10">
                  <h4 className="font-black text-white text-[16px] uppercase tracking-tighter leading-none drop-shadow-md mb-1">
                    {convo.title}
                  </h4>
                  <p className="text-white/60 bangla-font font-bold text-[12px] leading-tight">
                    {convo.banglaTitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout 
      activeTab={activeTab === 'lesson-active' || activeTab === 'grammar-active' ? Tab.HOME : activeTab as any} 
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSelectedLesson(null);
        setSelectedConvo(null);
      }}
      title="BANGLA-ITALIANO"
    >
      {activeTab === Tab.HOME && renderHome()}
      {activeTab === Tab.LIBRARY && <Library />}
      {activeTab === Tab.CONVERSATIONS && renderConvoView()}
      {activeTab === Tab.TRANSLATE && renderTranslateView()}
      {activeTab === 'lesson-active' && renderLessonActive()}
      {activeTab === 'convo-active' && selectedConvo && (
        <div className="p-6 pb-32 h-full overflow-y-auto bg-slate-50">
          <div className="flex items-center gap-4 sticky top-0 bg-slate-50/90 z-20 py-4 backdrop-blur-md mb-6">
            <button onClick={() => setActiveTab(Tab.CONVERSATIONS)} className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">✕</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight italic">{selectedConvo.title}</h2>
          </div>
          <div className="space-y-6">
            {selectedConvo.dialogue.map((line, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
                 <div onClick={() => handleVoiceRequest(line.italian, line.bangla, `convo-${i}`)} className={`p-6 rounded-[2.5rem] border-[1px] max-w-[90%] cursor-pointer active:scale-95 transition-all shadow-sm relative group ${currentlySpeakingId === `convo-${i}` ? 'scale-105 ring-4 ring-offset-2 ring-emerald-500 shadow-xl z-10' : ''} ${i % 2 === 0 ? 'bg-[#006a4e] text-white border-emerald-800' : 'bg-blue-600 text-white border-blue-700'}`}>
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${i % 2 === 0 ? 'text-white/40' : 'text-white/30'}`}>
                        {line.speaker}
                      </span>
                      {currentlySpeakingId === `convo-${i}` && (
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse"></div>
                          <div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse delay-75"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xl font-black leading-tight tracking-tight italic">{line.italian}</p>
                    <p className={`text-sm font-bold bangla-font mt-2 ${i % 2 === 0 ? 'text-white/70' : 'text-white/60'}`}>{line.bangla}</p>
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
