
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

let lastGlobalCallTime = 0;
let isQuotaExhausted = false;
const MIN_GAP_MS = 3000; // Slightly more aggressive 3s gap

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

      try {
        // 1. Check Memory Cache (INSTANT)
        if (this.memoryCache.has(task.payload)) {
          task.resolve(this.memoryCache.get(task.payload)!);
          continue;
        }

        // 2. Check Persistent Cache (NEAR INSTANT)
        const cachedBase64 = await getCachedAudio(task.payload);
        if (cachedBase64) {
          const buffer = await decodeAudioData(decode(cachedBase64), this.getContext(), 24000, 1);
          this.memoryCache.set(task.payload, buffer);
          task.resolve(buffer);
          continue;
        }

        // 3. Rate Limit & API Fetch (ONLY IF NOT CACHED)
        if (Date.now() < this.lockoutUntil) {
          task.reject(new Error("Cooling down..."));
          continue;
        }

        const now = Date.now();
        const elapsed = now - lastGlobalCallTime;
        if (elapsed < MIN_GAP_MS) {
          await sleep(MIN_GAP_MS - elapsed);
        }

        const base64 = await this.executeFetch(task.payload);
        lastGlobalCallTime = Date.now();
        
        await setCachedAudio(task.payload, base64);
        const buffer = await decodeAudioData(decode(base64), this.getContext(), 24000, 1);
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
        // Precise instruction for natural tutor style
        promptText = `Translate and pronounce this dialogue naturally: Italian speaker says "${it}", then Bengali speaker says "${bn}".`;
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
      if (status === 429) {
        isQuotaExhausted = true;
        this.lockoutUntil = Date.now() + 60000;
        throw error;
      }
      if (retryCount < 2 && (status === 500)) {
        await sleep(2000);
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
    for (const item of unique.slice(0, 5)) {
      this.queueTask(item, false).catch(() => {});
    }
  }

  async speak(payload: string): Promise<void> {
    if (!payload) return;
    
    // INSTANT STOP for interruption
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
      return new Promise(r => { source.onended = () => r(); });
    } catch (err) {
      console.warn("Playback error:", err);
    }
  }
}

const manager = new VoiceManager();

export const preFetchAudio = (items: string[]) => manager.preFetch(items);

export const performTranslation = async (text: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate to ${/[a-zA-Z]/.test(text) ? 'Bengali' : 'Italian'}. Only the translation: "${text}"`,
    });
    return response.text?.trim() || "Error";
  } catch (error) {
    return "Limit reached.";
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
