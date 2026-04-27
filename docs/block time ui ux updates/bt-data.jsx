// bt-data.jsx — shared data, utilities, color helpers
const HOUR_START = 7, HOUR_END = 21, PX_PER_HR = 64;

const CLIENTS = [
  { id:'c1', name:'Chris Circo',      color:'#3B82F6' },
  { id:'c2', name:'David Cooke',      color:'#8B5CF6' },
  { id:'c3', name:'Tyler Herring',    color:'#0EA5E9' },
  { id:'c4', name:'Eric Gautschi',    color:'#F97316' },
  { id:'c5', name:'Matt Linder',      color:'#64748B', isInternal:true },
  { id:'c6', name:'Joel Foresman',    color:'#EC4899' },
  { id:'c7', name:'Marco Rutigliano', color:'#10B981' },
];

const KIND_META = {
  WORK:     { label:'Work',     color:'#3B82F6' },
  PERSONAL: { label:'Personal', color:'#F59E0B' },
  DOWNTIME: { label:'Downtime', color:'#94A3B8' },
  MEETING:  { label:'Meeting',  color:'#EF4444' },
  ADMIN:    { label:'Admin',    color:'#A855F7' },
};

const PROJECTS = [
  { id:'p1', clientId:'c1', name:'2026 Brand Identity' },
  { id:'p2', clientId:'c1', name:'Logo Refinement' },
  { id:'p3', clientId:'c2', name:'Quarterly Reports' },
  { id:'p4', clientId:'c3', name:'2026 Novelty Grip Designs' },
  { id:'p5', clientId:'c4', name:'Website Redesign' },
  { id:'p6', clientId:'c5', name:'Ask+Deliver Web App' },
  { id:'p7', clientId:'c6', name:'Portfolio Site' },
  { id:'p8', clientId:'c7', name:'Brand Assets' },
];

function md(dayOffset, h, m=0) { return new Date(2026,3,20+dayOffset,h,m); }
let _uid=1; const uid=()=>'b'+(_uid++);

const INITIAL_BLOCKS = [
  { id:uid(), title:'Logo Refinement',     kind:'WORK',     clientId:'c1', projectId:'p2', start:md(0,9),    end:md(0,11)   },
  { id:uid(), title:'Brand Review Call',   kind:'MEETING',  clientId:'c1', projectId:'p1', start:md(0,13),   end:md(0,14)   },
  { id:uid(), title:'Weekly Sync',         kind:'MEETING',  clientId:'c2',                 start:md(1,9),    end:md(1,10)   },
  { id:uid(), title:'Novelty Grip Design', kind:'WORK',     clientId:'c3', projectId:'p4', start:md(1,10,30),end:md(1,13)   },
  { id:uid(), title:'Website Copy Review', kind:'WORK',     clientId:'c4', projectId:'p5', start:md(2,9),    end:md(2,11)   },
  { id:uid(), title:'App Dev — Internal',  kind:'WORK',     clientId:'c5', projectId:'p6', start:md(2,14),   end:md(2,16)   },
  { id:uid(), title:'Design Deep Work',    kind:'WORK',     clientId:'c3', projectId:'p4', start:md(3,9),    end:md(3,12)   },
  { id:uid(), title:'Lunch',               kind:'DOWNTIME',                                start:md(3,12),   end:md(3,13)   },
  { id:uid(), title:'Portfolio Review',    kind:'WORK',     clientId:'c6', projectId:'p7', start:md(4,10),   end:md(4,12)   },
  { id:uid(), title:'Admin & Bookkeeping', kind:'ADMIN',                                   start:md(4,14),   end:md(4,16)   },
];

// ─── Color utilities ─────────────────────────────────────────────────────────
function getBlockColor(b) {
  if (b.clientId) { const c=CLIENTS.find(x=>x.id===b.clientId); if(c) return c.color; }
  return KIND_META[b.kind]?.color || '#6B7280';
}
function getContrastColor(hex) {
  if (!hex||hex.length<7) return '#fff';
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), bv=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*bv)/255 > 0.55 ? '#1e293b' : '#ffffff';
}
function alphaHex(hex, a) {
  // returns hex with alpha as rgba string
  if (!hex||hex.length<7) return hex;
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), bv=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${bv},${a})`;
}

// ─── Date utilities ───────────────────────────────────────────────────────────
function fmtTime(d) {
  const h=d.getHours(), m=d.getMinutes(), ap=h>=12?'pm':'am';
  return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''}${ap}`;
}
function fmtDur(s,e) {
  const mins=Math.round((e-s)/60000), h=Math.floor(mins/60), m=mins%60;
  return h&&m?`${h}h ${m}m`:h?`${h}h`:`${m}m`;
}
function isSameDay(a,b) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function addDays(d,n) { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d) {
  const r=new Date(d); const day=r.getDay();
  r.setDate(r.getDate()+(day===0?-6:1-day)); r.setHours(0,0,0,0); return r;
}
function newBlockId() { return 'b'+Date.now()+Math.random().toString(36).slice(2,6); }

Object.assign(window, {
  HOUR_START, HOUR_END, PX_PER_HR,
  CLIENTS, KIND_META, PROJECTS, INITIAL_BLOCKS,
  getBlockColor, getContrastColor, alphaHex,
  fmtTime, fmtDur, isSameDay, addDays, startOfWeek, newBlockId,
});
