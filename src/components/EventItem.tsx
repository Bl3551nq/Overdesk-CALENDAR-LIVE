import React from 'react';
import { FxEvent } from '../types';
import { Bell, BellOff } from 'lucide-react';

interface EventItemProps {
  event: FxEvent;
  isCompleted: boolean;
  onToggleComplete: () => void;
  index: number;
  use24Hour: boolean;
  isDarkMode: boolean;
  showActual: boolean;
  showForecast: boolean;
  showPrevious: boolean;
  isAlarmDisabled: boolean;
  onToggleAlarm: () => void;
}

export const EventItem: React.FC<EventItemProps> = ({ 
  event, 
  isCompleted, 
  onToggleComplete, 
  index, 
  use24Hour, 
  isDarkMode, 
  showActual, 
  showForecast, 
  showPrevious,
  isAlarmDisabled,
  onToggleAlarm
}) => {
  const [isDismissing, setIsDismissing] = React.useState(false);
  // Freeze the index at Mount so that animation delay stays fixed and does not cause a "refresh/re-trigger" when items are dismissed
  const [initialIndex] = React.useState(index);

  // Flag system mappings
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

  const formatEventTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24Hour });
    } catch {
      return '00:00';
    }
  };

  // Build the secondary metrics line i.e. "Prev: 0.6% · F: 0.3%"
  const getMetricsString = () => {
    const parts = [];
    if (showPrevious && event.previous) parts.push(`Prev: ${event.previous}`);
    if (showForecast && event.forecast) parts.push(`F: ${event.forecast}`);
    if (showActual && event.actual) parts.push(`Act: ${event.actual}`);
    return parts.join(' · ');
  };

  const timeStr = formatEventTime(event.date);
  const cur = event.country.toUpperCase();
  const impactClass = getImpactClass(event.impact);
  const metrics = getMetricsString();

  return (
    <div
      style={{ 
        animationDelay: `${initialIndex * 0.05}s`
      }}
      className={`news-item select-none ${isCompleted ? 'opacity-25 pointer-events-none scale-95 origin-center' : ''} ${isDismissing ? 'dismissing' : ''}`}
    >
      {/* Coloured Impact Bar (High / Med / Low / Holiday) */}
      <div className={`impact-box ${impactClass}`} />

      {/* Title & Metadata Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Country & Time detail row */}
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: isDarkMode ? '#f8fafc' : '#1e293b', 
          letterSpacing: '0.05em', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          marginBottom: '1px' 
        }}>
          <span className="inline-flex items-center gap-1.5">
            <img
              src={getFlagUrl(cur)}
              className="w-4 h-3 object-cover rounded-sm border border-neutral-400/20 select-none"
              alt=""
              referrerPolicy="no-referrer"
            />
            {getCountrySymbol(cur)} • {timeStr}
          </span>
        </div>

        {/* Title row */}
        <div 
          style={{ 
            fontSize: '11.5px', 
            fontWeight: 700, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: isDarkMode ? '#f8fafc' : '#1e293b'
          }}
          className="font-sans"
          title={event.title}
        >
          {event.title}
        </div>

        {/* Forecast Metadata Metrics section */}
        {metrics && (
          <div style={{ fontSize: '10.5px', fontWeight: 500, color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: '1.5px' }} className="font-sans">
            {metrics}
          </div>
        )}
      </div>

      {/* Action / Badge Column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        {/* Flag badge label */}
        <span 
          style={{ 
            fontSize: '9.5px', 
            fontWeight: 700, 
            padding: '2px 7px', 
            borderRadius: '10px' 
          }}
          className={
            event.impact === 'High' 
              ? 'bg-red-500/10 text-red-500' 
              : event.impact === 'Medium'
                ? 'bg-orange-500/10 text-orange-500'
                : event.impact === 'Low'
                  ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  : 'bg-slate-500/10 text-slate-500 dark:text-neutral-400'
          }
        >
          {event.impact === 'Holiday' ? 'Holiday' : event.impact}
        </span>

        {/* Controls row */}
        <div className="flex items-center gap-2 mt-0.5" style={{ paddingRight: '5px' }}>
          {/* Bell Alarm Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleAlarm();
            }}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className={`flex items-center justify-center p-1 rounded-full cursor-pointer hover:bg-neutral-500/10 dark:hover:bg-white/10 transition-all text-xs active:scale-90 select-none ${
              isAlarmDisabled 
                ? 'text-slate-400 dark:text-neutral-500/80 hover:text-slate-500 dark:hover:text-neutral-300' 
                : 'text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300'
            }`}
            title={isAlarmDisabled ? "Turn ON 5-minute Alarm Warning" : "Turn OFF 5-minute Alarm Warning"}
          >
            {isAlarmDisabled ? (
              <BellOff className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
            ) : (
              <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
            )}
          </button>

          {/* Complete Check button wrapper */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (isCompleted) {
                onToggleComplete();
              } else {
                setIsDismissing(true);
                setTimeout(() => {
                  onToggleComplete();
                }, 280);
              }
            }}
            className={`done-circle ${isCompleted || isDismissing ? 'done' : ''}`}
            title={isCompleted ? "Recover Event" : "Dismiss Announcement"}
          />
        </div>
      </div>
    </div>
  );
};

export default EventItem;
