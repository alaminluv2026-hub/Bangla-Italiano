
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "./audioUtils";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DB_NAME = 'BangItalianoAudioCache';
const STORE_NAME = 'audio';

async function getDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedAudio(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function setCachedAudio(key: string, base64: string): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(base64, key);
  } catch (e) { console.warn("Failed to cache to IDB", e); }
}

interface VoiceTask {
  payload: string;
  priority: boolean;
  resolve: (buffer: AudioBuffer) => void;
  reject: (err: any) => void;
}

// Global state to sync between Translation and TTS
let lastGlobalCallTime = 0;
let isQuotaExhausted = false;
const MIN_GAP_MS = 5000; // Extremely safe 5s gap for free tier

class VoiceManager {
  private memoryCache = new Map<string, AudioBuffer>();
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  
  private queue: VoiceTask[] = [];
  private isProcessing = false;
  private lockoutUntil = 0;

  constructor() {}

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.queue.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      const task = this.queue.shift();
      if (!task) break;

      // 1. Immediate Memory Check
      if (this.memoryCache.has(task.payload)) {
        task.resolve(this.memoryCache.get(task.payload)!);
        continue;
      }

      // 2. Lockout Check (429 Penalty)
      if (Date.now() < this.lockoutUntil) {
        if (task.priority) {
          task.reject(new Error("Rate limit cooldown. Please try in a few seconds."));
        } else {
          task.reject(new Error("Quota penalty: Skipping pre-fetch."));
        }
        continue;
      }

      // 3. Skip background pre-fetch if we've EVER hit 429 this session
      if (!task.priority && isQuotaExhausted) {
        task.reject(new Error("Background pre-fetch disabled due to previous 429."));
        continue;
      }

      try {
        const cachedBase64 = await getCachedAudio(task.payload);
        let buffer: AudioBuffer;

        if (cachedBase64) {
          buffer = await decodeAudioData(decode(cachedBase64), this.getContext(), 24000, 1);
        } else {
          // 4. Rate Limiter Gap
          const now = Date.now();
          const elapsed = now - lastGlobalCallTime;
          if (elapsed < MIN_GAP_MS) {
            await sleep(MIN_GAP_MS - elapsed);
          }

          const base64 = await this.executeFetch(task.payload);
          lastGlobalCallTime = Date.now();
          
          await setCachedAudio(task.payload, base64);
          buffer = await decodeAudioData(decode(base64), this.getContext(), 24000, 1);
        }

        this.memoryCache.set(task.payload, buffer);
        task.resolve(buffer);
      } catch (err) {
        task.reject(err);
      }
    }

    this.isProcessing = false;
  }

  private async executeFetch(payload: string, retryCount = 0, forceSingle = false): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const parts = payload.split("|||");
      const it = parts[0]?.trim() || "";
      const bn = parts[1]?.trim() || "";
      const useMulti = !forceSingle && it.length > 0 && bn.length > 0;
      
      let promptText = "";
      let speechConfig: any = {};

      if (useMulti) {
        promptText = `TTS conversation:\nS1: ${it}\nS2: ${bn}`;
        speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'S1', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'S2', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        };
      } else {
        promptText = `Say: ${it || bn}`;
        speechConfig = { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: it ? 'Kore' : 'Puck' } 
          } 
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: speechConfig,
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64 = audioPart?.inlineData?.data;
      
      if (!base64) {
        if (useMulti) return this.executeFetch(payload, retryCount, true);
        throw new Error("No audio returned");
      }

      return base64;

    } catch (error: any) {
      const status = error?.status || error?.code;
      const is429 = status === 429 || error?.message?.includes('429');

      if (is429) {
        isQuotaExhausted = true; // Flag to disable future pre-fetching
        this.lockoutUntil = Date.now() + 60000; // 60s hard penalty
        throw error;
      }

      if (retryCount < 2 && (status === 500)) {
        await sleep(3000 * (retryCount + 1));
        return this.executeFetch(payload, retryCount + 1, forceSingle);
      }
      throw error;
    }
  }

  private queueTask(payload: string, priority: boolean): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, priority, resolve, reject });
      this.processQueue();
    });
  }

  async preFetch(items: string[]): Promise<void> {
    if (isQuotaExhausted) return;
    const unique = Array.from(new Set(items)).filter(i => !this.memoryCache.has(i));
    const batch = unique.slice(0, 2); // Max 2 pre-fetches per screen
    batch.forEach(item => this.queueTask(item, false).catch(() => {}));
  }

  async speak(payload: string): Promise<void> {
    if (!payload) return;
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch(e) {}
      this.currentSource = null;
    }

    try {
      const buffer = await this.queueTask(payload, true);
      const ctx = this.getContext();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      this.currentSource = source;
      source.start(0);
      // Fix: Wrapped the resolver r in an anonymous function to match the (ev: Event) signature of onended
      return new Promise(r => { source.onended = () => r(); });
    } catch (err) {
      console.warn("Speech deferred:", err instanceof Error ? err.message : "Rate limit");
    }
  }
}

const manager = new VoiceManager();

export const preFetchAudio = (items: string[]) => manager.preFetch(items);

export const performTranslation = async (text: string): Promise<string> => {
  try {
    const elapsed = Date.now() - lastGlobalCallTime;
    if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate to ${/[a-zA-Z]/.test(text) ? 'Bengali' : 'Italian'}. Only the translation: "${text}"`,
    });
    
    lastGlobalCallTime = Date.now();
    return response.text?.trim() || "Error";
  } catch (error) {
    return "Rate limit reached. Please wait.";
  }
};

export const speakBilingual = (italian: string, bangla: string) => {
  const payload = `${italian}|||${bangla}`;
  return manager.speak(payload);
};

export const speakAlphabetTile = (letter: string, word: string, meaning: string) => {
  const payload = `${letter}, ${word}|||${meaning}`;
  return manager.speak(payload);
};

export const speakItalian = (text: string) => manager.speak(text);
export const getGeminiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
