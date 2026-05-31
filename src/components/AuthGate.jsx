import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import MZLogo from './MZLogo.jsx'
import { supabase } from '../supabase.js'

/* Decorative mock card shown in the brand panel */
function MockTaskCard() {
  const [tasks, setTasks] = React.useState([
    { done: true,  text: "Zkontrolovat pull requesty",  priority: "#22c55e" },
    { done: true,  text: "Schůzka s týmem (10:00)",     priority: "#f59e0b" },
    { done: false, text: "Dokončit design přihlášení",  priority: "#ef4444" },
    { done: false, text: "Code review — notes linking", priority: "#e3a850" },
  ]);

  const handleToggle = (index) => {
    setTasks(prev => prev.map((t, idx) => idx === index ? { ...t, done: !t.done } : t));
  };

  return (
    <div 
      style={{
        background: "rgba(255, 255, 255, 0.03)", 
        border: "1.5px solid rgba(251, 191, 36, 0.2)",
        borderRadius: 14, 
        padding: "14px 16px", 
        marginTop: 36,
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.55)";
        e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.boxShadow = "0 15px 40px rgba(251, 191, 36, 0.1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.2)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
        Dnešní plán · AI
      </div>
      {tasks.map((item, i) => (
        <div 
          key={i} 
          onClick={() => handleToggle(i)}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10, 
            padding: "8px 0", 
            borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            borderRadius: "6px",
            userSelect: "none",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
            e.currentTarget.style.paddingLeft = "6px";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.paddingLeft = "0px";
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 5, flexShrink: 0,
            background: item.done ? item.priority + "25" : "transparent",
            border: `2px solid ${item.done ? item.priority : "rgba(255,255,255,0.2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <span style={{
              fontSize: 9,
              color: item.priority,
              fontWeight: 900,
              transform: `scale(${item.done ? 1 : 0})`,
              opacity: item.done ? 1 : 0,
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
            }}>✓</span>
          </div>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.priority, flexShrink: 0 }} />
          <span style={{
            position: "relative",
            fontSize: 12.5,
            color: item.done ? "#64748b" : "#cbd5e1",
            transition: "color 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            flex: 1,
            userSelect: "none",
          }}>
            {item.text}
            <span style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: "1px",
              background: "currentColor",
              transform: `scaleX(${item.done ? 1 : 0})`,
              transformOrigin: "left",
              transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              opacity: 0.6,
            }} />
          </span>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: "check-square", label: "Inteligentní úkoly",    desc: "AI navrhuje podúkoly, priority a tagy"   },
  { icon: "file-text",    label: "Propojené poznámky",    desc: "[[wiki-linky]] a AI asistent v editoru"  },
  { icon: "layout",       label: "Kanban & Projekty",     desc: "Drag-to-reorder, bulk akce, přehledy"    },
  { icon: "sun",          label: "Denní plán od AI",      desc: "Každé ráno připravený plán na den"       },
];

export default function AuthGate({ children }) {
  const { isMobile } = useApp();
  const toast = useToast();

  const [session,  setSession]  = useState(null);
  const [authMode, setAuthMode] = useState("password");    // "magic" | "password"
  const [signMode, setSignMode] = useState("signin");   // "signin" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [isResetting, setIsResetting] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reset") === "1" || window.location.hash.includes("type=recovery");
  });
  const [mouseCoords, setMouseCoords] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (isMobile) return;
    let rafId = null;
    let nextCoords = { x: 50, y: 50 };
    const handleMouseMove = (e) => {
      nextCoords = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        setMouseCoords(nextCoords);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setIsResetting(true);
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const sendMagicLink = async () => {
    const e = email.trim();
    if (!e) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) { toast(error.message || "Chyba", "error"); return; }
    setSent(true);
  };

  const handlePassword = async () => {
    const e = email.trim();
    if (!e || !password) return;
    setSending(true);
    let error;
    if (signMode === "signup") {
      ({ error } = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          data: {
            display_name: fullName.trim() || undefined
          }
        }
      }));
      if (!error) toast("Účet vytvořen! Zkontroluj email pro potvrzení.", "success");
    } else {
      ({ error } = await supabase.auth.signInWithPassword({ email: e, password }));
    }
    setSending(false);
    if (error) toast(error.message || "Chyba přihlášení", "error");
  };

  const handleForgotPassword = async () => {
    const e = email.trim();
    if (!e) { toast("Zadej nejdřív email", "error"); return; }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    setSending(false);
    if (error) { toast(error.message || "Chyba", "error"); return; }
    toast("Odkaz pro reset hesla odeslán", "success");
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
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

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#030303",
      color: "#ffffff",
      fontFamily: "var(--font-ui)",
      position: "relative",
      overflow: "hidden",
      boxSizing: "border-box",
      padding: isMobile ? "24px 16px" : "40px 32px",
    }}>
      {/* Interactive Aurora Mouse Glow Background with parralax depth */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle 850px at ${mouseCoords.x}% ${mouseCoords.y}%, rgba(251, 191, 36, 0.42) 0%, rgba(249, 115, 22, 0.24) 30%, rgba(139, 92, 246, 0.12) 60%, rgba(0, 0, 0, 0) 100%),
          radial-gradient(circle 900px at ${100 - mouseCoords.x}% ${100 - mouseCoords.y}%, rgba(168, 85, 247, 0.24) 0%, rgba(236, 72, 153, 0.10) 40%, rgba(0, 0, 0, 0) 100%),
          radial-gradient(circle 800px at 100% 0%, rgba(251, 191, 36, 0.08) 0%, rgba(0, 0, 0, 0) 80%),
          radial-gradient(circle 800px at 0% 100%, rgba(139, 92, 246, 0.08) 0%, rgba(0, 0, 0, 0) 80%),
          #030303
        `,
        zIndex: 0,
        pointerEvents: "none",
        transition: "background 0.1s ease-out",
      }} />

      {/* Grid Pattern Overlay - Golden and localized */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "radial-gradient(rgba(251, 191, 36, 0.38) 1.5px, transparent 1.5px)",
        backgroundSize: "28px 24px",
        opacity: 1.0,
        zIndex: 0,
        pointerEvents: "none",
        maskImage: "radial-gradient(ellipse at 50% 50%, black 50%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 50%, transparent 100%)",
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
              <div style={{
                width: "34px",
                height: "34px",
                background: "#fbbf24",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                color: "#000000",
                fontSize: "19px",
                boxShadow: "0 4px 14px rgba(251, 191, 36, 0.4)",
                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}>
                Z
              </div>
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
              Vraťte svému dni <span style={{ color: "#fbbf24", background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>řád.</span>
            </h1>

            {/* Description */}
            <p style={{
              color: "#9ca3af",
              fontSize: "15.5px",
              lineHeight: "1.65",
              margin: 0,
              maxWidth: "420px",
            }}>
              Zentero není jen úkolovník. Je to váš digitální mozek, který automatizuje chaos a nechává vám prostor na to podstatné.
            </p>
          </div>

          {/* Core Feature Bulletins */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ color: "#fbbf24", fontSize: "16px", marginTop: "1px" }}>✦</div>
              <p style={{ fontSize: "13.5px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>
                <strong>AI Prioritizace:</strong> Zentero ví, co hoří a co počká.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ color: "#fbbf24", fontSize: "16px", marginTop: "1px" }}>✦</div>
              <p style={{ fontSize: "13.5px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>
                <strong>Vše na jednom místě:</strong> Kalendář, poznámky i soubory.
              </p>
            </div>
          </div>

          {/* Decorative Mock Task Card (only on desktop) */}
          {!isMobile && <MockTaskCard />}
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
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
                    Nové heslo
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      style={{ ...inputFieldStyle, paddingRight: "44px" }}
                      onFocus={e => {
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

                <button
                  type="submit"
                  disabled={!newPassword || sending}
                  style={{ ...btnPrimaryStyle, opacity: !newPassword || sending ? 0.6 : 1 }}
                  onMouseEnter={e => {
                    if (newPassword && !sending) {
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
                {signMode === "signup" ? "✨ Vytvořit účet zdarma" : "👋 Vítejte zpět"}
              </h2>
              <p style={{ fontSize: "13.5px", color: "#9ca3af", margin: "0 0 28px" }}>
                {signMode === "signup" ? "Začněte pracovat chytřeji ještě dnes." : "Pokračujte tam, kde jste včera skončili."}
              </p>

              {/* Two-way Auth Mode Switcher */}
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", padding: "4px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                {[["magic", "🪄 Magic link"], ["password", "🔑 Přihlášení"]].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setAuthMode(m); setSent(false); }}
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
              {authMode === "magic" ? (
                sent ? (
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
                      <strong style={{ color: "#fbbf24" }}>{email}</strong><br />
                      a kliknutím na odkaz se ihned přihlaste.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSent(false); setEmail(""); }}
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
                ) : (
                  /* Magic Link Form */
                  <form onSubmit={e => { e.preventDefault(); sendMagicLink(); }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
                        E-mailová adresa
                      </label>
                      <input
                        type="email"
                        placeholder="jmeno@domena.cz"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={inputFieldStyle}
                        onFocus={e => {
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
                        onClick={() => setSignMode(m)}
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
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
                        Jméno a Příjmení
                      </label>
                      <input
                        type="text"
                        placeholder="Michal Zich"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                        style={inputFieldStyle}
                        onFocus={e => {
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
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
                      E-mailová adresa
                    </label>
                    <input
                      type="email"
                      placeholder="jmeno@domena.cz"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={inputFieldStyle}
                      onFocus={e => {
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
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>
                        Heslo
                      </label>
                      {signMode === "signin" && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "11px", cursor: "pointer", padding: "0" }}
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
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ ...inputFieldStyle, paddingRight: "44px" }}
                        onFocus={e => {
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

                  <button
                    type="submit"
                    disabled={!email.trim() || !password || (signMode === "signup" && !fullName.trim()) || sending}
                    style={{ ...btnPrimaryStyle, opacity: !email.trim() || !password || (signMode === "signup" && !fullName.trim()) || sending ? 0.6 : 1 }}
                    onMouseEnter={e => {
                      if (email.trim() && password && (signMode !== "signup" || fullName.trim()) && !sending) {
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

      {/* Footer section - smaller, single-line, borderless, no arrow */}
      <footer style={{
        width: "100%",
        maxWidth: "1024px",
        marginTop: isMobile ? "24px" : "40px",
        display: "flex",
        justifyContent: "center",
        zIndex: 1,
      }}>
        <a
          href="https://zichmicha.cz"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            transition: "opacity 0.2s ease",
            fontSize: "12px",
            color: "#6b7280",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <MZLogo size={18} />
          <span style={{ fontWeight: "500" }}>Vytvořil Michal Zich · zichmicha.cz</span>
        </a>
      </footer>
    </div>
  );
}
