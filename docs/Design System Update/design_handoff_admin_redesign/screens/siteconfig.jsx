// Settings: Site Config
const SiteConfigScreen = () => {
  const palettes = [
    { name:'Original Palette', colors:['#5fa823','#0f1a14','#7a847e','#2e6fdb'] },
    { name:'Valentines 2026', colors:['#dc2864','#0f1a14','#f4a8c1','#a8b0aa'] },
    { name:"St. Patrick's 2026", colors:['#22c55e','#0f1a14','#fbbf24','#a8b0aa'] },
    { name:'Independence 2026', colors:['#dc2626','#1e3a8a','#fbbf24','#1e293b'] },
    { name:'Seahawks 2026 Champs', colors:['#125740','#0f1a14','#a3d977','#a8b0aa'] },
    { name:'JDP Mechanical', colors:['#1e40af','#0f1a14','#f59e0b','#a8b0aa'] },
  ];
  const Swatch = ({ color, label, hex }) => (
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      <div style={{width:36, height:36, borderRadius:6, background:color, border:'1px solid rgba(0,0,0,0.08)'}} />
      <div>
        <div style={{fontSize:12.5, fontWeight:500}}>{label}</div>
        <div className="mono muted" style={{fontSize:11}}>{hex}</div>
      </div>
    </div>
  );
  return (
    <Shell active="palette" crumbs={['Settings', 'Site Config']}
      topbarExtra={<>
        <button className="btn btn-sm">Reset</button>
        <button className="btn btn-primary"><Icon name="check" size={12}/> Save changes</button>
      </>}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Site Configuration</h1>
            <div className="page-sub">Brand and color theme for your public-facing askanddeliver.com</div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start'}}>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Company information</div>
                <span className="muted" style={{fontSize:11.5}}>Appears on invoices</span>
              </div>
              <div style={{padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <label style={{display:'flex', flexDirection:'column', gap:4}}>
                  <span className="muted" style={{fontSize:11.5, fontWeight:500}}>Company name</span>
                  <input className="input" defaultValue="Ask and Deliver" />
                </label>
                <label style={{display:'flex', flexDirection:'column', gap:4}}>
                  <span className="muted" style={{fontSize:11.5, fontWeight:500}}>Email</span>
                  <input className="input" defaultValue="linder@askanddeliver.com" />
                </label>
                <label style={{display:'flex', flexDirection:'column', gap:4}}>
                  <span className="muted" style={{fontSize:11.5, fontWeight:500}}>Phone</span>
                  <input className="input" defaultValue="(531) 215-9902" />
                </label>
                <label style={{display:'flex', flexDirection:'column', gap:4}}>
                  <span className="muted" style={{fontSize:11.5, fontWeight:500}}>Address</span>
                  <input className="input" defaultValue="808 4th Street, Brookings, SD 57006" />
                </label>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Brand palette</div>
                <span className="muted" style={{fontSize:11.5}}>Active: Original Palette</span>
              </div>
              <div style={{padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:18}}>
                <div>
                  <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10}}>Primary</div>
                  <div style={{display:'flex', flexDirection:'column', gap:10}}>
                    <Swatch color="#5fa823" label="Brand primary" hex="#5FA823" />
                    <Swatch color="#dcedc4" label="Light variant" hex="#DCEDC4" />
                    <Swatch color="#3d6f15" label="Dark variant" hex="#3D6F15" />
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10}}>Surfaces & accents</div>
                  <div style={{display:'flex', flexDirection:'column', gap:10}}>
                    <Swatch color="#f7f8f7" label="Background" hex="#F7F8F7" />
                    <Swatch color="#ffffff" label="Surface" hex="#FFFFFF" />
                    <Swatch color="#0f1a14" label="Text / heading" hex="#0F1A14" />
                    <Swatch color="#a8b0aa" label="Cool accent" hex="#A8B0AA" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Live preview</div>
              </div>
              <div style={{padding:14, display:'flex', flexDirection:'column', gap:8}}>
                <div style={{border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', background:'white'}}>
                  <div style={{padding:'10px 12px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontWeight:700, fontSize:13}}>Ask<span style={{color:'#5fa823'}}>+</span>Deliver</span>
                    <span className="muted" style={{fontSize:11, marginLeft:'auto'}}>Work · About</span>
                    <button className="btn btn-sm" style={{height:22, fontSize:11}}>Start a Project</button>
                  </div>
                  <div style={{padding:14}}>
                    <div className="mono muted" style={{fontSize:9.5, letterSpacing:'.1em', textTransform:'uppercase'}}>Creative Collective</div>
                    <div style={{fontWeight:700, fontSize:18, letterSpacing:'-0.02em', marginTop:4}}>Ask<span style={{color:'#5fa823'}}>+</span>Deliver</div>
                    <div className="muted" style={{fontSize:11, marginTop:4, lineHeight:1.4}}>A creative collective bringing exceptional projects to life.</div>
                    <div style={{display:'flex', gap:6, marginTop:10}}>
                      <button className="btn btn-sm btn-primary" style={{height:24, fontSize:11}}>View Our Work →</button>
                      <button className="btn btn-sm" style={{height:24, fontSize:11}}>Start a Project</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">Saved palettes</div>
                <button className="btn btn-sm btn-ghost"><Icon name="plus" size={11}/> Save current</button>
              </div>
              <div style={{padding:6}}>
                {palettes.map((p, i) => (
                  <div key={i} className="list-row" style={{gridTemplateColumns:'auto 1fr 14px', gap:10, padding:'8px 10px', borderBottom:'none', borderRadius:6}}>
                    <div style={{display:'flex', gap:2}}>
                      {p.colors.map((c, j) => (
                        <span key={j} style={{width:10, height:10, borderRadius:'50%', background:c, border:'1px solid rgba(0,0,0,0.06)'}} />
                      ))}
                    </div>
                    <span style={{fontSize:12.5, fontWeight: i===0?600:400}}>{p.name}</span>
                    {i===0 && <Icon name="check" size={12} />}
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
window.SiteConfigScreen = SiteConfigScreen;
