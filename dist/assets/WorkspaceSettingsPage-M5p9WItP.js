import{d as a,j as e}from"./vendor-notes-editor-C-RICP77.js";import{V as he,Q as $,$ as $e,W as Ee,I as V,w as Me}from"./index-DcOXd_O4.js";const Ae="BHQ5iYlti3RadbzjdBxK_qNOee1ljQ77UJx5N6eG4Cf2_EjSUtHXeki2Ej914Pstf0VQT4Mt4c4kNnfC4IBgTlI";function Ue(i){const h="=".repeat((4-i.length%4)%4),n=(i+h).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(n),c=>c.charCodeAt(0))}function Be(){const{userId:i,activeWorkspaceId:h}=he(),[n,c]=a.useState(!1),[p,g]=a.useState("default"),[z,f]=a.useState(!1),[_,N]=a.useState(!1);a.useEffect(()=>{const l="serviceWorker"in navigator&&"PushManager"in window&&!0;c(l),l&&g(Notification.permission)},[]),a.useEffect(()=>{!n||!i||navigator.serviceWorker.ready.then(async l=>{const u=await l.pushManager.getSubscription();f(!!u)}).catch(()=>{})},[n,i]);const F=a.useCallback(async()=>{if(!(!n||!i||!h)){N(!0);try{const l=await Notification.requestPermission();if(g(l),l!=="granted")return;const u=await navigator.serviceWorker.ready;let x=await u.pushManager.getSubscription();x||(x=await u.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Ue(Ae)}));const{endpoint:w,keys:E}=x.toJSON();await $.from("push_subscriptions").upsert({user_id:i,workspace_id:h,endpoint:w,p256dh:E.p256dh,auth:E.auth},{onConflict:"user_id,endpoint"}),f(!0)}catch(l){console.error("Push subscribe:",l)}finally{N(!1)}}},[n,i,h]),I=a.useCallback(async()=>{if(!(!n||!i)){N(!0);try{const u=await(await navigator.serviceWorker.ready).pushManager.getSubscription();if(u){const{endpoint:x}=u.toJSON();await u.unsubscribe(),await $.from("push_subscriptions").delete().eq("user_id",i).eq("endpoint",x)}f(!1)}catch(l){console.error("Push unsubscribe:",l)}finally{N(!1)}}},[n,i]);return{supported:n,permission:p,subscribed:z,loading:_,subscribe:F,unsubscribe:I}}const ce={owner:"#f59e0b",admin:"#3b82f6",member:"#22c55e",viewer:"#8b95a5"},Ve=[{id:"dashboard",label:"Přehled"},{id:"tasks",label:"Úkoly"},{id:"quick-todos",label:"Rychlý seznam"},{id:"projects",label:"Projekty"},{id:"timeline",label:"Plán"},{id:"notes",label:"Poznámky"}],Fe=[{id:"account",label:"Účet",icon:"user"},{id:"workspace",label:"Workspace",icon:"settings"},{id:"members",label:"Členové",icon:"users"},{id:"notifications",label:"Notifikace",icon:"bell"},{id:"app",label:"Aplikace",icon:"sliders-horizontal"}],pe={email_task_reminders:!0,email_daily_digest:!0,push_task_reminders:!0,push_daily_digest:!0,digest_hour:8};function De(i){return ce[i]||ce.member}function d({label:i,title:h,description:n,icon:c,tone:p="default",children:g,action:z,className:f=""}){const _=p==="danger"?{borderColor:"rgba(239,68,68,.28)",background:"linear-gradient(180deg, rgba(239,68,68,.045), var(--surface))"}:p==="accent"?{borderColor:"color-mix(in srgb, var(--accent) 28%, var(--border-soft))",background:"linear-gradient(180deg, var(--accent-soft), var(--surface) 58%)"}:null;return e.jsxs("section",{className:`ws-card ${f}`,style:_||void 0,children:[e.jsxs("div",{className:"ws-card-head",children:[e.jsxs("div",{className:"ws-card-title-wrap",children:[c&&e.jsx("span",{className:`ws-card-icon ${p}`,children:e.jsx(V,{name:c,size:15,color:"currentColor",strokeWidth:2})}),e.jsxs("div",{children:[i&&e.jsx("div",{className:`ws-section-label ${p}`,children:i}),h&&e.jsx("div",{className:"ws-card-title",children:h}),n&&e.jsx("div",{className:"ws-card-desc",children:n})]})]}),z&&e.jsx("div",{className:"ws-card-action",children:z})]}),g&&e.jsx("div",{className:"ws-card-body",children:g})]})}function xe({children:i,tone:h="default"}){return e.jsx("span",{className:`ws-meta-pill ${h}`,children:i})}function me({children:i}){return e.jsx("div",{className:"ws-form-hint",children:i})}function Ke({initialTab:i="workspace"}){const{workspaces:h,activeWorkspaceId:n,workspaceMembers:c,workspaceRole:p,userId:g,renameWorkspace:z,updateMemberRole:f,removeMember:_,leaveWorkspace:N,generateInviteLink:F,fetchWorkspaceInvites:I,revokeInvite:l,setPage:u,isMobile:x,userEmail:w,logout:E,updateProfileDisplayName:ge,dk:ue,setDk:be,uiSettings:v,updateUiSettings:S,accentThemes:fe,isSystemAdmin:we}=he(),r=$e(),D=Ee(),m=Be(),C=h.find(t=>t.id===n),P=c.find(t=>t.userId===g),[W,G]=a.useState(i),[ve,M]=a.useState(!1),[L,H]=a.useState(C?.name??""),[K,Z]=a.useState([]),[Y,ye]=a.useState("member"),[q,J]=a.useState(""),[ke,X]=a.useState(!1),[O,ee]=a.useState(P?.displayName||""),[Q,te]=a.useState(!1),[je,ze]=a.useState(!1),[y,se]=a.useState(pe),[ae,ie]=a.useState(!1),[b,R]=a.useState(null),A=p==="owner"||p==="admin",U=p==="owner";a.useEffect(()=>{A&&(X(!0),I().then(Z).catch(()=>{}).finally(()=>X(!1)))},[n,A,I]),a.useEffect(()=>{G(i)},[i]),a.useEffect(()=>{H(C?.name??"")},[C?.name]),a.useEffect(()=>{ee(P?.displayName||"")},[P?.displayName]),a.useEffect(()=>{g&&$.from("notification_preferences").select("*").eq("user_id",g).single().then(({data:t})=>{t&&se({...pe,...t})})},[g]);const re=async t=>{const s={...y,...t};se(s),ie(!0);const{error:o}=await $.from("notification_preferences").upsert({user_id:g,...s,updated_at:new Date().toISOString()},{onConflict:"user_id"});ie(!1),o&&r("Nepodařilo se uložit nastavení","error")},ne=async()=>{if(O.trim()){te(!0);try{await ge(O.trim()),r("Jméno uloženo","success")}catch(t){r(t.message||"Chyba","error")}finally{te(!1)}}},Ne=async()=>{const{error:t}=await $.auth.resetPasswordForEmail(w,{redirectTo:`${window.location.origin}?reset=1`});if(t){r(t.message||"Chyba","error");return}ze(!0),r("Odkaz pro reset hesla odeslán na email","success")},Se=async()=>{await D("Odhlásit se?")&&await E()},oe=async()=>{if(L.trim())try{await z(L.trim()),M(!1),r("Přejmenováno","success")}catch(t){r(t.message||"Chyba","error")}},Ce=async(t,s)=>{try{await f(t,s),r("Role aktualizována","success")}catch(o){r(o.message||"Chyba","error")}},le=async(t,s=!1)=>{if(!(!s&&!await D(`Odebrat ${t.email||t.userId.slice(0,8)} z workspace?`)))try{await _(t.userId),r("Člen odebrán","success")}catch(o){r(o.message||"Chyba","error")}},de=async(t=!1)=>{if(!(!t&&!await D("Opravdu chceš opustit tento workspace?")))try{await N(),u("dashboard"),r("Opustil jsi workspace","success")}catch(s){r(s.message||"Chyba","error")}},Pe=async()=>{try{const t=await F(Y);J(t);const s=await I();Z(s),r("Odkaz vygenerován","success")}catch(t){r(t.message||"Chyba","error")}},We=async t=>{try{await l(t),Z(s=>s.filter(o=>o.id!==t)),r("Pozvánka zrušena","success")}catch(s){r(s.message||"Chyba","error")}},_e=t=>t.displayName||t.email||`${t.userId.slice(0,8)}…`,Ie=t=>(t.displayName||t.email||t.userId||"?").slice(0,2).toUpperCase(),Oe=(P?.displayName||w||"?").slice(0,2).toUpperCase(),T={width:"100%",padding:x?"11px 12px":"9px 12px",borderRadius:11,border:"1px solid var(--border-soft)",background:"var(--bg-2)",color:"var(--text)",fontSize:x?16:13,outline:"none"},k={fontSize:13,color:"var(--text-3)",lineHeight:1.55},B=t=>({padding:x?"9px 11px":"8px 11px",borderRadius:10,border:`1px solid ${t?"color-mix(in srgb, var(--accent) 38%, transparent)":"var(--border-soft)"}`,background:t?"var(--accent-soft)":"var(--bg-2)",color:t?"var(--accent)":"var(--text-2)",fontSize:12,fontWeight:t?850:650}),Re=t=>({width:46,height:26,borderRadius:999,border:`1px solid ${t?"color-mix(in srgb, var(--accent) 36%, transparent)":"var(--border-soft)"}`,background:t?"var(--accent-soft)":"var(--bg-2)",position:"relative",padding:0,flexShrink:0}),Te=t=>({position:"absolute",top:3,left:t?23:3,width:18,height:18,borderRadius:"50%",background:t?"var(--accent)":"var(--text-3)",transition:"left .16s ease, background .16s ease"});return e.jsxs("div",{className:"content workspace-settings-page",children:[e.jsx("style",{children:`
        body:has(.workspace-settings-page) .fab{display:none!important;}
        .workspace-settings-page{max-width:880px;margin:0 auto;box-sizing:border-box;}
        .workspace-settings-page *{box-sizing:border-box;}
        .ws-settings-hero{margin-bottom:20px;}
        .ws-back{border:0;background:none;padding:0;cursor:pointer;color:var(--accent);font-family:var(--mono);font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.12em;}
        .ws-settings-title{margin:10px 0 9px;font-family:var(--font-ui);font-size:30px;line-height:1.05;color:var(--text);letter-spacing:-.03em;font-weight:720;}
        .ws-settings-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--text-3);font-family:var(--mono);font-size:11.5px;}
        .ws-meta-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;border:1px solid var(--border-soft);background:var(--surface);color:var(--text-2);font-family:var(--mono);font-size:11px;font-weight:750;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ws-meta-pill.role{color:var(--accent);background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 28%,var(--border-soft));text-transform:uppercase;}
        .ws-settings-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:18px;align-items:start;}
        .ws-settings-tabs{position:sticky;top:16px;background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;padding:6px;}
        .ws-settings-tabs-inner{display:grid;gap:3px;}
        .ws-tab{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-2);font-size:13px;font-weight:600;text-align:left;cursor:pointer;}
        .ws-tab:hover{background:var(--bg-2);}
        .ws-tab.active{background:var(--accent-soft);color:var(--accent);font-weight:800;border-color:color-mix(in srgb,var(--accent) 22%,transparent);}
        .ws-settings-panels{display:grid;gap:10px;min-width:0;}
        .ws-card{background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;padding:16px;min-width:0;}
        .ws-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;}
        .ws-card-action{flex:0 0 auto;}
        .ws-card-title-wrap{display:flex;gap:11px;align-items:flex-start;min-width:0;flex:1;}
        .ws-card-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:var(--accent);background:var(--accent-soft);flex:0 0 auto;}
        .ws-card-icon.danger{color:var(--red);background:var(--red-soft);}
        .ws-section-label{font-family:var(--mono);font-size:10px;color:var(--text-4);text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;font-weight:850;}
        .ws-section-label.danger{color:var(--red);}
        .ws-card-title{font-size:14.5px;color:var(--text);font-weight:800;line-height:1.3;}
        .ws-card-desc{font-size:12.5px;color:var(--text-3);line-height:1.5;margin-top:4px;}
        .ws-card-body{margin-top:14px;}
        .ws-profile-card{display:flex;align-items:center;gap:14px;}
        .ws-avatar{width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:var(--bg);display:grid;place-items:center;font-family:var(--mono);font-size:17px;font-weight:850;flex:0 0 auto;}
        .ws-profile-name{font-family:var(--font-ui);font-size:18px;font-weight:650;line-height:1.2;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em;}
        .ws-profile-mail{font-size:13px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;}
        .ws-profile-role{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;border:1px solid var(--border-soft);background:var(--bg-2);font-family:var(--mono);font-size:10px;color:var(--text-3);text-transform:uppercase;font-weight:850;}
        .ws-form-row{display:flex;gap:8px;flex-wrap:wrap;}
        .ws-form-hint{font-size:12px;color:var(--text-3);margin-top:8px;line-height:1.45;}
        .ws-danger-button{width:auto;}
        .ws-system-action{display:flex;align-items:center;gap:6px;flex:0 0 auto;}
        .ws-member-list,.ws-invite-list{border:1px solid var(--border-soft);border-radius:11px;overflow:hidden;}
        .ws-member-row,.ws-invite-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border-soft);background:var(--surface);}
        .ws-member-row:nth-child(even),.ws-invite-row:nth-child(even){background:var(--bg-2);}
        .ws-member-row:last-child,.ws-invite-row:last-child{border-bottom:0;}
        .ws-member-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--mono);font-size:11.5px;font-weight:850;flex:0 0 auto;}
        .ws-role-badge{font-family:var(--mono);font-size:10.5px;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.06em;font-weight:850;}
        .ws-mobile-break{display:flex;align-items:center;justify-content:space-between;gap:14px;}
        @media(max-width:767px){
          .workspace-settings-page{
            width:100%;
            padding:14px 14px calc(88px + max(6px, env(safe-area-inset-bottom, 0px)))!important;
            max-width:none!important;
            overflow-x:clip;
          }
          .ws-settings-hero{
            margin:-2px 0 12px;
            padding:0 1px;
          }
          .ws-back{
            display:inline-flex;
            align-items:center;
            min-height:30px;
            font-size:10.5px;
            letter-spacing:.16em;
          }
          .ws-settings-title{
            font-size:30px;
            line-height:1;
            margin:7px 0 10px;
            letter-spacing:-.035em;
          }
          .ws-settings-meta{
            gap:6px;
            flex-wrap:nowrap;
            overflow-x:auto;
            scrollbar-width:none;
            margin-right:-14px;
            padding-right:14px;
            -webkit-overflow-scrolling:touch;
          }
          .ws-settings-meta::-webkit-scrollbar{display:none;}
          .ws-meta-pill{
            flex:0 0 auto;
            min-height:26px;
            padding:4px 9px;
            font-size:10.5px;
          }
          .ws-settings-email{
            flex:0 1 auto;
            min-width:0;
            max-width:170px;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          }
          .ws-settings-layout{grid-template-columns:minmax(0,1fr);gap:12px;}
          .ws-settings-tabs{
            position:sticky;
            top:0;
            z-index:20;
            margin:0 -14px 4px;
            padding:7px 14px 8px;
            border:0;
            border-top:1px solid var(--border-soft);
            border-bottom:1px solid var(--border-soft);
            border-radius:0;
            background:color-mix(in srgb,var(--bg) 92%,transparent);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
          }
          .ws-settings-tabs-inner{
            display:flex;
            gap:7px;
            overflow-x:auto;
            padding-bottom:1px;
            scroll-snap-type:x proximity;
            scrollbar-width:none;
            -webkit-overflow-scrolling:touch;
          }
          .ws-settings-tabs-inner::-webkit-scrollbar{display:none;}
          .ws-tab{
            flex:0 0 auto;
            width:auto;
            min-width:0;
            min-height:36px;
            justify-content:center;
            gap:6px;
            padding:8px 12px;
            border-radius:999px;
            border:1px solid var(--border-soft);
            background:var(--surface);
            font-size:12px;
            font-weight:750;
            scroll-snap-align:start;
            box-shadow:none;
          }
          .ws-tab.active{
            background:color-mix(in srgb,var(--accent) 14%,var(--surface));
            border-color:color-mix(in srgb,var(--accent) 42%,var(--border-soft));
            box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 12%,transparent);
          }
          .ws-settings-panels{gap:9px;}
          .ws-card{
            width:100%;
            max-width:100%;
            overflow:hidden;
            overflow-wrap:break-word;
            padding:14px;
            border-radius:12px;
            background:color-mix(in srgb,var(--surface) 92%,var(--bg));
            box-shadow:none;
          }
          .ws-card-head{
            flex-direction:row;
            align-items:flex-start;
            gap:10px;
          }
          .ws-card-title-wrap{
            gap:10px;
            min-width:0;
          }
          .ws-card-title-wrap > div{
            min-width:0;
          }
          .ws-card-action{
            align-self:center;
            margin-left:auto;
          }
          .ws-card-icon{
            width:34px;
            height:34px;
            border-radius:10px;
          }
          .ws-section-label{
            font-size:9.5px;
            letter-spacing:.14em;
            margin-bottom:3px;
          }
          .ws-card-title{
            font-size:15.5px;
            line-height:1.22;
            letter-spacing:-.01em;
          }
          .ws-card-desc{
            font-size:12.5px;
            line-height:1.38;
            margin-top:3px;
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
            overflow:hidden;
          }
          .ws-card-body{margin-top:12px;}
          .ws-form-row input,.ws-form-row .ws-input,.ws-card input,.ws-card select,.ws-card textarea{min-width:0!important;max-width:100%;}
          .ws-profile-card{
            gap:12px;
            padding:14px;
            border-radius:13px;
          }
          .ws-avatar{
            width:48px;
            height:48px;
            font-size:15px;
          }
          .ws-profile-name{font-size:17px;}
          .ws-profile-mail{font-size:12.5px;}
          .ws-profile-role{
            margin-top:6px;
            padding:3px 7px;
            font-size:9.5px;
          }
          .ws-form-row{
            display:grid;
            grid-template-columns:1fr auto;
            align-items:center;
            gap:8px;
          }
          .ws-form-row input{
            min-height:44px;
          }
          .ws-form-row .btn{
            min-height:42px;
            justify-content:center;
            padding:10px 13px;
          }
          .ws-card .btn{
            min-height:40px;
            justify-content:center;
            padding:9px 13px;
            border-radius:12px;
            font-size:12.5px;
            font-weight:800;
          }
          .ws-card .btn.primary{
            box-shadow:none;
          }
          .ws-card-body > .btn:not(.ws-danger-button){
            width:100%;
          }
          .ws-card-action .btn{
            min-width:0;
            white-space:nowrap;
          }
          .ws-system-action{
            width:auto;
            margin-top:0;
          }
          .ws-system-action svg{
            display:none;
          }
          .ws-danger-button{
            width:100%;
            min-height:42px;
          }
          .ws-mobile-break{
            align-items:flex-start;
            flex-direction:column;
            gap:10px;
          }
          .ws-mobile-break > .btn,
          .ws-mobile-break > select,
          .ws-mobile-break > div:last-child:not(:first-child){
            width:100%!important;
          }
          .ws-mobile-break > div[style*="display: flex"]{
            display:grid!important;
            grid-template-columns:1fr 1fr;
          }
          .ws-form-hint{
            font-size:12px;
            margin-top:6px;
          }
          .ws-member-row{align-items:flex-start;flex-wrap:wrap;padding:11px 10px;min-height:52px;}
          .ws-member-row select{width:100%!important;}
          .ws-member-actions{display:grid!important;grid-template-columns:1fr auto;width:100%;gap:7px!important;margin-left:40px;}
          .ws-invite-row{flex-wrap:wrap;}
          .ws-invite-row .btn{width:auto;}
          .ws-card + .ws-card { margin-top: 10px; }
          .ws-section-label { margin-bottom: 8px; margin-top: 4px; }
        }
        @media(max-width:380px){
          .workspace-settings-page{padding-left:12px!important;padding-right:12px!important;}
          .ws-settings-tabs{margin-left:-12px;margin-right:-12px;padding-left:12px;padding-right:12px;}
          .ws-settings-email{max-width:135px;}
          .ws-form-row{grid-template-columns:1fr;}
          .ws-form-row .btn{width:100%;}
        }
      `}),e.jsxs("div",{className:"ws-settings-hero",children:[e.jsx("button",{className:"ws-back",onClick:()=>u("dashboard"),children:"← Workspace"}),e.jsx("h1",{className:"ws-settings-title",children:"Nastavení"}),e.jsxs("div",{className:"ws-settings-meta",children:[e.jsx(xe,{children:C?.name||"Workspace"}),e.jsxs(xe,{tone:"role",children:["role ",p]}),e.jsx("span",{className:"ws-settings-email",children:w})]})]}),e.jsxs("div",{className:"ws-settings-layout",children:[e.jsx("aside",{className:"ws-settings-tabs",children:e.jsx("div",{className:"ws-settings-tabs-inner",children:Fe.map(t=>{const s=W===t.id;return e.jsxs("button",{onClick:()=>G(t.id),className:`ws-tab ${s?"active":""}`,children:[e.jsx(V,{name:t.icon,size:15,color:"currentColor",strokeWidth:1.9}),e.jsx("span",{children:t.label})]},t.id)})})}),e.jsxs("div",{className:"ws-settings-panels",children:[W==="account"&&e.jsxs(e.Fragment,{children:[e.jsxs("section",{className:"ws-card ws-profile-card",children:[e.jsx("div",{className:"ws-avatar",children:Oe}),e.jsxs("div",{style:{minWidth:0,flex:1},children:[e.jsx("div",{className:"ws-profile-name",children:P?.displayName||"Bez jména"}),e.jsx("div",{className:"ws-profile-mail",children:w}),e.jsxs("span",{className:"ws-profile-role",children:["role ",P?.role??p]})]})]}),e.jsx(d,{label:"Zobrazované jméno",description:"Tohle jméno vidí ostatní členové workspace.",icon:"user",children:e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{value:O,onChange:t=>ee(t.target.value),onKeyDown:t=>t.key==="Enter"&&ne(),placeholder:"Tvoje jméno...",style:{...T,flex:1,minWidth:220}}),e.jsx("button",{className:"btn primary",onClick:ne,disabled:!O.trim()||Q,style:{opacity:!O.trim()||Q?.6:1},children:Q?"Ukládám...":"Uložit"})]})}),we&&e.jsx(d,{label:"Správa systému",title:"Administrace systému Zentero",description:"Globální správa uživatelů, monitoring, logy a obnovení smazaných dat z koše.",icon:"settings",tone:"accent",action:e.jsxs("button",{className:"btn primary ws-system-action",onClick:()=>u("admin"),children:[e.jsx(V,{name:"settings",size:14,color:"currentColor"})," Otevřít"]})}),e.jsx(d,{label:"Heslo",title:"Obnova hesla",description:"Pošleme odkaz pro bezpečný reset hesla na e-mail účtu.",icon:"key-round",children:je?e.jsxs("div",{style:{fontSize:13,color:"var(--green)"},children:["Odkaz pro reset hesla byl odeslán na ",w,"."]}):e.jsx("button",{className:"btn",onClick:Ne,children:"Odeslat odkaz pro reset hesla"})}),e.jsx(d,{label:"Odhlášení",title:"Odhlásit se z aplikace",description:"Ukončí aktuální relaci na tomto zařízení.",icon:"log-out",tone:"danger",children:e.jsx("button",{className:"btn danger ws-danger-button",onClick:Se,children:"Odhlásit se"})})]}),W==="workspace"&&e.jsxs(e.Fragment,{children:[e.jsx(d,{label:"Název workspace",icon:"briefcase",children:ve?e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{autoFocus:!0,value:L,onChange:t=>H(t.target.value),onKeyDown:t=>{t.key==="Enter"&&oe(),t.key==="Escape"&&M(!1)},style:{...T,flex:1,minWidth:220}}),e.jsx("button",{className:"btn primary",onClick:oe,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>M(!1),children:"Zrušit"})]}):e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{style:{fontFamily:"var(--font-ui)",fontSize:x?19:21,fontWeight:650,lineHeight:1.2,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:C?.name||"Bez názvu"}),e.jsxs(me,{children:[c.length," členů · tvoje role ",p]})]}),U&&e.jsx("button",{className:"btn",onClick:()=>{M(!0),H(C?.name??"")},children:"Přejmenovat"})]})}),e.jsxs(d,{label:"Nebezpečná zóna",title:"Opustit workspace",description:"Akce se týká jen tvého členství v tomto workspace.",icon:"alert-triangle",tone:"danger",children:[!U&&e.jsx("button",{className:"btn danger ws-danger-button",onClick:x?()=>R({type:"leave"}):de,children:"Opustit workspace"}),U&&c.length===1&&e.jsx("div",{style:k,children:"Workspace nelze opustit, jsi jediný člen."}),U&&c.length>1&&e.jsx("div",{style:k,children:"Jako owner nemůžeš workspace opustit. Nejprve předej ownership."})]})]}),W==="members"&&e.jsxs(e.Fragment,{children:[e.jsx(d,{label:`Členové (${c.length})`,title:"Tým workspace",description:"Správa rolí a přístupů v aktuálním workspace.",icon:"users",children:e.jsx("div",{className:"ws-member-list",children:c.map(t=>{const s=De(t.role);return e.jsxs("div",{className:"ws-member-row interactive-row",children:[e.jsx("div",{className:"ws-member-avatar",style:{background:`${s}22`,border:`1px solid ${s}55`,color:s},children:Ie(t)}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:13.5,color:"var(--text)",fontWeight:750,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:_e(t)}),t.email&&t.displayName&&e.jsx("div",{style:{fontSize:11.5,color:"var(--text-3)"},children:t.email})]}),A&&t.userId!==g&&t.role!=="owner"?e.jsxs("div",{className:"ws-member-actions",style:{display:"flex",alignItems:"center",gap:6},children:[e.jsxs("select",{value:t.role,onChange:o=>Ce(t.userId,o.target.value),style:{...T,width:90,padding:"6px 8px",fontSize:12},children:[e.jsx("option",{value:"admin",children:"admin"}),e.jsx("option",{value:"member",children:"member"}),e.jsx("option",{value:"viewer",children:"viewer"})]}),e.jsx("button",{className:"btn danger",style:{padding:"7px 10px"},onClick:()=>x?R({type:"remove",member:t}):le(t),children:e.jsx(V,{name:"trash",size:12,color:"currentColor",strokeWidth:2})})]}):e.jsx("span",{className:"ws-role-badge",style:{border:`1px solid ${s}44`,color:s,background:`${s}18`},children:t.role})]},t.userId)})})}),A&&e.jsxs(d,{label:"Pozvat člena",title:"Pozvánka do workspace",description:"Vygeneruj odkaz s rolí a pošli ho novému členovi.",icon:"user-plus",children:[e.jsx("div",{className:"chips",style:{marginBottom:12},children:["member","viewer","admin"].map(t=>e.jsx("button",{className:`chip ${Y===t?"active":""}`,onClick:()=>{ye(t),J("")},children:t},t))}),q?e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:8},children:"Odkaz platí 7 dní."}),e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{readOnly:!0,value:q,style:{...T,flex:1,minWidth:240},onClick:t=>t.target.select()}),e.jsx("button",{className:"btn primary",onClick:()=>{navigator.clipboard.writeText(q),r("Zkopírováno","success")},children:"Kopírovat"}),e.jsx("button",{className:"btn",onClick:()=>{J("")},children:"Nový"})]})]}):e.jsx("button",{className:"btn primary",onClick:Pe,children:"Vygenerovat odkaz"}),e.jsx(me,{children:ke?"Načítám pozvánky...":`Čekající pozvánky: ${K.length}`}),K.length>0&&e.jsx("div",{className:"ws-invite-list",style:{marginTop:8},children:K.map(t=>e.jsxs("div",{className:"ws-invite-row interactive-row",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text)"},children:t.role}),e.jsxs("span",{style:{fontSize:11.5,color:"var(--text-3)"},children:["vyprší ",Me(t.expires_at,{day:"numeric",month:"numeric",year:"numeric"})]}),e.jsx("span",{style:{flex:1}}),e.jsx("button",{className:"btn danger",style:{padding:"5px 9px"},onClick:()=>We(t.id),children:"Zrušit"})]},t.id))})]})]}),W==="notifications"&&e.jsxs(e.Fragment,{children:[e.jsx(d,{label:"Notifikace",title:"Push upozornění",description:"Upozornění na blížící se termíny a připomínky.",icon:"bell",children:m.supported?m.permission==="denied"?e.jsx("div",{style:k,children:"Notifikace jsou blokovány. Povol je v nastavení prohlížeče a stránku obnov."}):e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:m.subscribed?"Notifikace jsou zapnuté":"Push notifikace"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:m.subscribed?"Upozorníme tě na blížící se termíny a připomínky.":"Dostávej upozornění i když je app zavřená."})]}),e.jsx("button",{className:`btn${m.subscribed?"":" primary"}`,onClick:m.subscribed?m.unsubscribe:m.subscribe,disabled:m.loading,style:{flexShrink:0,minWidth:120},children:m.loading?"…":m.subscribed?"Vypnout":"Zapnout"})]}):e.jsx("div",{style:k,children:"Push notifikace nejsou v tomto prohlížeči podporovány nebo není nastaven VAPID klíč."})}),e.jsx(d,{label:"Preference",title:"Typy upozornění",description:"Vyber si, které typy notifikací chceš dostávat.",icon:"sliders-horizontal",children:e.jsxs("div",{style:{display:"grid",gap:12},children:[[{key:"push_task_reminders",label:"Push připomínky úkolů",desc:"Upozornění v čas nastavené připomínky",disabled:!m.subscribed},{key:"push_daily_digest",label:"Push denní souhrn",desc:"Ranní přehled úkolů na dnes",disabled:!m.subscribed},{key:"email_task_reminders",label:"E-mailové připomínky úkolů",desc:"E-mail v čas nastavené připomínky"},{key:"email_daily_digest",label:"E-mailový denní souhrn",desc:"Ranní přehled úkolů, termínů a projektů"}].map(({key:t,label:s,desc:o,disabled:j})=>e.jsxs("div",{className:"ws-mobile-break",style:{alignItems:"center",opacity:j?.56:1},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:s}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:o})]}),e.jsx("button",{className:`btn${y[t]?" primary":""}`,onClick:()=>re({[t]:!y[t]}),disabled:ae||j,style:{flexShrink:0,minWidth:88},children:y[t]?"Zapnuto":"Vypnuto"})]},t)),e.jsxs("div",{className:"ws-mobile-break",style:{alignItems:"center",paddingTop:12,borderTop:"1px solid var(--border)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Čas denního souhrnu"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:"Ve kolik hodin chceš ranní souhrn dostat."})]}),e.jsx("select",{value:y.digest_hour,onChange:t=>re({digest_hour:Number(t.target.value)}),disabled:ae||!y.email_daily_digest&&!y.push_daily_digest,style:{...T,width:112,flexShrink:0},children:Array.from({length:24},(t,s)=>e.jsxs("option",{value:s,children:[String(s).padStart(2,"0"),":00"]},s))})]})]})})]}),W==="app"&&e.jsxs(e.Fragment,{children:[e.jsx(d,{label:"Vzhled",title:"Vizuální režim aplikace",icon:"palette",children:e.jsxs("div",{style:{display:"grid",gap:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:8},children:"Režim"}),e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:[{id:"dark",label:"Tmavý"},{id:"light",label:"Světlý"},{id:"system",label:"Systém"}].map(t=>e.jsx("button",{onClick:()=>{S({themeMode:t.id}),t.id!=="system"&&be(t.id==="dark")},style:B(v.themeMode===t.id),children:t.label},t.id))})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:8},children:"Accent barva"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(132px, 1fr))",gap:8},children:Object.entries(fe||{}).map(([t,s])=>{const o=s[ue?"dark":"light"],j=v.accent===t;return e.jsxs("button",{onClick:()=>S({accent:t}),style:{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,border:`1px solid ${j?o.accent:"var(--border-soft)"}`,background:j?"var(--accent-soft)":"var(--bg-2)",color:j?"var(--accent)":"var(--text-2)",fontWeight:800,fontSize:12,textAlign:"left"},children:[e.jsx("span",{style:{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg, ${o.accent}, ${o.accent2})`,boxShadow:j?"0 0 0 3px var(--accent-soft)":"none",flexShrink:0}}),s.label]},t)})})]})]})}),e.jsx(d,{label:"Rozhraní",title:"Hustota a animace",icon:"sliders-horizontal",children:e.jsxs("div",{style:{display:"grid",gap:14},children:[e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Hustota UI"}),e.jsx("div",{style:{...k,fontSize:12},children:"Kompaktní režim zmenší mezery a zrychlí skenování delších seznamů."})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{onClick:()=>S({density:"comfortable"}),style:B(v.density==="comfortable"),children:"Pohodlná"}),e.jsx("button",{onClick:()=>S({density:"compact"}),style:B(v.density==="compact"),children:"Kompaktní"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Omezit animace"}),e.jsx("div",{style:{...k,fontSize:12},children:"Vypne většinu přechodů a animací v rozhraní."})]}),e.jsx("button",{onClick:()=>S(t=>({reducedMotion:!t.reducedMotion})),style:Re(v.reducedMotion),"aria-label":"Omezit animace",children:e.jsx("span",{style:Te(v.reducedMotion)})})]})]})}),e.jsx(d,{label:"Start aplikace",title:"Výchozí stránka",description:"Tahle stránka se otevře po dalším načtení aplikace.",icon:"home",children:e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:Ve.map(t=>e.jsx("button",{onClick:()=>S({defaultPage:t.id}),style:B(v.defaultPage===t.id),children:t.label},t.id))})}),e.jsx(d,{label:"Workspace branding",title:"Sdílené barvy workspace",icon:"sparkles",children:e.jsx("div",{style:k,children:"Sdílené barvy workspace, ikona a logo patří do dalšího kroku s uložením do backendu. Osobní accent výše je lokální preference a nijak nemění vzhled ostatním členům týmu."})})]})]})]}),x&&b&&e.jsxs(e.Fragment,{children:[e.jsx("div",{onClick:()=>R(null),style:{position:"fixed",inset:0,zIndex:249,background:"rgba(0,0,0,0.45)"}}),e.jsxs("div",{style:{position:"fixed",left:0,right:0,bottom:0,zIndex:250,background:"var(--bg-2)",borderRadius:"16px 16px 0 0",paddingBottom:"calc(20px + env(safe-area-inset-bottom, 0px))",boxShadow:"var(--shadow-lg)"},children:[e.jsx("div",{style:{width:40,height:4,borderRadius:2,background:"var(--border)",margin:"12px auto 8px"}}),e.jsxs("div",{style:{padding:"12px 16px 16px"},children:[e.jsx("p",{style:{fontSize:14,color:"var(--text)",marginBottom:16,fontWeight:600},children:b.type==="leave"?"Opustit workspace?":`Odebrat ${b.member?.email||b.member?.userId?.slice(0,8)||"člena"}?`}),e.jsx("p",{style:{fontSize:13,color:"var(--text-3)",marginBottom:20,lineHeight:1.5},children:b.type==="leave"?"Tato akce je nevratná. Přijdeš o přístup ke všem datům workspace.":"Člen ztratí přístup k workspace."}),e.jsx("button",{onClick:async()=>{b.type==="leave"?await de(!0):await le(b.member,!0),R(null)},style:{width:"100%",padding:"13px",borderRadius:12,background:"#ef4444",color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8},children:b.type==="leave"?"Odejít":"Odebrat"}),e.jsx("button",{onClick:()=>R(null),style:{width:"100%",padding:"12px",borderRadius:12,background:"var(--bg-2)",color:"var(--text-2)",border:"1px solid var(--border)",fontSize:14,fontWeight:600,cursor:"pointer"},children:"Zrušit"})]})]})]})]})}export{Ke as default};
