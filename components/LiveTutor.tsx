
import React, { useState, useRef } from 'react';
import { getGeminiClient } from '../services/gemini';
import { decode, decodeAudioData, createPcmBlob } from '../services/audioUtils';
import { Modality } from '@google/genai';

interface LiveTutorProps {
  onBack: () => void;
}

const LiveTutor: React.FC<LiveTutorProps> = ({ onBack }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Tap to start speaking');
  const [transcription, setTranscription] = useState<{role: 'You' | 'Bot', text: string}[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = async () => {
    try {
      const ai = getGeminiClient();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setStatus('I am listening...');
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setTranscription(prev => [...prev, {role: 'Bot', text}]);
            }
            if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               setTranscription(prev => [...prev, {role: 'You', text}]);
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Session error:', e);
            stopSession();
          },
          onclose: () => {
            setIsActive(false);
            setStatus('Connection closed');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'You are an Italian-Bangla language tutor. The user speaks Bangla and wants to learn Italian. Help them with translations, grammar, and pronunciation. Speak naturally in both languages.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error('Failed to start session:', err);
      setStatus('Microphone access denied or connection failed');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    setIsActive(false);
    setStatus('Session ended');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    audioContextRef.current = null;
    outputAudioContextRef.current = null;
  };

  return (
    <div className="flex flex-col h-full p-6">
      <button onClick={() => { stopSession(); onBack(); }} className="mb-4 flex items-center gap-2 text-[#cd212a] font-black uppercase text-[10px] tracking-widest self-start">
        <span className="text-lg">←</span> Esci (বন্ধ করুন)
      </button>

      <div className="flex-1 flex flex-col items-center justify-center space-y-10">
        <div className={`relative w-56 h-56 rounded-[4rem] flex items-center justify-center transition-all duration-700 shadow-2xl ${
          isActive ? 'bg-[#006a4e] scale-105' : 'bg-slate-100'
        }`}>
          {isActive && (
            <div className="absolute inset-0 border-8 border-white/20 rounded-[4rem] animate-ping" />
          )}
          <div className={`w-40 h-40 rounded-[3rem] border-4 border-white/40 flex items-center justify-center ${
            isActive ? 'animate-pulse' : ''
          }`}>
             <span className="text-6xl">{isActive ? '🗣️' : '🎙️'}</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">AI Live Tutor</h2>
          <p className={`font-black uppercase text-[10px] tracking-[0.3em] ${isActive ? 'text-[#006a4e]' : 'text-slate-400'}`}>
            {status}
          </p>
        </div>

        <div className="w-full bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 h-64 overflow-y-auto space-y-4 shadow-inner">
          {transcription.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
               <span className="text-3xl mb-2">💬</span>
               <p className="text-xs font-bold uppercase tracking-widest">Inizia a parlare...</p>
               <p className="bangla-font text-xs mt-1">কথা বলা শুরু করুন</p>
            </div>
          ) : (
            transcription.map((t, i) => (
              <div key={i} className={`flex flex-col ${t.role === 'You' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-[1.5rem] max-w-[85%] text-sm font-bold shadow-sm ${
                  t.role === 'You' ? 'bg-[#cd212a] text-white rounded-tr-none' : 'bg-emerald-50 text-emerald-900 rounded-tl-none border border-emerald-100'
                }`}>
                  <p className={t.role === 'Bot' ? 'bangla-font' : ''}>{t.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={isActive ? stopSession : startSession}
          className={`w-full py-6 rounded-[2rem] font-black text-lg shadow-xl transition-all active:scale-95 ${
            isActive ? 'bg-[#cd212a] text-white' : 'bg-[#006a4e] text-white'
          }`}
        >
          {isActive ? 'STOP • বন্ধ করুন' : 'INIZIA • শুরু করুন'}
        </button>
      </div>
    </div>
  );
};

export default LiveTutor;
