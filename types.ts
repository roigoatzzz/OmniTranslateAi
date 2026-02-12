export enum TranslationMode {
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  LIVE = 'LIVE'
}

export interface Language {
  code: string;
  name: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export enum Tone {
  CASUAL = 'Casual',
  PROFESSIONAL = 'Professional',
  CREATIVE = 'Creative',
  ACADEMIC = 'Academic',
  PRECISE = 'Literal/Precise'
}

export interface TranslationRequest {
  sourceLang: string;
  targetLang: string;
  content: string; // Text content or Base64 string for files
  mimeType?: string; // For files
  mode: TranslationMode;
  model: string;
  tone: Tone;
}

export interface TranslationResult {
  original: string;
  translated: string;
  detectedSourceLanguage?: string;
}