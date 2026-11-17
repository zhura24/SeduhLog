import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Activity, ArrowDown, ArrowLeft, ArrowRight, Bean as BeanIcon, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Flame, Heart, Home, Info, Leaf, Minus, Moon, MoreHorizontal, Pause, Play, Plus, RotateCcw, Search, Settings, Share, SlidersHorizontal, Sparkles, Star, Sun, Timer as TimerIcon, Trash2, Upload, Wifi, WifiOff, X } from 'lucide-react';
import { api, jsonBody, ApiError } from './lib/api.js';
import { calculateRatio, grindLabel, methodLabel, methods } from './lib/methods.js';
import { useBrewTimer } from './hooks/useBrewTimer.js';
import { profile } from './config/profile.js';

const queryKeys = { beans: ['beans'], brews: ['brews'], stats: ['stats'], methods: ['methods'] };
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

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function AppLayout({ toast, setToast }) {
  const location = useLocation();
  const online = useOnline();
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [iosInstall, setIosInstall] = useState(false);
  const [installBanner, setInstallBanner] = useState(!localStorage.getItem('seduhlog-install-dismissed'));
  const queryClient = useQueryClient();
  const isForm = /\/(new|edit)$/.test(location.pathname);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  useEffect(() => {
    fetchData('/health').catch(() => {});
    const onPrompt = event => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone;
    setIosInstall(isIos);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [isStandalone]);
  const install = async () => {
    if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); }
    else if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone) setIosInstall(true);
  };
  const dismissBanner = () => { localStorage.setItem('seduhlog-install-dismissed', '1'); setInstallBanner(false); };
  const context = { toast: (message, type = 'success') => setToast({ message, type }), install, installPrompt, iosInstall, online };

  return <div className="app-shell">
    {!online && <div className="network-banner"><WifiOff size={15} /> Mode offline · Timer dan kalkulator tetap tersedia</div>}
    {needRefresh[0] && <button className="update-banner" onClick={() => updateServiceWorker(true)}>Versi baru tersedia, Muat ulang <ArrowRight size={16} /></button>}
    <div className="page-frame"><Outlet context={context} /></div>
    {!isForm && <BottomNav />}
    {!isForm && !isStandalone && installPrompt && installBanner && location.pathname === '/' && <div className="install-banner"><span><Coffee size={18} /> Pasang SeduhLog di perangkatmu</span><button onClick={install}>Pasang</button><button aria-label="Tutup" onClick={dismissBanner}><X size={16}/></button></div>}
    {iosInstall && !isStandalone && location.pathname === '/settings' && <InstallSheet onClose={() => setIosInstall(false)} />}
    {toast.message && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} role="status">{toast.type === 'error' ? <CircleHelp size={18}/> : <Check size={18}/>} {toast.message}<button aria-label="Tutup notifikasi" onClick={() => setToast({message:'',type:'success'})}><X size={16}/></button></div>}
    <button className="sr-only" onClick={() => queryClient.clear()}>Bersihkan cache</button>
  </div>;
}

function BottomNav() {
  const tabs = [
    { to: '/', label: 'Beranda', icon: Home, end: true },
    { to: '/brews', label: 'Seduhan', icon: BookOpen },
    { to: '/beans', label: 'Biji', icon: BeanIcon },
    { to: '/timer', label: 'Timer', icon: TimerIcon },
    { to: '/profile', label: 'Profil', icon: MoreHorizontal }
  ];
  return <nav className="bottom-nav" aria-label="Navigasi utama">{tabs.map(({to,label,icon:Icon,end}) =>
    <NavLink key={to} to={to} end={end} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} aria-label={label}>{({isActive}) => <><Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}/><span>{label}</span></>}
    </NavLink>)}</nav>;
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
function Fab({ to, label }) { return <Link to={to} className="fab" aria-label={label}><Plus size={25}/></Link>; }

function BeanThumb({ bean, small = false }) {
  return bean?.imageUrl
    ? <img className={`bean-thumb ${small ? 'small' : ''}`} src={bean.imageUrl} alt={bean.name}/>
    : <div className={`bean-thumb bean-placeholder ${small ? 'small' : ''}`} aria-label={bean?.name || 'Biji kopi'}>{(bean?.name || 'S').slice(0,1).toUpperCase()}</div>;
}

