import React from 'react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../types';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  disabled: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedCode, onSelect, disabled }) => {
  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedCode);

  return (
    <div className="relative w-full max-w-xs">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Target Language
      </label>
      <div className="relative">
        <select
          value={selectedCode}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className="appearance-none w-full bg-white border border-slate-300 hover:border-blue-400 text-slate-900 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Globe className="h-5 w-5 text-slate-400" />
        </div>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
};