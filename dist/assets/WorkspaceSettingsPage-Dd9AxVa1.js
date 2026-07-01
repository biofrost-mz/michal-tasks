import{a1 as ye,U as i,Z as te,a7 as Ve,a2 as Be,q as De,J as e,I as Z,p as be,r as Ze,z as Ke}from"./index-BNZqs6bW.js";import{D as He,f as qe,s as Je}from"./notificationPreferencesService-C7nT6yPT.js";const Ge=void 0;function Ye(a){const n="=".repeat((4-a.length%4)%4),l=(a+n).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(l),m=>m.charCodeAt(0))}function Qe(){const{userId:a,activeWorkspaceId:n}=ye(),[l,m]=i.useState(!1),[d,g]=i.useState("default"),[C,y]=i.useState(!1),[T,P]=i.useState(!1);i.useEffect(()=>{const o="serviceWorker"in navigator&&"PushManager"in window&&!1;m(o)},[]),i.useEffect(()=>{!l||!a||navigator.serviceWorker.ready.then(async o=>{const h=await o.pushManager.getSubscription();y(!!h)}).catch(o=>{console.warn("Push: failed to check subscription status",o)})},[l,a]);const K=i.useCallback(async()=>{if(!(!l||!a||!n)){P(!0);try{const o=await Notification.requestPermission();if(g(o),o!=="granted")return;const h=await navigator.serviceWorker.ready;let k=await h.pushManager.getSubscription();k||(k=await h.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Ye(Ge)}));const{endpoint:u,keys:f}=k.toJSON(),{error:U}=await te.from("push_subscriptions").upsert({user_id:a,workspace_id:n,endpoint:u,p256dh:f.p256dh,auth:f.auth},{onConflict:"user_id,endpoint"});if(U)throw new Error("Notifikace nelze uložit: "+U.message);y(!0)}catch(o){throw console.error("Push subscribe:",o),o}finally{P(!1)}}},[l,a,n]),E=i.useCallback(async()=>{if(!(!l||!a)){P(!0);try{const h=await(await navigator.serviceWorker.ready).pushManager.getSubscription();if(h){const{endpoint:k}=h.toJSON();await h.unsubscribe(),await te.from("push_subscriptions").delete().eq("user_id",a).eq("endpoint",k)}y(!1)}catch(o){console.error("Push unsubscribe:",o)}finally{P(!1)}}},[l,a]);return{supported:l,permission:d,subscribed:C,loading:T,subscribe:K,unsubscribe:E}}const ue={owner:"#f59e0b",admin:"#3b82f6",member:"#22c55e",viewer:"#8b95a5"},Xe=[{id:"dashboard",label:"Přehled"},{id:"tasks",label:"Úkoly"},{id:"quick-todos",label:"Rychlý seznam"},{id:"projects",label:"Projekty"},{id:"timeline",label:"Plán"},{id:"notes",label:"Poznámky"}],et=[{id:"account",label:"Účet",icon:"user"},{id:"workspace",label:"Workspace",icon:"settings"},{id:"members",label:"Členové",icon:"users"},{id:"notifications",label:"Notifikace",icon:"bell"},{id:"app",label:"Aplikace",icon:"sliders-horizontal"}];function tt(a){return ue[a]||ue.member}function p({label:a,title:n,description:l,icon:m,tone:d="default",children:g,action:C,className:y=""}){const T=d==="danger"?{borderColor:"rgba(239,68,68,.28)",background:"linear-gradient(180deg, rgba(239,68,68,.045), var(--surface))"}:d==="accent"?{borderColor:"color-mix(in srgb, var(--accent) 28%, var(--border-soft))",background:"linear-gradient(180deg, var(--accent-soft), var(--surface) 58%)"}:null;return e.jsxs("section",{className:`ws-card ${y}`,style:T||void 0,children:[e.jsxs("div",{className:"ws-card-head",children:[e.jsxs("div",{className:"ws-card-title-wrap",children:[m&&e.jsx("span",{className:`ws-card-icon ${d}`,children:e.jsx(Z,{name:m,size:15,color:"currentColor",strokeWidth:2})}),e.jsxs("div",{children:[a&&e.jsx("div",{className:`ws-section-label ${d}`,children:a}),n&&e.jsx("div",{className:"ws-card-title",children:n}),l&&e.jsx("div",{className:"ws-card-desc",children:l})]})]}),C&&e.jsx("div",{className:"ws-card-action",children:C})]}),g&&e.jsx("div",{className:"ws-card-body",children:g})]})}function fe({children:a,tone:n="default"}){return e.jsx("span",{className:`ws-meta-pill ${n}`,children:a})}function we({children:a}){return e.jsx("div",{className:"ws-form-hint",children:a})}const st={owner:"vlastník",admin:"správce",member:"člen",viewer:"pozorovatel"};function A(a){return st[a]||a}function ve(a){const n=(a||"").trim().split(/\s+/);return n.length>=2?(n[0][0]+n[1][0]).toUpperCase():(a||"?").slice(0,2).toUpperCase()}function rt({initialTab:a="workspace"}){const{workspaces:n,activeWorkspaceId:l,workspaceMembers:m,workspaceRole:d,userId:g,renameWorkspace:C,updateMemberRole:y,removeMember:T,leaveWorkspace:P,generateInviteLink:K,fetchWorkspaceInvites:E,revokeInvite:o,setPage:h,prevPage:k,isMobile:u,userEmail:f,logout:U,updateProfileDisplayName:ke,dk:je,setDk:ze,uiSettings:j,updateUiSettings:W,accentThemes:Ne,isSystemAdmin:Se}=ye(),r=Ve(),H=Be(),x=Qe(),I=n.find(t=>t.id===l),w=m.find(t=>t.userId===g),[O,se]=i.useState(a),[Ce,L]=i.useState(!1),[q,J]=i.useState(I?.name??""),[G,Y]=i.useState([]),[F,ae]=i.useState("member"),[Q,V]=i.useState(""),[Pe,ie]=i.useState(!1),[z,re]=i.useState(w?.displayName||""),[X,ne]=i.useState(!1),[We,Ie]=i.useState(!1),[R,oe]=i.useState(He),[le,de]=i.useState(!1),[v,$]=i.useState(null),_=d==="owner",ee=De(d),B=i.useMemo(()=>_?["member","viewer","admin"]:["member","viewer"],[_]);i.useEffect(()=>{ee&&(ie(!0),E().then(Y).catch(()=>{}).finally(()=>ie(!1)))},[l,ee,E]),i.useEffect(()=>{B.includes(F)||(ae(B[0]),V(""))},[F,B]),i.useEffect(()=>{se(a)},[a]),i.useEffect(()=>{J(I?.name??"")},[I?.name]),i.useEffect(()=>{re(w?.displayName||"")},[w?.displayName]),i.useEffect(()=>{g&&qe(g).then(oe).catch(()=>{})},[g]);const ce=async t=>{let s;oe(c=>(s={...c,...t},s)),de(!0);try{await Je(g,s)}catch{r("Nepodařilo se uložit nastavení","error")}finally{de(!1)}},pe=async()=>{if(z.trim()){ne(!0);try{await ke(z.trim()),r("Jméno uloženo","success")}catch(t){r(t.message||"Chyba","error")}finally{ne(!1)}}},Oe=async()=>{const{error:t}=await te.auth.resetPasswordForEmail(f,{redirectTo:`${window.location.origin}?reset=1`});if(t){r(t.message||"Chyba","error");return}Ie(!0),r("Odkaz pro reset hesla odeslán na email","success")},Re=async()=>{await H("Odhlásit se?",{confirmLabel:"Odhlásit",confirmColor:"#3b82f6"})&&await U()},me=async()=>{if(q.trim())try{await C(q.trim()),L(!1),r("Přejmenováno","success")}catch(t){r(t.message||"Chyba","error")}},_e=async(t,s)=>{try{await y(t,s),r("Role aktualizována","success")}catch(c){r(c.message||"Chyba","error")}},xe=async(t,s=!1)=>{if(!(!s&&!await H(`Odebrat ${t.email||t.userId.slice(0,8)} z workspace?`,{confirmLabel:"Odebrat",confirmColor:"#f59e0b"})))try{await T(t.userId),r("Člen odebrán","success")}catch(c){r(c.message||"Chyba","error")}},he=async(t=!1)=>{if(!(!t&&!await H("Opravdu chceš opustit tento workspace?",{confirmLabel:"Opustit",confirmColor:"#f59e0b"})))try{await P(),h("dashboard"),r("Opustil jsi workspace","success")}catch(s){r(s.message||"Chyba","error")}},Te=async()=>{try{const t=await K(F);V(t);const s=await E();Y(s),r("Odkaz vygenerován","success")}catch(t){r(t.message||"Chyba","error")}},Ee=async t=>{try{await o(t),Y(s=>s.filter(c=>c.id!==t)),r("Pozvánka zrušena","success")}catch(s){r(s.message||"Chyba","error")}},$e=t=>t.displayName||t.email||`${t.userId.slice(0,8)}…`,Me=t=>ve(t.displayName||t.email||t.userId||"?"),Ae=ve(w?.displayName||f||"?"),M={width:"100%",padding:u?"11px 12px":"9px 12px",borderRadius:11,border:"1px solid var(--border-soft)",background:"var(--bg-2)",color:"var(--text)",fontSize:u?16:13,outline:"none"},N={fontSize:13,color:"var(--text-3)",lineHeight:1.55},D=t=>({padding:u?"9px 11px":"8px 11px",borderRadius:10,border:`1px solid ${t?"color-mix(in srgb, var(--accent) 38%, transparent)":"var(--border-soft)"}`,background:t?"var(--accent-soft)":"var(--bg-2)",color:t?"var(--accent)":"var(--text-2)",fontSize:12,fontWeight:t?850:650}),Ue=t=>({width:46,height:26,borderRadius:999,border:`1px solid ${t?"color-mix(in srgb, var(--accent) 36%, transparent)":"var(--border-soft)"}`,background:t?"var(--accent-soft)":"var(--bg-2)",position:"relative",padding:0,flexShrink:0,cursor:"pointer",transition:"border-color .16s ease, background .16s ease"}),Le=t=>({position:"absolute",top:3,left:t?23:3,width:18,height:18,borderRadius:"50%",background:t?"var(--accent)":"var(--text-3)",transition:"left .16s ease, background .16s ease"});return e.jsxs("div",{className:"content workspace-settings-page",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"ws-settings-hero",children:[e.jsx("button",{className:"ws-back",onClick:()=>h(k||"dashboard"),children:"← Zpět"}),e.jsx("h1",{className:"ws-settings-title",children:"Nastavení"}),e.jsxs("div",{className:"ws-settings-meta",children:[e.jsx(fe,{children:I?.name||"Workspace"}),e.jsx(fe,{tone:"role",children:A(d)}),e.jsx("span",{className:"ws-settings-email",children:f})]})]}),e.jsxs("div",{className:"ws-settings-layout",children:[e.jsx("aside",{className:"ws-settings-tabs",children:e.jsx("div",{className:"ws-settings-tabs-inner",children:et.map(t=>{const s=O===t.id;return e.jsxs("button",{onClick:()=>se(t.id),className:`ws-tab ${s?"active":""}`,children:[e.jsx(Z,{name:t.icon,size:15,color:"currentColor",strokeWidth:1.9}),e.jsx("span",{children:t.label})]},t.id)})})}),e.jsxs("div",{className:"ws-settings-panels",children:[O==="account"&&e.jsxs(e.Fragment,{children:[e.jsxs("section",{className:"ws-card ws-profile-card",children:[e.jsx("div",{className:"ws-avatar",children:Ae}),e.jsxs("div",{style:{minWidth:0,flex:1},children:[e.jsx("div",{className:"ws-profile-name",children:w?.displayName||"Bez jména"}),e.jsx("div",{className:"ws-profile-mail",children:f}),e.jsx("span",{className:"ws-profile-role",children:A(w?.role??d)})]})]}),e.jsx(p,{label:"Zobrazované jméno",description:"Tohle jméno vidí ostatní členové workspace.",icon:"user",children:e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{value:z,onChange:t=>re(t.target.value),onKeyDown:t=>t.key==="Enter"&&pe(),placeholder:"Tvoje jméno...",style:{...M,flex:1,minWidth:220}}),e.jsx("button",{className:"btn primary",onClick:pe,disabled:!z.trim()||X||z.trim()===(w?.displayName||""),style:{opacity:!z.trim()||X||z.trim()===(w?.displayName||"")?.5:1},children:X?"Ukládám…":"Uložit"})]})}),Se&&e.jsx(p,{label:"Správa systému",title:"Administrace systému Zentero",description:"Globální správa uživatelů, monitoring, logy a obnovení smazaných dat z koše.",icon:"settings",tone:"accent",action:e.jsxs("button",{className:"btn primary ws-system-action",onClick:()=>h("admin"),children:[e.jsx(Z,{name:"settings",size:14,color:"currentColor"})," Otevřít"]})}),e.jsx(p,{label:"Heslo",title:"Obnova hesla",description:"Pošleme odkaz pro bezpečný reset hesla na e-mail účtu.",icon:"key-round",children:We?e.jsxs("div",{style:{fontSize:13,color:"var(--green)"},children:["Odkaz pro reset hesla byl odeslán na ",f,"."]}):e.jsx("button",{className:"btn",onClick:Oe,children:"Odeslat odkaz pro reset hesla"})}),e.jsx(p,{label:"Odhlášení",title:"Odhlásit se z aplikace",description:"Ukončí aktuální relaci na tomto zařízení.",icon:"log-out",tone:"danger",children:e.jsx("button",{className:"btn danger ws-danger-button",onClick:Re,children:"Odhlásit se"})})]}),O==="workspace"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Název workspace",icon:"briefcase",children:Ce?e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{autoFocus:!0,value:q,onChange:t=>J(t.target.value),onKeyDown:t=>{t.key==="Enter"&&me(),t.key==="Escape"&&L(!1)},style:{...M,flex:1,minWidth:220}}),e.jsx("button",{className:"btn primary",onClick:me,children:"Uložit"}),e.jsx("button",{className:"btn",onClick:()=>L(!1),children:"Zrušit"})]}):e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{style:{fontFamily:"var(--font-ui)",fontSize:u?19:21,fontWeight:650,lineHeight:1.2,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:I?.name||"Bez názvu"}),e.jsxs(we,{children:[m.length," členů · tvoje role: ",A(d)]})]}),_&&e.jsx("button",{className:"btn",onClick:()=>{L(!0),J(I?.name??"")},children:"Přejmenovat"})]})}),e.jsxs(p,{label:"Nebezpečná zóna",title:"Opustit workspace",description:"Akce se týká jen tvého členství v tomto workspace.",icon:"alert-triangle",tone:"danger",children:[!_&&e.jsx("button",{className:"btn danger ws-danger-button",onClick:u?()=>$({type:"leave"}):he,children:"Opustit workspace"}),_&&m.length===1&&e.jsx("div",{style:N,children:"Workspace nelze opustit, jsi jediný člen."}),_&&m.length>1&&e.jsx("div",{style:N,children:"Jako owner nemůžeš workspace opustit. Nejprve předej ownership."})]})]}),O==="members"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:`Členové (${m.length})`,title:"Tým workspace",description:"Správa rolí a přístupů v aktuálním workspace.",icon:"users",children:e.jsx("div",{className:"ws-member-list",children:m.map(t=>{const s=tt(t.role),c=["admin","member","viewer"].filter(S=>be(d,S)),b=be(d,t.role),ge=Ze(d,t.role,{isSelf:t.userId===g}),Fe=b||ge;return e.jsxs("div",{className:"ws-member-row interactive-row",children:[e.jsx("div",{className:"ws-member-avatar",style:{background:`${s}22`,border:`1px solid ${s}55`,color:s},children:Me(t)}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:13.5,color:"var(--text)",fontWeight:750,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:$e(t)}),t.email&&t.displayName&&e.jsx("div",{style:{fontSize:11.5,color:"var(--text-3)"},children:t.email})]}),Fe?e.jsxs("div",{className:"ws-member-actions",style:{display:"flex",alignItems:"center",gap:6},children:[b?e.jsx("select",{value:t.role,onChange:S=>_e(t.userId,S.target.value),style:{...M,width:90,padding:"6px 8px",fontSize:12},children:c.map(S=>e.jsx("option",{value:S,children:S},S))}):e.jsx("span",{className:"ws-role-badge",style:{border:`1px solid ${s}44`,color:s,background:`${s}18`},children:A(t.role)}),ge&&e.jsx("button",{className:"btn danger",style:{padding:"7px 10px"},onClick:()=>u?$({type:"remove",member:t}):xe(t),children:e.jsx(Z,{name:"trash",size:12,color:"currentColor",strokeWidth:2})})]}):e.jsx("span",{className:"ws-role-badge",style:{border:`1px solid ${s}44`,color:s,background:`${s}18`},children:A(t.role)})]},t.userId)})})}),ee&&e.jsxs(p,{label:"Pozvat člena",title:"Pozvánka do workspace",description:"Vygeneruj odkaz s rolí a pošli ho novému členovi.",icon:"user-plus",children:[e.jsx("div",{className:"chips",style:{marginBottom:12},children:B.map(t=>e.jsx("button",{className:`chip ${F===t?"active":""}`,onClick:()=>{ae(t),V("")},children:t},t))}),Q?e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginBottom:8},children:"Odkaz platí 7 dní."}),e.jsxs("div",{className:"ws-form-row",children:[e.jsx("input",{readOnly:!0,value:Q,style:{...M,flex:1,minWidth:240},onClick:t=>t.target.select()}),e.jsx("button",{className:"btn primary",onClick:()=>{navigator.clipboard.writeText(Q),r("Zkopírováno","success")},children:"Kopírovat"}),e.jsx("button",{className:"btn",onClick:()=>{V("")},children:"Nový"})]})]}):e.jsx("button",{className:"btn primary",onClick:Te,children:"Vygenerovat odkaz"}),e.jsx(we,{children:Pe?"Načítám pozvánky...":`Čekající pozvánky: ${G.length}`}),G.length>0&&e.jsx("div",{className:"ws-invite-list",style:{marginTop:8},children:G.map(t=>e.jsxs("div",{className:"ws-invite-row interactive-row",children:[e.jsx("span",{style:{fontFamily:"var(--mono)",fontSize:11,color:"var(--text)"},children:t.role}),e.jsxs("span",{style:{fontSize:11.5,color:"var(--text-3)"},children:["vyprší ",Ke(t.expires_at,{day:"numeric",month:"numeric",year:"numeric"})]}),e.jsx("span",{style:{flex:1}}),e.jsx("button",{className:"btn danger",style:{padding:"5px 9px"},onClick:()=>Ee(t.id),children:"Zrušit"})]},t.id))})]})]}),O==="notifications"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Notifikace",title:"Push upozornění",description:"Upozornění na blížící se termíny a připomínky.",icon:"bell",children:x.supported?x.permission==="denied"?e.jsx("div",{style:N,children:"Notifikace jsou blokovány. Povol je v nastavení prohlížeče a stránku obnov."}):e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:x.subscribed?"Notifikace jsou zapnuté":"Push notifikace"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:x.subscribed?"Upozorníme tě na blížící se termíny a připomínky.":"Dostávej upozornění i když je app zavřená."})]}),e.jsx("button",{className:`btn${x.subscribed?"":" primary"}`,onClick:()=>{(x.subscribed?x.unsubscribe:x.subscribe)().catch(s=>r(s?.message||"Nepodařilo se změnit nastavení notifikací","error"))},disabled:x.loading,style:{flexShrink:0,minWidth:120},children:x.loading?"…":x.subscribed?"Vypnout":"Zapnout"})]}):e.jsx("div",{style:N,children:"Push notifikace nejsou v tomto prohlížeči podporovány nebo není nastaven VAPID klíč."})}),e.jsx(p,{label:"Preference",title:"Typy upozornění",description:"Vyber si, které typy notifikací chceš dostávat.",icon:"sliders-horizontal",children:e.jsxs("div",{style:{display:"grid",gap:12},children:[[{key:"push_task_reminders",label:"Push připomínky úkolů",desc:"Upozornění v čas nastavené připomínky",disabled:!x.subscribed},{key:"push_daily_digest",label:"Push denní souhrn",desc:"Ranní přehled úkolů na dnes",disabled:!x.subscribed},{key:"email_task_reminders",label:"E-mailové připomínky úkolů",desc:"E-mail v čas nastavené připomínky"},{key:"email_daily_digest",label:"E-mailový denní souhrn",desc:"Ranní přehled úkolů, termínů a projektů"}].map(({key:t,label:s,desc:c,disabled:b})=>e.jsxs("div",{className:"ws-mobile-break",style:{alignItems:"center",opacity:b?.56:1},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:s}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:c})]}),e.jsx("button",{className:`btn${R[t]?" primary":""}`,onClick:()=>ce({[t]:!R[t]}),disabled:le||b,style:{flexShrink:0,minWidth:88},children:R[t]?"Zapnuto":"Vypnuto"})]},t)),e.jsxs("div",{className:"ws-mobile-break",style:{alignItems:"center",paddingTop:12,borderTop:"1px solid var(--border)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Čas denního souhrnu"}),e.jsx("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:2},children:"Ve kolik hodin chceš ranní souhrn dostat (středoevropský čas, UTC+1/+2)."})]}),e.jsx("select",{value:R.digest_hour,onChange:t=>ce({digest_hour:Number(t.target.value)}),disabled:le||!R.email_daily_digest&&!R.push_daily_digest,style:{...M,width:112,flexShrink:0},children:Array.from({length:24},(t,s)=>e.jsxs("option",{value:s,children:[String(s).padStart(2,"0"),":00"]},s))})]})]})})]}),O==="app"&&e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Vzhled",title:"Vizuální režim aplikace",icon:"palette",children:e.jsxs("div",{style:{display:"grid",gap:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:8},children:"Režim"}),e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:[{id:"dark",label:"Tmavý"},{id:"light",label:"Světlý"},{id:"system",label:"Systém"}].map(t=>e.jsx("button",{onClick:()=>{W({themeMode:t.id}),t.id!=="system"&&ze(t.id==="dark")},style:D(j.themeMode===t.id),children:t.label},t.id))})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:8},children:"Accent barva"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(132px, 1fr))",gap:8},children:Object.entries(Ne||{}).map(([t,s])=>{const c=s[je?"dark":"light"],b=j.accent===t;return e.jsxs("button",{onClick:()=>W({accent:t}),style:{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,border:`1px solid ${b?c.accent:"var(--border-soft)"}`,background:b?"var(--accent-soft)":"var(--bg-2)",color:b?"var(--accent)":"var(--text-2)",fontWeight:800,fontSize:12,textAlign:"left"},children:[e.jsx("span",{style:{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg, ${c.accent}, ${c.accent2})`,boxShadow:b?"0 0 0 3px var(--accent-soft)":"none",flexShrink:0}}),s.label]},t)})})]})]})}),e.jsx(p,{label:"Rozhraní",title:"Hustota a animace",icon:"sliders-horizontal",children:e.jsxs("div",{style:{display:"grid",gap:14},children:[e.jsxs("div",{className:"ws-mobile-break",children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Hustota UI"}),e.jsx("div",{style:{...N,fontSize:12},children:"Kompaktní režim zmenší mezery a zrychlí skenování delších seznamů."})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{onClick:()=>W({density:"comfortable"}),style:D(j.density==="comfortable"),children:"Pohodlná"}),e.jsx("button",{onClick:()=>W({density:"compact"}),style:D(j.density==="compact"),children:"Kompaktní"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:13.5,fontWeight:800,color:"var(--text)"},children:"Omezit animace"}),e.jsx("div",{style:{...N,fontSize:12},children:"Vypne většinu přechodů a animací v rozhraní."})]}),e.jsx("button",{onClick:()=>W(t=>({reducedMotion:!t.reducedMotion})),style:Ue(j.reducedMotion),"aria-label":"Omezit animace",children:e.jsx("span",{style:Le(j.reducedMotion)})})]})]})}),e.jsx(p,{label:"Start aplikace",title:"Výchozí stránka",description:"Tahle stránka se otevře po dalším načtení aplikace.",icon:"home",children:e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:Xe.map(t=>e.jsx("button",{onClick:()=>W({defaultPage:t.id}),style:D(j.defaultPage===t.id),children:t.label},t.id))})}),e.jsx(p,{label:"Workspace branding",title:"Sdílené barvy workspace",icon:"sparkles",action:e.jsx("span",{style:{fontSize:11,fontWeight:750,fontFamily:"var(--mono)",color:"var(--text-3)",background:"var(--bg-2)",border:"1px solid var(--border-soft)",borderRadius:6,padding:"3px 8px",letterSpacing:".06em",textTransform:"uppercase"},children:"V přípravě"}),children:e.jsx("div",{style:N,children:"Logo, ikona a sdílená accent barva workspace pro celý tým — uložení na backend bude součástí dalšího vydání. Osobní accent nahoře je tvoje lokální preference a ostatní ji nevidí."})})]})]})]}),u&&v&&e.jsxs(e.Fragment,{children:[e.jsx("div",{onClick:()=>$(null),style:{position:"fixed",inset:0,zIndex:99998,background:"rgba(0,0,0,0.45)"}}),e.jsxs("div",{style:{position:"fixed",left:0,right:0,bottom:0,zIndex:99999,background:"var(--bg-2)",borderRadius:"16px 16px 0 0",paddingBottom:"calc(20px + var(--safe-area-inset-bottom, 0px))",boxShadow:"var(--shadow-lg)"},children:[e.jsx("div",{style:{width:40,height:4,borderRadius:2,background:"var(--border)",margin:"12px auto 8px"}}),e.jsxs("div",{style:{padding:"12px 16px 16px"},children:[e.jsx("p",{style:{fontSize:14,color:"var(--text)",marginBottom:16,fontWeight:600},children:v.type==="leave"?"Opustit workspace?":`Odebrat ${v.member?.email||v.member?.userId?.slice(0,8)||"člena"}?`}),e.jsx("p",{style:{fontSize:13,color:"var(--text-3)",marginBottom:20,lineHeight:1.5},children:v.type==="leave"?"Tato akce je nevratná. Přijdeš o přístup ke všem datům workspace.":"Člen ztratí přístup k workspace."}),e.jsx("button",{onClick:async()=>{v.type==="leave"?await he(!0):await xe(v.member,!0),$(null)},style:{width:"100%",padding:"13px",borderRadius:12,background:"#ef4444",color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8},children:v.type==="leave"?"Odejít":"Odebrat"}),e.jsx("button",{onClick:()=>$(null),style:{width:"100%",padding:"12px",borderRadius:12,background:"var(--bg-2)",color:"var(--text-2)",border:"1px solid var(--border)",fontSize:14,fontWeight:600,cursor:"pointer"},children:"Zrušit"})]})]})]})]})}export{rt as default};
