// Block Time — calendar week view, denser, with sidebar utilization
const BlockScreen = () => {
  const days = ['Mon 4', 'Tue 5', 'Wed 6', 'Thu 7', 'Fri 8'];
  const blocks = [
    { day:0, start:8, end:10, title:'2027 DSG Color Exploration', client:'Chris Circo', color:'#ef4444' },
    { day:0, start:10, end:11, title:'Novelty Grip Designs', client:'Tyler Herring', color:'#a3e635' },
    { day:0, start:11, end:12, title:'April 2026 Invoicing', client:'Internal · Admin', color:'#94a3b8' },
    { day:0, start:12, end:13, title:'Lunch', client:'Downtime', color:'#cbd5e1' },
    { day:0, start:13, end:16, title:'Inspection Stamps', client:'David Cooke', color:'#3b82f6' },
    { day:0, start:16, end:17, title:'Lubben Veterinary Proposal', client:'Internal · Admin', color:'#94a3b8' },
    { day:1, start:8, end:9.5, title:'Novelty Grip Designs', client:'Tyler Herring', color:'#a3e635' },
    { day:1, start:9.5, end:11, title:'2027 DSG Color Exploration', client:'Chris Circo', color:'#ef4444' },
    { day:1, start:11, end:12.5, title:'Lunch', client:'Downtime', color:'#cbd5e1' },
    { day:1, start:12.5, end:14, title:'Inspection Stamps', client:'David Cooke', color:'#3b82f6' },
    { day:1, start:14, end:15, title:'Lubben Veterinary Proposal', client:'Internal', color:'#94a3b8' },
    { day:1, start:15, end:16.5, title:'Inspection Stamps', client:'David Cooke', color:'#3b82f6' },
    { day:2, start:8, end:9.5, title:'Help Anne with…', client:'Personal', color:'#f59e0b' },
    { day:2, start:9.5, end:11.5, title:'Color Exploration Mtg', client:'Chris Circo', color:'#ef4444' },
    { day:2, start:11.5, end:13, title:'Lunch', client:'Downtime', color:'#cbd5e1' },
    { day:2, start:13, end:16, title:'Pre-Launch Checklist', client:'David Cooke', color:'#3b82f6' },
    { day:2, start:16, end:17, title:'Novelty Grips: Bananas', client:'Tyler Herring', color:'#a3e635' },
    { day:3, start:11.5, end:13, title:'Lunch', client:'Downtime', color:'#cbd5e1' },
    { day:4, start:11.5, end:13, title:'Lunch', client:'Downtime', color:'#cbd5e1' },
    { day:4, start:13, end:17, title:'This or That App', client:'Matt Linder · Concepts', color:'#94a3b8' },
  ];
  const HOUR_H = 30;
  const startHour = 7;
  const hours = Array.from({length:12}, (_,i)=>i+startHour);

  return (
    <Shell active="block" crumbs={['Time Tracking', 'Block Time']}
      topbarExtra={<button className="btn btn-primary"><Icon name="plus" size={13}/> Block</button>}>
      <div style={{display:'grid', gridTemplateColumns:'220px 1fr', height:'calc(100% - 48px)'}}>
        {/* Sidebar */}
        <div style={{borderRight:'1px solid var(--border)', background:'var(--surface)', padding:'14px 12px', overflow:'auto'}}>
          <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8}}>Week of May 4</div>
          <div className="mono" style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em'}}>32h <span style={{fontSize:13, color:'var(--text-3)', fontWeight:500}}>/ 40h</span></div>
          <div className="progress" style={{margin:'10px 0 14px'}}><div className="progress-fill" style={{width:'80%'}} /></div>

          <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6}}>Calendars</div>
          {[
            {name:'Chris Circo', color:'#ef4444', hrs:'9.5h'},
            {name:'David Cooke', color:'#3b82f6', hrs:'7.5h'},
            {name:'Tyler Herring', color:'#a3e635', hrs:'4.5h'},
            {name:'Joel Foresman', color:'#f4a8c1', hrs:'0h'},
            {name:'Internal', color:'#94a3b8', hrs:'6h'},
          ].map(c => (
            <div key={c.name} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 4px', fontSize:12}}>
              <span className="dot" style={{background:c.color}} />
              <span style={{flex:1}}>{c.name}</span>
              <span className="muted mono" style={{fontSize:11}}>{c.hrs}</span>
            </div>
          ))}

          <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', margin:'14px 0 6px'}}>Other</div>
          {[
            {name:'Personal', color:'#f59e0b'},
            {name:'Downtime', color:'#cbd5e1'},
            {name:'Meeting', color:'#dc2626'},
          ].map(c => (
            <div key={c.name} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 4px', fontSize:12}}>
              <span className="dot" style={{background:c.color}} />
              <span>{c.name}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{display:'flex', flexDirection:'column', minHeight:0}}>
          <div style={{display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface)'}}>
            <button className="btn btn-sm">Today</button>
            <button className="btn btn-icon btn-sm btn-ghost"><Icon name="chevright" size={11} style={{transform:'rotate(180deg)'}}/></button>
            <button className="btn btn-icon btn-sm btn-ghost"><Icon name="chevright" size={11}/></button>
            <span style={{fontSize:13, fontWeight:600}}>May 4 – May 10, 2026</span>
            <div className="ml-auto tabs">
              <div className="tab">Day</div>
              <div className="tab active">Week</div>
              <div className="tab">Month</div>
            </div>
          </div>
          <div style={{flex:1, overflow:'auto', background:'var(--surface)'}}>
            <div style={{display:'grid', gridTemplateColumns:'48px repeat(5, 1fr)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--surface)', zIndex:2}}>
              <div></div>
              {days.map(d => (
                <div key={d} style={{padding:'10px 12px', borderLeft:'1px solid var(--border)', fontSize:12}}>
                  <div className="muted" style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600}}>{d.split(' ')[0]}</div>
                  <div style={{fontSize:18, fontWeight:600}}>{d.split(' ')[1]}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid', gridTemplateColumns:'48px repeat(5, 1fr)', position:'relative'}}>
              <div>
                {hours.map(h => (
                  <div key={h} style={{height:HOUR_H, fontSize:10.5, color:'var(--text-3)', padding:'2px 4px', textAlign:'right', fontFamily:'var(--font-mono)'}}>
                    {h <= 12 ? h : h-12}{h<12?'a':'p'}
                  </div>
                ))}
              </div>
              {days.map((d, dayIdx) => (
                <div key={d} style={{position:'relative', borderLeft:'1px solid var(--border)'}}>
                  {hours.map(h => (
                    <div key={h} style={{height:HOUR_H, borderBottom:'1px solid var(--border)'}} />
                  ))}
                  {blocks.filter(b => b.day === dayIdx).map((b, i) => {
                    const top = (b.start - startHour) * HOUR_H;
                    const height = (b.end - b.start) * HOUR_H - 2;
                    return (
                      <div key={i} style={{
                        position:'absolute', top, left:2, right:2, height,
                        background:b.color, borderRadius:5,
                        padding:'4px 6px', fontSize:11, color:'white', fontWeight:500,
                        overflow:'hidden', boxShadow:'0 1px 2px rgba(0,0,0,0.1)',
                        display:'flex', flexDirection:'column', gap:1,
                        textShadow:'0 1px 1px rgba(0,0,0,0.15)'
                      }}>
                        <div style={{fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{b.title}</div>
                        <div style={{fontSize:10, opacity:0.85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{b.client}</div>
                      </div>
                    );
                  })}
                  {dayIdx === 2 && (
                    <div style={{position:'absolute', top: (9.3 - startHour) * HOUR_H, left:0, right:0, height:1, background:'var(--green-500)', zIndex:5}}>
                      <span style={{position:'absolute', left:-4, top:-3, width:7, height:7, borderRadius:'50%', background:'var(--green-500)'}} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
};
window.BlockScreen = BlockScreen;
