import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Activity, Archive as ArchiveIcon, ArrowDown, ArrowLeft, ArrowRight, Bean as BeanIcon, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Flame, Heart, Home, Info, Leaf, Minus, Moon, MoreHorizontal, Pause, Play, Plus, RotateCcw, Search, Settings, Share, SlidersHorizontal, Sparkles, Star, Sun, Timer as TimerIcon, Trash2, Upload, Wifi, WifiOff, X } from 'lucide-react';
import { api, jsonBody, ApiError } from './lib/api.js';
import { calculateRatio, grindLabel, methodLabel, methods } from './lib/methods.js';
import { useBrewTimer } from './hooks/useBrewTimer.js';
import { profile } from './config/profile.js';
import { getBeanImage, BEAN_IMAGE_PRESETS } from './lib/beanImages.js';

const queryKeys = { beans: ['beans'], brews: ['brews'], stats: ['stats'], methods: ['methods'], archive: ['archive'] };
const fetchData = async path => (await api(path)).data;
const dateLabel = value => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
const shortDate = value => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(value));
const safeNumber = value => value === '' ? '' : Number(value);
const localDateTime = value => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const jsonMutation = (url, method, data) => api(url, { method, body: jsonBody(data) });
const beanErrorIds = {
  name: 'bean-name', origin: 'bean-origin', process: 'bean-process', roastLevel: 'bean-roast',
  altitudeMasl: 'bean-altitude', roastDate: 'bean-roast-date', flavorNotes: 'bean-flavors',
  imageUrl: 'bean-image', notes: 'bean-notes'
};
const beanErrorLabels = {
  name: 'Nama Biji Kopi', origin: 'Asal', process: 'Proses', roastLevel: 'Level sangrai',
  altitudeMasl: 'Ketinggian', roastDate: 'Tanggal sangrai', flavorNotes: 'Catatan rasa',
  imageUrl: 'URL gambar', notes: 'Catatan tambahan'
};
const brewErrorIds = {
  bean: 'brew-bean', method: 'method-field', doseGrams: 'dose', waterGrams: 'water',
  waterTempC: 'temp', grindSize: 'grind', brewTimeSeconds: 'brew-time', tdsPercent: 'tds',
  rating: 'rating-field', cupping: 'cupping-toggle', tasteTags: 'brew-taste',
  notes: 'brew-notes', brewedAt: 'brewed-at'
};
const brewErrorLabels = {
  bean: 'Biji Kopi', method: 'Metode seduh', doseGrams: 'Dosis', waterGrams: 'Jumlah air',
  waterTempC: 'Suhu air', grindSize: 'Ukuran giling', brewTimeSeconds: 'Waktu seduh',
  tdsPercent: 'TDS', rating: 'Rating', cupping: 'Catatan cupping', tasteTags: 'Tag rasa',
  notes: 'Catatan', brewedAt: 'Tanggal dan waktu'
};
const mapFieldErrors = errors => (errors || []).reduce((result, item) => {
  const field = String(item.field || 'form').split('.')[0];
  result[field] = result[field] ? `${result[field]}; ${item.message}` : item.message;
  return result;
}, {});
const focusFirstError = (errors, ids) => {
  const id = Object.keys(errors).map(field => ids[field]).find(Boolean);
  if (!id) return;
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusTarget = target.matches('input, select, textarea, button') ? target : target.querySelector('input, select, textarea, button');
    focusTarget?.focus({ preventScroll: true });
  });
};

function FormErrorSummary({ errors, ids, labels }) {
  const entries = Object.entries(errors).filter(([, message]) => message);
  if (!entries.length) return null;
  return <div className="form-error-summary" role="alert" aria-live="assertive">
    <b>Periksa kolom berikut sebelum menyimpan:</b>
    <ul>{entries.map(([field, message]) => <li key={field}>{ids[field]
      ? <a href={`#${ids[field]}`}>{labels[field] || field}</a>
      : <b>{labels[field] || field}</b>}: {message}</li>)}</ul>
  </div>;
}
function FieldError({ id, error }) { return error ? <small id={id} className="field-error" role="alert">{error}</small> : null; }

const GRINDER_BEANS = [
  { id: 1, left: '5%', size: 22, delay: 0, duration: 760, rot: 190, roast: '#3b2014' },
  { id: 2, left: '12%', size: 18, delay: 60, duration: 710, rot: -220, roast: '#4f2b1b' },
  { id: 3, left: '19%', size: 26, delay: 130, duration: 830, rot: 250, roast: '#2e180d' },
  { id: 4, left: '27%', size: 20, delay: 30, duration: 730, rot: -160, roast: '#5a3420' },
  { id: 5, left: '35%', size: 24, delay: 90, duration: 770, rot: 290, roast: '#3f2316' },
  { id: 6, left: '42%', size: 17, delay: 160, duration: 690, rot: -200, roast: '#4b2817' },
  { id: 7, left: '50%', size: 25, delay: 40, duration: 790, rot: 210, roast: '#331a0e' },
  { id: 8, left: '57%', size: 19, delay: 110, duration: 720, rot: -270, roast: '#58321e' },
  { id: 9, left: '65%', size: 27, delay: 80, duration: 850, rot: 230, roast: '#2c160c' },
  { id: 10, left: '73%', size: 21, delay: 150, duration: 740, rot: -190, roast: '#442517' },
  { id: 11, left: '81%', size: 24, delay: 20, duration: 800, rot: 260, roast: '#3c2115' },
  { id: 12, left: '89%', size: 18, delay: 100, duration: 700, rot: -240, roast: '#522f1c' },
  { id: 13, left: '96%', size: 22, delay: 170, duration: 760, rot: 310, roast: '#32190f' },
  { id: 14, left: '8%', size: 20, delay: 200, duration: 720, rot: -180, roast: '#4a2818' },
  { id: 15, left: '23%', size: 28, delay: 170, duration: 860, rot: 200, roast: '#261208' },
  { id: 16, left: '46%', size: 21, delay: 220, duration: 750, rot: -250, roast: '#5c3521' },
  { id: 17, left: '62%', size: 24, delay: 190, duration: 780, rot: 280, roast: '#381e13' },
  { id: 18, left: '78%', size: 19, delay: 240, duration: 710, rot: -210, roast: '#482717' },
  { id: 19, left: '92%', size: 25, delay: 210, duration: 820, rot: 270, roast: '#341d11' },
  { id: 20, left: '33%', size: 23, delay: 250, duration: 770, rot: -230, roast: '#462719' },
  { id: 21, left: '69%', size: 22, delay: 260, duration: 790, rot: 220, roast: '#2f170d' },
];

function SplashScreen({ onEnter }) {
  const [phase, setPhase] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  const steps = [
    {
      badge: '01 • ASAL & BIJI',
      title: 'Kenali Biji Kopi',
      heading: 'Setiap cangkir',
      emphasis: 'punya cerita.',
      description: 'Temukan karakter Biji Kopi pilihanmu, asal wilayah tanam, hingga profil sangrai terbaik.'
    },
    {
      badge: '02 • SENI SEDUHAN',
      title: 'Nikmati proses seduh',
      heading: 'Presisi dalam',
      emphasis: 'setiap seduhan.',
      description: 'Racik dengan metode seduh favoritmu, kalkulasi rasio otomatis, dan timer interaktif.'
    },
    {
      badge: '03 • JURNAL RASA',
      title: 'Simpan cerita rasanya',
      heading: 'Abadikan jejak',
      emphasis: 'di setiap cangkir.',
      description: 'Catat cupping notes, aroma, keasaman, aftertaste, hingga rating bintang dalam jurnal personalmu.'
    }
  ];

  const nextPhase = () => setPhase(current => (current + 1) % steps.length);

  useEffect(() => {
    if (isPaused || isExiting) return;
    const timer = setInterval(() => {
      setPhase(current => (current + 1) % steps.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [isPaused, isExiting, steps.length]);

  const handleEnter = () => {
    if (isExiting) return;
    setIsExiting(true);
    const exitDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 920;
    window.setTimeout(onEnter, exitDuration);
  };

  const handleTouchStart = e => {
    if (e.targetTouches && e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = e => {
    if (touchStart === null || !e.changedTouches || !e.changedTouches[0]) return;
    const distance = touchStart - e.changedTouches[0].clientX;
    if (distance > 45) {
      setPhase(p => (p + 1) % steps.length);
    } else if (distance < -45) {
      setPhase(p => (p - 1 + steps.length) % steps.length);
    }
    setTouchStart(null);
  };

  const trapFocus = event => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPhase(p => (p + 1) % steps.length);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPhase(p => (p - 1 + steps.length) % steps.length);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleEnter();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div
    className={`splash-screen splash-phase-${phase} ${isExiting ? 'splash-exiting' : ''}`}
    role="dialog"
    aria-modal="true"
    aria-labelledby="splash-title"
    onKeyDown={trapFocus}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    {isExiting && (
      <div className="splash-grinder-cascade" aria-hidden="true">
        {GRINDER_BEANS.map(b => (
          <div
            key={b.id}
            className="grinder-bean-drop"
            style={{
              left: b.left,
              '--fall-dur': `${b.duration}ms`,
              '--fall-delay': `${b.delay}ms`,
              '--fall-rot': `${b.rot}deg`,
            }}
          >
            <svg viewBox="0 0 24 30" width={b.size} height={Math.round(b.size * 1.25)}>
              <path d="M12 2C6.5 2 2 7.8 2 15s4.5 13 10 13 10-5.8 10-13S17.5 2 12 2z" fill={b.roast} />
              <path d="M12 5.5c-2.2 4.5 1.8 9.5 0 14s-1.8 5 0 5" stroke="#180b05" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
              <path d="M6 9c1-3 4-4.5 6-4.5" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        ))}
      </div>
    )}
    <div className="splash-shell">
      <header className="splash-top">
        <div className="splash-brand-wrap">
          <span className="splash-brand">SeduhLog</span>
        </div>
        <button className="splash-skip" type="button" onClick={handleEnter}>Lewati</button>
      </header>
      <main className="splash-main">
        <div
          className="splash-visual"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="splash-halo"/>
          <div className="splash-steam" aria-hidden="true">
            <span className="splash-steam-wave steam-1"/>
            <span className="splash-steam-wave steam-2"/>
            <span className="splash-steam-wave steam-3"/>
          </div>
          <div className="splash-orbit splash-orbit-one">
            {phase === 0 ? <BeanIcon size={20}/> : phase === 1 ? <Flame size={20}/> : <Star size={20}/>}
          </div>
          <div className="splash-orbit splash-orbit-two"><Sparkles size={16}/></div>
          <span className="splash-pour-stream"/>
          <span className="splash-pour-drop"/>
          <button
            className="splash-cup"
            type="button"
            onClick={nextPhase}
            aria-label={`Tahap ${phase + 1}: ${steps[phase].title}. Sentuh untuk tahap berikutnya`}
          >
            <svg className="splash-cup-art" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="70" cy="116" rx="52" ry="11" className="splash-art-saucer-shadow" />
              <ellipse cx="70" cy="113" rx="46" ry="9" className="splash-art-saucer" />
              <ellipse cx="70" cy="112" rx="32" ry="5.5" className="splash-art-saucer-inner" />
              <path d="M38 52 C38 90 48 106 70 106 C92 106 102 90 102 52 Z" className="splash-art-cup" />
              <path d="M100 58 C116 58 122 72 120 84 C118 94 108 96 98 94" className="splash-art-handle" />
              <path d="M100 64 C111 64 115 73 113 81 C112 88 105 89 98 88" className="splash-art-handle-inner" />
              <ellipse cx="70" cy="52" rx="32" ry="8" className="splash-art-rim" />
              <ellipse cx="70" cy="53" rx="28" ry="6.5" className="splash-art-coffee" />
              <path d="M64 51 C64 49 67 48 70 51 C73 48 76 49 76 51 C76 54 70 56 70 56 C70 56 64 54 64 51 Z" className="splash-art-crema" />
            </svg>
          </button>
        </div>
        <section
          className="splash-message"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <span className="splash-step-badge">{steps[phase].badge}</span>
          <h1 id="splash-title">{steps[phase].heading}<br/><em>{steps[phase].emphasis}</em></h1>
          <p className="splash-description" aria-live="polite">{steps[phase].description}</p>
          <div className="splash-progress" aria-label={`Tahap ${phase + 1} dari ${steps.length}`}>
            <div className="splash-progress-dots">{steps.map((step, index) =>
              <button
                key={step.title}
                type="button"
                aria-label={`Slide ${index + 1} dari ${steps.length}`}
                aria-current={index === phase ? 'step' : undefined}
                onClick={() => setPhase(index)}
                className={index === phase ? 'active' : ''}
              />
            )}</div>
          </div>
          <div className="splash-actions">
            <button
              className="button splash-enter"
              type="button"
              onClick={phase === steps.length - 1 ? handleEnter : nextPhase}
              autoFocus
            >
              {phase === steps.length - 1 ? (
                <>Mulai Menyeduh <ArrowRight size={17}/></>
              ) : (
                <>Lanjut <ArrowRight size={17}/></>
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>;
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function AppLayout({ toast, setToast, theme, setTheme }) {
  const location = useLocation();
  const online = useOnline();
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [iosInstall, setIosInstall] = useState(false);
  const [installBanner, setInstallBanner] = useState(!localStorage.getItem('seduhlog-install-dismissed'));
  const queryClient = useQueryClient();
  const isForm = /\/(new|edit)$/.test(location.pathname);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const showInstallBanner = !isForm && !isStandalone && installPrompt && installBanner && location.pathname === '/';
  const notify = (message, type = 'success') => setToast({ message, type });
  useEffect(() => {
    fetchData('/health').catch(() => {});
    const onPrompt = event => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const install = async () => {
    if (isStandalone) {
      notify('SeduhLog sudah terpasang di layar utama.');
      return;
    }
    if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); return; }
    if (isIos) { setIosInstall(true); return; }
    notify('Gunakan menu browser untuk menambahkan SeduhLog ke layar utama.', 'error');
  };
  const dismissBanner = () => { localStorage.setItem('seduhlog-install-dismissed', '1'); setInstallBanner(false); };
  const context = { toast: notify, install, installPrompt, isStandalone, isIos, online, theme, setTheme };

  return <div className={`app-shell ${showInstallBanner ? 'has-install-banner' : ''}`}>
    {!online && <div className="network-banner"><WifiOff size={15} /> Mode offline · Timer dan kalkulator tetap tersedia</div>}
    {needRefresh[0] && <button className="update-banner" onClick={() => updateServiceWorker(true)}>Versi baru tersedia, Muat ulang <ArrowRight size={16} /></button>}
    <div className="page-frame"><Outlet context={context} /></div>
    {!isForm && <BottomNav />}
    {!isForm && <QuickAddFab />}
    {showInstallBanner && <div className="install-banner"><span><Coffee size={18} /> Pasang SeduhLog di perangkatmu</span><button onClick={install}>Pasang</button><button aria-label="Tutup" onClick={dismissBanner}><X size={16}/></button></div>}
    {iosInstall && !isStandalone && <InstallSheet onClose={() => setIosInstall(false)} />}
    {toast.message && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} role="status">{toast.type === 'error' ? <CircleHelp size={18}/> : <Check size={18}/>} {toast.message}<button aria-label="Tutup notifikasi" onClick={() => setToast({message:'',type:'success'})}><X size={16}/></button></div>}
    <button className="sr-only" onClick={() => queryClient.clear()}>Bersihkan cache</button>
  </div>;
}

function LiquidGlassFilter({ id = 'lg-filter-main' }) {
  return (
    <svg style={{position:'absolute',width:0,height:0,pointerEvents:'none'}} aria-hidden="true">
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65 0.65" numOctaves="3" seed="2" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" result="dispRed"/>
          <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" result="dispGreen"/>
          <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" result="dispBlue"/>
          <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
          <feBlend in="red" in2="green" mode="screen" result="rg"/>
          <feBlend in="rg" in2="blue" mode="screen" result="output"/>
          <feGaussianBlur in="output" stdDeviation="1.2"/>
        </filter>
      </defs>
    </svg>
  );
}

function BottomNav() {
  const tabs = [
    { to: '/', label: 'Beranda', icon: Home, end: true },
    { to: '/brews', label: 'Seduhan', icon: BookOpen },
    { to: '/beans', label: 'Biji Kopi', icon: BeanIcon },
    { to: '/timer', label: 'Timer', icon: TimerIcon },
    { to: '/profile', label: 'Profil', icon: MoreHorizontal }
  ];
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      <LiquidGlassFilter id="lg-nav"/>
      {tabs.map(({to,label,icon:Icon,end}) =>
        <NavLink key={to} to={to} end={end} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} aria-label={label}>
          {({isActive}) => <><Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}/><span>{label}</span></>}
        </NavLink>
      )}
    </nav>
  );
}

function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('seduhlog-quick-add-position');
    if (!saved) return null;
    const [x, y] = saved.split(',').map(Number);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  });
  const [popoverPosition, setPopoverPosition] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);

  const clampPosition = ({ x, y }) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - 60)),
    y: Math.max(8, Math.min(y, window.innerHeight - 60))
  });

  useEffect(() => {
    const keepOnScreen = () => {
      setPosition(current => current ? clampPosition(current) : null);
      setOpen(false);
    };
    window.addEventListener('resize', keepOnScreen);
    return () => window.removeEventListener('resize', keepOnScreen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const startDrag = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position || { x: rect.left, y: rect.top },
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = event => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
    drag.moved = true;
    draggedRef.current = true;
    setOpen(false);
    setPosition(clampPosition({ x: drag.origin.x + deltaX, y: drag.origin.y + deltaY }));
  };

  const finishDrag = event => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      const position = clampPosition({
        x: drag.origin.x + event.clientX - drag.startX,
        y: drag.origin.y + event.clientY - drag.startY
      });
      setPosition(position);
      localStorage.setItem('seduhlog-quick-add-position', `${position.x},${position.y}`);
    }
    dragRef.current = null;
  };

  const cancelDrag = () => {
    dragRef.current = null;
    draggedRef.current = false;
  };

  const togglePopover = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.left + (rect.width - width) / 2, window.innerWidth - width - 16));
    const openAbove = window.innerHeight - rect.bottom < 184 && rect.top > 184;
    setPopoverPosition({
      left,
      top: openAbove ? 'auto' : rect.bottom + 12,
      bottom: openAbove ? window.innerHeight - rect.top + 12 : 'auto'
    });
    setOpen(true);
  };

  return (
    <div className="quick-add" ref={menuRef} style={position ? {left: position.x, top: position.y, right: 'auto', bottom: 'auto'} : undefined}>
      {open && (
        <div className="quick-add-popover" id="quick-add-popover" role="group" aria-labelledby="quick-add-title" style={popoverPosition}>
          <span className="quick-add-heading" id="quick-add-title">BUAT CATATAN</span>
          <Link className="quick-add-option" to="/brews/new" onClick={() => setOpen(false)}>
            <span className="quick-add-option-icon"><Coffee size={18}/></span>
            <span className="quick-add-option-copy"><b>Tambah Seduhan</b><small>Catat resep dan rasa</small></span>
            <ChevronRight size={17}/>
          </Link>
          <Link className="quick-add-option" to="/beans/new" onClick={() => setOpen(false)}>
            <span className="quick-add-option-icon"><BeanIcon size={18}/></span>
            <span className="quick-add-option-copy"><b>Tambah Biji Kopi</b><small>Lengkapi koleksi kopimu</small></span>
            <ChevronRight size={17}/>
          </Link>
        </div>
      )}
      <button
        className={`fab ${open ? 'is-open' : ''}`}
        type="button"
        ref={buttonRef}
        aria-label={open ? 'Tutup pilihan tambah' : 'Buka pilihan tambah'}
        aria-describedby="quick-add-drag-hint"
        aria-expanded={open}
        aria-controls={open ? 'quick-add-popover' : undefined}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onClick={togglePopover}
      >
        <Plus size={24} strokeWidth={2.2}/>
      </button>
      <span className="sr-only" id="quick-add-drag-hint">Tekan dan seret untuk memindahkan tombol.</span>
    </div>
  );
}

