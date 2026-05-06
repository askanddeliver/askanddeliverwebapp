// Settings: Profile
const ProfileScreen = () => (
  <Shell active="user" crumbs={['Settings', 'Profile']}>
    <div className="page" style={{maxWidth:880}}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <div className="page-sub">Manage your personal account settings</div>
        </div>
      </div>

      <div className="panel" style={{marginBottom:16}}>
        <div style={{padding:20, display:'flex', alignItems:'center', gap:16}}>
          <div style={{width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg, #7bc847, #4f8e1c)', display:'grid', placeItems:'center', color:'white', fontSize:22, fontWeight:600}}>ML</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:600}}>Matt Linder</div>
            <div className="muted" style={{fontSize:13}}>mattlinder@gmail.com</div>
            <div style={{display:'flex', gap:6, marginTop:6}}>
              <span className="badge green">Admin</span>
              <span className="badge"><Icon name="check" size={9} /> Email verified</span>
              <span className="badge">Google SSO</span>
            </div>
          </div>
          <button className="btn"><Icon name="user" size={12}/> Change photo</button>
        </div>
      </div>

      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header">
          <div className="panel-title">Display name</div>
        </div>
        <div style={{padding:16, display:'flex', flexDirection:'column', gap:10}}>
          <div className="muted" style={{fontSize:12.5}}>Appears in team lists, reports, and member hours.</div>
          <div style={{display:'flex', gap:8}}>
            <input className="input" defaultValue="Matt Linder" style={{maxWidth:320}} />
            <button className="btn btn-primary">Save</button>
          </div>
        </div>
      </div>

      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header">
          <div className="panel-title">Account details</div>
        </div>
        <div style={{padding:16, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20}}>
          <div>
            <div className="muted" style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:4}}>User ID</div>
            <div className="mono" style={{fontSize:11.5, background:'var(--bg)', padding:'4px 6px', borderRadius:4, border:'1px solid var(--border)', wordBreak:'break-all'}}>google-oauth2|115171302104519065685</div>
          </div>
          <div>
            <div className="muted" style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:4}}>Nickname</div>
            <div style={{fontSize:13}}>mattlinder</div>
          </div>
          <div>
            <div className="muted" style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:4}}>Last updated</div>
            <div style={{fontSize:13}}>May 4, 2026 · 7:37 AM</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Raw user data</div>
          <span className="muted" style={{fontSize:11.5}}>From Auth0 · debugging only</span>
        </div>
        <pre className="mono" style={{margin:0, padding:'14px 16px', background:'#0d1916', color:'#86efac', fontSize:11.5, lineHeight:1.55, overflow:'auto', borderRadius:0}}>{`{
  "given_name": "Matt",
  "family_name": "Linder",
  "nickname": "mattlinder",
  "name": "Matt Linder",
  "picture": "https://lh3.googleusercontent.com/a/ACg8ocJEHl…s96-c",
  "updated_at": "2026-05-04T12:37:28.817Z",
  "email": "mattlinder@gmail.com",
  "email_verified": true,
  "sub": "google-oauth2|115171302104519065685"
}`}</pre>
      </div>
    </div>
  </Shell>
);
window.ProfileScreen = ProfileScreen;
