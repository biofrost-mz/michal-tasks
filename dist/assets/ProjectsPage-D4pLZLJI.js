import{d as o,j as e}from"./vendor-notes-editor-C-RICP77.js";import{Q as ie,V as le,$ as xe,I as C,M as Te,L as Pe,g as oe,f as ne,W as Ae,Z as De,Y as ke,o as Me,H as pe,D as Re,r as Ee,l as Oe,a1 as We,c as Be,e as Le,n as $e,h as _e,X as Ge,_ as Ve,b as He,G as we,O as Ne,a0 as Ze}from"./index-Dli0cQe_.js";import{S as Se,Q as qe}from"./Skeleton-j76HWbvB.js";import{E as Ye}from"./EmptyState-CT7RBzU5.js";const Fe=50;async function Ke(a,l=Fe){const{data:f,error:d}=await ie.from("project_chats").select("role, content, created_at").eq("project_id",a).order("created_at",{ascending:!0}).limit(l);if(d)throw d;return(f||[]).map(h=>({role:h.role,content:h.content,ts:new Date(h.created_at).getTime()}))}async function Ue({projectId:a,workspaceId:l,userId:f,role:d,content:h}){const{error:R}=await ie.from("project_chats").insert({project_id:a,workspace_id:l,owner:f,role:d,content:h});if(R)throw R}async function Je(a){const{error:l}=await ie.from("project_chats").delete().eq("project_id",a);if(l)throw l}const Ce=a=>`mt3:chat:${a}`,Qe=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function Xe(a){try{const l=localStorage.getItem(Ce(a));return l?JSON.parse(l).messages??[]:[]}catch{return[]}}function de(a,l){const f=l.slice(-50);localStorage.setItem(Ce(a),JSON.stringify({messages:f}))}function et({project:a,tasks:l,notes:f,onClose:d}){const{isMobile:h,activeWorkspaceId:R,userId:I}=le(),j=xe(),[g,y]=o.useState(()=>Xe(a.id)),[A,E]=o.useState(()=>localStorage.getItem(`mt3:chat-model:${a.id}`)||"Gemini 3.5 Flash"),_=(c,k)=>{!R||!I||Ue({projectId:a.id,workspaceId:R,userId:I,role:c,content:k}).catch(()=>{})},[v,W]=o.useState(""),[N,q]=o.useState(!1),B=o.useRef(null),L=o.useRef(null);o.useEffect(()=>{B.current?.scrollIntoView({behavior:"smooth"})},[g,N]),o.useEffect(()=>{h||L.current?.focus()},[h]),o.useEffect(()=>{let c=!1;return(async()=>{try{const k=await Ke(a.id);!c&&k.length&&(y(k),de(a.id,k))}catch{}})(),()=>{c=!0}},[a.id]);const O=async c=>{const k=(c??v).trim();if(!k||N)return;const S={role:"user",content:k,ts:Date.now()},H=[...g,S];y(H),de(a.id,H),_("user",k),W(""),q(!0);try{const{data:w,error:D}=await ie.functions.invoke("gemini-project-chat",{body:{currentMessage:k,messages:g.map(({role:n,content:u})=>({role:n,content:u})),projectContext:{project:{name:a.name,description:a.description,status:a.status},tasks:l.map(n=>({title:n.title,status:n.status,priority:n.priority,dueDate:n.dueDate,subtasks:n.subtasks})),notes:f.map(n=>({title:n.title,content:n.content}))}}});if(D||!w?.reply){const n=w?.error||D?.message||"Neznámá chyba";n.includes("non-2xx")||n.includes("Unauthorized")||D?.status===401?j("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):n.toLowerCase().includes("rate limit")?j("Příliš mnoho zpráv — zkus to za hodinu.","error"):j(`Chat selhal: ${n}`,"error");return}w?.meta?.model&&(E(w.meta.model),localStorage.setItem(`mt3:chat-model:${a.id}`,w.meta.model));const $={role:"assistant",content:w.reply,ts:Date.now()},s=[...H,$];y(s),de(a.id,s),_("assistant",w.reply)}catch(w){(w?.message||String(w)).includes("non-2xx")?j("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):j("Chyba chatu — zkus to znovu","error")}finally{q(!1),h||L.current?.focus()}},G=c=>{c.key==="Enter"&&!c.shiftKey&&(c.preventDefault(),O())},V=()=>{y([]),de(a.id,[]),Je(a.id).catch(()=>{})},Y=h?{position:"fixed",inset:0,zIndex:300,background:"var(--bg)",display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:"var(--bg-2)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!h&&e.jsx("div",{onClick:d,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:Y,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:"1px solid var(--border)",flexShrink:0},children:[h&&e.jsx("button",{onClick:d,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(C,{name:"chevron-left",size:18,color:"var(--text-2)",strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",a.name]}),e.jsxs("div",{style:{fontSize:11,color:"var(--text-3)"},children:[A," · ",l.length," úkolů"]})]}),g.length>0&&e.jsx("button",{onClick:V,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"trash-2",size:14,color:"var(--text-3)",strokeWidth:2})}),!h&&e.jsx("button",{onClick:d,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"x",size:16,color:"var(--text-2)",strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[g.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:Qe.map(c=>e.jsx("button",{onClick:()=>O(c),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text-2)",cursor:"pointer",textAlign:"left",transition:"all .12s"},children:c},c))})]}),g.map((c,k)=>e.jsx("div",{style:{display:"flex",justifyContent:c.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:h?"90%":"85%",padding:"8px 12px",borderRadius:c.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:c.role==="user"?"var(--accent)":"var(--input)",color:c.role==="user"?"#fff":"var(--text)",fontSize:13,lineHeight:1.5,whiteSpace:c.role==="user"?"pre-wrap":"normal",wordBreak:"break-word"},...c.role==="assistant"?{dangerouslySetInnerHTML:{__html:Te(Pe(c.content))}}:{children:c.content}})},`${c.ts}-${c.role}-${k}`)),N&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:"var(--input)",color:"var(--text-3)",fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:B})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + var(--safe-area-inset-bottom, 0px))",borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:L,value:v,onChange:c=>W(c.target.value),onKeyDown:G,placeholder:h?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:N,style:{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text)",fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:N?.6:1}}),e.jsx("button",{onClick:()=>O(),disabled:!v.trim()||N,style:{width:h?42:36,height:h?42:36,borderRadius:10,border:"none",background:v.trim()&&!N?"var(--accent)":"var(--border)",color:"#fff",cursor:v.trim()&&!N?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:N?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(C,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const ge=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function ze(a){const l=we(a.dueDate);if(!l)return null;const f=Ne(),d=Math.round((l-f)/864e5);return d===0?"Dnes":d===1?"Zítra":d===-1?"Včera":d>1&&d<=7?`za ${d} d`:d<-1&&d>=-7?`před ${-d} d`:`${l.getDate()}.${l.getMonth()+1}.`}function fe(a){const l=we(a.dueDate);return!l||a.status==="done"?!1:l<Ne()}function ve({current:a,target:l,onClick:f,label:d}){return e.jsx("button",{className:a===l?`cur ${l==="waiting"?"wait":l}`:"",onClick:f,children:d})}function tt({colId:a,color:l,isOver:f,children:d}){const{setNodeRef:h}=Ge({id:a});return e.jsx("div",{ref:h,className:`kcol${f?" drag-over":""}`,style:{"--col-color":l},children:d})}const ue={high:{color:"var(--prio-high)",label:"↑ Vysoká"},medium:{color:"var(--prio-med)",label:"→ Střední"},low:{color:"var(--prio-low)",label:"↓ Nízká"}};function at({t:a,tagsById:l}){const{setTaskDetail:f,updateTask:d}=le(),{attributes:h,listeners:R,setNodeRef:I,transform:j,transition:g,isDragging:y}=Ve({id:a.id}),A={transform:He.Transform.toString(j),transition:g,opacity:y?.3:1,cursor:y?"grabbing":"grab",touchAction:"none"},E=a.priority?ue[a.priority]:null,_=(a.tagIds||[]).map(v=>l[v]).filter(Boolean);return e.jsxs("div",{ref:I,style:A,...h,...R,className:"kcard",onClick:()=>f(a.id),children:[e.jsx("div",{className:"kcard-t",children:a.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[E&&e.jsx("span",{className:"prio",style:{"--prio-color":E.color},children:E.label}),a.dueDate?e.jsx("span",{className:`due ${fe(a)?"overdue":""}`,children:ze(a)}):null,_.map(v=>e.jsxs("span",{className:"tag",style:v.color?{"--tag-color":v.color,borderColor:`${v.color}55`,color:v.color}:void 0,children:[v.color&&e.jsx("span",{style:{display:"inline-block",width:5,height:5,borderRadius:"50%",background:v.color,marginRight:3,flexShrink:0}}),v.name]},v.id))]}),Array.isArray(a.subtasks)&&a.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",a.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:v=>v.stopPropagation(),children:[e.jsx(ve,{current:a.status,target:"todo",label:"To do",onClick:()=>d(a.id,{status:"todo"})}),e.jsx(ve,{current:a.status,target:a.status==="waiting"?"waiting":"doing",label:a.status==="waiting"?"Čekám":"Doing",onClick:()=>d(a.id,{status:a.status==="doing"?"waiting":"doing"})}),e.jsx(ve,{current:a.status,target:"done",label:"Hotovo",onClick:()=>d(a.id,{status:"done"})})]})]})}function lt(){const{projects:a,tasks:l,tags:f,notes:d,loaded:h,selProject:R,setPage:I,addTask:j,updateTask:g,reorderTasks:y,updateProject:A,deleteProject:E,addNote:_,openNote:v}=le(),W=xe(),N=Ae(),[q,B]=o.useState(!1),[L,O]=o.useState(""),[G,V]=o.useState(""),[Y,c]=o.useState(null),[k,S]=o.useState(""),[H,w]=o.useState(""),[D,$]=o.useState(null),[s,n]=o.useState(""),[u,M]=o.useState(!1),[F,Z]=o.useState(!1),[ee,K]=o.useState(null),[se,J]=o.useState(null),ce=De(ke(_e,{activationConstraint:{distance:5}}),ke($e,{activationConstraint:{delay:200,tolerance:8}})),t=a.find(r=>r.id===R),i=o.useMemo(()=>t?l.filter(r=>r.projectId===t.id):[],[l,t]),x=o.useMemo(()=>Object.fromEntries((f||[]).map(r=>[r.id,r])),[f]),z=o.useMemo(()=>{const r={};return ge.forEach(p=>{r[p.id]=i.filter(b=>b.status===p.id).sort((b,ae)=>(b.position||0)-(ae.position||0))}),r},[i]),te=o.useCallback(({active:r})=>{K(r.id)},[]),U=o.useCallback(({over:r})=>{J(p=>{const b=r?.id??null;return p===b?p:b})},[]),X=o.useCallback(({active:r,over:p})=>{if(K(null),J(null),!p||r.id===p.id)return;const b=i.find(Q=>Q.id===r.id);if(!b)return;const ae=ge.find(Q=>Q.id===p.id);if(ae){b.status!==ae.id&&g(b.id,{status:ae.id});return}const P=i.find(Q=>Q.id===p.id);if(P)if(b.status===P.status){const Q=z[b.status]??[],je=Q.findIndex(he=>he.id===r.id),ye=Q.findIndex(he=>he.id===p.id);je!==ye&&y(Me(Q,je,ye))}else g(b.id,{status:P.status})},[i,z,g,y]),T=ee?i.find(r=>r.id===ee)??null:null;if(!t)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const re=d.filter(r=>r.primaryProjectId===t.id),m=i.filter(r=>r.status==="done").length,me=i.length?Math.round(m/i.length*100):0,Ie=()=>{A(t.id,{name:L.trim()||t.name,description:G.trim(),color:Y}),B(!1),W("Projekt uložen","success")},be=(r="todo",p=k)=>{const b=p.trim();b&&(j({title:b,status:r,projectId:t.id}),S(""),n(""),$(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>I("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:pe(t.id),display:"inline-block"}}),t.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:pe(t.id),padding:"5px 14px",border:`1px solid ${pe(t.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:oe[t.status]?.label||t.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[i.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[me,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{B(!0),O(t.name||""),V(t.description||""),c(t.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>Z(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const r=t.status==="archived",p=r?"active":"archived";A(t.id,{status:p}),W(r?"Projekt byl obnoven":"Projekt byl archivován","success"),I("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(C,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),t.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await N("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await E(t.id),I("projects"))},children:"Smazat"})]})]}),q?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:L,onChange:r=>O(r.target.value.slice(0,80)),placeholder:"Název projektu",maxLength:80,style:{flex:1}}),e.jsx("input",{value:G,onChange:r=>V(r.target.value.slice(0,300)),placeholder:"Popis projektu",maxLength:300,style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ne.map(r=>e.jsx("span",{onClick:()=>c(r),style:{width:22,height:22,borderRadius:"50%",background:r,cursor:"pointer",display:"inline-block",border:Y===r?"2px solid #ffffff":"2px solid transparent",boxShadow:Y===r?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:p=>p.currentTarget.style.transform="scale(1.15)",onMouseLeave:p=>p.currentTarget.style.transform="scale(1)"},r))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:Ie,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>B(!1),children:"Zrušit"})]})]})]}):null,e.jsx("div",{style:{marginBottom:18},children:e.jsx(qe,{defaultProjectId:t.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(C,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${t.name}…`,value:H,onChange:r=>w(r.target.value),onKeyDown:r=>{if(r.key==="Enter"){const p=H.trim();if(p){const b=_({title:p,primaryProjectId:t.id});v(b.id),w("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),h?e.jsxs(Re,{sensors:ce,collisionDetection:Ee,onDragStart:te,onDragOver:U,onDragEnd:X,children:[e.jsx("div",{className:"kanban",children:ge.map(r=>{const p=z[r.id]??[],b=r.id==="done"&&!u?p.slice(0,5):p,ae=se===r.id;return e.jsxs(tt,{colId:r.id,color:r.color,isOver:ae,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:r.label}),e.jsx("span",{className:"kcol-count",children:p.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{$(r.id),n("")},children:e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(Oe,{items:b.map(P=>P.id),strategy:We,children:b.map(P=>e.jsx(at,{t:P,tagsById:x},P.id))}),r.id==="done"&&p.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>M(P=>!P),children:u?"Skrýt dokončené":`+ ${p.length-5} dalších`}):null,p.length>0&&D!==r.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{$(r.id),n("")},children:[e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,D===r.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:s,onChange:P=>n(P.target.value),onKeyDown:P=>{P.key==="Enter"&&be(r.id,s),P.key==="Escape"&&($(null),n(""))},onBlur:()=>be(r.id,s),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,p.length===0&&D!==r.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{$(r.id),n("")},children:"+ Přidat úkol"}):null]},r.id)})}),e.jsx(Be,{children:T?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:T.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[T.priority&&ue[T.priority]&&e.jsx("span",{className:"prio",style:{"--prio-color":ue[T.priority].color},children:ue[T.priority].label}),T.dueDate?e.jsx("span",{className:`due ${fe(T)?"overdue":""}`,children:ze(T)}):null,(T.tagIds||[]).map(r=>x[r]).filter(Boolean).map(r=>e.jsx("span",{className:"tag",style:r.color?{"--tag-color":r.color,borderColor:`${r.color}55`,color:r.color}:void 0,children:r.name},r.id))]})]}):null})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8,marginTop:16},children:[...Array(4)].map((r,p)=>e.jsx(Se,{},p))}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx(Le,{projectId:t.id})]}),F?e.jsx(et,{project:t,tasks:i,notes:re,onClose:()=>Z(!1)}):null]})}function ct(){const{projects:a,tasks:l,addProject:f,openProject:d,updateProject:h,isMobile:R,loaded:I}=le(),j=xe(),[g,y]=o.useState("active"),[A,E]=o.useState(!1),[_,v]=o.useState(!1),[W,N]=o.useState(""),[q,B]=o.useState(""),[L,O]=o.useState("active"),[G,V]=o.useState(null),Y=o.useRef(null),[c,k]=o.useState("none"),[S,H]=o.useState("newest"),[w,D]=o.useState(!1),[$,s]=o.useState(!1),n=o.useRef(null),u=o.useRef(null);o.useEffect(()=>{const t=i=>{n.current&&!n.current.contains(i.target)&&D(!1),u.current&&!u.current.contains(i.target)&&s(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const M={none:"Bez seskupení",status:"Stavu"},F={newest:"Nejnovější",progress:"Progresu",alphabetical:"Abecedy",tasksCount:"Počtu úkolů"},Z=o.useMemo(()=>{let t=[...a];return g!=="all"&&(t=t.filter(i=>i.status===g)),S==="alphabetical"?t.sort((i,x)=>i.name.localeCompare(x.name)):S==="tasksCount"?t.sort((i,x)=>{const z=l.filter(U=>U.projectId===i.id).length;return l.filter(U=>U.projectId===x.id).length-z}):S==="progress"?t.sort((i,x)=>{const z=l.filter(m=>m.projectId===i.id),te=z.filter(m=>m.status==="done").length,U=z.length?te/z.length:0,X=l.filter(m=>m.projectId===x.id),T=X.filter(m=>m.status==="done").length;return(X.length?T/X.length:0)-U}):t.sort((i,x)=>(x.createdAt||0)-(i.createdAt||0)),t},[a,g,S,l]),ee=o.useMemo(()=>{if(c!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return Z.forEach(i=>{t[i.status]&&t[i.status].items.push(i)}),Object.entries(t).filter(([,i])=>i.items.length>0)},[Z,c]),K={all:a.length,active:a.filter(t=>t.status==="active").length,idea:a.filter(t=>t.status==="idea").length,done:a.filter(t=>t.status==="done").length,archived:a.filter(t=>t.status==="archived").length},se=()=>{W.trim()&&(f({name:W.trim(),description:q.trim(),status:L,color:G}),N(""),B(""),O("active"),V(null),E(!1),j("Projekt vytvořen","success"))},J=()=>{E(!0);const t=ne[Math.floor(Math.random()*ne.length)];V(t),setTimeout(()=>Y.current?.focus(),40)},ce=(t,i=0)=>{const x=l.filter(m=>m.projectId===t.id),z=x.filter(m=>m.status==="done").length,te=x.filter(m=>m.status==="doing").length,U=x.filter(m=>m.status==="waiting").length,X=x.filter(m=>m.status==="todo").length,T=x.length?Math.round(z/x.length*100):0,re=x.filter(m=>fe(m)).length;return e.jsxs("div",{className:"pcard list-item-enter",style:{"--proj-color":pe(t.id),"--item-index":Math.min(i,7)},onClick:()=>d(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[oe[t.status]?.label||t.status,re?` · ⚠ ${re}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:m=>{m.stopPropagation();const me=t.status==="archived"?"active":"archived";h(t.id,{status:me}),j(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:m=>{m.currentTarget.style.color="var(--accent)",m.currentTarget.style.background="var(--bg-3)"},onMouseLeave:m=>{m.currentTarget.style.color="var(--text-3)",m.currentTarget.style.background="transparent"},children:e.jsx(C,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[x.length," úkolů · ",z," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[X>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:X})]}):null,te>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:te})]}):null,U>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:U})]}):null,z>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:z})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${T}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[T,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[a.length," projektů · ",K.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>v(!0),children:[e.jsx(C,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:J,children:[e.jsx(C,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${g===t.id?"active":""}`,onClick:()=>y(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:K[t.id]})]},t.id)),!R&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:n,children:[e.jsxs("span",{className:`chip ${c!=="none"?"active":""}`,onClick:()=>D(!w),children:["Seskupit: ",M[c]," ▾"]}),w&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(M).map(([t,i])=>e.jsx("button",{onClick:()=>{k(t),D(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:c===t?"var(--accent-soft)":"transparent",color:c===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:c===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:x=>{c!==t&&(x.currentTarget.style.background="var(--card-h)")},onMouseLeave:x=>{c!==t&&(x.currentTarget.style.background="transparent")},children:i},t))})]}),e.jsxs("span",{style:{position:"relative"},ref:u,children:[e.jsxs("span",{className:`chip ${S!=="newest"?"active":""}`,onClick:()=>s(!$),children:["Řadit: ",F[S]," ▾"]}),$&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(F).map(([t,i])=>e.jsx("button",{onClick:()=>{H(t),s(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:S===t?"var(--accent-soft)":"transparent",color:S===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:S===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:x=>{S!==t&&(x.currentTarget.style.background="var(--card-h)")},onMouseLeave:x=>{S!==t&&(x.currentTarget.style.background="transparent")},children:i},t))})]})]})]}),A?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:Y,value:W,onChange:t=>N(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:q,onChange:t=>B(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:L,onChange:t=>O(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(oe).map(([t,i])=>e.jsx("option",{value:t,children:i.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ne.map(t=>e.jsx("span",{onClick:()=>V(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:G===t?"2px solid #ffffff":"2px solid transparent",boxShadow:G===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:i=>i.currentTarget.style.transform="scale(1.15)",onMouseLeave:i=>i.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:se,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{E(!1),V(null)},children:"Zrušit"})]})]})]}):null,I?c==="status"?e.jsxs("div",{children:[ee.map(([t,i])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:oe[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[i.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",i.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:i.items.map((x,z)=>ce(x,z))})]},t)),A?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:J,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[Z.map((t,i)=>ce(t,i)),A?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:J,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[...Array(4)].map((t,i)=>e.jsx(Se,{},i))}),I&&!Z.length&&!A?e.jsx(Ye,{type:"projects",title:g==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${oe[g]?.label??g}"`,description:g==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:g==="all"?J:void 0,actionLabel:"Nový projekt"}):null,_&&e.jsx(st,{onClose:()=>v(!1)})]})}function st({onClose:a}){const{tags:l,addProject:f,addTask:d,addTag:h,openProject:R}=le(),I=xe(),[j,g]=o.useState("prompt"),[y,A]=o.useState(""),[E,_]=o.useState("Analýza záměru a plánování..."),[v,W]=o.useState(""),[N,q]=o.useState(""),[B,L]=o.useState("#3b82f6"),[O,G]=o.useState([]),[V,Y]=o.useState({}),[c,k]=o.useState("Gemini 2.5 Pro");o.useEffect(()=>{if(j!=="loading")return;const s=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let n=0;_(s[0]);const u=setInterval(()=>{n=(n+1)%s.length,_(s[n])},2500);return()=>clearInterval(u)},[j]);const S=async()=>{if(y.trim()){g("loading");try{const{data:s,error:n}=await ie.functions.invoke("ai-project-planner",{body:{userPrompt:y,availableTags:l.map(M=>M.name)}});if(n||!s?.result)throw new Error(n?.message||s?.error||"Generování selhalo");const u=s.result;W(u.projectName||""),q(u.projectDescription||""),L(u.projectColor||"#3b82f6"),G((u.tasks||[]).map((M,F)=>({...M,id:`gen-task-${F}`,selected:!0}))),k(s.meta?.model||"Gemini 2.5 Pro"),g("preview")}catch(s){console.error(s),I(s.message||"Generování projektu selhalo","error"),g("prompt")}}},H=s=>{G(n=>n.map(u=>u.id===s?{...u,selected:!u.selected}:u))},w=s=>{Y(n=>({...n,[s]:!n[s]}))},D=()=>{try{const s=f({name:v.trim()||"Bez názvu",description:N.trim(),status:"active",color:B});for(const n of O){if(!n.selected)continue;const u=[];if(Array.isArray(n.tags))for(const F of n.tags){const Z=F.trim().toLowerCase();if(!Z)continue;const ee=l.find(K=>K.name.toLowerCase()===Z);if(ee)u.push(ee.id);else{const K=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],se=K[Math.floor(Math.random()*K.length)],J=h({name:Z,color:se});u.push(J.id)}}const M=(n.subtasks||[]).map(F=>({id:Ze(),text:F,done:!1}));d({title:n.title,description:n.description,status:"todo",priority:n.priority,projectId:s.id,tagIds:u,subtasks:M})}I("Projekt a úkoly úspěšně vytvořeny s AI!","success"),R(s.id),a()}catch(s){console.error(s),I("Nepodařilo se uložit projekt","error")}},$=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:a,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:s=>s.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(C,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:a,children:e.jsx(C,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[j==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:y,onChange:s=>A(s.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:$.map((s,n)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>A(s.prompt),children:s.label},n))}),e.jsxs("button",{className:"ai-btn-generate",onClick:S,disabled:!y.trim(),style:{opacity:y.trim()?1:.6,cursor:y.trim()?"pointer":"not-allowed"},children:[e.jsx(C,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),j==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:E}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),j==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:v,onChange:s=>W(s.target.value.slice(0,80)),maxLength:80})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:N,onChange:s=>q(s.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:ne.map(s=>e.jsx("span",{className:`ai-color-dot ${B===s?"active":""}`,style:{background:s},onClick:()=>L(s)},s))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",O.filter(s=>s.selected).length,")"]}),e.jsxs("span",{style:{fontSize:12,color:"var(--text-3)"},children:["Generováno pomocí ",c]})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:O.map(s=>{const n=!!V[s.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:s.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:s.selected,onChange:()=>H(s.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>H(s.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:s.title}),e.jsx("div",{className:"ai-preview-card-desc",children:s.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${s.priority}`,children:s.priority==="high"?"↑ Vysoká":s.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",s.timeEstimate]}),(s.tags||[]).map((u,M)=>e.jsxs("span",{className:"ai-badge tag",children:["#",u]},M))]})]})]}),s.subtasks&&s.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:u=>{u.stopPropagation(),w(s.id)},children:[e.jsx("span",{children:n?"Skrýt podúkoly":`Zobrazit podúkoly (${s.subtasks.length})`}),e.jsx("span",{children:n?"▴":"▾"})]}),n&&e.jsx("div",{className:"ai-preview-subtasks-list",children:s.subtasks.map((u,M)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:u})]},M))})]})]},s.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:j==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>g("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:D,children:[e.jsx(C,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:a,disabled:j==="loading",children:"Zavřít"})})]})]})}export{lt as ProjectDetailPage,ct as default};
