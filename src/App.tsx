import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FxEvent, ImpactType } from './types';
import { BUILTIN_DATA } from './data/events';
import { SOUND_LIST, SOUND_DATA } from './data/sounds';
import { useDrag } from './hooks/useDrag';
import { playSynthesizedSound } from './utils/audioSynth';

import WindowControls from './components/WindowControls';
import Ticker from './components/Ticker';
import FilterPanel from './components/FilterPanel';
import EventItem from './components/EventItem';
import LicenseGate from './components/LicenseGate';

export default function App() {
  // --- STATE SYSTEM ---
  const [isVerified, setIsVerified] = useState(false);
  const [isLicenseLoading, setIsLicenseLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [baseEvents, setBaseEvents] = useState<FxEvent[]>(BUILTIN_DATA);
  const [isLiveOnline, setIsLiveOnline] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [minimized, setMinimized] = useState(false);
  const [isBubble, setIsBubble] = useState(false);
  
  const isBubbleRef = useRef(isBubble);
  useEffect(() => {
    isBubbleRef.current = isBubble;
  }, [isBubble]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('overdeskTheme') === 'dark');
  const [use24Hour, setUse24Hour] = useState(true);
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showPrevious, setShowPrevious] = useState(true);
  const [launchOnStart, setLaunchOnStart] = useState(true);
  const [windowScale, setWindowScale] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('overdeskWindowScale');
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && [2, 1.5, 1.2, 1, 0.7].includes(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Read window scale error', e);
    }
    return 1.0;
  });

  const saveWindowScalePreference = (val: number) => {
    setWindowScale(val);
    try {
      localStorage.setItem('overdeskWindowScale', val.toString());
    } catch (e) {
      console.warn('Save window scale error', e);
    }
  };

  // Filter selections
  const [activeImpacts, setActiveImpacts] = useState<Set<ImpactType>>(
    new Set(['High', 'Medium', 'Low', 'Holiday'])
  );
  
  const [activeCurrencies, setActiveCurrencies] = useState<Set<string>>(
    new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF'])
  );
  
  const [completedEvents, setCompletedEvents] = useState<Set<string>>(new Set());

  // Alarm Alert Cuses
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundIndex, setSoundIndex] = useState(0); // Default Pokémon Heal
  const [alertedEvents, setAlertedEvents] = useState<Set<string>>(new Set());
  const [disabledAlarms, setDisabledAlarms] = useState<Set<string>>(new Set());

  // Drag controls
  const { position, elementRef, onPointerDown, hasMovedRef } = useDrag(
    40, 
    40, 
    windowScale,
    () => {
      if (isBubble) {
        setIsBubble(false);
      }
    }
  );

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

  // Periodically log window size to debug DPI or boundary mismatch
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[DEBUG Window Size]', {
        'window.innerWidth': window.innerWidth,
        'window.innerHeight': window.innerHeight,
        'window.outerWidth': window.outerWidth,
        'window.outerHeight': window.outerHeight,
        'document.body.clientWidth': document.body?.clientWidth,
        'document.body.clientHeight': document.body?.clientHeight,
        'devicePixelRatio': window.devicePixelRatio,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- ELECTRON AUTO-RESIZE & HOVER CLICK-THROUGH HANDLERS ---
  useEffect(() => {
    if (isElectron) {
      // 1. DYNAMIC ELEMENT OBSERVER (Switches observing between LicenseGate Card and App Widget)
      let rObserver: ResizeObserver | null = null;
      let currentObserved: Element | null = null;

      const setupObserver = () => {
        const targetEl = document.getElementById('overdesk-widget') || 
                         document.querySelector('#overdesk-activation-gate .gate-card-wrapper');
        
        if (!targetEl) return;
        if (currentObserved === targetEl) return;
        
        if (rObserver) {
          rObserver.disconnect();
        }
        
        currentObserved = targetEl;
        rObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const rect = entry.target.getBoundingClientRect();
            // Math.ceil secures integer dimensions to prevent subpixel layout shift cropping
            const w = Math.ceil(rect.width);
            const h = Math.ceil(rect.height);
            if (w > 0 && h > 0) {
              // Set window to exact dimensions of the target element, removing any invisible window buffers
              (window as any).electronAPI.resizeWindow(w, h);
            }
          }
        });
        
        rObserver.observe(targetEl);
      };

      setupObserver();

      // Mutation observer to dynamically re-bind the resize observer when screens mount/unmount
      const mObserver = new MutationObserver(() => {
        setupObserver();
      });
      mObserver.observe(document.body, { childList: true, subtree: true });

      // 2. PERFECT HOVER MOUSE CLICK-THROUGH (Ignores transparent regions & shadows completely)
      const handleMouseMove = (e: MouseEvent) => {
        // If the user is actively holding down any mouse buttons (clicking or dragging),
        // we must never ignore mouse events. This prevents programmatic drag from breaking
        // if the cursor moves faster than the window moves.
        if (e.buttons > 0) {
          return;
        }
        const target = e.target as HTMLElement | null;
        if (!target) return;
        
        // Match active interactable parts of our UI:
        const isInteractive = target.closest('.widget') !== null || 
                              target.closest('.settings-overlay') !== null ||
                              target.closest('#overdesk-activation-gate .card') !== null;
        
        if (isBubbleRef.current || isInteractive) {
          (window as any).electronAPI.setIgnoreMouseEvents(false);
        } else {
          (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        if (rObserver) rObserver.disconnect();
        mObserver.disconnect();
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isElectron, isVerified]);

  // --- LOCAL PERSISTENCE LOADS ---
  useEffect(() => {
    // Sync dark theme on body class system immediately
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const initializeApp = async () => {
      // Restore license activation status
      try {
        const verified = localStorage.getItem('overdesk_license_verified');
        if (verified === 'true') {
          setIsVerified(true);
        }
      } catch (e) {
        console.warn('License status read error', e);
      }

      // Query server for license file backup/persistence
      try {
        const checkRes = await fetch('/api/license/status');
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.success && checkData.key) {
            localStorage.setItem('overdesk_license_verified', 'true');
            localStorage.setItem('overdesk_verified_key', checkData.key);
            setIsVerified(true);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch backup license status from server:', err);
      }
      setIsLicenseLoading(false);

      // Restore completed (marked-as-done) events
      try {
        const storedCompleted = localStorage.getItem('overdeskCompleted');
        if (storedCompleted) {
          setCompletedEvents(new Set(JSON.parse(storedCompleted)));
        }
      } catch (e) {
        console.warn('Completed read error', e);
      }

      // Restore alerts state
      try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const storedAlerts = localStorage.getItem('overdeskAlerted');
        if (storedAlerts) {
          const parsed = JSON.parse(storedAlerts);
          if (parsed[todayStr]) {
            setAlertedEvents(new Set(parsed[todayStr]));
          }
        }
      } catch (e) {
        console.warn('Alerts read error', e);
      }

      // Restore disabled alarms state
      try {
        const storedMuted = localStorage.getItem('overdeskDisabledAlarms');
        if (storedMuted) {
          setDisabledAlarms(new Set<string>(JSON.parse(storedMuted) as string[]));
        }
      } catch (e) {
        console.warn('Disabled alarms read error', e);
      }

      // Restore theme preference
      const storedTheme = localStorage.getItem('overdeskTheme');
      if (storedTheme) {
        setIsDarkMode(storedTheme === 'dark');
      }

      // Restore time format preference (12/24 hour display)
      const storedUse24 = localStorage.getItem('overdeskUse24Hour');
      if (storedUse24 !== null) {
        setUse24Hour(storedUse24 === 'true');
      }

      // Restore metric visibility preferences
      const storedShowActual = localStorage.getItem('overdeskShowActual');
      if (storedShowActual !== null) {
        setShowActual(storedShowActual === 'true');
      }
      const storedShowForecast = localStorage.getItem('overdeskShowForecast');
      if (storedShowForecast !== null) {
        setShowForecast(storedShowForecast === 'true');
      }
      const storedShowPrevious = localStorage.getItem('overdeskShowPrevious');
      if (storedShowPrevious !== null) {
        setShowPrevious(storedShowPrevious === 'true');
      }

      // Restore or initialize launch on startup preference (defaults to true for clean startup launches on install)
      const storedLaunchOnStart = localStorage.getItem('overdeskLaunchOnStart');
      if (storedLaunchOnStart !== null) {
        const isEnabled = storedLaunchOnStart === 'true';
        setLaunchOnStart(isEnabled);
        if (isElectron && (window as any).electronAPI) {
          (window as any).electronAPI.setLaunchOnStart(isEnabled);
        }
      } else {
        if (isElectron) {
          setLaunchOnStart(true);
          localStorage.setItem('overdeskLaunchOnStart', 'true');
          if ((window as any).electronAPI) {
            (window as any).electronAPI.setLaunchOnStart(true);
          }
        }
      }
    };

    initializeApp();
  }, []);

  // --- LIVE DATA FETCH EFFECT ---
  useEffect(() => {
    const fetchLiveData = async () => {
      const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/Bl3551nq/overdex-fx-calendar/main/ff_data.json';
      try {
        const response = await fetch(`${GITHUB_DATA_URL}?v=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            // Match and convert key formats from live data stream if needed
            const verifiedData: FxEvent[] = data.map((item: any) => ({
              title: item.title || 'Untitled Announcement',
              country: item.country || 'USD',
              date: item.date || new Date().toISOString(),
              impact: (item.impact && ['High', 'Medium', 'Low', 'Holiday'].includes(item.impact)) ? item.impact as ImpactType : 'Low',
              forecast: item.forecast || '',
              previous: item.previous || '',
              actual: item.actual || ''
            }));
            // Smart merge: Use local uploaded events as base, but update their values or add fresh events from git
            const mergedMap = new Map<string, FxEvent>();
            BUILTIN_DATA.forEach(ev => {
              try {
                const key = `${ev.title.toLowerCase().trim()}|${new Date(ev.date).toISOString()}`;
                mergedMap.set(key, ev);
              } catch {
                mergedMap.set(`${ev.title.toLowerCase().trim()}|${ev.date}`, ev);
              }
            });

            verifiedData.forEach(ev => {
              try {
                const key = `${ev.title.toLowerCase().trim()}|${new Date(ev.date).toISOString()}`;
                if (mergedMap.has(key)) {
                  const existing = { ...mergedMap.get(key)! };
                  if (ev.actual) existing.actual = ev.actual;
                  if (ev.forecast) existing.forecast = ev.forecast;
                  if (ev.previous) existing.previous = ev.previous;
                  mergedMap.set(key, existing);
                } else {
                  mergedMap.set(key, ev);
                }
              } catch {
                const rawKey = `${ev.title.toLowerCase().trim()}|${ev.date}`;
                if (mergedMap.has(rawKey)) {
                  const existing = { ...mergedMap.get(rawKey)! };
                  if (ev.actual) existing.actual = ev.actual;
                  if (ev.forecast) existing.forecast = ev.forecast;
                  if (ev.previous) existing.previous = ev.previous;
                  mergedMap.set(rawKey, existing);
                } else {
                  mergedMap.set(rawKey, ev);
                }
              }
            });

            const combinedList = Array.from(mergedMap.values()).sort((a, b) => {
              const tA = new Date(a.date).getTime();
              const tB = new Date(b.date).getTime();
              return (isNaN(tA) || isNaN(tB)) ? 0 : tA - tB;
            });

            setBaseEvents(combinedList);
            setIsLiveOnline(true);
            console.log(`[FX SERVICE] Successfully synced ${verifiedData.length} live events from GitHub and prioritized ${BUILTIN_DATA.length} local events.`);

            // Always preserve and load the current local date (today) as default view
            setViewDate(new Date());
          }
        }
      } catch (err) {
        console.warn('[FX SERVICE] Operating with pre-cached standalone dataset due to CORS/offline constraint.', err);
      }
    };
    fetchLiveData();

    // Sync live announcement and metric data every 20 seconds for instant real-time updates when minimized
    const syncInterval = setInterval(fetchLiveData, 20000);
    return () => clearInterval(syncInterval);
  }, []);

  const saveCompleteState = (updated: Set<string>) => {
    setCompletedEvents(updated);
    try {
      localStorage.setItem('overdeskCompleted', JSON.stringify([...updated]));
    } catch (e) {
      console.warn('Complete state save error', e);
    }
  };

  const saveAlertState = (updated: Set<string>) => {
    setAlertedEvents(updated);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const fresh = { [todayStr]: [...updated] };
      localStorage.setItem('overdeskAlerted', JSON.stringify(fresh));
    } catch (e) {
      console.warn('Alert storage error', e);
    }
  };

  const saveDisabledAlarmsState = (updated: Set<string>) => {
    setDisabledAlarms(updated);
    try {
      localStorage.setItem('overdeskDisabledAlarms', JSON.stringify([...updated]));
    } catch (e) {
      console.warn('Disabled alarms save error', e);
    }
  };

  const toggleAlarmDisabled = (title: string, date: string) => {
    const key = `${title}|${date}`;
    const updated = new Set<string>(disabledAlarms);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    saveDisabledAlarmsState(updated);
  };

  const saveThemePreference = (darkModeState: boolean) => {
    setIsDarkMode(darkModeState);
    try {
      localStorage.setItem('overdeskTheme', darkModeState ? 'dark' : 'light');
    } catch (e) {
      console.warn('Theme storage error', e);
    }
  };

  const saveTimeFormatPreference = (use24: boolean) => {
    setUse24Hour(use24);
    try {
      localStorage.setItem('overdeskUse24Hour', String(use24));
    } catch (e) {
      console.warn('Time format storage error', e);
    }
  };

  const saveLaunchOnStartPreference = (enable: boolean) => {
    setLaunchOnStart(enable);
    try {
      localStorage.setItem('overdeskLaunchOnStart', String(enable));
      if (isElectron && (window as any).electronAPI) {
        (window as any).electronAPI.setLaunchOnStart(enable);
      }
    } catch (e) {
      console.warn('Launch on startup storage error', e);
    }
  };

  const handleToggleActual = (val: boolean) => {
    setShowActual(val);
    try {
      localStorage.setItem('overdeskShowActual', String(val));
    } catch (e) {
      console.warn('Show actual storage error', e);
    }
  };

  const handleToggleForecast = (val: boolean) => {
    setShowForecast(val);
    try {
      localStorage.setItem('overdeskShowForecast', String(val));
    } catch (e) {
      console.warn('Show forecast storage error', e);
    }
  };

  const handleTogglePrevious = (val: boolean) => {
    setShowPrevious(val);
    try {
      localStorage.setItem('overdeskShowPrevious', String(val));
    } catch (e) {
      console.warn('Show previous storage error', e);
    }
  };

  // --- AUDIO CONTROLS MANAGER ---
  const playSoundFile = (soundKey: string) => {
    // Check if we have a direct HTTP/HTTPS URL (like our raw GitHub mp3 links)
    const dataUri = SOUND_DATA[soundKey];
    if (dataUri && (dataUri.startsWith('http://') || dataUri.startsWith('https://'))) {
      try {
        const audio = new Audio(dataUri);
        audio.volume = 0.65;
        audio.play().catch(err => console.log('[Audio] Autoplay blocked, wait for user interact', err));
      } catch (e) {
        console.error('[Audio] Execution error playing audio file', e);
      }
      return;
    }

    // First try the robust real-time Web Audio API synthesizer
    if (playSynthesizedSound(soundKey)) {
      return;
    }
    
    // Fall back to pre-recorded base64 data URI if not covered by synthesizers
    if (!dataUri) return;
    try {
      const audio = new Audio(dataUri);
      audio.volume = 0.65;
      audio.play().catch(err => console.log('[Audio] Autoplay blocked, wait for user interact', err));
    } catch (e) {
      console.error('[Audio] Execution error', e);
    }
  };

  const triggerRings = (soundKey: string, times: number) => {
    for (let i = 0; i < times; i++) {
      // 2.5 seconds delay between rings ensures beautiful sequential bell tolls
      setTimeout(() => playSoundFile(soundKey), i * 2500);
    }
  };

  const previewSound = () => {
    const curSound = SOUND_LIST[soundIndex];
    if (curSound) {
      playSoundFile(curSound.key);
    }
  };

  const mergedEvents = baseEvents;

  // --- REAL-TIME CALENDAR ALERT ENGINE (Alarm ring exactly 5 minutes before) ---
  useEffect(() => {
    const alertTimer = setInterval(() => {
      if (!soundEnabled || !mergedEvents.length) return;

      const now = Date.now();
      const alarmWindow = 5 * 60 * 1000; // exact 5 mins in ms
      const buffer = 45 * 1000; // tolerance window (45 seconds)

      mergedEvents.forEach(ev => {
        const evTime = new Date(ev.date).getTime();
        const diff = evTime - now;

        // If the news announcement is coming up in approx 5 minutes, ring!
        if (diff > 0 && Math.abs(diff - alarmWindow) <= buffer) {
          const key = `${ev.title}|${ev.date}`;
          if (!alertedEvents.has(key)) {
            const nextAlerted = new Set<string>(alertedEvents);
            nextAlerted.add(key);
            saveAlertState(nextAlerted);

            // Turn off alarm if the bell is muted for this specific event
            if (!disabledAlarms.has(key)) {
              // Ring matching audio chime 5 times
              const curSoundKey = SOUND_LIST[soundIndex].key;
              triggerRings(curSoundKey, 5);
              console.log(`[FX SYSTEM ALERT] 5-minute incoming news: ${ev.title}`);
            } else {
              console.log(`[FX SYSTEM ALERT] 5-minute incoming news muted (bell off): ${ev.title}`);
            }
          }
        }
      });
    }, 5000); // Poll every 5 seconds for high precision live alarms

    return () => clearInterval(alertTimer);
  }, [soundEnabled, soundIndex, alertedEvents, disabledAlarms]);

  // --- DAY CALCULATOR & HEADINGS ---
  const dayStr = viewDate.toLocaleDateString('en-CA');

  const filteredEvents = mergedEvents.filter(ev => {
    const evDayStr = new Date(ev.date).toLocaleDateString('en-CA');
    if (evDayStr !== dayStr) return false;

    // Filter impacts
    if (!activeImpacts.has(ev.impact)) return false;

    // Filter country currencies
    const curCode = ev.country.toUpperCase();
    if (activeCurrencies.size && !activeCurrencies.has(curCode)) return false;

    // Exclude completed (dismissed) items
    const key = `${ev.title}|${ev.date}`;
    if (completedEvents.has(key)) return false;

    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getDayHeading = () => {
    const referenceDay = new Date();
    referenceDay.setHours(0, 0, 0, 0);
    
    const targetDay = new Date(viewDate);
    targetDay.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((targetDay.getTime() - referenceDay.getTime()) / 86400000);
    
    if (diffDays === 0) return "Today's News";
    if (diffDays === 1) return "Tomorrow's News";
    if (diffDays === -1) return "Yesterday's News";
    return viewDate.toLocaleDateString('en-US', { weekday: 'long' }) + "'s News";
  };

  // --- EVENT ACTION HANDLERS ---
  const changeDay = (delta: number) => {
    const nextD = new Date(viewDate);
    nextD.setDate(viewDate.getDate() + delta);
    setViewDate(nextD);
  };

  const toggleEventComplete = (title: string, date: string) => {
    const key = `${title}|${date}`;
    const nextCompleted = new Set<string>(completedEvents);
    if (nextCompleted.has(key)) {
      nextCompleted.delete(key);
    } else {
      nextCompleted.add(key);
    }
    saveCompleteState(nextCompleted);
  };

  const handleApplyFilters = () => {
    setIsFilterOpen(false);
  };

  const handleResetAll = () => {
    setCompletedEvents(new Set());
    localStorage.removeItem('overdeskCompleted');
    setActiveImpacts(new Set(['High', 'Medium', 'Low', 'Holiday']));
    setActiveCurrencies(new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF']));
    handleToggleActual(true);
    handleToggleForecast(true);
    handleTogglePrevious(true);
    saveWindowScalePreference(1.0);
    setIsFilterOpen(false);
  };

  const handleDeactivateLicense = async () => {
    localStorage.removeItem('overdesk_license_verified');
    localStorage.removeItem('overdesk_verified_key');
    setIsVerified(false);
    setIsFilterOpen(false);
    try {
      await fetch('/api/license/deactivate', { method: 'POST' });
    } catch (e) {
      console.warn('Deactivate post failed', e);
    }
  };

  if (isClosed) {
    return null;
  }

  if (isLicenseLoading) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center transition-colors duration-500 bg-transparent ${isDarkMode ? 'text-white' : 'text-slate-800'} font-sans`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-[11px] font-bold tracking-widest uppercase opacity-70">Loading Activation Gate...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <LicenseGate 
        isDarkMode={isDarkMode} 
        onVerifySuccess={() => setIsVerified(true)} 
        onCloseApp={() => setIsClosed(true)}
      />
    );
  }

  return (
    <div className="fixed inset-0 overflow-visible pointer-events-none select-none bg-transparent text-slate-800">
      
      {/* 1. Main Desktop utility Widget */}
      <div
        id="overdesk-widget"
        ref={elementRef}
        style={{
          position: 'absolute',
          left: isElectron ? '0px' : `${position.x}px`,
          top: isElectron ? '0px' : `${position.y}px`,
          padding: '20px', // Invisible padding area to fully contain the gorgeous soft drop shadows (reduced to 20px for bounds)
          pointerEvents: 'none', // Lets user click right through the shadow padding
          display: 'inline-block',
          boxSizing: 'border-box',
          zoom: windowScale,
        }}
      >
        <div
          className={`widget ${minimized ? 'minimized' : ''} ${isFilterOpen ? 'filter-open' : ''} ${isBubble ? 'bubble' : ''}`}
          onPointerDown={onPointerDown}
          onDoubleClick={(e) => {
            const target = e.target as HTMLElement;
            // Don't action if clicking on interactive elements like buttons, inputs, select or complete circles
            if (target.closest('button, input, select, .done-circle, span.nav-btn')) {
              return;
            }
            if (isBubble) {
              setIsBubble(false);
            } else {
              setMinimized(prev => !prev);
            }
          }}
          onPointerUp={(e) => {
            // If dragging occurred, don't execute expand action
            if (hasMovedRef.current) {
              return;
            }
            if (isBubble) {
              e.stopPropagation();
              setIsBubble(false);
            }
          }}
          onClick={(e) => {
            // If we drag, don't execute the click action (e.g., restoring the bubble)
            if (hasMovedRef.current) {
              e.stopPropagation();
              return;
            }
            // If in bubble compact mode, click anywhere to restore
            if (isBubble) {
              e.stopPropagation();
              setIsBubble(false);
            }
          }}
          style={{
            pointerEvents: 'auto', // Capture mouse interactions on the active widget
            width: minimized && !isBubble ? '350px' : isBubble ? '54px' : '350px',
            margin: '0',
            position: 'relative', // Honors the parent padding
          }}
        >
        {/* Compact Bubble launcher icon (Shown only if bubble=true) */}
        {isBubble && (
          <div 
            className="bubble-icon select-none cursor-pointer" 
            title="Expand Widget"
            onPointerUp={(e) => {
              e.stopPropagation();
              setIsBubble(false);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsBubble(false);
            }}
          >
            📅
          </div>
        )}

        {/* --- FULL FULL-WIDGET DOM STRUCTURE --- */}
        {!isBubble && (
          <>
              {/* Top Bar macOS Buttons drag strip */}
            <div 
              className="top-bar select-none"
              style={{ display: 'grid', gridTemplateColumns: '54px 1fr 54px', alignItems: 'center', marginBottom: '12px' }}
            >
              {/* Native macOS style window elements */}
              <div style={{ display: 'flex', width: '54px' }}>
                <WindowControls 
                  onClose={() => isElectron ? (window as any).electronAPI.closeWindow() : setIsClosed(true)}
                  onMinimize={() => setMinimized(prev => !prev)}
                  onBubbleToggle={() => setIsBubble(true)}
                  minimized={minimized}
                  isBubble={isBubble}
                />
              </div>

              {/* Title bar label - Perfectly Centered Grid column */}
              <div 
                className="date-label select-none flex items-center justify-center gap-1.5"
                style={{ 
                  textAlign: 'center', 
                  justifyContent: 'center',
                  fontSize: minimized ? '13px' : '12px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: isDarkMode ? '#818cf8' : '#4f46e5'
                }}
              >
                <span>
                  {minimized 
                    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) 
                    : "EVENTS"
                  }
                </span>
                {isLiveOnline && !minimized && (
                  <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded text-[8px] tracking-widest font-extrabold uppercase animate-pulse select-none" title="Real-time Feed Active">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Live
                  </span>
                )}
              </div>

              {/* Settings Filter Gear Icon on Right or Placeholder spacer */}
              {!minimized && !isFilterOpen ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '54px' }}>
                  <button 
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="nav-btn btn-filter text-sm select-none"
                    title="Preset Filters"
                  >
                    ⚙️
                  </button>
                </div>
              ) : (
                <div style={{ width: '54px' }} />
              )}
            </div>

            {/* A. Calendar Card container representation */}
            <div className="card-container select-none">
              
              {/* Day title indicator & Slider Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="font-sans">
                  <div style={{ fontSize: '16px', fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                    {getDayHeading()}
                  </div>
                  <div style={{ fontSize: '10.5px', fontWeight: 600, color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: '2px' }}>
                    {viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Day Slider Nav chevrons */}
                <div className="nav-btns select-none flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => changeDay(-1)} 
                    className="nav-btn btn-back text-[15px] font-black hover:bg-neutral-200 dark:hover:bg-neutral-800 text-slate-800 dark:text-slate-100 transition-all font-sans"
                    title="Prev Day"
                  >
                    ‹
                  </button>
                  <button 
                    type="button"
                    onClick={() => changeDay(1)} 
                    className="nav-btn btn-fwd text-[15px] font-black text-white hover:brightness-110 transition-all font-sans"
                    title="Next Day"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Event scroll list */}
              <div className="news-list select-none">
                {filteredEvents.map((ev, index) => (
                  <EventItem
                    key={`${ev.title}-${ev.date}`}
                    event={ev}
                    index={index}
                    use24Hour={use24Hour}
                    isDarkMode={isDarkMode}
                    showActual={showActual}
                    showForecast={showForecast}
                    showPrevious={showPrevious}
                    isCompleted={completedEvents.has(`${ev.title}|${ev.date}`)}
                    onToggleComplete={() => toggleEventComplete(ev.title, ev.date)}
                    isAlarmDisabled={disabledAlarms.has(`${ev.title}|${ev.date}`)}
                    onToggleAlarm={() => toggleAlarmDisabled(ev.title, ev.date)}
                  />
                ))}

                {filteredEvents.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                    <span className="text-2xl opacity-40 animate-bounce">✨</span>
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">No announcements active</div>
                    <div className="text-[10px] text-slate-400/70 mt-0.5 font-medium">Try other dates or expand filters</div>
                  </div>
                )}
              </div>
            </div>

            {/* B. Minimized scrolling stock ticker marquee */}
            <Ticker 
              events={filteredEvents} 
              use24Hour={use24Hour}
              isDarkMode={isDarkMode}
            />

            {/* C. Inline theme drawer footer switch toggle */}
            <div className="toggle-wrap select-none">
              <button 
                type="button"
                onClick={() => saveThemePreference(!isDarkMode)} 
                className="toggle shadow-sm"
                title="Toggle Theme"
              >
                <div className="toggle-knob text-xs">
                  {isDarkMode ? '🌙' : '☀️'}
                </div>
              </button>
            </div>

            {/* D. Preset interactive Inline Filter config panel */}
            <FilterPanel 
              isOpen={isFilterOpen}
              activeImpacts={activeImpacts}
              onToggleImpact={(imp) => {
                const next = new Set(activeImpacts);
                if (next.has(imp)) next.delete(imp);
                else next.add(imp);
                setActiveImpacts(next);
              }}
              activeCurrencies={activeCurrencies}
              onToggleCurrency={(cur) => {
                const next = new Set(activeCurrencies);
                if (next.has(cur)) next.delete(cur);
                else next.add(cur);
                setActiveCurrencies(next);
              }}
              soundEnabled={soundEnabled}
              onToggleSoundEnabled={() => setSoundEnabled(prev => !prev)}
              soundIndex={soundIndex}
              onCycleSound={(dir) => {
                setSoundIndex(prev => (prev + dir + SOUND_LIST.length) % SOUND_LIST.length);
              }}
              onPreviewSound={previewSound}
              use24Hour={use24Hour}
              onToggle24Hour={saveTimeFormatPreference}
              showActual={showActual}
              onToggleActual={handleToggleActual}
              showForecast={showForecast}
              onToggleForecast={handleToggleForecast}
              showPrevious={showPrevious}
              onTogglePrevious={handleTogglePrevious}
              onResetAll={handleResetAll}
              onApply={handleApplyFilters}
              onCancel={() => setIsFilterOpen(false)}
              onDeactivateLicense={handleDeactivateLicense}
              isElectron={isElectron}
              launchOnStart={launchOnStart}
              onToggleLaunchOnStart={saveLaunchOnStartPreference}
              windowScale={windowScale}
              onChangeWindowScale={saveWindowScalePreference}
            />

          </>
        )}
        </div>
      </div>

    </div>
  );
}
