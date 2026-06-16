import React, { useState, useEffect } from 'react';

interface LicenseGateProps {
  isDarkMode: boolean;
  onVerifySuccess: () => void;
  onCloseApp?: () => void;
}

export default function LicenseGate({ isDarkMode, onVerifySuccess, onCloseApp }: LicenseGateProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  // Alphanumeric tracking for segments (each must be 8 chars to light up)
  const [seg0, setSeg0] = useState(false);
  const [seg1, setSeg1] = useState(false);
  const [seg2, setSeg2] = useState(false);
  const [seg3, setSeg3] = useState(false);


  const onTypeKey = (val: string) => {
    // strip non-alphanumeric, uppercase, cap at 32 chars
    const v = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 32);
    // group into chunks of 8
    const g = [v.slice(0, 8), v.slice(8, 16), v.slice(16, 24), v.slice(24, 32)].filter(s => s.length > 0);
    const formatted = g.join('-');
    
    setLicenseKey(formatted);
    setStatus({ msg: '', type: '' });

    // Validate segments
    const parts = formatted.split('-');
    setSeg0((parts[0] || '').length === 8);
    setSeg1((parts[1] || '').length === 8);
    setSeg2((parts[2] || '').length === 8);
    setSeg3((parts[3] || '').length === 8);
  };

  const handleActivate = async () => {
    if (isVerifying || showSuccess) return;

    if (licenseKey.length < 35) {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setStatus({ msg: 'Please enter a complete 32-character key.', type: 'err' });
      return;
    }

    setIsVerifying(true);
    setStatus({ msg: '', type: '' });

    try {
      const response = await fetch('/api/license/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: licenseKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus({ msg: 'License verified!', type: 'good' });
        // Save verification to localStorage
        localStorage.setItem('overdesk_license_verified', 'true');
        localStorage.setItem('overdesk_verified_key', licenseKey);
        
        // Show activation success overlay animation
        setTimeout(() => {
          setShowSuccess(true);
        }, 300);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 350);
        setStatus({ msg: data.error || 'Invalid license key. Please check the key.', type: 'err' });
      }
    } catch (err) {
      console.error('License verification failed:', err);
      setStatus({ msg: 'Verification failed. Server is currently unreachable.', type: 'err' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.closeWindow();
    } else if (onCloseApp) {
      onCloseApp();
    } else {
      setStatus({ msg: 'Please enter a valid license key to unlock and enter the application.', type: 'err' });
    }
  };

  return (
    <div id="overdesk-activation-gate" className={isDarkMode ? 'dark' : ''}>
      <style>{`
        #overdesk-activation-gate {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
          transition: background 0.5s ease;
          -webkit-app-region: drag !important;
        }

        #overdesk-activation-gate button,
        #overdesk-activation-gate input,
        #overdesk-activation-gate a,
        #overdesk-activation-gate span,
        #overdesk-activation-gate select,
        #overdesk-activation-gate .win-btn {
          -webkit-app-region: no-drag !important;
        }

        #overdesk-activation-gate.dark {
          background: transparent;
        }

        #overdesk-activation-gate::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 30% 35%, rgba(99, 102, 241, 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 75% 65%, rgba(168, 85, 247, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        #overdesk-activation-gate.dark::before {
          background:
            radial-gradient(ellipse 60% 50% at 30% 35%, rgba(99, 102, 241, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 75% 65%, rgba(168, 85, 247, 0.12) 0%, transparent 70%);
        }

        #overdesk-activation-gate .gate-card-wrapper {
          padding: 20px;
          display: inline-block;
          pointer-events: none;
          background: transparent;
        }

        #overdesk-activation-gate .card {
          pointer-events: auto;
          width: 350px;
          border-radius: 32px;
          background: linear-gradient(150deg, #ffffff 0%, #f0f0ff 25%, #e4eaff 55%, #ede8ff 100%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 8px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
          padding: 16px 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          position: relative;
          transition: background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease;
          -webkit-app-region: drag !important;
        }

        #overdesk-activation-gate.dark .card {
          background: linear-gradient(150deg, #13131c 0%, #111118 25%, #0d0f19 55%, #121021 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 50px rgba(0, 0, 0, 0.61);
        }

        #overdesk-activation-gate .top-bar {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: 6px;
        }

        #overdesk-activation-gate .close-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0,0,0,0.04);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0,0,0,0.3);
          transition: all 0.15s;
        }

        #overdesk-activation-gate.dark .close-btn {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.3);
        }

        #overdesk-activation-gate .close-btn:hover {
          background: rgba(255,50,50,0.12);
          color: rgba(220,38,38,0.9);
        }

        #overdesk-activation-gate .logo-wrap {
          width: 110px;
          height: 110px;
          margin-bottom: 8px;
          flex-shrink: 0;
          animation: floatLogo 3.5s ease-in-out infinite;
          position: relative;
        }

        @keyframes floatLogo {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }

        #overdesk-activation-gate .logo-wrap::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 6px;
          background: radial-gradient(ellipse, rgba(30,100,255,0.25) 0%, transparent 70%);
          filter: blur(2px);
        }

        #overdesk-activation-gate .app-name {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #111;
          margin-bottom: 4px;
          transition: color 0.5s ease;
        }

        #overdesk-activation-gate.dark .app-name {
          color: #f8fafc;
        }

        #overdesk-activation-gate .app-sub {
          font-size: 11px;
          color: rgba(15, 23, 42, 0.6);
          text-align: center;
          line-height: 1.5;
          margin-bottom: 12px;
          transition: color 0.5s ease;
        }

        #overdesk-activation-gate.dark .app-sub {
          color: rgba(203, 213, 225, 0.6);
        }

        #overdesk-activation-gate .divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent);
          margin-bottom: 12px;
        }

        #overdesk-activation-gate.dark .divider {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
        }

        #overdesk-activation-gate .segs {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
        }

        #overdesk-activation-gate .seg {
          width: 48px;
          height: 3px;
          border-radius: 99px;
          background: rgba(0,0,0,0.06);
          transition: background 0.3s, box-shadow 0.3s;
        }

        #overdesk-activation-gate.dark .seg {
          background: rgba(255,255,255,0.06);
        }

        #overdesk-activation-gate .seg.filled {
          background: #6e00d2;
          box-shadow: 0 0 6px 1px rgba(110,0,210,0.3);
        }

        #overdesk-activation-gate.dark .seg.filled {
          background: #818cf8;
          box-shadow: 0 0 8px 1px rgba(129,140,248,0.4);
        }

        #overdesk-activation-gate .inp-label {
          width: 100%;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.4);
          margin-bottom: 4px;
          text-align: left;
          transition: color 0.5s ease;
        }

        #overdesk-activation-gate.dark .inp-label {
          color: rgba(203, 213, 225, 0.4);
        }

        #overdesk-activation-gate .key-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(0,0,0,0.02);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          color: #0f172a;
          font-size: 11px;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
          letter-spacing: 0.06em;
          text-align: center;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, color 0.5s, border-color 0.5s;
          margin-bottom: 6px;
          caret-color: #6e00d2;
        }

        #overdesk-activation-gate.dark .key-input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          caret-color: #818cf8;
        }

        #overdesk-activation-gate .key-input::placeholder {
          color: rgba(0,0,0,0.18);
        }

        #overdesk-activation-gate.dark .key-input::placeholder {
          color: rgba(255, 255, 255, 0.15);
        }

        #overdesk-activation-gate .key-input:focus {
          border-color: rgba(110,0,210,0.45);
          background: rgba(110,0,210,0.01);
          box-shadow: 0 0 0 3px rgba(110,0,210,0.06);
        }

        #overdesk-activation-gate.dark .key-input:focus {
          border-color: rgba(129, 140, 248, 0.45);
          background: rgba(129, 140, 248, 0.01);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
        }

        #overdesk-activation-gate .key-input.shake-err {
          border-color: rgba(220,38,38,0.5);
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
          animation: shake 0.35s ease;
        }

        #overdesk-activation-gate .key-input.ok {
          border-color: rgba(16,185,129,0.5);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(3px); }
        }

        #overdesk-activation-gate .status {
          font-size: 10px;
          font-weight: 600;
          text-align: center;
          min-height: 13px;
          margin-bottom: 6px;
          color: transparent;
          transition: color 0.2s;
        }

        #overdesk-activation-gate .status.err {
          color: rgba(220, 38, 38, 0.85);
        }

        #overdesk-activation-gate .status.good {
          color: rgba(16, 185, 129, 0.9);
        }

        #overdesk-activation-gate .act-btn {
          width: 100%;
          padding: 11px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(30,120,255,0.92), rgba(110,0,210,0.9));
          color: #fff;
          font-size: 13.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
          position: relative;
          overflow: hidden;
          margin-bottom: 10px;
          box-shadow: 0 4px 16px rgba(110,0,210,0.18);
        }

        #overdesk-activation-gate .act-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          pointer-events: none;
        }

        #overdesk-activation-gate .act-btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(110,0,210,0.25);
        }

        #overdesk-activation-gate .act-btn:active {
          transform: translateY(0);
        }

        #overdesk-activation-gate .act-btn.loading {
          opacity: 0.75;
          pointer-events: none;
        }

        #overdesk-activation-gate .act-btn .btxt {
          transition: opacity 0.15s;
        }

        #overdesk-activation-gate .act-btn.loading .btxt {
          opacity: 0;
        }

        #overdesk-activation-gate .spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.15s;
        }

        #overdesk-activation-gate .act-btn.loading .spinner {
          opacity: 1;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        #overdesk-activation-gate .hint {
          font-size: 10px;
          color: rgba(15, 23, 42, 0.4);
          text-align: center;
          line-height: 1.6;
          transition: color 0.5s ease;
        }

        #overdesk-activation-gate.dark .hint {
          color: rgba(203, 213, 225, 0.35);
        }

        #overdesk-activation-gate .hint a {
          color: rgba(110,0,210,0.6);
          text-decoration: none;
          font-weight: 600;
        }

        #overdesk-activation-gate .hint a:hover {
          color: rgba(110,0,210,0.85);
        }

        #overdesk-activation-gate.dark .hint a {
          color: rgba(129, 140, 248, 0.75);
        }

        #overdesk-activation-gate.dark .hint a:hover {
          color: #a5b4fc;
        }

        /* success overlay CSS rules */
        #overdesk-activation-gate .success-overlay {
          position: absolute;
          inset: 0;
          border-radius: 36px;
          background: rgba(255,255,255,0.98);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.35s ease;
          z-index: 10;
        }

        #overdesk-activation-gate.dark .success-overlay {
          background: #0f0f16;
        }

        #overdesk-activation-gate .success-overlay.show {
          opacity: 1;
          pointer-events: all;
        }

        #overdesk-activation-gate .chk {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: rgba(16,185,129,0.08);
          border: 2px solid rgba(16,185,129,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: popIn 0.5s cubic-bezier(0.34,1.6,0.64,1) both;
        }

        #overdesk-activation-gate .chk svg {
          width: 26px;
          height: 26px;
          stroke: rgba(16,185,129,0.9);
          fill: none;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        #overdesk-activation-gate .s-title {
          font-size: 19px;
          font-weight: 800;
          color: #111;
          animation: fadeUp 0.4s 0.1s ease both;
        }

        #overdesk-activation-gate.dark .s-title {
          color: #f8fafc;
        }

        #overdesk-activation-gate .s-sub {
          font-size: 11px;
          color: rgba(15, 23, 42, 0.6);
          text-align: center;
          line-height: 1.6;
          animation: fadeUp 0.4s 0.2s ease both;
        }

        #overdesk-activation-gate.dark .s-sub {
          color: rgba(203, 213, 225, 0.6);
        }

        #overdesk-activation-gate .launch-btn {
          margin-top: 8px;
          padding: 11px 28px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(30,120,255,0.92), rgba(110,0,210,0.9));
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.12s;
          animation: fadeUp 0.4s 0.3s ease both;
          box-shadow: 0 4px 12px rgba(110,0,210,0.2);
        }

        #overdesk-activation-gate .launch-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

      `}</style>

      <div className="gate-card-wrapper">
        <div className="card">
        <div className="top-bar">
          <button className="close-btn" onClick={handleClose} title="Close activation window">
            <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Floating Logo - Responsive brand logo of Overdesk premium calendar */}
        <div className="logo-wrap flex items-center justify-center">
          <img 
            src="https://raw.githubusercontent.com/Bl3551nq/Overdesk-Logos/refs/heads/main/OVERDESK-fx%20calendar.svg" 
            alt="Overdesk FX Logo" 
            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="app-name">Overdesk FX Calendar</div>
        <div className="app-sub">Enter your license key to activate.<br />Find it in your Gumroad receipt email.</div>

        <div className="divider"></div>

        {/* Beautiful step progress indicators */}
        <div className="segs">
          <div className={`seg ${seg0 ? 'filled' : ''}`}></div>
          <div className={`seg ${seg1 ? 'filled' : ''}`}></div>
          <div className={`seg ${seg2 ? 'filled' : ''}`}></div>
          <div className={`seg ${seg3 ? 'filled' : ''}`}></div>
        </div>

        <div className="inp-label">License Key</div>
        <input 
          className={`key-input ${shake ? 'shake-err' : ''}`}
          type="text" 
          placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
          value={licenseKey}
          onChange={(e) => onTypeKey(e.target.value)}
          disabled={isVerifying || showSuccess}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleActivate();
          }}
        />

        <div className={`status ${status.type}`}>
          {status.msg}
        </div>

        <button 
          className={`act-btn ${isVerifying ? 'loading' : ''}`}
          onClick={handleActivate}
          disabled={isVerifying || showSuccess}
        >
          <span className="btxt">Activate License</span>
          <div className="spinner"></div>
        </button>

        <div className="hint" style={{ marginTop: '8px' }}>
          Key is stored locally · One key per device<br />
          Need help? <a href="mailto:overdesk.app@gmail.com">overdesk.app@gmail.com</a>
        </div>

        {/* Absolute overlay of confirmation page requested by user */}
        <div className={`success-overlay ${showSuccess ? 'show' : ''}`}>
          <div className="chk">
            <svg viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="s-title">Activated!</div>
          <div className="s-sub">Your license is confirmed.<br />Overdesk Fx Calendar is ready.</div>
          <button className="launch-btn" onClick={onVerifySuccess}>
            Launch Fx Calendar →
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
