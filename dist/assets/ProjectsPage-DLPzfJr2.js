import{d as o,j as e}from"./vendor-notes-editor-C-RICP77.js";import{O as re,U as oe,_ as le,I as T,g as se,f as ae,V as Ce,Y as Se,X as ve,n as ze,G as ie,D as Ie,q as Te,k as Pe,a0 as Ae,c as De,e as Ee,m as Me,h as Re,W as We,Z as Oe,b as Be,F as fe,M as $e,$ as Le}from"./index-Cp2VZOyn.js";import{S as be,Q as _e}from"./Skeleton-CRhltnzO.js";import{E as Ve}from"./EmptyState-CZO05ih5.js";const Ge=50;async function qe(s,i=Ge){const{data:f,error:j}=await re.from("project_chats").select("role, content, created_at").eq("project_id",s).order("created_at",{ascending:!0}).limit(i);if(j)throw j;return(f||[]).map(l=>({role:l.role,content:l.content,ts:new Date(l.created_at).getTime()}))}async function He({projectId:s,workspaceId:i,userId:f,role:j,content:l}){const{error:g}=await re.from("project_chats").insert({project_id:s,workspace_id:i,owner:f,role:j,content:l});if(g)throw g}async function Ze(s){const{error:i}=await re.from("project_chats").delete().eq("project_id",s);if(i)throw i}const je=s=>`mt3:chat:${s}`,Ye=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function Fe(s){try{const i=localStorage.getItem(je(s));return i?JSON.parse(i).messages??[]:[]}catch{return[]}}function ne(s,i){const f=i.slice(-50);localStorage.setItem(je(s),JSON.stringify({messages:f}))}function Ke({project:s,tasks:i,notes:f,onClose:j}){const{t:l,isMobile:g,activeWorkspaceId:D,userId:N}=oe(),y=le(),[m,E]=o.useState(()=>Fe(s.id)),L=(u,k)=>{!D||!N||He({projectId:s.id,workspaceId:D,userId:N,role:u,content:k}).catch(()=>{})},[A,q]=o.useState(""),[C,_]=o.useState(!1),R=o.useRef(null),W=o.useRef(null);o.useEffect(()=>{R.current?.scrollIntoView({behavior:"smooth"})},[m,C]),o.useEffect(()=>{g||W.current?.focus()},[g]),o.useEffect(()=>{let u=!1;return(async()=>{try{const k=await qe(s.id);!u&&k.length&&(E(k),ne(s.id,k))}catch{}})(),()=>{u=!0}},[s.id]);const O=async u=>{const k=(u??A).trim();if(!k||C)return;const S={role:"user",content:k,ts:Date.now()},Z=[...m,S];E(Z),ne(s.id,Z),L("user",k),q(""),_(!0);try{const{data:z,error:M}=await re.functions.invoke("gemini-project-chat",{body:{currentMessage:k,messages:m.map(({role:n,content:w})=>({role:n,content:w})),projectContext:{project:{name:s.name,description:s.description,status:s.status},tasks:i.map(n=>({title:n.title,status:n.status,priority:n.priority,dueDate:n.dueDate,subtasks:n.subtasks})),notes:f.map(n=>({title:n.title,content:n.content}))}}});if(M||!z?.reply){const n=z?.error||M?.message||"Neznámá chyba";n.includes("non-2xx")||n.includes("Unauthorized")||M?.status===401?y("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):n.toLowerCase().includes("rate limit")?y("Příliš mnoho zpráv — zkus to za hodinu.","error"):y(`Chat selhal: ${n}`,"error");return}const a={role:"assistant",content:z.reply,ts:Date.now()},p=[...Z,a];E(p),ne(s.id,p),L("assistant",z.reply)}catch(z){(z?.message||String(z)).includes("non-2xx")?y("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):y("Chyba chatu — zkus to znovu","error")}finally{_(!1),g||W.current?.focus()}},V=u=>{u.key==="Enter"&&!u.shiftKey&&(u.preventDefault(),O())},H=()=>{E([]),ne(s.id,[]),Ze(s.id).catch(()=>{})},G=g?{position:"fixed",inset:0,zIndex:300,background:l.bg,display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:l.bg2,borderLeft:`1px solid ${l.border}`,display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!g&&e.jsx("div",{onClick:j,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:G,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:`1px solid ${l.border}`,flexShrink:0},children:[g&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(T,{name:"chevron-left",size:18,color:l.text2,strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:l.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",s.name]}),e.jsxs("div",{style:{fontSize:11,color:l.text3},children:["Gemini 2.0 Flash · ",i.length," úkolů"]})]}),m.length>0&&e.jsx("button",{onClick:H,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(T,{name:"trash-2",size:14,color:l.text3,strokeWidth:2})}),!g&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(T,{name:"x",size:16,color:l.text2,strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[m.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:l.text,marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:l.text3,marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:Ye.map(u=>e.jsx("button",{onClick:()=>O(u),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:`1px solid ${l.border}`,background:l.input,color:l.text2,cursor:"pointer",textAlign:"left",transition:"all .12s"},children:u},u))})]}),m.map((u,k)=>e.jsx("div",{style:{display:"flex",justifyContent:u.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:g?"90%":"85%",padding:"8px 12px",borderRadius:u.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:u.role==="user"?l.accent:l.input,color:u.role==="user"?"#fff":l.text,fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"},children:u.content})},`${u.ts}-${u.role}-${k}`)),C&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:l.input,color:l.text3,fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:R})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",borderTop:`1px solid ${l.border}`,display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:W,value:A,onChange:u=>q(u.target.value),onKeyDown:V,placeholder:g?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:C,style:{flex:1,padding:"8px 12px",borderRadius:8,border:`1px solid ${l.border}`,background:l.input,color:l.text,fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:C?.6:1}}),e.jsx("button",{onClick:()=>O(),disabled:!A.trim()||C,style:{width:g?42:36,height:g?42:36,borderRadius:10,border:"none",background:A.trim()&&!C?l.accent:l.border,color:"#fff",cursor:A.trim()&&!C?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:C?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(T,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const pe=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function ye(s){const i=fe(s.dueDate);return i?`${i.getDate()}.${i.getMonth()+1}.`:null}function xe(s){const i=fe(s.dueDate);return!i||s.status==="done"?!1:i<$e()}function ue({current:s,target:i,onClick:f,label:j}){return e.jsx("button",{className:s===i?`cur ${i==="waiting"?"wait":i}`:"",onClick:f,children:j})}function Ue({colId:s,color:i,isOver:f,children:j}){const{setNodeRef:l}=We({id:s});return e.jsx("div",{ref:l,className:`kcol${f?" drag-over":""}`,style:{"--col-color":i},children:j})}function Je({t:s}){const{setTaskDetail:i,updateTask:f}=oe(),{attributes:j,listeners:l,setNodeRef:g,transform:D,transition:N,isDragging:y}=Oe({id:s.id}),m={transform:Be.Transform.toString(D),transition:N,opacity:y?.3:1,cursor:y?"grabbing":"grab",touchAction:"none"};return e.jsxs("div",{ref:g,style:m,...j,...l,className:"kcard",onClick:()=>i(s.id),children:[e.jsx("div",{className:"kcard-t",children:s.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[s.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"#f87171"},children:"↑ Vysoká"}):null,s.dueDate?e.jsx("span",{className:`due ${xe(s)?"overdue":""}`,children:ye(s)}):null]}),Array.isArray(s.subtasks)&&s.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",s.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:E=>E.stopPropagation(),children:[e.jsx(ue,{current:s.status,target:"todo",label:"To do",onClick:()=>f(s.id,{status:"todo"})}),e.jsx(ue,{current:s.status,target:s.status==="waiting"?"waiting":"doing",label:s.status==="waiting"?"Čekám":"Doing",onClick:()=>f(s.id,{status:s.status==="doing"?"waiting":"doing"})}),e.jsx(ue,{current:s.status,target:"done",label:"Hotovo",onClick:()=>f(s.id,{status:"done"})})]})]})}function at(){const{projects:s,tasks:i,notes:f,loaded:j,selProject:l,setPage:g,addTask:D,updateTask:N,reorderTasks:y,updateProject:m,deleteProject:E,addNote:L,openNote:A}=oe(),q=le(),C=Ce(),[_,R]=o.useState(!1),[W,O]=o.useState(""),[V,H]=o.useState(""),[G,u]=o.useState(null),[k,S]=o.useState(""),[Z,z]=o.useState(""),[M,a]=o.useState(null),[p,n]=o.useState(""),[w,Y]=o.useState(!1),[K,J]=o.useState(!1),[B,Q]=o.useState(null),[t,c]=o.useState(null),v=Se(ve(Re,{activationConstraint:{distance:5}}),ve(Me,{activationConstraint:{delay:200,tolerance:8}})),d=s.find(r=>r.id===l),I=o.useMemo(()=>d?i.filter(r=>r.projectId===d.id):[],[i,d]),$=o.useMemo(()=>{const r={};return pe.forEach(h=>{r[h.id]=I.filter(b=>b.status===h.id).sort((b,X)=>(b.position||0)-(X.position||0))}),r},[I]),U=o.useCallback(({active:r})=>{Q(r.id)},[]),ee=o.useCallback(({over:r})=>{c(h=>{const b=r?.id??null;return h===b?h:b})},[]),te=o.useCallback(({active:r,over:h})=>{if(Q(null),c(null),!h||r.id===h.id)return;const b=I.find(F=>F.id===r.id);if(!b)return;const X=pe.find(F=>F.id===h.id);if(X){b.status!==X.id&&N(b.id,{status:X.id});return}const P=I.find(F=>F.id===h.id);if(P)if(b.status===P.status){const F=$[b.status]??[],me=F.findIndex(ce=>ce.id===r.id),ge=F.findIndex(ce=>ce.id===h.id);me!==ge&&y(ze(F,me,ge))}else N(b.id,{status:P.status})},[I,$,N,y]),x=B?I.find(r=>r.id===B)??null:null;if(!d)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const de=f.filter(r=>r.primaryProjectId===d.id),ke=I.filter(r=>r.status==="done").length,we=I.length?Math.round(ke/I.length*100):0,Ne=()=>{m(d.id,{name:W.trim()||d.name,description:V.trim(),color:G}),R(!1),q("Projekt uložen","success")},he=(r="todo",h=k)=>{const b=h.trim();b&&(D({title:b,status:r,projectId:d.id}),S(""),n(""),a(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>g("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:ie(d.id),display:"inline-block"}}),d.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:ie(d.id),padding:"5px 14px",border:`1px solid ${ie(d.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:se[d.status]?.label||d.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[I.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[we,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{R(!0),O(d.name||""),H(d.description||""),u(d.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>J(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const r=d.status==="archived",h=r?"active":"archived";m(d.id,{status:h}),q(r?"Projekt byl obnoven":"Projekt byl archivován","success"),g("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(T,{name:d.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),d.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await C("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await E(d.id),g("projects"))},children:"Smazat"})]})]}),_?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:W,onChange:r=>O(r.target.value),placeholder:"Název projektu",style:{flex:1}}),e.jsx("input",{value:V,onChange:r=>H(r.target.value),placeholder:"Popis projektu",style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ae.map(r=>e.jsx("span",{onClick:()=>u(r),style:{width:22,height:22,borderRadius:"50%",background:r,cursor:"pointer",display:"inline-block",border:G===r?"2px solid #ffffff":"2px solid transparent",boxShadow:G===r?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:h=>h.currentTarget.style.transform="scale(1.15)",onMouseLeave:h=>h.currentTarget.style.transform="scale(1)"},r))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:Ne,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>R(!1),children:"Zrušit"})]})]})]}):null,e.jsx("div",{style:{marginBottom:18},children:e.jsx(_e,{defaultProjectId:d.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(T,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${d.name}…`,value:Z,onChange:r=>z(r.target.value),onKeyDown:r=>{if(r.key==="Enter"){const h=Z.trim();if(h){const b=L({title:h,primaryProjectId:d.id});A(b.id),z("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),j?e.jsxs(Ie,{sensors:v,collisionDetection:Te,onDragStart:U,onDragOver:ee,onDragEnd:te,children:[e.jsx("div",{className:"kanban",children:pe.map(r=>{const h=$[r.id]??[],b=r.id==="done"&&!w?h.slice(0,5):h,X=t===r.id;return e.jsxs(Ue,{colId:r.id,color:r.color,isOver:X,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:r.label}),e.jsx("span",{className:"kcol-count",children:h.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{a(r.id),n("")},children:e.jsx(T,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(Pe,{items:b.map(P=>P.id),strategy:Ae,children:b.map(P=>e.jsx(Je,{t:P},P.id))}),r.id==="done"&&h.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>Y(P=>!P),children:w?"Skrýt dokončené":`+ ${h.length-5} dalších`}):null,h.length>0&&M!==r.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{a(r.id),n("")},children:[e.jsx(T,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,M===r.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:p,onChange:P=>n(P.target.value),onKeyDown:P=>{P.key==="Enter"&&he(r.id,p),P.key==="Escape"&&(a(null),n(""))},onBlur:()=>he(r.id,p),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,h.length===0&&M!==r.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{a(r.id),n("")},children:"+ Přidat úkol"}):null]},r.id)})}),e.jsx(De,{children:x?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:x.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[x.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"#f87171"},children:"↑ Vysoká"}):null,x.dueDate?e.jsx("span",{className:`due ${xe(x)?"overdue":""}`,children:ye(x)}):null]})]}):null})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8,marginTop:16},children:[...Array(4)].map((r,h)=>e.jsx(be,{},h))}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx(Ee,{projectId:d.id})]}),K?e.jsx(Ke,{project:d,tasks:I,notes:de,onClose:()=>J(!1)}):null]})}function rt(){const{projects:s,tasks:i,addProject:f,openProject:j,updateProject:l,isMobile:g,loaded:D,dk:N}=oe(),y=le(),[m,E]=o.useState("active"),[L,A]=o.useState(!1),[q,C]=o.useState(!1),[_,R]=o.useState(""),[W,O]=o.useState(""),[V,H]=o.useState("active"),[G,u]=o.useState(null),k=o.useRef(null),[S,Z]=o.useState("none"),[z]=o.useState("newest"),[M,a]=o.useState(!1),p=o.useRef(null);o.useEffect(()=>{const t=c=>{p.current&&!p.current.contains(c.target)&&a(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const n={none:"Bez seskupení",status:"Stavu"},w=o.useMemo(()=>{let t=[...s];return m!=="all"&&(t=t.filter(c=>c.status===m)),z==="alphabetical"?t.sort((c,v)=>c.name.localeCompare(v.name)):z==="tasksCount"?t.sort((c,v)=>{const d=i.filter($=>$.projectId===c.id).length;return i.filter($=>$.projectId===v.id).length-d}):z==="progress"?t.sort((c,v)=>{const d=i.filter(x=>x.projectId===c.id),I=d.filter(x=>x.status==="done").length,$=d.length?I/d.length:0,U=i.filter(x=>x.projectId===v.id),ee=U.filter(x=>x.status==="done").length;return(U.length?ee/U.length:0)-$}):t.sort((c,v)=>(v.createdAt||0)-(c.createdAt||0)),t},[s,m,z,i]),Y=o.useMemo(()=>{if(S!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return w.forEach(c=>{t[c.status]&&t[c.status].items.push(c)}),Object.entries(t).filter(([,c])=>c.items.length>0)},[w,S]),K={all:s.length,active:s.filter(t=>t.status==="active").length,idea:s.filter(t=>t.status==="idea").length,done:s.filter(t=>t.status==="done").length,archived:s.filter(t=>t.status==="archived").length},J=()=>{_.trim()&&(f({name:_.trim(),description:W.trim(),status:V,color:G}),R(""),O(""),H("active"),u(null),A(!1),y("Projekt vytvořen","success"))},B=()=>{A(!0);const t=ae[Math.floor(Math.random()*ae.length)];u(t),setTimeout(()=>k.current?.focus(),40)},Q=(t,c=0)=>{const v=i.filter(x=>x.projectId===t.id),d=v.filter(x=>x.status==="done").length,I=v.filter(x=>x.status==="doing").length,$=v.filter(x=>x.status==="waiting").length,U=v.filter(x=>x.status==="todo").length,ee=v.length?Math.round(d/v.length*100):0,te=v.filter(x=>xe(x)).length;return e.jsxs("div",{className:"pcard list-item-enter",style:{"--proj-color":ie(t.id),"--item-index":Math.min(c,7)},onClick:()=>j(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[se[t.status]?.label||t.status,te?` · ⚠ ${te}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:x=>{x.stopPropagation();const de=t.status==="archived"?"active":"archived";l(t.id,{status:de}),y(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:x=>{x.currentTarget.style.color="var(--accent)",x.currentTarget.style.background="var(--bg-3)"},onMouseLeave:x=>{x.currentTarget.style.color="var(--text-3)",x.currentTarget.style.background="transparent"},children:e.jsx(T,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[v.length," úkolů · ",d," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[U>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:U})]}):null,I>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:I})]}):null,$>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:$})]}):null,d>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:d})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${ee}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[ee,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[s.length," projektů · ",K.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>C(!0),children:[e.jsx(T,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:B,children:[e.jsx(T,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${m===t.id?"active":""}`,onClick:()=>E(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:K[t.id]})]},t.id)),!g&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:p,children:[e.jsxs("span",{className:`chip ${S!=="none"?"active":""}`,onClick:()=>a(!M),children:["Seskupit: ",n[S]," ▾"]}),M&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(n).map(([t,c])=>e.jsx("button",{onClick:()=>{Z(t),a(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:S===t?"var(--accent-soft)":"transparent",color:S===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:S===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:v=>{S!==t&&(v.currentTarget.style.background="var(--card-h)")},onMouseLeave:v=>{S!==t&&(v.currentTarget.style.background="transparent")},children:c},t))})]})]})]}),L?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:k,value:_,onChange:t=>R(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:W,onChange:t=>O(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:V,onChange:t=>H(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(se).map(([t,c])=>e.jsx("option",{value:t,children:c.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ae.map(t=>e.jsx("span",{onClick:()=>u(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:G===t?"2px solid #ffffff":"2px solid transparent",boxShadow:G===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:c=>c.currentTarget.style.transform="scale(1.15)",onMouseLeave:c=>c.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:J,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{A(!1),u(null)},children:"Zrušit"})]})]})]}):null,D?S==="status"?e.jsxs("div",{children:[Y.map(([t,c])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:se[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[c.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",c.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:c.items.map((v,d)=>Q(v,d))})]},t)),L?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:B,children:[e.jsx(T,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[w.map((t,c)=>Q(t,c)),L?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:B,children:[e.jsx(T,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[...Array(4)].map((t,c)=>e.jsx(be,{},c))}),D&&!w.length&&!L?e.jsx(Ve,{type:"projects",title:m==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${se[m]?.label??m}"`,description:m==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:m==="all"?B:void 0,actionLabel:"Nový projekt"}):null,q&&e.jsx(Qe,{onClose:()=>C(!1)})]})}function Qe({onClose:s}){const{tags:i,addProject:f,addTask:j,addTag:l,openProject:g}=oe(),D=le(),[N,y]=o.useState("prompt"),[m,E]=o.useState(""),[L,A]=o.useState("Analýza záměru a plánování..."),[q,C]=o.useState(""),[_,R]=o.useState(""),[W,O]=o.useState("#3b82f6"),[V,H]=o.useState([]),[G,u]=o.useState({});o.useEffect(()=>{if(N!=="loading")return;const a=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let p=0;A(a[0]);const n=setInterval(()=>{p=(p+1)%a.length,A(a[p])},2500);return()=>clearInterval(n)},[N]);const k=async()=>{if(m.trim()){y("loading");try{const{data:a,error:p}=await re.functions.invoke("ai-project-planner",{body:{userPrompt:m,availableTags:i.map(w=>w.name)}});if(p||!a?.result)throw new Error(p?.message||a?.error||"Generování selhalo");const n=a.result;C(n.projectName||""),R(n.projectDescription||""),O(n.projectColor||"#3b82f6"),H((n.tasks||[]).map((w,Y)=>({...w,id:`gen-task-${Y}`,selected:!0}))),y("preview")}catch(a){console.error(a),D(a.message||"Generování projektu selhalo","error"),y("prompt")}}},S=a=>{H(p=>p.map(n=>n.id===a?{...n,selected:!n.selected}:n))},Z=a=>{u(p=>({...p,[a]:!p[a]}))},z=()=>{try{const a=f({name:q.trim()||"Bez názvu",description:_.trim(),status:"active",color:W});for(const p of V){if(!p.selected)continue;const n=[];if(Array.isArray(p.tags))for(const Y of p.tags){const K=Y.trim().toLowerCase();if(!K)continue;const J=i.find(B=>B.name.toLowerCase()===K);if(J)n.push(J.id);else{const B=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],Q=B[Math.floor(Math.random()*B.length)],t=l({name:K,color:Q});n.push(t.id)}}const w=(p.subtasks||[]).map(Y=>({id:Le(),text:Y,done:!1}));j({title:p.title,description:p.description,status:"todo",priority:p.priority,projectId:a.id,tagIds:n,subtasks:w})}D("Projekt a úkoly úspěšně vytvořeny s AI!","success"),g(a.id),s()}catch(a){console.error(a),D("Nepodařilo se uložit projekt","error")}},M=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:s,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(T,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:s,children:e.jsx(T,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[N==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:m,onChange:a=>E(a.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:M.map((a,p)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>E(a.prompt),children:a.label},p))}),e.jsxs("button",{className:"ai-btn-generate",onClick:k,disabled:!m.trim(),style:{opacity:m.trim()?1:.6,cursor:m.trim()?"pointer":"not-allowed"},children:[e.jsx(T,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),N==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:L}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),N==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:q,onChange:a=>C(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:_,onChange:a=>R(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:ae.map(a=>e.jsx("span",{className:`ai-color-dot ${W===a?"active":""}`,style:{background:a},onClick:()=>O(a)},a))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",V.filter(a=>a.selected).length,")"]}),e.jsx("span",{style:{fontSize:12,color:"var(--text-3)"},children:"Vyberte úkoly k vytvoření"})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:V.map(a=>{const p=!!G[a.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:a.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:a.selected,onChange:()=>S(a.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>S(a.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:a.title}),e.jsx("div",{className:"ai-preview-card-desc",children:a.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${a.priority}`,children:a.priority==="high"?"↑ Vysoká":a.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",a.timeEstimate]}),(a.tags||[]).map((n,w)=>e.jsxs("span",{className:"ai-badge tag",children:["#",n]},w))]})]})]}),a.subtasks&&a.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:n=>{n.stopPropagation(),Z(a.id)},children:[e.jsx("span",{children:p?"Skrýt podúkoly":`Zobrazit podúkoly (${a.subtasks.length})`}),e.jsx("span",{children:p?"▴":"▾"})]}),p&&e.jsx("div",{className:"ai-preview-subtasks-list",children:a.subtasks.map((n,w)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:n})]},w))})]})]},a.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:N==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>y("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:z,children:[e.jsx(T,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:s,disabled:N==="loading",children:"Zavřít"})})]})]})}export{at as ProjectDetailPage,rt as default};
