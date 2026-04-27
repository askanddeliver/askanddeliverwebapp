// bt-calendar.jsx — WeekView, MonthView, DayView

// ─── Shared block renderer ────────────────────────────────────────────────────
function CalBlock({ block, onClick, onResizeStart, compact }) {
  const color = getBlockColor(block);
  const tc = getContrastColor(color);
  const client = CLIENTS.find(c => c.id === block.clientId);
  const showKind = block.kind !== 'WORK';

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(block, e); }}
      style={{
        position:'absolute', inset:0, borderRadius:6,
        background:color, color:tc,
        padding: compact ? '2px 6px' : '5px 8px',
        overflow:'hidden', cursor:'pointer', userSelect:'none',
        boxShadow:'0 1px 4px rgba(0,0,0,0.13)', zIndex:5,
        display:'flex', flexDirection:'column',
      }}
    >
      {!compact && showKind && (
        <span style={{
          position:'absolute', top:5, right:6,
          fontSize:9, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase',
          background:alphaHex(tc, 0.18), color:tc, borderRadius:3, padding:'1px 4px',
        }}>{KIND_META[block.kind].label}</span>
      )}
      <div style={{
        fontSize:12, fontWeight:700, lineHeight:1.3,
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        paddingRight: showKind && !compact ? 42 : 0,
      }}>{block.title}</div>
      {!compact && client && (
        <div style={{fontSize:10, opacity:0.8, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
          {client.name}
        </div>
      )}
      {!compact && (
        <div style={{fontSize:10, opacity:0.65, marginTop:1}}>
          {fmtTime(block.start)}–{fmtTime(block.end)}
        </div>
      )}
      {onResizeStart && (
        <div
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onResizeStart(e, block); }}
          style={{position:'absolute', bottom:0, left:0, right:0, height:8, cursor:'ns-resize',
            display:'flex', alignItems:'center', justifyContent:'center'}}
        >
          <div style={{width:20, height:2, borderRadius:1, background:tc, opacity:0.3}} />
        </div>
      )}
    </div>
  );
}

