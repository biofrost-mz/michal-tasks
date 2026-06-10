import{d as n,j as e}from"./vendor-notes-editor-C-RICP77.js";import{G as ne,J as ie,R as de,I as C,f as re,e as oe,K as Ne,O as Ce,M as fe,m as Se,w as ce,D as ze,o as Ie,j as Te,V as Pe,b as De,d as Ae,l as Ee,g as Re,L as Me,Q as Oe,a as We,v as be,F as Be,U as $e}from"./index-C5gI0nE_.js";import{Q as Le}from"./QuickAdd-C-fwBEQS.js";import{E as Ve}from"./EmptyState-AeaBrqqK.js";const _e=50;async function Ge(s,c=_e){const{data:f,error:j}=await ne.from("project_chats").select("role, content, created_at").eq("project_id",s).order("created_at",{ascending:!0}).limit(c);if(j)throw j;return(f||[]).map(l=>({role:l.role,content:l.content,ts:new Date(l.created_at).getTime()}))}async function He({projectId:s,workspaceId:c,userId:f,role:j,content:l}){const{error:m}=await ne.from("project_chats").insert({project_id:s,workspace_id:c,owner:f,role:j,content:l});if(m)throw m}async function qe(s){const{error:c}=await ne.from("project_chats").delete().eq("project_id",s);if(c)throw c}const je=s=>`mt3:chat:${s}`,Ze=["Co v tomto projektu hoří?","Co jsem tento týden nestihl?","Navrhni priority na zítřek"];function Ye(s){try{const c=localStorage.getItem(je(s));return c?JSON.parse(c).messages??[]:[]}catch{return[]}}function le(s,c){const f=c.slice(-50);localStorage.setItem(je(s),JSON.stringify({messages:f}))}function Fe({project:s,tasks:c,notes:f,onClose:j}){const{t:l,isMobile:m,activeWorkspaceId:S,userId:h}=ie(),y=de(),[g,T]=n.useState(()=>Ye(s.id)),U=(d,k)=>{!S||!h||He({projectId:s.id,workspaceId:S,userId:h,role:d,content:k}).catch(()=>{})},[D,A]=n.useState(""),[w,_]=n.useState(!1),E=n.useRef(null),R=n.useRef(null);n.useEffect(()=>{E.current?.scrollIntoView({behavior:"smooth"})},[g,w]),n.useEffect(()=>{m||R.current?.focus()},[m]),n.useEffect(()=>{let d=!1;return(async()=>{try{const k=await Ge(s.id);!d&&k.length&&(T(k),le(s.id,k))}catch{}})(),()=>{d=!0}},[s.id]);const M=async d=>{const k=(d??D).trim();if(!k||w)return;const $={role:"user",content:k,ts:Date.now()},F=[...g,$];T(F),le(s.id,F),U("user",k),A(""),_(!0);try{const{data:z,error:P}=await ne.functions.invoke("gemini-project-chat",{body:{currentMessage:k,messages:g.map(({role:i,content:N})=>({role:i,content:N})),projectContext:{project:{name:s.name,description:s.description,status:s.status},tasks:c.map(i=>({title:i.title,status:i.status,priority:i.priority,dueDate:i.dueDate,subtasks:i.subtasks})),notes:f.map(i=>({title:i.title,content:i.content}))}}});if(P||!z?.reply){const i=z?.error||P?.message||"Neznámá chyba";i.includes("non-2xx")||i.includes("Unauthorized")||P?.status===401?y("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):i.toLowerCase().includes("rate limit")?y("Příliš mnoho zpráv — zkus to za hodinu.","error"):y(`Chat selhal: ${i}`,"error");return}const a={role:"assistant",content:z.reply,ts:Date.now()},p=[...F,a];T(p),le(s.id,p),U("assistant",z.reply)}catch(z){(z?.message||String(z)).includes("non-2xx")?y("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.","error"):y("Chyba chatu — zkus to znovu","error")}finally{_(!1),m||R.current?.focus()}},O=d=>{d.key==="Enter"&&!d.shiftKey&&(d.preventDefault(),M())},W=()=>{T([]),le(s.id,[]),qe(s.id).catch(()=>{})},G=m?{position:"fixed",inset:0,zIndex:300,background:l.bg,display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}:{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:200,background:l.bg2,borderLeft:`1px solid ${l.border}`,display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",animation:"slideRight .2s ease"};return e.jsxs(e.Fragment,{children:[!m&&e.jsx("div",{onClick:j,style:{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,.15)"}}),e.jsxs("div",{style:G,children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:`1px solid ${l.border}`,flexShrink:0},children:[m&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,marginRight:2,display:"flex"},children:e.jsx(C,{name:"chevron-left",size:18,color:l.text2,strokeWidth:2})}),e.jsx("span",{style:{fontSize:14},children:"💬"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:700,color:l.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Chat — ",s.name]}),e.jsxs("div",{style:{fontSize:11,color:l.text3},children:["Gemini 2.0 Flash · ",c.length," úkolů"]})]}),g.length>0&&e.jsx("button",{onClick:W,title:"Smazat historii",style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"trash-2",size:14,color:l.text3,strokeWidth:2})}),!m&&e.jsx("button",{onClick:j,style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"},children:e.jsx(C,{name:"x",size:16,color:l.text2,strokeWidth:2})})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10},children:[g.length===0&&e.jsxs("div",{className:"fi",style:{alignItems:"center",paddingTop:20},children:[e.jsx("div",{style:{fontSize:28,marginBottom:8,textAlign:"center"},children:"💬"}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:l.text,marginBottom:4,textAlign:"center"},children:"Chat s projektem"}),e.jsx("div",{style:{fontSize:12,color:l.text3,marginBottom:20,textAlign:"center"},children:"Ptej se na cokoli ohledně tohoto projektu"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,width:"100%"},children:Ze.map(d=>e.jsx("button",{onClick:()=>M(d),style:{padding:"8px 12px",borderRadius:8,fontSize:12.5,border:`1px solid ${l.border}`,background:l.input,color:l.text2,cursor:"pointer",textAlign:"left",transition:"all .12s"},children:d},d))})]}),g.map((d,k)=>e.jsx("div",{style:{display:"flex",justifyContent:d.role==="user"?"flex-end":"flex-start"},children:e.jsx("div",{style:{maxWidth:m?"90%":"85%",padding:"8px 12px",borderRadius:d.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:d.role==="user"?l.accent:l.input,color:d.role==="user"?"#fff":l.text,fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"},children:d.content})},`${d.ts}-${d.role}-${k}`)),w&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{padding:"8px 14px",borderRadius:"12px 12px 12px 4px",background:l.input,color:l.text3,fontSize:18,letterSpacing:3},children:e.jsx("span",{style:{animation:"pulse 1.2s ease infinite"},children:"···"})})}),e.jsx("div",{ref:E})]}),e.jsxs("div",{style:{padding:"10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",borderTop:`1px solid ${l.border}`,display:"flex",gap:8,flexShrink:0,alignItems:"flex-end"},children:[e.jsx("textarea",{ref:R,value:D,onChange:d=>A(d.target.value),onKeyDown:O,placeholder:m?"Zpráva…":"Napiš zprávu… (Enter = odeslat)",rows:1,disabled:w,style:{flex:1,padding:"8px 12px",borderRadius:8,border:`1px solid ${l.border}`,background:l.input,color:l.text,fontSize:13,outline:"none",resize:"none",maxHeight:100,overflowY:"auto",lineHeight:1.5,opacity:w?.6:1}}),e.jsx("button",{onClick:()=>M(),disabled:!D.trim()||w,style:{width:m?42:36,height:m?42:36,borderRadius:10,border:"none",background:D.trim()&&!w?l.accent:l.border,color:"#fff",cursor:D.trim()&&!w?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"},children:w?e.jsx("span",{style:{animation:"spin .7s linear infinite",fontSize:14},children:"◌"}):e.jsx(C,{name:"send",size:14,color:"#fff",strokeWidth:2.5})})]})]})]})}const ue=[{id:"todo",label:"To do",color:"var(--gray)",className:"todo"},{id:"doing",label:"Rozpracováno",color:"var(--blue)",className:"doing"},{id:"waiting",label:"Čekám",color:"var(--orange)",className:"wait"},{id:"done",label:"Hotovo",color:"var(--green)",className:"done"}];function ye(s){const c=be(s.dueDate);return c?`${c.getDate()}.${c.getMonth()+1}.`:null}function he(s){const c=be(s.dueDate);return!c||s.status==="done"?!1:c<Be()}function xe({current:s,target:c,onClick:f,label:j}){return e.jsx("button",{className:s===c?`cur ${c==="waiting"?"wait":c}`:"",onClick:f,children:j})}function Ke({colId:s,color:c,isOver:f,children:j}){const{setNodeRef:l}=Me({id:s});return e.jsx("div",{ref:l,className:`kcol${f?" drag-over":""}`,style:{"--col-color":c},children:j})}function Ue({t:s}){const{setTaskDetail:c,updateTask:f}=ie(),{attributes:j,listeners:l,setNodeRef:m,transform:S,transition:h,isDragging:y}=Oe({id:s.id}),g={transform:We.Transform.toString(S),transition:h,opacity:y?.3:1,cursor:y?"grabbing":"grab",touchAction:"none"};return e.jsxs("div",{ref:m,style:g,...j,...l,className:"kcard",onClick:()=>c(s.id),children:[e.jsx("div",{className:"kcard-t",children:s.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[s.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"#f87171"},children:"↑ Vysoká"}):null,s.dueDate?e.jsx("span",{className:`due ${he(s)?"overdue":""}`,children:ye(s)}):null]}),Array.isArray(s.subtasks)&&s.subtasks.length>0?e.jsxs("div",{className:"kcard-sub",children:["≡ ",s.subtasks.length," podúkoly"]}):null,e.jsxs("div",{className:"kcard-quick",onClick:T=>T.stopPropagation(),children:[e.jsx(xe,{current:s.status,target:"todo",label:"To do",onClick:()=>f(s.id,{status:"todo"})}),e.jsx(xe,{current:s.status,target:s.status==="waiting"?"waiting":"doing",label:s.status==="waiting"?"Čekám":"Doing",onClick:()=>f(s.id,{status:s.status==="doing"?"waiting":"doing"})}),e.jsx(xe,{current:s.status,target:"done",label:"Hotovo",onClick:()=>f(s.id,{status:"done"})})]})]})}function st(){const{projects:s,tasks:c,notes:f,selProject:j,setPage:l,addTask:m,updateTask:S,reorderTasks:h,updateProject:y,deleteProject:g,setTaskDetail:T,addNote:U,openNote:D}=ie(),A=de(),w=Ne(),[_,E]=n.useState(!1),[R,M]=n.useState(""),[O,W]=n.useState(""),[G,d]=n.useState(null),[k,$]=n.useState(""),[F,z]=n.useState(""),[P,a]=n.useState(null),[p,i]=n.useState(""),[N,H]=n.useState(!1),[q,X]=n.useState(!1),[Z,se]=n.useState(null),[J,ae]=n.useState(null),t=Ce(fe(Re,{activationConstraint:{distance:5}}),fe(Ee,{activationConstraint:{delay:200,tolerance:8}})),r=s.find(o=>o.id===j),u=n.useMemo(()=>r?c.filter(o=>o.projectId===r.id):[],[c,r]),B=n.useMemo(()=>{const o={};return ue.forEach(x=>{o[x.id]=u.filter(b=>b.status===x.id).sort((b,te)=>(b.position||0)-(te.position||0))}),o},[u]),ee=n.useCallback(({active:o})=>{se(o.id)},[]),Y=n.useCallback(({over:o})=>{ae(x=>{const b=o?.id??null;return x===b?x:b})},[]),Q=n.useCallback(({active:o,over:x})=>{if(se(null),ae(null),!x||o.id===x.id)return;const b=u.find(K=>K.id===o.id);if(!b)return;const te=ue.find(K=>K.id===x.id);if(te){b.status!==te.id&&S(b.id,{status:te.id});return}const I=u.find(K=>K.id===x.id);if(I)if(b.status===I.status){const K=B[b.status]??[],ge=K.findIndex(pe=>pe.id===o.id),ve=K.findIndex(pe=>pe.id===x.id);ge!==ve&&h(Se(K,ge,ve))}else S(b.id,{status:I.status})},[u,B,S,h]),L=Z?u.find(o=>o.id===Z)??null:null;if(!r)return e.jsx("div",{className:"content",children:e.jsx("div",{className:"ph-title",children:"Projekt nenalezen"})});const v=f.filter(o=>o.primaryProjectId===r.id),V=u.filter(o=>o.status==="done").length,ke=u.length?Math.round(V/u.length*100):0,we=()=>{y(r.id,{name:R.trim()||r.name,description:O.trim(),color:G}),E(!1),A("Projekt uložen","success")},me=(o="todo",x=k)=>{const b=x.trim();b&&(m({title:b,status:o,projectId:r.id}),$(""),i(""),a(null))};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ph-eyebrow",style:{cursor:"pointer"},onClick:()=>l("projects"),children:"← Projekty"}),e.jsxs("h1",{className:"ph-title",style:{display:"flex",alignItems:"center",gap:20},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:4,background:ce(r.id),display:"inline-block"}}),r.name,e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:ce(r.id),padding:"5px 14px",border:`1px solid ${ce(r.id)}`,borderRadius:"var(--r-pill)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500},children:re[r.status]?.label||r.status})]}),e.jsxs("div",{className:"ph-sub",children:[e.jsxs("span",{children:[u.length," úkolů"]}),e.jsx("span",{className:"dot"}),e.jsxs("span",{children:[ke,"% hotových"]}),e.jsx("span",{className:"dot"}),e.jsx("span",{children:"poslední úprava: dnes"})]})]}),e.jsxs("div",{className:"row",children:[e.jsx("button",{className:"btn",onClick:()=>{E(!0),M(r.name||""),W(r.description||""),d(r.color||null)},children:"Upravit"}),e.jsx("button",{className:"btn",onClick:()=>X(!0),style:{borderColor:"var(--accent)",color:"var(--accent)"},children:"💬 Chat"}),e.jsxs("button",{className:"btn",onClick:()=>{const o=r.status==="archived",x=o?"active":"archived";y(r.id,{status:x}),A(o?"Projekt byl obnoven":"Projekt byl archivován","success"),l("projects")},style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx(C,{name:r.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8}),r.status==="archived"?"Obnovit":"Archivovat"]}),e.jsx("button",{className:"btn danger",onClick:async()=>{await w("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")&&(await g(r.id),l("projects"))},children:"Smazat"})]})]}),_?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:12,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"✎"}),e.jsx("input",{value:R,onChange:o=>M(o.target.value),placeholder:"Název projektu",style:{flex:1}}),e.jsx("input",{value:O,onChange:o=>W(o.target.value),placeholder:"Popis projektu",style:{flex:2}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:oe.map(o=>e.jsx("span",{onClick:()=>d(o),style:{width:22,height:22,borderRadius:"50%",background:o,cursor:"pointer",display:"inline-block",border:G===o?"2px solid #ffffff":"2px solid transparent",boxShadow:G===o?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:x=>x.currentTarget.style.transform="scale(1.15)",onMouseLeave:x=>x.currentTarget.style.transform="scale(1)"},o))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:we,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>E(!1),children:"Zrušit"})]})]})]}):null,e.jsx("div",{style:{marginBottom:18},children:e.jsx(Le,{defaultProjectId:r.id})}),e.jsxs("div",{className:"quickadd",style:{borderColor:"var(--border-soft)",background:"var(--bg-2)"},children:[e.jsx("span",{className:"quickadd-plus",style:{background:"var(--accent-soft)",color:"var(--accent)"},children:e.jsx(C,{name:"file-text",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("input",{placeholder:`Nová poznámka k projektu ${r.name}…`,value:F,onChange:o=>z(o.target.value),onKeyDown:o=>{if(o.key==="Enter"){const x=F.trim();if(x){const b=U({title:x,primaryProjectId:r.id});D(b.id),z("")}}}}),e.jsx("span",{className:"quickadd-kbd",children:"Enter"})]}),e.jsxs(ze,{sensors:t,collisionDetection:Ie,onDragStart:ee,onDragOver:Y,onDragEnd:Q,children:[e.jsx("div",{className:"kanban",children:ue.map(o=>{const x=B[o.id]??[],b=o.id==="done"&&!N?x.slice(0,5):x,te=J===o.id;return e.jsxs(Ke,{colId:o.id,color:o.color,isOver:te,children:[e.jsxs("div",{className:"kcol-head",children:[e.jsx("span",{className:"kcol-name",children:o.label}),e.jsx("span",{className:"kcol-count",children:x.length}),e.jsx("span",{className:"kcol-add",onClick:()=>{a(o.id),i("")},children:e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2})})]}),e.jsx(Te,{items:b.map(I=>I.id),strategy:Pe,children:b.map(I=>e.jsx(Ue,{t:I},I.id))}),o.id==="done"&&x.length>5?e.jsx("button",{className:"btn",style:{width:"100%",marginTop:6},onClick:()=>H(I=>!I),children:N?"Skrýt dokončené":`+ ${x.length-5} dalších`}):null,x.length>0&&P!==o.id?e.jsxs("button",{className:"btn",style:{width:"100%",marginTop:8,borderStyle:"dashed",borderColor:"var(--border-soft)",background:"transparent",color:"var(--text-3)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:6},onClick:()=>{a(o.id),i("")},children:[e.jsx(C,{name:"plus",size:12,color:"currentColor",strokeWidth:2}),"Přidat úkol"]}):null,P===o.id?e.jsx("div",{style:{marginTop:6},children:e.jsx("input",{autoFocus:!0,value:p,onChange:I=>i(I.target.value),onKeyDown:I=>{I.key==="Enter"&&me(o.id,p),I.key==="Escape"&&(a(null),i(""))},onBlur:()=>me(o.id,p),placeholder:"Název úkolu… (Enter)",className:"detail-input",style:{width:"100%"}})}):null,x.length===0&&P!==o.id?e.jsx("div",{className:"kcard",style:{borderStyle:"dashed",textAlign:"center",color:"var(--text-3)",padding:"18px"},onClick:()=>{a(o.id),i("")},children:"+ Přidat úkol"}):null]},o.id)})}),e.jsx(De,{children:L?e.jsxs("div",{className:"kcard",style:{opacity:.92,cursor:"grabbing",boxShadow:"0 20px 48px rgba(0, 0, 0, 0.45)",pointerEvents:"none",transform:"rotate(3deg) scale(1.05)",transformOrigin:"center center",transition:"transform 0.15s ease"},children:[e.jsx("div",{className:"kcard-t",children:L.title||"Bez názvu"}),e.jsxs("div",{className:"kcard-m",children:[L.priority==="high"?e.jsx("span",{className:"prio",style:{"--prio-color":"#f87171"},children:"↑ Vysoká"}):null,L.dueDate?e.jsx("span",{className:`due ${he(L)?"overdue":""}`,children:ye(L)}):null]})]}):null})]}),e.jsxs("div",{style:{marginTop:32,borderTop:"1px solid var(--border)",paddingTop:24},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:e.jsx("span",{style:{fontSize:15,fontWeight:700},children:"Poznámky projektu"})}),e.jsx(Ae,{projectId:r.id})]}),q?e.jsx(Fe,{project:r,tasks:u,notes:v,onClose:()=>X(!1)}):null]})}function at(){const{projects:s,tasks:c,addProject:f,openProject:j,updateProject:l,isMobile:m}=ie(),S=de(),[h,y]=n.useState("active"),[g,T]=n.useState(!1),[U,D]=n.useState(!1),[A,w]=n.useState(""),[_,E]=n.useState(""),[R,M]=n.useState("active"),[O,W]=n.useState(null),G=n.useRef(null),[d,k]=n.useState("none"),[$,F]=n.useState("newest"),[z,P]=n.useState(!1),[a,p]=n.useState(!1),i=n.useRef(null),N=n.useRef(null);n.useEffect(()=>{const t=r=>{i.current&&!i.current.contains(r.target)&&P(!1),N.current&&!N.current.contains(r.target)&&p(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const H={none:"Bez seskupení",status:"Stavu"},q=n.useMemo(()=>{let t=[...s];return h!=="all"&&(t=t.filter(r=>r.status===h)),$==="alphabetical"?t.sort((r,u)=>r.name.localeCompare(u.name)):$==="tasksCount"?t.sort((r,u)=>{const B=c.filter(Y=>Y.projectId===r.id).length;return c.filter(Y=>Y.projectId===u.id).length-B}):$==="progress"?t.sort((r,u)=>{const B=c.filter(V=>V.projectId===r.id),ee=B.filter(V=>V.status==="done").length,Y=B.length?ee/B.length:0,Q=c.filter(V=>V.projectId===u.id),L=Q.filter(V=>V.status==="done").length;return(Q.length?L/Q.length:0)-Y}):t.sort((r,u)=>(u.createdAt||0)-(r.createdAt||0)),t},[s,h,$,c]),X=n.useMemo(()=>{if(d!=="status")return null;const t={active:{label:"Aktivní",items:[]},idea:{label:"Nápady",items:[]},done:{label:"Hotové",items:[]},archived:{label:"Archiv",items:[]}};return q.forEach(r=>{t[r.status]&&t[r.status].items.push(r)}),Object.entries(t).filter(([r,u])=>u.items.length>0)},[q,d]),Z={all:s.length,active:s.filter(t=>t.status==="active").length,idea:s.filter(t=>t.status==="idea").length,done:s.filter(t=>t.status==="done").length,archived:s.filter(t=>t.status==="archived").length},se=()=>{A.trim()&&(f({name:A.trim(),description:_.trim(),status:R,color:O}),w(""),E(""),M("active"),W(null),T(!1),S("Projekt vytvořen","success"))},J=()=>{T(!0);const t=oe[Math.floor(Math.random()*oe.length)];W(t),setTimeout(()=>G.current?.focus(),40)},ae=t=>{const r=c.filter(v=>v.projectId===t.id),u=r.filter(v=>v.status==="done").length,B=r.filter(v=>v.status==="doing").length,ee=r.filter(v=>v.status==="waiting").length,Y=r.filter(v=>v.status==="todo").length,Q=r.length?Math.round(u/r.length*100):0,L=r.filter(v=>he(v)).length;return e.jsxs("div",{className:"pcard",style:{"--proj-color":ce(t.id)},onClick:()=>j(t.id),children:[e.jsxs("div",{className:"pcard-top",children:[e.jsxs("span",{className:"pcard-stat",children:[re[t.status]?.label||t.status,L?` · ⚠ ${L}`:""]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:v=>{v.stopPropagation();const V=t.status==="archived"?"active":"archived";l(t.id,{status:V}),S(t.status==="archived"?"Projekt byl obnoven":"Projekt byl archivován","success")},title:t.status==="archived"?"Obnovit z archivu":"Archivovat projekt",style:{background:"transparent",border:"none",cursor:"pointer",padding:"4px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",transition:"color 0.2s, background 0.2s"},onMouseEnter:v=>{v.currentTarget.style.color="var(--accent)",v.currentTarget.style.background="var(--bg-3)"},onMouseLeave:v=>{v.currentTarget.style.color="var(--text-3)",v.currentTarget.style.background="transparent"},children:e.jsx(C,{name:t.status==="archived"?"refresh-cw":"archive",size:13,color:"currentColor",strokeWidth:1.8})}),e.jsx("span",{style:{color:"var(--text-3)"},children:"›"})]})]}),e.jsx("div",{className:"pcard-name",children:t.name}),e.jsxs("div",{className:"pcard-sub",children:[r.length," úkolů · ",u," hotových"]}),e.jsxs("div",{className:"pcard-counts",children:[Y>0?e.jsxs("span",{className:"pcc todo",children:["○ ",e.jsx("span",{className:"pcc-v",children:Y})]}):null,B>0?e.jsxs("span",{className:"pcc doing",children:["◐ ",e.jsx("span",{className:"pcc-v",children:B})]}):null,ee>0?e.jsxs("span",{className:"pcc wait",children:["◑ ",e.jsx("span",{className:"pcc-v",children:ee})]}):null,u>0?e.jsxs("span",{className:"pcc done",children:["● ",e.jsx("span",{className:"pcc-v",children:u})]}):null]}),e.jsx("div",{className:"pcard-bar",children:e.jsx("div",{className:"pcard-fill",style:{width:`${Q}%`}})}),e.jsxs("div",{className:"pcard-foot",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"},children:"progres"}),e.jsxs("span",{className:"pcard-pct",children:[Q,"%"]})]})]},t.id)};return e.jsxs("div",{className:"content",children:[e.jsxs("div",{className:"ph",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"ph-eyebrow",children:[s.length," projektů · ",Z.active," aktivních"]}),e.jsx("h1",{className:"ph-title",children:"Projekty"}),e.jsx("div",{className:"ph-sub",children:e.jsx("span",{children:"poslední úprava: dnes"})})]}),e.jsxs("div",{style:{display:"flex",gap:10,flexWrap:"wrap"},children:[e.jsxs("button",{className:"btn",style:{borderColor:"var(--accent)",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139, 92, 246, 0.06)"},onClick:()=>D(!0),children:[e.jsx(C,{name:"sparkles",size:13,color:"currentColor",strokeWidth:2}),"AI Generátor"]}),e.jsxs("button",{className:"btn primary",onClick:J,children:[e.jsx(C,{name:"plus",size:13,color:"currentColor",strokeWidth:2})," Nový projekt"]})]})]}),e.jsxs("div",{className:"chips",style:{marginBottom:22},children:[[{id:"all",label:"Vše"},{id:"active",label:"Aktivní"},{id:"idea",label:"Nápady"},{id:"done",label:"Hotové"},{id:"archived",label:"Archiv"}].map(t=>e.jsxs("span",{className:`chip ${h===t.id?"active":""}`,onClick:()=>y(t.id),children:[t.label," ",e.jsx("span",{className:"chip-count",children:Z[t.id]})]},t.id)),!m&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"chips-sep"}),e.jsxs("span",{style:{position:"relative"},ref:i,children:[e.jsxs("span",{className:`chip ${d!=="none"?"active":""}`,onClick:()=>P(!z),children:["Seskupit: ",H[d]," ▾"]}),z&&e.jsx("div",{className:"pop",style:{position:"absolute",top:"calc(100% + 6px)",left:0,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"var(--shadow)",zIndex:200,minWidth:180,padding:"6px"},children:Object.entries(H).map(([t,r])=>e.jsx("button",{onClick:()=>{k(t),P(!1)},style:{width:"100%",display:"flex",alignItems:"center",padding:"8px 12px",borderRadius:8,border:"none",background:d===t?"var(--accent-soft)":"transparent",color:d===t?"var(--accent)":"var(--text-2)",fontSize:13,fontWeight:d===t?600:400,cursor:"pointer",textAlign:"left"},onMouseEnter:u=>{d!==t&&(u.currentTarget.style.background="var(--card-h)")},onMouseLeave:u=>{d!==t&&(u.currentTarget.style.background="transparent")},children:r},t))})]})]})]}),g?e.jsxs("div",{className:"quickadd",style:{borderStyle:"solid",marginBottom:16,flexDirection:"column",alignItems:"stretch",gap:12,padding:"16px 20px"},children:[e.jsxs("div",{style:{display:"flex",gap:10,width:"100%",alignItems:"center"},children:[e.jsx("span",{className:"quickadd-plus",children:"+"}),e.jsx("input",{ref:G,value:A,onChange:t=>w(t.target.value),placeholder:"Název projektu…",style:{flex:1}}),e.jsx("input",{value:_,onChange:t=>E(t.target.value),placeholder:"Popis (volitelně)…",style:{flex:2}}),e.jsx("select",{value:R,onChange:t=>M(t.target.value),style:{background:"var(--surface)",color:"var(--text-2)",border:"1px solid var(--border-soft)",borderRadius:8,padding:"8px 10px",fontSize:12.5},children:Object.entries(re).map(([t,r])=>e.jsx("option",{value:t,children:r.label},t))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:13,color:"var(--text-3)",fontWeight:500},children:"Barva projektu:"}),e.jsx("div",{style:{display:"flex",gap:6},children:oe.map(t=>e.jsx("span",{onClick:()=>W(t),style:{width:22,height:22,borderRadius:"50%",background:t,cursor:"pointer",display:"inline-block",border:O===t?"2px solid #ffffff":"2px solid transparent",boxShadow:O===t?"0 0 0 2px var(--accent)":"none",transition:"transform 0.15s ease"},onMouseEnter:r=>r.currentTarget.style.transform="scale(1.15)",onMouseLeave:r=>r.currentTarget.style.transform="scale(1)"},t))})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn primary",onClick:se,children:"Vytvořit"}),e.jsx("button",{className:"btn",onClick:()=>{T(!1),W(null)},children:"Zrušit"})]})]})]}):null,d==="status"?e.jsxs("div",{children:[X.map(([t,r])=>e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:re[t]?.color||"var(--text-3)"}}),e.jsxs("h2",{style:{fontSize:16,fontWeight:700,margin:0,color:"var(--text)"},children:[r.label," ",e.jsxs("span",{style:{fontSize:13,fontWeight:500,color:"var(--text-3)",marginLeft:6},children:["(",r.items.length,")"]})]})]}),e.jsx("div",{className:"pgrid",children:r.items.map(u=>ae(u))})]},t)),g?null:e.jsx("div",{className:"pgrid",style:{marginTop:12},children:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:180,width:"100%"},onClick:J,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:17,fontWeight:600},children:"Nový projekt"})]})})]}):e.jsxs("div",{className:"pgrid",children:[q.map(t=>ae(t)),g?null:e.jsxs("div",{className:"pcard",style:{borderStyle:"dashed",borderColor:"var(--border)",borderLeftColor:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"var(--text-3)",minHeight:220},onClick:J,children:[e.jsx(C,{name:"plus",size:14,color:"currentColor",strokeWidth:2}),e.jsx("span",{style:{marginTop:8,fontFamily:"var(--font-ui)",fontSize:19,fontWeight:600},children:"Nový projekt"})]})]}),!q.length&&!g?e.jsx(Ve,{type:"projects",title:h==="all"?"Zatím žádné projekty":`Žádné projekty ve stavu „${re[h]?.label??h}"`,description:h==="all"?"Vytvoř svůj první projekt a začni organizovat úkoly.":"V této kategorii nejsou žádné projekty.",action:h==="all"?J:void 0,actionLabel:"Nový projekt"}):null,U&&e.jsx(Je,{onClose:()=>D(!1)})]})}function Je({onClose:s}){const{tags:c,addProject:f,addTask:j,addTag:l,openProject:m}=ie(),S=de(),[h,y]=n.useState("prompt"),[g,T]=n.useState(""),[U,D]=n.useState("Analýza záměru a plánování..."),[A,w]=n.useState(""),[_,E]=n.useState(""),[R,M]=n.useState("#3b82f6"),[O,W]=n.useState([]),[G,d]=n.useState({});n.useEffect(()=>{if(h!=="loading")return;const a=["Analyzuji váš kreativní záměr...","Sestavuji agilní fáze a milníky...","Doplňuji detailní chronologické podúkoly...","Přiřazuji optimální priority a štítky...","Dokončuji finální úpravy vašeho plánu..."];let p=0;D(a[0]);const i=setInterval(()=>{p=(p+1)%a.length,D(a[p])},2500);return()=>clearInterval(i)},[h]);const k=async()=>{if(g.trim()){y("loading");try{const{data:a,error:p}=await ne.functions.invoke("ai-project-planner",{body:{userPrompt:g,availableTags:c.map(N=>N.name)}});if(p||!a?.result)throw new Error(p?.message||a?.error||"Generování selhalo");const i=a.result;w(i.projectName||""),E(i.projectDescription||""),M(i.projectColor||"#3b82f6"),W((i.tasks||[]).map((N,H)=>({...N,id:`gen-task-${H}`,selected:!0}))),y("preview")}catch(a){console.error(a),S(a.message||"Generování projektu selhalo","error"),y("prompt")}}},$=a=>{W(p=>p.map(i=>i.id===a?{...i,selected:!i.selected}:i))},F=a=>{d(p=>({...p,[a]:!p[a]}))},z=()=>{try{const a=f({name:A.trim()||"Bez názvu",description:_.trim(),status:"active",color:R});for(const p of O){if(!p.selected)continue;const i=[];if(Array.isArray(p.tags))for(const H of p.tags){const q=H.trim().toLowerCase();if(!q)continue;const X=c.find(Z=>Z.name.toLowerCase()===q);if(X)i.push(X.id);else{const Z=["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"],se=Z[Math.floor(Math.random()*Z.length)],J=l({name:q,color:se});i.push(J.id)}}const N=(p.subtasks||[]).map(H=>({id:$e(),text:H,done:!1}));j({title:p.title,description:p.description,status:"todo",priority:p.priority,projectId:a.id,tagIds:i,subtasks:N})}S("Projekt a úkoly úspěšně vytvořeny s AI!","success"),m(a.id),s()}catch(a){console.error(a),S("Nepodařilo se uložit projekt","error")}},P=[{label:"🚀 Spuštění e-shopu",prompt:"Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění."},{label:"🤝 Onboarding zaměstnance",prompt:"Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol."},{label:"🎪 Plánování eventu",prompt:"Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program."},{label:"🎯 Marketingová kampaň",prompt:"Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy."},{label:"📱 Vývoj mobilní aplikace",prompt:"Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování."}];return e.jsxs("div",{className:"ai-modal-overlay",onClick:s,children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),e.jsxs("div",{className:"ai-modal-container",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"ai-modal-header",children:[e.jsxs("div",{className:"ai-modal-title",children:[e.jsx(C,{name:"sparkles",size:18,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"AI Projektový Plánovač"})]}),e.jsx("button",{className:"ai-modal-close",onClick:s,children:e.jsx(C,{name:"x",size:16,color:"currentColor",strokeWidth:2.5})})]}),e.jsxs("div",{className:"ai-modal-body",children:[h==="prompt"&&e.jsxs("div",{children:[e.jsx("h2",{className:"ai-prompt-heading",children:"Navrhněte nový projekt s AI"}),e.jsx("p",{className:"ai-prompt-sub",children:"Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt, barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly."}),e.jsx("textarea",{className:"ai-textarea",placeholder:"Např.: Přestěhovat firmu do nových kanceláří do konce měsíce...",value:g,onChange:a=>T(a.target.value)}),e.jsx("div",{className:"ai-presets-title",children:"Nebo začněte z rychlé šablony:"}),e.jsx("div",{className:"ai-presets-grid",children:P.map((a,p)=>e.jsx("button",{className:"ai-preset-chip",onClick:()=>T(a.prompt),children:a.label},p))}),e.jsxs("button",{className:"ai-btn-generate",onClick:k,disabled:!g.trim(),style:{opacity:g.trim()?1:.6,cursor:g.trim()?"pointer":"not-allowed"},children:[e.jsx(C,{name:"sparkles",size:16,color:"currentColor",strokeWidth:2}),e.jsx("span",{children:"Generovat projekt s AI"})]})]}),h==="loading"&&e.jsxs("div",{className:"ai-loading-container",children:[e.jsx("div",{className:"ai-loading-spinner"}),e.jsx("div",{className:"ai-loading-text",children:U}),e.jsx("div",{className:"ai-loading-hint",children:"Tento proces obvykle trvá 5 až 10 sekund."})]}),h==="preview"&&e.jsxs("div",{className:"ai-preview-grid",children:[e.jsxs("div",{className:"ai-preview-sidebar",children:[e.jsx("h3",{style:{fontSize:15,fontWeight:700,marginBottom:16,color:"var(--text)"},children:"Nastavení projektu"}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Název projektu"}),e.jsx("input",{className:"ai-input",value:A,onChange:a=>w(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Popis projektu"}),e.jsx("textarea",{className:"ai-input",style:{minHeight:80,resize:"none"},value:_,onChange:a=>E(a.target.value)})]}),e.jsxs("div",{className:"ai-input-group",children:[e.jsx("label",{className:"ai-label",children:"Zvolit barvu"}),e.jsx("div",{className:"ai-color-picker",children:oe.map(a=>e.jsx("span",{className:`ai-color-dot ${R===a?"active":""}`,style:{background:a},onClick:()=>M(a)},a))})]})]}),e.jsxs("div",{className:"ai-preview-main",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("h3",{style:{fontSize:15,fontWeight:700,color:"var(--text)",margin:0},children:["Navržený plán úkolů (",O.filter(a=>a.selected).length,")"]}),e.jsx("span",{style:{fontSize:12,color:"var(--text-3)"},children:"Vyberte úkoly k vytvoření"})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12,maxHeight:"50vh",overflowY:"auto",paddingRight:"4px"},children:O.map(a=>{const p=!!G[a.id];return e.jsxs("div",{className:"ai-preview-card",style:{opacity:a.selected?1:.5},children:[e.jsxs("div",{className:"ai-preview-card-header",children:[e.jsx("input",{type:"checkbox",className:"ai-preview-card-checkbox",checked:a.selected,onChange:()=>$(a.id)}),e.jsxs("div",{className:"ai-preview-card-info",onClick:()=>$(a.id),style:{cursor:"pointer"},children:[e.jsx("div",{className:"ai-preview-card-title",children:a.title}),e.jsx("div",{className:"ai-preview-card-desc",children:a.description}),e.jsxs("div",{className:"ai-preview-card-meta",children:[e.jsx("span",{className:`ai-badge prio-${a.priority}`,children:a.priority==="high"?"↑ Vysoká":a.priority==="medium"?"→ Střední":"↓ Nízká"}),e.jsxs("span",{className:"ai-badge time",children:["⏱ ",a.timeEstimate]}),(a.tags||[]).map((i,N)=>e.jsxs("span",{className:"ai-badge tag",children:["#",i]},N))]})]})]}),a.subtasks&&a.subtasks.length>0&&e.jsxs("div",{children:[e.jsxs("button",{className:"ai-subtasks-toggle",onClick:i=>{i.stopPropagation(),F(a.id)},children:[e.jsx("span",{children:p?"Skrýt podúkoly":`Zobrazit podúkoly (${a.subtasks.length})`}),e.jsx("span",{children:p?"▴":"▾"})]}),p&&e.jsx("div",{className:"ai-preview-subtasks-list",children:a.subtasks.map((i,N)=>e.jsxs("div",{className:"ai-preview-subtask-item",children:[e.jsx("div",{className:"ai-preview-subtask-bullet"}),e.jsx("span",{children:i})]},N))})]})]},a.id)})})]})]})]}),e.jsx("div",{className:"ai-modal-footer",children:h==="preview"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"ai-btn-secondary",onClick:()=>y("prompt"),children:"Zpět / Znovu"}),e.jsxs("button",{className:"ai-btn-primary",onClick:z,children:[e.jsx(C,{name:"check",size:15,color:"currentColor",strokeWidth:2.5}),e.jsx("span",{children:"Vytvořit projekt s AI"})]})]}):e.jsx("button",{className:"ai-btn-secondary",onClick:s,disabled:h==="loading",children:"Zavřít"})})]})]})}export{st as ProjectDetailPage,at as default};
