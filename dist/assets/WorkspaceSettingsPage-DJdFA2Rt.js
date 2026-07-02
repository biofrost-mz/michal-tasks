import{a2 as ke,V as i,$ as se,a8 as Be,a3 as De,q as Ze,K as e,I as K,p as ue,r as Ke,z as He,J as f}from"./index-C3mSKO6X.js";import{D as qe,f as Je,s as Ge}from"./notificationPreferencesService-C9fhCt1c.js";const Ye=void 0;function Qe(a){const o="=".repeat((4-a.length%4)%4),d=(a+o).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(d),m=>m.charCodeAt(0))}function Xe(){const{userId:a,activeWorkspaceId:o}=ke(),[d,m]=i.useState(!1),[c,g]=i.useState("default"),[P,k]=i.useState(!1),[E,W]=i.useState(!1);i.useEffect(()=>{const l="serviceWorker"in navigator&&"PushManager"in window&&!1;m(l)},[]),i.useEffect(()=>{!d||!a||navigator.serviceWorker.ready.then(async l=>{const h=await l.pushManager.getSubscription();k(!!h)}).catch(l=>{console.warn("Push: failed to check subscription status",l)})},[d,a]);const H=i.useCallback(async()=>{if(!(!d||!a||!o)){W(!0);try{const l=await Notification.requestPermission();if(g(l),l!=="granted")return;const h=await navigator.serviceWorker.ready;let j=await h.pushManager.getSubscription();j||(j=await h.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Qe(Ye)}));const{endpoint:u,keys:w}=j.toJSON(),{error:L}=await se.from("push_subscriptions").upsert({user_id:a,workspace_id:o,endpoint:u,p256dh:w.p256dh,auth:w.auth},{onConflict:"user_id,endpoint"});if(L)throw new Error("Notifikace nelze uložit: "+L.message);k(!0)}catch(l){throw console.error("Push subscribe:",l),l}finally{W(!1)}}},[d,a,o]),$=i.useCallback(async()=>{if(!(!d||!a)){W(!0);try{const h=await(await navigator.serviceWorker.ready).pushManager.getSubscription();if(h){const{endpoint:j}=h.toJSON();await h.unsubscribe(),await se.from("push_subscriptions").delete().eq("user_id",a).eq("endpoint",j)}k(!1)}catch(l){console.error("Push unsubscribe:",l)}finally{W(!1)}}},[d,a]);return{supported:d,permission:c,subscribed:P,loading:E,subscribe:H,unsubscribe:$}}const fe={owner:"#f59e0b",admin:"#3b82f6",member:"#22c55e",viewer:"#8b95a5"},et=[{id:"dashboard",label:"Přehled"},{id:"tasks",label:"Úkoly"},{id:"quick-todos",label:"Rychlý seznam"},{id:"projects",label:"Projekty"},{id:"timeline",label:"Plán"},{id:"notes",label:"Poznámky"}],tt=[{id:"account",label:"Účet",icon:"user"},{id:"workspace",label:"Workspace",icon:"settings"},{id:"members",label:"Členové",icon:"users"},{id:"notifications",label:"Notifikace",icon:"bell"},{id:"app",label:"Aplikace",icon:"sliders-horizontal"}];function st(a){return fe[a]||fe.member}function p({label:a,title:o,description:d,icon:m,tone:c="default",children:g,action:P,className:k=""}){const E=c==="danger"?{borderColor:"rgba(239,68,68,.28)",background:"linear-gradient(180deg, rgba(239,68,68,.045), var(--surface))"}:c==="accent"?{borderColor:"color-mix(in srgb, var(--accent) 28%, var(--border-soft))",background:"linear-gradient(180deg, var(--accent-soft), var(--surface) 58%)"}:null;return e.jsxs("section",{className:`ws-card ${k}`,style:E||void 0,children:[e.jsxs("div",{className:"ws-card-head",children:[e.jsxs("div",{className:"ws-card-title-wrap",children:[m&&e.jsx("span",{className:`ws-card-icon ${c}`,children:e.jsx(K,{name:m,size:15,color:"currentColor",strokeWidth:2})}),e.jsxs("div",{children:[a&&e.jsx("div",{className:`ws-section-label ${c}`,children:a}),o&&e.jsx("div",{className:"ws-card-title",children:o}),d&&e.jsx("div",{className:"ws-card-desc",children:d})]})]}),P&&e.jsx("div",{className:"ws-card-action",children:P})]}),g&&e.jsx("div",{className:"ws-card-body",children:g})]})}function we({children:a,tone:o="default"}){return e.jsx("span",{className:`ws-meta-pill ${o}`,children:a})}function ve({children:a}){return e.jsx("div",{className:"ws-form-hint",children:a})}const at={owner:"vlastník",admin:"správce",member:"člen",viewer:"pozorovatel"};function F(a){return at[a]||a}function ye(a){const o=(a||"").trim().split(/\s+/);return o.length>=2?(o[0][0]+o[1][0]).toUpperCase():(a||"?").slice(0,2).toUpperCase()}function nt({initialTab:a="workspace"}){const{workspaces:o,activeWorkspaceId:d,workspaceMembers:m,workspaceRole:c,userId:g,renameWorkspace:P,updateMemberRole:k,removeMember:E,leaveWorkspace:W,generateInviteLink:H,fetchWorkspaceInvites:$,revokeInvite:l,setPage:h,prevPage:j,isMobile:u,userEmail:w,logout:L,updateProfileDisplayName:je,dk:ze,setDk:Ne,uiSettings:z,updateUiSettings:I,accentThemes:Se,isSystemAdmin:Ce}=ke(),r=Be(),q=De(),x=Xe(),O=o.find(t=>t.id===d),v=m.find(t=>t.userId===g),[R,ae]=i.useState(a),[Pe,U]=i.useState(!1),[J,G]=i.useState(O?.name??""),[Y,Q]=i.useState([]),[V,ie]=i.useState("member"),[X,B]=i.useState(""),[We,re]=i.useState(!1),[N,ne]=i.useState(v?.displayName||""),[ee,oe]=i.useState(!1),[Ie,Oe]=i.useState(!1),[_,le]=i.useState(qe),[de,ce]=i.useState(!1),[y,M]=i.useState(null),T=c==="owner",te=Ze(c),D=i.useMemo(()=>T?["member","viewer","admin"]:["member","viewer"],[T]);i.useEffect(()=>{te&&(re(!0),$().then(Q).catch(()=>{}).finally(()=>re(!1)))},[d,te,$]),i.useEffect(()=>{D.includes(V)||(ie(D[0]),B(""))},[V,D]),i.useEffect(()=>{ae(a)},[a]),i.useEffect(()=>{G(O?.name??"")},[O?.name]),i.useEffect(()=>{ne(v?.displayName||"")},[v?.displayName]),i.useEffect(()=>{g&&Je(g).then(le).catch(()=>{})},[g]);const pe=async t=>{let s;le(n=>(s={...n,...t},s)),ce(!0);try{await Ge(g,s)}catch(n){r(f(n,"Nepodařilo se uložit nastavení"),"error")}finally{ce(!1)}},me=async()=>{if(N.trim()){oe(!0);try{await je(N.trim()),r("Jméno uloženo","success")}catch(t){r(f(t,"Chyba"),"error")}finally{oe(!1)}}},Re=async()=>{const{error:t}=await se.auth.resetPasswordForEmail(w,{redirectTo:`${window.location.origin}?reset=1`});if(t){r(f(t,"Chyba"),"error");return}Oe(!0),r("Odkaz pro reset hesla odeslán na email","success")},_e=async()=>{await q("Odhlásit se?",{confirmLabel:"Odhlásit",confirmColor:"#3b82f6"})&&await L()},xe=async()=>{if(J.trim())try{await P(J.trim()),U(!1),r("Přejmenováno","success")}catch(t){r(f(t,"Chyba"),"error")}},Te=async(t,s)=>{try{await k(t,s),r("Role aktualizována","success")}catch(n){r(f(n,"Chyba"),"error")}},he=async(t,s=!1)=>{if(!(!s&&!await q(`Odebrat ${t.email||t.userId.slice(0,8)} z workspace?`,{confirmLabel:"Odebrat",confirmColor:"#f59e0b"})))try{await E(t.userId),r("Člen odebrán","success")}catch(n){r(f(n,"Chyba"),"error")}},ge=async(t=!1)=>{if(!(!t&&!await q("Opravdu chceš opustit tento workspace?",{confirmLabel:"Opustit",confirmColor:"#f59e0b"})))try{await W(),h("dashboard"),r("Opustil jsi workspace","success")}catch(s){r(f(s,"Chyba"),"error")}},Ee=async()=>{try{const t=await H(V);B(t);const s=await $();Q(s),r("Odkaz vygenerován","success")}catch(t){r(f(t,"Chyba"),"error")}},$e=async t=>{try{await l(t),Q(s=>s.filter(n=>n.id!==t)),r("Pozvánka zrušena","success")}catch(s){r(f(s,"Chyba"),"error")}},Me=t=>t.displayName||t.email||`${t.userId.slice(0,8)}…`,Ae=t=>ye(t.displayName||t.email||t.userId||"?"),Fe=ye(v?.displayName||w||"?"),A={width:"100%",padding:u?"11px 12px":"9px 12px",borderRadius:11,border:"1px solid var(--border-soft)",background:"var(--bg-2)",color:"var(--text)",fontSize:u?16:13,outline:"none"},S={fontSize:13,color:"var(--text-3)",lineHeight:1.55},Z=t=>({padding:u?"9px 11px":"8px 11px",borderRadius:10,border:`1px solid ${t?"color-mix(in srgb, var(--accent) 38%, transparent)":"var(--border-soft)"}`,background:t?"var(--accent-soft)":"var(--bg-2)",color:t?"var(--accent)":"var(--text-2)",fontSize:12,fontWeight:t?850:650}),Le=t=>({width:46,height:26,borderRadius:999,border:`1px solid ${t?"color-mix(in srgb, var(--accent) 36%, transparent)":"var(--border-soft)"}`,background:t?"var(--accent-soft)":"var(--bg-2)",position:"relative",padding:0,flexShrink:0,cursor:"pointer",transition:"border-color .16s ease, background .16s ease"}),Ue=t=>({position:"absolute",top:3,left:t?23:3,width:18,height:18,borderRadius:"50%",background:t?"var(--accent)":"var(--text-3)",transition:"left .16s ease, background .16s ease"});return e.jsxs("div",{className:"content workspace-settings-page",children:[e.jsx("style",{children:`
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
            padding:14px 14px calc(88px + max(6px, var(--safe-area-inset-bottom, 0px)))!important;
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
            grid-template-columns:minmax(0,1fr) auto;
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
          .ws-member-row > div[style*="flex: 1"]{min-width:0!important;}
          .ws-member-row > div[style*="flex: 1"] > div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .ws-member-row select{width:100%!important;}
          .ws-member-actions{display:grid!important;grid-template-columns:minmax(0,1fr) 42px;width:calc(100% - 40px);gap:7px!important;margin-left:40px;min-width:0;}
          .ws-member-actions .btn{width:42px;padding-left:0!important;padding-right:0!important;}
          .ws-invite-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;}
          .ws-invite-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .ws-invite-row .btn{grid-column:1 / -1;width:100%;min-height:38px;}
          .ws-card + .ws-card { margin-top: 10px; }
          .ws-section-label { margin-bottom: 8px; margin-top: 4px; }
        }
        @media(max-width:380px){
          .workspace-settings-page{padding-left:12px!important;padding-right:12px!important;}
          .ws-settings-tabs{margin-left:-12px;margin-right:-12px;padding-left:12px;padding-right:12px;}
          .ws-settings-email{max-width:135px;}
          .ws-form-row{grid-template-columns:1fr;}
          .ws-form-row .btn{width:100%;}
          .ws-member-actions{width:100%;margin-left:0;}
        }
      `}),e.jsxs("div",{className:"ws-settings-hero",children:[e.jsx("button",{className:"ws-back",onClick:()=>h(j||"dashboard"),children:"← Zpět"}),e.jsx("h1",{className:"ws-settings-title",children:"Nastavení"}),e.jsxs("div",{className:"ws-settings-meta",children:[e.jsx(we,{children:O?.name||"Workspace"}),e.jsx(we,{tone:"role",children:F(c)}),e.jsx("span",{className:"ws-settings-email",children:w})]})]}),e.jsxs("div",{className:"ws-settings-layout",children:[e.jsx("aside",{className:"ws-settings-tabs",children:e.jsx("div",{className:"ws-settings-tabs-inner",children:tt.map(t=>{const s=R===t.id;return e.jsxs("button",{onClick:()=>ae(t.id),className:`ws-tab ${s?"active":""}`,children:[e.jsx(K,{name:t.icon,size:15,color:"currentColor",strokeWidth:1.9}),e.jsx("span",{children:t.label})]},t.id)})})}),e.jsxs("div",{className:"ws-settings-panels",children:[R==="account"&&e.jsxs(e.Fragment,{children:[e.jsxs("section",{className:"ws-card ws-profile-card",children:[e.jsx("div",{className:"ws-avatar",children:Fe}),e.jsxs("div",{style:{minWidth:0,flex:1},children:[e.jsx("div",{className:"ws-profile-name",children:v?.displayName||"Bez jména"}),e.jsx("div",{className:"ws-profile-mail",children:w}),e.jsx("span",{className:"ws-profile-role",children:F(v?.role??c)})]})]}),e.jsx(p,{label:"Zobrazované jméno",description:"Tohle jméno vidí ostatní členové workspace.",icon:"user",children:e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{value:N,onChange:t=>ne(t.target.value),onKeyDown:t=>t.key==="Enter"&&me(),placeholder:"Tvoje jméno...",style:{...A,flex:1,minWidth:220}}),e.jsx("button",{className:"btn primary",onClick:me,disabled:!N.trim()||ee||N.trim()===(v?.displayName||""),style:{opacity:!N.trim()||ee||N.trim()===(v?.displayName||"")?.5:1},children:ee?"Ukládám…":"Uložit"})]})}),Ce&&e.jsx(p,{label:"Správa systému",title:"Administrace systému Zentero",description:"Globální správa uživatelů, monitoring, logy a obnovení smazaných dat z koše.",icon:"settings",tone:"accent",action:e.jsxs("button",{className:"btn primary ws-system-action",onClick:()=>h("admin"),children:[e.jsx(K,{name:"settings",size:14,color:"currentColor"})," Otevřít"]})}),e.jsx(p,{label:"Heslo",title:"Obnova hesla",description:"Pošleme odkaz pro bezpečný reset hesla na e-mail účtu.",icon:"key-round",children:Ie?e.jsxs("div",{style:{fontSize:13,color:"var(--green)"},children:["Odkaz pro reset hesla byl odeslán na ",w,"."]}):e.jsx("button",{className:"btn",onClick:Re,children:"Odeslat odkaz pro reset hesla"})}),e.jsx(p,{label:"Odhlášení",title:"Odhlásit se z aplikace",description:"Ukončí aktuální relaci na tomto zařízení.",icon:"log-out",tone:"danger",children:e.jsx("button",{className:"btn danger ws-danger-button",onClick:_e,children:"Odhlásit se"})})]}),R==="workspace"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Název workspace",icon:"briefcase",children:Pe?e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{autoFocus:!0,value:J,onChange:t=>G(t.target.value),onKeyDown:t=>{t.key==="Enter"&&xe(),t.key==="Escape"&&U(!1)},style:{...A,flex:1,minWidth:220}}),e.jsx("button",{className:"btn primary",onClick:xe,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>U(!1),children:"Zrušit"})]}):e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{style:{fontFamily:"var(--font-ui)",fontSize:u?19:21,fontWeight:650,lineHeight:1.2,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:O?.name||"Bez názvu"}),e.jsxs(ve,{children:[m.length," členů · tvoje role: ",F(c)]})]}),T&&e.jsx("button",{className:"btn",onClick:()=>{U(!0),G(O?.name??"")},children:"Přejmenovat"})]})}),e.jsxs(p,{label:"Nebezpečná zóna",title:"Opustit workspace",description:"Akce se týká jen tvého členství v tomto workspace.",icon:"alert-triangle",tone:"danger",children:[!T&&e.jsx("button",{className:"btn danger ws-danger-button",onClick:u?()=>M({type:"leave"}):ge,children:"Opustit workspace"}),T&&m.length===1&&e.jsx("div",{style:S,children:"Workspace nelze opustit, jsi jediný člen."}),T&&m.length>1&&e.jsx("div",{style:S,children:"Jako owner nemůžeš workspace opustit. Nejprve předej ownership."})]})]}),R==="members"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:`Členové (${m.length})`,title:"Tým workspace",description:"Správa rolí a přístupů v aktuálním workspace.",icon:"users",children:e.jsx("div",{className:"ws-member-list",children:m.map(t=>{const s=st(t.role),n=["admin","member","viewer"].filter(C=>ue(c,C)),b=ue(c,t.role),be=Ke(c,t.role,{isSelf:t.userId===g}),Ve=b||be;return e.jsxs("div",{className:"ws-member-row interactive-row",children:[e.jsx("div",{className:"ws-member-avatar",style:{background:`${s}22`,border:`1px solid ${s}55`,color:s},children:Ae(t)}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:13.5,color:"var(--text)",fontWeight:750,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:Me(t)}),t.email&&t.displayName&&e.jsx("div",{style:{fontSize:11.5,color:"var(--text-3)"},children:t.email})]}),Ve?e.jsxs("div",{className:"ws-member-actions",style:{display:"flex",alignItems:"center",gap:6},children:[b?e.jsx("select",{value:t.role,onChange:C=>Te(t.userId,C.target.value),style:{...A,width:90,padding:"6px 8px",fontSize:12},children:n.map(C=>e.jsx("option",{value:C,children:C},C))}):e.jsx("span",{className:"ws-role-badge",style:{border:`1px solid ${s}44`,color:s,background:`${s}18`},children:F(t.role)}),be&&e.jsx("button",{className:"btn danger",style:{padding:"7px 10px"},onClick:()=>u?M({type:"remove",member:t}):he(t),children:e.jsx(K,{name:"trash",size:12,color:"currentColor",strokeWidth:2})})]}):e.jsx("span",{className:"ws-role-badge",style:{border:`1px solid ${s}44`,color:s,background:`${s}18`},children:F(t.role)})]},t.userId)})})}),te&&e.jsxs(p,{label:"Pozvat člena",title:"Pozvánka do workspace",description:"Vygeneruj odkaz s rolí a pošli ho novému členovi.",icon:"user-plus",children:[e.jsx("div",{className:"chips",style:{marginBottom:12},children:D.map(t=>e.jsx("button",{className:`chip ${V===t?"active":""}`,onClick:()=>{ie(t),B("")},children:t},t))}),X?e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:8},children:"Odkaz platí 7 dní."}),e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{readOnly:!0,value:X,style:{...A,flex:1,minWidth:240},onClick:t=>t.target.select()}),e.jsx("button",{className:"btn primary",onClick:()=>{navigator.clipboard.writeText(X),r("Zkopírováno","success")},children:"Kopírovat"}),e.jsx("button",{className:"btn",onClick:()=>{B("")},children:"Nový"})]})]}):e.jsx("button",{className:"btn primary",onClick:Ee,children:"Vygenerovat odkaz"}),e.jsx(ve,{children:We?"Načítám pozvánky...":`Čekající pozvánky: ${Y.length}`}),Y.length>0&&e.jsx("div",{className:"ws-invite-list",style:{marginTop:8},children:Y.map(t=>e.jsxs("div",{className:"ws-invite-row interactive-row",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text)"},children:t.role}),e.jsxs("span",{style:{fontSize:11.5,color:"var(--text-3)"},children:["vyprší ",He(t.expires_at,{day:"numeric",month:"numeric",year:"numeric"})]}),e.jsx("span",{style:{flex:1}}),e.jsx("button",{className:"btn danger",style:{padding:"5px 9px"},onClick:()=>$e(t.id),children:"Zrušit"})]},t.id))})]})]}),R==="notifications"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Notifikace",title:"Push upozornění",description:"Upozornění na blížící se termíny a připomínky.",icon:"bell",children:x.supported?x.permission==="denied"?e.jsx("div",{style:S,children:"Notifikace jsou blokovány. Povol je v nastavení prohlížeče a stránku obnov."}):e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:x.subscribed?"Notifikace jsou zapnuté":"Push notifikace"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:x.subscribed?"Upozorníme tě na blížící se termíny a připomínky.":"Dostávej upozornění i když je app zavřená."})]}),e.jsx("button",{className:`btn${x.subscribed?"":" primary"}`,onClick:()=>{(x.subscribed?x.unsubscribe:x.subscribe)().catch(s=>r(s?.message||"Nepodařilo se změnit nastavení notifikací","error"))},disabled:x.loading,style:{flexShrink:0,minWidth:120},children:x.loading?"…":x.subscribed?"Vypnout":"Zapnout"})]}):e.jsx("div",{style:S,children:"Push notifikace nejsou v tomto prohlížeči podporovány nebo není nastaven VAPID klíč."})}),e.jsx(p,{label:"Preference",title:"Typy upozornění",description:"Vyber si, které typy notifikací chceš dostávat.",icon:"sliders-horizontal",children:e.jsxs("div",{style:{display:"grid",gap:12},children:[[{key:"push_task_reminders",label:"Push připomínky úkolů",desc:"Upozornění v čas nastavené připomínky",disabled:!x.subscribed},{key:"push_daily_digest",label:"Push denní souhrn",desc:"Ranní přehled úkolů na dnes",disabled:!x.subscribed},{key:"email_task_reminders",label:"E-mailové připomínky úkolů",desc:"E-mail v čas nastavené připomínky"},{key:"email_daily_digest",label:"E-mailový denní souhrn",desc:"Ranní přehled úkolů, termínů a projektů"}].map(({key:t,label:s,desc:n,disabled:b})=>e.jsxs("div",{className:"ws-mobile-break",style:{alignItems:"center",opacity:b?.56:1},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:s}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:n})]}),e.jsx("button",{className:`btn${_[t]?" primary":""}`,onClick:()=>pe({[t]:!_[t]}),disabled:de||b,style:{flexShrink:0,minWidth:88},children:_[t]?"Zapnuto":"Vypnuto"})]},t)),e.jsxs("div",{className:"ws-mobile-break",style:{alignItems:"center",paddingTop:12,borderTop:"1px solid var(--border)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Čas denního souhrnu"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:"Ve kolik hodin chceš ranní souhrn dostat (středoevropský čas, UTC+1/+2)."})]}),e.jsx("select",{value:_.digest_hour,onChange:t=>pe({digest_hour:Number(t.target.value)}),disabled:de||!_.email_daily_digest&&!_.push_daily_digest,style:{...A,width:112,flexShrink:0},children:Array.from({length:24},(t,s)=>e.jsxs("option",{value:s,children:[String(s).padStart(2,"0"),":00"]},s))})]})]})})]}),R==="app"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Vzhled",title:"Vizuální režim aplikace",icon:"palette",children:e.jsxs("div",{style:{display:"grid",gap:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:8},children:"Režim"}),e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:[{id:"dark",label:"Tmavý"},{id:"light",label:"Světlý"},{id:"system",label:"Systém"}].map(t=>e.jsx("button",{onClick:()=>{I({themeMode:t.id}),t.id!=="system"&&Ne(t.id==="dark")},style:Z(z.themeMode===t.id),children:t.label},t.id))})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:8},children:"Accent barva"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(132px, 1fr))",gap:8},children:Object.entries(Se||{}).map(([t,s])=>{const n=s[ze?"dark":"light"],b=z.accent===t;return e.jsxs("button",{onClick:()=>I({accent:t}),style:{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,border:`1px solid ${b?n.accent:"var(--border-soft)"}`,background:b?"var(--accent-soft)":"var(--bg-2)",color:b?"var(--accent)":"var(--text-2)",fontWeight:800,fontSize:12,textAlign:"left"},children:[e.jsx("span",{style:{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg, ${n.accent}, ${n.accent2})`,boxShadow:b?"0 0 0 3px var(--accent-soft)":"none",flexShrink:0}}),s.label]},t)})})]})]})}),e.jsx(p,{label:"Rozhraní",title:"Hustota a animace",icon:"sliders-horizontal",children:e.jsxs("div",{style:{display:"grid",gap:14},children:[e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Hustota UI"}),e.jsx("div",{style:{...S,fontSize:12},children:"Kompaktní režim zmenší mezery a zrychlí skenování delších seznamů."})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{onClick:()=>I({density:"comfortable"}),style:Z(z.density==="comfortable"),children:"Pohodlná"}),e.jsx("button",{onClick:()=>I({density:"compact"}),style:Z(z.density==="compact"),children:"Kompaktní"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Omezit animace"}),e.jsx("div",{style:{...S,fontSize:12},children:"Vypne většinu přechodů a animací v rozhraní."})]}),e.jsx("button",{onClick:()=>I(t=>({reducedMotion:!t.reducedMotion})),style:Le(z.reducedMotion),"aria-label":"Omezit animace",children:e.jsx("span",{style:Ue(z.reducedMotion)})})]})]})}),e.jsx(p,{label:"Start aplikace",title:"Výchozí stránka",description:"Tahle stránka se otevře po dalším načtení aplikace.",icon:"home",children:e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:et.map(t=>e.jsx("button",{onClick:()=>I({defaultPage:t.id}),style:Z(z.defaultPage===t.id),children:t.label},t.id))})}),e.jsx(p,{label:"Workspace branding",title:"Sdílené barvy workspace",icon:"sparkles",action:e.jsx("span",{style:{fontSize:11,fontWeight:750,fontFamily:"var(--mono)",color:"var(--text-3)",background:"var(--bg-2)",border:"1px solid var(--border-soft)",borderRadius:6,padding:"3px 8px",letterSpacing:".06em",textTransform:"uppercase"},children:"V přípravě"}),children:e.jsx("div",{style:S,children:"Logo, ikona a sdílená accent barva workspace pro celý tým — uložení na backend bude součástí dalšího vydání. Osobní accent nahoře je tvoje lokální preference a ostatní ji nevidí."})})]})]})]}),u&&y&&e.jsxs(e.Fragment,{children:[e.jsx("div",{onClick:()=>M(null),style:{position:"fixed",inset:0,zIndex:99998,background:"rgba(0,0,0,0.45)"}}),e.jsxs("div",{style:{position:"fixed",left:0,right:0,bottom:0,zIndex:99999,background:"var(--bg-2)",borderRadius:"16px 16px 0 0",paddingBottom:"calc(20px + var(--safe-area-inset-bottom, 0px))",boxShadow:"var(--shadow-lg)"},children:[e.jsx("div",{style:{width:40,height:4,borderRadius:2,background:"var(--border)",margin:"12px auto 8px"}}),e.jsxs("div",{style:{padding:"12px 16px 16px"},children:[e.jsx("p",{style:{fontSize:14,color:"var(--text)",marginBottom:16,fontWeight:600},children:y.type==="leave"?"Opustit workspace?":`Odebrat ${y.member?.email||y.member?.userId?.slice(0,8)||"člena"}?`}),e.jsx("p",{style:{fontSize:13,color:"var(--text-3)",marginBottom:20,lineHeight:1.5},children:y.type==="leave"?"Tato akce je nevratná. Přijdeš o přístup ke všem datům workspace.":"Člen ztratí přístup k workspace."}),e.jsx("button",{onClick:async()=>{y.type==="leave"?await ge(!0):await he(y.member,!0),M(null)},style:{width:"100%",padding:"13px",borderRadius:12,background:"#ef4444",color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8},children:y.type==="leave"?"Odejít":"Odebrat"}),e.jsx("button",{onClick:()=>M(null),style:{width:"100%",padding:"12px",borderRadius:12,background:"var(--bg-2)",color:"var(--text-2)",border:"1px solid var(--border)",fontSize:14,fontWeight:600,cursor:"pointer"},children:"Zrušit"})]})]})]})]})}export{nt as default};
