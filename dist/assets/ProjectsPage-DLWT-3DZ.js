import{d as o,j as e}from"./vendor-notes-editor-C-RICP77.js";import{O as ae,U as re,_ as ie,I as z,g as te,f as se,V as we,Y as Ne,X as me,n as Ce,G as ne,D as Se,q as ze,k as Ie,a0 as Te,c as Pe,e as Ae,m as De,h as Ee,W as Me,Z as Re,b as We,F as ge,M as Oe,$ as Be}from"./index-DxcsPHaO.js";import{Q as $e}from"./QuickAdd-41JCc26X.js";import{E as Le}from"./EmptyState-AeaBrqqK.js";const Ve=50;async function _e(s,i=Ve){const{data:b,error:k}=await ae.from("project_chats").select("role, content, created_at").eq("project_id",s).order("created_at",{ascending:!0}).limit(i);if(k)throw k;return(b||[]).map(n=>({role:n.role,content:n.content,ts:new Date(n.created_at).getTime()}))}async function Ge({projectId:s,workspaceId:i,userId:b,role:k,content:n}){const{error:g}=await ae.from("project_chats").insert({project_id:s,workspace_id:i,owner:b,role:k,content:n});if(g)throw g}async function qe(s){const{error:i}=await ae.from("project_chats").delete().eq("project_id",s);if(i)throw i}const ve=s=>`mt3:chat:${s}`,He=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function Ze(s){try{const i=localStorage.getItem(ve(s));return i?JSON.parse(i).messages??[]:[]}catch{return[]}}function oe(s,i){const b=i.slice(-50);localStorage.setItem(ve(s),JSON.stringify({messages:b}))}function Ye({project:s,tasks:i,notes:b,onClose:k}){const{t:n,isMobile:g,activeWorkspaceId:P,userId:h}=re(),w=ie(),[v,A]=o.useState(()=>Ze(s.id)),U=(p,N)=>{!P||!h||Ge({projectId:s.id,workspaceId:P,userId:h,role:p,content:N}).catch(()=>{})},[E,L]=o.useState(""),[C,R]=o.useState(!1),V=o.useRef(null),W=o.useRef(null);o.useEffect(()=>{V.current?.scrollIntoView({behavior:"smooth"})},[v,C]),o.useEffect(()=>{g||W.current?.focus()},[g]),o.useEffect(()=>{let p=!1;return(async()=>{try{const N=await _e(s.id);!p&&N.length&&(A(N),oe(s.id,N))}catch{}})(),()=>{p=!0}},[s.id]);const O=async p=>{const N=(p??E).trim();if(!N||C)return;const $={role:"user",content:N,ts:Date.now()},_=[...v,$];A(_),oe(s.id,_),U("user",N),L(""),R(!0);try{const{data:S,error:I}=await ae.functions.invoke("gemini-project-chat",{body:{currentMessage:N,messages:v.map(({role:l,content:T})=>({role:l,content:T})),projectContext:{project:{name:s.name,description:s.description,status:s.status},tasks:i.map(l=>({title:l.title,status:l.status,priority:l.priority,dueDate:l.dueDate,subtasks:l.subtasks})),notes:b.map(l=>({title:l.title,content:l.content}))}}});if(I||!S?.reply){const l=S?.error||I?.message||"Neznámá chyba";l.includes("non-2xx")||l.includes("Unauthorized")||I?.status===401?w("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):l.toLowerCase().includes("rate limit")?w("Příliš mnoho zpráv — zkus to za hodinu.","error"):w(`Chat selhal: ${l}`,"error");return}const a={role:"assistant",content:S.reply,ts:Date.now()},d=[..._,a];A(d),oe(s.id,d),U("assistant",S.reply)}catch(S){(S?.message||String(S)).includes("non-2xx")?w("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):w("Chyba chatu — zkus to znovu","error")}finally{R(!1),g||W.current?.focus()}},B=p=>{p.key==="Enter"&&!p.shiftKey&&(p.preventDefault(),O())},M=()=>{A([]),oe(s.id,[]),qe(s.id).catch(()=>{})},Y=g?{position:"fixed",inset:0,zIndex:300,background:n.bg,display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:n.bg2,borderLeft:`1px solid ${n.border}`,display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!g&&e.jsx("div",{onClick:k,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:Y,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:`1px solid ${n.border}`,flexShrink:0},children:[g&&e.jsx("button",{onClick:k,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(z,{name:"chevron-left",size:18,color:n.text2,strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:n.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",s.name]}),e.jsxs("div",{style:{fontSize:11,color:n.text3},children:["Gemini 2.0 Flash · ",i.length," úkolů"]})]}),v.length>0&&e.jsx("button",{onClick:M,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(z,{name:"trash-2",size:14,color:n.text3,strokeWidth:2})}),!g&&e.jsx("button",{onClick:k,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(z,{name:"x",size:16,color:n.text2,strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[v.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:n.text,marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:n.text3,marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:He.map(p=>e.jsx("button",{onClick:()=>O(p),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:`1px solid ${n.border}`,background:n.input,color:n.text2,cursor:"pointer",textAlign:"left",transition:"all .12s"},children:p},p))})]}),v.map((p,N)=>e.jsx("div",{style:{display:"flex",justifyContent:p.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:g?"90%":"85%",padding:"8px 12px",borderRadius:p.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:p.role==="user"?n.accent:n.input,color:p.role==="user"?"#fff":n.text,fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"},children:p.content})},`${p.ts}-${p.role}-${N}`)),C&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:n.input,color:n.text3,fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:V})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",borderTop:`1px solid ${n.border}`,display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:W,value:E,onChange:p=>L(p.target.value),onKeyDown:B,placeholder:g?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:C,style:{flex:1,padding:"8px 12px",borderRadius:8,border:`1px solid ${n.border}`,background:n.input,color:n.text,fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:C?.6:1}}),e.jsx("button",{onClick:()=>O(),disabled:!E.trim()||C,style:{width:g?42:36,height:g?42:36,borderRadius:10,border:"none",background:E.trim()&&!C?n.accent:n.border,color:"#fff",cursor:E.trim()&&!C?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:C?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(z,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const ce=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function fe(s){const i=ge(s.dueDate);return i?`${i.getDate()}.${i.getMonth()+1}.`:null}function pe(s){const i=ge(s.dueDate);return!i||s.status==="done"?!1:i<Oe()}function de({current:s,target:i,onClick:b,label:k}){return e.jsx("button",{className:s===i?`cur ${i==="waiting"?"wait":i}`:"",onClick:b,children:k})}function Fe({colId:s,color:i,isOver:b,children:k}){const{setNodeRef:n}=Me({id:s});return e.jsx("div",{ref:n,className:`kcol${b?" drag-over":""}`,style:{"--col-color":i},children:k})}function Ke({t:s}){const{setTaskDetail:i,updateTask:b}=re(),{attributes:k,listeners:n,setNodeRef:g,transform:P,transition:h,isDragging:w}=Re({id:s.id}),v={transform:We.Transform.toString(P),transition:h,opacity:w?.3:1,cursor:w?"grabbing":"grab",touchAction:"none"};return e.jsxs("div",{ref:g,style:v,...k,...n,className:"kcard",onClick:()=>i(s.id),children:[e.jsx("div",{className:"kcard-t",children:s.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[s.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"#f87171"},children:"↑ Vysoká"}):null,s.dueDate?e.jsx("span",{className:`due ${pe(s)?"overdue":""}`,children:fe(s)}):null]}),Array.isArray(s.subtasks)&&s.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",s.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:A=>A.stopPropagation(),children:[e.jsx(de,{current:s.status,target:"todo",label:"To do",onClick:()=>b(s.id,{status:"todo"})}),e.jsx(de,{current:s.status,target:s.status==="waiting"?"waiting":"doing",label:s.status==="waiting"?"Čekám":"Doing",onClick:()=>b(s.id,{status:s.status==="doing"?"waiting":"doing"})}),e.jsx(de,{current:s.status,target:"done",label:"Hotovo",onClick:()=>b(s.id,{status:"done"})})]})]})}function tt(){const{projects:s,tasks:i,notes:b,selProject:k,setPage:n,addTask:g,updateTask:P,reorderTasks:h,updateProject:w,deleteProject:v,addNote:A,openNote:U}=re(),E=ie(),L=we(),[C,R]=o.useState(!1),[V,W]=o.useState(""),[O,B]=o.useState(""),[M,Y]=o.useState(null),[p,N]=o.useState(""),[$,_]=o.useState(""),[S,I]=o.useState(null),[a,d]=o.useState(""),[l,T]=o.useState(!1),[F,G]=o.useState(!1),[J,t]=o.useState(null),[c,m]=o.useState(null),H=Ne(me(Ee,{activationConstraint:{distance:5}}),me(De,{activationConstraint:{delay:200,tolerance:8}})),u=s.find(r=>r.id===k),y=o.useMemo(()=>u?i.filter(r=>r.projectId===u.id):[],[i,u]),Z=o.useMemo(()=>{const r={};return ce.forEach(x=>{r[x.id]=y.filter(j=>j.status===x.id).sort((j,Q)=>(j.position||0)-(Q.position||0))}),r},[y]),X=o.useCallback(({active:r})=>{t(r.id)},[]),f=o.useCallback(({over:r})=>{m(x=>{const j=r?.id??null;return x===j?x:j})},[]),q=o.useCallback(({active:r,over:x})=>{if(t(null),m(null),!x||r.id===x.id)return;const j=y.find(K=>K.id===r.id);if(!j)return;const Q=ce.find(K=>K.id===x.id);if(Q){j.status!==Q.id&&P(j.id,{status:Q.id});return}const D=y.find(K=>K.id===x.id);if(D)if(j.status===D.status){const K=Z[j.status]??[],xe=K.findIndex(le=>le.id===r.id),he=K.findIndex(le=>le.id===x.id);xe!==he&&h(Ce(K,xe,he))}else P(j.id,{status:D.status})},[y,Z,P,h]),ee=J?y.find(r=>r.id===J)??null:null;if(!u)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const be=b.filter(r=>r.primaryProjectId===u.id),je=y.filter(r=>r.status==="done").length,ke=y.length?Math.round(je/y.length*100):0,ye=()=>{w(u.id,{name:V.trim()||u.name,description:O.trim(),color:M}),R(!1),E("Projekt uložen","success")},ue=(r="todo",x=p)=>{const j=x.trim();j&&(g({title:j,status:r,projectId:u.id}),N(""),d(""),I(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>n("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:ne(u.id),display:"inline-block"}}),u.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:ne(u.id),padding:"5px 14px",border:`1px solid ${ne(u.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:te[u.status]?.label||u.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[y.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[ke,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{R(!0),W(u.name||""),B(u.description||""),Y(u.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>G(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const r=u.status==="archived",x=r?"active":"archived";w(u.id,{status:x}),E(r?"Projekt byl obnoven":"Projekt byl archivován","success"),n("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(z,{name:u.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),u.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await L("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await v(u.id),n("projects"))},children:"Smazat"})]})]}),C?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:V,onChange:r=>W(r.target.value),placeholder:"Název projektu",style:{flex:1}}),e.jsx("input",{value:O,onChange:r=>B(r.target.value),placeholder:"Popis projektu",style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:se.map(r=>e.jsx("span",{onClick:()=>Y(r),style:{width:22,height:22,borderRadius:"50%",background:r,cursor:"pointer",display:"inline-block",border:M===r?"2px solid #ffffff":"2px solid transparent",boxShadow:M===r?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:x=>x.currentTarget.style.transform="scale(1.15)",onMouseLeave:x=>x.currentTarget.style.transform="scale(1)"},r))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:ye,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>R(!1),children:"Zrušit"})]})]})]}):null,e.jsx("div",{style:{marginBottom:18},children:e.jsx($e,{defaultProjectId:u.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(z,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${u.name}…`,value:$,onChange:r=>_(r.target.value),onKeyDown:r=>{if(r.key==="Enter"){const x=$.trim();if(x){const j=A({title:x,primaryProjectId:u.id});U(j.id),_("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),e.jsxs(Se,{sensors:H,collisionDetection:ze,onDragStart:X,onDragOver:f,onDragEnd:q,children:[e.jsx("div",{className:"kanban",children:ce.map(r=>{const x=Z[r.id]??[],j=r.id==="done"&&!l?x.slice(0,5):x,Q=c===r.id;return e.jsxs(Fe,{colId:r.id,color:r.color,isOver:Q,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:r.label}),e.jsx("span",{className:"kcol-count",children:x.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{I(r.id),d("")},children:e.jsx(z,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(Ie,{items:j.map(D=>D.id),strategy:Te,children:j.map(D=>e.jsx(Ke,{t:D},D.id))}),r.id==="done"&&x.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>T(D=>!D),children:l?"Skrýt dokončené":`+ ${x.length-5} dalších`}):null,x.length>0&&S!==r.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{I(r.id),d("")},children:[e.jsx(z,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,S===r.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:a,onChange:D=>d(D.target.value),onKeyDown:D=>{D.key==="Enter"&&ue(r.id,a),D.key==="Escape"&&(I(null),d(""))},onBlur:()=>ue(r.id,a),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,x.length===0&&S!==r.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{I(r.id),d("")},children:"+ Přidat úkol"}):null]},r.id)})}),e.jsx(Pe,{children:ee?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:ee.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[ee.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"#f87171"},children:"↑ Vysoká"}):null,ee.dueDate?e.jsx("span",{className:`due ${pe(ee)?"overdue":""}`,children:fe(ee)}):null]})]}):null})]}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx(Ae,{projectId:u.id})]}),F?e.jsx(Ye,{project:u,tasks:y,notes:be,onClose:()=>G(!1)}):null]})}function st(){const{projects:s,tasks:i,addProject:b,openProject:k,updateProject:n,isMobile:g}=re(),P=ie(),[h,w]=o.useState("active"),[v,A]=o.useState(!1),[U,E]=o.useState(!1),[L,C]=o.useState(""),[R,V]=o.useState(""),[W,O]=o.useState("active"),[B,M]=o.useState(null),Y=o.useRef(null),[p,N]=o.useState("none"),[$]=o.useState("newest"),[_,S]=o.useState(!1),I=o.useRef(null);o.useEffect(()=>{const t=c=>{I.current&&!I.current.contains(c.target)&&S(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const a={none:"Bez seskupení",status:"Stavu"},d=o.useMemo(()=>{let t=[...s];return h!=="all"&&(t=t.filter(c=>c.status===h)),$==="alphabetical"?t.sort((c,m)=>c.name.localeCompare(m.name)):$==="tasksCount"?t.sort((c,m)=>{const H=i.filter(y=>y.projectId===c.id).length;return i.filter(y=>y.projectId===m.id).length-H}):$==="progress"?t.sort((c,m)=>{const H=i.filter(q=>q.projectId===c.id),u=H.filter(q=>q.status==="done").length,y=H.length?u/H.length:0,Z=i.filter(q=>q.projectId===m.id),X=Z.filter(q=>q.status==="done").length;return(Z.length?X/Z.length:0)-y}):t.sort((c,m)=>(m.createdAt||0)-(c.createdAt||0)),t},[s,h,$,i]),l=o.useMemo(()=>{if(p!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return d.forEach(c=>{t[c.status]&&t[c.status].items.push(c)}),Object.entries(t).filter(([,c])=>c.items.length>0)},[d,p]),T={all:s.length,active:s.filter(t=>t.status==="active").length,idea:s.filter(t=>t.status==="idea").length,done:s.filter(t=>t.status==="done").length,archived:s.filter(t=>t.status==="archived").length},F=()=>{L.trim()&&(b({name:L.trim(),description:R.trim(),status:W,color:B}),C(""),V(""),O("active"),M(null),A(!1),P("Projekt vytvořen","success"))},G=()=>{A(!0);const t=se[Math.floor(Math.random()*se.length)];M(t),setTimeout(()=>Y.current?.focus(),40)},J=t=>{const c=i.filter(f=>f.projectId===t.id),m=c.filter(f=>f.status==="done").length,H=c.filter(f=>f.status==="doing").length,u=c.filter(f=>f.status==="waiting").length,y=c.filter(f=>f.status==="todo").length,Z=c.length?Math.round(m/c.length*100):0,X=c.filter(f=>pe(f)).length;return e.jsxs("div",{className:"pcard",style:{"--proj-color":ne(t.id)},onClick:()=>k(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[te[t.status]?.label||t.status,X?` · ⚠ ${X}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:f=>{f.stopPropagation();const q=t.status==="archived"?"active":"archived";n(t.id,{status:q}),P(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:f=>{f.currentTarget.style.color="var(--accent)",f.currentTarget.style.background="var(--bg-3)"},onMouseLeave:f=>{f.currentTarget.style.color="var(--text-3)",f.currentTarget.style.background="transparent"},children:e.jsx(z,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[c.length," úkolů · ",m," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[y>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:y})]}):null,H>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:H})]}):null,u>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:u})]}):null,m>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:m})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${Z}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[Z,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[s.length," projektů · ",T.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>E(!0),children:[e.jsx(z,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:G,children:[e.jsx(z,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${h===t.id?"active":""}`,onClick:()=>w(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:T[t.id]})]},t.id)),!g&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:I,children:[e.jsxs("span",{className:`chip ${p!=="none"?"active":""}`,onClick:()=>S(!_),children:["Seskupit: ",a[p]," ▾"]}),_&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(a).map(([t,c])=>e.jsx("button",{onClick:()=>{N(t),S(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:p===t?"var(--accent-soft)":"transparent",color:p===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:p===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:m=>{p!==t&&(m.currentTarget.style.background="var(--card-h)")},onMouseLeave:m=>{p!==t&&(m.currentTarget.style.background="transparent")},children:c},t))})]})]})]}),v?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:Y,value:L,onChange:t=>C(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:R,onChange:t=>V(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:W,onChange:t=>O(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(te).map(([t,c])=>e.jsx("option",{value:t,children:c.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:se.map(t=>e.jsx("span",{onClick:()=>M(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:B===t?"2px solid #ffffff":"2px solid transparent",boxShadow:B===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:c=>c.currentTarget.style.transform="scale(1.15)",onMouseLeave:c=>c.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:F,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{A(!1),M(null)},children:"Zrušit"})]})]})]}):null,p==="status"?e.jsxs("div",{children:[l.map(([t,c])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:te[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[c.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",c.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:c.items.map(m=>J(m))})]},t)),v?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:G,children:[e.jsx(z,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[d.map(t=>J(t)),v?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:G,children:[e.jsx(z,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}),!d.length&&!v?e.jsx(Le,{type:"projects",title:h==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${te[h]?.label??h}"`,description:h==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:h==="all"?G:void 0,actionLabel:"Nový projekt"}):null,U&&e.jsx(Ue,{onClose:()=>E(!1)})]})}function Ue({onClose:s}){const{tags:i,addProject:b,addTask:k,addTag:n,openProject:g}=re(),P=ie(),[h,w]=o.useState("prompt"),[v,A]=o.useState(""),[U,E]=o.useState("Analýza záměru a plánování..."),[L,C]=o.useState(""),[R,V]=o.useState(""),[W,O]=o.useState("#3b82f6"),[B,M]=o.useState([]),[Y,p]=o.useState({});o.useEffect(()=>{if(h!=="loading")return;const a=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let d=0;E(a[0]);const l=setInterval(()=>{d=(d+1)%a.length,E(a[d])},2500);return()=>clearInterval(l)},[h]);const N=async()=>{if(v.trim()){w("loading");try{const{data:a,error:d}=await ae.functions.invoke("ai-project-planner",{body:{userPrompt:v,availableTags:i.map(T=>T.name)}});if(d||!a?.result)throw new Error(d?.message||a?.error||"Generování selhalo");const l=a.result;C(l.projectName||""),V(l.projectDescription||""),O(l.projectColor||"#3b82f6"),M((l.tasks||[]).map((T,F)=>({...T,id:`gen-task-${F}`,selected:!0}))),w("preview")}catch(a){console.error(a),P(a.message||"Generování projektu selhalo","error"),w("prompt")}}},$=a=>{M(d=>d.map(l=>l.id===a?{...l,selected:!l.selected}:l))},_=a=>{p(d=>({...d,[a]:!d[a]}))},S=()=>{try{const a=b({name:L.trim()||"Bez názvu",description:R.trim(),status:"active",color:W});for(const d of B){if(!d.selected)continue;const l=[];if(Array.isArray(d.tags))for(const F of d.tags){const G=F.trim().toLowerCase();if(!G)continue;const J=i.find(t=>t.name.toLowerCase()===G);if(J)l.push(J.id);else{const t=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],c=t[Math.floor(Math.random()*t.length)],m=n({name:G,color:c});l.push(m.id)}}const T=(d.subtasks||[]).map(F=>({id:Be(),text:F,done:!1}));k({title:d.title,description:d.description,status:"todo",priority:d.priority,projectId:a.id,tagIds:l,subtasks:T})}P("Projekt a úkoly úspěšně vytvořeny s AI!","success"),g(a.id),s()}catch(a){console.error(a),P("Nepodařilo se uložit projekt","error")}},I=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:s,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(z,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:s,children:e.jsx(z,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[h==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:v,onChange:a=>A(a.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:I.map((a,d)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>A(a.prompt),children:a.label},d))}),e.jsxs("button",{className:"ai-btn-generate",onClick:N,disabled:!v.trim(),style:{opacity:v.trim()?1:.6,cursor:v.trim()?"pointer":"not-allowed"},children:[e.jsx(z,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),h==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:U}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),h==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:L,onChange:a=>C(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:R,onChange:a=>V(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:se.map(a=>e.jsx("span",{className:`ai-color-dot ${W===a?"active":""}`,style:{background:a},onClick:()=>O(a)},a))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",B.filter(a=>a.selected).length,")"]}),e.jsx("span",{style:{fontSize:12,color:"var(--text-3)"},children:"Vyberte úkoly k vytvoření"})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:B.map(a=>{const d=!!Y[a.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:a.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:a.selected,onChange:()=>$(a.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>$(a.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:a.title}),e.jsx("div",{className:"ai-preview-card-desc",children:a.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${a.priority}`,children:a.priority==="high"?"↑ Vysoká":a.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",a.timeEstimate]}),(a.tags||[]).map((l,T)=>e.jsxs("span",{className:"ai-badge tag",children:["#",l]},T))]})]})]}),a.subtasks&&a.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:l=>{l.stopPropagation(),_(a.id)},children:[e.jsx("span",{children:d?"Skrýt podúkoly":`Zobrazit podúkoly (${a.subtasks.length})`}),e.jsx("span",{children:d?"▴":"▾"})]}),d&&e.jsx("div",{className:"ai-preview-subtasks-list",children:a.subtasks.map((l,T)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:l})]},T))})]})]},a.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:h==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>w("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:S,children:[e.jsx(z,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:s,disabled:h==="loading",children:"Zavřít"})})]})]})}export{tt as ProjectDetailPage,st as default};
