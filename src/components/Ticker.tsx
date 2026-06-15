import React from 'react';
import { FxEvent } from '../types';

interface TickerProps {
  events: FxEvent[];
  use24Hour: boolean;
  isDarkMode: boolean;
}

export function Ticker({ events, use24Hour, isDarkMode }: TickerProps) {
  // Flag system mapping
  const getFlagUrl = (cur: string) => {
    const code = cur.toUpperCase();
    const flags: Record<string, string> = {
      USD: 'us', EUR: 'eu', GBP: 'gb', JPY: 'jp', CAD: 'ca', AUD: 'au',
      NZD: 'nz', CHF: 'ch', CNY: 'cn', CNH: 'cn'
    };
    return `https://flagcdn.com/w40/${flags[code] || 'un'}.png`;
  };

  const getCountrySymbol = (cur: string) => {
    const symbols: Record<string, string> = {
      USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', CAD: 'CA', AUD: 'AU',
      NZD: 'NZ', CHF: 'CH', CNY: 'CN', CNH: 'CN'
    };
    return symbols[cur.toUpperCase()] || cur;
  };

  const getImpactClass = (impact: string) => {
    switch (impact) {
      case 'High': return 'high';
      case 'Medium': return 'medium';
      case 'Low': return 'low';
      default: return 'holiday';
    }
  };

  const formatTimeOnly = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24Hour });
    } catch {
      return '';
    }
  };

  const activeEvents = events.length > 0 ? events : [
    { title: "No scheduled news announcements active", country: "USD", impact: "Low" as const, date: new Date().toISOString() }
  ];

  // Calculate total estimated width of active events to keep marquee speed completely constant
  const estimatedTotalWidth = activeEvents.reduce((acc, ev) => {
    const titleLen = ev.title ? ev.title.length : 0;
    const itemWidth = 115 + Math.min(150, titleLen * 7);
    return acc + itemWidth;
  }, 0);

  const speed = 100; // Constant speed in pixels per second
  const duration = Math.max(8, estimatedTotalWidth / speed);

  // Render events inside ticker tracker
  const renderTickerList = () => (
    <>
      {activeEvents.map((ev, idx) => (
        <div 
          key={`${ev.title}-${idx}`} 
          className="ticker-item select-none text-[12px] font-semibold flex items-center"
          style={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
        >
          <span className={`ticker-dot ${getImpactClass(ev.impact)}`} />
          <img
            src={getFlagUrl(ev.country)}
            className="w-4 h-3 object-cover rounded-sm border border-neutral-400/20 mr-1 select-none pointer-events-none"
            alt=""
            referrerPolicy="no-referrer"
            draggable={false}
          />
          <span 
            className="text-[10px] uppercase font-bold mr-1.5"
            style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
          >
            {getCountrySymbol(ev.country)}
          </span>
          <span className="truncate max-w-[150px]">{ev.title}</span>
          <span 
            className="ml-1 text-[11px] font-extrabold"
            style={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
          >
            {formatTimeOnly(ev.date)}
          </span>
        </div>
      ))}
    </>
  );

  return (
    <div className="ticker-wrap select-none">
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
        {/* Render twice for continuous seamless loop */}
        <div className="inline-flex items-center shrink-0">
          {renderTickerList()}
        </div>
        <div className="inline-flex items-center shrink-0" aria-hidden="true">
          {renderTickerList()}
        </div>
      </div>
    </div>
  );
}

export default Ticker;
