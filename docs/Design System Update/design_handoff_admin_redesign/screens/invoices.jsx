// Invoices — compact list with status, aging, inline amounts
const InvoicesScreen = () => {
  const invoices = [
    { num:'260504-2', client:'Chris Circo', co:'Battle Sports', desc:'Retainer utilization · Systems Web Support', period:'Oct 1, 2025 – May 4, 2026', amt:'$506.67', status:'paid', date:'May 4, 2026', age:0 },
    { num:'260504-1', client:'Joel Foresman', co:'Jorkin Joe\'s BBQ', desc:'WordPress site updates', period:'Mar 1 – May 4, 2026', amt:'$445.00', status:'paid', date:'May 4, 2026', age:0 },
    { num:'260404-2', client:'Chris Circo', co:'Battle Sports', desc:'March design services', period:'Mar 1 – Mar 31, 2026', amt:'$1,633.30', status:'sent', date:'Apr 4, 2026', age:32 },
    { num:'260404-1', client:'Tyler Herring', co:'TwinTack', desc:'Custom Grip plugin build', period:'Mar 1 – Mar 31, 2026', amt:'$227.92', status:'paid', date:'Apr 4, 2026', age:0 },
    { num:'260226-1', client:'Chris Circo', co:'Battle Sports', desc:'Battle7 Referee FlexQuiz · 2-month subscription', period:'Dec 31 – Mar 4, 2026', amt:'$166.56', status:'paid', date:'Mar 4, 2026', age:0 },
    { num:'260304-1', client:'Chris Circo', co:'Battle Sports', desc:'February Battle design services', period:'Jan 31 – Feb 27, 2026', amt:'$546.83', status:'paid', date:'Mar 4, 2026', age:0 },
    { num:'260220-1', client:'Chris Circo', co:'Battle Sports', desc:'December and January design services', period:'Nov 30 – Jan 30, 2026', amt:'$1,125.00', status:'paid', date:'Mar 4, 2026', age:0 },
    { num:'260303-1', client:'Tyler Herring', co:'TwinTack', desc:'February TwinTack design services', period:'Jan 31 – Feb 27, 2026', amt:'$184.86', status:'paid', date:'Mar 4, 2026', age:0 },
    { num:'260225-1', client:'Tyler Herring', co:'TwinTack', desc:'TwinTack Custom Grip plugin build', period:'Dec 31 – Mar 4, 2026', amt:'$812.50', status:'paid', date:'Mar 4, 2026', age:0 },
  ];

  return (
    <Shell active="invoices" crumbs={['Time Tracking', 'Invoices']}
      topbarExtra={<button className="btn btn-primary"><Icon name="plus" size={13}/> New invoice</button>}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Invoices</h1>
            <div className="page-sub">9 invoices · last 6 months</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-sm"><Icon name="download" size={12}/> Export CSV</button>
          </div>
        </div>

        <div className="stat-strip">
          <div className="stat">
            <div className="stat-label">Drafts</div>
            <div className="stat-value">0</div>
          </div>
          <div className="stat">
            <div className="stat-label" style={{color:'var(--amber-500)'}}><Icon name="send" size={11}/> Outstanding</div>
            <div className="stat-value">$1,633<span className="muted" style={{fontSize:14, fontWeight:500}}>.30</span></div>
            <div className="stat-delta"><span style={{color:'var(--amber-500)'}}>1 invoice · 32d aging</span></div>
          </div>
          <div className="stat">
            <div className="stat-label" style={{color:'var(--green-600)'}}><Icon name="check" size={11}/> Collected (YTD)</div>
            <div className="stat-value">$4,015<span className="muted" style={{fontSize:14, fontWeight:500}}>.34</span></div>
            <div className="stat-delta pos"><Icon name="arrowup" size={10}/> 8 invoices</div>
          </div>
          <div className="stat">
            <div className="stat-label">Avg time to pay</div>
            <div className="stat-value">11<span className="muted" style={{fontSize:14, fontWeight:500}}> days</span></div>
            <div className="stat-delta pos"><Icon name="arrowdown" size={10}/> 3d vs Q1</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="tabs">
            <div className="tab active">All <span className="num">9</span></div>
            <div className="tab">Draft <span className="num">0</span></div>
            <div className="tab">Sent <span className="num">1</span></div>
            <div className="tab">Paid <span className="num">8</span></div>
          </div>
          <select className="input" style={{width:160}}><option>All clients</option></select>
          <input className="input" style={{flex:1, maxWidth:280}} placeholder="Search invoice #…" />
        </div>

        <div className="panel">
          <div style={{display:'grid', gridTemplateColumns:'110px 70px 1fr 220px 170px 120px 110px', gap:10, padding:'9px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.04em'}}>
            <span>Invoice</span><span>Status</span><span>Description</span><span>Client</span><span>Period</span><span style={{textAlign:'right'}}>Amount</span><span style={{textAlign:'right'}}>Date</span>
          </div>
          {invoices.map(inv => (
            <div key={inv.num} className="list-row" style={{gridTemplateColumns:'110px 70px 1fr 220px 170px 120px 110px', gap:10, padding:'10px 16px'}}>
              <span className="mono" style={{fontSize:12, fontWeight:500}}>{inv.num}</span>
              <span>
                {inv.status === 'paid' && <span className="badge green">Paid</span>}
                {inv.status === 'sent' && <span className="badge amber">Sent</span>}
                {inv.status === 'draft' && <span className="badge">Draft</span>}
              </span>
              <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5}}>{inv.desc}</span>
              <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0}}>
                <Avatar name={inv.client} color={inv.co.includes('Battle')?'amber':inv.co.includes('TwinTack')?'green':'blue'} />
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{inv.client}</div>
                  <div className="muted" style={{fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{inv.co}</div>
                </div>
              </div>
              <span className="muted mono" style={{fontSize:11}}>{inv.period}</span>
              <span className="mono" style={{textAlign:'right', fontWeight:600, fontSize:13}}>{inv.amt}</span>
              <span className="muted mono" style={{textAlign:'right', fontSize:11.5}}>{inv.date}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};
window.InvoicesScreen = InvoicesScreen;
