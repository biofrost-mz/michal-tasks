import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import MZLogo from './MZLogo.jsx'
import { supabase } from '../supabase.js'

/* Decorative mock card shown in the brand panel */
function MockTaskCard() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: "14px 16px", marginTop: 36,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
        Dnešní plán · AI
      </div>
      {[
        { done: true,  text: "Zkontrolovat pull requesty",  priority: "#22c55e" },
        { done: true,  text: "Schůzka s týmem (10:00)",     priority: "#f59e0b" },
        { done: false, text: "Dokončit design přihlášení",  priority: "#ef4444" },
        { done: false, text: "Code review — notes linking", priority: "#e3a850" },
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
          <div style={{
            width: 16, height: 16, borderRadius: 5, flexShrink: 0,
            background: item.done ? item.priority + "30" : "transparent",
            border: `2px solid ${item.done ? item.priority : "rgba(255,255,255,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {item.done && <span style={{ fontSize: 9, color: item.priority, fontWeight: 900 }}>✓</span>}
          </div>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.priority, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: item.done ? "#4a5568" : "#cbd5e1", textDecoration: item.done ? "line-through" : "none", flex: 1 }}>
            {item.text}
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
  const { t, isMobile } = useApp();
  const toast = useToast();

  const [session,  setSession]  = useState(null);
  const [authMode, setAuthMode] = useState("magic");    // "magic" | "password"
  const [signMode, setSignMode] = useState("signin");   // "signin" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
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
      ({ error } = await supabase.auth.signUp({ email: e, password }));
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

  if (session) {
    return <div style={{ height: "100%" }}>{children}</div>;
  }

  const glassCardStyle = {
    background: "rgba(20, 20, 20, 0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "24px",
    padding: isMobile ? "24px" : "48px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
  };

  const inputFieldStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#ffffff",
    width: "100%",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
  };

  const btnPrimaryStyle = {
    background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
    color: "#000000",
    fontWeight: "600",
    borderRadius: "12px",
    padding: "16px",
    border: "none",
    fontSize: "15px",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 10px 20px rgba(251, 191, 36, 0.15)",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#050505",
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
      boxSizing: "border-box",
      padding: isMobile ? "24px 16px" : "40px 32px",
    }}>
      {/* Decorative Glow */}
      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, rgba(0, 0, 0, 0) 70%)",
        top: "-200px",
        left: "-200px",
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
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
              }}>
                A
              </div>
              <span style={{ fontSize: "20px", fontWeight: "750", tracking: "-0.5px", textTransform: "uppercase" }}>
                Atlas <span style={{ fontWeight: "300", color: "#6b7280" }}>OS</span>
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
              Atlas není jen úkolovník. Je to váš digitální mozek, který automatizuje chaos a nechává vám prostor na to podstatné.
            </p>
          </div>

          {/* Core Feature Bulletins */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ color: "#fbbf24", fontSize: "16px", marginTop: "1px" }}>✦</div>
              <p style={{ fontSize: "13.5px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>
                <strong>AI Prioritizace:</strong> Atlas ví, co hoří a co počká.
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
        <div style={glassCardStyle}>
          {/* Header text inside card */}
          <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 6px", color: "#ffffff" }}>
            {signMode === "signup" ? "Vytvořit účet zdarma" : "Vítejte zpět"}
          </h2>
          <p style={{ fontSize: "13.5px", color: "#9ca3af", margin: "0 0 28px" }}>
            {signMode === "signup" ? "Začněte pracovat chytřeji ještě dnes." : "Pokračujte tam, kde jste včera skončili."}
          </p>

          {/* Two-way Auth Mode Switcher */}
          <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", padding: "4px", marginBottom: "28px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            {[["magic", "✉ Magic link"], ["password", "🔒 Heslo"]].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setAuthMode(m); setSent(false); }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: "8px",
                  border: "none",
                  background: authMode === m ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: authMode === m ? "#ffffff" : "#9ca3af",
                  fontSize: "13px",
                  fontWeight: authMode === m ? "700" : "400",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
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
                disabled={!email.trim() || !password || sending}
                style={{ ...btnPrimaryStyle, opacity: !email.trim() || !password || sending ? 0.6 : 1 }}
                onMouseEnter={e => {
                  if (email.trim() && password && !sending) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.3)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(251, 191, 36, 0.15)";
                }}
              >
                {sending ? "Čekejte…" : signMode === "signup" ? "Registrovat se do Atlas OS" : "Přihlásit se do Atlas OS"}
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

        </div>

      </main>
      </div>

      {/* Footer section separated by thin line */}
      <footer style={{
        width: "100%",
        maxWidth: "1024px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        paddingTop: "24px",
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
            gap: "12px",
            textDecoration: "none",
            borderRadius: "12px",
            padding: "8px 16px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.3)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
          }}
        >
          <MZLogo size={28} />
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#ffffff", lineHeight: "1.3" }}>Michal Zich</div>
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>zichmicha.cz ↗</div>
          </div>
        </a>
      </footer>
    </div>
  );
}
