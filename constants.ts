import { Language, ModelOption, Tone } from './types';

export const MODELS: ModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Fast experimental model.'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight and cost-effective.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Balanced performance & cost. Best for general use.'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'High reasoning capability for complex translations.'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Most recent model, greatly developed.'
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'High reasoning capability for complex translations.'
  }
];

export const TONES: Tone[] = [
  Tone.PROFESSIONAL,
  Tone.CASUAL,
  Tone.CREATIVE,
  Tone.ACADEMIC,
  Tone.PRECISE
];

export const LANGUAGES: Language[] = [
  { code: 'auto', name: 'Detect Language' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
];