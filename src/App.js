import { useState, useEffect } from "react";
import { db, auth, googleProvider } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const PERIODS     = ["Work", "Study", "Home"];
const PERIOD_KEYS = ["work", "study", "house"];
const ICONS = { work: "💼", study: "📖", house: "🏠" };

const MORANDI = {
  work:  { main: "#9b8ea8", light: "#e8e3ed", soft: "#f4f1f7", text: "#6b5f78", dot: "#9b8ea8" },
  study: { main: "#7a9e8e", light: "#deeae5", soft: "#f0f6f3", text: "#4e7564", dot: "#7a9e8e" },
  house: { main: "#c49a6c", light: "#f0e4d4", soft: "#faf4ec", text: "#8a6440", dot: "#c49a6c" },
};

const PRIORITY_ORDER = { high: 0, mid: 1, low: 2 };
const PRIORITY_META = {
  high: { label: "重要", bg: "#f0e8e8", color: "#b07070" },
  mid:  { label: "普通", bg: "#f0ecdf", color: "#9a8558" },
  low:  { label: "低",   bg: "#e5ede8", color: "#5e8a6e" },
};

function genId() { return Math.random().toString(36).substr(2, 9); }
function toDateStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
const TODAY = () => toDateStr(new Date());
function isOverdue(dl)  { return !!dl && dl < TODAY(); }
function isDueToday(dl) { return !!dl && dl === TODAY(); }
function deadlineColor(dl, done) {
  if (done) return { border: "#ede9e4", color: "#c0bab4" };
  if (isOverdue(dl))  return { border: "#d4a8a0", color: "#b07070" };
  if (isDueToday(dl)) return { border: "#d4c48a", color: "#9a8558" };
  return { border: "#cdc8c2", color: "#7a7068" };
}

function fixArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}
function fixItems(val) {
  return fixArr(val).map(item => ({
    ...item,
    subtasks: fixArr(item.subtasks),
  }));
}
function toFirebase(todos) {
  const convert = items => {
    const obj = {};
    items.forEach((item, i) => {
      const subsObj = {};
      (item.subtasks || []).forEach((s, j) => { subsObj[j] = s; });
      obj[i] = { ...item, subtasks: subsObj };
    });
    return obj;
  };
  return {
    work:  convert(todos.work),
    study: convert(todos.study),
    house: convert(todos.house),
  };
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aDone = a.type === "project" ? (a.subtasks||[]).every(s => s.done) : a.done;
    const bDone = b.type === "project" ? (b.subtasks||[]).every(s => s.done) : b.done;
    if (aDone !== bDone) return aDone ? 1 : -1;
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    const ad = a.deadline || "9999";
    const bd = b.deadline || "9999";
    if (ad !== bd) return ad.localeCompare(bd);
    return b.createdAt - a.createdAt;
  });
}

