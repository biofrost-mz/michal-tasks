import{d as o,j as e}from"./vendor-notes-editor-C-RICP77.js";import{Q as re,V as oe,$ as le,I as S,g as se,f as ae,W as Ce,Z as Se,Y as ge,o as ze,H as ie,D as Ie,r as Te,l as Pe,a1 as Ae,c as De,e as Ee,n as Me,h as Re,X as We,_ as Oe,b as Be,G as ve,O as Le,a0 as $e}from"./index-CgomigNQ.js";import{S as fe,Q as _e}from"./Skeleton-DKLMHoso.js";import{E as Ve}from"./EmptyState-CyMidKeH.js";const Ge=50;async function He(s,i=Ge){const{data:f,error:j}=await re.from("project_chats").select("role, content, created_at").eq("project_id",s).order("created_at",{ascending:!0}).limit(i);if(j)throw j;return(f||[]).map(h=>({role:h.role,content:h.content,ts:new Date(h.created_at).getTime()}))}async function Ze({projectId:s,workspaceId:i,userId:f,role:j,content:h}){const{error:I}=await re.from("project_chats").insert({project_id:s,workspace_id:i,owner:f,role:j,content:h});if(I)throw I}async function qe(s){const{error:i}=await re.from("project_chats").delete().eq("project_id",s);if(i)throw i}const be=s=>`mt3:chat:${s}`,Ye=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function Fe(s){try{const i=localStorage.getItem(be(s));return i?JSON.parse(i).messages??[]:[]}catch{return[]}}function ne(s,i){const f=i.slice(-50);localStorage.setItem(be(s),JSON.stringify({messages:f}))}function Ke({project:s,tasks:i,notes:f,onClose:j}){const{isMobile:h,activeWorkspaceId:I,userId:E}=oe(),v=le(),[m,w]=o.useState(()=>Fe(s.id)),P=(d,y)=>{!I||!E||Ze({projectId:s.id,workspaceId:I,userId:E,role:d,content:y}).catch(()=>{})},[M,K]=o.useState(""),[N,B]=o.useState(!1),V=o.useRef(null),R=o.useRef(null);o.useEffect(()=>{V.current?.scrollIntoView({behavior:"smooth"})},[m,N]),o.useEffect(()=>{h||R.current?.focus()},[h]),o.useEffect(()=>{let d=!1;return(async()=>{try{const y=await He(s.id);!d&&y.length&&(w(y),ne(s.id,y))}catch{}})(),()=>{d=!0}},[s.id]);const W=async d=>{const y=(d??M).trim();if(!y||N)return;const z={role:"user",content:y,ts:Date.now()},H=[...m,z];w(H),ne(s.id,H),P("user",y),K(""),B(!0);try{const{data:C,error:O}=await re.functions.invoke("gemini-project-chat",{body:{currentMessage:y,messages:m.map(({role:n,content:c})=>({role:n,content:c})),projectContext:{project:{name:s.name,description:s.description,status:s.status},tasks:i.map(n=>({title:n.title,status:n.status,priority:n.priority,dueDate:n.dueDate,subtasks:n.subtasks})),notes:f.map(n=>({title:n.title,content:n.content}))}}});if(O||!C?.reply){const n=C?.error||O?.message||"Neznámá chyba";n.includes("non-2xx")||n.includes("Unauthorized")||O?.status===401?v("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):n.toLowerCase().includes("rate limit")?v("Příliš mnoho zpráv — zkus to za hodinu.","error"):v(`Chat selhal: ${n}`,"error");return}const _={role:"assistant",content:C.reply,ts:Date.now()},a=[...H,_];w(a),ne(s.id,a),P("assistant",C.reply)}catch(C){(C?.message||String(C)).includes("non-2xx")?v("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):v("Chyba chatu — zkus to znovu","error")}finally{B(!1),h||R.current?.focus()}},G=d=>{d.key==="Enter"&&!d.shiftKey&&(d.preventDefault(),W())},L=()=>{w([]),ne(s.id,[]),qe(s.id).catch(()=>{})},$=h?{position:"fixed",inset:0,zIndex:300,background:"var(--bg)",display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:"var(--bg-2)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!h&&e.jsx("div",{onClick:j,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:$,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:"1px solid var(--border)",flexShrink:0},children:[h&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(S,{name:"chevron-left",size:18,color:"var(--text-2)",strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",s.name]}),e.jsxs("div",{style:{fontSize:11,color:"var(--text-3)"},children:["Gemini 2.0 Flash · ",i.length," úkolů"]})]}),m.length>0&&e.jsx("button",{onClick:L,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(S,{name:"trash-2",size:14,color:"var(--text-3)",strokeWidth:2})}),!h&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(S,{name:"x",size:16,color:"var(--text-2)",strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[m.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:Ye.map(d=>e.jsx("button",{onClick:()=>W(d),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text-2)",cursor:"pointer",textAlign:"left",transition:"all .12s"},children:d},d))})]}),m.map((d,y)=>e.jsx("div",{style:{display:"flex",justifyContent:d.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:h?"90%":"85%",padding:"8px 12px",borderRadius:d.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:d.role==="user"?"var(--accent)":"var(--input)",color:d.role==="user"?"#fff":"var(--text)",fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"},children:d.content})},`${d.ts}-${d.role}-${y}`)),N&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:"var(--input)",color:"var(--text-3)",fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:V})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + var(--safe-area-inset-bottom, 0px))",borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:R,value:M,onChange:d=>K(d.target.value),onKeyDown:G,placeholder:h?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:N,style:{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text)",fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:N?.6:1}}),e.jsx("button",{onClick:()=>W(),disabled:!M.trim()||N,style:{width:h?42:36,height:h?42:36,borderRadius:10,border:"none",background:M.trim()&&!N?"var(--accent)":"var(--border)",color:"#fff",cursor:M.trim()&&!N?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:N?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(S,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const ce=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function je(s){const i=ve(s.dueDate);return i?`${i.getDate()}.${i.getMonth()+1}.`:null}function ue(s){const i=ve(s.dueDate);return!i||s.status==="done"?!1:i<Le()}function pe({current:s,target:i,onClick:f,label:j}){return e.jsx("button",{className:s===i?`cur ${i==="waiting"?"wait":i}`:"",onClick:f,children:j})}function Ue({colId:s,color:i,isOver:f,children:j}){const{setNodeRef:h}=We({id:s});return e.jsx("div",{ref:h,className:`kcol${f?" drag-over":""}`,style:{"--col-color":i},children:j})}function Je({t:s}){const{setTaskDetail:i,updateTask:f}=oe(),{attributes:j,listeners:h,setNodeRef:I,transform:E,transition:v,isDragging:m}=Oe({id:s.id}),w={transform:Be.Transform.toString(E),transition:v,opacity:m?.3:1,cursor:m?"grabbing":"grab",touchAction:"none"};return e.jsxs("div",{ref:I,style:w,...j,...h,className:"kcard",onClick:()=>i(s.id),children:[e.jsx("div",{className:"kcard-t",children:s.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[s.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"var(--prio-high)"},children:"↑ Vysoká"}):null,s.dueDate?e.jsx("span",{className:`due ${ue(s)?"overdue":""}`,children:je(s)}):null]}),Array.isArray(s.subtasks)&&s.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",s.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:P=>P.stopPropagation(),children:[e.jsx(pe,{current:s.status,target:"todo",label:"To do",onClick:()=>f(s.id,{status:"todo"})}),e.jsx(pe,{current:s.status,target:s.status==="waiting"?"waiting":"doing",label:s.status==="waiting"?"Čekám":"Doing",onClick:()=>f(s.id,{status:s.status==="doing"?"waiting":"doing"})}),e.jsx(pe,{current:s.status,target:"done",label:"Hotovo",onClick:()=>f(s.id,{status:"done"})})]})]})}function at(){const{projects:s,tasks:i,notes:f,loaded:j,selProject:h,setPage:I,addTask:E,updateTask:v,reorderTasks:m,updateProject:w,deleteProject:P,addNote:M,openNote:K}=oe(),N=le(),B=Ce(),[V,R]=o.useState(!1),[W,G]=o.useState(""),[L,$]=o.useState(""),[d,y]=o.useState(null),[z,H]=o.useState(""),[C,O]=o.useState(""),[_,a]=o.useState(null),[n,c]=o.useState(""),[A,Z]=o.useState(!1),[Q,q]=o.useState(!1),[Y,t]=o.useState(null),[l,g]=o.useState(null),D=Se(ge(Re,{activationConstraint:{distance:5}}),ge(Me,{activationConstraint:{delay:200,tolerance:8}})),p=s.find(r=>r.id===h),k=o.useMemo(()=>p?i.filter(r=>r.projectId===p.id):[],[i,p]),F=o.useMemo(()=>{const r={};return ce.forEach(u=>{r[u.id]=k.filter(b=>b.status===u.id).sort((b,X)=>(b.position||0)-(X.position||0))}),r},[k]),ee=o.useCallback(({active:r})=>{t(r.id)},[]),te=o.useCallback(({over:r})=>{g(u=>{const b=r?.id??null;return u===b?u:b})},[]),x=o.useCallback(({active:r,over:u})=>{if(t(null),g(null),!u||r.id===u.id)return;const b=k.find(U=>U.id===r.id);if(!b)return;const X=ce.find(U=>U.id===u.id);if(X){b.status!==X.id&&v(b.id,{status:X.id});return}const T=k.find(U=>U.id===u.id);if(T)if(b.status===T.status){const U=F[b.status]??[],he=U.findIndex(de=>de.id===r.id),me=U.findIndex(de=>de.id===u.id);he!==me&&m(ze(U,he,me))}else v(b.id,{status:T.status})},[k,F,v,m]),J=Y?k.find(r=>r.id===Y)??null:null;if(!p)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const ye=f.filter(r=>r.primaryProjectId===p.id),ke=k.filter(r=>r.status==="done").length,we=k.length?Math.round(ke/k.length*100):0,Ne=()=>{w(p.id,{name:W.trim()||p.name,description:L.trim(),color:d}),R(!1),N("Projekt uložen","success")},xe=(r="todo",u=z)=>{const b=u.trim();b&&(E({title:b,status:r,projectId:p.id}),H(""),c(""),a(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>I("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:ie(p.id),display:"inline-block"}}),p.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:ie(p.id),padding:"5px 14px",border:`1px solid ${ie(p.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:se[p.status]?.label||p.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[k.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[we,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{R(!0),G(p.name||""),$(p.description||""),y(p.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>q(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const r=p.status==="archived",u=r?"active":"archived";w(p.id,{status:u}),N(r?"Projekt byl obnoven":"Projekt byl archivován","success"),I("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(S,{name:p.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),p.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await B("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await P(p.id),I("projects"))},children:"Smazat"})]})]}),V?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:W,onChange:r=>G(r.target.value),placeholder:"Název projektu",style:{flex:1}}),e.jsx("input",{value:L,onChange:r=>$(r.target.value),placeholder:"Popis projektu",style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ae.map(r=>e.jsx("span",{onClick:()=>y(r),style:{width:22,height:22,borderRadius:"50%",background:r,cursor:"pointer",display:"inline-block",border:d===r?"2px solid #ffffff":"2px solid transparent",boxShadow:d===r?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:u=>u.currentTarget.style.transform="scale(1.15)",onMouseLeave:u=>u.currentTarget.style.transform="scale(1)"},r))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:Ne,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>R(!1),children:"Zrušit"})]})]})]}):null,e.jsx("div",{style:{marginBottom:18},children:e.jsx(_e,{defaultProjectId:p.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(S,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${p.name}…`,value:C,onChange:r=>O(r.target.value),onKeyDown:r=>{if(r.key==="Enter"){const u=C.trim();if(u){const b=M({title:u,primaryProjectId:p.id});K(b.id),O("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),j?e.jsxs(Ie,{sensors:D,collisionDetection:Te,onDragStart:ee,onDragOver:te,onDragEnd:x,children:[e.jsx("div",{className:"kanban",children:ce.map(r=>{const u=F[r.id]??[],b=r.id==="done"&&!A?u.slice(0,5):u,X=l===r.id;return e.jsxs(Ue,{colId:r.id,color:r.color,isOver:X,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:r.label}),e.jsx("span",{className:"kcol-count",children:u.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{a(r.id),c("")},children:e.jsx(S,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(Pe,{items:b.map(T=>T.id),strategy:Ae,children:b.map(T=>e.jsx(Je,{t:T},T.id))}),r.id==="done"&&u.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>Z(T=>!T),children:A?"Skrýt dokončené":`+ ${u.length-5} dalších`}):null,u.length>0&&_!==r.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{a(r.id),c("")},children:[e.jsx(S,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,_===r.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:n,onChange:T=>c(T.target.value),onKeyDown:T=>{T.key==="Enter"&&xe(r.id,n),T.key==="Escape"&&(a(null),c(""))},onBlur:()=>xe(r.id,n),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,u.length===0&&_!==r.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{a(r.id),c("")},children:"+ Přidat úkol"}):null]},r.id)})}),e.jsx(De,{children:J?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:J.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[J.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"var(--prio-high)"},children:"↑ Vysoká"}):null,J.dueDate?e.jsx("span",{className:`due ${ue(J)?"overdue":""}`,children:je(J)}):null]})]}):null})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8,marginTop:16},children:[...Array(4)].map((r,u)=>e.jsx(fe,{},u))}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx(Ee,{projectId:p.id})]}),Q?e.jsx(Ke,{project:p,tasks:k,notes:ye,onClose:()=>q(!1)}):null]})}function rt(){const{projects:s,tasks:i,addProject:f,openProject:j,updateProject:h,isMobile:I,loaded:E}=oe(),v=le(),[m,w]=o.useState("active"),[P,M]=o.useState(!1),[K,N]=o.useState(!1),[B,V]=o.useState(""),[R,W]=o.useState(""),[G,L]=o.useState("active"),[$,d]=o.useState(null),y=o.useRef(null),[z,H]=o.useState("none"),[C]=o.useState("newest"),[O,_]=o.useState(!1),a=o.useRef(null);o.useEffect(()=>{const t=l=>{a.current&&!a.current.contains(l.target)&&_(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const n={none:"Bez seskupení",status:"Stavu"},c=o.useMemo(()=>{let t=[...s];return m!=="all"&&(t=t.filter(l=>l.status===m)),C==="alphabetical"?t.sort((l,g)=>l.name.localeCompare(g.name)):C==="tasksCount"?t.sort((l,g)=>{const D=i.filter(k=>k.projectId===l.id).length;return i.filter(k=>k.projectId===g.id).length-D}):C==="progress"?t.sort((l,g)=>{const D=i.filter(x=>x.projectId===l.id),p=D.filter(x=>x.status==="done").length,k=D.length?p/D.length:0,F=i.filter(x=>x.projectId===g.id),ee=F.filter(x=>x.status==="done").length;return(F.length?ee/F.length:0)-k}):t.sort((l,g)=>(g.createdAt||0)-(l.createdAt||0)),t},[s,m,C,i]),A=o.useMemo(()=>{if(z!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return c.forEach(l=>{t[l.status]&&t[l.status].items.push(l)}),Object.entries(t).filter(([,l])=>l.items.length>0)},[c,z]),Z={all:s.length,active:s.filter(t=>t.status==="active").length,idea:s.filter(t=>t.status==="idea").length,done:s.filter(t=>t.status==="done").length,archived:s.filter(t=>t.status==="archived").length},Q=()=>{B.trim()&&(f({name:B.trim(),description:R.trim(),status:G,color:$}),V(""),W(""),L("active"),d(null),M(!1),v("Projekt vytvořen","success"))},q=()=>{M(!0);const t=ae[Math.floor(Math.random()*ae.length)];d(t),setTimeout(()=>y.current?.focus(),40)},Y=(t,l=0)=>{const g=i.filter(x=>x.projectId===t.id),D=g.filter(x=>x.status==="done").length,p=g.filter(x=>x.status==="doing").length,k=g.filter(x=>x.status==="waiting").length,F=g.filter(x=>x.status==="todo").length,ee=g.length?Math.round(D/g.length*100):0,te=g.filter(x=>ue(x)).length;return e.jsxs("div",{className:"pcard list-item-enter",style:{"--proj-color":ie(t.id),"--item-index":Math.min(l,7)},onClick:()=>j(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[se[t.status]?.label||t.status,te?` · ⚠ ${te}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:x=>{x.stopPropagation();const J=t.status==="archived"?"active":"archived";h(t.id,{status:J}),v(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:x=>{x.currentTarget.style.color="var(--accent)",x.currentTarget.style.background="var(--bg-3)"},onMouseLeave:x=>{x.currentTarget.style.color="var(--text-3)",x.currentTarget.style.background="transparent"},children:e.jsx(S,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[g.length," úkolů · ",D," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[F>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:F})]}):null,p>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:p})]}):null,k>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:k})]}):null,D>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:D})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${ee}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[ee,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[s.length," projektů · ",Z.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>N(!0),children:[e.jsx(S,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:q,children:[e.jsx(S,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${m===t.id?"active":""}`,onClick:()=>w(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:Z[t.id]})]},t.id)),!I&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:a,children:[e.jsxs("span",{className:`chip ${z!=="none"?"active":""}`,onClick:()=>_(!O),children:["Seskupit: ",n[z]," ▾"]}),O&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(n).map(([t,l])=>e.jsx("button",{onClick:()=>{H(t),_(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:z===t?"var(--accent-soft)":"transparent",color:z===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:z===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:g=>{z!==t&&(g.currentTarget.style.background="var(--card-h)")},onMouseLeave:g=>{z!==t&&(g.currentTarget.style.background="transparent")},children:l},t))})]})]})]}),P?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:y,value:B,onChange:t=>V(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:R,onChange:t=>W(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:G,onChange:t=>L(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(se).map(([t,l])=>e.jsx("option",{value:t,children:l.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ae.map(t=>e.jsx("span",{onClick:()=>d(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:$===t?"2px solid #ffffff":"2px solid transparent",boxShadow:$===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:l=>l.currentTarget.style.transform="scale(1.15)",onMouseLeave:l=>l.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:Q,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{M(!1),d(null)},children:"Zrušit"})]})]})]}):null,E?z==="status"?e.jsxs("div",{children:[A.map(([t,l])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:se[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[l.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",l.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:l.items.map((g,D)=>Y(g,D))})]},t)),P?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:q,children:[e.jsx(S,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[c.map((t,l)=>Y(t,l)),P?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:q,children:[e.jsx(S,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[...Array(4)].map((t,l)=>e.jsx(fe,{},l))}),E&&!c.length&&!P?e.jsx(Ve,{type:"projects",title:m==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${se[m]?.label??m}"`,description:m==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:m==="all"?q:void 0,actionLabel:"Nový projekt"}):null,K&&e.jsx(Qe,{onClose:()=>N(!1)})]})}function Qe({onClose:s}){const{tags:i,addProject:f,addTask:j,addTag:h,openProject:I}=oe(),E=le(),[v,m]=o.useState("prompt"),[w,P]=o.useState(""),[M,K]=o.useState("Analýza záměru a plánování..."),[N,B]=o.useState(""),[V,R]=o.useState(""),[W,G]=o.useState("#3b82f6"),[L,$]=o.useState([]),[d,y]=o.useState({});o.useEffect(()=>{if(v!=="loading")return;const a=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let n=0;K(a[0]);const c=setInterval(()=>{n=(n+1)%a.length,K(a[n])},2500);return()=>clearInterval(c)},[v]);const z=async()=>{if(w.trim()){m("loading");try{const{data:a,error:n}=await re.functions.invoke("ai-project-planner",{body:{userPrompt:w,availableTags:i.map(A=>A.name)}});if(n||!a?.result)throw new Error(n?.message||a?.error||"Generování selhalo");const c=a.result;B(c.projectName||""),R(c.projectDescription||""),G(c.projectColor||"#3b82f6"),$((c.tasks||[]).map((A,Z)=>({...A,id:`gen-task-${Z}`,selected:!0}))),m("preview")}catch(a){console.error(a),E(a.message||"Generování projektu selhalo","error"),m("prompt")}}},H=a=>{$(n=>n.map(c=>c.id===a?{...c,selected:!c.selected}:c))},C=a=>{y(n=>({...n,[a]:!n[a]}))},O=()=>{try{const a=f({name:N.trim()||"Bez názvu",description:V.trim(),status:"active",color:W});for(const n of L){if(!n.selected)continue;const c=[];if(Array.isArray(n.tags))for(const Z of n.tags){const Q=Z.trim().toLowerCase();if(!Q)continue;const q=i.find(Y=>Y.name.toLowerCase()===Q);if(q)c.push(q.id);else{const Y=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],t=Y[Math.floor(Math.random()*Y.length)],l=h({name:Q,color:t});c.push(l.id)}}const A=(n.subtasks||[]).map(Z=>({id:$e(),text:Z,done:!1}));j({title:n.title,description:n.description,status:"todo",priority:n.priority,projectId:a.id,tagIds:c,subtasks:A})}E("Projekt a úkoly úspěšně vytvořeny s AI!","success"),I(a.id),s()}catch(a){console.error(a),E("Nepodařilo se uložit projekt","error")}},_=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:s,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(S,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:s,children:e.jsx(S,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[v==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:w,onChange:a=>P(a.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:_.map((a,n)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>P(a.prompt),children:a.label},n))}),e.jsxs("button",{className:"ai-btn-generate",onClick:z,disabled:!w.trim(),style:{opacity:w.trim()?1:.6,cursor:w.trim()?"pointer":"not-allowed"},children:[e.jsx(S,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),v==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:M}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),v==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:N,onChange:a=>B(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:V,onChange:a=>R(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:ae.map(a=>e.jsx("span",{className:`ai-color-dot ${W===a?"active":""}`,style:{background:a},onClick:()=>G(a)},a))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",L.filter(a=>a.selected).length,")"]}),e.jsx("span",{style:{fontSize:12,color:"var(--text-3)"},children:"Vyberte úkoly k vytvoření"})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:L.map(a=>{const n=!!d[a.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:a.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:a.selected,onChange:()=>H(a.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>H(a.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:a.title}),e.jsx("div",{className:"ai-preview-card-desc",children:a.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${a.priority}`,children:a.priority==="high"?"↑ Vysoká":a.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",a.timeEstimate]}),(a.tags||[]).map((c,A)=>e.jsxs("span",{className:"ai-badge tag",children:["#",c]},A))]})]})]}),a.subtasks&&a.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:c=>{c.stopPropagation(),C(a.id)},children:[e.jsx("span",{children:n?"Skrýt podúkoly":`Zobrazit podúkoly (${a.subtasks.length})`}),e.jsx("span",{children:n?"▴":"▾"})]}),n&&e.jsx("div",{className:"ai-preview-subtasks-list",children:a.subtasks.map((c,A)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:c})]},A))})]})]},a.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:v==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>m("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:O,children:[e.jsx(S,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:s,disabled:v==="loading",children:"Zavřít"})})]})]})}export{at as ProjectDetailPage,rt as default};
