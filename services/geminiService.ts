import { GoogleGenAI, Modality } from "@google/genai";
import { TranslationRequest, TranslationMode } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }
  return new GoogleGenAI({ apiKey });
};

export const translateContent = async (request: TranslationRequest): Promise<string> => {
  const ai = getAiClient();
  
  // Construct the system instruction based on Tone
  const systemInstruction = `You are OmniTranslate, a world-class expert translator and linguist. 
  Your goal is to provide the most accurate, natural, and context-aware translation possible.
  
  Current Settings:
  - Tone: ${request.tone}
  - Source Language: ${request.sourceLang === 'auto' ? 'Detect automatically' : request.sourceLang}
  - Target Language: ${request.targetLang}
  
  Instructions:
  1. Translate the input content into ${request.targetLang}.
  2. Maintain the requested tone (${request.tone}).
  3. If the input is an audio or video file, transcribe the speech and then translate it.
  4. If the input is an image, transcribe any text found within the image and translate it. Describe relevant visual context if it aids understanding.
  5. If the input is a document, preserve the formatting structure as best as possible in plain text.
  6. OUTPUT ONLY THE TRANSLATED TEXT. Do not add introductory phrases like "Here is the translation:".
  `;

  let parts: any[] = [];

  // Enforce Gemini 2.5 Pro for Image mode for best multimodal understanding within the 2.x family
  const effectiveModel = request.mode === TranslationMode.IMAGE 
    ? 'gemini-2.5-pro-preview' 
    : request.model;

  if (request.mode === TranslationMode.TEXT) {
    parts.push({ text: request.content });
  } else {
    // For Document, Audio, Video, Image we expect base64 content
    if (!request.mimeType) {
      throw new Error("MIME type is required for file translation.");
    }
    
    parts.push({
      inlineData: {
        mimeType: request.mimeType,
        data: request.content // Base64 string
      }
    });
    
    parts.push({ text: `Translate this ${request.mode.toLowerCase()} file content to ${request.targetLang}.` });
  }

  try {
    const response = await ai.models.generateContent({
      model: effectiveModel,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No translation returned from the model.");
    }

    return resultText;

  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      throw new Error("No audio data generated.");
    }
    return audioData;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
}