function AppHome() {
  const { toast, install, installPrompt } = useOutletContext();
  const stats = useQuery({ queryKey: queryKeys.stats, queryFn: () => fetchData('/stats') });
  const brews = useQuery({ queryKey: [...queryKeys.brews, 'recent'], queryFn: () => fetchData('/brews?limit=3') });
  const value = stats.data || {};
  const method = methodLabel(value.favoriteMethod);
  return <main>
    <div className="home-greeting"><div><div className="eyebrow">JURNAL SEDUHMU</div><h1>Selamat {new Date().getHours() < 11 ? 'pagi' : new Date().getHours() < 15 ? 'siang' : 'menikmati sore'}.</h1><p>{new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p></div><div className="greeting-mark"><Coffee size={25}/></div></div>
    <DataState query={stats}>{value.totalBrews === 0 ? <EmptyState title="Mulai dari satu seduhan" description="Catat racikan pertamamu, lalu temukan pola rasa favoritmu." to="/timer" action="Mulai seduh"/> : <>
      <div className="stats-grid">
        <StatCard label="Total seduhan" value={value.totalBrews} icon={Coffee}/>
        <StatCard label="Rata-rata rating" value={value.avgRating ? `${value.avgRating} / 5` : '—'} icon={Star}/>
        <StatCard label="Metode favorit" value={method} icon={Flame}/>
        <StatCard label="Biji teratas" value={value.topBean?.name || '—'} icon={BeanIcon} detail={value.topBean ? `${value.topBean.count} seduhan` : ''}/>
      </div>
      <Card className="chart-card"><div className="section-title"><div><div className="eyebrow">KONSISTENSI</div><h2>Seduhan per minggu</h2></div><span className="trend-label"><Activity size={14}/> 8 minggu</span></div><BarChart data={value.brewsPerWeek || []}/></Card>
      <div className="section-title recent-heading"><div><div className="eyebrow">DARI JURNALMU</div><h2>Seduhan terbaru</h2></div><Link to="/brews" className="text-link">Semua <ArrowRight size={15}/></Link></div>
      <DataState query={brews}>{brews.data?.length ? brews.data.map(item => <BrewCard key={item.id} brew={item} compact/>) : <div className="empty-inline">Belum ada seduhan tercatat.</div>}</DataState>
    </>}</DataState>
    <Link to="/timer" className="hero-cta"><span className="hero-icon"><TimerIcon size={22}/></span><span><b>Mulai Seduh</b><small>Timer dan panduan seduh</small></span><ArrowRight size={19}/></Link>
    {installPrompt && <button className="install-inline" onClick={install}><Upload size={16}/> Pasang aplikasi SeduhLog</button>}
    <footer className="home-footer">Diseduh dengan sabar, dicatat dengan rasa.</footer>
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
  return <main><PageHeader title="Jurnal seduhan" eyebrow="RACIKAN & RASA" action={<Link className="header-add" to="/brews/new" aria-label="Tambah seduhan"><Plus/></Link>}/>
    <label className="search-box"><Search size={18}/><input aria-label="Cari seduhan" placeholder="Cari catatan atau rasa..." value={search} onChange={event => setSearch(event.target.value)}/>{search && <button aria-label="Hapus pencarian" onClick={() => setSearch('')}><X size={16}/></button>}</label>
    <div className="filter-row">{methods.map(item => <Chip key={item.method} selected={method === item.method} onClick={() => setMethod(method === item.method ? '' : item.method)}>{item.label}</Chip>)}</div>
    <div className="list-tools"><button className={`favorite-filter ${favorite ? 'selected' : ''}`} onClick={() => setFavorite(!favorite)}><Heart size={16} fill={favorite ? 'currentColor' : 'none'}/> Favorit</button><select aria-label="Urutkan seduhan" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="rating">Rating tertinggi</option></select></div>
    <DataState query={query} empty="Belum ada seduhan yang cocok.">{items.length ? <div className="stack">{items.map(item => <BrewCard key={item.id} brew={item}/>)}</div> : null}</DataState>
    {query.hasNextPage && <button className="button button-outline load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Memuat...' : 'Muat lebih banyak'}<ArrowDown size={16}/></button>}
    <Fab to="/brews/new" label="Tambah seduhan"/>
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
  return <main><PageHeader title="Koleksi biji" eyebrow="ASAL & KARAKTER" action={<Link className="header-add" to="/beans/new" aria-label="Tambah biji"><Plus/></Link>}/>
    <label className="search-box"><Search size={18}/><input aria-label="Cari biji" placeholder="Nama, asal, atau roaster..." value={search} onChange={event => setSearch(event.target.value)}/></label>
    <div className="filter-row">{[['washed','Washed'],['natural','Natural'],['honey','Honey'],['anaerobic','Anaerobic']].map(([value,label])=><Chip key={value} selected={process===value} onClick={()=>setProcess(process===value?'':value)}>{label}</Chip>)}</div>
    <div className="filter-row compact-filter">{[['light','Light'],['medium','Medium'],['dark','Dark']].map(([value,label])=><Chip key={value} selected={roast===value} onClick={()=>setRoast(roast===value?'':value)}>{label} roast</Chip>)}</div>
    <div className="list-tools"><span className="list-count"><Leaf size={15}/> Pilihan dari rakmu</span><select aria-label="Urutkan biji" value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Terbaru</option><option value="name">Nama A–Z</option></select></div>
    <DataState query={query} empty="Belum ada biji yang cocok.">{items.length ? <div className="stack">{items.map(bean => <Link to={`/beans/${bean.id}`} className="bean-card card" key={bean.id}><BeanThumb bean={bean}/><div className="bean-card-body"><b>{bean.name}</b><span>{bean.origin}</span><div className="bean-badges"><Badge>{bean.process}</Badge><Badge tone="warm">{bean.roastLevel}</Badge></div><div className="flavor-row">{(bean.flavorNotes||[]).slice(0,3).map(note=><span key={note}>{note}</span>)}{bean.flavorNotes?.length>3&&<span>+{bean.flavorNotes.length-3}</span>}</div></div><div className="bean-count">{bean.brewCount || 0}<small>seduhan</small></div><ChevronRight className="row-chevron" size={17}/></Link>)}</div> : null}</DataState>
    {query.hasNextPage && <button className="button button-outline load-more" onClick={()=>query.fetchNextPage()}>Muat lebih banyak <ArrowDown size={16}/></button>}
    <Fab to="/beans/new" label="Tambah biji"/>
  </main>;
}

function ConfirmDialog({ title, description, onConfirm, onCancel, pending }) {
  return <div className="modal-backdrop" role="presentation"><section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-icon"><Trash2/></div><h2 id="dialog-title">{title}</h2><p>{description}</p><div className="dialog-actions"><button className="button button-outline" onClick={onCancel}>Batal</button><button className="button button-danger" onClick={onConfirm} disabled={pending}>{pending?'Menghapus...':'Hapus'}</button></div></section></div>;
}

function BrewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useOutletContext();
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({ queryKey: [...queryKeys.brews, id], queryFn: () => fetchData(`/brews/${id}`) });
  const remove = useMutation({ mutationFn: () => api(`/brews/${id}`, {method:'DELETE'}), onSuccess: () => { queryClient.invalidateQueries({queryKey:queryKeys.brews}); queryClient.invalidateQueries({queryKey:queryKeys.stats}); toast('Seduhan dihapus'); navigate('/brews'); }, onError: error => toast(error.message,'error') });
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
    <Link className="related-link" to={`/beans/${brew.bean?.id}`}><BeanIcon size={18}/> Lihat detail biji <ArrowRight size={16}/></Link>
    <div className="detail-actions"><Link className="button button-outline" to={`/brews/${id}/edit`}>Ubah catatan</Link><button className="button button-danger-soft" onClick={()=>setConfirm(true)}>Hapus</button></div>
    <button className="button button-primary full-button" onClick={()=>navigate('/timer',{state:{method:brew.method,doseGrams:brew.doseGrams,waterGrams:brew.waterGrams,waterTempC:brew.waterTempC}})}><RotateCcw size={17}/> Seduh lagi</button>
  </div>}</DataState>{confirm&&<ConfirmDialog title="Hapus catatan ini?" description="Catatan seduhan yang dihapus tidak dapat dikembalikan." onCancel={()=>setConfirm(false)} onConfirm={()=>remove.mutate()} pending={remove.isPending}/>}</main>;
}
function Param({ label, value }) { return <div className="parameter"><span>{label}</span><b>{value}</b></div>; }
const labels={aroma:'Aroma',flavor:'Rasa',acidity:'Keasaman',body:'Body',sweetness:'Kemanisan',aftertaste:'Aftertaste',balance:'Keseimbangan'};
const scoreLabel=key=>labels[key]||key;
function formatTime(seconds) { if(seconds===undefined||seconds===null||seconds==='')return '—'; return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }

