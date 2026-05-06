// Time Entries — dense list with inline metadata, day grouping
const TaskDot = ({ type }) => {
  const colors = {
    Admin: 'var(--task-admin)', Design: 'var(--task-design)', Development: 'var(--task-development)',
    Meeting: 'var(--task-meeting)', Research: 'var(--task-research)', Strategy: 'var(--task-strategy)',
    Support: 'var(--task-support)', Testing: 'var(--task-testing)', 'Fixed Rate': 'var(--task-fixed)'
  };
  return <span className="dot" style={{background: colors[type] || 'var(--text-3)'}} />;
};

const EntriesScreen = () => {
  const days = [
    { date: 'Today · Wed, May 6', total: '0h 00m', billable: '$0', entries: [] },
    { date: 'Tue, May 5', total: '6h 12m', billable: '$487', entries: [
      { type:'Admin', task:'Proposal for Lubben Veterinary Website', project:'Admin Tasks', desc:'Revise proposal for WordPress build', dur:'27m', amt:'—', billed:false },
      { type:'Development', task:'Check Customly Configurations', project:'InspectionStamps.com', desc:'In Best Practices Repeat Layout', dur:'29m', amt:'$31.85' },
      { type:'Admin', task:'Proposal for Lubben Veterinary Website', project:'Admin Tasks', desc:'Lubben Veterinary Proposal (copy)', dur:'37m', amt:'—', block:true },
      { type:'Support', task:'Connect Google Ads to Battle Uniforms', project:'Systems Web Support', desc:'Review information from Brad and ad partner', dur:'15m', amt:'$10.80' },
      { type:'Development', task:'Duplicate Colop Rec set for Quick Dry', project:'InspectionStamps.com', desc:'', dur:'25m', amt:'$27.30' },
    ]},
    { date: 'Mon, May 4', total: '5h 47m', billable: '$612', entries: [
      { type:'Design', task:'Memorial Day / USA / Americana', project:'2026 Novelty Grip Designs', desc:'Americana grip design concepts', dur:'38m', amt:'$28.35', block:true },
      { type:'Admin', task:'Update Pre-Launch Tracker and Project Task List', project:'InspectionStamps.com', desc:'', dur:'20m', amt:'—' },
      { type:'Development', task:'Product Page Template Edits', project:'InspectionStamps.com', desc:'Add product SKU to template', dur:'15m', amt:'$16.25' },
      { type:'Development', task:'Product Page Template Edits', project:'InspectionStamps.com', desc:'Attach related products to product templates', dur:'1h 10m', amt:'$76.05' },
      { type:'Design', task:'Color Exploration for New Concepts', project:'2027 DSG Apparel', desc:'2027 DSG Color Exploration', dur:'50m', amt:'$37.35', block:true },
    ]},
    { date: 'Fri, May 1', total: '2h 35m', billable: '$245', entries: [
      { type:'Meeting', task:'Weekly check-in', project:'Battle Sports App', desc:'', dur:'45m', amt:'$37.50' },
      { type:'Strategy', task:'Q3 planning', project:'CED Careers Updates', desc:'Roadmap review', dur:'1h 50m', amt:'$229.16' },
    ]},
  ];

  return (
    <Shell active="entries" crumbs={['Time Tracking', 'Entries']}
      topbarExtra={<button className="btn btn-primary"><Icon name="plus" size={13}/> New entry</button>}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Time Entries</h1>
            <div className="page-sub">99 entries · 198h 16m total · last 30 days</div>
          </div>
          <div className="page-actions">
            <div className="tabs">
              <div className="tab active">All <span className="num">99</span></div>
              <div className="tab">Unbilled <span className="num">12</span></div>
              <div className="tab">Billed <span className="num">87</span></div>
            </div>
            <button className="btn btn-sm"><Icon name="filter" size={12}/> Filters</button>
            <button className="btn btn-sm"><Icon name="download" size={12}/> Export</button>
          </div>
        </div>

        <div className="panel">
          <div style={{display:'grid', gridTemplateColumns:'14px 1fr 240px 140px 90px 80px 60px', gap:10, padding:'8px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.04em'}}>
            <span></span><span>Task / Description</span><span>Project</span><span>User</span><span style={{textAlign:'right'}}>Duration</span><span style={{textAlign:'right'}}>Amount</span><span></span>
          </div>
          {days.map(day => (
            <React.Fragment key={day.date}>
              <div style={{display:'flex', alignItems:'center', gap:14, padding:'10px 16px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)', fontSize:12}}>
                <span style={{fontWeight:600}}>{day.date}</span>
                <span className="muted mono" style={{fontSize:11.5}}>{day.total}</span>
                <span className="mono" style={{fontSize:11.5, color:'var(--green-600)', fontWeight:500}}>{day.billable}</span>
                {day.entries.length === 0 && <span className="muted" style={{marginLeft:'auto', fontSize:11.5}}>No entries yet</span>}
              </div>
              {day.entries.map((e, i) => (
                <div key={i} className="list-row" style={{gridTemplateColumns:'14px 1fr 240px 140px 90px 80px 60px', gap:10, padding:'9px 16px'}}>
                  <TaskDot type={e.type} />
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.task}</div>
                    {e.desc && <div className="muted" style={{fontSize:11.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.desc}</div>}
                  </div>
                  <div className="muted" style={{fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.project}</div>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <Avatar name="Matt Linder" color="green" />
                    <span style={{fontSize:12}}>Matt Linder</span>
                  </div>
                  <div className="mono" style={{textAlign:'right', fontSize:12.5, fontWeight:500}}>{e.dur}</div>
                  <div className="mono" style={{textAlign:'right', fontSize:12.5, color: e.amt === '—' ? 'var(--text-3)' : 'var(--green-600)'}}>{e.amt}</div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:2}}>
                    {e.block && <span className="badge purple" title="From block">B</span>}
                    <button className="btn btn-icon btn-sm btn-ghost"><Icon name="more" size={12}/></button>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Shell>
  );
};
window.EntriesScreen = EntriesScreen;