function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); setLoading(false); }
  };
  return (
    <div style={{ minHeight:"100vh", background:"#f5f0eb", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans TC','PingFang TC',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ textAlign:"center", padding:40 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
        <h1 style={{ fontSize:24, fontWeight:700, color:"#3a3530", marginBottom:8 }}>Michelle's To-do List</h1>
        <p style={{ fontSize:14, color:"#b8afa8", marginBottom:32 }}>請登入以存取你的清單</p>
        <button onClick={handleLogin} disabled={loading} style={{
          display:"flex", alignItems:"center", gap:12, margin:"0 auto",
          padding:"12px 24px", borderRadius:12, border:"1.5px solid #ede9e4",
          background:"white", cursor:loading?"not-allowed":"pointer",
          fontSize:15, fontWeight:600, color:"#3a3530",
          boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
          fontFamily:"'Noto Sans TC',sans-serif", opacity:loading?0.7:1,
        }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "登入中..." : "使用 Google 帳號登入"}
        </button>
      </div>
    </div>
  );
}

function Calendar({ todos, activeKey, onSelectDay }) {
  const [curYear, setCurYear]   = useState(new Date().getFullYear());
  const [curMonth, setCurMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const today = TODAY();
  const firstDay    = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const accent = MORANDI[activeKey];
  const dMap = {};
  const addToMap = (date, item, cat) => {
    if (!date) return;
    if (!dMap[date]) dMap[date] = { work: [], study: [], house: [] };
    dMap[date][cat].push(item);
  };
  PERIOD_KEYS.forEach(k => {
    (todos[k] || []).forEach(item => {
      if (item.type === "project") {
        if (item.deadline) addToMap(item.deadline, { ...item, _isProject: true, _category: k }, k);
        (item.subtasks || []).forEach(s => { if (s.deadline) addToMap(s.deadline, { ...s, _parentTitle: item.title, _parentId: item.id, _category: k }, k); });
      } else {
        if (item.deadline) addToMap(item.deadline, { ...item, _category: k }, k);
      }
    });
  });
  const prevMonth = () => curMonth === 0 ? (setCurYear(y=>y-1), setCurMonth(11)) : setCurMonth(m=>m-1);
  const nextMonth = () => curMonth === 11 ? (setCurYear(y=>y+1), setCurMonth(0)) : setCurMonth(m=>m+1);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const handleDay = d => {
    const ds = `${curYear}-${String(curMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    setSelected(ds);
    const flat = Object.entries(dMap[ds] || {}).flatMap(([k, arr]) => arr.map(t => ({ ...t, _category: k })));
    onSelectDay && onSelectDay(ds, flat);
  };
  return (
    <div style={{ background:"white", borderRadius:18, border:"1.5px solid #ede9e4", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #f0ece8", background:accent.soft }}>
        <button onClick={prevMonth} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:accent.text, padding:"0 6px" }}>‹</button>
        <span style={{ fontWeight:700, fontSize:15, color:accent.text }}>{curYear} 年 {curMonth + 1} 月</span>
        <button onClick={nextMonth} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:accent.text, padding:"0 6px" }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", padding:"10px 10px 4px" }}>
        {["日","一","二","三","四","五","六"].map(w => (
          <div key={w} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:"#b8afa8" }}>{w}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", padding:"0 10px 14px", gap:2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>;
          const ds = `${curYear}-${String(curMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const day = dMap[ds];
          const isToday = ds === today;
          const isSel   = ds === selected;
          const hasWork  = day?.work?.some(t => !t.done && !(t.subtasks||[]).every(s=>s.done));
          const hasStudy = day?.study?.some(t => !t.done && !(t.subtasks||[]).every(s=>s.done));
          const hasHouse = day?.house?.some(t => !t.done && !(t.subtasks||[]).every(s=>s.done));
          const hasAny   = day && Object.values(day).flat().length > 0;
          const allDone  = hasAny && Object.values(day).flat().every(t => t.done || ((t.subtasks||[]).length>0 && (t.subtasks||[]).every(s=>s.done)));
          return (
            <div key={i} onClick={() => handleDay(d)} style={{ textAlign:"center", padding:"6px 2px 8px", borderRadius:10, cursor:"pointer", background:isSel?accent.main:isToday?accent.light:"transparent", transition:"background 0.15s" }}>
              <span style={{ fontSize:13, fontWeight:isToday?700:400, color:isSel?"white":isToday?accent.text:"#4a4540" }}>{d}</span>
              {hasAny && (
                <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:3 }}>
                  {allDone ? <div style={{ width:5,height:5,borderRadius:"50%", background:isSel?"rgba(255,255,255,0.7)":"#a8bfaa" }}/> : <>
                    {hasWork  && <div style={{ width:5,height:5,borderRadius:"50%", background:isSel?"rgba(255,255,255,0.85)":MORANDI.work.dot  }}/>}
                    {hasStudy && <div style={{ width:5,height:5,borderRadius:"50%", background:isSel?"rgba(255,255,255,0.85)":MORANDI.study.dot }}/>}
                    {hasHouse && <div style={{ width:5,height:5,borderRadius:"50%", background:isSel?"rgba(255,255,255,0.85)":MORANDI.house.dot }}/>}
                  </>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:14, padding:"8px 20px 12px", borderTop:"1px solid #f0ece8", flexWrap:"wrap", alignItems:"center" }}>
        {PERIOD_KEYS.map(k => (
          <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8,height:8,borderRadius:"50%", background:MORANDI[k].dot }}/>
            <span style={{ fontSize:11, color:MORANDI[k].text, fontWeight:600 }}>{PERIODS[PERIOD_KEYS.indexOf(k)]}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:8,height:8,borderRadius:"50%", background:"#a8bfaa" }}/>
          <span style={{ fontSize:11, color:"#8a9e8c" }}>全完成</span>
        </div>
      </div>
    </div>
  );
}

function DayDetail({ date, items, onToggle, onClose }) {
  if (!date) return null;
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => setLocalItems(items), [items]);
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString("zh-TW", { month:"long", day:"numeric", weekday:"short" });
  const handleToggle = (cat, itemId, subId) => {
    setLocalItems(prev => prev.map(t => {
      if (subId && t.id === subId && t._parentId) return { ...t, done: !t.done };
      if (!subId && t.id === itemId && !t._parentId) return { ...t, done: !t.done };
      return t;
    }));
    onToggle(cat, itemId, subId);
  };
  return (
    <div style={{ background:"#faf8f5", border:"1.5px solid #e8e3de", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontWeight:700, fontSize:14, color:"#5a5048" }}>📅 {label} 的截止任務</span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#b8afa8", fontSize:18 }}>×</button>
      </div>
      {localItems.length === 0
        ? <div style={{ fontSize:13, color:"#b8afa8" }}>這天沒有截止任務</div>
        : localItems.map((t,i) => {
          const cat = MORANDI[t._category] || MORANDI.work;
          const catLabel = PERIODS[PERIOD_KEYS.indexOf(t._category)];
          const isSubtask = !!t._parentTitle;
          const isDone = isSubtask
            ? t.done
            : t.type === "project"
              ? ((t.subtasks||[]).length > 0 && (t.subtasks||[]).every(s=>s.done))
              : t.done;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6,
              padding: isSubtask ? "6px 10px 6px 28px" : "8px 10px",
              background:"white", borderRadius:10, border:"1px solid #ede9e4",
              marginLeft: isSubtask ? 8 : 0,
            }}>
              {/* 勾選框：單一任務和子任務才有，大項目本身不顯示 */}
              {(t.type !== "project" || isSubtask) && (
                <button
                  onClick={() => handleToggle(t._category, isSubtask ? t._parentId : t.id, isSubtask ? t.id : null)}
                  style={{ width:18, height:18, borderRadius:5,
                    border:`2px solid ${t.done?cat.main:"#cdc8c2"}`,
                    background:t.done?cat.main:"white",
                    cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                  {t.done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              )}
              {t.type === "project" && !isSubtask && <span style={{ fontSize:13 }}>📁</span>}
              <span style={{ flex:1, fontSize:13, color:isDone?"#b8afa8":"#3a3530", textDecoration:isDone?"line-through":"none" }}>
                {isSubtask && <span style={{ color:"#b8afa8", fontSize:11 }}>{t._parentTitle} › </span>}
                {t.title || t.text}
              </span>
              <span style={{ fontSize:10, padding:"1px 6px", borderRadius:20, background:cat.light, color:cat.text, fontWeight:700 }}>{catLabel}</span>
            </div>
          );
        })
      }
    </div>
  );
}

function DateButton({ deadline, done, onChange }) {
  const [open, setOpen] = useState(false);
  const dc = deadlineColor(deadline, done);
  const label = isOverdue(deadline) ? `⚠ 已逾期 ${deadline}` : isDueToday(deadline) ? `⏰ 今天截止 ${deadline}` : deadline || "設定截止日";
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <button onClick={() => setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid ${dc.border}`, borderRadius:20, padding:"2px 10px", cursor:"pointer", color:deadline?dc.color:"#c0bab4", fontSize:11 }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          {label}
        </button>
        {deadline && !done && (
          <button onClick={() => onChange(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#cdc8c2", fontSize:12, padding:0 }}
            onMouseEnter={e=>e.currentTarget.style.color="#b07070"} onMouseLeave={e=>e.currentTarget.style.color="#cdc8c2"}>✕</button>
        )}
      </div>
      {open && (
        <div style={{ marginTop:6 }}>
          <input type="date" defaultValue={deadline||""} min={TODAY()}
            onChange={e => { onChange(e.target.value||null); setOpen(false); }}
            style={{ border:"1.5px solid #9b8ea8", borderRadius:8, padding:"4px 8px", fontSize:12, color:"#3a3530", outline:"none", cursor:"pointer" }}
          />
        </div>
      )}
    </div>
  );
}

function SubtaskRow({ sub, theme, onToggle, onDelete, onEditText, onDeadlineChange }) {
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(sub.text);
  const save = () => { if (txt.trim()) { onEditText(txt.trim()); setEditing(false); } };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"8px 10px 8px 12px", borderLeft:`2px solid ${theme.light}`, marginLeft:8, marginBottom:4, background:sub.done?"#faf8f5":"white", borderRadius:"0 8px 8px 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <button onClick={onToggle} style={{ width:18, height:18, borderRadius:5, border:`2px solid ${sub.done?theme.main:"#cdc8c2"}`, background:sub.done?theme.main:"white", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {sub.done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        {editing
          ? <input autoFocus value={txt} onChange={e=>setTxt(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEditing(false);}} style={{ flex:1, border:`1.5px solid ${theme.main}`, borderRadius:6, padding:"2px 6px", fontSize:13, outline:"none" }}/>
          : <span onDoubleClick={()=>setEditing(true)} style={{ flex:1, fontSize:13, color:sub.done?"#b8afa8":"#3a3530", textDecoration:sub.done?"line-through":"none", cursor:"pointer" }}>{sub.text}</span>
        }
        <button onClick={onDelete} style={{ background:"none", border:"none", cursor:"pointer", color:"#d8d3ce", padding:0 }}
          onMouseEnter={e=>e.currentTarget.style.color="#b07070"} onMouseLeave={e=>e.currentTarget.style.color="#d8d3ce"}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{ paddingLeft:26 }}><DateButton deadline={sub.deadline} done={sub.done} onChange={onDeadlineChange}/></div>
    </div>
  );
}

function ProjectItem({ item, theme, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleTxt, setTitleTxt] = useState(item.title);
  const [newSub, setNewSub] = useState("");
  const [addingSubDeadline, setAddingSubDeadline] = useState("");
  const subtasks  = item.subtasks || [];
  const doneCount = subtasks.filter(s=>s.done).length;
  const total     = subtasks.length;
  const progress  = total ? Math.round(doneCount/total*100) : 0;
  const allDone   = total > 0 && doneCount === total;
  const pm        = PRIORITY_META[item.priority] || PRIORITY_META.mid;
  const overdue   = !allDone && isOverdue(item.deadline);
  const dueToday  = !allDone && isDueToday(item.deadline);
  const saveTitle = () => { if (titleTxt.trim()) { onUpdate({ ...item, title: titleTxt.trim() }); setEditingTitle(false); } };
  const addSubtask = () => {
    if (!newSub.trim()) return;
    const sub = { id:genId(), text:newSub.trim(), done:false, deadline:addingSubDeadline||null, createdAt:Date.now() };
    onUpdate({ ...item, subtasks: [...subtasks, sub] });
    setNewSub(""); setAddingSubDeadline("");
  };
  const updateSub = (id, patch) => onUpdate({ ...item, subtasks: subtasks.map(s => s.id===id?{...s,...patch}:s) });
  const deleteSub = id => onUpdate({ ...item, subtasks: subtasks.filter(s => s.id!==id) });
  return (
    <div style={{ borderRadius:14, marginBottom:12, overflow:"hidden", border:`1.5px solid ${overdue?"#d4a8a0":allDone?"#e0dbd5":"#ede9e4"}`, boxShadow:allDone?"none":"0 2px 10px rgba(0,0,0,0.05)", background:allDone?"#faf8f5":"white" }}>
      <div style={{ padding:"13px 14px", background:allDone?"#f5f2ef":overdue?"#f7f0ee":theme.soft }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setExpanded(e=>!e)} style={{ background:"none", border:"none", cursor:"pointer", color:theme.text, fontSize:14, padding:0, flexShrink:0, transition:"transform 0.2s", transform:expanded?"rotate(0deg)":"rotate(-90deg)" }}>▾</button>
          <span style={{ fontSize:15, flexShrink:0 }}>{allDone?"✅":"📁"}</span>
          {editingTitle
            ? <input autoFocus value={titleTxt} onChange={e=>setTitleTxt(e.target.value)} onBlur={saveTitle} onKeyDown={e=>{if(e.key==="Enter")saveTitle();if(e.key==="Escape")setEditingTitle(false);}} style={{ flex:1, border:`1.5px solid ${theme.main}`, borderRadius:8, padding:"4px 8px", fontSize:14, fontWeight:600, outline:"none", background:theme.soft }}/>
            : <span onDoubleClick={()=>setEditingTitle(true)} style={{ flex:1, fontSize:14, fontWeight:700, color:allDone?"#b8afa8":"#3a3530", textDecoration:allDone?"line-through":"none", cursor:"pointer" }}>{item.title}</span>
          }
          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontWeight:700, flexShrink:0 }}>{pm.label}</span>
          <button onClick={onDelete} style={{ background:"none", border:"none", cursor:"pointer", color:"#cdc8c2", padding:0 }}
            onMouseEnter={e=>e.currentTarget.style.color="#b07070"} onMouseLeave={e=>e.currentTarget.style.color="#cdc8c2"}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8, paddingLeft:36, flexWrap:"wrap" }}>
          <DateButton deadline={item.deadline} done={allDone} onChange={dl=>onUpdate({...item,deadline:dl})}/>
          {total > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:80,height:5, background:"#e8e3de", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${progress}%`, height:"100%", background:allDone?"#8aab8c":theme.main, borderRadius:4, transition:"width 0.3s" }}/>
              </div>
              <span style={{ fontSize:11, color:allDone?"#8aab8c":theme.text, fontWeight:600 }}>{doneCount}/{total}</span>
            </div>
          )}
          {overdue && <span style={{ fontSize:11, color:"#b07070", background:"#f0e8e8", padding:"1px 7px", borderRadius:20, fontWeight:600 }}>⚠ 逾期</span>}
          {dueToday && !overdue && <span style={{ fontSize:11, color:"#9a8558", background:"#f0ecdf", padding:"1px 7px", borderRadius:20, fontWeight:600 }}>⏰ 今天截止</span>}
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"10px 14px 12px" }}>
          {subtasks.length === 0
            ? <div style={{ fontSize:12, color:"#cdc8c2", paddingLeft:8, paddingBottom:8 }}>還沒有子任務，在下方新增</div>
            : subtasks.map(sub => (
                <SubtaskRow key={sub.id} sub={sub} theme={theme}
                  onToggle={()=>updateSub(sub.id,{done:!sub.done})}
                  onDelete={()=>deleteSub(sub.id)}
                  onEditText={txt=>updateSub(sub.id,{text:txt})}
                  onDeadlineChange={dl=>updateSub(sub.id,{deadline:dl})}
                />
              ))
          }
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6, paddingLeft:8 }}>
            <div style={{ display:"flex", gap:6 }}>
              <input value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSubtask()} placeholder="新增子任務..."
                style={{ flex:1, padding:"6px 10px", borderRadius:8, border:"1.5px dashed #d8d3ce", fontSize:13, color:"#3a3530", outline:"none", background:"#faf8f5" }}
                onFocus={e=>e.target.style.borderColor=theme.main} onBlur={e=>e.target.style.borderColor="#d8d3ce"}
              />
              <button onClick={addSubtask} style={{ padding:"6px 12px", borderRadius:8, border:"none", background:theme.light, color:theme.text, fontSize:12, fontWeight:700, cursor:"pointer" }}>新增</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, color:"#b8afa8" }}>子任務截止：</span>
              <input type="date" value={addingSubDeadline} min={TODAY()} onChange={e=>setAddingSubDeadline(e.target.value)}
                style={{ border:"1px solid #e0dbd5", borderRadius:7, padding:"2px 7px", fontSize:11, color:addingSubDeadline?"#3a3530":"#b8afa8", outline:"none" }}
              />
              {addingSubDeadline && <button onClick={()=>setAddingSubDeadline("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#b8afa8",fontSize:12,padding:0 }}>✕</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SingleItem({ item, theme, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(item.text);
  const save = () => { if (txt.trim()) { onUpdate({...item,text:txt.trim()}); setEditing(false); } };
  const pm   = PRIORITY_META[item.priority] || PRIORITY_META.mid;
  const overdue  = !item.done && isOverdue(item.deadline);
  const dueToday = !item.done && isDueToday(item.deadline);
  return (
    <div style={{ padding:"12px 14px", background:item.done?"#f8f6f3":overdue?"#f7f0ee":"white", borderRadius:12, marginBottom:8, border:`1.5px solid ${overdue&&!item.done?"#d4a8a0":item.done?"#e8e3de":"#ede9e4"}`, boxShadow:item.done?"none":"0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={()=>onUpdate({...item,done:!item.done})} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${item.done?theme.main:"#cdc8c2"}`, background:item.done?theme.main:"white", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {item.done && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        {editing
          ? <input autoFocus value={txt} onChange={e=>setTxt(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEditing(false);}} style={{ flex:1, border:`1.5px solid ${theme.main}`, borderRadius:8, padding:"4px 8px", fontSize:14, outline:"none" }}/>
          : <span onDoubleClick={()=>setEditing(true)} style={{ flex:1, fontSize:14, color:item.done?"#b8afa8":"#3a3530", textDecoration:item.done?"line-through":"none", cursor:"pointer", lineHeight:1.5 }}>{item.text}</span>
        }
        <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontWeight:700, flexShrink:0 }}>{pm.label}</span>
        <button onClick={onDelete} style={{ background:"none", border:"none", cursor:"pointer", color:"#cdc8c2", padding:2, display:"flex", alignItems:"center" }}
          onMouseEnter={e=>e.currentTarget.style.color="#b07070"} onMouseLeave={e=>e.currentTarget.style.color="#cdc8c2"}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{ paddingLeft:32, marginTop:8 }}><DateButton deadline={item.deadline} done={item.done} onChange={dl=>onUpdate({...item,deadline:dl})}/></div>
      {dueToday && !overdue && <div style={{ paddingLeft:32, marginTop:4 }}><span style={{ fontSize:11, color:"#9a8558", background:"#f0ecdf", padding:"1px 7px", borderRadius:20, fontWeight:600 }}>⏰ 今天截止</span></div>}
    </div>
  );
}

