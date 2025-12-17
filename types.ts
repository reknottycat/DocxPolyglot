export enum TranslationStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  TRANSLATING = 'TRANSLATING',
  REBUILDING = 'REBUILDING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

export interface DocFile {
  id: string;
  file: File;
  status: TranslationStatus;
  progress: number;
  currentAction?: string;
  downloadUrl?: string;
  error?: string;
  tokenUsage?: number;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese (中文)', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇵🇹' },
];

export interface TranslationProgress {
  totalSegments: number;
  translatedSegments: number;
  currentAction: string;
}