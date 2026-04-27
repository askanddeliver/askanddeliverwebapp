// bt-app.jsx — App shell, header, sidebar, state, tweaks

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  daylight: {
    name:'Daylight',
    accent:'#3B82F6', text:'#1e293b', muted:'#94a3b8', border:'#e2e8f0',
    calBg:'#ffffff', headerBg:'#ffffff', modalBg:'#ffffff',
    todayBg:'rgba(59,130,246,0.04)', halfHour:'#f1f5f9',
    inputBg:'#f8fafc', sidebarBg:'#0f172a', sidebarText:'#64748b', sidebarActive:'#3B82F6',
  },
  studio: {
    name:'Studio',
    accent:'#818cf8', text:'#e2e8f0', muted:'#475569', border:'#1e293b',
    calBg:'#0d1117', headerBg:'#0d1117', modalBg:'#161b22',
    todayBg:'rgba(129,140,248,0.07)', halfHour:'#161b22',
    inputBg:'#0d1117', sidebarBg:'#010409', sidebarText:'#30363d', sidebarActive:'#818cf8',
  },
  warm: {
    name:'Warm',
    accent:'#d97706', text:'#292524', muted:'#a8a29e', border:'#e7e5e4',
    calBg:'#faf6f0', headerBg:'#faf6f0', modalBg:'#fffbf5',
    todayBg:'rgba(217,119,6,0.05)', halfHour:'#f5ede0',
    inputBg:'#f5ede0', sidebarBg:'#1c1917', sidebarText:'#57534e', sidebarActive:'#d97706',
  },
};

