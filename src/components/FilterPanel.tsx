import React from 'react';
import { ImpactType } from '../types';
import { SOUND_LIST } from '../data/sounds';

interface FilterPanelProps {
  isOpen: boolean;
  activeImpacts: Set<ImpactType>;
  onToggleImpact: (impact: ImpactType) => void;
  activeCurrencies: Set<string>;
  onToggleCurrency: (cur: string) => void;
  soundEnabled: boolean;
  onToggleSoundEnabled: () => void;
  soundIndex: number;
  onCycleSound: (dir: number) => void;
  onPreviewSound: () => void;
  use24Hour: boolean;
  onToggle24Hour: (use24: boolean) => void;
  onResetAll: () => void;
  onApply: () => void;
  onCancel: () => void;
}

export function FilterPanel({
  isOpen,
  activeImpacts,
  onToggleImpact,
  activeCurrencies,
  onToggleCurrency,
  soundEnabled,
  onToggleSoundEnabled,
  soundIndex,
  onCycleSound,
  onPreviewSound,
  use24Hour,
  onToggle24Hour,
  onResetAll,
  onApply,
  onCancel
}: FilterPanelProps) {
  if (!isOpen) return null;

  const MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF'];

  const getFlagUrl = (cur: string) => {
    const code = cur.toUpperCase();
    const flags: Record<string, string> = {
      USD: 'us', EUR: 'eu', GBP: 'gb', JPY: 'jp', CAD: 'ca', AUD: 'au',
      NZD: 'nz', CHF: 'ch'
    };
    return `https://flagcdn.com/w40/${flags[code] || 'un'}.png`;
  };

  const getCountrySymbol = (cur: string) => {
    const symbols: Record<string, string> = {
      USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', CAD: 'CA', AUD: 'AU',
      NZD: 'NZ', CHF: 'CH'
    };
    return symbols[cur] || cur;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f97316';
      case 'Low': return '#eab308';
      default: return '#94a3b8';
    }
  };

  const currentSound = SOUND_LIST[soundIndex] || SOUND_LIST[0];

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-[#150f2be0] backdrop-blur-md z-40 flex flex-col p-4 rounded-[32px] select-none animate-fadeIn transition-colors duration-300">
      
      {/* Header with Title & Reset Row */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-500/10 dark:border-white/5">
        <div className="text-sm font-bold text-slate-800 dark:text-neutral-100 flex items-center gap-1.5 font-sans">
          <span className="text-[17px]">⚙️</span> Preset Filters
        </div>
        <button
          type="button"
          onClick={onResetAll}
          className="text-[10px] font-bold py-1 px-3 rounded-xl bg-indigo-500/10 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-550/20 active:scale-95 transition-all select-none border border-transparent font-sans"
        >
          ↺ Reset All
        </button>
      </div>

      {/* Filter Options Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
        
        {/* Section: Expected Impact */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase select-none font-sans">
            EXPECTED IMPACT
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['High', 'Medium', 'Low', 'Holiday'] as ImpactType[]).map((impact) => {
              const active = activeImpacts.has(impact);
              return (
                <button
                  key={impact}
                  type="button"
                  onClick={() => onToggleImpact(impact)}
                  data-impact={impact}
                  className={`impact-toggle ${active ? 'active' : ''}`}
                >
                  <span 
                    className="w-2 h-2 rounded-full shrink-0" 
                    style={{ backgroundColor: getImpactColor(impact) }} 
                  />
                  <span>{impact === 'Holiday' ? 'Non-Econ' : impact}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Filter Currencies */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase select-none font-sans">
            FILTER CURRENCIES
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MAJOR_CURRENCIES.map((cur) => {
              const active = activeCurrencies.has(cur);
              return (
                <button
                  key={cur}
                  type="button"
                  onClick={() => onToggleCurrency(cur)}
                  title={cur}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-0.5 rounded-[16px] border-2 transition-all min-h-[44px] ${
                    active
                      ? 'border-[#6366f1] bg-indigo-500/10 text-indigo-600 dark:border-[#a5b4fc] dark:bg-indigo-500/20 dark:text-neutral-100 font-bold'
                      : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-neutral-500 opacity-60'
                  }`}
                >
                  <img
                    src={getFlagUrl(cur)}
                    className="w-5 h-3.5 object-cover rounded-sm border border-neutral-400/20 shrink-0 select-none"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[11px] font-extrabold tracking-wider">{getCountrySymbol(cur)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Sound Alert triggers */}
        <div className="space-y-3 pt-3 border-t border-indigo-500/10 dark:border-white/5">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase select-none font-sans">
            🔔 EVENT ALERT SIGNALS
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Trigger 5 min before alerts
            </span>
            
            {/* Upgraded Toggle Switch independent of theme class */}
            <button
              type="button"
              onClick={onToggleSoundEnabled}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer outline-none shrink-0 ${
                soundEnabled 
                  ? 'bg-indigo-600 dark:bg-indigo-500' 
                  : 'bg-slate-200 dark:bg-neutral-800'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] transition-transform duration-200 ${
                  soundEnabled ? 'transform translate-x-6' : 'transform translate-x-0'
                }`}
              >
                {soundEnabled ? '🔔' : '🔇'}
              </div>
            </button>
          </div>

          {/* Sound choice selection wrap */}
          <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-[18px] border border-indigo-500/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => onCycleSound(-1)}
              className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm bg-indigo-500/10 hover:bg-indigo-500/18 active:scale-90 text-indigo-500 dark:text-indigo-400 transition-all font-sans"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-[11px] font-black text-slate-700 dark:text-neutral-200 truncate font-sans">
              {currentSound.label}
            </span>
            <button
              type="button"
              onClick={() => onCycleSound(1)}
              className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm bg-indigo-500/10 hover:bg-indigo-500/18 active:scale-90 text-indigo-500 dark:text-indigo-400 transition-all font-sans"
            >
              ›
            </button>
            <button
              type="button"
              onClick={onPreviewSound}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] bg-indigo-600 hover:bg-indigo-500 active:scale-90 text-white shadow-md transition-all font-sans"
              title="Test Sound"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Section: Clock Option */}
        <div className="space-y-3 pt-3 border-t border-indigo-500/10 dark:border-white/5">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase select-none font-sans">
            🕒 TIME DISPLAY REGION
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 font-sans">
              Clock Format
            </span>
            
            {/* Segmented Button Selection */}
            <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-indigo-500/10 dark:border-white/5 font-sans">
              <button
                type="button"
                onClick={() => onToggle24Hour(false)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 ${
                  !use24Hour 
                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                12 Hour
              </button>
              <button
                type="button"
                onClick={() => onToggle24Hour(true)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 ${
                  use24Hour 
                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                24 Hour
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer controls Apply and Cancel */}
      <div className="flex gap-2 pt-3 border-t border-indigo-500/10 dark:border-white/5 shrink-0 mt-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 py-2.5 rounded-[16px] bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-xs shadow-md transition-all select-none font-sans"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-[16px] border border-indigo-550/10 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-neutral-900 active:scale-98 text-slate-600 dark:text-slate-400 font-extrabold text-xs transition-all select-none font-sans"
        >
          Cancel
        </button>
      </div>

    </div>
  );
}

export default FilterPanel;
