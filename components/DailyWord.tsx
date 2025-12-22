
import React, { useState } from 'react';
import { Vocabulary } from '../types';
import { speakItalian } from '../services/gemini';

interface DailyWordProps {
  word: Vocabulary;
}

const DailyWord: React.FC<DailyWordProps> = ({ word }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Triggers pronunciation of the word.
  // The speakItalian service handles raw PCM decoding and playback directly.
  const playPronunciation = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await speakItalian(word.italian);
    } catch (error) {
      console.error('Error playing pronunciation:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl mb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-emerald-100 text-sm font-semibold uppercase tracking-wider">Word of the Day</span>
          <h2 className="text-4xl font-bold mt-1">{word.italian}</h2>
        </div>
        <button 
          onClick={playPronunciation}
          disabled={isPlaying}
          className="bg-white/20 p-4 rounded-2xl hover:bg-white/30 transition-colors disabled:opacity-50"
        >
          {isPlaying ? '⏳' : '🔊'}
        </button>
      </div>
      <div className="space-y-2">
        <p className="text-xl bangla-font font-medium">{word.bangla}</p>
        <p className="text-sm italic text-emerald-100">Pronounced: {word.pronunciation}</p>
      </div>
      <div className="mt-6 flex gap-2">
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{word.category}</span>
      </div>
    </div>
  );
};

export default DailyWord;
