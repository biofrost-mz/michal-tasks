import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import MZLogo from './MZLogo.jsx'
import { supabase } from '../supabase.js'
import { SectionLabel } from "./ui/index.js";
import { version as APP_VERSION } from "../../package.json";

/* Brand panel showcase: the single most important task, chosen by AI.
   Shows the value ("we sort your day") instead of a generic checklist. */
function FocusCard() {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1.5px solid rgba(251, 191, 36, 0.2)",
        borderRadius: 16,
        padding: "18px 20px",
        marginTop: 36,
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.5)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.boxShadow = "0 18px 44px rgba(251, 191, 36, 0.1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.2)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
      }}
    >
      <style>{`@keyframes zenteroPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.55)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
        <span style={{ color: "#fbbf24", fontSize: 13 }}>✦</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: "#94a3b8", textTransform: "uppercase" }}>
          Plán na dnes · AI
        </span>
      </div>

      {/* The one thing that matters now */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          border: "2px solid #fbbf24",
          boxShadow: "0 0 0 4px rgba(251, 191, 36, 0.08)",
        }} />
        <span style={{ fontSize: 16.5, color: "#f1f5f9", fontWeight: 500 }}>
          Dokončit design přihlášení
        </span>
      </div>

      {/* Why AI put it first */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingLeft: 34 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(251, 191, 36, 0.14)", color: "#fcd34d",
          fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", animation: "zenteroPulse 1.8s ease-in-out infinite" }} />
          Priorita dne · do 17:00
        </span>
        <span style={{ fontSize: 11.5, color: "#64748b" }}>AI to zařadila před 3 další úkoly</span>
      </div>

      {/* What the AI queued next */}
      <div style={{
        marginTop: 16, paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 12, color: "#64748b",
      }}>
        <span style={{ color: "#475569" }}>Pak:</span>
        <span>Code review — notes linking</span>
        <span style={{ color: "#334155" }}>•</span>
        <span>Sync s týmem 15:00</span>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "check-square", label: "Inteligentní úkoly",    desc: "AI navrhuje podúkoly, priority a tagy"   },
  { icon: "file-text",    label: "Propojené poznámky",    desc: "[[wiki-linky]] a AI asistent v editoru"  },
  { icon: "layout",       label: "Kanban & Projekty",     desc: "Drag-to-reorder, bulk akce, přehledy"    },
  { icon: "sun",          label: "Denní plán od AI",      desc: "Každé ráno připravený plán na den"       },
];

const RESEND_COOLDOWN_SECONDS = 45;

// Info links shown in the footer. Empty for now (no live URLs yet) — the links
// row is hidden while this is empty. Add entries once the pages exist, e.g.
// { label: "Podmínky", href: "https://…" }, { label: "Soukromí", href: "https://…" }.
const FOOTER_LINKS = [];

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

function authRedirectUrl(params = {}) {
  const url = new URL(window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const invite = new URLSearchParams(window.location.search).get("invite");
  if (invite && !url.searchParams.has("invite")) url.searchParams.set("invite", invite);
  return url.toString();
}

function passwordChecklist(password) {
  const value = password || "";
  return [
    { label: "alespoň 10 znaků", ok: value.length >= 10 },
    { label: "malé i velké písmeno", ok: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { label: "číslo nebo symbol", ok: /[\d\W_]/.test(value) },
  ];
}

function isPasswordStrongEnough(password) {
  return passwordChecklist(password).every((item) => item.ok);
}

function authErrorMessage(error, mode = "signin") {
  const message = String(error?.message || "").toLowerCase();
  const status = error?.status;

  if (
    status === 400 ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("invalid email or password")
  ) {
    return "Chybné heslo nebo e-mail.";
  }

  if (message.includes("email not confirmed")) {
    return "E-mail ještě není potvrzený. Zkontroluj schránku a potvrzovací odkaz.";
  }

  if (message.includes("already registered") || message.includes("user already registered")) {
    return "Účet s tímto e-mailem už existuje. Zkus se přihlásit.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Příliš mnoho pokusů. Zkus to prosím za chvíli znovu.";
  }

  if (mode === "signup") return "Registrace se nepodařila. Zkontroluj údaje a zkus to znovu.";
  return "Přihlášení se nepodařilo. Zkontroluj e-mail a heslo.";
}

export default function AuthGate({ children }) {
  const { isMobile } = useApp();
  const toast = useToast();

  const [session,  setSession]  = useState(null);
  const [authMode, setAuthMode] = useState("password");    // "magic" | "password"
  const [signMode, setSignMode] = useState("signin");   // "signin" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const [isResetting, setIsResetting] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reset") === "1" || window.location.hash.includes("type=recovery");
  });
  const [mouseCoords, setMouseCoords] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (isMobile) return;
    let rafId = null;
    const target = { x: 50, y: 50 };
    const current = { x: 50, y: 50 };
    const handleMouseMove = (e) => {
      target.x = (e.clientX / window.innerWidth) * 100;
      target.y = (e.clientY / window.innerHeight) * 100;
    };
    // Light trails the cursor with an eased lerp instead of snapping to it.
    const tick = () => {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        current.x += dx * 0.07;
        current.y += dy * 0.07;
        setMouseCoords({ x: current.x, y: current.y });
      }
      rafId = window.requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", handleMouseMove);
    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch(() => setSession(null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setIsResetting(true);
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const sendMagicLink = async (targetEmail = email) => {
    const e = normalizeEmail(targetEmail);
    if (!e) return;
    if (!isValidEmail(e)) { toast("Zadej platnou emailovou adresu.", "error"); return; }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    setSending(false);
    if (error) { toast(error.message || "Chyba", "error"); return; }
    setEmail(e);
    setSent({ type: "magic", email: e });
    setResendIn(RESEND_COOLDOWN_SECONDS);
  };

  const resendSignupConfirmation = async () => {
    if (!sent?.email || resendIn > 0) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sent.email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    setSending(false);
    if (error) { toast(error.message || "E-mail se nepodařilo odeslat", "error"); return; }
    setResendIn(RESEND_COOLDOWN_SECONDS);
    toast("Potvrzovací e-mail byl znovu odeslán", "success");
  };

  const handlePassword = async () => {
    const e = normalizeEmail(email);
    if (!e || !password) return;
    if (!isValidEmail(e)) { toast("Zadej platnou emailovou adresu.", "error"); return; }
    if (signMode === "signup") {
      if (!fullName.trim()) return;
      if (!isPasswordStrongEnough(password)) {
        toast("Zvol silnější heslo podle pravidel níže.", "error");
        return;
      }
      if (password !== passwordConfirm) {
        toast("Hesla se neshodují.", "error");
        return;
      }
    }
    setSending(true);
    let error;
    if (signMode === "signup") {
      ({ error } = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          emailRedirectTo: authRedirectUrl(),
          data: {
            display_name: fullName.trim() || undefined
          }
        }
      }));
      if (!error) {
        setEmail(e);
        setSent({ type: "signup", email: e });
        setResendIn(RESEND_COOLDOWN_SECONDS);
      }
    } else {
      ({ error } = await supabase.auth.signInWithPassword({ email: e, password }));
    }
    setSending(false);
    if (error) toast(authErrorMessage(error, signMode), "error");
  };

  const handleForgotPassword = async () => {
    const e = normalizeEmail(email);
    if (!e) { toast("Zadej nejdřív email", "error"); return; }
    if (!isValidEmail(e)) { toast("Zadej platnou emailovou adresu.", "error"); return; }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: authRedirectUrl({ reset: "1" }),
    });
    setSending(false);
    if (error) { toast("Pokud je e-mail registrovaný, pošleme na něj odkaz pro reset hesla.", "success"); return; }
    toast("Pokud je e-mail registrovaný, pošleme na něj odkaz pro reset hesla.", "success");
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    if (!isPasswordStrongEnough(newPassword)) {
      toast("Nové heslo musí splnit bezpečnostní pravidla níže.", "error");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSending(false);
    if (error) {
      toast(error.message || "Chyba při změně hesla", "error");
    } else {
      toast("Heslo bylo úspěšně změněno!", "success");
      setIsResetting(false);
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  if (session && !isResetting) {
    return <div style={{ height: "100%" }}>{children}</div>;
  }

  const glassCardStyle = {
    background: "rgba(8, 8, 8, 0.65)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    border: "1.5px solid rgba(251, 191, 36, 0.35)",
    borderRadius: "24px",
    padding: isMobile ? "24px" : "48px",
    boxShadow: "0 40px 80px -20px rgba(0, 0, 0, 0.95), 0 0 40px rgba(251, 191, 36, 0.06)",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease, box-shadow 0.4s ease",
  };

  const inputFieldStyle = {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#ffffff",
    width: "100%",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const btnPrimaryStyle = {
    background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
    color: "#000000",
    fontWeight: "700",
    borderRadius: "12px",
    padding: "16px",
    border: "none",
    fontSize: "15px",
    cursor: "pointer",
    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, filter 0.2s ease",
    boxShadow: "0 10px 20px rgba(251, 191, 36, 0.15)",
  };

  const signupPasswordRules = passwordChecklist(password);
  const resetPasswordRules = passwordChecklist(newPassword);
  const signupReady = Boolean(
    email.trim() &&
    password &&
    fullName.trim() &&
    password === passwordConfirm &&
    isPasswordStrongEnough(password)
  );
  const resetReady = Boolean(newPassword && isPasswordStrongEnough(newPassword));
  const handleMobileInputFocus = (event) => {
    if (!isMobile) return;
    const target = event.currentTarget;
    window.setTimeout(() => {
      target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 120);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: isMobile ? "flex-start" : "center",
      minHeight: isMobile ? "var(--app-height, 100svh)" : "100vh",
      height: isMobile ? "var(--app-height, 100svh)" : undefined,
      background: "#030303",
      color: "#ffffff",
      fontFamily: "var(--font-ui)",
      position: "relative",
      overflowX: "hidden",
      overflowY: isMobile ? "auto" : "hidden",
      WebkitOverflowScrolling: "touch",
      overscrollBehaviorY: isMobile ? "contain" : undefined,
      boxSizing: "border-box",
      padding: isMobile ? "24px 16px calc(24px + env(safe-area-inset-bottom))" : "40px 32px",
    }}>
      {/* Interactive mouse glow — softer, smaller, calmer than before */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle 540px at ${mouseCoords.x}% ${mouseCoords.y}%, rgba(251, 191, 36, 0.17) 0%, rgba(249, 115, 22, 0.09) 34%, rgba(139, 92, 246, 0.05) 62%, rgba(0, 0, 0, 0) 100%),
          radial-gradient(circle 720px at 100% 0%, rgba(168, 85, 247, 0.07) 0%, rgba(0, 0, 0, 0) 72%),
          radial-gradient(circle 720px at 0% 100%, rgba(139, 92, 246, 0.06) 0%, rgba(0, 0, 0, 0) 72%),
          #050505
        `,
        zIndex: 0,
        pointerEvents: "none",
      }} />

      {/* Fine film grain — replaces the old dot grid, reads as texture not pattern */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        opacity: 0.035,
        mixBlendMode: "overlay",
        zIndex: 0,
        pointerEvents: "none",
      }} />

      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: "1024px",
        zIndex: 1,
      }}>
        <main style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.1fr",
          gap: isMobile ? "32px" : "56px",
          padding: isMobile ? "16px 8px" : "0",
        }}>
        
        {/* LEFT COLUMN: Brand presentation */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "28px" }}>
          <div>
            {/* Logo */}
            <div 
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", cursor: "pointer", width: "fit-content" }}
              onMouseEnter={e => {
                const logo = e.currentTarget.firstChild;
                logo.style.transform = "rotate(15deg) scale(1.1)";
                logo.style.boxShadow = "0 8px 24px rgba(251, 191, 36, 0.6)";
                const text = e.currentTarget.lastChild;
                text.style.color = "#fbbf24";
                text.style.textShadow = "0 0 10px rgba(251, 191, 36, 0.3)";
              }}
              onMouseLeave={e => {
                const logo = e.currentTarget.firstChild;
                logo.style.transform = "none";
                logo.style.boxShadow = "0 4px 14px rgba(251, 191, 36, 0.4)";
                const text = e.currentTarget.lastChild;
                text.style.color = "#ffffff";
                text.style.textShadow = "none";
              }}
            >
              <MZLogo
                size={34}
                style={{
                  boxShadow: "0 4px 14px rgba(251, 191, 36, 0.4)",
                  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                }}
              />
              <span style={{ fontSize: "20px", fontWeight: "850", letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.3s ease" }}>
                ZENTERO
              </span>
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontSize: isMobile ? "38px" : "52px",
              fontWeight: "800",
              lineHeight: "1.12",
              letterSpacing: "-1.5px",
              margin: "0 0 20px",
            }}>
              Den, ve kterém<br />máte <span style={{ color: "#fbbf24", background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>jasno.</span>
            </h1>

            {/* Description */}
            <p style={{
              color: "#9ca3af",
              fontSize: "15.5px",
              lineHeight: "1.65",
              margin: 0,
              maxWidth: "430px",
            }}>
              Zentero je AI plánovač, který za vás srovná úkoly, poznámky i kalendář. Vy řešíte jen to, co je právě na řadě.
            </p>
          </div>

          {/* Core Feature Bulletins */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ color: "#fbbf24", fontSize: "16px", marginTop: "1px" }}>✦</div>
              <p style={{ fontSize: "13.5px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>
                <strong>AI přehled —</strong> pozná, co je teď důležité a co počká.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ color: "#fbbf24", fontSize: "16px", marginTop: "1px" }}>✦</div>
              <p style={{ fontSize: "13.5px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>
                <strong>Vše pohromadě —</strong> úkoly, kalendář, poznámky i soubory.
              </p>
            </div>
          </div>

          {/* AI focus card (only on desktop) */}
          {!isMobile && <FocusCard />}
        </div>

        {/* RIGHT COLUMN: Glass login card */}
        <div 
          style={glassCardStyle}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-6px)";
            e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.6)";
            e.currentTarget.style.boxShadow = "0 50px 100px -20px rgba(0, 0, 0, 0.95), 0 0 50px rgba(251, 191, 36, 0.15)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.35)";
            e.currentTarget.style.boxShadow = "0 40px 80px -20px rgba(0, 0, 0, 0.95), 0 0 40px rgba(251, 191, 36, 0.06)";
          }}
        >
          {isResetting ? (
            <>
              {/* Header text inside card */}
              <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 6px", color: "#ffffff" }}>
                🔒 Nastavit nové heslo
              </h2>
              <p style={{ fontSize: "13.5px", color: "#9ca3af", margin: "0 0 28px" }}>
                Zadejte své nové přístupové heslo.
              </p>

              <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <SectionLabel style={{ marginBottom: 8 }}>
                    Nové heslo
                  </SectionLabel>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      name="new-password" autoComplete="new-password"
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      style={{ ...inputFieldStyle, paddingRight: "44px" }}
                      onFocus={e => {
                        handleMobileInputFocus(e);
                        e.target.style.borderColor = "#fbbf24";
                        e.target.style.background = "rgba(255, 255, 255, 0.08)";
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                        e.target.style.background = "rgba(255, 255, 255, 0.05)";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9ca3af",
                        display: "flex",
                        padding: "4px",
                      }}
                    >
                      <Icon name={showPw ? "eye-off" : "eye"} size={16} color="currentColor" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6, marginTop: "-10px" }}>
                  {resetPasswordRules.map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: item.ok ? "#86efac" : "#9ca3af" }}>
                      <span>{item.ok ? "✓" : "•"}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!resetReady || sending}
                  style={{ ...btnPrimaryStyle, opacity: !resetReady || sending ? 0.6 : 1 }}
                  onMouseEnter={e => {
                    if (resetReady && !sending) {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.3)";
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.15)";
                  }}
                >
                  {sending ? "Ukládám…" : "Změnit heslo a vstoupit"}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsResetting(false);
                    window.history.replaceState({}, "", window.location.pathname);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9ca3af",
                    fontSize: "13px",
                    cursor: "pointer",
                    marginTop: "4px",
                    textDecoration: "underline",
                  }}
                >
                  Zrušit a odhlásit se
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Header text inside card */}
              <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 6px", color: "#ffffff" }}>
                {signMode === "signup" ? "✨ Založit Zentero zdarma" : "👋 Vítejte zpět"}
              </h2>
              <p style={{ fontSize: "13.5px", color: "#9ca3af", margin: "0 0 28px" }}>
                {signMode === "signup" ? "Za pár vteřin máte vlastní AI workspace." : "Pokračujte tam, kde jste přestali."}
              </p>

              {/* Two-way Auth Mode Switcher */}
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", padding: "4px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                {[["magic", "🪄 Magic link"], ["password", "🔑 Přihlášení"]].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setAuthMode(m); setSent(null); }}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: "8px",
                      border: "none",
                      background: authMode === m ? "rgba(251, 191, 36, 0.12)" : "transparent",
                      color: authMode === m ? "#fbbf24" : "#9ca3af",
                      fontSize: "13px",
                      fontWeight: authMode === m ? "700" : "400",
                      cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      outline: "none",
                    }}
                    onMouseEnter={e => {
                      if (authMode !== m) {
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (authMode !== m) {
                        e.currentTarget.style.color = "#9ca3af";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Form rendering */}
              {sent?.type === "signup" ? (
                <div style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📬</div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: "0 0 6px" }}>Potvrďte svůj e-mail</h3>
                  <p style={{ fontSize: "13px", color: "#9ca3af", lineHeight: "1.6", margin: "0 0 18px" }}>
                    Poslali jsme potvrzovací odkaz na<br />
                    <strong style={{ color: "#fbbf24" }}>{sent.email}</strong><br />
                    Po potvrzení se můžete přihlásit a Zentero vám připraví osobní workspace.
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={resendIn > 0 || sending}
                      onClick={resendSignupConfirmation}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        cursor: resendIn > 0 || sending ? "not-allowed" : "pointer",
                        opacity: resendIn > 0 || sending ? 0.55 : 1,
                      }}
                    >
                      {resendIn > 0 ? `Poslat znovu za ${resendIn}s` : "Poslat znovu"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSent(null); setSignMode("signup"); setPassword(""); setPasswordConfirm(""); }}
                      style={{
                        background: "none",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#9ca3af",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Změnit e-mail
                    </button>
                  </div>
                </div>
              ) : authMode === "magic" ? (
                sent?.type === "magic" ? (
                  /* Sent Confirmation Screen */
                  <div style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>📬</div>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: "0 0 6px" }}>Odkaz odeslán!</h3>
                    <p style={{ fontSize: "13px", color: "#9ca3af", lineHeight: "1.6", margin: "0 0 20px" }}>
                      Zkontrolujte schránku e-mailu<br />
                      <strong style={{ color: "#fbbf24" }}>{sent.email}</strong><br />
                      a kliknutím na odkaz se ihned přihlaste. Odkaz otevřete ideálně ve stejném prohlížeči.
                    </p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={resendIn > 0 || sending}
                      onClick={() => sendMagicLink(sent.email)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        cursor: resendIn > 0 || sending ? "not-allowed" : "pointer",
                        opacity: resendIn > 0 || sending ? 0.55 : 1,
                      }}
                    >
                      {resendIn > 0 ? `Poslat znovu za ${resendIn}s` : "Poslat znovu"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSent(null); setEmail(""); }}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        padding: "8px 20px",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                    >
                      ← Zpět
                    </button>
                    </div>
                  </div>
                ) : (
                  /* Magic Link Form */
                  <form onSubmit={e => { e.preventDefault(); sendMagicLink(); }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <SectionLabel style={{ marginBottom: 8 }}>
                        E-mailová adresa
                      </SectionLabel>
                      <input
                        type="email"
                        placeholder="jmeno@domena.cz"
                        value={email}
                        name="email" autoComplete="email"
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={inputFieldStyle}
                        onFocus={e => {
                          handleMobileInputFocus(e);
                          e.target.style.borderColor = "#fbbf24";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!email.trim() || sending}
                      style={{ ...btnPrimaryStyle, opacity: !email.trim() || sending ? 0.6 : 1 }}
                      onMouseEnter={e => {
                        if (email.trim() && !sending) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.3)";
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.15)";
                      }}
                    >
                      {sending ? "Odesílám…" : "Poslat přihlašovací odkaz"}
                    </button>
                  </form>
                )
              ) : (
                /* Email + Password Form */
                <form onSubmit={e => { e.preventDefault(); handlePassword(); }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Tabs for password signin vs signup */}
                  <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0" }}>
                    {[["signin", "Přihlásit se"], ["signup", "Registrovat"]].map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setSignMode(m); setSent(null); setPasswordConfirm(""); }}
                        style={{
                          background: "none",
                          border: "none",
                          color: signMode === m ? "#fbbf24" : "#9ca3af",
                          fontSize: "13px",
                          fontWeight: signMode === m ? "700" : "400",
                          cursor: "pointer",
                          padding: "0 4px 8px",
                          borderBottom: `2px solid ${signMode === m ? "#fbbf24" : "transparent"}`,
                          marginBottom: "-1px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {signMode === "signup" && (
                    <div>
                      <SectionLabel style={{ marginBottom: 8 }}>
                        Jméno a Příjmení
                      </SectionLabel>
                      <input
                        type="text"
                        placeholder="Michal Zich"
                        value={fullName}
                        name="name" autoComplete="name"
                        onChange={e => setFullName(e.target.value)}
                        required
                        style={inputFieldStyle}
                        onFocus={e => {
                          handleMobileInputFocus(e);
                          e.target.style.borderColor = "#fbbf24";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <SectionLabel style={{ marginBottom: 8 }}>
                      E-mailová adresa
                    </SectionLabel>
                    <input
                      type="email"
                      placeholder="jmeno@domena.cz"
                      value={email}
                      name="email" autoComplete="email"
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={inputFieldStyle}
                      onFocus={e => {
                        handleMobileInputFocus(e);
                        e.target.style.borderColor = "#fbbf24";
                        e.target.style.background = "rgba(255, 255, 255, 0.08)";
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                        e.target.style.background = "rgba(255, 255, 255, 0.05)";
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <SectionLabel>
                        Heslo
                      </SectionLabel>
                      {signMode === "signin" && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer", padding: "0" }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                        >
                          Zapomněli jste?
                        </button>
                      )}
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        name="password" autoComplete={signMode === "signup" ? "new-password" : "current-password"}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ ...inputFieldStyle, paddingRight: "44px" }}
                        onFocus={e => {
                          handleMobileInputFocus(e);
                          e.target.style.borderColor = "#fbbf24";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9ca3af",
                          display: "flex",
                          padding: "4px",
                        }}
                      >
                        <Icon name={showPw ? "eye-off" : "eye"} size={16} color="currentColor" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  {signMode === "signup" && (
                    <>
                      <div>
                        <SectionLabel style={{ marginBottom: 8 }}>
                          Potvrzení hesla
                        </SectionLabel>
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          value={passwordConfirm}
                          name="confirm-password" autoComplete="new-password"
                          onChange={e => setPasswordConfirm(e.target.value)}
                          required
                          style={inputFieldStyle}
                          onFocus={e => {
                            handleMobileInputFocus(e);
                            e.target.style.borderColor = "#fbbf24";
                            e.target.style.background = "rgba(255, 255, 255, 0.08)";
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                            e.target.style.background = "rgba(255, 255, 255, 0.05)";
                          }}
                        />
                        {passwordConfirm && password !== passwordConfirm && (
                          <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 12 }}>Hesla se zatím neshodují.</div>
                        )}
                      </div>

                      <div style={{ display: "grid", gap: 6, marginTop: "-10px" }}>
                        {signupPasswordRules.map((item) => (
                          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: item.ok ? "#86efac" : "#9ca3af" }}>
                            <span>{item.ok ? "✓" : "•"}</span>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={signMode === "signup" ? !signupReady || sending : !email.trim() || !password || sending}
                    style={{ ...btnPrimaryStyle, opacity: (signMode === "signup" ? !signupReady : !email.trim() || !password) || sending ? 0.6 : 1 }}
                    onMouseEnter={e => {
                      if ((signMode === "signup" ? signupReady : email.trim() && password) && !sending) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.3)";
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.15)";
                    }}
                  >
                    {sending ? "Čekejte…" : signMode === "signup" ? "Registrovat se do Zentero" : "Přihlásit se do Zentero"}
                  </button>
                </form>
              )}

              {/* Toggle between login or free creation */}
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <p style={{ fontSize: "13.5px", color: "#6b7280", margin: 0 }}>
                  {signMode === "signup" ? (
                    <>
                      Již máte účet?{" "}
                      <button
                        type="button"
                        onClick={() => { setSignMode("signin"); setAuthMode("password"); }}
                        style={{ background: "none", border: "none", color: "#ffffff", fontWeight: "600", cursor: "pointer", padding: "0" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#fbbf24"}
                        onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
                      >
                        Přihlásit se
                      </button>
                    </>
                  ) : (
                    <>
                      Ještě nemáte účet?{" "}
                      <button
                        type="button"
                        onClick={() => { setSignMode("signup"); setAuthMode("password"); }}
                        style={{ background: "none", border: "none", color: "#ffffff", fontWeight: "600", cursor: "pointer", padding: "0" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#fbbf24"}
                        onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
                      >
                        Vytvořit zdarma
                      </button>
                    </>
                  )}
                </p>
              </div>
            </>
          )}

        </div>

      </main>
      </div>

      {/* Footer: info links + meta (copyright · version · author) */}
      <footer style={{
        width: "100%",
        maxWidth: "1024px",
        marginTop: isMobile ? "24px" : "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        zIndex: 1,
      }}>
        {/* Info links (hidden until FOOTER_LINKS has entries) */}
        {FOOTER_LINKS.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap", justifyContent: "center" }}>
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12.5px", color: "#8b8f98", textDecoration: "none", transition: "color 0.2s ease" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fbbf24"}
                onMouseLeave={e => e.currentTarget.style.color = "#8b8f98"}
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap", justifyContent: "center", fontSize: "12px", color: "#5b6070" }}>
          <a
            href="https://zichmichal.cz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "7px", textDecoration: "none", color: "inherit", transition: "opacity 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <MZLogo size={16} />
            <span style={{ fontWeight: "500" }}>Michal Zich</span>
          </a>
          <span style={{ color: "#3a3e48" }}>·</span>
          <span>© {new Date().getFullYear()} Zentero</span>
          <span style={{ color: "#3a3e48" }}>·</span>
          <span>v{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
