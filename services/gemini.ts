
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { decode, decodeAudioData } from "./audioUtils";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DB_NAME = 'BANGLA-ITALIANO-AudioCache';
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

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let delay = 3000; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const errorMsg = err?.message?.toLowerCase() || "";
      const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("exhausted");
      
      if (isQuotaError || (err?.status >= 500 && err?.status < 600)) {
        if (i === maxRetries - 1) throw err;
        const jitter = Math.random() * 2000;
        console.warn(`Quota or Server Error. Retrying in ${Math.round(delay + jitter)}ms... (Attempt ${i+1}/${maxRetries})`);
        await sleep(delay + jitter);
        delay *= 2.5; 
        continue;
      }
      throw err;
    }
  }
  throw new Error("Maximum retries reached for API call");
}

interface VoiceTask {
  payload: string;
  priority: boolean;
  resolve: (buffer: AudioBuffer) => void;
  reject: (err: any) => void;
}

let lastGlobalCallTime = 0;
let quotaCoolDownUntil = 0;

// Conservative gaps to avoid 429
const BACKGROUND_MIN_GAP_MS = 6000; 
const PRIORITY_MIN_GAP_MS = 2500;

class VoiceManager {
  private memoryCache = new Map<string, AudioBuffer>();
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private queue: VoiceTask[] = [];
  private isProcessing = false;

  constructor() {}

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Priority handling
      this.queue.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      
      const task = this.queue[0];
      
      // If we are cooling down from a 429, skip background tasks
      if (!task.priority && Date.now() < quotaCoolDownUntil) {
        this.queue.shift();
        continue;
      }

      this.queue.shift();

      try {
        if (this.memoryCache.has(task.payload)) {
          task.resolve(this.memoryCache.get(task.payload)!);
          continue;
        }

        const cachedBase64 = await getCachedAudio(task.payload);
        if (cachedBase64) {
          const buffer = await decodeAudioData(decode(cachedBase64), this.getContext(), 24000, 1);
          this.memoryCache.set(task.payload, buffer);
          task.resolve(buffer);
          continue;
        }

        const now = Date.now();
        const elapsed = now - lastGlobalCallTime;
        const requiredGap = task.priority ? PRIORITY_MIN_GAP_MS : BACKGROUND_MIN_GAP_MS;
        
        if (elapsed < requiredGap) {
          await sleep(requiredGap - elapsed);
        }

        const base64 = await withRetry(() => this.executeFetch(task.payload));
        lastGlobalCallTime = Date.now();
        
        await setCachedAudio(task.payload, base64);
        const buffer = await decodeAudioData(decode(base64), this.getContext(), 24000, 1);
        this.memoryCache.set(task.payload, buffer);
        task.resolve(buffer);
      } catch (err: any) {
        if (err?.message?.includes("429") || err?.message?.includes("quota")) {
          quotaCoolDownUntil = Date.now() + 60000; // Pause background tasks for 1 min
        }
        console.error("VoiceManager Error:", err);
        task.reject(err);
      }
    }
    this.isProcessing = false;
  }

  private async executeFetch(payload: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts = payload.split("|||");
    const itText = parts[0]?.trim();
    const bnText = parts[1]?.trim();

    const promptText = `
      Please speak the following sentences with distinct native accents:
      ItalianSpeaker (Native Italian accent): ${itText || ''}
      BengaliSpeaker (Native Bengali accent): ${bnText || ''}
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'ItalianSpeaker', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'BengaliSpeaker', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) throw new Error("No audio returned from API");
    return audioPart.inlineData.data;
  }

  async speak(payload: string): Promise<void> {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch {}
    }
    try {
      const buffer = await new Promise<AudioBuffer>((res, rej) => {
        this.queue.push({ payload, priority: true, resolve: res, reject: rej });
        this.processQueue();
      });
      const ctx = this.getContext();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      this.currentSource = source;
      source.start(0);
    } catch (e) {
      console.warn("Could not play audio due to quota or network.", e);
    }
  }

  async preFetch(items: string[]) {
    // Highly restrictive prefetch during quota issues
    if (Date.now() < quotaCoolDownUntil || this.queue.length > 5) return;
    
    items.forEach(payload => {
      if (!this.memoryCache.has(payload)) {
        this.queue.push({ payload, priority: false, resolve: () => {}, reject: () => {} });
      }
    });
    this.processQueue();
  }
}

const manager = new VoiceManager();
export const speakBilingual = (it: string, bn: string) => manager.speak(`${it}|||${bn}`);
export const speakAlphabetTile = (letter: string, word: string, meaning: string) => manager.speak(`${letter}, ${word}|||${meaning}`);
export const speakItalian = (text: string) => manager.speak(`${text}|||`);
export const preFetchAudio = (items: string[]) => manager.preFetch(items);

export const performTranslation = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate to ${/[a-zA-Z]/.test(text) ? 'Bengali' : 'Italian'}: "${text}". Return only the translated text, no extra words.`,
  }));
  return response.text?.trim() || "";
};
export const getGeminiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
