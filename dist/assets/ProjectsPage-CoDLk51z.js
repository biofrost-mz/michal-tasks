import{W as le,Z as ce,a4 as xe,M as n,F as e,I as C,U as Pe,Q as Ae,g as ne,f as ie,$ as De,a2 as Me,a1 as ke,o as Re,J as pe,D as Ee,r as Oe,l as We,a6 as Be,c as Le,e as $e,n as _e,h as Ge,a0 as Ve,a3 as He,b as Ze,H as we,V as Ne,a5 as qe}from"./index-DNRBb9OH.js";import{S as Se,Q as Ye}from"./Skeleton-1MvhQI-B.js";import{E as Fe}from"./EmptyState-DMbUtoaa.js";const Ke=50;async function Ue(a,c=Ke){const{data:f,error:u}=await le.from("project_chats").select("role, content, created_at").eq("project_id",a).order("created_at",{ascending:!0}).limit(c);if(u)throw u;return(f||[]).map(h=>({role:h.role,content:h.content,ts:new Date(h.created_at).getTime()}))}async function Je({projectId:a,workspaceId:c,userId:f,role:u,content:h}){const{error:M}=await le.from("project_chats").insert({project_id:a,workspace_id:c,owner:f,role:u,content:h});if(M)throw M}async function Qe(a){const{error:c}=await le.from("project_chats").delete().eq("project_id",a);if(c)throw c}const Ce=a=>`mt3:chat:${a}`,Xe=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function et(a){try{const c=localStorage.getItem(Ce(a));return c?JSON.parse(c).messages??[]:[]}catch{return[]}}function de(a,c){const f=c.slice(-50);localStorage.setItem(Ce(a),JSON.stringify({messages:f}))}function tt({project:a,tasks:c,notes:f,onClose:u}){const{isMobile:h,activeWorkspaceId:M,userId:z}=ce(),j=xe(),[g,y]=n.useState(()=>et(a.id)),[A,R]=n.useState(()=>localStorage.getItem(`mt3:chat-model:${a.id}`)||"Gemini 3.5 Flash"),B=(l,k)=>{!M||!z||Je({projectId:a.id,workspaceId:M,userId:z,role:l,content:k}).catch(()=>{})},[v,L]=n.useState(""),[w,G]=n.useState(!1),V=n.useRef(null),E=n.useRef(null);n.useEffect(()=>{V.current?.scrollIntoView({behavior:"smooth"})},[g,w]),n.useEffect(()=>{h||E.current?.focus()},[h]),n.useEffect(()=>{let l=!1;return(async()=>{try{const k=await Ue(a.id);!l&&k.length&&(y(k),de(a.id,k))}catch{}})(),()=>{l=!0}},[a.id]);const O=async l=>{const k=(l??v).trim();if(!k||w)return;const S={role:"user",content:k,ts:Date.now()},H=[...g,S];y(H),de(a.id,H),B("user",k),L(""),G(!0);try{const{data:N,error:W}=await le.functions.invoke("gemini-project-chat",{body:{currentMessage:k,messages:g.map(({role:i,content:p})=>({role:i,content:p})),projectContext:{project:{name:a.name,description:a.description,status:a.status},tasks:c.map(i=>({title:i.title,status:i.status,priority:i.priority,dueDate:i.dueDate,subtasks:i.subtasks})),notes:f.map(i=>({title:i.title,content:i.content}))}}});if(W||!N?.reply){const i=N?.error||W?.message||"Neznámá chyba";i.includes("non-2xx")||i.includes("Unauthorized")||W?.status===401?j("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):i.toLowerCase().includes("rate limit")?j("Příliš mnoho zpráv — zkus to za hodinu.","error"):j(`Chat selhal: ${i}`,"error");return}N?.meta?.model&&(R(N.meta.model),localStorage.setItem(`mt3:chat-model:${a.id}`,N.meta.model));const Z={role:"assistant",content:N.reply,ts:Date.now()},s=[...H,Z];y(s),de(a.id,s),B("assistant",N.reply)}catch(N){(N?.message||String(N)).includes("non-2xx")?j("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):j("Chyba chatu — zkus to znovu","error")}finally{G(!1),h||E.current?.focus()}},$=l=>{l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),O())},_=()=>{y([]),de(a.id,[]),Qe(a.id).catch(()=>{})},U=h?{position:"fixed",inset:0,zIndex:300,background:"var(--bg)",display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:"var(--bg-2)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!h&&e.jsx("div",{onClick:u,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:U,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:"1px solid var(--border)",flexShrink:0},children:[h&&e.jsx("button",{onClick:u,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(C,{name:"chevron-left",size:18,color:"var(--text-2)",strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",a.name]}),e.jsxs("div",{style:{fontSize:11,color:"var(--text-3)"},children:[A," · ",c.length," úkolů"]})]}),g.length>0&&e.jsx("button",{onClick:_,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"trash-2",size:14,color:"var(--text-3)",strokeWidth:2})}),!h&&e.jsx("button",{onClick:u,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"x",size:16,color:"var(--text-2)",strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[g.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:Xe.map(l=>e.jsx("button",{onClick:()=>O(l),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text-2)",cursor:"pointer",textAlign:"left",transition:"all .12s"},children:l},l))})]}),g.map((l,k)=>e.jsx("div",{style:{display:"flex",justifyContent:l.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:h?"90%":"85%",padding:"8px 12px",borderRadius:l.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:l.role==="user"?"var(--accent)":"var(--input)",color:l.role==="user"?"#fff":"var(--text)",fontSize:13,lineHeight:1.5,whiteSpace:l.role==="user"?"pre-wrap":"normal",wordBreak:"break-word"},...l.role==="assistant"?{dangerouslySetInnerHTML:{__html:Pe(Ae(l.content))}}:{children:l.content}})},`${l.ts}-${l.role}-${k}`)),w&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:"var(--input)",color:"var(--text-3)",fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:V})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + var(--safe-area-inset-bottom, 0px))",borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:E,value:v,onChange:l=>L(l.target.value),onKeyDown:$,placeholder:h?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:w,style:{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input)",color:"var(--text)",fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:w?.6:1}}),e.jsx("button",{onClick:()=>O(),disabled:!v.trim()||w,style:{width:h?42:36,height:h?42:36,borderRadius:10,border:"none",background:v.trim()&&!w?"var(--accent)":"var(--border)",color:"#fff",cursor:v.trim()&&!w?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:w?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(C,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const ge=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function ze(a){const c=we(a.dueDate);if(!c)return null;const f=Ne(),u=Math.round((c-f)/864e5);return u===0?"Dnes":u===1?"Zítra":u===-1?"Včera":u>1&&u<=7?`za ${u} d`:u<-1&&u>=-7?`před ${-u} d`:`${c.getDate()}.${c.getMonth()+1}.`}function fe(a){const c=we(a.dueDate);return!c||a.status==="done"?!1:c<Ne()}function ve({current:a,target:c,onClick:f,label:u}){return e.jsx("button",{className:a===c?`cur ${c==="waiting"?"wait":c}`:"",onClick:f,children:u})}function at({colId:a,color:c,isOver:f,children:u}){const{setNodeRef:h}=Ve({id:a});return e.jsx("div",{ref:h,className:`kcol${f?" drag-over":""}`,style:{"--col-color":c},children:u})}const ue={high:{color:"var(--prio-high)",label:"↑ Vysoká"},medium:{color:"var(--prio-med)",label:"→ Střední"},low:{color:"var(--prio-low)",label:"↓ Nízká"}};function st({t:a,tagsById:c}){const{setTaskDetail:f,updateTask:u}=ce(),{attributes:h,listeners:M,setNodeRef:z,transform:j,transition:g,isDragging:y}=He({id:a.id}),A={transform:Ze.Transform.toString(j),transition:g,opacity:y?.3:1,cursor:y?"grabbing":"grab",touchAction:"none"},R=a.priority?ue[a.priority]:null,B=(a.tagIds||[]).map(v=>c[v]).filter(Boolean);return e.jsxs("div",{ref:z,style:A,...h,...M,className:"kcard",onClick:()=>f(a.id),children:[e.jsx("div",{className:"kcard-t",children:a.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[R&&e.jsx("span",{className:"prio",style:{"--prio-color":R.color},children:R.label}),a.dueDate?e.jsx("span",{className:`due ${fe(a)?"overdue":""}`,children:ze(a)}):null,B.map(v=>e.jsxs("span",{className:"tag",style:v.color?{"--tag-color":v.color,borderColor:`${v.color}55`,color:v.color}:void 0,children:[v.color&&e.jsx("span",{style:{display:"inline-block",width:5,height:5,borderRadius:"50%",background:v.color,marginRight:3,flexShrink:0}}),v.name]},v.id))]}),Array.isArray(a.subtasks)&&a.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",a.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:v=>v.stopPropagation(),children:[e.jsx(ve,{current:a.status,target:"todo",label:"To do",onClick:()=>u(a.id,{status:"todo"})}),e.jsx(ve,{current:a.status,target:a.status==="waiting"?"waiting":"doing",label:a.status==="waiting"?"Čekám":"Doing",onClick:()=>u(a.id,{status:a.status==="doing"?"waiting":"doing"})}),e.jsx(ve,{current:a.status,target:"done",label:"Hotovo",onClick:()=>u(a.id,{status:"done"})})]})]})}function lt(){const{projects:a,tasks:c,tags:f,notes:u,loaded:h,selProject:M,setPage:z,addTask:j,updateTask:g,reorderTasks:y,updateProject:A,deleteProject:R,addNote:B,openNote:v,canEditContent:L}=ce(),w=xe(),G=De(),[V,E]=n.useState(!1),[O,$]=n.useState(""),[_,U]=n.useState(""),[l,k]=n.useState(null),[S,H]=n.useState(""),[N,W]=n.useState(""),[Z,s]=n.useState(null),[i,p]=n.useState(""),[I,q]=n.useState(!1),[Y,te]=n.useState(!1),[F,se]=n.useState(null),[X,oe]=n.useState(null),t=Me(ke(Ge,{activationConstraint:{distance:5}}),ke(_e,{activationConstraint:{delay:200,tolerance:8}})),o=a.find(r=>r.id===M),d=n.useMemo(()=>o?c.filter(r=>r.projectId===o.id):[],[c,o]),T=n.useMemo(()=>Object.fromEntries((f||[]).map(r=>[r.id,r])),[f]),J=n.useMemo(()=>{const r={};return ge.forEach(x=>{r[x.id]=d.filter(b=>b.status===x.id).sort((b,ae)=>(b.position||0)-(ae.position||0))}),r},[d]),K=n.useCallback(({active:r})=>{se(r.id)},[]),ee=n.useCallback(({over:r})=>{oe(x=>{const b=r?.id??null;return x===b?x:b})},[]),re=n.useCallback(({active:r,over:x})=>{if(se(null),oe(null),!x||r.id===x.id)return;const b=d.find(Q=>Q.id===r.id);if(!b)return;const ae=ge.find(Q=>Q.id===x.id);if(ae){b.status!==ae.id&&g(b.id,{status:ae.id});return}const P=d.find(Q=>Q.id===x.id);if(P)if(b.status===P.status){const Q=J[b.status]??[],je=Q.findIndex(he=>he.id===r.id),ye=Q.findIndex(he=>he.id===x.id);je!==ye&&y(Re(Q,je,ye))}else g(b.id,{status:P.status})},[d,J,g,y]),D=F?d.find(r=>r.id===F)??null:null;if(!o)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const m=u.filter(r=>r.primaryProjectId===o.id),me=d.filter(r=>r.status==="done").length,Ie=d.length?Math.round(me/d.length*100):0,Te=()=>{A(o.id,{name:O.trim()||o.name,description:_.trim(),color:l}),E(!1),w("Projekt uložen","success")},be=(r="todo",x=S)=>{const b=x.trim();b&&(j({title:b,status:r,projectId:o.id}),H(""),p(""),s(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>z("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:pe(o.id),display:"inline-block"}}),o.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:pe(o.id),padding:"5px 14px",border:`1px solid ${pe(o.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:ne[o.status]?.label||o.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[d.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[Ie,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{E(!0),$(o.name||""),U(o.description||""),k(o.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>te(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const r=o.status==="archived",x=r?"active":"archived";A(o.id,{status:x}),w(r?"Projekt byl obnoven":"Projekt byl archivován","success"),z("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(C,{name:o.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),o.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await G("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await R(o.id),z("projects"))},children:"Smazat"})]})]}),V?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:O,onChange:r=>$(r.target.value.slice(0,80)),placeholder:"Název projektu",maxLength:80,style:{flex:1}}),e.jsx("input",{value:_,onChange:r=>U(r.target.value.slice(0,300)),placeholder:"Popis projektu",maxLength:300,style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ie.map(r=>e.jsx("span",{onClick:()=>k(r),style:{width:22,height:22,borderRadius:"50%",background:r,cursor:"pointer",display:"inline-block",border:l===r?"2px solid #ffffff":"2px solid transparent",boxShadow:l===r?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:x=>x.currentTarget.style.transform="scale(1.15)",onMouseLeave:x=>x.currentTarget.style.transform="scale(1)"},r))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:Te,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>E(!1),children:"Zrušit"})]})]})]}):null,L&&e.jsx("div",{style:{marginBottom:18},children:e.jsx(Ye,{defaultProjectId:o.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(C,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${o.name}…`,value:N,onChange:r=>W(r.target.value),onKeyDown:r=>{if(r.key==="Enter"){const x=N.trim();if(x){const b=B({title:x,primaryProjectId:o.id});v(b.id),W("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),h?e.jsxs(Ee,{sensors:t,collisionDetection:Oe,onDragStart:K,onDragOver:ee,onDragEnd:re,children:[e.jsx("div",{className:"kanban",children:ge.map(r=>{const x=J[r.id]??[],b=r.id==="done"&&!I?x.slice(0,5):x,ae=X===r.id;return e.jsxs(at,{colId:r.id,color:r.color,isOver:ae,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:r.label}),e.jsx("span",{className:"kcol-count",children:x.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{s(r.id),p("")},children:e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(We,{items:b.map(P=>P.id),strategy:Be,children:b.map(P=>e.jsx(st,{t:P,tagsById:T},P.id))}),r.id==="done"&&x.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>q(P=>!P),children:I?"Skrýt dokončené":`+ ${x.length-5} dalších`}):null,x.length>0&&Z!==r.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{s(r.id),p("")},children:[e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,Z===r.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:i,onChange:P=>p(P.target.value),onKeyDown:P=>{P.key==="Enter"&&be(r.id,i),P.key==="Escape"&&(s(null),p(""))},onBlur:()=>be(r.id,i),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,x.length===0&&Z!==r.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{s(r.id),p("")},children:"+ Přidat úkol"}):null]},r.id)})}),e.jsx(Le,{children:D?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:D.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[D.priority&&ue[D.priority]&&e.jsx("span",{className:"prio",style:{"--prio-color":ue[D.priority].color},children:ue[D.priority].label}),D.dueDate?e.jsx("span",{className:`due ${fe(D)?"overdue":""}`,children:ze(D)}):null,(D.tagIds||[]).map(r=>T[r]).filter(Boolean).map(r=>e.jsx("span",{className:"tag",style:r.color?{"--tag-color":r.color,borderColor:`${r.color}55`,color:r.color}:void 0,children:r.name},r.id))]})]}):null})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8,marginTop:16},children:[...Array(4)].map((r,x)=>e.jsx(Se,{},x))}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx($e,{projectId:o.id})]}),Y?e.jsx(tt,{project:o,tasks:d,notes:m,onClose:()=>te(!1)}):null]})}function ct(){const{projects:a,tasks:c,addProject:f,openProject:u,updateProject:h,isMobile:M,loaded:z}=ce(),j=xe(),[g,y]=n.useState("active"),[A,R]=n.useState(!1),[B,v]=n.useState(!1),[L,w]=n.useState(""),[G,V]=n.useState(""),[E,O]=n.useState("active"),[$,_]=n.useState(null),U=n.useRef(null),[l,k]=n.useState("none"),[S,H]=n.useState("newest"),[N,W]=n.useState(!1),[Z,s]=n.useState(!1),i=n.useRef(null),p=n.useRef(null);n.useEffect(()=>{const t=o=>{i.current&&!i.current.contains(o.target)&&W(!1),p.current&&!p.current.contains(o.target)&&s(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const I={none:"Bez seskupení",status:"Stavu"},q={newest:"Nejnovější",progress:"Progresu",alphabetical:"Abecedy",tasksCount:"Počtu úkolů"},Y=n.useMemo(()=>{let t=[...a];return g!=="all"&&(t=t.filter(o=>o.status===g)),S==="alphabetical"?t.sort((o,d)=>o.name.localeCompare(d.name)):S==="tasksCount"?t.sort((o,d)=>{const T=c.filter(K=>K.projectId===o.id).length;return c.filter(K=>K.projectId===d.id).length-T}):S==="progress"?t.sort((o,d)=>{const T=c.filter(m=>m.projectId===o.id),J=T.filter(m=>m.status==="done").length,K=T.length?J/T.length:0,ee=c.filter(m=>m.projectId===d.id),re=ee.filter(m=>m.status==="done").length;return(ee.length?re/ee.length:0)-K}):t.sort((o,d)=>(d.createdAt||0)-(o.createdAt||0)),t},[a,g,S,c]),te=n.useMemo(()=>{if(l!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return Y.forEach(o=>{t[o.status]&&t[o.status].items.push(o)}),Object.entries(t).filter(([,o])=>o.items.length>0)},[Y,l]),F={all:a.length,active:a.filter(t=>t.status==="active").length,idea:a.filter(t=>t.status==="idea").length,done:a.filter(t=>t.status==="done").length,archived:a.filter(t=>t.status==="archived").length},se=()=>{L.trim()&&(f({name:L.trim(),description:G.trim(),status:E,color:$}),w(""),V(""),O("active"),_(null),R(!1),j("Projekt vytvořen","success"))},X=()=>{R(!0);const t=ie[Math.floor(Math.random()*ie.length)];_(t),setTimeout(()=>U.current?.focus(),40)},oe=(t,o=0)=>{const d=c.filter(m=>m.projectId===t.id),T=d.filter(m=>m.status==="done").length,J=d.filter(m=>m.status==="doing").length,K=d.filter(m=>m.status==="waiting").length,ee=d.filter(m=>m.status==="todo").length,re=d.length?Math.round(T/d.length*100):0,D=d.filter(m=>fe(m)).length;return e.jsxs("div",{className:"pcard list-item-enter",style:{"--proj-color":pe(t.id),"--item-index":Math.min(o,7)},onClick:()=>u(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[ne[t.status]?.label||t.status,D?` · ⚠ ${D}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:m=>{m.stopPropagation();const me=t.status==="archived"?"active":"archived";h(t.id,{status:me}),j(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:m=>{m.currentTarget.style.color="var(--accent)",m.currentTarget.style.background="var(--bg-3)"},onMouseLeave:m=>{m.currentTarget.style.color="var(--text-3)",m.currentTarget.style.background="transparent"},children:e.jsx(C,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[d.length," úkolů · ",T," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[ee>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:ee})]}):null,J>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:J})]}):null,K>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:K})]}):null,T>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:T})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${re}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[re,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[a.length," projektů · ",F.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>v(!0),children:[e.jsx(C,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:X,children:[e.jsx(C,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${g===t.id?"active":""}`,onClick:()=>y(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:F[t.id]})]},t.id)),!M&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:i,children:[e.jsxs("span",{className:`chip ${l!=="none"?"active":""}`,onClick:()=>W(!N),children:["Seskupit: ",I[l]," ▾"]}),N&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(I).map(([t,o])=>e.jsx("button",{onClick:()=>{k(t),W(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:l===t?"var(--accent-soft)":"transparent",color:l===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:l===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:d=>{l!==t&&(d.currentTarget.style.background="var(--card-h)")},onMouseLeave:d=>{l!==t&&(d.currentTarget.style.background="transparent")},children:o},t))})]}),e.jsxs("span",{style:{position:"relative"},ref:p,children:[e.jsxs("span",{className:`chip ${S!=="newest"?"active":""}`,onClick:()=>s(!Z),children:["Řadit: ",q[S]," ▾"]}),Z&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(q).map(([t,o])=>e.jsx("button",{onClick:()=>{H(t),s(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:S===t?"var(--accent-soft)":"transparent",color:S===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:S===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:d=>{S!==t&&(d.currentTarget.style.background="var(--card-h)")},onMouseLeave:d=>{S!==t&&(d.currentTarget.style.background="transparent")},children:o},t))})]})]})]}),A?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:U,value:L,onChange:t=>w(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:G,onChange:t=>V(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:E,onChange:t=>O(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(ne).map(([t,o])=>e.jsx("option",{value:t,children:o.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:ie.map(t=>e.jsx("span",{onClick:()=>_(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:$===t?"2px solid #ffffff":"2px solid transparent",boxShadow:$===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:o=>o.currentTarget.style.transform="scale(1.15)",onMouseLeave:o=>o.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:se,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{R(!1),_(null)},children:"Zrušit"})]})]})]}):null,z?l==="status"?e.jsxs("div",{children:[te.map(([t,o])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:ne[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[o.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",o.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:o.items.map((d,T)=>oe(d,T))})]},t)),A?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:X,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[Y.map((t,o)=>oe(t,o)),A?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:X,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[...Array(4)].map((t,o)=>e.jsx(Se,{},o))}),z&&!Y.length&&!A?e.jsx(Fe,{type:"projects",title:g==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${ne[g]?.label??g}"`,description:g==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:g==="all"?X:void 0,actionLabel:"Nový projekt"}):null,B&&e.jsx(rt,{onClose:()=>v(!1)})]})}function rt({onClose:a}){const{tags:c,addProject:f,addTask:u,addTag:h,openProject:M}=ce(),z=xe(),[j,g]=n.useState("prompt"),[y,A]=n.useState(""),[R,B]=n.useState("Analýza záměru a plánování..."),[v,L]=n.useState(""),[w,G]=n.useState(""),[V,E]=n.useState("#3b82f6"),[O,$]=n.useState([]),[_,U]=n.useState({}),[l,k]=n.useState("Gemini 2.5 Pro");n.useEffect(()=>{if(j!=="loading")return;const s=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let i=0;B(s[0]);const p=setInterval(()=>{i=(i+1)%s.length,B(s[i])},2500);return()=>clearInterval(p)},[j]);const S=async()=>{if(y.trim()){g("loading");try{const{data:s,error:i}=await le.functions.invoke("ai-project-planner",{body:{userPrompt:y,availableTags:c.map(I=>I.name)}});if(i||!s?.result)throw new Error(i?.message||s?.error||"Generování selhalo");const p=s.result;L(p.projectName||""),G(p.projectDescription||""),E(p.projectColor||"#3b82f6"),$((p.tasks||[]).map((I,q)=>({...I,id:`gen-task-${q}`,selected:!0}))),k(s.meta?.model||"Gemini 2.5 Pro"),g("preview")}catch(s){console.error(s),z(s.message||"Generování projektu selhalo","error"),g("prompt")}}},H=s=>{$(i=>i.map(p=>p.id===s?{...p,selected:!p.selected}:p))},N=s=>{U(i=>({...i,[s]:!i[s]}))},W=()=>{try{const s=f({name:v.trim()||"Bez názvu",description:w.trim(),status:"active",color:V});for(const i of O){if(!i.selected)continue;const p=[];if(Array.isArray(i.tags))for(const q of i.tags){const Y=q.trim().toLowerCase();if(!Y)continue;const te=c.find(F=>F.name.toLowerCase()===Y);if(te)p.push(te.id);else{const F=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],se=F[Math.floor(Math.random()*F.length)],X=h({name:Y,color:se});p.push(X.id)}}const I=(i.subtasks||[]).map(q=>({id:qe(),text:q,done:!1}));u({title:i.title,description:i.description,status:"todo",priority:i.priority,projectId:s.id,tagIds:p,subtasks:I})}z("Projekt a úkoly úspěšně vytvořeny s AI!","success"),M(s.id),a()}catch(s){console.error(s),z("Nepodařilo se uložit projekt","error")}},Z=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:a,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:s=>s.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(C,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:a,children:e.jsx(C,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[j==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:y,onChange:s=>A(s.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:Z.map((s,i)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>A(s.prompt),children:s.label},i))}),e.jsxs("button",{className:"ai-btn-generate",onClick:S,disabled:!y.trim(),style:{opacity:y.trim()?1:.6,cursor:y.trim()?"pointer":"not-allowed"},children:[e.jsx(C,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),j==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:R}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),j==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:v,onChange:s=>L(s.target.value.slice(0,80)),maxLength:80})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:w,onChange:s=>G(s.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:ie.map(s=>e.jsx("span",{className:`ai-color-dot ${V===s?"active":""}`,style:{background:s},onClick:()=>E(s)},s))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",O.filter(s=>s.selected).length,")"]}),e.jsxs("span",{style:{fontSize:12,color:"var(--text-3)"},children:["Generováno pomocí ",l]})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:O.map(s=>{const i=!!_[s.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:s.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:s.selected,onChange:()=>H(s.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>H(s.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:s.title}),e.jsx("div",{className:"ai-preview-card-desc",children:s.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${s.priority}`,children:s.priority==="high"?"↑ Vysoká":s.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",s.timeEstimate]}),(s.tags||[]).map((p,I)=>e.jsxs("span",{className:"ai-badge tag",children:["#",p]},I))]})]})]}),s.subtasks&&s.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:p=>{p.stopPropagation(),N(s.id)},children:[e.jsx("span",{children:i?"Skrýt podúkoly":`Zobrazit podúkoly (${s.subtasks.length})`}),e.jsx("span",{children:i?"▴":"▾"})]}),i&&e.jsx("div",{className:"ai-preview-subtasks-list",children:s.subtasks.map((p,I)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:p})]},I))})]})]},s.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:j==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>g("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:W,children:[e.jsx(C,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:a,disabled:j==="loading",children:"Zavřít"})})]})]})}export{lt as ProjectDetailPage,ct as default};
