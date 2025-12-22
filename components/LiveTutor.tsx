
import React, { useState, useRef } from 'react';
import { getGeminiClient } from '../services/gemini';
import { decode, decodeAudioData, createPcmBlob } from '../services/audioUtils';
import { Modality } from '@google/genai';

const LiveTutor: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Tap to start speaking');
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initiates a live audio session with Gemini 2.5 Flash Native Audio.
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
            setStatus('I am listening... (Speak in Bangla or Italian)');
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              // Ensure data is sent only after the session promise resolves to avoid race conditions.
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
               setTranscription(prev => [...prev, `Bot: ${text}`]);
            }
            if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               setTranscription(prev => [...prev, `You: ${text}`]);
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              // Maintain synchronous audio playback using nextStartTime.
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
              // Immediately stop all scheduled audio on user interruption.
              sourcesRef.current.forEach(s => s.stop());
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

  // Closes the session and releases microphone/audio resources.
  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
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
    <div className="flex flex-col h-full max-w-md mx-auto p-6">
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
          isActive ? 'bg-emerald-500 scale-110' : 'bg-slate-200'
        }`}>
          <div className={`w-36 h-36 rounded-full border-4 border-white/30 flex items-center justify-center ${
            isActive ? 'animate-pulse' : ''
          }`}>
             <span className="text-5xl">{isActive ? '🇮🇹' : '🎙️'}</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">AI Voice Tutor</h2>
          <p className="text-slate-500 font-medium">{status}</p>
        </div>

        <div className="w-full bg-slate-100 rounded-2xl p-4 h-48 overflow-y-auto space-y-2">
          {transcription.length === 0 ? (
            <p className="text-slate-400 text-center mt-12 text-sm italic">Transcripts will appear here...</p>
          ) : (
            transcription.map((t, i) => (
              <p key={i} className={`text-sm ${t.startsWith('You') ? 'text-indigo-600' : 'text-emerald-700'} font-medium`}>
                {t}
              </p>
            ))
          )}
        </div>

        <button
          onClick={isActive ? stopSession : startSession}
          className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-transform active:scale-95 ${
            isActive ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {isActive ? 'Stop Session' : 'Start Lesson'}
        </button>
      </div>
    </div>
  );
};

export default LiveTutor;