function PageHeader({ title, back, eyebrow, action }) {
  const navigate = useNavigate();
  return <header className="page-header">{back && <button className="icon-button back-button" aria-label="Kembali" onClick={() => navigate(-1)}><ArrowLeft size={21}/></button>}<div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>{action}</header>;
}

function Card({ children, className = '', onClick, ...props }) {
  return <section className={`card ${className}`} onClick={onClick} {...props}>{children}</section>;
}
function Badge({ children, tone = 'default' }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
function Chip({ children, onClick, selected = false }) { return <button type="button" className={`chip ${selected ? 'selected' : ''}`} onClick={onClick}>{children}</button>; }
function Stars({ value = 0 }) { return <span className="stars" aria-label={`Rating ${value} dari 5`}>{[1,2,3,4,5].map(i => <Star key={i} size={15} fill={i <= value ? 'currentColor' : 'none'} />)}</span>; }
function Loading({ rows = 3 }) { return <div className="skeleton-list" aria-label="Memuat data">{Array.from({length:rows},(_,i)=><div className="skeleton-card" key={i}><i/><span><b/><b/></span></div>)}</div>; }
function DataState({ query, children, empty = 'Belum ada data.' }) {
  const [slowRequest,setSlowRequest]=useState(false);
  useEffect(()=>{
    if(!query.isPending){setSlowRequest(false);return undefined;}
    const timeout=setTimeout(()=>setSlowRequest(true),6000);
    return()=>clearTimeout(timeout);
  },[query.isPending]);
  if (query.isPending) return <>{<Loading/>}{slowRequest&&<p className="slow-request">Server sedang bangun, mohon tunggu sebentar...</p>}</>;
  if (query.isError) return <div className="state-box"><CircleHelp/><p>{query.error.message || 'Data gagal dimuat.'}</p><button className="button button-outline" onClick={() => query.refetch()}>Coba lagi</button></div>;
  if (!children) return <div className="state-box"><Coffee/><p>{empty}</p></div>;
  return children;
}
function EmptyState({ title, description, to, action = 'Mulai mencatat' }) {
  return <div className="empty-hero"><div className="empty-art"><Coffee size={40}/><Sparkles size={20}/></div><h2>{title}</h2><p>{description}</p>{to && <Link className="button button-primary" to={to}><Plus size={18}/>{action}</Link>}</div>;
}
function BeanThumb({ bean, small = false }) {
  const imageUrl = getBeanImage(bean);
  const [imgError, setImgError] = useState(false);
  return imageUrl && !imgError
    ? <img className={`bean-thumb ${small ? 'small' : ''}`} src={imageUrl} alt={bean?.name || 'Biji kopi'} loading="lazy" onError={() => setImgError(true)}/>
    : <div className={`bean-thumb bean-placeholder ${small ? 'small' : ''}`} aria-label={bean?.name || 'Biji kopi'}>{(bean?.name || 'S').slice(0,1).toUpperCase()}</div>;
}

function AppHome() {
  const { install, installPrompt } = useOutletContext();
  const stats = useQuery({ queryKey: queryKeys.stats, queryFn: () => fetchData('/stats') });
  const brews = useQuery({ queryKey: [...queryKeys.brews, 'recent'], queryFn: () => fetchData('/brews?limit=3') });
  const value = stats.data || {};
  const method = methodLabel(value.favoriteMethod);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return <main className="home-dashboard">
    <header className="dashboard-topbar">
      <Link to="/" className="dashboard-wordmark" aria-label="SeduhLog, beranda"><span><Coffee size={19}/></span><b>SeduhLog</b></Link>
      <div className="dashboard-date"><span className="live-dot"/> {today}</div>
      <span className="dashboard-edition">JURNAL RASA · VOL. 01</span>
    </header>

    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy">
        <div className="hero-kicker"><span>01</span><span>RITUAL SEDUH HARI INI</span></div>
        <h1 id="home-title">{greeting},<br/><em>seduh sesuatu.</em></h1>
        <p>Racik pelan-pelan. Simpan resep, rasa, dan cerita di balik cangkir favoritmu.</p>
        <Link to="/timer" className="hero-start"><span><TimerIcon size={18}/></span> Mulai seduh <ArrowRight size={17}/></Link>
        <div className="hero-footnote"><span>CATAT · RACIK · RASAKAN</span><span>01 — 08</span></div>
      </div>
      <figure className="home-hero-photo">
        <img src="/images/ritual-seduh.png" alt="Seduhan kopi filter di atas meja, ditemani buku catatan rasa" />
        <figcaption><span>RITUAL PAGI</span><span>SEBUAH JURNAL, SATU CANGKIR</span></figcaption>
        <span className="photo-stamp" aria-hidden="true">BREW<br/>SLOW</span>
      </figure>
    </section>

    <div className="dashboard-section-label"><span>CATATAN PERJALANAN</span><span className="section-rule"/><span>01 / 03</span></div>
    <DataState query={stats}>{Number(value.totalBrews || 0) === 0 ? <>
      <section className="first-brew-card" aria-labelledby="first-brew-title">
        <div className="first-brew-copy"><span className="first-brew-index">MULAI DARI SINI</span><h2 id="first-brew-title">Halaman ini menunggu cerita pertamamu.</h2><p>Tambahkan biji kopi yang sedang kamu pakai, lalu mulai catat karakter seduhannya.</p><Link to="/beans/new" className="first-brew-link">Tambah biji kopi <ArrowRight size={16}/></Link></div>
        <div className="first-brew-steps" aria-label="Tiga langkah memulai">
          <div><span>01</span><b>Pilih biji</b><BeanIcon size={17}/></div>
          <div><span>02</span><b>Atur racikan</b><SlidersHorizontal size={17}/></div>
          <div><span>03</span><b>Catat rasanya</b><BookOpen size={17}/></div>
        </div>
      </section>
      <div className="home-shortcuts">
        <Link to="/beans" className="home-shortcut"><span><BeanIcon size={17}/></span><span><b>Jelajahi koleksi biji</b><small>Kenali asal dan prosesnya</small></span><ArrowRight size={16}/></Link>
        <Link to="/timer" className="home-shortcut"><span><TimerIcon size={17}/></span><span><b>Buka timer seduh</b><small>Panduan untuk ritualmu</small></span><ArrowRight size={16}/></Link>
      </div>
    </> : <>
      <section className="stats-grid" aria-label="Ringkasan jurnal">
        <StatCard label="Cangkir tercatat" value={value.totalBrews} icon={Coffee}/>
        <StatCard label="Rasa rata-rata" value={value.avgRating ? `${value.avgRating} / 5` : '—'} icon={Star}/>
        <StatCard label="Metode andalan" value={method} icon={Flame}/>
        <StatCard label="Biji paling sering" value={value.topBean?.name || '—'} icon={BeanIcon} detail={value.topBean ? `${value.topBean.count} kali diseduh` : ''}/>
      </section>
      <div className="dashboard-columns">
        <Card className="chart-card dashboard-chart"><div className="section-title"><div><div className="eyebrow">RITME MINGGUAN</div><h2>Setiap cangkir meninggalkan jejak.</h2></div><span className="trend-label"><Activity size={14}/> 8 minggu</span></div><BarChart data={value.brewsPerWeek || []}/><div className="chart-note"><span className="chart-note-dot"/> Jumlah seduhanmu dalam delapan minggu terakhir</div></Card>
        <aside className="dashboard-side-stack" aria-label="Jelajahi jurnal">
          <section className="favorite-bean-card"><div className="eyebrow">BIJI YANG PALING SERING</div><div className="favorite-bean-content"><BeanThumb bean={value.topBean}/><div><h2>{value.topBean?.name || 'Belum ada pilihan'}</h2><p>{value.topBean ? `${value.topBean.count} cangkir jadi saksi` : 'Mulai catat biji favoritmu'}</p></div></div><Link to="/beans" className="favorite-bean-link">Lihat koleksi <ArrowRight size={15}/></Link></section>
          <Link to="/timer" className="quick-brew-card"><span className="quick-brew-mark"><TimerIcon size={21}/></span><span><small>WAKTUNYA MENYEDUH</small><b>Siapkan cangkir berikutnya</b></span><ArrowRight size={17}/></Link>
        </aside>
      </div>
      <section className="recent-section" aria-labelledby="recent-title"><div className="recent-section-head"><div><div className="eyebrow">DARI JURNALMU</div><h2 id="recent-title">Seduhan terbaru</h2></div><Link to="/brews" className="text-link">Buka semua <ArrowRight size={15}/></Link></div><div className="recent-brews-list"><DataState query={brews}>{brews.data?.length ? brews.data.map(item => <BrewCard key={item.id} brew={item} compact/>) : <div className="empty-inline">Belum ada seduhan tercatat.</div>}</DataState></div></section>
    </>}</DataState>
    {installPrompt && <button className="install-inline" onClick={install}><Upload size={16}/> Pasang aplikasi SeduhLog</button>}
    <footer className="home-footer"><span>DISUSUN DENGAN SABAR</span><span>Diseduh dengan sabar, dicatat dengan rasa.</span><span>SEDUHLOG · {new Date().getFullYear()}</span></footer>
  </main>;
}
function StatCard({ label, value, icon: Icon, detail }) {
  return <Card className="stat-card">{Icon&&<div className="stat-icon"><Icon size={17}/></div>}<div className="stat-label">{label}</div><div className="stat-value">{value}</div>{detail && <div className="stat-detail">{detail}</div>}</Card>;
}
function BarChart({ data }) {
  const max = Math.max(1, ...data.map(item => item.count));
  return <div className="bar-chart" role="img" aria-label="Grafik seduhan per minggu">{data.map(item => <div className="bar-column" key={item.weekStart}><span>{item.count || ''}</span><div className="bar-track"><i style={{height:`${Math.max(item.count ? 10 : 4, item.count/max*100)}%`}}/></div><small>{new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(new Date(`${item.weekStart}T12:00:00`))}</small></div>)}</div>;
}
function BrewCard({ brew, compact = false }) {
  const queryClient=useQueryClient();
  const {toast}=useOutletContext();
  const favorite=useMutation({
    mutationFn:()=>api(`/brews/${brew.id}/favorite`,{method:'PATCH'}),
    onMutate:async()=>{
      await queryClient.cancelQueries({queryKey:queryKeys.brews});
      const previous=queryClient.getQueriesData({queryKey:queryKeys.brews});
      queryClient.setQueriesData({queryKey:queryKeys.brews},current=>{
        if(Array.isArray(current))return current.map(item=>item.id===brew.id?{...item,isFavorite:!item.isFavorite}:item);
        if(current?.id===brew.id)return {...current,isFavorite:!current.isFavorite};
        if(current?.pages)return {...current,pages:current.pages.map(page=>({...page,data:page.data.map(item=>item.id===brew.id?{...item,isFavorite:!item.isFavorite}:item)}))};
        return current;
      });
      return {previous};
    },
    onError:(error,_,context)=>{context?.previous?.forEach(([key,value])=>queryClient.setQueryData(key,value));toast(error.message,'error');},
    onSettled:()=>{queryClient.invalidateQueries({queryKey:queryKeys.brews});queryClient.invalidateQueries({queryKey:queryKeys.stats});}
  });
  return <Link to={`/brews/${brew.id}`} className={`brew-card card ${compact ? 'compact' : ''}`}>
    <div className="brew-coffee-icon"><Coffee size={19}/></div><div className="brew-card-main"><div className="brew-card-title"><b>{brew.bean?.name || 'Biji kopi'}</b><button type="button" className={`heart-static ${brew.isFavorite?'is-favorite':''}`} aria-label={brew.isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'} onClick={event=>{event.preventDefault();event.stopPropagation();favorite.mutate();}}>{brew.isFavorite?<Heart size={16} fill="currentColor"/>:<Heart size={16}/>}</button></div><div className="brew-card-meta"><Badge>{methodLabel(brew.method)}</Badge><span>1:{Number(brew.ratio || brew.waterGrams / brew.doseGrams).toFixed(1)}</span><span className="meta-dot">·</span><span>{shortDate(brew.brewedAt)}</span></div>{!compact && <div className="brew-card-foot"><Stars value={brew.rating}/>{brew.cuppingAverage && <span className="cupping-tag">Cupping {brew.cuppingAverage}</span>}</div>}</div><ChevronRight className="row-chevron" size={18}/></Link>;
}

function BrewList() {
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [sort, setSort] = useState('newest');
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.brews, 'list', search, method, favorite, sort],
    queryFn: ({ pageParam = 1 }) => api(`/brews?page=${pageParam}&limit=10&sort=${sort}${search ? `&q=${encodeURIComponent(search)}` : ''}${method ? `&method=${method}` : ''}${favorite ? '&favorite=true' : ''}`),
    initialPageParam: 1, getNextPageParam: last => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
  });
  const items = query.data?.pages.flatMap(page => page.data) || [];
  return <main><PageHeader title="Jurnal seduhan" eyebrow="RACIKAN & RASA"/>
    <label className="search-box"><Search size={18}/><input aria-label="Cari seduhan" placeholder="Cari catatan atau rasa..." value={search} onChange={event => setSearch(event.target.value)}/>{search && <button aria-label="Hapus pencarian" onClick={() => setSearch('')}><X size={16}/></button>}</label>
    <div className="filter-row">{methods.map(item => <Chip key={item.method} selected={method === item.method} onClick={() => setMethod(method === item.method ? '' : item.method)}>{item.label}</Chip>)}</div>
    <div className="list-tools"><button className={`favorite-filter ${favorite ? 'selected' : ''}`} onClick={() => setFavorite(!favorite)}><Heart size={16} fill={favorite ? 'currentColor' : 'none'}/> Favorit</button><select aria-label="Urutkan seduhan" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="rating">Rating tertinggi</option></select></div>
    <DataState query={query} empty="Belum ada seduhan yang cocok.">{items.length ? <div className="stack">{items.map(item => <BrewCard key={item.id} brew={item}/>)}</div> : null}</DataState>
    {query.hasNextPage && <button className="button button-outline load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Memuat...' : 'Muat lebih banyak'}<ArrowDown size={16}/></button>}
  </main>;
}

