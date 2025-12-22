
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "./audioUtils";

// Initialize the Google GenAI client using the environment's API key.
export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Translates text between Italian and Bengali using the Gemini 3 Flash model.
export const performTranslation = async (text: string): Promise<string> => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following text between Italian and Bengali. If it's in Bengali, translate to Italian. If it's in Italian, translate to Bengali. Return only the translated text: "${text}"`,
  });
  return response.text || "Translation error";
};

// Generates and plays audio for Italian and Bengali text using Gemini TTS.
// The API returns raw PCM data which must be decoded before playback.
export const speakBilingual = async (italian: string, bangla: string): Promise<void> => {
  const ai = getGeminiClient();
  const prompt = `Pronounce the following: ${italian ? `Italian: ${italian}` : ''} ${bangla ? `Bengali: ${bangla}` : ''}`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioCtx,
      24000,
      1,
    );
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    return new Promise((resolve) => {
      source.onended = () => {
        resolve();
      };
      source.start();
    });
  }
};

// Special combined TTS for Alphabet tiles to speak Letter, Word, and Meaning in one go (Faster).
export const speakAlphabetTile = async (letter: string, word: string, meaning: string): Promise<void> => {
  const ai = getGeminiClient();
  // Using a specific prompt to ensure fast transitions between the parts
  const prompt = `Speak concisely: Italian letter "${letter}", then word "${word}", then say the Bengali meaning "${meaning}".`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioCtx,
      24000,
      1,
    );
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    return new Promise((resolve) => {
      source.onended = () => {
        resolve();
      };
      source.start();
    });
  }
};

// Convenience wrapper for Italian pronunciation.
export const speakItalian = async (text: string): Promise<void> => {
  return speakBilingual(text, "");
};
