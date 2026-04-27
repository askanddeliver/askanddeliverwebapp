// bt-modals.jsx — CreateModal + DetailPopover

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function CreateModal({ slot, onSave, onCancel, theme: t }) {
  const [title,     setTitle]     = React.useState('');
  const [kind,      setKind]      = React.useState('WORK');
  const [clientId,  setClientId]  = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [startH,    setStartH]    = React.useState(slot ? slot.getHours() : 9);
  const [startM,    setStartM]    = React.useState(slot ? Math.round(slot.getMinutes()/15)*15 : 0);
  const [endH,      setEndH]      = React.useState(slot ? Math.min(slot.getHours()+1, HOUR_END) : 10);
  const [endM,      setEndM]      = React.useState(0);
  const [notes,     setNotes]     = React.useState('');

  const clientProjects  = PROJECTS.filter(p => p.clientId === clientId);
  const showClientField = kind === 'WORK' || kind === 'ADMIN' || kind === 'MEETING';

  const handleKind = k => {
    setKind(k);
    if (k === 'PERSONAL' || k === 'DOWNTIME') { setClientId(''); setProjectId(''); }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const base = slot || new Date();
    const y=base.getFullYear(), mo=base.getMonth(), d=base.getDate();
    const start = new Date(y, mo, d, startH, startM);
    const end   = new Date(y, mo, d, endH,   endM);
    if (end <= start) return;
    onSave({ title:title.trim(), kind, clientId:clientId||undefined, projectId:projectId||undefined, start, end, notes });
  };

  const inp = {
    width:'100%', padding:'8px 10px', borderRadius:7,
    border:`1.5px solid ${t.border}`, background:t.inputBg,
    color:t.text, fontSize:14, outline:'none', boxSizing:'border-box',
    fontFamily:'inherit',
  };
  const hourOpts = Array.from({length: HOUR_END-HOUR_START+1}, (_,i)=>HOUR_START+i);
  const minOpts  = [0,15,30,45];
  const fmtH = h => h===12?'12pm':h>12?`${h-12}pm`:`${h}am`;
  const kindColors = { WORK:'#3B82F6', PERSONAL:'#F59E0B', DOWNTIME:'#94A3B8', MEETING:'#EF4444', ADMIN:'#A855F7' };

  return (
    <div style={{position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)'}}>
      <div className="bt-modal-enter" style={{
        background:t.modalBg, borderRadius:14, width:456, maxWidth:'92vw',
        boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden',
        border:`1px solid ${t.border}`,
      }}>
        {/* Header */}
        <div style={{padding:'18px 22px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:16, fontWeight:700, color:t.text}}>New Block</div>
          <button onClick={onCancel} style={{width:28, height:28, borderRadius:7, border:`1px solid ${t.border}`, background:'transparent', color:t.muted, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center'}}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{padding:'18px 22px', display:'flex', flexDirection:'column', gap:16}}>
          {/* Title */}
          <input
            value={title} onChange={e=>setTitle(e.target.value)}
            placeholder="Block title…" style={{...inp, fontSize:15, fontWeight:600, padding:'10px 12px'}}
            autoFocus onKeyDown={e=>e.key==='Enter'&&handleSave()}
          />

          {/* Kind pills */}
          <div>
            <div style={{fontSize:11, fontWeight:600, color:t.muted, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:8}}>Type</div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {Object.entries(KIND_META).map(([k,m]) => {
                const active = kind===k;
                const kc = kindColors[k];
                return (
                  <button key={k} onClick={()=>handleKind(k)} style={{
                    padding:'5px 14px', borderRadius:20, cursor:'pointer',
                    border: active ? 'none' : `1.5px solid ${t.border}`,
                    fontSize:12, fontWeight:600,
                    background: active ? kc : t.inputBg,
                    color: active ? getContrastColor(kc) : t.muted,
                    transition:'all 0.12s',
                  }}>{m.label}</button>
                );
              })}
            </div>
          </div>

          {/* Client + Project */}
          {showClientField && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <div style={{fontSize:11, fontWeight:600, color:t.muted, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:6}}>Client</div>
                <select value={clientId} onChange={e=>{setClientId(e.target.value);setProjectId('');}} style={inp}>
                  <option value="">— None —</option>
                  {CLIENTS.map(c=>(
                    <option key={c.id} value={c.id}>{c.name}{c.isInternal?' (Internal)':''}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{fontSize:11, fontWeight:600, color:t.muted, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:6}}>Project</div>
                <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{...inp, opacity:clientId?1:0.5}} disabled={!clientId}>
                  <option value="">— None —</option>
                  {clientProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Time row */}
          <div>
            <div style={{fontSize:11, fontWeight:600, color:t.muted, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:8}}>Time</div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <select value={startH} onChange={e=>setStartH(+e.target.value)} style={{...inp, flex:1}}>
                {hourOpts.map(h=><option key={h} value={h}>{fmtH(h)}</option>)}
              </select>
              <select value={startM} onChange={e=>setStartM(+e.target.value)} style={{...inp, width:70}}>
                {minOpts.map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
              <span style={{color:t.muted, fontSize:16, flexShrink:0}}>→</span>
              <select value={endH} onChange={e=>setEndH(+e.target.value)} style={{...inp, flex:1}}>
                {hourOpts.map(h=><option key={h} value={h}>{fmtH(h)}</option>)}
              </select>
              <select value={endM} onChange={e=>setEndM(+e.target.value)} style={{...inp, width:70}}>
                {minOpts.map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
            </div>
            {endH <= startH && endM <= startM && (
              <div style={{fontSize:11, color:'#EF4444', marginTop:4}}>End time must be after start time</div>
            )}
          </div>

          {/* Notes */}
          <textarea
            value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Notes (optional)" rows={2}
            style={{...inp, resize:'vertical'}}
          />
        </div>

        {/* Footer */}
        <div style={{padding:'12px 22px 18px', display:'flex', justifyContent:'flex-end', gap:10, borderTop:`1px solid ${t.border}`}}>
          <button onClick={onCancel} style={{
            padding:'8px 18px', borderRadius:8, border:`1.5px solid ${t.border}`,
            background:'transparent', color:t.text, cursor:'pointer', fontSize:14, fontWeight:500,
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || endH*60+endM <= startH*60+startM} style={{
            padding:'8px 22px', borderRadius:8, border:'none',
            background: title.trim() ? '#3B82F6' : t.border,
            color: title.trim() ? '#fff' : t.muted,
            cursor: title.trim() ? 'pointer' : 'default',
            fontSize:14, fontWeight:700, transition:'all 0.12s',
          }}>Save Block</button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Popover ───────────────────────────────────────────────────────────
function DetailPopover({ block, position, onClose, onEdit, onDelete, onStartTimer, theme: t }) {
  const color   = getBlockColor(block);
  const tc      = getContrastColor(color);
  const client  = CLIENTS.find(c => c.id === block.clientId);
  const project = PROJECTS.find(p => p.id === block.projectId);
  const km      = KIND_META[block.kind];

  // Keep popover within viewport
  const px = Math.min(position.x + 12, window.innerWidth  - 320);
  const py = Math.min(position.y - 8,  window.innerHeight - 290);

  return (
    <>
      <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:1999}} />
      <div className="bt-modal-enter" style={{
        position:'fixed', zIndex:2000, top:Math.max(8, py), left:Math.max(8, px),
        width:300, background:t.modalBg, borderRadius:12,
        boxShadow:'0 12px 40px rgba(0,0,0,0.2)', overflow:'hidden',
        border:`1px solid ${t.border}`,
      }}>
        {/* Color band header */}
        <div style={{background:color, color:tc, padding:'12px 14px 10px', position:'relative'}}>
          <div style={{
            position:'absolute', top:10, right:12,
            fontSize:9, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase',
            background:alphaHex(tc, 0.2), color:tc, borderRadius:4, padding:'2px 6px',
          }}>{km.label}</div>
          <div style={{fontSize:15, fontWeight:700, lineHeight:1.3, paddingRight:60}}>{block.title}</div>
          {client && (
            <div style={{fontSize:11, opacity:0.85, marginTop:3}}>
              {client.name}{project ? ` · ${project.name}` : ''}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{padding:'12px 14px'}}>
          <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:12, flexWrap:'wrap'}}>
            <span style={{fontSize:13, fontWeight:600, color:t.text}}>
              {fmtTime(block.start)} – {fmtTime(block.end)}
            </span>
            <span style={{
              fontSize:11, color:t.muted, background:t.inputBg,
              borderRadius:5, padding:'2px 7px', border:`1px solid ${t.border}`,
            }}>{fmtDur(block.start, block.end)}</span>
          </div>

          {/* Start Timer — primary CTA */}
          <button onClick={onStartTimer} style={{
            width:'100%', padding:'11px', borderRadius:9, border:'none',
            background:'#3B82F6', color:'#fff',
            fontSize:14, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            marginBottom:8, boxShadow:'0 2px 8px rgba(59,130,246,0.35)',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="2,1 13,7 2,13" />
            </svg>
            Start Timer
          </button>

          {/* Secondary actions */}
          <div style={{display:'flex', gap:7}}>
            <button onClick={onEdit} style={{
              flex:1, padding:'7px', borderRadius:7,
              border:`1.5px solid ${t.border}`, background:'transparent',
              color:t.text, fontSize:13, cursor:'pointer', fontWeight:500,
            }}>Edit</button>
            <button onClick={onDelete} style={{
              flex:1, padding:'7px', borderRadius:7,
              border:'1.5px solid #fecaca', background:'#fff5f5',
              color:'#ef4444', fontSize:13, cursor:'pointer', fontWeight:500,
            }}>Delete</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Timer Toast ──────────────────────────────────────────────────────────────
function TimerToast({ block, onStop }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(iv);
  }, []);
  const color = getBlockColor(block);
  const tc = getContrastColor(color);
  const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
  const ss = String(elapsed%60).padStart(2,'0');
  return (
    <div style={{
      position:'fixed', bottom:20, right:20, zIndex:3000,
      background:color, color:tc, borderRadius:12,
      padding:'12px 18px', boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
      display:'flex', alignItems:'center', gap:14, minWidth:240,
      animation:'slideUp 0.25s ease-out',
    }}>
      <div style={{flex:1}}>
        <div style={{fontSize:11, opacity:0.75, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em'}}>Timer Running</div>
        <div style={{fontSize:14, fontWeight:700, marginTop:1}}>{block.title}</div>
      </div>
      <div style={{fontSize:20, fontWeight:800, fontVariantNumeric:'tabular-nums'}}>{mm}:{ss}</div>
      <button onClick={onStop} style={{
        padding:'5px 12px', borderRadius:7, border:`2px solid ${alphaHex(tc,0.4)}`,
        background:'transparent', color:tc, cursor:'pointer', fontSize:12, fontWeight:700,
      }}>Stop</button>
    </div>
  );
}

Object.assign(window, { CreateModal, DetailPopover, TimerToast });