function BeanDetail() {
  const {id}=useParams(); const navigate=useNavigate(); const queryClient=useQueryClient(); const {toast}=useOutletContext(); const [confirm,setConfirm]=useState(false);
  const query=useQuery({queryKey:[...queryKeys.beans,id],queryFn:()=>fetchData(`/beans/${id}`)});
  const remove=useMutation({mutationFn:()=>api(`/beans/${id}`,{method:'DELETE'}),onSuccess:()=>{queryClient.invalidateQueries({queryKey:queryKeys.beans});toast('Biji berhasil dihapus');navigate('/beans');},onError:error=>{setConfirm(false);toast(error.message,'error');}});
  const bean=query.data;
  return <main><PageHeader title="Detail biji" back/><DataState query={query}>{bean&&<div className="detail-enter">
    <Card className="bean-detail-hero"><BeanThumb bean={bean}/><div className="eyebrow">{bean.roaster||'Koleksi SeduhLog'}</div><h2>{bean.name}</h2><p>{bean.origin}</p><div className="chip-list"><Badge>{bean.process}</Badge><Badge tone="warm">{bean.roastLevel} roast</Badge>{bean.variety&&<Badge>{bean.variety}</Badge>}</div></Card>
    <div className="stats-grid bean-stats"><StatCard label="Total seduhan" value={bean.brewCount} icon={Coffee}/><StatCard label="Rating rata-rata" value={bean.avgRating?`${bean.avgRating} / 5`:'—'} icon={Star}/></div>
    <Card className="bean-info"><h3>Informasi biji</h3><Param label="Ketinggian" value={bean.altitudeMasl?`${bean.altitudeMasl} mdpl`:'—'}/><Param label="Tanggal sangrai" value={bean.roastDate?dateLabel(bean.roastDate):'—'}/>{bean.notes&&<p>{bean.notes}</p>}</Card>
    {bean.flavorNotes?.length>0&&<div className="detail-block"><h3>Catatan rasa</h3><div className="chip-list">{bean.flavorNotes.map(note=><span className="taste-chip" key={note}>{note}</span>)}</div></div>}
    <div className="section-title"><h2>Seduhan dengan biji ini</h2></div>{bean.recentBrews?.length?bean.recentBrews.map(brew=><BrewCard key={brew.id} brew={brew} compact/>):<div className="empty-inline">Belum pernah diseduh.</div>}
    <Link className="button button-primary full-button" to={`/brews/new?beanId=${bean.id}`}><Coffee size={17}/> Seduh dengan biji ini</Link>
    <div className="detail-actions"><Link className="button button-outline" to={`/beans/${id}/edit`}>Ubah biji</Link><button className="button button-danger-soft" onClick={()=>setConfirm(true)}>Hapus</button></div>
  </div>}</DataState>{confirm&&<ConfirmDialog title="Hapus biji ini?" description="Biji yang masih digunakan oleh seduhan tidak dapat dihapus." onCancel={()=>setConfirm(false)} onConfirm={()=>remove.mutate()} pending={remove.isPending}/>}</main>;
}