export default function App() {
  const [user, setUser]           = useState(undefined);
  const [activeTab, setActiveTab] = useState(0);
  const [view, setView]           = useState("list");
  const [todos, setTodos]         = useState({ work:[], study:[], house:[] });
  const [loading, setLoading]     = useState(true);
  const [addType, setAddType]     = useState("single");
  const [inputText, setInputText] = useState("");
  const [priority, setPriority]   = useState("high");
  const [deadline, setDeadline]   = useState("");
  const [filter, setFilter]       = useState("all");
  const [calSelected, setCalSelected] = useState(null);
  const [calItems, setCalItems]   = useState([]);

  const periodKey = PERIOD_KEYS[activeTab];
  const theme     = MORANDI[periodKey];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const todosRef = ref(db, `users/${user.uid}/todos`);
    const unsub = onValue(todosRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        setTodos({
          work:  fixItems(data.work),
          study: fixItems(data.study),
          house: fixItems(data.house),
        });
      } else {
        setTodos({ work:[], study:[], house:[] });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const saveTodos = updated => {
    if (!user) return;
    set(ref(db, `users/${user.uid}/todos`), toFirebase(updated));
  };

  const handleLogout = () => signOut(auth);

  const handleCalToggle = (cat, itemId, subId) => {
    const list = todos[cat];
    const updated = list.map(item => {
      if (subId) {
        if (item.type === "project") {
          return { ...item, subtasks: (item.subtasks||[]).map(s => s.id===subId ? {...s, done:!s.done} : s) };
        }
        return item;
      } else if (item.id === itemId) {
        return { ...item, done: !item.done };
      }
      return item;
    });
    const newTodos = { ...todos, [cat]: updated };
    setTodos(newTodos);
    saveTodos(newTodos);
  };

  if (user === undefined) return (
    <div style={{ minHeight:"100vh", background:"#f5f0eb", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:32 }}>📋</div>
    </div>
  );

  if (user === null) return <LoginScreen />;

  const current = todos[periodKey];
  const countDone = items => items.reduce((n, item) => {
    if (item.type === "project") return n + ((item.subtasks||[]).every(s=>s.done) && (item.subtasks||[]).length>0 ? 1 : 0);
    return n + (item.done ? 1 : 0);
  }, 0);
  const totalCount   = current.length;
  const doneCount    = countDone(current);
  const progress     = totalCount ? Math.round(doneCount/totalCount*100) : 0;
  const overdueCount = current.filter(item => {
    if (item.type==="project") return !(item.subtasks||[]).every(s=>s.done) && isOverdue(item.deadline);
    return !item.done && isOverdue(item.deadline);
  }).length;

  const setList = fn => {
    const updated = { ...todos, [periodKey]: fn(todos[periodKey]) };
    setTodos(updated);
    saveTodos(updated);
  };
  const addItem = () => {
    if (!inputText.trim()) return;
    const base = { id:genId(), priority, deadline:deadline||null, createdAt:Date.now() };
    const item = addType==="project"
      ? { ...base, type:"project", title:inputText.trim(), subtasks:[] }
      : { ...base, type:"single", text:inputText.trim(), done:false };
    setList(prev => sortItems([item, ...prev]));
    setInputText(""); setDeadline("");
  };
  const updateItem = updated => setList(prev => sortItems(prev.map(i => i.id===updated.id?updated:i)));
  const deleteItem = id => setList(prev => prev.filter(i => i.id!==id));
  const clearDone  = () => setList(prev => prev.filter(item => {
    if (item.type==="project") return !((item.subtasks||[]).length>0&&(item.subtasks||[]).every(s=>s.done));
    return !item.done;
  }));
  const sorted   = sortItems(current);
  const filtered = sorted.filter(item => {
    const done = item.type==="project" ? (item.subtasks||[]).length>0&&(item.subtasks||[]).every(s=>s.done) : item.done;
    if (filter==="all")  return true;
    if (filter==="done") return done;
    return !done;
  });
  const dateStr = new Date().toLocaleDateString("zh-TW", { year:"numeric", month:"long", day:"numeric", weekday:"long" });

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f5f0eb", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:32 }}>📋</div>
      <div style={{ fontSize:14, color:"#9a9088" }}>載入中...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f5f0eb", fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", display:"flex", justifyContent:"center", padding:"24px 12px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor:pointer; opacity:0.5; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#ddd8d2; border-radius:4px; }
      `}</style>
      <div style={{ width:"100%", maxWidth:560 }}>
        <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, color:"#b8afa8", marginBottom:2 }}>{dateStr}</div>
            <h1 style={{ fontSize:18, fontWeight:700, color:"#3a3530", margin:0 }}>Michelle's To-do List</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ display:"flex", background:"white", borderRadius:10, border:"1.5px solid #ede9e4", overflow:"hidden" }}>
              {[["list","☰"],["calendar","📅"]].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)} style={{ padding:"7px 12px", border:"none", background:view===v?theme.main:"transparent", color:view===v?"white":"#9a9088", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}>{l}</button>
              ))}
            </div>
            <img src={user.photoURL} alt="avatar" onClick={handleLogout} title="點擊登出"
              style={{ width:32, height:32, borderRadius:"50%", cursor:"pointer", border:"2px solid #ede9e4" }}
              onMouseEnter={e=>e.target.style.opacity=0.7} onMouseLeave={e=>e.target.style.opacity=1}
            />
          </div>
        </div>

        <div style={{ display:"flex", background:"white", borderRadius:18, padding:5, marginBottom:14, border:"1.5px solid #ede9e4", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
          {PERIODS.map((p,i) => {
            const k=PERIOD_KEYS[i];
            const cnt=todos[k].filter(item=>item.type==="project"?!((item.subtasks||[]).every(s=>s.done)&&(item.subtasks||[]).length>0):!item.done).length;
            const m=MORANDI[k];
            return (
              <button key={k} onClick={()=>setActiveTab(i)} style={{ flex:1, padding:"9px 4px", borderRadius:13, border:"none", cursor:"pointer", background:activeTab===i?m.main:"transparent", color:activeTab===i?"white":m.text, fontWeight:activeTab===i?700:500, fontSize:13, transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"'Noto Sans TC',sans-serif" }}>
                <span>{ICONS[k]}</span><span>{p}</span>
                {cnt>0 && <span style={{ background:activeTab===i?"rgba(255,255,255,0.3)":m.light, color:activeTab===i?"white":m.text, borderRadius:20, fontSize:10, fontWeight:700, padding:"1px 6px" }}>{cnt}</span>}
              </button>
            );
          })}
        </div>

        {view==="calendar" && (
          <>
            <Calendar todos={todos} activeKey={periodKey} onSelectDay={(ds,items)=>{setCalSelected(ds);setCalItems(items);}}/>
            {calSelected && (
              <DayDetail
                date={calSelected}
                items={calItems}
                onToggle={handleCalToggle}
                onClose={()=>setCalSelected(null)}
              />
            )}
          </>
        )}

        {totalCount>0 && (
          <div style={{ background:"white", borderRadius:14, padding:"10px 14px", marginBottom:12, border:"1.5px solid #ede9e4", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:"#9a9088", fontWeight:500 }}>完成進度</span>
                {overdueCount>0 && <span style={{ fontSize:11, color:"#b07070", background:"#f0e8e8", padding:"1px 6px", borderRadius:20, fontWeight:600 }}>⚠ {overdueCount} 項逾期</span>}
              </div>
              <span style={{ fontSize:12, color:theme.text, fontWeight:700 }}>{doneCount}/{totalCount} ({progress}%)</span>
            </div>
            <div style={{ height:6, background:"#f0ece8", borderRadius:8, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:theme.main, borderRadius:8, transition:"width 0.4s ease" }}/>
            </div>
          </div>
        )}

        <div style={{ background:"white", borderRadius:16, padding:14, marginBottom:12, border:`1.5px solid ${theme.light}`, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            {[["single","✏️ 單一任務"],["project","📁 大項目"]].map(([t,l])=>(
              <button key={t} onClick={()=>setAddType(t)} style={{ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${addType===t?theme.main:"#ede9e4"}`, background:addType===t?theme.soft:"transparent", color:addType===t?theme.text:"#b8afa8", fontSize:12, fontWeight:addType===t?700:400, cursor:"pointer", fontFamily:"'Noto Sans TC',sans-serif" }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()}
              placeholder={addType==="project"?`新增大項目...`:`新增 ${PERIODS[activeTab]} 任務...`}
              style={{ flex:1, padding:"9px 12px", borderRadius:10, border:"1.5px solid #ede9e4", fontSize:14, color:"#3a3530", fontFamily:"'Noto Sans TC',sans-serif", outline:"none", background:"#faf8f5", minWidth:0 }}
              onFocus={e=>e.target.style.borderColor=theme.main} onBlur={e=>e.target.style.borderColor="#ede9e4"}
            />
            <button onClick={addItem} style={{ padding:"9px 14px", borderRadius:10, border:"none", background:theme.main, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Noto Sans TC',sans-serif", whiteSpace:"nowrap", flexShrink:0 }}
              onMouseEnter={e=>e.currentTarget.style.opacity=0.85} onMouseLeave={e=>e.currentTarget.style.opacity=1}>新增</button>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#b8afa8" }}>優先度：</span>
              {[["high","重要"],["mid","普通"],["low","低"]].map(([val,label])=>{ const pm=PRIORITY_META[val]; return (
                <button key={val} onClick={()=>setPriority(val)} style={{ padding:"3px 8px", borderRadius:20, border:`1.5px solid ${priority===val?pm.color:"#ede9e4"}`, background:priority===val?pm.bg:"transparent", color:priority===val?pm.color:"#b8afa8", fontSize:12, fontWeight:priority===val?700:400, cursor:"pointer", fontFamily:"'Noto Sans TC',sans-serif" }}>{label}</button>
              );})}
            </div>
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#b8afa8" }}>截止：</span>
              <input type="date" value={deadline} min={TODAY()} onChange={e=>setDeadline(e.target.value)}
                style={{ border:"1.5px solid #ede9e4", borderRadius:8, padding:"3px 6px", fontSize:12, color:deadline?"#3a3530":"#b8afa8", cursor:"pointer", outline:"none", background:"#faf8f5" }}
              />
              {deadline && <button onClick={()=>setDeadline("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#b8afa8",fontSize:13,padding:0 }}>✕</button>}
            </div>
          </div>
        </div>

        {view==="list" && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", gap:4 }}>
              {[["all","全部"],["todo","待完成"],["done","已完成"]].map(([val,label])=>(
                <button key={val} onClick={()=>setFilter(val)} style={{ padding:"4px 10px", borderRadius:20, border:"none", background:filter===val?theme.light:"transparent", color:filter===val?theme.text:"#b8afa8", fontSize:12, fontWeight:filter===val?700:400, cursor:"pointer", fontFamily:"'Noto Sans TC',sans-serif" }}>{label}</button>
              ))}
            </div>
            {doneCount>0 && <button onClick={clearDone} style={{ background:"none",border:"none",color:"#b8afa8",fontSize:12,cursor:"pointer",fontFamily:"'Noto Sans TC',sans-serif" }}>清除已完成</button>}
          </div>
        )}

        {view==="list" && (
          <div>
            {filtered.length===0
              ? <div style={{ textAlign:"center", padding:"44px 0", color:"#cdc8c2" }}>
                  <div style={{ fontSize:34, marginBottom:8 }}>{filter==="done"?"🎉":ICONS[periodKey]}</div>
                  <div style={{ fontSize:13 }}>{filter==="done"?"還沒有完成的任務":"還沒有任務，新增一個吧！"}</div>
                </div>
              : filtered.map(item => item.type==="project"
                  ? <ProjectItem key={item.id} item={item} theme={theme} onUpdate={updateItem} onDelete={()=>deleteItem(item.id)}/>
                  : <SingleItem  key={item.id} item={item} theme={theme} onUpdate={updateItem} onDelete={()=>deleteItem(item.id)}/>
                )
            }
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:24, fontSize:11, color:"#cdc8c2" }}>
          雙擊文字可編輯 · 依重要性自動排序 · 資料同步至雲端 ☁️
        </div>
      </div>
    </div>
  );
}