const NAV_ITEMS = [
  { label:'Dashboard',        icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { label:'Time Blocks',      icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', active:true },
  { label:'Projects',         icon:'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z' },
  { label:'Clients',          icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { label:'Reports',          icon:'M18 20V10M12 20V4M6 20v-6' },
  { label:'Invoices',         icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
  { label:'Settings',         icon:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
];

function NavIcon({ d }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Sidebar({ theme: t }) {
  return (
    <div style={{width:208, flexShrink:0, background:t.sidebarBg, display:'flex', flexDirection:'column', overflow:'hidden'}}>
      <div style={{padding:'18px 16px 12px'}}>
        <div style={{fontSize:13, fontWeight:800, color:'#fff', letterSpacing:'-0.01em'}}>Ask + Deliver</div>
      </div>
      <div style={{flex:1, padding:'4px 10px', overflowY:'auto'}}>
        {NAV_ITEMS.map((item, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'7px 10px', borderRadius:7, marginBottom:1,
            background: item.active ? `${t.sidebarActive}28` : 'transparent',
            cursor:'pointer', transition:'background 0.1s',
          }}>
            <span style={{color: item.active ? t.sidebarActive : t.sidebarText, flexShrink:0}}>
              <NavIcon d={item.icon} />
            </span>
            <span style={{fontSize:13, fontWeight: item.active ? 600 : 400, color: item.active ? '#e2e8f0' : t.sidebarText}}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      {/* Client color legend */}
      <div style={{padding:'12px 16px 16px', borderTop:`1px solid ${t.sidebarText}22`}}>
        <div style={{fontSize:10, fontWeight:600, color:t.sidebarText, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8}}>
          Calendars
        </div>
        {CLIENTS.map(c => (
          <div key={c.id} style={{display:'flex', alignItems:'center', gap:8, marginBottom:5}}>
            <div style={{width:9, height:9, borderRadius:'50%', background:c.color, flexShrink:0}} />
            <span style={{fontSize:11, color:t.sidebarText, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
              {c.name}{c.isInternal?' ·':''} {c.isInternal?<span style={{opacity:0.6}}>Internal</span>:''}
            </span>
          </div>
        ))}
        {/* Kind legend */}
        {[['PERSONAL','Personal'],['DOWNTIME','Downtime'],['MEETING','Meeting'],['ADMIN','Admin']].map(([k,l])=>(
          <div key={k} style={{display:'flex', alignItems:'center', gap:8, marginBottom:5}}>
            <div style={{width:9, height:9, borderRadius:2, background:KIND_META[k].color, flexShrink:0}} />
            <span style={{fontSize:11, color:t.sidebarText}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar Header ──────────────────────────────────────────────────────────
function CalHeader({ view, setView, currentDate, setCurrentDate, onNewBlock, theme: t }) {
  const nav = dir => {
    const d = new Date(currentDate);
    if (view==='month') d.setMonth(d.getMonth()+dir);
    else if (view==='week') d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setCurrentDate(d);
  };

  const ws = startOfWeek(currentDate);
  const we = addDays(ws, 6);
  const sameMonth = ws.getMonth()===we.getMonth();
  const wsStr = ws.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const weStr = sameMonth
    ? `${we.getDate()}, ${we.getFullYear()}`
    : `${we.toLocaleDateString('en-US',{month:'short',day:'numeric'})}, ${we.getFullYear()}`;
  const title = view==='month'
    ? currentDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})
    : view==='week'
    ? `${wsStr} – ${weStr}`
    : currentDate.toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'});

  const btnBase = { cursor:'pointer', fontFamily:'inherit', transition:'all 0.1s' };

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'10px 20px',
      borderBottom:`1px solid ${t.border}`, flexShrink:0, background:t.headerBg,
    }}>
      <button onClick={()=>setCurrentDate(new Date(2026,3,23))} style={{
        ...btnBase, padding:'6px 14px', borderRadius:7,
        border:`1.5px solid ${t.border}`, background:'transparent',
        color:t.text, fontSize:13, fontWeight:600,
      }}>Today</button>

      <div style={{display:'flex', gap:2}}>
        {[['‹',-1],['›',1]].map(([ch,dir])=>(
          <button key={ch} onClick={()=>nav(dir)} style={{
            ...btnBase, width:28, height:28, borderRadius:7,
            border:`1.5px solid ${t.border}`, background:'transparent',
            color:t.muted, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center',
          }}>{ch}</button>
        ))}
      </div>

      <div style={{flex:1, fontSize:15, fontWeight:700, color:t.text}}>{title}</div>

      {/* View switcher */}
      <div style={{display:'flex', borderRadius:8, overflow:'hidden', border:`1.5px solid ${t.border}`}}>
        {['Month','Week','Day'].map(v=>(
          <button key={v} onClick={()=>setView(v.toLowerCase())} style={{
            ...btnBase, padding:'6px 14px', border:'none', fontSize:13, fontWeight:600,
            background: view===v.toLowerCase() ? t.accent : 'transparent',
            color: view===v.toLowerCase() ? '#fff' : t.muted,
          }}>{v}</button>
        ))}
      </div>

      {/* New block */}
      <button onClick={onNewBlock} style={{
        ...btnBase, padding:'7px 16px', borderRadius:8, border:'none',
        background:t.accent, color:'#fff', fontSize:13, fontWeight:700,
        display:'flex', alignItems:'center', gap:6,
        boxShadow:`0 2px 8px ${alphaHex(t.accent,0.35)}`,
      }}>
        <span style={{fontSize:17, lineHeight:1}}>+</span> Block
      </button>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "daylight"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = THEMES[tweaks.theme] || THEMES.daylight;

  const [blocks,       setBlocks]       = React.useState(INITIAL_BLOCKS);
  const [view,         setView]         = React.useState('week');
  const [currentDate,  setCurrentDate]  = React.useState(new Date(2026,3,23));
  const [createSlot,   setCreateSlot]   = React.useState(null);
  const [detail,       setDetail]       = React.useState(null); // {block, position}
  const [activeTimer,  setActiveTimer]  = React.useState(null); // block

  const weekStart = startOfWeek(currentDate);

  const handleSlotClick = time => { setCreateSlot(time); setDetail(null); };
  const handleBlockClick = (block, e) => { setDetail({block, position:{x:e.clientX, y:e.clientY}}); setCreateSlot(null); };
  const handleSave = data => {
    setBlocks(bs => [...bs, {...data, id:newBlockId()}]);
    setCreateSlot(null);
  };
  const handleResize = (id, newEnd) => setBlocks(bs => bs.map(b => b.id===id ? {...b, end:newEnd} : b));
  const handleDelete = () => { if(detail) { setBlocks(bs=>bs.filter(b=>b.id!==detail.block.id)); setDetail(null); } };
  const handleStartTimer = () => { setActiveTimer(detail.block); setDetail(null); };
  const handleNewBlock = () => setCreateSlot(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 9, 0));
  const handleDayClick = day => { setCurrentDate(day); setView('day'); };

  const calProps = { blocks, onBlockClick:handleBlockClick, onBlockResize:handleResize, theme };

  return (
    <div style={{display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans','Inter',system-ui,sans-serif", fontSize:14}}>
      <Sidebar theme={theme} />

      <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <CalHeader
          view={view} setView={setView}
          currentDate={currentDate} setCurrentDate={setCurrentDate}
          onNewBlock={handleNewBlock} theme={theme}
        />
        <div style={{flex:1, overflow:'hidden'}}>
          {view==='week' && <WeekView {...calProps} weekStart={weekStart} onSlotClick={handleSlotClick} />}
          {view==='month' && <MonthView {...calProps} currentDate={currentDate} onDayClick={handleDayClick} />}
          {view==='day' && <DayView {...calProps} currentDate={currentDate} onSlotClick={handleSlotClick} />}
        </div>
      </div>

      {createSlot && <CreateModal slot={createSlot} onSave={handleSave} onCancel={()=>setCreateSlot(null)} theme={theme} />}
      {detail && (
        <DetailPopover
          block={detail.block} position={detail.position}
          onClose={()=>setDetail(null)}
          onEdit={()=>{setCreateSlot(detail.block.start); setDetail(null);}}
          onDelete={handleDelete}
          onStartTimer={handleStartTimer}
          theme={theme}
        />
      )}
      {activeTimer && <TimerToast block={activeTimer} onStop={()=>setActiveTimer(null)} />}

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio
          label="Visual style"
          value={tweaks.theme}
          options={['daylight','studio','warm']}
          onChange={v=>setTweak('theme',v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