function BeanForm() {
  const {id}=useParams(); const editing=Boolean(id); const navigate=useNavigate(); const queryClient=useQueryClient(); const {toast}=useOutletContext();
  const existing=useQuery({queryKey:[...queryKeys.beans,id],queryFn:()=>fetchData(`/beans/${id}`),enabled:editing});
  const [form,setForm]=useState({name:'',origin:'',roaster:'',process:'washed',roastLevel:'medium',variety:'',altitudeMasl:'',roastDate:'',flavorNotes:[],imageUrl:'',notes:''});
  const [flavor,setFlavor]=useState(''); const [errors,setErrors]=useState({});
  useEffect(()=>{if(existing.data)setForm({...existing.data,altitudeMasl:existing.data.altitudeMasl??'',roastDate:existing.data.roastDate?.slice(0,10)||''});},[existing.data]);
  const save=useMutation({mutationFn:data=>editing?jsonMutation(`/beans/${id}`,'PUT',data):jsonMutation('/beans','POST',data),onSuccess:result=>{queryClient.invalidateQueries({queryKey:queryKeys.beans});toast(editing?'Biji diperbarui':'Biji ditambahkan');navigate(`/beans/${result.data.id}`);},onError:error=>{setErrors(Object.fromEntries((error.errors||[]).map(item=>[item.field,item.message])));toast(error.message,'error');}});
  const set=(key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:''}));};
  const addFlavor=()=>{const value=flavor.trim();if(value&&form.flavorNotes.length<8&&!form.flavorNotes.includes(value)){set('flavorNotes',[...form.flavorNotes,value]);setFlavor('');}};
  const submit=event=>{event.preventDefault();const next={};if(form.name.trim().length<2)next.name='Nama minimal 2 karakter';if(!form.origin.trim())next.origin='Asal wajib diisi';if(form.imageUrl&&!/^https?:\/\/.+/i.test(form.imageUrl))next.imageUrl='Masukkan URL http(s) yang valid';setErrors(next);if(!Object.keys(next).length)save.mutate({...form,altitudeMasl:form.altitudeMasl===''?undefined:Number(form.altitudeMasl),roastDate:form.roastDate||undefined});};
  return <main className="form-page"><PageHeader title={editing?'Ubah biji':'Tambah biji'} back eyebrow="KOLEKSI KOPI"/>{editing&&existing.isPending?<Loading rows={4}/>:<form className="form-content" onSubmit={submit} noValidate>
    <div className="field"><label htmlFor="bean-name">Nama biji *</label><input id="bean-name" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Contoh: Gayo Honey"/>{errors.name&&<small className="field-error">{errors.name}</small>}</div>
    <div className="field"><label htmlFor="bean-origin">Asal *</label><input id="bean-origin" value={form.origin} onChange={e=>set('origin',e.target.value)} placeholder="Contoh: Gayo, Aceh"/>{errors.origin&&<small className="field-error">{errors.origin}</small>}</div>
    <div className="field"><label htmlFor="bean-roaster">Roaster</label><input id="bean-roaster" value={form.roaster||''} onChange={e=>set('roaster',e.target.value)} placeholder="Nama roastery"/></div>
    <div className="field-row"><div className="field"><label htmlFor="bean-process">Proses</label><select id="bean-process" value={form.process} onChange={e=>set('process',e.target.value)}>{['washed','natural','honey','anaerobic','lainnya'].map(x=><option key={x} value={x}>{x}</option>)}</select></div><div className="field"><label htmlFor="bean-roast">Level sangrai</label><select id="bean-roast" value={form.roastLevel} onChange={e=>set('roastLevel',e.target.value)}>{['light','medium','dark'].map(x=><option key={x} value={x}>{x}</option>)}</select></div></div>
    <div className="field-row"><div className="field"><label htmlFor="bean-variety">Varietas</label><input id="bean-variety" value={form.variety||''} onChange={e=>set('variety',e.target.value)}/></div><div className="field"><label htmlFor="bean-altitude">Ketinggian (mdpl)</label><input id="bean-altitude" type="number" min="0" max="3000" value={form.altitudeMasl} onChange={e=>set('altitudeMasl',e.target.value)}/></div></div>
    <div className="field"><label htmlFor="bean-roast-date">Tanggal sangrai</label><input id="bean-roast-date" type="date" value={form.roastDate||''} onChange={e=>set('roastDate',e.target.value)}/></div>
    <div className="field"><label htmlFor="bean-image">URL gambar (opsional)</label><input id="bean-image" type="url" value={form.imageUrl||''} onChange={e=>set('imageUrl',e.target.value)} placeholder="https://..."/>{errors.imageUrl&&<small className="field-error">{errors.imageUrl}</small>}</div>
    <div className="field"><label>Catatan rasa (maks. 8)</label><div className="chip-entry"><input value={flavor} onChange={e=>setFlavor(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addFlavor();}}} placeholder="Ketik lalu tekan Enter"/><button type="button" onClick={addFlavor}><Plus size={17}/></button></div><div className="chip-list">{form.flavorNotes.map(item=><button type="button" className="taste-chip removable" key={item} onClick={()=>set('flavorNotes',form.flavorNotes.filter(x=>x!==item))}>{item}<X size={13}/></button>)}</div></div>
    <div className="field"><label htmlFor="bean-notes">Catatan tambahan</label><textarea id="bean-notes" maxLength="500" rows="3" value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></div>
    <button className="button button-primary sticky-save" disabled={save.isPending}>{save.isPending?'Menyimpan...':'Simpan biji'} <Check size={18}/></button>
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
  const save=useMutation({mutationFn:data=>editing?jsonMutation(`/brews/${id}`,'PUT',data):jsonMutation('/brews','POST',data),onSuccess:result=>{queryClient.invalidateQueries({queryKey:queryKeys.brews});queryClient.invalidateQueries({queryKey:queryKeys.stats});queryClient.invalidateQueries({queryKey:queryKeys.beans});toast('Seduhan tersimpan');navigate(`/brews/${result.data.id}`);},onError:error=>{setErrors(Object.fromEntries((error.errors||[]).map(item=>[item.field,item.message])));toast(error.message,'error');}});
  const update=(key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:''}));};
  const applyMethod=value=>{const preset=methods.find(item=>item.method===value);update('method',value);if(!editing&&preset)setForm(current=>({...current,method:value,waterTempC:preset.temperature,grindSize:preset.grind,waterGrams:Math.round(current.doseGrams*preset.ratio)}));};
  const addTaste=value=>{const tag=(value||taste).trim();if(tag&&!form.tasteTags.includes(tag)&&form.tasteTags.length<8){update('tasteTags',[...form.tasteTags,tag]);setTaste('');}};
  const submit=event=>{event.preventDefault();const next={};if(!form.bean)next.bean='Pilih biji kopi';if(!form.rating)next.rating='Pilih rating';if(form.doseGrams<5||form.doseGrams>100)next.doseGrams='Dosis harus 5–100 gram';if(form.waterGrams<20||form.waterGrams>2000)next.waterGrams='Air harus 20–2000 gram';setErrors(next);if(Object.keys(next).length)return;const data={...form,bean:form.bean,doseGrams:Number(form.doseGrams),waterGrams:Number(form.waterGrams),waterTempC:form.waterTempC===''?undefined:Number(form.waterTempC),grindSize:form.grindSize||undefined,brewTimeSeconds:form.brewTimeSeconds===''?undefined:Number(form.brewTimeSeconds),tdsPercent:form.tdsPercent===''?undefined:Number(form.tdsPercent),brewedAt:form.brewedAt?new Date(form.brewedAt).toISOString():undefined};save.mutate(data);};
  return <main className="form-page"><PageHeader title={editing?'Ubah seduhan':'Catat seduhan'} back eyebrow="JURNAL SEDUH"/>{(editing&&existing.isPending)||beanQuery.isPending?<Loading rows={5}/>:<form className="form-content" onSubmit={submit} noValidate>
    <div className="field"><label htmlFor="brew-bean">Biji kopi *</label><select id="brew-bean" value={form.bean} onChange={e=>update('bean',e.target.value)}><option value="">Pilih biji</option>{beans.map(bean=><option key={bean.id} value={bean.id}>{bean.name} · {bean.origin}</option>)}</select>{errors.bean&&<small className="field-error">{errors.bean}</small>}<Link className="helper-link" to="/beans/new">+ Tambah biji baru</Link></div>
    <div className="field"><label>Metode seduh</label><div className="method-grid">{methods.map(item=><button type="button" key={item.method} className={`method-option ${form.method===item.method?'selected':''}`} onClick={()=>applyMethod(item.method)}><Coffee size={17}/>{item.label}</button>)}</div></div>
    <div className="field-row"><div className="field"><label htmlFor="dose">Dosis (g) *</label><input id="dose" type="number" min="5" max="100" step="0.1" value={form.doseGrams} onChange={e=>update('doseGrams',safeNumber(e.target.value))}/>{errors.doseGrams&&<small className="field-error">{errors.doseGrams}</small>}</div><div className="field"><label htmlFor="water">Air (g) *</label><input id="water" type="number" min="20" max="2000" step="1" value={form.waterGrams} onChange={e=>update('waterGrams',safeNumber(e.target.value))}/>{errors.waterGrams&&<small className="field-error">{errors.waterGrams}</small>}</div></div>
    <div className="ratio-preview"><span>Rasio seduh</span><b>1:{(Number(form.waterGrams||0)/Math.max(Number(form.doseGrams||1),1)).toFixed(1)}</b></div>
    <div className="field-row"><div className="field"><label htmlFor="temp">Suhu air (°C)</label><input id="temp" type="number" min="0" max="100" value={form.waterTempC} onChange={e=>update('waterTempC',safeNumber(e.target.value))}/></div><div className="field"><label htmlFor="grind">Ukuran giling</label><select id="grind" value={form.grindSize||''} onChange={e=>update('grindSize',e.target.value)}><option value="">Pilih</option>{['extra_fine','fine','medium_fine','medium','medium_coarse','coarse'].map(v=><option key={v} value={v}>{grindLabel(v)}</option>)}</select></div></div>
    <div className="field-row"><div className="field"><label htmlFor="grinder-setting">Setting grinder</label><input id="grinder-setting" value={form.grinderSetting||''} onChange={e=>update('grinderSetting',e.target.value)} placeholder="21 klik"/></div><div className="field"><label htmlFor="brew-time">Waktu (detik)</label><input id="brew-time" type="number" min="0" max="86400" value={form.brewTimeSeconds} onChange={e=>update('brewTimeSeconds',safeNumber(e.target.value))}/></div></div>
    <div className="field"><label htmlFor="tds">TDS (%)</label><input id="tds" type="number" min="0" max="20" step="0.01" value={form.tdsPercent} onChange={e=>update('tdsPercent',safeNumber(e.target.value))}/></div>
    <div className="field"><label>Rating *</label><div className="rating-picker" role="radiogroup" aria-label="Pilih rating">{[1,2,3,4,5].map(value=><button key={value} type="button" aria-label={`${value} bintang`} aria-checked={form.rating===value} role="radio" onClick={()=>update('rating',value)}><Star fill={value<=form.rating?'currentColor':'none'} size={29}/></button>)}</div>{errors.rating&&<small className="field-error">{errors.rating}</small>}</div>
    <button type="button" className="accordion-toggle" onClick={()=>setShowCupping(!showCupping)}><span>Catatan cupping <small>(opsional)</small></span>{showCupping?<Minus size={17}/>:<Plus size={17}/>}</button>
    {showCupping&&<div className="cupping-form">{Object.entries(labels).map(([key,label])=><label className="rating-slider" key={key}><span>{label}<b>{form.cupping[key]||5}</b></span><input aria-label={label} type="range" min="1" max="10" value={form.cupping[key]||5} onChange={e=>update('cupping',{...form.cupping,[key]:Number(e.target.value)})}/></label>)}</div>}
    <div className="field"><label>Tag rasa</label><div className="chip-list suggestion-list">{['Cokelat','Karamel','Buah beri','Jeruk','Floral','Kacang','Rempah','Manis madu','Earthy','Asam segar'].map(item=><Chip key={item} selected={form.tasteTags.includes(item)} onClick={()=>form.tasteTags.includes(item)?update('tasteTags',form.tasteTags.filter(x=>x!==item)):addTaste(item)}>{item}</Chip>)}</div><div className="chip-entry"><input value={taste} onChange={e=>setTaste(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTaste();}}} placeholder="Tag lainnya..."/><button type="button" onClick={()=>addTaste()}><Plus size={17}/></button></div></div>
    <div className="field"><label htmlFor="brew-notes">Catatan</label><textarea id="brew-notes" maxLength="1000" rows="4" value={form.notes||''} onChange={e=>update('notes',e.target.value)} placeholder="Apa yang kamu rasakan?"/></div>
    <div className="field"><label htmlFor="brewed-at">Tanggal dan waktu</label><input id="brewed-at" type="datetime-local" value={form.brewedAt} onChange={e=>update('brewedAt',e.target.value)}/></div>
    <button className="button button-primary sticky-save" disabled={save.isPending}>{save.isPending?'Menyimpan...':'Simpan seduhan'} <Check size={18}/></button>
  </form>}</main>;
}

