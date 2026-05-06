// Dashboard — redesigned with denser layout, inline timer, grouped to-dos
const DashboardScreen = () => {
  const [running, setRunning] = React.useState(false);
  const [secs, setSecs] = React.useState(0);
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = (s) => {
    const h = String(Math.floor(s/3600)).padStart(2,'0');
    const m = String(Math.floor(s/60)%60).padStart(2,'0');
    const sec = String(s%60).padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };

  const todos = [
    { client: 'Chris Circo', color: 'amber', items: [
      { project: '2027 DSG Apparel', name: 'Color Exploration for New Concepts', status: 'progress' },
      { project: 'Battle Sports App', name: 'Research App Approval and Releases', status: 'todo' },
      { project: 'Battle Sports App', name: 'Create Proposal', status: 'todo' },
      { project: 'Systems Web Support', name: 'Connect Google Ads to Battle Uniforms', status: 'progress' },
    ]},
    { client: 'David Cooke', color: 'blue', items: [
      { project: 'InspectionStamps', name: 'Update Incorrect Quick Dry Product Images', status: 'todo' },
      { project: 'InspectionStamps', name: 'Product Page Template Edits', status: 'progress' },
      { project: 'InspectionStamps', name: 'Audit all products for SKU, weight, inventory', status: 'progress' },
    ]},
    { client: 'Tyler Herring', color: 'green', items: [
      { project: '2026 Novelty Grip Designs', name: 'Memorial Day / USA / Americana', status: 'todo' },
      { project: '2026 Novelty Grip Designs', name: 'Grip Wrap Vertical Tile Plotting', status: 'progress' },
    ]},
  ];

  return (
    <Shell active="dashboard" crumbs={['Workspace', 'Dashboard']}
      topbarExtra={<button className="btn btn-primary"><Icon name="plus" size={13} /> New entry</button>}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, Matt</h1>
            <div className="page-sub">Tuesday, May 6 · 4 active projects need attention</div>
          </div>
        </div>

        <div className="stat-strip">
          <div className="stat">
            <div className="stat-label"><Icon name="clock" size={11} /> Today</div>
            <div className="stat-value">0h 00m</div>
            <div className="stat-delta"><span className="muted">Goal · 6h</span></div>
          </div>
          <div className="stat">
            <div className="stat-label"><Icon name="block" size={11} /> This week</div>
            <div className="stat-value">14h 34m</div>
            <div className="stat-delta pos"><Icon name="arrowup" size={10}/> 12% vs last</div>
          </div>
          <div className="stat">
            <div className="stat-label"><Icon name="folder" size={11} /> Active projects</div>
            <div className="stat-value">14</div>
            <div className="stat-delta"><span className="muted">3 paused</span></div>
          </div>
          <div className="stat">
            <div className="stat-label"><Icon name="dollar" size={11} /> Outstanding</div>
            <div className="stat-value">$1,633</div>
            <div className="stat-delta"><span className="muted">1 invoice</span></div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start'}}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">To-do <span className="count">31 open</span></div>
              <div className="flex gap-2 items-center">
                <div className="tabs" style={{padding:2}}>
                  <div className="tab active">By client</div>
                  <div className="tab">By project</div>
                  <div className="tab">By due</div>
                </div>
                <button className="btn btn-sm btn-ghost"><Icon name="filter" size={12}/> Filter</button>
              </div>
            </div>
            <div className="list">
              {todos.map(group => (
                <React.Fragment key={group.client}>
                  <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)', fontSize:11.5, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'.04em'}}>
                    <Avatar name={group.client} color={group.color} />
                    <span style={{textTransform:'none', fontSize:12.5, color:'var(--text)'}}>{group.client}</span>
                    <span className="count" style={{marginLeft:4, fontFamily:'var(--font-mono)', fontSize:10.5, padding:'1px 5px', borderRadius:3, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text-3)', fontWeight:500}}>{group.items.length}</span>
                  </div>
                  {group.items.map((t, i) => (
                    <div key={i} className="list-row" style={{gridTemplateColumns:'18px 1fr auto auto', gap:10, padding:'7px 16px 7px 24px'}}>
                      <div className="checkbox" />
                      <div style={{display:'flex', flexDirection:'column'}}>
                        <span className="primary" style={{fontWeight:450}}>{t.name}</span>
                        <span className="secondary" style={{fontSize:11.5}}>{t.project}</span>
                      </div>
                      {t.status === 'progress' && <span className="badge blue">In progress</span>}
                      <button className="btn btn-icon btn-sm btn-ghost" title="Start timer"><Icon name="play" size={12}/></button>
                    </div>
                  ))}
                </React.Fragment>
              ))}
              <div style={{padding:'10px 16px', fontSize:12, color:'var(--text-3)', display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
                <Icon name="chevright" size={11} /> Internal (Ask + Deliver) · 13 open
              </div>
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="panel">
              <div style={{padding:'14px 16px'}}>
                <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10}}>Active timer</div>
                <div className="mono" style={{fontSize:32, fontWeight:600, letterSpacing:'-0.02em', color: running ? 'var(--green-600)' : 'var(--text)'}}>{fmt(secs)}</div>
                <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:12}}>
                  <select className="input"><option>2027 DSG Apparel · Color Exploration</option></select>
                  <select className="input"><option>Design · $90/hr</option></select>
                  <input className="input" placeholder="What are you working on?" />
                  <button className={`btn ${running?'':'btn-primary'}`} style={{height:34, justifyContent:'center'}} onClick={()=>setRunning(r=>!r)}>
                    <Icon name={running?'pause':'play'} size={13}/> {running?'Pause':'Start timer'}
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Today's blocks</div>
                <span className="muted mono" style={{fontSize:11}}>3 of 5</span>
              </div>
              <div style={{padding:'4px 0'}}>
                {[
                  {time:'9–10a', label:'2027 DSG Color Exploration', client:'Chris Circo', color:'#ef4444', done:true},
                  {time:'10–11a', label:'Novelty Grip Designs', client:'Tyler Herring', color:'#a3e635', done:true},
                  {time:'11a–12p', label:'April Invoicing', client:'Internal', color:'#94a3b8', done:true},
                  {time:'1–4p', label:'Inspection Stamps', client:'David Cooke', color:'#3b82f6', done:false},
                  {time:'4–5p', label:'Lubben Veterinary Proposal', client:'Internal', color:'#94a3b8', done:false},
                ].map((b,i)=>(
                  <div key={i} style={{display:'grid', gridTemplateColumns:'56px 4px 1fr', gap:10, padding:'6px 14px', alignItems:'center', opacity:b.done?0.55:1}}>
                    <span className="mono muted" style={{fontSize:11}}>{b.time}</span>
                    <span style={{width:3, height:24, background:b.color, borderRadius:2}} />
                    <div style={{display:'flex', flexDirection:'column', minWidth:0}}>
                      <span style={{fontSize:12.5, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{b.label}</span>
                      <span className="muted" style={{fontSize:11}}>{b.client}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
};

window.DashboardScreen = DashboardScreen;
