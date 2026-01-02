
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
      // Pre-resume context for instant playback
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // Initialize audio context early
  initializeAudioContext() {
    this.getContext();
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
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    console.log("🔑 API Key check:", apiKey ? "Present" : "MISSING - Please set GEMINI_API_KEY in .env.local");
    
    if (!apiKey) {
      throw new Error("API key is not configured. Please set GEMINI_API_KEY in .env.local");
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts = payload.split("|||");
    const itText = parts[0]?.trim() || '';
    const bnText = parts[1]?.trim() || '';

    console.log("📝 Text to speak - Italian:", itText, "Bengali:", bnText);

    if (!itText && !bnText) {
      throw new Error("Both Italian and Bengali text are empty");
    }

    const promptText = `
      Please speak the following sentences with distinct native accents:
      ItalianSpeaker (Native Italian accent): ${itText}
      BengaliSpeaker (Native Bengali accent): ${bnText}
    `.trim();

    try {
      console.log("🚀 Calling Gemini API for audio generation...");
      
      // Try the correct API structure for Google GenAI SDK
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: promptText,
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

      console.log("✅ API Response received:", response);
      
      // Try multiple ways to extract audio data
      let audioData: string | null = null;
      
      // Method 1: Direct response structure
      if ((response as any).candidates?.[0]?.content?.parts) {
        const parts = (response as any).candidates[0].content.parts;
        const audioPart = parts.find((p: any) => p.inlineData?.data);
        audioData = audioPart?.inlineData?.data;
      }
      
      // Method 2: Response.text() method (if it exists)
      if (!audioData && typeof (response as any).text === 'function') {
        try {
          const textResponse = await (response as any).text();
          // If it's base64 audio, extract it
          if (typeof textResponse === 'string' && textResponse.length > 100) {
            audioData = textResponse;
          }
        } catch (e) {
          console.log("text() method not available or not audio");
        }
      }
      
      // Method 3: Check response directly
      if (!audioData) {
        const responseStr = JSON.stringify(response);
        // Look for base64 data in response
        const base64Match = responseStr.match(/"data":"([A-Za-z0-9+/=]+)"/);
        if (base64Match) {
          audioData = base64Match[1];
        }
      }
      
      if (!audioData) {
        console.error("❌ No audio in response. Full response:", JSON.stringify(response, null, 2));
        throw new Error("No audio returned from API. Check console for response structure.");
      }
      
      console.log("🎵 Audio data extracted successfully, length:", audioData.length);
      return audioData;
    } catch (error: any) {
      console.error("❌ executeFetch error:", error);
      console.error("Error message:", error?.message);
      console.error("Error status:", error?.status);
      console.error("Error code:", error?.code);
      console.error("Full error:", error);
      throw error;
    }
  }

  async speak(payload: string): Promise<void> {
    console.log("🔊 speak() called with payload:", payload);
    
    if (this.currentSource) {
      try { 
        console.log("⏹️ Stopping current audio source");
        this.currentSource.stop(); 
        this.currentSource = null;
      } catch {}
    }
    
    const ctx = this.getContext();
    console.log("🎧 Audio context state:", ctx.state);
    
    // Wait for audio context to be ready
    if (ctx.state === 'suspended') {
      console.log("▶️ Resuming suspended audio context");
      await ctx.resume();
    }

    try {
      // Check memory cache first for instant playback
      if (this.memoryCache.has(payload)) {
        console.log("💾 Playing from memory cache");
        const buffer = this.memoryCache.get(payload)!;
        this.playBuffer(buffer, ctx);
        return;
      }

      // Check IndexedDB cache for instant playback
      console.log("🔍 Checking IndexedDB cache...");
      const cachedBase64 = await getCachedAudio(payload);
      if (cachedBase64) {
        console.log("💾 Playing from IndexedDB cache");
        const buffer = await decodeAudioData(decode(cachedBase64), ctx, 24000, 1);
        this.memoryCache.set(payload, buffer);
        this.playBuffer(buffer, ctx);
        return;
      }

      // If not cached, fetch and play
      console.log("🌐 Audio not cached, fetching from API...");
      const buffer = await new Promise<AudioBuffer>((res, rej) => {
        this.queue.push({ payload, priority: true, resolve: res, reject: rej });
        this.processQueue();
      });
      console.log("✅ Audio buffer received, playing...");
      this.playBuffer(buffer, ctx);
    } catch (e: any) {
      console.error("❌ Could not play audio:", e);
      console.error("Error message:", e?.message);
      console.error("Error stack:", e?.stack);
      this.currentSource = null;
      throw e;
    }
  }

  private playBuffer(buffer: AudioBuffer, ctx: AudioContext) {
    console.log("▶️ Starting audio playback, duration:", buffer.duration, "seconds");
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    this.currentSource = source;
    
    // Handle audio playback completion
    source.onended = () => {
      console.log("✅ Audio playback completed");
      this.currentSource = null;
    };
    
    // Note: AudioBufferSourceNode doesn't have onerror, errors are caught in try-catch
    
    try {
      source.start(0);
      console.log("🎵 Audio started successfully");
    } catch (e) {
      console.error("❌ Error starting audio:", e);
      this.currentSource = null;
      throw e;
    }
  }

  async preFetch(items: string[]): Promise<void> {
    // More aggressive prefetch for better UX
    if (Date.now() < quotaCoolDownUntil) return;
    
    // Initialize audio context for prefetch
    this.getContext();
    
    const uncachedItems: string[] = [];
    
    // Check what needs to be fetched
    for (const payload of items) {
      if (!this.memoryCache.has(payload)) {
        // Check IndexedDB async
        const cached = await getCachedAudio(payload);
        if (!cached) {
          uncachedItems.push(payload);
        }
      }
    }

    // Prefetch uncached items (limit to avoid quota issues)
    const itemsToPrefetch = uncachedItems.slice(0, 10);
    itemsToPrefetch.forEach(payload => {
      this.queue.push({ 
        payload, 
        priority: false, 
        resolve: (buffer) => {
          this.memoryCache.set(payload, buffer);
        }, 
        reject: () => {} 
      });
    });
    
    if (itemsToPrefetch.length > 0) {
      this.processQueue();
    }
  }
}