function TimerPage() {
  const navigate=useNavigate(); const location=useLocation(); const [section,setSection]=useState('timer');
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
  return <main><PageHeader title="Ruang seduh" eyebrow="RACIK DENGAN TENANG"/>
    <div className="segmented"><button className={section==='timer'?'active':''} onClick={()=>setSection('timer')}><TimerIcon size={16}/> Timer</button><button className={section==='calculator'?'active':''} onClick={()=>setSection('calculator')}><SlidersHorizontal size={16}/> Kalkulator</button></div>
    {section==='calculator'?<section className="calculator-view">
      <Card className="calculator-card"><div className="eyebrow">KALKULATOR RASIO</div><h2>Temukan takaranmu.</h2><p>Atur dosis dan rasio untuk menghitung kebutuhan air.</p>
        <div className="field"><label htmlFor="calc-method">Preset metode</label><select id="calc-method" value={methodKey} onChange={event=>changeMethod(event.target.value)}>{methods.map(item=><option key={item.method} value={item.method}>{item.label} · 1:{item.ratio}</option>)}</select></div>
        <div className="field-row"><div className="field"><label htmlFor="calc-dose">Dosis kopi (g)</label><input id="calc-dose" type="number" min="1" value={dose} onChange={event=>updateDose(Number(event.target.value))}/></div><div className="field"><label htmlFor="calc-water">Air (g)</label><input id="calc-water" type="number" min="1" value={water} onChange={event=>updateWater(Number(event.target.value))}/></div></div>
        <div className="ratio-result"><span>Rasio seduh</span><strong>1 : {ratio.toFixed(1)}</strong><small>Suhu rekomendasi {selected.temperature}°C</small></div>
        <div className="ratio-lock"><button className="button button-outline" onClick={()=>{setRatio(selected.ratio);setWater(Math.round(dose*selected.ratio));}}>Hitung air dari dosis</button><button className="button button-outline" onClick={()=>{setRatio(selected.ratio);setDose(Math.round(water/selected.ratio*10)/10);}}>Hitung dosis dari air</button></div>
      </Card><p className="calculator-note"><Info size={15}/> Rasio dapat disesuaikan sesuai biji dan selera.</p>
    </section>:<section className="timer-view">
      <div className="timer-controls-top"><label htmlFor="timer-method">METODE SEDUH</label><select id="timer-method" value={methodKey} onChange={event=>changeMethod(event.target.value)}>{methods.map(item=><option key={item.method} value={item.method}>{item.label}</option>)}</select></div>
      <Card className="timer-card">
        <svg className="timer-ring" viewBox="0 0 220 220" role="img" aria-label={`Timer ${formatTime(timer.elapsed)}`}><circle className="ring-bg" cx="110" cy="110" r="96"/><circle className="ring-progress" cx="110" cy="110" r="96" style={{strokeDashoffset:603*(1-progress)}}/></svg>
        <div className="timer-display"><div className="eyebrow">{selected.label.toUpperCase()}</div><strong>{formatTime(timer.elapsed)}</strong><span>{selected.steps.length?'WAKTU BERJALAN':'STOPWATCH'}</span></div>
      </Card>
      <BrewScene method={methodKey} stepIndex={timer.stepIndex} running={timer.running} finished={timer.finished} title={sceneTitle} caption={sceneCaption}/>
      <Card className="timer-step-card">{methodKey==='cold_brew'?<><div className="step-number"><Moon size={18}/></div><div><b>Seduh dingin 12–18 jam</b><p>Timer langkah tidak tersedia untuk cold brew.</p></div></>:<><div className="step-number">{timer.finished?<Check size={18}/>:String(Math.min(timer.stepIndex+1,Math.max(selected.steps.length,1))).padStart(2,'0')}</div><div className="step-copy"><small>{timer.finished?'SELESAI':'LANGKAH SAAT INI'}</small><b>{timer.finished?'Seduhan siap dinikmati':step?.name||'Stopwatch siap dimulai'}</b><p>{selected.steps.length?(step?`Tuang sampai ${targetWater} g · ${formatTime(step.end)}`:'Semua langkah selesai'):'Atur waktu seduhmu secara manual'}</p>{selected.steps[timer.stepIndex+1]&&<span>Selanjutnya: {selected.steps[timer.stepIndex+1].name}</span>}</div><button className="skip-step" aria-label="Lewati langkah" onClick={timer.skipStep} disabled={!selected.steps.length}><ChevronRight/></button></>}</Card>
      <div className="timer-dose-row"><label>Dosis <input type="number" min="1" value={dose} onChange={event=>updateDose(Number(event.target.value))}/> g</label><label>Rasio 1:<input type="number" min="1" value={ratio} onChange={event=>{setRatio(Number(event.target.value));setWater(Math.round(dose*Number(event.target.value)));}}/></label><span>Air total <b>{Math.round(dose*ratio)} g</b></span></div>
      {timer.finished?<div className="timer-actions"><button className="button button-primary timer-main-action" onClick={()=>navigate('/brews/new',{state:{method:methodKey,doseGrams:dose,waterGrams:Math.round(dose*ratio),waterTempC:selected.temperature,brewTimeSeconds:timer.elapsed}})}><BookOpen size={18}/> Simpan sebagai seduhan</button><button className="timer-reset" aria-label="Reset timer" onClick={timer.reset}><RotateCcw size={19}/></button></div>:methodKey==='cold_brew'?<p className="timer-tip">Timer dinonaktifkan untuk metode cold brew.</p>:<div className="timer-actions">{!timer.running?<button className="button button-primary timer-main-action" onClick={timer.start}><Play size={18} fill="currentColor"/> {timer.elapsed?'Lanjut':'Mulai'}</button>:<button className="button button-primary timer-main-action" onClick={timer.pause}><Pause size={18} fill="currentColor"/> Jeda</button>}<button className="timer-reset" aria-label="Reset timer" onClick={timer.reset}><RotateCcw size={19}/></button>{timer.elapsed>0&&<button className="timer-reset" aria-label="Lewati langkah" onClick={timer.skipStep}><ChevronRight size={19}/></button>}</div>}
      <p className="timer-tip"><Clock3 size={15}/> Timer tetap akurat saat kamu berpindah aplikasi.</p>
    </section>}
  </main>;
}

