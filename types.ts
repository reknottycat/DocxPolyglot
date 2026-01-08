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

export type ProviderType = 'gemini' | 'third-party';

export interface SupportedModel {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
}

export const SUPPORTED_MODELS: SupportedModel[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'gemini', description: 'Google SDK' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', provider: 'third-party', description: 'NVIDIA NIM / R1' },
  { id: 'minimaxai/minimax-m2.1', name: 'MiniMax-M2.1', provider: 'third-party', description: 'NVIDIA NIM' },
  { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi-K2-Thinking', provider: 'third-party', description: 'NVIDIA NIM' },
  { id: 'z-ai/glm4.7', name: 'GLM-4.7', provider: 'third-party', description: 'NVIDIA NIM' },
  { id: 'custom', name: 'Custom (自定义)', provider: 'third-party', description: 'Manual Model ID' },
];

export interface APIConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  provider: ProviderType;
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
  modelUsed?: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'zh', name: 'Chinese (中文)', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
];

export interface TranslationProgress {
  totalSegments: number;
  translatedSegments: number;
  currentAction: string;
}