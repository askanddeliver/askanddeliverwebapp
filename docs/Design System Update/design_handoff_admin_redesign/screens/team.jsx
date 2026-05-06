// Settings: Team
const TeamScreen = () => {
  const members = [
    { name:'Margaret Sweany', email:'maggie.sweany@gmail.com', role:'Member', status:'Active', color:'pink' },
    { name:'Matt Linder', email:'iamlinder@gmail.com', role:'Member', status:'Active', color:'blue' },
    { name:'Matt Linder', email:'mattlinder@gmail.com', role:'Admin', status:'Active', color:'green' },
  ];
  return (
    <Shell active="team" crumbs={['Settings', 'Team']}
      topbarExtra={<button className="btn btn-primary"><Icon name="plus" size={13}/> Add by email</button>}>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Team</h1>
            <div className="page-sub">3 members · 1 admin · invite-link enabled</div>
          </div>
        </div>

        <div className="panel" style={{marginBottom:16, background:'var(--green-50)', borderColor:'var(--green-200)'}}>
          <div style={{padding:'12px 16px', display:'flex', alignItems:'center', gap:14}}>
            <div style={{width:32, height:32, borderRadius:8, background:'var(--green-100)', display:'grid', placeItems:'center', color:'var(--green-700)'}}>
              <Icon name="send" size={14}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:13}}>Invite link</div>
              <div className="muted" style={{fontSize:12}}>Anyone with this link can sign up. Add them to the workspace from the list below.</div>
            </div>
            <input className="input mono" style={{width:280, fontSize:12}} value="https://askanddeliver.com/join/h7s2k" readOnly />
            <button className="btn btn-sm"><Icon name="check" size={11}/> Copy</button>
          </div>
        </div>

        <div className="panel">
          <div style={{display:'grid', gridTemplateColumns:'1fr 120px 90px 80px', gap:10, padding:'9px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.04em'}}>
            <span>Member</span><span>Role</span><span>Status</span><span style={{textAlign:'right'}}>Actions</span>
          </div>
          {members.map((m, i) => (
            <div key={i} className="list-row" style={{gridTemplateColumns:'1fr 120px 90px 80px', gap:10, padding:'12px 16px'}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <Avatar name={m.name} color={m.color} size="lg" />
                <div>
                  <div style={{fontWeight:600, fontSize:13}}>{m.name}</div>
                  <div className="muted" style={{fontSize:12}}>{m.email}</div>
                </div>
              </div>
              <span><span className={`badge ${m.role === 'Admin' ? 'green' : 'blue'}`}>{m.role}</span></span>
              <span><span className="badge green">{m.status}</span></span>
              <div style={{display:'flex', justifyContent:'flex-end', gap:2}}>
                <button className="btn btn-icon btn-sm btn-ghost"><Icon name="settings" size={12}/></button>
                {m.role !== 'Admin' && <button className="btn btn-icon btn-sm btn-ghost"><Icon name="more" size={12}/></button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};
window.TeamScreen = TeamScreen;
