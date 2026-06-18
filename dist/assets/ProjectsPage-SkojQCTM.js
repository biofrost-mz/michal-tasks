import{d as o,j as e}from"./vendor-notes-editor-C-RICP77.js";import{Q as re,V as oe,$ as le,I as C,M as Se,L as Ce,g as ae,f as se,W as ze,Z as Ie,Y as ge,o as Te,H as ie,D as Pe,r as Ae,l as De,a1 as Me,c as Ee,e as Re,n as We,h as Oe,X as Be,_ as Le,b as $e,G as ve,O as _e,a0 as Ge}from"./index-CBXsz8RY.js";import{S as fe,Q as Ve}from"./Skeleton-CenOiskJ.js";import{E as He}from"./EmptyState-Buu6kE-H.js";const Ze=50;async function qe(s,i=Ze){const{data:f,error:j}=await re.from("project_chats").select("role, content, created_at").eq("project_id",s).order("created_at",{ascending:!0}).limit(i);if(j)throw j;return(f||[]).map(h=>({role:h.role,content:h.content,ts:new Date(h.created_at).getTime()}))}async function Ye({projectId:s,workspaceId:i,userId:f,role:j,content:h}){const{error:T}=await re.from("project_chats").insert({project_id:s,workspace_id:i,owner:f,role:j,content:h});if(T)throw T}async function Fe(s){const{error:i}=await re.from("project_chats").delete().eq("project_id",s);if(i)throw i}const be=s=>`mt3:chat:${s}`,Ke=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function Ue(s){try{const i=localStorage.getItem(be(s));return i?JSON.parse(i).messages??[]:[]}catch{return[]}}function ne(s,i){const f=i.slice(-50);localStorage.setItem(be(s),JSON.stringify({messages:f}))}function Je({project:s,tasks:i,notes:f,onClose:j}){const{isMobile:h,activeWorkspaceId:T,userId:D}=oe(),v=le(),[m,w]=o.useState(()=>Ue(s.id)),[M,Y]=o.useState(()=>localStorage.getItem(`mt3:chat-model:${s.id}`)||"Gemini 1.5 Flash"),F=(l,N)=>{!T||!D||Ye({projectId:s.id,workspaceId:T,userId:D,role:l,content:N}).catch(()=>{})},[A,_]=o.useState(""),[S,O]=o.useState(!1),G=o.useRef(null),B=o.useRef(null);o.useEffect(()=>{G.current?.scrollIntoView({behavior:"smooth"})},[m,S]),o.useEffect(()=>{h||B.current?.focus()},[h]),o.useEffect(()=>{let l=!1;return(async()=>{try{const N=await qe(s.id);!l&&N.length&&(w(N),ne(s.id,N))}catch{}})(),()=>{l=!0}},[s.id]);const E=async l=>{const N=(l??A).trim();if(!N||S)return;const H={role:"user",content:N,ts:Date.now()},$=[...m,H];w($),ne(s.id,$),F("user",N),_(""),O(!0);try{const{data:y,error:z}=await re.functions.invoke("gemini-project-chat",{body:{currentMessage:N,messages:m.map(({role:n,content:x})=>({role:n,content:x})),projectContext:{project:{name:s.name,description:s.description,status:s.status},tasks:i.map(n=>({title:n.title,status:n.status,priority:n.priority,dueDate:n.dueDate,subtasks:n.subtasks})),notes:f.map(n=>({title:n.title,content:n.content}))}}});if(z||!y?.reply){const n=y?.error||z?.message||"Neznámá chyba";n.includes("non-2xx")||n.includes("Unauthorized")||z?.status===401?v("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):n.toLowerCase().includes("rate limit")?v("Příliš mnoho zpráv — zkus to za hodinu.","error"):v(`Chat selhal: ${n}`,"error");return}y?.meta?.model&&(Y(y.meta.model),localStorage.setItem(`mt3:chat-model:${s.id}`,y.meta.model));const Z={role:"assistant",content:y.reply,ts:Date.now()},a=[...$,Z];w(a),ne(s.id,a),F("assistant",y.reply)}catch(y){(y?.message||String(y)).includes("non-2xx")?v("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):v("Chyba chatu — zkus to znovu","error")}finally{O(!1),h||B.current?.focus()}},V=l=>{l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),E())},L=()=>{w([]),ne(s.id,[]),Fe(s.id).catch(()=>{})},K=h?{position:"fixed",inset:0,zIndex:300,background:"var(--bg)",display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:"var(--bg-2)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!h&&e.jsx("div",{onClick:j,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:K,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:"1px solid var(--border)",flexShrink:0},children:[h&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(C,{name:"chevron-left",size:18,color:"var(--text-2)",strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",s.name]}),e.jsxs("div",{style:{fontSize:11,color:"var(--text-3)"},children:[M," · ",i.length," úkolů"]})]}),m.length>0&&e.jsx("button",{onClick:L,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"trash-2",size:14,color:"var(--text-3)",strokeWidth:2})}),!h&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"x",size:16,color:"var(--text-2)",strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[m.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:Ke.map(l=>e.jsx("button",{onClick:()=>E(l),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text-2)",cursor:"pointer",textAlign:"left",transition:"all .12s"},children:l},l))})]}),m.map((l,N)=>e.jsx("div",{style:{display:"flex",justifyContent:l.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:h?"90%":"85%",padding:"8px 12px",borderRadius:l.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:l.role==="user"?"var(--accent)":"var(--input)",color:l.role==="user"?"#fff":"var(--text)",fontSize:13,lineHeight:1.5,whiteSpace:l.role==="user"?"pre-wrap":"normal",wordBreak:"break-word"},...l.role==="assistant"?{dangerouslySetInnerHTML:{__html:Se(Ce(l.content))}}:{children:l.content}})},`${l.ts}-${l.role}-${N}`)),S&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:"var(--input)",color:"var(--text-3)",fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:G})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + var(--safe-area-inset-bottom, 0px))",borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:B,value:A,onChange:l=>_(l.target.value),onKeyDown:V,placeholder:h?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:S,style:{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text)",fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:S?.6:1}}),e.jsx("button",{onClick:()=>E(),disabled:!A.trim()||S,style:{width:h?42:36,height:h?42:36,borderRadius:10,border:"none",background:A.trim()&&!S?"var(--accent)":"var(--border)",color:"#fff",cursor:A.trim()&&!S?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:S?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(C,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const ce=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function je(s){const i=ve(s.dueDate);return i?`${i.getDate()}.${i.getMonth()+1}.`:null}function ue(s){const i=ve(s.dueDate);return!i||s.status==="done"?!1:i<_e()}function pe({current:s,target:i,onClick:f,label:j}){return e.jsx("button",{className:s===i?`cur ${i==="waiting"?"wait":i}`:"",onClick:f,children:j})}function Qe({colId:s,color:i,isOver:f,children:j}){const{setNodeRef:h}=Be({id:s});return e.jsx("div",{ref:h,className:`kcol${f?" drag-over":""}`,style:{"--col-color":i},children:j})}function Xe({t:s}){const{setTaskDetail:i,updateTask:f}=oe(),{attributes:j,listeners:h,setNodeRef:T,transform:D,transition:v,isDragging:m}=Le({id:s.id}),w={transform:$e.Transform.toString(D),transition:v,opacity:m?.3:1,cursor:m?"grabbing":"grab",touchAction:"none"};return e.jsxs("div",{ref:T,style:w,...j,...h,className:"kcard",onClick:()=>i(s.id),children:[e.jsx("div",{className:"kcard-t",children:s.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[s.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"var(--prio-high)"},children:"↑ Vysoká"}):null,s.dueDate?e.jsx("span",{className:`due ${ue(s)?"overdue":""}`,children:je(s)}):null]}),Array.isArray(s.subtasks)&&s.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",s.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:M=>M.stopPropagation(),children:[e.jsx(pe,{current:s.status,target:"todo",label:"To do",onClick:()=>f(s.id,{status:"todo"})}),e.jsx(pe,{current:s.status,target:s.status==="waiting"?"waiting":"doing",label:s.status==="waiting"?"Čekám":"Doing",onClick:()=>f(s.id,{status:s.status==="doing"?"waiting":"doing"})}),e.jsx(pe,{current:s.status,target:"done",label:"Hotovo",onClick:()=>f(s.id,{status:"done"})})]})]})}function ot(){const{projects:s,tasks:i,notes:f,loaded:j,selProject:h,setPage:T,addTask:D,updateTask:v,reorderTasks:m,updateProject:w,deleteProject:M,addNote:Y,openNote:F}=oe(),A=le(),_=ze(),[S,O]=o.useState(!1),[G,B]=o.useState(""),[E,V]=o.useState(""),[L,K]=o.useState(null),[l,N]=o.useState(""),[H,$]=o.useState(""),[y,z]=o.useState(null),[Z,a]=o.useState(""),[n,x]=o.useState(!1),[R,W]=o.useState(!1),[U,t]=o.useState(null),[d,g]=o.useState(null),I=Ie(ge(Oe,{activationConstraint:{distance:5}}),ge(We,{activationConstraint:{delay:200,tolerance:8}})),c=s.find(r=>r.id===h),k=o.useMemo(()=>c?i.filter(r=>r.projectId===c.id):[],[i,c]),q=o.useMemo(()=>{const r={};return ce.forEach(p=>{r[p.id]=k.filter(b=>b.status===p.id).sort((b,X)=>(b.position||0)-(X.position||0))}),r},[k]),ee=o.useCallback(({active:r})=>{t(r.id)},[]),te=o.useCallback(({over:r})=>{g(p=>{const b=r?.id??null;return p===b?p:b})},[]),u=o.useCallback(({active:r,over:p})=>{if(t(null),g(null),!p||r.id===p.id)return;const b=k.find(J=>J.id===r.id);if(!b)return;const X=ce.find(J=>J.id===p.id);if(X){b.status!==X.id&&v(b.id,{status:X.id});return}const P=k.find(J=>J.id===p.id);if(P)if(b.status===P.status){const J=q[b.status]??[],he=J.findIndex(de=>de.id===r.id),me=J.findIndex(de=>de.id===p.id);he!==me&&m(Te(J,he,me))}else v(b.id,{status:P.status})},[k,q,v,m]),Q=U?k.find(r=>r.id===U)??null:null;if(!c)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const ye=f.filter(r=>r.primaryProjectId===c.id),ke=k.filter(r=>r.status==="done").length,we=k.length?Math.round(ke/k.length*100):0,Ne=()=>{w(c.id,{name:G.trim()||c.name,description:E.trim(),color:L}),O(!1),A("Projekt uložen","success")},xe=(r="todo",p=l)=>{const b=p.trim();b&&(D({title:b,status:r,projectId:c.id}),N(""),a(""),z(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>T("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:ie(c.id),display:"inline-block"}}),c.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:ie(c.id),padding:"5px 14px",border:`1px solid ${ie(c.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:ae[c.status]?.label||c.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[k.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[we,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{O(!0),B(c.name||""),V(c.description||""),K(c.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>W(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const r=c.status==="archived",p=r?"active":"archived";w(c.id,{status:p}),A(r?"Projekt byl obnoven":"Projekt byl archivován","success"),T("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(C,{name:c.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),c.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await _("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await M(c.id),T("projects"))},children:"Smazat"})]})]}),S?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:G,onChange:r=>B(r.target.value),placeholder:"Název projektu",style:{flex:1}}),e.jsx("input",{value:E,onChange:r=>V(r.target.value),placeholder:"Popis projektu",style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:se.map(r=>e.jsx("span",{onClick:()=>K(r),style:{width:22,height:22,borderRadius:"50%",background:r,cursor:"pointer",display:"inline-block",border:L===r?"2px solid #ffffff":"2px solid transparent",boxShadow:L===r?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:p=>p.currentTarget.style.transform="scale(1.15)",onMouseLeave:p=>p.currentTarget.style.transform="scale(1)"},r))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:Ne,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>O(!1),children:"Zrušit"})]})]})]}):null,e.jsx("div",{style:{marginBottom:18},children:e.jsx(Ve,{defaultProjectId:c.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(C,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${c.name}…`,value:H,onChange:r=>$(r.target.value),onKeyDown:r=>{if(r.key==="Enter"){const p=H.trim();if(p){const b=Y({title:p,primaryProjectId:c.id});F(b.id),$("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),j?e.jsxs(Pe,{sensors:I,collisionDetection:Ae,onDragStart:ee,onDragOver:te,onDragEnd:u,children:[e.jsx("div",{className:"kanban",children:ce.map(r=>{const p=q[r.id]??[],b=r.id==="done"&&!n?p.slice(0,5):p,X=d===r.id;return e.jsxs(Qe,{colId:r.id,color:r.color,isOver:X,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:r.label}),e.jsx("span",{className:"kcol-count",children:p.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{z(r.id),a("")},children:e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(De,{items:b.map(P=>P.id),strategy:Me,children:b.map(P=>e.jsx(Xe,{t:P},P.id))}),r.id==="done"&&p.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>x(P=>!P),children:n?"Skrýt dokončené":`+ ${p.length-5} dalších`}):null,p.length>0&&y!==r.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{z(r.id),a("")},children:[e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,y===r.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:Z,onChange:P=>a(P.target.value),onKeyDown:P=>{P.key==="Enter"&&xe(r.id,Z),P.key==="Escape"&&(z(null),a(""))},onBlur:()=>xe(r.id,Z),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,p.length===0&&y!==r.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{z(r.id),a("")},children:"+ Přidat úkol"}):null]},r.id)})}),e.jsx(Ee,{children:Q?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:Q.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[Q.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"var(--prio-high)"},children:"↑ Vysoká"}):null,Q.dueDate?e.jsx("span",{className:`due ${ue(Q)?"overdue":""}`,children:je(Q)}):null]})]}):null})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8,marginTop:16},children:[...Array(4)].map((r,p)=>e.jsx(fe,{},p))}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx(Re,{projectId:c.id})]}),R?e.jsx(Je,{project:c,tasks:k,notes:ye,onClose:()=>W(!1)}):null]})}function nt(){const{projects:s,tasks:i,addProject:f,openProject:j,updateProject:h,isMobile:T,loaded:D}=oe(),v=le(),[m,w]=o.useState("active"),[M,Y]=o.useState(!1),[F,A]=o.useState(!1),[_,S]=o.useState(""),[O,G]=o.useState(""),[B,E]=o.useState("active"),[V,L]=o.useState(null),K=o.useRef(null),[l,N]=o.useState("none"),[H]=o.useState("newest"),[$,y]=o.useState(!1),z=o.useRef(null);o.useEffect(()=>{const t=d=>{z.current&&!z.current.contains(d.target)&&y(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const Z={none:"Bez seskupení",status:"Stavu"},a=o.useMemo(()=>{let t=[...s];return m!=="all"&&(t=t.filter(d=>d.status===m)),H==="alphabetical"?t.sort((d,g)=>d.name.localeCompare(g.name)):H==="tasksCount"?t.sort((d,g)=>{const I=i.filter(k=>k.projectId===d.id).length;return i.filter(k=>k.projectId===g.id).length-I}):H==="progress"?t.sort((d,g)=>{const I=i.filter(u=>u.projectId===d.id),c=I.filter(u=>u.status==="done").length,k=I.length?c/I.length:0,q=i.filter(u=>u.projectId===g.id),ee=q.filter(u=>u.status==="done").length;return(q.length?ee/q.length:0)-k}):t.sort((d,g)=>(g.createdAt||0)-(d.createdAt||0)),t},[s,m,H,i]),n=o.useMemo(()=>{if(l!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return a.forEach(d=>{t[d.status]&&t[d.status].items.push(d)}),Object.entries(t).filter(([,d])=>d.items.length>0)},[a,l]),x={all:s.length,active:s.filter(t=>t.status==="active").length,idea:s.filter(t=>t.status==="idea").length,done:s.filter(t=>t.status==="done").length,archived:s.filter(t=>t.status==="archived").length},R=()=>{_.trim()&&(f({name:_.trim(),description:O.trim(),status:B,color:V}),S(""),G(""),E("active"),L(null),Y(!1),v("Projekt vytvořen","success"))},W=()=>{Y(!0);const t=se[Math.floor(Math.random()*se.length)];L(t),setTimeout(()=>K.current?.focus(),40)},U=(t,d=0)=>{const g=i.filter(u=>u.projectId===t.id),I=g.filter(u=>u.status==="done").length,c=g.filter(u=>u.status==="doing").length,k=g.filter(u=>u.status==="waiting").length,q=g.filter(u=>u.status==="todo").length,ee=g.length?Math.round(I/g.length*100):0,te=g.filter(u=>ue(u)).length;return e.jsxs("div",{className:"pcard list-item-enter",style:{"--proj-color":ie(t.id),"--item-index":Math.min(d,7)},onClick:()=>j(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[ae[t.status]?.label||t.status,te?` · ⚠ ${te}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:u=>{u.stopPropagation();const Q=t.status==="archived"?"active":"archived";h(t.id,{status:Q}),v(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:u=>{u.currentTarget.style.color="var(--accent)",u.currentTarget.style.background="var(--bg-3)"},onMouseLeave:u=>{u.currentTarget.style.color="var(--text-3)",u.currentTarget.style.background="transparent"},children:e.jsx(C,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[g.length," úkolů · ",I," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[q>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:q})]}):null,c>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:c})]}):null,k>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:k})]}):null,I>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:I})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${ee}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[ee,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[s.length," projektů · ",x.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>A(!0),children:[e.jsx(C,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:W,children:[e.jsx(C,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${m===t.id?"active":""}`,onClick:()=>w(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:x[t.id]})]},t.id)),!T&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:z,children:[e.jsxs("span",{className:`chip ${l!=="none"?"active":""}`,onClick:()=>y(!$),children:["Seskupit: ",Z[l]," ▾"]}),$&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(Z).map(([t,d])=>e.jsx("button",{onClick:()=>{N(t),y(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:l===t?"var(--accent-soft)":"transparent",color:l===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:l===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:g=>{l!==t&&(g.currentTarget.style.background="var(--card-h)")},onMouseLeave:g=>{l!==t&&(g.currentTarget.style.background="transparent")},children:d},t))})]})]})]}),M?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:K,value:_,onChange:t=>S(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:O,onChange:t=>G(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:B,onChange:t=>E(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(ae).map(([t,d])=>e.jsx("option",{value:t,children:d.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:se.map(t=>e.jsx("span",{onClick:()=>L(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:V===t?"2px solid #ffffff":"2px solid transparent",boxShadow:V===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:d=>d.currentTarget.style.transform="scale(1.15)",onMouseLeave:d=>d.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:R,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{Y(!1),L(null)},children:"Zrušit"})]})]})]}):null,D?l==="status"?e.jsxs("div",{children:[n.map(([t,d])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:ae[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[d.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",d.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:d.items.map((g,I)=>U(g,I))})]},t)),M?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:W,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[a.map((t,d)=>U(t,d)),M?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:W,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[...Array(4)].map((t,d)=>e.jsx(fe,{},d))}),D&&!a.length&&!M?e.jsx(He,{type:"projects",title:m==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${ae[m]?.label??m}"`,description:m==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:m==="all"?W:void 0,actionLabel:"Nový projekt"}):null,F&&e.jsx(et,{onClose:()=>A(!1)})]})}function et({onClose:s}){const{tags:i,addProject:f,addTask:j,addTag:h,openProject:T}=oe(),D=le(),[v,m]=o.useState("prompt"),[w,M]=o.useState(""),[Y,F]=o.useState("Analýza záměru a plánování..."),[A,_]=o.useState(""),[S,O]=o.useState(""),[G,B]=o.useState("#3b82f6"),[E,V]=o.useState([]),[L,K]=o.useState({}),[l,N]=o.useState("Gemini 1.5 Flash");o.useEffect(()=>{if(v!=="loading")return;const a=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let n=0;F(a[0]);const x=setInterval(()=>{n=(n+1)%a.length,F(a[n])},2500);return()=>clearInterval(x)},[v]);const H=async()=>{if(w.trim()){m("loading");try{const{data:a,error:n}=await re.functions.invoke("ai-project-planner",{body:{userPrompt:w,availableTags:i.map(R=>R.name)}});if(n||!a?.result)throw new Error(n?.message||a?.error||"Generování selhalo");const x=a.result;_(x.projectName||""),O(x.projectDescription||""),B(x.projectColor||"#3b82f6"),V((x.tasks||[]).map((R,W)=>({...R,id:`gen-task-${W}`,selected:!0}))),N(a.meta?.model||"Gemini 1.5 Flash"),m("preview")}catch(a){console.error(a),D(a.message||"Generování projektu selhalo","error"),m("prompt")}}},$=a=>{V(n=>n.map(x=>x.id===a?{...x,selected:!x.selected}:x))},y=a=>{K(n=>({...n,[a]:!n[a]}))},z=()=>{try{const a=f({name:A.trim()||"Bez názvu",description:S.trim(),status:"active",color:G});for(const n of E){if(!n.selected)continue;const x=[];if(Array.isArray(n.tags))for(const W of n.tags){const U=W.trim().toLowerCase();if(!U)continue;const t=i.find(d=>d.name.toLowerCase()===U);if(t)x.push(t.id);else{const d=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],g=d[Math.floor(Math.random()*d.length)],I=h({name:U,color:g});x.push(I.id)}}const R=(n.subtasks||[]).map(W=>({id:Ge(),text:W,done:!1}));j({title:n.title,description:n.description,status:"todo",priority:n.priority,projectId:a.id,tagIds:x,subtasks:R})}D("Projekt a úkoly úspěšně vytvořeny s AI!","success"),T(a.id),s()}catch(a){console.error(a),D("Nepodařilo se uložit projekt","error")}},Z=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:s,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
        .ai-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 18, 25, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .ai-modal-container {
          background: var(--bg-2);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          border-radius: 20px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--text);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .ai-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-soft);
        }

        .ai-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a78bfa, #f472b6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-modal-close {
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .ai-modal-close:hover {
          background: var(--bg-3);
          color: var(--text);
        }

        .ai-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        /* Scrollbar styling */
        .ai-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .ai-modal-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .ai-modal-body::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        /* Prompt View Styles */
        .ai-prompt-heading {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 8px;
          color: var(--text);
        }

        .ai-prompt-sub {
          color: var(--text-2);
          font-size: 0.925rem;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .ai-textarea {
          width: 100%;
          min-height: 120px;
          background: var(--bg-1);
          border: 1px solid var(--border-soft);
          border-radius: 12px;
          padding: 16px;
          color: var(--text);
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.5;
          resize: vertical;
          transition: all 0.2s;
          outline: none;
          margin-bottom: 20px;
        }

        .ai-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
          background: var(--bg-1);
        }

        .ai-presets-title {
          font-size: 0.825rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-3);
          margin-bottom: 12px;
        }

        .ai-presets-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 32px;
        }

        .ai-preset-chip {
          background: var(--bg-3);
          border: 1px solid var(--border-soft);
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 0.85rem;
          color: var(--text-2);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ai-preset-chip:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-1px);
        }

        .ai-btn-generate {
          background: linear-gradient(135deg, #7c3aed, #db2777);
          border: none;
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.25);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ai-btn-generate:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(124, 58, 237, 0.4);
        }

        .ai-btn-generate:active {
          transform: translateY(0);
        }

        /* Loading View Styles */
        .ai-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
        }

        .ai-loading-spinner {
          width: 64px;
          height: 64px;
          border: 4px solid var(--border-soft);
          border-left-color: var(--accent);
          border-top-color: #ec4899;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 32px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ai-loading-text {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 12px;
          text-align: center;
          height: 24px;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .ai-loading-hint {
          font-size: 0.85rem;
          color: var(--text-3);
          text-align: center;
        }

        /* Preview View Styles */
        .ai-preview-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .ai-preview-grid {
            grid-template-columns: 280px 1fr;
          }
        }

        .ai-preview-sidebar {
          border-bottom: 1px solid var(--border-soft);
          padding-bottom: 20px;
        }

        @media (min-width: 768px) {
          .ai-preview-sidebar {
            border-bottom: none;
            border-right: 1px solid var(--border-soft);
            padding-bottom: 0;
            padding-right: 24px;
          }
        }

        .ai-preview-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ai-input-group {
          margin-bottom: 20px;
        }

        .ai-label {
          display: block;
          font-size: 0.825rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-2);
          margin-bottom: 8px;
        }

        .ai-input {
          width: 100%;
          background: var(--bg-1);
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text);
          font-size: 0.925rem;
          outline: none;
          transition: all 0.2s;
        }

        .ai-input:focus {
          border-color: var(--accent);
        }

        .ai-color-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .ai-color-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s ease;
          border: 2px solid transparent;
        }

        .ai-color-dot:hover {
          transform: scale(1.15);
        }

        .ai-color-dot.active {
          border-color: var(--text);
          box-shadow: 0 0 0 2px var(--accent);
        }

        .ai-preview-card {
          background: var(--bg-3);
          border: 1px solid var(--border-soft);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .ai-preview-card:hover {
          background: var(--bg-1);
          border-color: var(--border);
        }

        .ai-preview-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .ai-preview-card-checkbox {
          margin-top: 4px;
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .ai-preview-card-info {
          flex: 1;
        }

        .ai-preview-card-title {
          font-size: 0.975rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .ai-preview-card-desc {
          font-size: 0.85rem;
          color: var(--text-2);
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .ai-preview-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .ai-badge {
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 500;
        }

        .ai-badge.prio-high {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .ai-badge.prio-medium {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .ai-badge.prio-low {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .ai-badge.time {
          background: var(--bg-2);
          color: var(--text-2);
          border: 1px solid var(--border-soft);
        }

        .ai-badge.tag {
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid var(--accent);
        }

        .ai-subtasks-toggle {
          background: transparent;
          border: none;
          color: var(--text-2);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 12px;
        }

        .ai-subtasks-toggle:hover {
          color: var(--text);
        }

        .ai-preview-subtasks-list {
          margin-top: 8px;
          padding-left: 16px;
          border-left: 1px solid var(--border-soft);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ai-preview-subtask-item {
          font-size: 0.825rem;
          color: var(--text-2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-preview-subtask-bullet {
          width: 4px;
          height: 4px;
          background: var(--accent);
          border-radius: 50%;
        }

        .ai-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid var(--border-soft);
        }

        .ai-btn-secondary {
          background: var(--bg-3);
          border: 1px solid var(--border-soft);
          color: var(--text-2);
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ai-btn-secondary:hover {
          background: var(--bg-1);
          color: var(--text);
        }

        .ai-btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.3);
        }
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(C,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:s,children:e.jsx(C,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[v==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:w,onChange:a=>M(a.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:Z.map((a,n)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>M(a.prompt),children:a.label},n))}),e.jsxs("button",{className:"ai-btn-generate",onClick:H,disabled:!w.trim(),style:{opacity:w.trim()?1:.6,cursor:w.trim()?"pointer":"not-allowed"},children:[e.jsx(C,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),v==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:Y}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),v==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:A,onChange:a=>_(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:S,onChange:a=>O(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:se.map(a=>e.jsx("span",{className:`ai-color-dot ${G===a?"active":""}`,style:{background:a},onClick:()=>B(a)},a))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",E.filter(a=>a.selected).length,")"]}),e.jsxs("span",{style:{fontSize:12,color:"var(--text-3)"},children:["Generováno pomocí ",l]})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:E.map(a=>{const n=!!L[a.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:a.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:a.selected,onChange:()=>$(a.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>$(a.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:a.title}),e.jsx("div",{className:"ai-preview-card-desc",children:a.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${a.priority}`,children:a.priority==="high"?"↑ Vysoká":a.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",a.timeEstimate]}),(a.tags||[]).map((x,R)=>e.jsxs("span",{className:"ai-badge tag",children:["#",x]},R))]})]})]}),a.subtasks&&a.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:x=>{x.stopPropagation(),y(a.id)},children:[e.jsx("span",{children:n?"Skrýt podúkoly":`Zobrazit podúkoly (${a.subtasks.length})`}),e.jsx("span",{children:n?"▴":"▾"})]}),n&&e.jsx("div",{className:"ai-preview-subtasks-list",children:a.subtasks.map((x,R)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:x})]},R))})]})]},a.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:v==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>m("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:z,children:[e.jsx(C,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:s,disabled:v==="loading",children:"Zavřít"})})]})]})}export{ot as ProjectDetailPage,nt as default};