// ─── Shared resize logic ──────────────────────────────────────────────────────
function useResizeDrag(onBlockResize) {
  return React.useCallback((e, block) => {
    const origEnd = new Date(block.end);
    const startY = e.clientY;
    const onMove = me => {
      const dy = me.clientY - startY;
      const deltaMins = Math.round((dy / PX_PER_HR) * 60 / 15) * 15;
      const newEnd = new Date(origEnd.getTime() + deltaMins * 60000);
      const minEnd = new Date(block.start.getTime() + 15 * 60000);
      onBlockResize(block.id, newEnd > minEnd ? newEnd : minEnd);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onBlockResize]);
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({ blocks, weekStart, onSlotClick, onBlockClick, onBlockResize, theme: t }) {
  const hours = Array.from({length: HOUR_END-HOUR_START}, (_,i) => HOUR_START+i);
  const days  = Array.from({length: 7}, (_,i) => addDays(weekStart, i));
  const today = new Date();
  const scrollRef = React.useRef(null);
  const startResize = useResizeDrag(onBlockResize);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = PX_PER_HR; // start at 8am
  }, []);

  const nowH   = today.getHours() + today.getMinutes()/60;
  const nowTop = (nowH - HOUR_START) * PX_PER_HR;
  const showNow = nowH > HOUR_START && nowH < HOUR_END;
  const GUTTER = 52;

  const handleColClick = (e, day) => {
    // getBoundingClientRect already accounts for scroll position
    const rect = e.currentTarget.getBoundingClientRect();
    const rawH = (e.clientY - rect.top) / PX_PER_HR + HOUR_START;
    const h = Math.max(HOUR_START, Math.min(HOUR_END-1, Math.floor(rawH)));
    onSlotClick(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0));
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      {/* Day header row */}
      <div style={{display:'flex', borderBottom:`1px solid ${t.border}`, flexShrink:0, background:t.headerBg}}>
        <div style={{width:GUTTER, flexShrink:0}} />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} style={{flex:1, textAlign:'center', padding:'8px 0 6px', borderLeft:`1px solid ${t.border}`}}>
              <div style={{fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:t.muted}}>
                {day.toLocaleDateString('en-US',{weekday:'short'})}
              </div>
              <div style={{
                fontSize:20, fontWeight:700, lineHeight:1.1, marginTop:2,
                color: isToday ? '#fff' : t.text,
                background: isToday ? t.accent : 'transparent',
                borderRadius:'50%', width:34, height:34,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>{day.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} style={{flex:1, overflowY:'auto', position:'relative', background:t.calBg}}>
        <div style={{display:'flex', minHeight:(HOUR_END-HOUR_START)*PX_PER_HR, position:'relative'}}>
          {/* Time gutter */}
          <div style={{width:GUTTER, flexShrink:0, position:'relative'}}>
            {hours.map(h => (
              <div key={h} style={{
                position:'absolute', top:(h-HOUR_START)*PX_PER_HR-9,
                right:8, fontSize:11, color:t.muted, fontWeight:500, userSelect:'none',
              }}>
                {h===12?'12pm':h>12?`${h-12}pm`:`${h}am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => (
            <div key={di} onClick={e => handleColClick(e, day)} style={{
              flex:1, position:'relative', cursor:'crosshair',
              borderLeft:`1px solid ${t.border}`,
              background: isSameDay(day,today) ? t.todayBg : 'transparent',
            }}>
              {hours.map(h => (
                <React.Fragment key={h}>
                  <div style={{position:'absolute', top:(h-HOUR_START)*PX_PER_HR, left:0, right:0, borderTop:`1px solid ${t.border}`, pointerEvents:'none'}} />
                  <div style={{position:'absolute', top:(h-HOUR_START+0.5)*PX_PER_HR, left:0, right:0, borderTop:`1px dashed ${t.halfHour}`, pointerEvents:'none'}} />
                </React.Fragment>
              ))}
              {/* Current time dot (only on today) */}
              {showNow && isSameDay(day, today) && (
                <div style={{position:'absolute', top:nowTop-4, left:-4, width:8, height:8, borderRadius:'50%', background:'#EF4444', zIndex:11, pointerEvents:'none'}} />
              )}
              {/* Blocks */}
              {blocks.filter(b => isSameDay(b.start, day)).map(block => {
                const sH = Math.max(0, (block.start.getHours()+block.start.getMinutes()/60-HOUR_START)*PX_PER_HR);
                const bH = Math.max(24, ((block.end-block.start)/3600000)*PX_PER_HR);
                return (
                  <div key={block.id} style={{position:'absolute', top:sH+1, left:3, right:3, height:bH-2}}>
                    <CalBlock block={block} onClick={onBlockClick} onResizeStart={startResize} compact={bH<50} />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Current time line spanning all columns */}
          {showNow && (
            <div style={{position:'absolute', top:nowTop-1, left:GUTTER-2, right:0, height:2, background:'#EF4444', opacity:0.4, zIndex:10, pointerEvents:'none'}} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────
function MonthView({ blocks, currentDate, onDayClick, onBlockClick, theme: t }) {
  const today = new Date();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const firstDay = startOfWeek(monthStart);
  const allDays = Array.from({length:42}, (_,i) => addDays(firstDay, i));
  const weeks = Array.from({length:6}, (_,i) => allDays.slice(i*7, i*7+7));
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:t.calBg}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`1px solid ${t.border}`, background:t.headerBg}}>
        {DOW.map(d => (
          <div key={d} style={{textAlign:'center', padding:'8px 0', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:t.muted}}>
            {d}
          </div>
        ))}
      </div>
      <div style={{flex:1, overflow:'auto', display:'flex', flexDirection:'column'}}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', flex:1, borderBottom:`1px solid ${t.border}`, minHeight:96}}>
            {week.map((day, di) => {
              const inMonth = day.getMonth()===currentDate.getMonth();
              const isToday = isSameDay(day, today);
              const dayBlocks = blocks.filter(b => isSameDay(b.start, day)).slice(0,3);
              return (
                <div key={di} onClick={()=>onDayClick(day)} style={{
                  borderLeft: di>0?`1px solid ${t.border}`:'none',
                  padding:'6px 8px', cursor:'pointer',
                  background: isToday ? t.todayBg : 'transparent',
                  opacity: inMonth ? 1 : 0.38,
                }}>
                  <div style={{
                    fontSize:13, fontWeight: isToday?700:500, marginBottom:4,
                    color: isToday ? t.accent : t.text,
                    width:24, height:24, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: isToday ? alphaHex(t.accent, 0.12) : 'transparent',
                  }}>{day.getDate()}</div>
                  {dayBlocks.map(b => {
                    const color = getBlockColor(b);
                    const tc = getContrastColor(color);
                    return (
                      <div key={b.id} onClick={e=>{e.stopPropagation(); onBlockClick(b,e);}} style={{
                        background:color, color:tc, borderRadius:3,
                        padding:'1px 5px', marginBottom:2,
                        fontSize:10, fontWeight:600,
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                        cursor:'pointer',
                      }}>{b.title}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────
function DayView({ blocks, currentDate, onSlotClick, onBlockClick, onBlockResize, theme: t }) {
  const today = new Date();
  const scrollRef = React.useRef(null);
  const startResize = useResizeDrag(onBlockResize);
  const hours = Array.from({length: HOUR_END-HOUR_START}, (_,i) => HOUR_START+i);
  const nowH = today.getHours()+today.getMinutes()/60;
  const nowTop = (nowH-HOUR_START)*PX_PER_HR;
  const showNow = isSameDay(currentDate,today) && nowH > HOUR_START && nowH < HOUR_END;
  const GUTTER = 52;

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = PX_PER_HR;
  }, []);

  const handleClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawH = (e.clientY - rect.top) / PX_PER_HR + HOUR_START;
    const h = Math.max(HOUR_START, Math.min(HOUR_END-1, Math.floor(rawH)));
    onSlotClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), h, 0));
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      <div style={{padding:'10px 20px', borderBottom:`1px solid ${t.border}`, flexShrink:0, background:t.headerBg}}>
        <div style={{fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:t.muted}}>
          {currentDate.toLocaleDateString('en-US',{weekday:'long'})}
        </div>
        <div style={{fontSize:22, fontWeight:700, color:t.text, lineHeight:1.2}}>
          {currentDate.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
        </div>
      </div>
      <div ref={scrollRef} style={{flex:1, overflowY:'auto', background:t.calBg}}>
        <div style={{display:'flex', minHeight:(HOUR_END-HOUR_START)*PX_PER_HR, position:'relative'}}>
          <div style={{width:GUTTER, flexShrink:0, position:'relative'}}>
            {hours.map(h=>(
              <div key={h} style={{position:'absolute', top:(h-HOUR_START)*PX_PER_HR-9, right:8, fontSize:11, color:t.muted, fontWeight:500, userSelect:'none'}}>
                {h===12?'12pm':h>12?`${h-12}pm`:`${h}am`}
              </div>
            ))}
          </div>
          <div onClick={handleClick} style={{flex:1, position:'relative', cursor:'crosshair', borderLeft:`1px solid ${t.border}`}}>
            {hours.map(h=>(
              <React.Fragment key={h}>
                <div style={{position:'absolute', top:(h-HOUR_START)*PX_PER_HR, left:0, right:0, borderTop:`1px solid ${t.border}`, pointerEvents:'none'}} />
                <div style={{position:'absolute', top:(h-HOUR_START+0.5)*PX_PER_HR, left:0, right:0, borderTop:`1px dashed ${t.halfHour}`, pointerEvents:'none'}} />
              </React.Fragment>
            ))}
            {showNow && (
              <div style={{position:'absolute', top:nowTop-1, left:-4, right:0, zIndex:11, pointerEvents:'none', display:'flex', alignItems:'center'}}>
                <div style={{width:8, height:8, borderRadius:'50%', background:'#EF4444', flexShrink:0}} />
                <div style={{flex:1, height:2, background:'#EF4444'}} />
              </div>
            )}
            {blocks.filter(b=>isSameDay(b.start,currentDate)).map(block => {
              const sH = Math.max(0, (block.start.getHours()+block.start.getMinutes()/60-HOUR_START)*PX_PER_HR);
              const bH = Math.max(24, ((block.end-block.start)/3600000)*PX_PER_HR);
              return (
                <div key={block.id} style={{position:'absolute', top:sH+1, left:8, right:8, height:bH-2}}>
                  <CalBlock block={block} onClick={onBlockClick} onResizeStart={startResize} compact={bH<50} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WeekView, MonthView, DayView });
