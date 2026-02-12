import React from 'react';
import { LANGUAGES } from '../constants';
import { ChevronDown } from 'lucide-react';

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  excludeAuto?: boolean;
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({ value, onChange, label, excludeAuto }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all cursor-pointer font-medium hover:border-slate-300 dark:hover:border-slate-600"
        >
          {LANGUAGES.filter(l => excludeAuto ? l.code !== 'auto' : true).map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
          <ChevronDown size={16} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
};