function BrewScene({method,stepIndex,running,finished,title,caption}) {
  const sceneClass=`brew-scene scene-${method} phase-${stepIndex} ${running?'is-running':''} ${finished?'is-finished':''}`;
  return <Card className={sceneClass} aria-label={`Ilustrasi proses ${methodLabel(method)}`}>
    <div className="scene-copy"><span className="scene-live"><i/> {running?'SEDANG BERLANGSUNG':finished?'SELESAI':method==='cold_brew'?'PANDUAN SEDUH':'PANDUAN LANGKAH'}</span><b>{title}</b><p>{caption}</p></div>
    <svg className={`scene-art scene-art-${method}`} viewBox="0 0 260 170" role="img" aria-label={`${methodLabel(method)}: ${title}`} preserveAspectRatio="xMidYMid meet">
      <ellipse className="scene-glow" cx="130" cy="159" rx="108" ry="9"/>
      <path className="scene-table" d="M18 162h224" />
      {method==='v60'&&<g className="scene-v60" transform="translate(20 8) scale(1.35)">
        <path className="scene-server" d="M111 83h47l-4 18c-2 9-9 14-20 14s-18-5-20-14z"/><path className="scene-server-handle" d="M157 88h8c10 0 10 18 0 18h-10"/>
        <path className="scene-server-coffee" d="M115 98h39l-2 9c-10 7-25 7-35 0z"/>
        <path className="scene-vessel" d="M28 34h37c7 0 11 5 10 11l-4 24H24l-4-24c-1-6 2-11 8-11z"/>
        <path className="scene-handle" d="M70 41h8c11 0 11 19 0 19h-9"/><path className="scene-spout" d="m29 41-18 12 13 5"/><path className="scene-lid" d="M32 29h30"/>
        <path className="scene-stream" d="M83 56c15 2 20 7 28 15"/>
        <path className="scene-filter" d="m102 64 13 34h42l13-34z"/>
        <path className="scene-ridge" d="m110 67 11 28m1-29 6 29m9-29 1 29m10-29-4 29m13-29-9 29"/>
        <path className="scene-coffee" d="M109 82h42l-4 14h-34z"/>
        <path className="scene-bloom-surface" d="M111 83c8-7 12 5 20-1s12 5 19 0"/>
        <path className="scene-dripper-rim" d="M98 64h78"/><path className="scene-dripper-base" d="M112 98h44"/>
        <g className="scene-bubbles"><circle cx="119" cy="79" r="3"/><circle cx="134" cy="75" r="2.5"/><circle cx="145" cy="80" r="2"/></g>
        <path className="scene-server-rim" d="M108 83h54"/>
      </g>}
      {(method==='french_press'||method==='aeropress')&&<g className="scene-press" transform="translate(0 9) scale(1.45)">
        <path className="scene-press-glass" d="M76 37h67l-5 52H82z"/><path className="scene-coffee" d="M80 66h59l-3 21H83z"/>
        <path className="scene-press-top" d="M70 35h79"/><path className="scene-press-rod" d="M110 19v38"/><path className="scene-press-knob" d="M101 18h18"/>
        <path className="scene-press-foot" d="M73 92h73"/><path className="scene-press-handle" d="M143 44h10v25h-10"/>
        <g className="scene-bubbles"><circle cx="94" cy="73" r="3"/><circle cx="119" cy="78" r="2"/></g>
      </g>}
      {method==='espresso'&&<g className="scene-espresso" transform="translate(0 9) scale(1.45)">
        <path className="scene-machine" d="M70 28h82v33h-12v9H88v-9H70z"/><path className="scene-machine-head" d="M91 61h41v9H91z"/>
        <path className="scene-portafilter" d="M98 69h28l-4 8h-20z"/><path className="scene-stream" d="M105 77v12m14-12v12"/>
        <path className="scene-cup" d="M96 88h34l-4 9h-26z"/><path className="scene-cup-rim" d="M92 87h42"/>
        <circle className="scene-indicator" cx="139" cy="40" r="3"/>
      </g>}
      {method==='tubruk'&&<g className="scene-tubruk" transform="translate(0 9) scale(1.45)">
        <path className="scene-cup" d="M80 53h64l-5 39H85z"/><path className="scene-cup-rim" d="M76 53h72"/>
        <path className="scene-coffee" d="M87 68h50l-2 18H89z"/><path className="scene-handle" d="M144 61h12c9 0 8 19 0 19h-14"/>
        <path className="scene-stream" d="M109 26v26"/><g className="scene-bubbles"><circle cx="101" cy="71" r="3"/><circle cx="122" cy="77" r="2"/></g>
      </g>}
      {method==='moka_pot'&&<g className="scene-moka" transform="translate(0 9) scale(1.45)">
        <path className="scene-pot-base" d="m77 63 8-24h52l8 24-9 29H86z"/><path className="scene-pot-top" d="m86 39 8-13h34l9 13z"/>
        <path className="scene-pot-line" d="M84 62h55"/><path className="scene-pot-handle" d="M145 48h11v27h-12"/>
        <path className="scene-pot-knob" d="M103 25v-6h16v6"/><path className="scene-steam" d="M101 14c-5-5 5-6 0-11m16 11c-5-5 5-6 0-11"/>
      </g>}
      {method==='cold_brew'&&<g className="scene-cold" transform="translate(0 9) scale(1.45)">
        <path className="scene-jar" d="M81 30h58v60a7 7 0 0 1-7 7H88a7 7 0 0 1-7-7z"/><path className="scene-jar-lid" d="M77 27h66v8H77z"/>
        <path className="scene-coffee" d="M85 57h50v31a4 4 0 0 1-4 4H89a4 4 0 0 1-4-4z"/>
        <path className="scene-ice" d="m94 44 8-5 7 7-5 8h-8zm24 3 7-5 6 6-4 8h-8z"/>
        <path className="scene-jar-highlight" d="M89 37v13m0 9v20"/>
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
    <Link className="profile-shortcut card" to="/about"><span className="shortcut-icon"><Info size={19}/></span><span><b>Tentang aplikasi</b><small>Informasi SeduhLog dan teknologi</small></span><ChevronRight size={18}/></Link>
    <Link className="profile-shortcut card" to="/settings"><span className="shortcut-icon"><Settings size={19}/></span><span><b>Pengaturan aplikasi</b><small>Tema, instalasi, dan cache</small></span><ChevronRight size={18}/></Link>
    <p className="profile-note">Periksa kembali nama, NIM, program studi, universitas, dan tautan GitHub sebelum publikasi.</p>
  </main>;
}

function AboutPage() {
  return <main><PageHeader title="Tentang aplikasi" back eyebrow="RUANG KECIL UNTUK RASA"/>
    <Card className="about-card about-page-card"><div className="about-icon"><Coffee/></div><div className="eyebrow">TUGAS AKHIR PRAKTIKUM</div><h2>SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi</h2><p>Jurnal personal untuk merekam setiap seduhan, mengelola biji kopi, dan memahami rasa di setiap cangkir.</p><div className="version-pill">Versi {__APP_VERSION__}</div><div className="tech-stack"><Badge>React</Badge><Badge>Express API</Badge><Badge>MongoDB</Badge><Badge>PWA</Badge></div></Card>
    <Card className="about-extra"><div className="eyebrow">DIBUAT UNTUK</div><p>Praktikum Pemrograman Perangkat Bergerak</p><p>SeduhLog membantu menyimpan resep, catatan sensori, dan koleksi biji kopi dalam satu jurnal pribadi.</p></Card>
    <a className="repo-link" href={profile.repository} target="_blank" rel="noreferrer"><Share size={16}/> Repo aplikasi di GitHub <ArrowRight size={15}/></a>
  </main>;
}

function SettingsPage() {
  const {toast,install,installPrompt,online}=useOutletContext();
  const queryClient=useQueryClient();
  const [theme,setTheme]=useState(localStorage.getItem('seduhlog-theme')||'system');
  useEffect(()=>{
    const root=document.documentElement;
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme=()=>{root.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;};
    applyTheme();
    localStorage.setItem('seduhlog-theme',theme);
    media.addEventListener?.('change',applyTheme);
    return()=>media.removeEventListener?.('change',applyTheme);
  },[theme]);
  return <main><PageHeader title="Pengaturan aplikasi" back eyebrow="SESUAIKAN PENGALAMAN"/>
    <Card className="settings-card settings-page-card"><div className="section-title"><div><div className="eyebrow">PREFERENSI</div><h2>Tampilan & perangkat</h2></div><Settings size={19}/></div>
      <div className="setting-item"><div><b>Tampilan</b><small>Sesuaikan suasana aplikasi</small></div><select aria-label="Tema tampilan" value={theme} onChange={event=>setTheme(event.target.value)}><option value="light">Terang</option><option value="dark">Gelap</option><option value="system">Ikuti sistem</option></select></div>
      <div className="setting-item"><div><b>Koneksi</b><small>{online?'Semua fitur siap digunakan':'Timer tetap dapat digunakan offline'}</small></div><span className={`connection ${online?'online':'offline'}`}>{online?<Wifi size={16}/>:<WifiOff size={16}/>} {online?'Online':'Offline'}</span></div>
      <div className="setting-item"><div><b>Pasang aplikasi</b><small>Tambahkan ke layar utama</small></div><button className="button button-small button-outline" onClick={install}>{installPrompt?'Pasang':'Petunjuk'} <Upload size={15}/></button></div>
      <div className="setting-item"><div><b>Bersihkan cache data</b><small>Hapus salinan data yang tersimpan</small></div><button className="button button-small button-outline" onClick={()=>{queryClient.clear();toast('Cache data berhasil dibersihkan');}}>Bersihkan</button></div>
    </Card>
    <p className="profile-note">Penghapusan cache mengosongkan data lokal yang tersimpan; data di MongoDB tidak dihapus.</p>
  </main>;
}

function InstallSheet({onClose}) {
  return <div className="modal-backdrop" onClick={onClose}><section className="install-sheet" onClick={event=>event.stopPropagation()}><button className="sheet-close" aria-label="Tutup petunjuk" onClick={onClose}><X/></button><div className="share-illustration"><Share size={25}/><ArrowDown size={18}/><Plus size={22}/></div><h2>Pasang SeduhLog</h2><p>Ketuk ikon Bagikan, lalu pilih <b>Tambah ke Layar Utama</b>.</p><button className="button button-primary full-button" onClick={onClose}>Mengerti</button></section></div>;
}

function NotFound() {
  return <main className="not-found"><div className="empty-art"><Coffee size={40}/></div><div className="eyebrow">404 · HALAMAN TIDAK DITEMUKAN</div><h1>Sepertinya terlalu jauh dari cangkir.</h1><p>Halaman yang kamu cari tidak ada atau sudah berpindah.</p><Link className="button button-primary" to="/">Kembali ke beranda <ArrowRight size={17}/></Link></main>;
}

function RouterApp({toast,setToast}) {
  return <BrowserRouter><Routes><Route element={<AppLayout toast={toast} setToast={setToast}/>}><Route path="/" element={<AppHome/>}/><Route path="/brews" element={<BrewList/>}/><Route path="/beans" element={<BeanList/>}/><Route path="/timer" element={<TimerPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="/brews/new" element={<BrewForm/>}/><Route path="/brews/:id/edit" element={<BrewForm/>}/><Route path="/brews/:id" element={<BrewDetail/>}/><Route path="/beans/new" element={<BeanForm/>}/><Route path="/beans/:id/edit" element={<BeanForm/>}/><Route path="/beans/:id" element={<BeanDetail/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></BrowserRouter>;
}

export default function App() {
  const [toast,setToast]=useState({message:'',type:'success'});
  useEffect(()=>{if(!toast.message)return undefined;const timeout=setTimeout(()=>setToast({message:'',type:'success'}),3500);return()=>clearTimeout(timeout);},[toast]);
  return <RouterApp toast={toast} setToast={setToast}/>;
}