function BeanList() {
  const [search, setSearch] = useState('');
  const [process, setProcess] = useState('');
  const [roast, setRoast] = useState('');
  const [sort, setSort] = useState('newest');
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.beans, 'list', search, process, roast, sort],
    queryFn: ({ pageParam = 1 }) => api(`/beans?page=${pageParam}&limit=10&sort=${sort}${search ? `&q=${encodeURIComponent(search)}` : ''}${process ? `&process=${process}` : ''}${roast ? `&roastLevel=${roast}` : ''}`),
    initialPageParam: 1, getNextPageParam: last => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
  });
  const items = query.data?.pages.flatMap(page => page.data) || [];
  return <main><PageHeader title="Koleksi Biji Kopi" eyebrow="ASAL & KARAKTER"/>
    <label className="search-box"><Search size={18}/><input aria-label="Cari Biji Kopi" placeholder="Nama, asal, atau roaster..." value={search} onChange={event => setSearch(event.target.value)}/></label>
    <div className="filter-row">{[['washed','Washed'],['natural','Natural'],['honey','Honey'],['anaerobic','Anaerobic']].map(([value,label])=><Chip key={value} selected={process===value} onClick={()=>setProcess(process===value?'':value)}>{label}</Chip>)}</div>
    <div className="filter-row compact-filter">{[['light','Light'],['medium','Medium'],['dark','Dark']].map(([value,label])=><Chip key={value} selected={roast===value} onClick={()=>setRoast(roast===value?'':value)}>{label} roast</Chip>)}</div>
    <div className="list-tools"><span className="list-count"><Leaf size={15}/> Pilihan dari rakmu</span><select aria-label="Urutkan Biji Kopi" value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Terbaru</option><option value="name">Nama A–Z</option></select></div>
    <DataState query={query} empty="Belum ada Biji Kopi yang cocok.">{items.length ? <div className="stack">{items.map(bean => <Link to={`/beans/${bean.id}`} className="bean-card card" key={bean.id}><BeanThumb bean={bean}/><div className="bean-card-body"><b>{bean.name}</b><span>{bean.origin}</span><div className="bean-badges"><Badge>{bean.process}</Badge><Badge tone="warm">{bean.roastLevel}</Badge></div><div className="flavor-row">{(bean.flavorNotes||[]).slice(0,3).map(note=><span key={note}>{note}</span>)}{bean.flavorNotes?.length>3&&<span>+{bean.flavorNotes.length-3}</span>}</div></div><div className="bean-count">{bean.brewCount || 0}<small>seduhan</small></div><ChevronRight className="row-chevron" size={17}/></Link>)}</div> : null}</DataState>
    {query.hasNextPage && <button className="button button-outline load-more" onClick={()=>query.fetchNextPage()}>Muat lebih banyak <ArrowDown size={16}/></button>}
  </main>;
}

function ConfirmDialog({ title, description, onConfirm, onCancel, pending, confirmLabel = 'Arsipkan', pendingLabel = 'Memproses...', permanent = false }) {
  return <div className="modal-backdrop" role="presentation"><section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title"><div className={`dialog-icon ${permanent ? '' : 'dialog-icon-archive'}`}>{permanent?<Trash2/>:<ArchiveIcon/>}</div><h2 id="dialog-title">{title}</h2><p>{description}</p><div className="dialog-actions"><button className="button button-outline" onClick={onCancel}>Batal</button><button className={`button ${permanent?'button-danger':'button-primary'}`} onClick={onConfirm} disabled={pending}>{pending?pendingLabel:confirmLabel}</button></div></section></div>;
}