const manager = new VoiceManager();

// Initialize audio context on module load for instant playback
if (typeof window !== 'undefined') {
  // Initialize on user interaction to avoid autoplay policies
  const initAudio = () => {
    manager.initializeAudioContext();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };
  window.addEventListener('click', initAudio, { once: true });
  window.addEventListener('touchstart', initAudio, { once: true });
}

export const speakBilingual = (it: string, bn: string) => manager.speak(`${it}|||${bn}`);
export const speakAlphabetTile = (letter: string, word: string, meaning: string) => manager.speak(`${letter}, ${word}|||${meaning}`);
export const speakItalian = (text: string) => manager.speak(`${text}|||`);
export const preFetchAudio = (items: string[]) => manager.preFetch(items);

export const performTranslation = async (text: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key is not configured. Please set GEMINI_API_KEY in .env.local");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Translate to ${/[a-zA-Z]/.test(text) ? 'Bengali' : 'Italian'}: "${text}". Return only the translated text, no extra words.`;
  
  try {
    const response = await withRetry<GenerateContentResponse>(() => 
      ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      })
    );
    
    // Try different response property access patterns
    let textResponse = '';
    
    // Method 1: Direct text property
    if ((response as any).text) {
      textResponse = (response as any).text;
    }
    // Method 2: text() method
    else if (typeof (response as any).text === 'function') {
      textResponse = await (response as any).text();
    }
    // Method 3: Candidates structure
    else if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      textResponse = (response as any).candidates[0].content.parts[0].text;
    }
    // Method 4: Response object
    else if ((response as any).response?.text) {
      textResponse = (response as any).response.text;
    }
    
    return textResponse.trim() || "";
  } catch (error: any) {
    console.error("Translation error:", error);
    console.error("Translation error details:", error?.message, error?.status);
    throw error;
  }
};
export const getGeminiClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key is not configured. Please set GEMINI_API_KEY in .env.local");
  }
  return new GoogleGenAI({ apiKey });
};
