// Settings: Task Types
const TaskTypesScreen = () => {
  const types = [
    { name:'Admin', rate:20, color:'var(--task-admin)' },
    { name:'Design', rate:90, color:'var(--task-design)' },
    { name:'Development', rate:130, color:'var(--task-development)' },
    { name:'Fixed Rate Design', rate:25, color:'var(--task-fixed)' },
    { name:'Meeting', rate:50, color:'var(--task-meeting)' },
    { name:'Research', rate:40, color:'var(--task-research)' },
    { name:'Strategy', rate:125, color:'var(--task-strategy)' },
    { name:'Support', rate:40, color:'var(--task-support)' },
    { name:'Testing', rate:50, color:'var(--task-testing)' },
  ];
  return (
    <Shell active="tag" crumbs={['Settings', 'Task Types']}
      topbarExtra={<button className="btn btn-primary"><Icon name="plus" size={13}/> New task type</button>}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Task Types</h1>
            <div className="page-sub">9 types · sets the color and default hourly rate when logging time</div>
          </div>
        </div>

        <div className="panel">
          <div style={{display:'grid', gridTemplateColumns:'18px 1fr 100px 90px 60px', gap:12, padding:'9px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.04em'}}>
            <span></span><span>Name</span><span style={{textAlign:'right'}}>Rate</span><span style={{textAlign:'right'}}>Used</span><span></span>
          </div>
          {types.map((t, i) => (
            <div key={i} className="list-row" style={{gridTemplateColumns:'18px 1fr 100px 90px 60px', gap:12, padding:'11px 16px'}}>
              <span className="dot" style={{background:t.color, width:10, height:10}} />
              <span style={{fontWeight:500, fontSize:13.5}}>{t.name}</span>
              <span className="mono" style={{textAlign:'right', fontWeight:500}}>${t.rate}<span className="muted" style={{fontSize:11}}>/hr</span></span>
              <span className="mono muted" style={{textAlign:'right', fontSize:12}}>{Math.round(Math.random()*40+5)} entries</span>
              <div style={{display:'flex', justifyContent:'flex-end', gap:2}}>
                <button className="btn btn-icon btn-sm btn-ghost"><Icon name="settings" size={12}/></button>
                <button className="btn btn-icon btn-sm btn-ghost"><Icon name="more" size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};
window.TaskTypesScreen = TaskTypesScreen;