function ArchivePage() {
  const [type, setType] = useState('beans');
  const [confirm, setConfirm] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useOutletContext();
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.archive, type],
    queryFn: ({ pageParam = 1 }) => api(`/archive/${type}?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: last => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
  });
  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.archive });
    queryClient.invalidateQueries({ queryKey: queryKeys.beans });
    queryClient.invalidateQueries({ queryKey: queryKeys.brews });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };
  const restore = useMutation({
    mutationFn: ({ itemType, id }) => api(`/archive/${itemType}/${id}/restore`, { method: 'PATCH' }),
    onSuccess: result => { invalidateData(); toast(result.message || 'Data berhasil dipulihkan'); },
    onError: error => toast(error.message, 'error')
  });
  const purge = useMutation({
    mutationFn: ({ itemType, id }) => api(`/archive/${itemType}/${id}`, { method: 'DELETE' }),
    onSuccess: result => { invalidateData(); setConfirm(null); toast(result.message || 'Data dihapus permanen'); },
    onError: error => toast(error.message, 'error')
  });
  const items = query.data?.pages.flatMap(page => page.data) || [];
  const openPurge = item => setConfirm({
    itemType: type,
    id: item.id,
    title: type === 'beans' ? 'Hapus Biji Kopi permanen?' : 'Hapus Seduhan permanen?',
    description: type === 'beans'
      ? `Biji Kopi “${item.name}” dan ${item.brewCount} Seduhan terkait akan dihapus permanen dari data bersama untuk semua pengguna. Tindakan ini tidak dapat dibatalkan.`
      : `Seduhan “${item.bean?.name || 'tanpa nama'}” (${methodLabel(item.method)}) akan dihapus permanen dari data bersama untuk semua pengguna. Tindakan ini tidak dapat dibatalkan.`
  });
  return <main><PageHeader title="Arsip" back eyebrow="DATA YANG DISIMPAN"/>
    <p className="archive-intro">Data saat ini digunakan bersama tanpa login. Pengarsipan atau penghapusan permanen akan memengaruhi semua pengguna. Pulihkan data kapan saja.</p>
    <div className="segmented archive-tabs" role="tablist" aria-label="Jenis data arsip">
      <button role="tab" aria-selected={type === 'beans'} className={type === 'beans' ? 'active' : ''} onClick={() => setType('beans')}><BeanIcon size={16}/> Biji Kopi</button>
      <button role="tab" aria-selected={type === 'brews'} className={type === 'brews' ? 'active' : ''} onClick={() => setType('brews')}><BookOpen size={16}/> Seduhan</button>
    </div>
    <DataState query={query} empty={`Belum ada ${type === 'beans' ? 'Biji Kopi' : 'Seduhan'} di Arsip.`}>
      {items.length ? <div className="stack archive-list">{items.map(item => <Card className="archive-card" key={item.id}>
        <div className="archive-item">
          {type === 'beans' ? <BeanThumb bean={item} small/> : <span className="archive-item-icon"><Coffee size={18}/></span>}
          <div className="archive-item-main">
            <b>{type === 'beans' ? item.name : item.bean?.name || 'Biji Kopi tidak tersedia'}</b>
            <span>{type === 'beans' ? item.origin : `${methodLabel(item.method)} · ${dateLabel(item.brewedAt)}`}</span>
            <small>Diarsipkan {dateLabel(item.archivedAt)}{type === 'beans' ? ` · ${item.brewCount} Seduhan terkait` : ''}</small>
          </div>
        </div>
        <div className="archive-actions">
          <button className="button button-outline button-small" disabled={restore.isPending || purge.isPending} onClick={() => restore.mutate({ itemType: type, id: item.id })}><RotateCcw size={14}/> Pulihkan</button>
          <button className="button button-danger-soft button-small" disabled={restore.isPending || purge.isPending} onClick={() => openPurge(item)}><Trash2 size={14}/> Hapus permanen</button>
        </div>
      </Card>)}</div> : null}
    </DataState>
    {query.hasNextPage && <button className="button button-outline load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Memuat...' : 'Muat lebih banyak'}<ArrowDown size={16}/></button>}
    {confirm && <ConfirmDialog title={confirm.title} description={confirm.description} onCancel={() => setConfirm(null)} onConfirm={() => purge.mutate(confirm)} pending={purge.isPending} confirmLabel="Hapus permanen" pendingLabel="Menghapus..." permanent/>}
  </main>;
}

function BrewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useOutletContext();
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({ queryKey: [...queryKeys.brews, id], queryFn: () => fetchData(`/brews/${id}`) });
  const remove = useMutation({ mutationFn: () => api(`/brews/${id}`, {method:'DELETE'}), onSuccess: () => { queryClient.invalidateQueries({queryKey:queryKeys.brews}); queryClient.invalidateQueries({queryKey:queryKeys.beans}); queryClient.invalidateQueries({queryKey:queryKeys.stats}); queryClient.invalidateQueries({queryKey:queryKeys.archive}); toast('Seduhan dipindahkan ke Arsip'); navigate('/brews'); }, onError: error => toast(error.message,'error') });
  const favorite = useMutation({
    mutationFn: () => api(`/brews/${id}/favorite`, {method:'PATCH'}),
    onMutate: async () => { await queryClient.cancelQueries({queryKey:[...queryKeys.brews,id]}); const previous=queryClient.getQueryData([...queryKeys.brews,id]); queryClient.setQueryData([...queryKeys.brews,id],current=>current?{...current,isFavorite:!current.isFavorite}:current); return {previous}; },
    onError: (error,_,context) => { if(context?.previous) queryClient.setQueryData([...queryKeys.brews,id],context.previous); toast(error.message,'error'); },
    onSettled: () => { queryClient.invalidateQueries({queryKey:queryKeys.brews}); queryClient.invalidateQueries({queryKey:[...queryKeys.brews,id]}); }
  });
  const brew = query.data;
  return <main><PageHeader title="Catatan seduhan" back/><DataState query={query}>{brew && <div className="detail-enter">
    <Card className="detail-hero"><div className="detail-icon"><Coffee size={25}/></div><div className="eyebrow">{methodLabel(brew.method)} · {dateLabel(brew.brewedAt)}</div><h2>{brew.bean?.name}</h2><p>{brew.bean?.origin}</p><div className="detail-rating"><Stars value={brew.rating}/><b>{brew.rating}.0</b><button className={`heart-button ${brew.isFavorite?'liked':''}`} aria-label={brew.isFavorite?'Hapus dari favorit':'Tambahkan ke favorit'} onClick={()=>favorite.mutate()}><Heart size={19} fill={brew.isFavorite?'currentColor':'none'}/></button></div></Card>
    <div className="detail-section-title"><h2>Parameter seduh</h2><Badge tone="warm">1:{Number(brew.ratio).toFixed(1)}</Badge></div>
    <Card className="parameter-grid"><Param label="Dosis" value={`${brew.doseGrams} g`}/><Param label="Air" value={`${brew.waterGrams} g`}/><Param label="Suhu" value={brew.waterTempC ? `${brew.waterTempC}°C`:'—'}/><Param label="Grind" value={grindLabel(brew.grindSize)}/><Param label="Penggiling" value={brew.grinderSetting||'—'}/><Param label="Waktu" value={formatTime(brew.brewTimeSeconds)}/><Param label="TDS" value={brew.tdsPercent?`${brew.tdsPercent}%`:'—'}/></Card>
    {brew.cuppingAverage && <Card className="cupping-panel"><div className="section-title"><div><div className="eyebrow">PENILAIAN SENSORI</div><h2>Cupping</h2></div><strong>{brew.cuppingAverage}<small> / 10</small></strong></div>{Object.entries(brew.cupping||{}).filter(([,v])=>v).map(([key,value])=><div className="score-row" key={key}><span>{scoreLabel(key)}</span><div className="score-track"><i style={{width:`${value*10}%`}}/></div><b>{value}</b></div>)}</Card>}
    {!!brew.tasteTags?.length && <div className="detail-block"><h3>Karakter rasa</h3><div className="chip-list">{brew.tasteTags.map(tag=><span className="taste-chip" key={tag}>{tag}</span>)}</div></div>}
    {brew.notes&&<Card className="notes-card"><div className="eyebrow">CATATAN PRIBADI</div><p>{brew.notes}</p></Card>}
    <Link className="related-link" to={`/beans/${brew.bean?.id}`}><BeanIcon size={18}/> Lihat detail Biji Kopi <ArrowRight size={16}/></Link>
    <div className="detail-actions"><Link className="button button-outline" to={`/brews/${id}/edit`}>Ubah catatan</Link><button className="button button-danger-soft" onClick={()=>setConfirm(true)}>Arsipkan</button></div>
    <button className="button button-primary full-button" onClick={()=>navigate(`/timer${brew.bean?.id?`?beanId=${encodeURIComponent(brew.bean.id)}`:''}`,{state:{method:brew.method,beanId:brew.bean?.id,doseGrams:brew.doseGrams,waterGrams:brew.waterGrams,waterTempC:brew.waterTempC}})}><RotateCcw size={17}/> Seduh lagi</button>
  </div>}</DataState>{confirm&&<ConfirmDialog title="Arsipkan catatan ini?" description="Seduhan akan disembunyikan dari jurnal aktif semua pengguna. Data dapat dipulihkan atau dihapus permanen melalui halaman Arsip." onCancel={()=>setConfirm(false)} onConfirm={()=>remove.mutate()} pending={remove.isPending} confirmLabel="Pindahkan ke Arsip" pendingLabel="Memindahkan..."/>}</main>;
}
function Param({ label, value }) { return <div className="parameter"><span>{label}</span><b>{value}</b></div>; }
const labels={aroma:'Aroma',flavor:'Rasa',acidity:'Keasaman',body:'Body',sweetness:'Kemanisan',aftertaste:'Aftertaste',balance:'Keseimbangan'};
const scoreLabel=key=>labels[key]||key;
function formatTime(seconds) { if(seconds===undefined||seconds===null||seconds==='')return '—'; return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }

function BeanDetail() {
  const {id}=useParams(); const navigate=useNavigate(); const queryClient=useQueryClient(); const {toast}=useOutletContext(); const [confirm,setConfirm]=useState(false);
  const query=useQuery({queryKey:[...queryKeys.beans,id],queryFn:()=>fetchData(`/beans/${id}`)});
  const remove=useMutation({mutationFn:()=>api(`/beans/${id}`,{method:'DELETE'}),onSuccess:()=>{queryClient.invalidateQueries({queryKey:queryKeys.beans});queryClient.invalidateQueries({queryKey:queryKeys.brews});queryClient.invalidateQueries({queryKey:queryKeys.stats});queryClient.invalidateQueries({queryKey:queryKeys.archive});toast('Biji Kopi dan Seduhan terkait dipindahkan ke Arsip');navigate('/beans');},onError:error=>toast(error.message,'error')});
  const bean=query.data;
  return <main><PageHeader title="Detail Biji Kopi" back/><DataState query={query}>{bean&&<div className="detail-enter">
    <Card className="bean-detail-hero"><BeanThumb bean={bean}/><div className="eyebrow">{bean.roaster||'Koleksi SeduhLog'}</div><h2>{bean.name}</h2><p>{bean.origin}</p><div className="chip-list"><Badge>{bean.process}</Badge><Badge tone="warm">{bean.roastLevel} roast</Badge>{bean.variety&&<Badge>{bean.variety}</Badge>}</div></Card>
    <div className="stats-grid bean-stats"><StatCard label="Total seduhan" value={bean.brewCount} icon={Coffee}/><StatCard label="Rating rata-rata" value={bean.avgRating?`${bean.avgRating} / 5`:'—'} icon={Star}/></div>
    <Card className="bean-info"><h3>Informasi Biji Kopi</h3><Param label="Ketinggian" value={bean.altitudeMasl?`${bean.altitudeMasl} mdpl`:'—'}/><Param label="Tanggal sangrai" value={bean.roastDate?dateLabel(bean.roastDate):'—'}/>{bean.notes&&<p>{bean.notes}</p>}</Card>
    {bean.flavorNotes?.length>0&&<div className="detail-block"><h3>Catatan rasa</h3><div className="chip-list">{bean.flavorNotes.map(note=><span className="taste-chip" key={note}>{note}</span>)}</div></div>}
    <div className="section-title"><h2>Seduhan dengan Biji Kopi ini</h2></div>{bean.recentBrews?.length?bean.recentBrews.map(brew=><BrewCard key={brew.id} brew={brew} compact/>):<div className="empty-inline">Belum pernah diseduh.</div>}
    <Link className="button button-primary full-button" to={`/timer?beanId=${encodeURIComponent(bean.id)}`}><Coffee size={17}/> Mulai seduh dengan Biji Kopi ini</Link>
    <div className="detail-actions"><Link className="button button-outline" to={`/beans/${id}/edit`}>Ubah Biji Kopi</Link><button className="button button-danger-soft" onClick={()=>setConfirm(true)}>Arsipkan</button></div>
  </div>}</DataState>{confirm&&<ConfirmDialog title="Arsipkan Biji Kopi ini?" description="Biji Kopi dan semua Seduhan terkait akan dipindahkan ke Arsip untuk semua pengguna. Kamu dapat memulihkan semuanya bersama-sama atau menghapusnya permanen dari halaman Arsip." onCancel={()=>setConfirm(false)} onConfirm={()=>remove.mutate()} pending={remove.isPending} confirmLabel="Pindahkan ke Arsip" pendingLabel="Memindahkan..."/>}</main>;
}

function BeanForm() {
  const {id}=useParams(); const editing=Boolean(id); const navigate=useNavigate(); const queryClient=useQueryClient(); const {toast}=useOutletContext();
  const existing=useQuery({queryKey:[...queryKeys.beans,id],queryFn:()=>fetchData(`/beans/${id}`),enabled:editing});
  const [form,setForm]=useState({name:'',origin:'',roaster:'',process:'washed',roastLevel:'medium',variety:'',altitudeMasl:'',roastDate:'',flavorNotes:[],imageUrl:'',notes:''});
  const [flavor,setFlavor]=useState(''); const [errors,setErrors]=useState({});
  useEffect(()=>{if(existing.data)setForm({...existing.data,altitudeMasl:existing.data.altitudeMasl??'',roastDate:existing.data.roastDate?.slice(0,10)||''});},[existing.data]);
  const save=useMutation({
    mutationFn:data=>editing?jsonMutation(`/beans/${id}`,'PUT',data):jsonMutation('/beans','POST',data),
    onSuccess:result=>{queryClient.invalidateQueries({queryKey:queryKeys.beans});toast(editing?'Biji Kopi diperbarui':'Biji Kopi ditambahkan');navigate(`/beans/${result.data.id}`);},
    onError:error=>{const next=mapFieldErrors(error.errors);setErrors(next);focusFirstError(next,beanErrorIds);toast(error.message,'error');}
  });
  const set=(key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:''}));};
  const addFlavor=()=>{const value=flavor.trim();if(!value||form.flavorNotes.includes(value))return;if(form.flavorNotes.length>=8){setErrors(current=>({...current,flavorNotes:'Catatan rasa maksimal 8 pilihan'}));return;}set('flavorNotes',[...form.flavorNotes,value]);setFlavor('');};
  const submit=event=>{
    event.preventDefault();
    const next={};
    if(form.name.trim().length<2)next.name='Nama Biji Kopi minimal 2 karakter';
    if(!form.origin.trim())next.origin='Asal Biji Kopi wajib diisi';
    if(form.altitudeMasl!==''&&(!Number.isFinite(Number(form.altitudeMasl))||Number(form.altitudeMasl)<0||Number(form.altitudeMasl)>3000))next.altitudeMasl='Ketinggian harus antara 0–3000 mdpl';
    if(form.imageUrl){try{const url=new URL(form.imageUrl);if(!['http:','https:'].includes(url.protocol))next.imageUrl='URL gambar harus menggunakan http atau https';}catch{next.imageUrl='Masukkan URL gambar yang valid';}}
    if(form.flavorNotes.length>8)next.flavorNotes='Catatan rasa maksimal 8 pilihan';
    if((form.notes||'').length>500)next.notes='Catatan tambahan maksimal 500 karakter';
    setErrors(next);
    if(Object.keys(next).length){focusFirstError(next,beanErrorIds);toast('Periksa kolom yang ditandai sebelum menyimpan.','error');return;}
    save.mutate({...form,altitudeMasl:form.altitudeMasl===''?undefined:Number(form.altitudeMasl),roastDate:form.roastDate||undefined});
  };
  return <main className="form-page"><PageHeader title={editing?'Ubah Biji Kopi':'Tambah Biji Kopi'} back eyebrow="KOLEKSI KOPI"/>{editing&&existing.isPending?<Loading rows={4}/>:<form className="form-content" onSubmit={submit} noValidate>
    <FormErrorSummary errors={errors} ids={beanErrorIds} labels={beanErrorLabels}/>
    <div className="field"><label htmlFor="bean-name">Nama Biji Kopi *</label><input id="bean-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name?'bean-name-error':undefined} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Contoh: Gayo Honey"/><FieldError id="bean-name-error" error={errors.name}/></div>
    <div className="field"><label htmlFor="bean-origin">Asal *</label><input id="bean-origin" aria-invalid={Boolean(errors.origin)} aria-describedby={errors.origin?'bean-origin-error':undefined} value={form.origin} onChange={e=>set('origin',e.target.value)} placeholder="Contoh: Gayo, Aceh"/><FieldError id="bean-origin-error" error={errors.origin}/></div>
    <div className="field"><label htmlFor="bean-roaster">Roaster</label><input id="bean-roaster" value={form.roaster||''} onChange={e=>set('roaster',e.target.value)} placeholder="Nama roastery"/></div>
    <div className="field-row"><div className="field"><label htmlFor="bean-process">Proses</label><select id="bean-process" aria-invalid={Boolean(errors.process)} aria-describedby={errors.process?'bean-process-error':undefined} value={form.process} onChange={e=>set('process',e.target.value)}>{['washed','natural','honey','anaerobic','lainnya'].map(x=><option key={x} value={x}>{x}</option>)}</select><FieldError id="bean-process-error" error={errors.process}/></div><div className="field"><label htmlFor="bean-roast">Level sangrai</label><select id="bean-roast" aria-invalid={Boolean(errors.roastLevel)} aria-describedby={errors.roastLevel?'bean-roast-error':undefined} value={form.roastLevel} onChange={e=>set('roastLevel',e.target.value)}>{['light','medium','dark'].map(x=><option key={x} value={x}>{x}</option>)}</select><FieldError id="bean-roast-error" error={errors.roastLevel}/></div></div>
    <div className="field-row"><div className="field"><label htmlFor="bean-variety">Varietas</label><input id="bean-variety" value={form.variety||''} onChange={e=>set('variety',e.target.value)}/></div><div className="field"><label htmlFor="bean-altitude">Ketinggian (mdpl)</label><input id="bean-altitude" type="number" min="0" max="3000" aria-invalid={Boolean(errors.altitudeMasl)} aria-describedby={errors.altitudeMasl?'bean-altitude-error':undefined} value={form.altitudeMasl} onChange={e=>set('altitudeMasl',e.target.value)}/><FieldError id="bean-altitude-error" error={errors.altitudeMasl}/></div></div>
    <div className="field"><label htmlFor="bean-roast-date">Tanggal sangrai</label><input id="bean-roast-date" type="date" aria-invalid={Boolean(errors.roastDate)} aria-describedby={errors.roastDate?'bean-roast-date-error':undefined} value={form.roastDate||''} onChange={e=>set('roastDate',e.target.value)}/><FieldError id="bean-roast-date-error" error={errors.roastDate}/></div>
    <div className="field">
      <label htmlFor="bean-image">URL gambar (opsional)</label>
      {form.imageUrl&&<div className="bean-image-preview"><img src={form.imageUrl} alt="Preview gambar biji kopi" loading="lazy" onError={e=>{e.target.style.display='none';}}/></div>}
      <input id="bean-image" type="url" aria-invalid={Boolean(errors.imageUrl)} aria-describedby={errors.imageUrl?'bean-image-error':undefined} value={form.imageUrl||''} onChange={e=>set('imageUrl',e.target.value)} placeholder="https://..."/>
      <FieldError id="bean-image-error" error={errors.imageUrl}/>
      <div className="bean-image-presets">
        <span>Atau pilih dari koleksi gambar:</span>
        <div className="preset-grid">
          {BEAN_IMAGE_PRESETS.map(preset=>(
            <button key={preset.id} type="button" className={`preset-thumb${form.imageUrl===preset.url?' selected':''}`} onClick={()=>set('imageUrl',preset.url)} title={preset.description} aria-label={preset.name}>
              <img src={preset.url} alt={preset.name} loading="lazy"/>
              {form.imageUrl===preset.url&&<span className="preset-check">✓</span>}
            </button>
          ))}
        </div>
        {form.imageUrl&&<button type="button" className="preset-clear" onClick={()=>set('imageUrl','')}>✕ Hapus pilihan gambar</button>}
      </div>
    </div>
    <div className="field"><label htmlFor="bean-flavors">Catatan rasa (maks. 8)</label><div className="chip-entry"><input id="bean-flavors" aria-invalid={Boolean(errors.flavorNotes)} aria-describedby={errors.flavorNotes?'bean-flavors-error':undefined} value={flavor} onChange={e=>setFlavor(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addFlavor();}}} placeholder="Ketik lalu tekan Enter"/><button type="button" onClick={addFlavor}><Plus size={17}/></button></div><FieldError id="bean-flavors-error" error={errors.flavorNotes}/><div className="chip-list">{form.flavorNotes.map(item=><button type="button" className="taste-chip removable" key={item} onClick={()=>set('flavorNotes',form.flavorNotes.filter(x=>x!==item))}>{item}<X size={13}/></button>)}</div></div>
    <div className="field"><label htmlFor="bean-notes">Catatan tambahan</label><textarea id="bean-notes" maxLength="500" rows="3" aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes?'bean-notes-error':undefined} value={form.notes||''} onChange={e=>set('notes',e.target.value)}/><FieldError id="bean-notes-error" error={errors.notes}/></div>
    <button className="button button-primary sticky-save" disabled={save.isPending}>{save.isPending?'Menyimpan...':'Simpan Biji Kopi'} <Check size={18}/></button>
  </form>}</main>;
}

function BrewForm() {
  const {id}=useParams(); const editing=Boolean(id); const navigate=useNavigate(); const queryClient=useQueryClient(); const {toast}=useOutletContext(); const [searchParams]=useSearchParams(); const location=useLocation();
  const existing=useQuery({queryKey:[...queryKeys.brews,id],queryFn:()=>fetchData(`/brews/${id}`),enabled:editing});
  const beanQuery=useQuery({queryKey:queryKeys.beans,queryFn:()=>fetchData('/beans?limit=50')});
  const [form,setForm]=useState({bean:searchParams.get('beanId')||'',method:'v60',doseGrams:15,waterGrams:240,waterTempC:94,grindSize:'medium_fine',grinderSetting:'',brewTimeSeconds:180,tdsPercent:'',rating:0,cupping:{},tasteTags:[],notes:'',isFavorite:false,brewedAt:localDateTime(new Date())});
  const [taste,setTaste]=useState(''); const [errors,setErrors]=useState({}); const [showCupping,setShowCupping]=useState(false);
  const beans=beanQuery.data||[];
  useEffect(()=>{
    if(existing.data){const b=existing.data;setForm({...b,bean:b.bean?.id||b.bean,brewedAt:b.brewedAt?localDateTime(b.brewedAt):''});}
    else if(!editing&&location.state){const preset=location.state;setForm(current=>({...current,...preset,bean:searchParams.get('beanId')||current.bean}));}
  },[existing.data,editing,location.state,searchParams]);
  const save=useMutation({
    mutationFn:data=>editing?jsonMutation(`/brews/${id}`,'PUT',data):jsonMutation('/brews','POST',data),
    onSuccess:result=>{queryClient.invalidateQueries({queryKey:queryKeys.brews});queryClient.invalidateQueries({queryKey:queryKeys.stats});queryClient.invalidateQueries({queryKey:queryKeys.beans});toast('Seduhan tersimpan');navigate(`/brews/${result.data.id}`);},
    onError:error=>{const next=mapFieldErrors(error.errors);setErrors(next);if(next.cupping){setShowCupping(true);setTimeout(()=>focusFirstError(next,brewErrorIds),0);}else focusFirstError(next,brewErrorIds);toast(error.message,'error');}
  });
  const update=(key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:''}));};
  const applyMethod=value=>{const preset=methods.find(item=>item.method===value);update('method',value);if(!editing&&preset)setForm(current=>({...current,method:value,waterTempC:preset.temperature,grindSize:preset.grind,waterGrams:Math.round(current.doseGrams*preset.ratio)}));};
  const selectedMethod=methods.find(item=>item.method===form.method)||methods[0];
  const calculateWaterFromDose=()=>update('waterGrams',calculateRatio({mode:'water',dose:form.doseGrams,ratio:selectedMethod.ratio}).water);
  const calculateDoseFromWater=()=>update('doseGrams',calculateRatio({mode:'dose',water:form.waterGrams,ratio:selectedMethod.ratio}).dose);
  const addTaste=value=>{
    const tag=(value||taste).trim();
    if(!tag||form.tasteTags.includes(tag))return;
    if(form.tasteTags.length>=8){setErrors(current=>({...current,tasteTags:'Tag rasa maksimal 8 pilihan'}));return;}
    update('tasteTags',[...form.tasteTags,tag]);setTaste('');
  };
  const submit=event=>{
    event.preventDefault();
    const next={};
    if(!form.bean)next.bean='Pilih Biji Kopi';
    if(!form.rating)next.rating='Pilih rating dari 1 sampai 5 bintang';
    if(!Number.isFinite(Number(form.doseGrams))||Number(form.doseGrams)<5||Number(form.doseGrams)>100)next.doseGrams='Dosis harus 5–100 gram';
    if(!Number.isFinite(Number(form.waterGrams))||Number(form.waterGrams)<20||Number(form.waterGrams)>2000)next.waterGrams='Air harus 20–2000 gram';
    const optionalRanges=[['waterTempC',0,100,'Suhu air harus 0–100°C'],['brewTimeSeconds',0,86400,'Waktu seduh harus 0–86400 detik'],['tdsPercent',0,20,'TDS harus 0–20%']];
    for(const [key,min,max,message] of optionalRanges){const value=form[key];if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max))next[key]=message;}
    if(form.tasteTags.length>8)next.tasteTags='Tag rasa maksimal 8 pilihan';
    if((form.notes||'').length>1000)next.notes='Catatan Seduhan maksimal 1000 karakter';
    if(form.brewedAt&&Number.isNaN(new Date(form.brewedAt).getTime()))next.brewedAt='Tanggal dan waktu tidak valid';
    setErrors(next);
    if(Object.keys(next).length){focusFirstError(next,brewErrorIds);toast('Periksa kolom yang ditandai sebelum menyimpan.','error');return;}
    const data={...form,bean:form.bean,doseGrams:Number(form.doseGrams),waterGrams:Number(form.waterGrams),waterTempC:form.waterTempC===''?undefined:Number(form.waterTempC),grindSize:form.grindSize||undefined,brewTimeSeconds:form.brewTimeSeconds===''?undefined:Number(form.brewTimeSeconds),tdsPercent:form.tdsPercent===''?undefined:Number(form.tdsPercent),brewedAt:form.brewedAt?new Date(form.brewedAt).toISOString():undefined};
    save.mutate(data);
  };
  return <main className="form-page"><PageHeader title={editing?'Ubah seduhan':'Catat seduhan'} back eyebrow="JURNAL SEDUH"/>{(editing&&existing.isPending)||beanQuery.isPending?<Loading rows={5}/>:<form className="form-content" onSubmit={submit} noValidate>
    <FormErrorSummary errors={errors} ids={brewErrorIds} labels={brewErrorLabels}/>
    <div className="field"><label htmlFor="brew-bean">Biji Kopi *</label><select id="brew-bean" aria-invalid={Boolean(errors.bean)} aria-describedby={errors.bean?'brew-bean-error':undefined} value={form.bean} onChange={e=>update('bean',e.target.value)}><option value="">Pilih Biji Kopi</option>{beans.map(bean=><option key={bean.id} value={bean.id}>{bean.name} · {bean.origin}</option>)}</select><FieldError id="brew-bean-error" error={errors.bean}/><Link className="helper-link" to="/beans/new">+ Tambah Biji Kopi baru</Link></div>
    <div className="field"><label>Metode seduh</label><div className="method-grid" id="method-field" aria-invalid={Boolean(errors.method)}>{methods.map(item=><button type="button" key={item.method} className={`method-option ${form.method===item.method?'selected':''}`} onClick={()=>applyMethod(item.method)}><Coffee size={17}/>{item.label}</button>)}</div><FieldError id="method-error" error={errors.method}/></div>
    <div className="field-row"><div className="field"><label htmlFor="dose">Dosis (g) *</label><input id="dose" type="number" min="5" max="100" step="0.1" aria-invalid={Boolean(errors.doseGrams)} aria-describedby={errors.doseGrams?'dose-error':undefined} value={form.doseGrams} onChange={e=>update('doseGrams',safeNumber(e.target.value))}/><FieldError id="dose-error" error={errors.doseGrams}/></div><div className="field"><label htmlFor="water">Air (g) *</label><input id="water" type="number" min="20" max="2000" step="1" aria-invalid={Boolean(errors.waterGrams)} aria-describedby={errors.waterGrams?'water-error':undefined} value={form.waterGrams} onChange={e=>update('waterGrams',safeNumber(e.target.value))}/><FieldError id="water-error" error={errors.waterGrams}/></div></div>
    <div className="ratio-preview"><span>Rasio seduh</span><b>1:{(Number(form.waterGrams||0)/Math.max(Number(form.doseGrams||1),1)).toFixed(1)}</b></div>
    <div className="ratio-calculator"><span>Hitung dengan preset {selectedMethod.label} · 1:{selectedMethod.ratio}</span><div className="ratio-actions"><button type="button" className="button button-outline" onClick={calculateWaterFromDose} disabled={!Number(form.doseGrams)}>Hitung air dari dosis</button><button type="button" className="button button-outline" onClick={calculateDoseFromWater} disabled={!Number(form.waterGrams)}>Hitung dosis dari air</button></div></div>
    <div className="field-row"><div className="field"><label htmlFor="temp">Suhu air (°C)</label><input id="temp" type="number" min="0" max="100" aria-invalid={Boolean(errors.waterTempC)} aria-describedby={errors.waterTempC?'temp-error':undefined} value={form.waterTempC} onChange={e=>update('waterTempC',safeNumber(e.target.value))}/><FieldError id="temp-error" error={errors.waterTempC}/></div><div className="field"><label htmlFor="grind">Ukuran giling</label><select id="grind" aria-invalid={Boolean(errors.grindSize)} aria-describedby={errors.grindSize?'grind-error':undefined} value={form.grindSize||''} onChange={e=>update('grindSize',e.target.value)}><option value="">Pilih</option>{['extra_fine','fine','medium_fine','medium','medium_coarse','coarse'].map(v=><option key={v} value={v}>{grindLabel(v)}</option>)}</select><FieldError id="grind-error" error={errors.grindSize}/></div></div>
    <div className="field-row"><div className="field"><label htmlFor="grinder-setting">Setting grinder</label><input id="grinder-setting" value={form.grinderSetting||''} onChange={e=>update('grinderSetting',e.target.value)} placeholder="21 klik"/></div><div className="field"><label htmlFor="brew-time">Waktu (detik)</label><input id="brew-time" type="number" min="0" max="86400" aria-invalid={Boolean(errors.brewTimeSeconds)} aria-describedby={errors.brewTimeSeconds?'brew-time-error':undefined} value={form.brewTimeSeconds} onChange={e=>update('brewTimeSeconds',safeNumber(e.target.value))}/><FieldError id="brew-time-error" error={errors.brewTimeSeconds}/></div></div>
    <div className="field"><label htmlFor="tds">TDS (%)</label><input id="tds" type="number" min="0" max="20" step="0.01" aria-invalid={Boolean(errors.tdsPercent)} aria-describedby={errors.tdsPercent?'tds-error':undefined} value={form.tdsPercent} onChange={e=>update('tdsPercent',safeNumber(e.target.value))}/><FieldError id="tds-error" error={errors.tdsPercent}/></div>
    <div id="rating-field" className="field"><label>Rating *</label><div className="rating-picker" role="radiogroup" aria-label="Pilih rating" aria-invalid={Boolean(errors.rating)} aria-describedby={errors.rating?'rating-error':undefined}>{[1,2,3,4,5].map(value=><button key={value} type="button" aria-label={`${value} bintang`} aria-checked={form.rating===value} role="radio" onClick={()=>update('rating',value)}><Star fill={value<=form.rating?'currentColor':'none'} size={29}/></button>)}</div>{errors.rating&&<small id="rating-error" className="field-error" role="alert">{errors.rating}</small>}</div>
    <button type="button" id="cupping-toggle" className="accordion-toggle" aria-invalid={Boolean(errors.cupping)} aria-describedby={errors.cupping?'cupping-error':undefined} onClick={()=>setShowCupping(!showCupping)}><span>Catatan cupping <small>(opsional)</small></span>{showCupping?<Minus size={17}/>:<Plus size={17}/>}</button><FieldError id="cupping-error" error={errors.cupping}/>
    {showCupping&&<div className="cupping-form">{Object.entries(labels).map(([key,label])=><label className="rating-slider" key={key}><span>{label}<b>{form.cupping[key]||5}</b></span><input aria-label={label} type="range" min="1" max="10" value={form.cupping[key]||5} onChange={e=>update('cupping',{...form.cupping,[key]:Number(e.target.value)})}/></label>)}</div>}
    <div className="field"><label htmlFor="brew-taste">Tag rasa</label><div className="chip-list suggestion-list">{['Cokelat','Karamel','Buah beri','Jeruk','Floral','Kacang','Rempah','Manis madu','Earthy','Asam segar'].map(item=><Chip key={item} selected={form.tasteTags.includes(item)} onClick={()=>form.tasteTags.includes(item)?update('tasteTags',form.tasteTags.filter(x=>x!==item)):addTaste(item)}>{item}</Chip>)}</div><div className="chip-entry"><input id="brew-taste" aria-invalid={Boolean(errors.tasteTags)} aria-describedby={errors.tasteTags?'brew-taste-error':undefined} value={taste} onChange={e=>setTaste(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTaste();}}} placeholder="Tag lainnya..."/><button type="button" onClick={()=>addTaste()}><Plus size={17}/></button></div><FieldError id="brew-taste-error" error={errors.tasteTags}/></div>
    <div className="field"><label htmlFor="brew-notes">Catatan</label><textarea id="brew-notes" maxLength="1000" rows="4" aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes?'brew-notes-error':undefined} value={form.notes||''} onChange={e=>update('notes',e.target.value)} placeholder="Apa yang kamu rasakan?"/><FieldError id="brew-notes-error" error={errors.notes}/></div>
    <div className="field"><label htmlFor="brewed-at">Tanggal dan waktu</label><input id="brewed-at" type="datetime-local" aria-invalid={Boolean(errors.brewedAt)} aria-describedby={errors.brewedAt?'brewed-at-error':undefined} value={form.brewedAt} onChange={e=>update('brewedAt',e.target.value)}/><FieldError id="brewed-at-error" error={errors.brewedAt}/></div>
    <button className="button button-primary sticky-save" disabled={save.isPending}>{save.isPending?'Menyimpan...':'Simpan seduhan'} <Check size={18}/></button>
  </form>}</main>;
}

function TimerPage() {
  const navigate=useNavigate(); const location=useLocation(); const [searchParams]=useSearchParams(); const [section,setSection]=useState('timer');
  const beanId=searchParams.get('beanId')||location.state?.beanId||'';
  const beanQuery=useQuery({queryKey:[...queryKeys.beans,beanId],queryFn:()=>fetchData(`/beans/${beanId}`),enabled:Boolean(beanId)});
  const [methodKey,setMethodKey]=useState(location.state?.method||'v60');
  const [dose,setDose]=useState(Number(location.state?.doseGrams)||15);
  const [water,setWater]=useState(Number(location.state?.waterGrams)||240);
  const [ratio,setRatio]=useState(Number(location.state?.waterGrams&&location.state?.doseGrams?location.state.waterGrams/location.state.doseGrams:16));
  const selected=methods.find(item=>item.method===methodKey)||methods[0];
  const notifyStep=useCallback(()=>{try{navigator.vibrate?.(80);const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return;const audio=new AudioContextClass();const oscillator=audio.createOscillator();const gain=audio.createGain();oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.value=880;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);oscillator.start();oscillator.stop(audio.currentTime+.18);oscillator.onended=()=>audio.close();}catch{/* Audio and vibration are optional device features. */}},[]);
  const timer=useBrewTimer(selected.steps,notifyStep);
  const step=selected.steps[timer.stepIndex];
  const targetWater=step?Math.round(dose*ratio*step.percent/100):Math.round(dose*ratio);
  const maxTime=selected.steps.at(-1)?.end||0;
  const progress=maxTime?Math.min(timer.elapsed/maxTime,1):0;
  const sceneTitle=timer.finished?'Seduhan siap dinikmati':methodKey==='cold_brew'?'Proses seduh dingin':timer.running?(step?.name||'Ekstraksi berlangsung'):'Siapkan alat dan bahan';
  const sceneCaption=timer.finished?'Tuangkan ke cangkir dan nikmati hasil racikanmu.':methodKey==='cold_brew'?'Rendam kopi dalam air dingin selama 12–18 jam.':timer.running?(step?`Ikuti langkah ini · target air ${targetWater} g`:'Pantau proses seduh hingga selesai.'):'Visual langkah akan mengikuti metode dan timer yang dipilih.';
  const changeMethod=value=>{const preset=methods.find(item=>item.method===value);setMethodKey(value);setRatio(preset.ratio);setWater(Math.round(dose*preset.ratio));timer.reset();};
  const updateDose=value=>{setDose(value);if(value>0)setWater(calculateRatio({mode:'water',dose:value,ratio}).water);};
  const updateWater=value=>{setWater(value);if(value>0)setRatio(Math.round(value/Math.max(Number(dose)||1,1)*10)/10);};
  const recordBrew=()=>navigate(`/brews/new${beanId?`?beanId=${encodeURIComponent(beanId)}`:''}`,{state:{method:methodKey,doseGrams:dose,waterGrams:Math.round(dose*ratio),waterTempC:selected.temperature,grindSize:selected.grind,brewTimeSeconds:methodKey==='cold_brew'?'':timer.elapsed}});
  return <main><PageHeader title="Ruang seduh" eyebrow="RACIK DENGAN TENANG"/>
    <div className="segmented"><button className={section==='timer'?'active':''} onClick={()=>setSection('timer')}><TimerIcon size={16}/> Timer</button><button className={section==='calculator'?'active':''} onClick={()=>setSection('calculator')}><SlidersHorizontal size={16}/> Kalkulator</button></div>
    {beanId&&(beanQuery.isError?<p className="timer-bean-error" role="alert">Data Biji Kopi gagal dimuat. Kembali ke detail Biji Kopi dan coba lagi.</p>:<div className="timer-bean-context"><BeanIcon size={16}/><span>MENYEDUH DENGAN <b>{beanQuery.data?.name||'Memuat Biji Kopi...'}</b></span></div>)}
    {section==='calculator'?<section className="calculator-view">
      <Card className="calculator-card"><div className="eyebrow">KALKULATOR RASIO</div><h2>Temukan takaranmu.</h2><p>Atur dosis dan rasio untuk menghitung kebutuhan air.</p>
        <div className="field"><label htmlFor="calc-method">Preset metode</label><select id="calc-method" value={methodKey} onChange={event=>changeMethod(event.target.value)}>{methods.map(item=><option key={item.method} value={item.method}>{item.label} · 1:{item.ratio}</option>)}</select></div>
        <div className="field-row"><div className="field"><label htmlFor="calc-dose">Dosis kopi (g)</label><input id="calc-dose" type="number" min="1" value={dose} onChange={event=>updateDose(Number(event.target.value))}/></div><div className="field"><label htmlFor="calc-water">Air (g)</label><input id="calc-water" type="number" min="1" value={water} onChange={event=>updateWater(Number(event.target.value))}/></div></div>
        <div className="ratio-result"><span>Rasio seduh</span><strong>1 : {ratio.toFixed(1)}</strong><small>Suhu rekomendasi {selected.temperature}°C</small></div>
        <div className="ratio-lock"><button className="button button-outline" onClick={()=>{setRatio(selected.ratio);setWater(Math.round(dose*selected.ratio));}}>Hitung air dari dosis</button><button className="button button-outline" onClick={()=>{setRatio(selected.ratio);setDose(Math.round(water/selected.ratio*10)/10);}}>Hitung dosis dari air</button></div>
      </Card><p className="calculator-note"><Info size={15}/> Rasio dapat disesuaikan sesuai Biji Kopi dan selera.</p>
    </section>:<section className="timer-view">
      <div className="timer-controls-top"><label htmlFor="timer-method">METODE SEDUH</label><select id="timer-method" value={methodKey} onChange={event=>changeMethod(event.target.value)}>{methods.map(item=><option key={item.method} value={item.method}>{item.label}</option>)}</select></div>
      <Card className="timer-card">
        <svg className="timer-ring" viewBox="0 0 220 220" role="img" aria-label={`Timer ${formatTime(timer.elapsed)}`}><circle className="ring-bg" cx="110" cy="110" r="96"/><circle className="ring-progress" cx="110" cy="110" r="96" style={{strokeDashoffset:603*(1-progress)}}/></svg>
        <div className="timer-display"><div className="eyebrow">{selected.label.toUpperCase()}</div><strong>{formatTime(timer.elapsed)}</strong><span>{selected.steps.length?'WAKTU BERJALAN':'STOPWATCH'}</span></div>
      </Card>
      <BrewScene method={methodKey} stepIndex={timer.stepIndex} running={timer.running} finished={timer.finished} title={sceneTitle} caption={sceneCaption}/>
      <Card className="timer-step-card">{methodKey==='cold_brew'?<><div className="step-number"><Moon size={18}/></div><div><b>Seduh dingin 12–18 jam</b><p>Timer langkah tidak tersedia untuk cold brew.</p></div></>:<><div className="step-number">{timer.finished?<Check size={18}/>:String(Math.min(timer.stepIndex+1,Math.max(selected.steps.length,1))).padStart(2,'0')}</div><div className="step-copy"><small>{timer.finished?'SELESAI':'LANGKAH SAAT INI'}</small><b>{timer.finished?'Seduhan siap dinikmati':step?.name||'Stopwatch siap dimulai'}</b><p>{selected.steps.length?(step?`Tuang sampai ${targetWater} g · ${formatTime(step.end)}`:'Semua langkah selesai'):'Atur waktu seduhmu secara manual'}</p>{selected.steps[timer.stepIndex+1]&&<span>Selanjutnya: {selected.steps[timer.stepIndex+1].name}</span>}</div><button className="skip-step" aria-label="Lewati langkah" onClick={timer.skipStep} disabled={!selected.steps.length}><ChevronRight/></button></>}</Card>
      <div className="timer-dose-row"><label>Dosis <input type="number" min="1" value={dose} onChange={event=>updateDose(Number(event.target.value))}/> g</label><label>Rasio 1:<input type="number" min="1" value={ratio} onChange={event=>{setRatio(Number(event.target.value));setWater(Math.round(dose*Number(event.target.value)));}}/></label><span>Air total <b>{Math.round(dose*ratio)} g</b></span></div>
      {timer.finished?<div className="timer-actions"><button className="button button-primary timer-main-action" onClick={recordBrew}><BookOpen size={18}/> Catat hasil seduhan</button><button className="timer-reset" aria-label="Reset timer" onClick={timer.reset}><RotateCcw size={19}/></button></div>:methodKey==='cold_brew'?<><p className="timer-tip">Rendam 12–18 jam, lalu catat hasilnya.</p><button className="button button-primary timer-main-action" onClick={recordBrew}><BookOpen size={18}/> Sudah selesai direndam? Catat hasil</button></>:<div className="timer-actions">{!timer.running?<button className="button button-primary timer-main-action" onClick={timer.start}><Play size={18} fill="currentColor"/> {timer.elapsed?'Lanjut':'Mulai'}</button>:<button className="button button-primary timer-main-action" onClick={timer.pause}><Pause size={18} fill="currentColor"/> Jeda</button>}<button className="timer-reset" aria-label="Reset timer" onClick={timer.reset}><RotateCcw size={19}/></button>{timer.elapsed>0&&<button className="timer-reset" aria-label="Lewati langkah" onClick={timer.skipStep}><ChevronRight size={19}/></button>}</div>}
      <p className="timer-tip"><Clock3 size={15}/> Timer tetap akurat saat kamu berpindah aplikasi.</p>
    </section>}
  </main>;
}

function BrewScene({method,stepIndex,running,finished,title,caption}) {
  const sceneClass=`brew-scene scene-${method} phase-${stepIndex} ${running?'is-running':''} ${finished?'is-finished':''}`;
  return <Card className={sceneClass} aria-label={`Ilustrasi proses ${methodLabel(method)}`}>
    <div className="scene-copy"><span className="scene-live"><i/> {running?'SEDANG BERLANGSUNG':finished?'SELESAI':method==='cold_brew'?'PANDUAN SEDUH':'PANDUAN LANGKAH'}</span><b>{title}</b><p>{caption}</p></div>
    <svg className={`scene-art scene-art-${method}`} viewBox="0 0 260 170" role="img" aria-label={`${methodLabel(method)}: ${title}`} preserveAspectRatio="xMidYMid meet">
      <ellipse className="scene-glow" cx="130" cy="154" rx="108" ry="8"/>
      <path className="scene-table" d="M18 148h224" />

      {/* 1. V60 Pour Over - Precision Editorial Artwork */}
      {method==='v60'&&<g className="scene-v60">
        <ellipse cx="180" cy="148" rx="46" ry="5" className="scene-v60-mat"/>

        {/* Range Server (Glass Decanter) */}
        <path className="scene-server" d="M166 92 c0 6 -8 18 -12 30 -4 12 -1 24 4 26 a6 6 0 0 0 4 2 h36 a6 6 0 0 0 4 -2 c5 -2 8 -14 4 -26 -4 -12 -12 -24 -12 -30 z"/>
        <line x1="160" y1="92" x2="202" y2="92" className="scene-server-rim"/>
        <path className="scene-server-handle" d="M198 100 c16 -1 25 10 23 25 -2 10 -9 15 -18 14"/>

        {/* Server Coffee liquid */}
        <path className="scene-server-coffee" d="M154 134 c12 4 40 4 52 0 2 6 0 11 -4 13 -6 3 -16 3 -22 3 s-16 0 -22 -3 c-4 -2 -6 -7 -4 -13 z"/>

        {/* Server measurement marks (3 ticks) */}
        <line x1="174" y1="114" x2="190" y2="114" className="scene-server-mark"/>
        <line x1="171" y1="124" x2="193" y2="124" className="scene-server-mark"/>
        <line x1="168" y1="134" x2="196" y2="134" className="scene-server-mark"/>

        {/* V60 Dripper Assembly */}
        <g className="scene-dripper-assembly">
          <rect x="156" y="86" width="50" height="6" rx="3" className="scene-dripper-base"/>
          <path className="scene-glass-dripper" d="M156 40 l17 46 h16 l17 -46 z"/>
          <ellipse cx="181" cy="40" rx="25" ry="6" className="scene-glass-dripper-rim"/>
          <ellipse cx="181" cy="41" rx="22" ry="4.8" className="scene-glass-dripper-inner"/>
          <path className="scene-filter" d="M158 41 c0 -1 44 -1 44 0 l-14 41 h-16 z"/>
          <path className="scene-coffee-bed" d="M166 64 l6 18 h16 l6 -18 z"/>
          <path className="scene-bloom-bed" d="M164 56 c0 -2 34 -2 34 0 l-2 10 c-10 2 -20 2 -30 0 z"/>
          <g className="scene-bloom-bubbles">
            <circle cx="174" cy="61" r="2.8" className="scene-bubble b1"/>
            <circle cx="182" cy="63" r="2.2" className="scene-bubble b2"/>
            <circle cx="189" cy="60" r="2.6" className="scene-bubble b3"/>
            <circle cx="178" cy="58.5" r="1.8" className="scene-bubble b4"/>
            <circle cx="185" cy="65" r="2" className="scene-bubble b5"/>
          </g>
        </g>

        {/* Steam Wisps */}
        <g className="scene-steam-wisps">
          <path d="M174 32 c-4 -8 4 -14 -2 -22" className="scene-steam-line s1"/>
          <path d="M182 27 c-3 -8 4 -14 -1 -22" className="scene-steam-line s2"/>
          <path d="M190 32 c-4 -8 4 -14 -2 -22" className="scene-steam-line s3"/>
        </g>

        {/* Gooseneck Kettle (Elevated High & Tilted ~28deg) */}
        <g className="scene-v60-kettle">
          {/* Double-Rim Base */}
          <line x1="48" y1="78" x2="88" y2="99" className="scene-kettle-base-rim1"/>
          <line x1="45" y1="83" x2="85" y2="104" className="scene-kettle-base-rim2"/>

          {/* Kettle Body */}
          <path className="scene-kettle-body" d="M48 78 C44 58 56 45 76 45 L98 56 C108 70 106 88 88 99 Z"/>

          {/* Stepped Lid */}
          <path className="scene-kettle-lid" d="M78 43 L82 34 L94 40 L90 49 Z"/>

          {/* Terracotta Knob */}
          <circle cx="88" cy="37" r="4.8" className="scene-kettle-knob"/>

          {/* Ergonomic High-Arch Gooseneck Handle */}
          <path className="scene-kettle-handle" d="M70 48 C50 28 36 36 36 54 C36 70 42 78 48 80"/>

          {/* Graceful Arching Gooseneck Spout */}
          <path className="scene-kettle-spout" d="M96 86 C110 70 124 48 146 36 C158 30 168 32 173 42 L170 46 C165 38 157 37 147 43 C127 55 115 78 102 92 Z"/>

          {/* Dual Water Pour Stream pouring into the bloom */}
          <g className="scene-v60-stream-group">
            <path className="scene-v60-stream-flow" d="M170 46 C170 54 172 60 174 66 L180 66 C178 60 174 54 173 43 Z"/>
            <path className="scene-v60-stream-line l1" d="M170 46 C170 54 172 60 174 66"/>
            <path className="scene-v60-stream-line l2" d="M173 43 C174 54 178 60 180 66"/>
          </g>
        </g>
      </g>}

      {/* 2. French Press */}
      {method==='french_press'&&<g className="scene-french-press">
        <rect x="96" y="38" width="68" height="116" rx="4" className="scene-press-glass"/>
        <path d="M96 38h-6v116h6" className="scene-press-frame"/>
        <path d="M164 38h6v116h-6" className="scene-press-frame"/>
        <path d="M90 152h80v4H90z" className="scene-press-base-foot"/>
        <path d="M94 76h72 M94 118h72" className="scene-press-bands"/>
        <path d="M166 58c20-2 22 42 0 42" className="scene-press-handle"/>
        <path d="M94 38l-8 6h8" className="scene-press-spout"/>
        <rect x="98" y="70" width="64" height="82" className="scene-coffee"/>
        <rect x="98" y="134" width="64" height="18" className="scene-press-grounds"/>
        <g className="scene-plunger-group">
          <line x1="130" y1="16" x2="130" y2="70" className="scene-press-rod"/>
          <ellipse cx="130" cy="14" rx="10" ry="6" className="scene-press-knob"/>
          <path d="M92 36h76v6H92z" className="scene-press-lid"/>
          <rect x="98" y="68" width="64" height="6" rx="2" className="scene-press-filter-mesh"/>
        </g>
        <g className="scene-bubbles">
          <circle cx="114" cy="88" r="3"/>
          <circle cx="146" cy="98" r="2.5"/>
          <circle cx="128" cy="112" r="3.2"/>
        </g>
        <g className="scene-steam-wisps">
          <path d="M92 28q-4-8 2-14" className="scene-steam-line s1"/>
          <path d="M102 24q4-8-2-14" className="scene-steam-line s2"/>
        </g>
      </g>}

      {/* 3. AeroPress */}
      {method==='aeropress'&&<g className="scene-aeropress">
        <path d="M100 114c0 28 8 40 30 40s30-12 30-40z" className="scene-aero-mug"/>
        <ellipse cx="130" cy="114" rx="29" ry="6" className="scene-aero-mug-rim"/>
        <path d="M160 122c14-2 16 22 0 22" className="scene-aero-mug-handle"/>
        <ellipse cx="130" cy="120" rx="24" ry="5" className="scene-coffee"/>
        <rect x="110" y="104" width="40" height="10" rx="2" className="scene-aero-cap"/>
        <ellipse cx="130" cy="104" rx="24" ry="4" className="scene-aero-flange"/>
        <rect x="114" y="44" width="32" height="60" className="scene-aero-chamber"/>
        <text x="122" y="62" className="scene-aero-num">4</text>
        <text x="122" y="74" className="scene-aero-num">3</text>
        <text x="122" y="86" className="scene-aero-num">2</text>
        <text x="122" y="98" className="scene-aero-num">1</text>
        <rect x="115" y="72" width="30" height="32" className="scene-aero-coffee"/>
        <g className="scene-aero-plunger-group">
          <rect x="115" y="66" width="30" height="7" rx="2" className="scene-aero-seal"/>
          <rect x="118" y="24" width="24" height="44" className="scene-aero-plunger-body"/>
          <ellipse cx="130" cy="22" rx="16" ry="5" className="scene-aero-plunger-top"/>
        </g>
        <line x1="130" y1="110" x2="130" y2="124" className="scene-stream"/>
        <g className="scene-steam-wisps">
          <path d="M122 18q-3-6 2-12" className="scene-steam-line s1"/>
          <path d="M138 18q3-6-2-12" className="scene-steam-line s2"/>
        </g>
      </g>}

      {/* 4. Espresso Machine */}
      {method==='espresso'&&<g className="scene-espresso">
        <rect x="80" y="24" width="100" height="48" rx="4" className="scene-espresso-body"/>
        <line x1="80" y1="62" x2="180" y2="62" className="scene-espresso-trim"/>
        <circle cx="106" cy="42" r="12" className="scene-gauge-face"/>
        <circle cx="106" cy="42" r="1.5" className="scene-gauge-pin"/>
        <line x1="106" y1="42" x2="114" y2="38" className="scene-gauge-needle"/>
        <circle cx="162" cy="42" r="4" className="scene-indicator-light"/>
        <rect x="115" y="70" width="30" height="10" rx="2" className="scene-grouphead"/>
        <path d="M120 78h20l-2 10h-16z" className="scene-portafilter-basket"/>
        <path d="M138 82l38 6" className="scene-portafilter-handle"/>
        <path d="M124 88v6 M136 88v6" className="scene-espresso-spouts"/>
        <line x1="124" y1="94" x2="124" y2="122" className="scene-stream stream-left"/>
        <line x1="136" y1="94" x2="136" y2="122" className="scene-stream stream-right"/>
        <ellipse cx="130" cy="148" rx="28" ry="6" className="scene-saucer"/>
        <path d="M112 116c0 20 6 28 18 28s18-8 18-28z" className="scene-demitasse"/>
        <ellipse cx="130" cy="116" rx="17" ry="4" className="scene-demitasse-rim"/>
        <ellipse cx="130" cy="118" rx="14" ry="3.5" className="scene-crema"/>
        <path d="M148 122c8-1 10 12 0 12" className="scene-demitasse-handle"/>
        <g className="scene-steam-wisps">
          <path d="M126 108q-4-8 2-16" className="scene-steam-line s1"/>
          <path d="M134 108q4-8-2-16" className="scene-steam-line s2"/>
        </g>
      </g>}

      {/* 5. Tubruk */}
      {method==='tubruk'&&<g className="scene-tubruk">
        <ellipse cx="130" cy="150" rx="46" ry="10" className="scene-tubruk-saucer"/>
        <ellipse cx="130" cy="148" rx="36" ry="7" className="scene-tubruk-saucer-rim"/>
        <path d="M98 76c0 54 8 70 32 70s32-16 32-70z" className="scene-tubruk-mug"/>
        <ellipse cx="130" cy="76" rx="32" ry="7" className="scene-tubruk-rim"/>
        <path d="M98 78c4 6 56 6 64 0" className="scene-tubruk-stripe"/>
        <path d="M162 88c18-4 20 38 0 38" className="scene-tubruk-handle"/>
        <ellipse cx="130" cy="84" rx="28" ry="6" className="scene-coffee"/>
        <path d="M112 83q10 3 18-1t18 2" className="scene-tubruk-crema"/>
        <line x1="148" y1="46" x2="124" y2="120" className="scene-spoon"/>
        <ellipse cx="149" cy="44" rx="4" ry="7" transform="rotate(22 149 44)" className="scene-spoon-head"/>
        <path d="M114 30 Q124 45 128 80" className="scene-stream"/>
        <g className="scene-bubbles">
          <circle cx="120" cy="83" r="2.5"/>
          <circle cx="136" cy="85" r="3"/>
          <circle cx="126" cy="87" r="2"/>
        </g>
        <g className="scene-steam-wisps">
          <path d="M118 64q-6-12 3-22t-3-18" className="scene-steam-line s1"/>
          <path d="M136 60q6-12-3-22t3-18" className="scene-steam-line s2"/>
        </g>
      </g>}

      {/* 6. Moka Pot */}
      {method==='moka_pot'&&<g className="scene-moka">
        <ellipse cx="130" cy="156" rx="28" ry="5" className="scene-moka-heat"/>
        <path d="M106 114l6-36h36l6 36l-8 36h-32z" className="scene-moka-boiler"/>
        <line x1="112" y1="114" x2="148" y2="114" className="scene-moka-waist"/>
        <circle cx="144" cy="128" r="3" className="scene-moka-valve"/>
        <path d="M112 76l-8-38h52l-8 38z" className="scene-moka-pitcher"/>
        <path d="M104 38l-10 8h10" className="scene-moka-spout"/>
        <path d="M104 38l26-10l26 10z" className="scene-moka-lid"/>
        <ellipse cx="130" cy="24" rx="4" ry="4" className="scene-moka-knob"/>
        <path d="M152 48c18 2 20 54 0 58" className="scene-moka-handle"/>
        <line x1="120" y1="40" x2="122" y2="74" className="scene-moka-facet"/>
        <line x1="140" y1="40" x2="138" y2="74" className="scene-moka-facet"/>
        <line x1="122" y1="80" x2="120" y2="148" className="scene-moka-facet"/>
        <line x1="138" y1="80" x2="140" y2="148" className="scene-moka-facet"/>
        <g className="scene-steam-wisps">
          <path d="M92 34q-6-8 2-16t-2-12" className="scene-steam-line s1"/>
          <path d="M130 18q-3-6 2-12" className="scene-steam-line s2"/>
        </g>
      </g>}

      {/* 7. Cold Brew */}
      {method==='cold_brew'&&<g className="scene-cold-brew">
        <rect x="98" y="44" width="64" height="108" rx="8" className="scene-cold-jar"/>
        <path d="M104 44v-8h52v8" className="scene-cold-neck"/>
        <rect x="100" y="32" width="60" height="8" rx="2" className="scene-cold-cap"/>
        <line x1="104" y1="70" x2="114" y2="70" className="scene-cold-scale"/>
        <line x1="104" y1="86" x2="118" y2="86" className="scene-cold-scale"/>
        <line x1="104" y1="102" x2="114" y2="102" className="scene-cold-scale"/>
        <line x1="104" y1="118" x2="118" y2="118" className="scene-cold-scale"/>
        <rect x="100" y="62" width="60" height="88" rx="4" className="scene-coffee"/>
        <g className="scene-ice-cubes">
          <path d="M112 70l12-6l10 8l-10 8z" className="scene-ice cube-1"/>
          <path d="M132 76l10-5l8 7l-8 7z" className="scene-ice cube-2"/>
          <path d="M120 92l10-6l10 7l-8 8z" className="scene-ice cube-3"/>
        </g>
        <ellipse cx="106" cy="95" rx="1.5" ry="3" className="scene-cold-droplet d1"/>
        <ellipse cx="154" cy="88" rx="1.2" ry="2.5" className="scene-cold-droplet d2"/>
        <ellipse cx="148" cy="118" rx="1.8" ry="4" className="scene-cold-droplet d3"/>
        <circle cx="130" cy="56" r="2.5" className="scene-slow-drip"/>
      </g>}

      <path className="scene-steam scene-steam-one" d="M193 51c-7-7 7-9 0-16m14 16c-7-7 7-9 0-16"/>
      {finished&&<g className="scene-sparkles"><path d="M173 69v10m-5-5h10M58 67v8m-4-4h8"/></g>}
    </svg>
    <span className="scene-method">{methodLabel(method)}</span>
  </Card>;
}

function ProfilePage() {
  return <main><PageHeader title="Profil pengembang" eyebrow="TENTANG PEMBUAT"/>
    <Card className="profile-card"><div className="profile-avatar">FS</div><div className="eyebrow">PENGEMBANG</div><h2>{profile.name}</h2><p>{profile.program}<br/>{profile.university}</p><div className="profile-identity"><span>NIM</span><b>{profile.nim}</b></div><a className="profile-link" href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer">@{profile.github} <ArrowRight size={15}/></a></Card>
    <Link className="profile-shortcut card" to="/archive"><span className="shortcut-icon"><ArchiveIcon size={19}/></span><span><b>Arsip</b><small>Pulihkan atau hapus data secara permanen</small></span><ChevronRight size={18}/></Link>
    <Link className="profile-shortcut card" to="/about"><span className="shortcut-icon"><Info size={19}/></span><span><b>Tentang aplikasi</b><small>Informasi SeduhLog dan teknologi</small></span><ChevronRight size={18}/></Link>
    <Link className="profile-shortcut card" to="/settings"><span className="shortcut-icon"><Settings size={19}/></span><span><b>Pengaturan aplikasi</b><small>Tema, instalasi, dan cache</small></span><ChevronRight size={18}/></Link>
  </main>;
}

function AboutPage() {
  return <main><PageHeader title="Tentang aplikasi" back eyebrow="RUANG KECIL UNTUK RASA"/>
    <Card className="about-card about-page-card"><div className="about-icon"><Coffee/></div><div className="eyebrow">TUGAS AKHIR PRAKTIKUM</div><h2>SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes</h2><p>Jurnal untuk merekam setiap seduhan, mengelola Biji Kopi, dan memahami rasa di setiap cangkir. Data saat ini digunakan bersama tanpa login.</p><div className="version-pill">Versi {__APP_VERSION__}</div><div className="tech-stack"><Badge>React</Badge><Badge>Express API</Badge><Badge>Supabase PostgreSQL</Badge><Badge>PWA</Badge></div></Card>
    <Card className="about-extra"><div className="eyebrow">DIBUAT UNTUK</div><p>Praktikum Pemrograman Perangkat Bergerak</p><p>SeduhLog membantu menyimpan resep, catatan sensori, dan koleksi Biji Kopi dalam satu jurnal digital.</p></Card>
    <a className="repo-link" href={profile.repository} target="_blank" rel="noreferrer"><Share size={16}/> Repo aplikasi di GitHub <ArrowRight size={15}/></a>
  </main>;
}

function SettingsPage() {
  const {toast,install,installPrompt,isStandalone,isIos,online,theme,setTheme}=useOutletContext();
  const queryClient=useQueryClient();
  return <main><PageHeader title="Pengaturan aplikasi" back eyebrow="SESUAIKAN PENGALAMAN"/>
    <Card className="settings-card settings-page-card"><div className="section-title"><div><div className="eyebrow">PREFERENSI</div><h2>Tampilan & perangkat</h2></div><Settings size={19}/></div>
      <div className="setting-item"><div><b>Tampilan</b><small>Sesuaikan suasana aplikasi</small></div><select aria-label="Tema tampilan" value={theme} onChange={event=>setTheme(event.target.value)}><option value="light">Terang</option><option value="dark">Gelap</option><option value="system">Ikuti sistem</option></select></div>
      <div className="setting-item"><div><b>Koneksi</b><small>{online?'Semua fitur siap digunakan':'Timer tetap dapat digunakan offline'}</small></div><span className={`connection ${online?'online':'offline'}`}>{online?<Wifi size={16}/>:<WifiOff size={16}/>} {online?'Online':'Offline'}</span></div>
      <div className="setting-item"><div><b>Pasang aplikasi</b><small>{isStandalone?'SeduhLog sudah terpasang di layar utama':isIos?'Tambahkan melalui menu Bagikan di Safari':'Tambahkan ke layar utama'}</small></div><button className="button button-small button-outline" onClick={install} disabled={isStandalone}>{isStandalone?'Terpasang':installPrompt?'Pasang':'Petunjuk'} {isStandalone?<Check size={15}/>:<Upload size={15}/>}</button></div>
      <div className="setting-item"><div><b>Bersihkan cache data</b><small>Hapus salinan data yang tersimpan</small></div><button className="button button-small button-outline" onClick={()=>{queryClient.clear();toast('Cache data berhasil dibersihkan');}}>Bersihkan</button></div>
    </Card>
    <p className="profile-note">Penghapusan cache mengosongkan data lokal yang tersimpan; data di Supabase tidak dihapus.</p>
  </main>;
}

function InstallSheet({onClose}) {
  return <div className="modal-backdrop" onClick={onClose}><section className="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={event=>event.stopPropagation()}><button className="sheet-close" aria-label="Tutup petunjuk" onClick={onClose}><X/></button><div className="share-illustration"><Share size={25}/><ArrowDown size={18}/><Plus size={22}/></div><h2 id="install-title">Cara pasang di iPhone</h2><ol className="install-steps"><li>Buka SeduhLog melalui Safari.</li><li>Ketuk ikon <b>Bagikan</b>.</li><li>Pilih <b>Tambahkan ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</li></ol><button className="button button-primary full-button" onClick={onClose}>Mengerti</button></section></div>;
}

function NotFound() {
  return <main className="not-found"><div className="empty-art"><Coffee size={40}/></div><div className="eyebrow">404 · HALAMAN TIDAK DITEMUKAN</div><h1>Sepertinya terlalu jauh dari cangkir.</h1><p>Halaman yang kamu cari tidak ada atau sudah berpindah.</p><Link className="button button-primary" to="/">Kembali ke beranda <ArrowRight size={17}/></Link></main>;
}

function RouterApp({toast,setToast,theme,setTheme}) {
  return <BrowserRouter><Routes><Route element={<AppLayout toast={toast} setToast={setToast} theme={theme} setTheme={setTheme}/>}><Route path="/" element={<AppHome/>}/><Route path="/brews" element={<BrewList/>}/><Route path="/beans" element={<BeanList/>}/><Route path="/archive" element={<ArchivePage/>}/><Route path="/timer" element={<TimerPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="/brews/new" element={<BrewForm/>}/><Route path="/brews/:id/edit" element={<BrewForm/>}/><Route path="/brews/:id" element={<BrewDetail/>}/><Route path="/beans/new" element={<BeanForm/>}/><Route path="/beans/:id/edit" element={<BeanForm/>}/><Route path="/beans/:id" element={<BeanDetail/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></BrowserRouter>;
}

export default function App() {
  const [toast,setToast]=useState({message:'',type:'success'});
  const [theme,setTheme]=useState(()=>localStorage.getItem('seduhlog-theme')||'system');
  const [showSplash,setShowSplash]=useState(true);
  useLayoutEffect(()=>{
    const root=document.documentElement;
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme=()=>{root.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;};
    applyTheme();
    localStorage.setItem('seduhlog-theme',theme);
    media.addEventListener?.('change',applyTheme);
    return()=>media.removeEventListener?.('change',applyTheme);
  },[theme]);
  useEffect(()=>{if(!toast.message)return undefined;const timeout=setTimeout(()=>setToast({message:'',type:'success'}),3500);return()=>clearTimeout(timeout);},[toast]);
  return <>
    <div inert={showSplash ? '' : undefined} aria-hidden={showSplash ? 'true' : undefined}>
      <RouterApp toast={toast} setToast={setToast} theme={theme} setTheme={setTheme}/>
    </div>
    {showSplash && <SplashScreen onEnter={() => setShowSplash(false)}/>}
  </>;
}

