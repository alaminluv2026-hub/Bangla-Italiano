
import React, { useState } from 'react';
import { speakBilingual } from '../services/gemini';

interface Props {
  onBack: () => void;
}

const VerboEssereAvere: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'essere' | 'avere'>('essere');

  const handleSpeak = (it: string, bn: string) => {
    speakBilingual(it, bn);
  };

  const essereConjugations = [
    { it: 'Io sono', bn: 'আমি হই' },
    { it: 'Tu sei', bn: 'তুমি হও' },
    { it: 'Lui/Lei è', bn: 'সে হয়' },
    { it: 'Noi siamo', bn: 'আমরা হই' },
    { it: 'Voi siete', bn: 'তোমরা হও' },
    { it: 'Loro sono', bn: 'তারা হয়' },
  ];

  const avereConjugations = [
    { it: 'Io ho', bn: 'আমার আছে' },
    { it: 'Tu hai', bn: 'তোমার আছে' },
    { it: 'Lui/Lei ha', bn: 'তার আছে' },
    { it: 'Noi abbiamo', bn: 'আমাদের আছে' },
    { it: 'Voi avete', bn: 'তোমাদের আছে' },
    { it: 'Loro hanno', bn: 'তাদের আছে' },
  ];

  const essereExamples = [
    { it: 'Io sono felice', bn: 'আমি সুখী' },
    { it: 'Tu sei stanco', bn: 'তুমি ক্লান্ত' },
    { it: 'Lui è alto', bn: 'সে লম্বা' },
    { it: 'Lei è bella', bn: 'সে সুন্দরী' },
    { it: 'Noi siamo amici', bn: 'আমরা বন্ধু' },
    { it: 'Voi siete pronti', bn: 'তোমরা প্রস্তুত' },
    { it: 'Loro sono italiani', bn: 'তারা ইতালীয়' },
    { it: 'Io sono a casa', bn: 'আমি বাড়িতে আছি' },
    { it: 'Sei uno studente?', bn: 'তুমি কি একজন ছাত্র?' },
    { it: 'Il libro è sul tavolo', bn: 'বইটি টেবিলের উপরে' },
    { it: 'Oggi è lunedì', bn: 'আজ সোমবার' },
    { it: 'Siamo in vacanza', bn: 'আমরা ছুটিতে আছি' },
    { it: 'Siete sicuri?', bn: 'তোমরা কি নিশ্চিত?' },
    { it: 'La mela è rossa', bn: 'আপেলটি লাল' },
    { it: 'Il caffè è caldo', bn: 'কফি গরম' },
  ];

  const avereExamples = [
    { it: 'Io ho fame', bn: 'আমার খিদে পেয়েছে' },
    { it: 'Tu hai ragione', bn: 'তুমি ঠিক বলছো' },
    { it: 'Lui ha una macchina', bn: 'তার একটি গাড়ি আছে' },
    { it: 'Lei ha i capelli neri', bn: 'তার কালো চুল আছে' },
    { it: 'Noi abbiamo sete', bn: 'আমাদের তৃষ্ণা পেয়েছে' },
    { it: 'Voi avete fretta', bn: 'তোমাদের তাড়া আছে' },
    { it: 'Loro hanno paura', bn: 'তারা ভীত' },
    { it: 'Ho un\'idea', bn: 'আমার একটি ধারণা আছে' },
    { it: 'Hai il mio numero?', bn: 'তোমার কাছে কি আমার নম্বর আছে?' },
    { it: 'Abbiamo bisogno di aiuto', bn: 'আমাদের সাহায্যের প্রয়োজন' },
    { it: 'Avete freddo?', bn: 'তোমাদের কি ঠান্ডা লাগছে?' },
    { it: 'Ha molti amici', bn: 'তার অনেক বন্ধু আছে' },
    { it: 'Hanno una bella casa', bn: 'তাদের একটি সুন্দর বাড়ি আছে' },
    { it: 'Ho mal di testa', bn: 'আমার মাথা ব্যথা করছে' },
    { it: 'Hai tempo?', bn: 'তোমার কি সময় আছে?' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 bg-white border-b border-slate-100 shrink-0">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-emerald-700 font-black uppercase text-[10px] tracking-widest">
          <span className="text-lg">←</span> Indietro
        </button>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Verbi Ausiliari</h2>
        <p className="text-slate-400 bangla-font font-bold">সহায়ক ক্রিয়াপদসমূহ</p>
        
        <div className="flex gap-2 mt-6">
          <button 
            onClick={() => setActiveTab('essere')}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'essere' ? 'bg-emerald-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
          >
            Essere (হওয়া)
          </button>
          <button 
            onClick={() => setActiveTab('avere')}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'avere' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
          >
            Avere (থাকা)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {/* Conjugation Card */}
        <section className={`p-6 rounded-[2.5rem] shadow-sm border ${activeTab === 'essere' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-slate-500">Coniugazione (বর্তমান কাল)</h3>
          <div className="grid grid-cols-2 gap-3">
            {(activeTab === 'essere' ? essereConjugations : avereConjugations).map((c, i) => (
              <button 
                key={i} 
                onClick={() => handleSpeak(c.it, c.bn)}
                className="bg-white p-4 rounded-2xl text-left border border-slate-100 active:scale-95 transition-all flex flex-col justify-center"
              >
                <span className="text-lg font-black text-slate-800">{c.it}</span>
                <span className="text-[10px] font-bold bangla-font text-slate-400 leading-none">{c.bn}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Examples List */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] px-2 text-slate-400">Esempi Pratici (ব্যবহারিক উদাহরণ)</h3>
          <div className="space-y-3">
            {(activeTab === 'essere' ? essereExamples : avereExamples).map((ex, i) => (
              <button 
                key={i}
                onClick={() => handleSpeak(ex.it, ex.bn)}
                className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-left active:scale-95 transition-all group"
              >
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg ${activeTab === 'essere' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                  🔊
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800 text-lg leading-tight">{ex.it}</h4>
                  <p className="text-slate-500 bangla-font font-bold text-sm">{ex.bn}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default VerboEssereAvere;
