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

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.input,
    color: t.text, outline: "none", fontSize: 14,
    boxSizing: "border-box", transition: "border-color .15s",
  };

  const primaryBtn = {
    width: "100%", padding: "12px", borderRadius: 10, border: "none",
    background: `linear-gradient(135deg, var(--accent), var(--accent-2))`,
    color: "var(--bg)", fontWeight: 700, fontSize: 14, cursor: "pointer",
    transition: "opacity .15s", letterSpacing: ".01em",
    boxShadow: "0 4px 14px var(--accent-glow)",
  };

  const secondaryBtn = {
    background: "none", border: `1.5px solid ${t.border}`,
    color: t.text2, padding: "11px", borderRadius: 10,
    fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    transition: "border-color .15s, color .15s", width: "100%",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg }}>

      {/* ── LEFT: Brand panel ─────────────────── */}
      {!isMobile && (
        <div style={{
          flex: 1, minWidth: 0,
          background: "linear-gradient(160deg, #0a0c12 0%, #141822 55%, #0e1118 100%)",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "60px 56px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative glow orbs */}
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)", top: -180, right: -160, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(227,168,80,.16) 0%, transparent 70%)", bottom: -80, left: -80, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(227,168,80,.14) 0%, transparent 70%)", top: "40%", right: "15%", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--bg)", fontSize: 20, fontWeight: 800,
              fontFamily: "'Outfit',sans-serif",
              boxShadow: "0 4px 14px var(--accent-glow)",
            }}>M</div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
              Michal Tasks
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Outfit',sans-serif", fontSize: 46, fontWeight: 800,
            letterSpacing: "-1.8px", lineHeight: 1.1, color: "#f1f5f9", marginBottom: 18,
          }}>
            Tvůj osobní<br />
            <span style={{
              background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>AI produktivní</span><br />
            asistent
          </h1>

          <p style={{ fontSize: 15.5, color: "#94a3b8", lineHeight: 1.75, marginBottom: 40, maxWidth: 400 }}>
            Úkoly, poznámky a projekty — vše na jednom místě. S AI který za tebe myslí dopředu.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(4px)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(227,168,80,0.18), rgba(212,146,58,0.18))",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={f.icon} size={15} color="var(--accent)" strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#e2e8f0", marginBottom: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <MockTaskCard />
        </div>
      )}

      {/* ── RIGHT: Login form ─────────────────── */}
      <div style={{
        width: isMobile ? "100%" : 460,
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "40px 20px" : "48px 44px",
        background: t.bg2,
        borderLeft: isMobile ? "none" : `1px solid ${t.border}`,
        overflowY: "auto",
      }}>

        {/* Mobile logo */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontSize: 18, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>M</div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", color: t.text }}>Michal Tasks</span>
          </div>
        )}

        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", color: t.text, marginBottom: 6 }}>
              {signMode === "signup" ? "Vytvořit účet" : "Vítej zpět 👋"}
            </h2>
            <p style={{ fontSize: 13.5, color: t.text2 }}>
              {signMode === "signup"
                ? "Připoj se k Michal Tasks zdarma"
                : "Přihlas se a pokračuj tam, kde jsi skončil"
              }
            </p>
          </div>

          {/* Auth mode switcher */}
          <div style={{ display: "flex", background: t.input, borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {[["magic", "✉ Magic link"], ["password", "🔒 Heslo"]].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setAuthMode(m); setSent(false); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                  background: authMode === m ? t.bg2 : "transparent",
                  color: authMode === m ? t.text : t.text3,
                  fontSize: 12.5, fontWeight: authMode === m ? 700 : 400,
                  cursor: "pointer", transition: "all .15s",
                  boxShadow: authMode === m ? t.shadow : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {authMode === "magic" ? (
            sent ? (
              /* ── Sent confirmation ── */
              <div style={{
                textAlign: "center", padding: "32px 16px",
                background: t.input, borderRadius: 14,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>📬</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 8 }}>Odkaz odeslán!</div>
                <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6, marginBottom: 20 }}>
                  Zkontroluj email<br /><strong style={{ color: t.text }}>{email}</strong><br />a klikni na odkaz.
                </div>
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  style={{ ...secondaryBtn, width: "auto", padding: "8px 20px" }}
                >
                  ← Zpět
                </button>
              </div>
            ) : (
              /* ── Magic link form ── */
              <>
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 14, lineHeight: 1.6 }}>
                  Zadej email — pošleme ti přihlašovací odkaz, žádné heslo nepotřebuješ.
                </div>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMagicLink()}
                  placeholder="tvuj@email.cz"
                  type="email"
                  autoComplete="email"
                  style={{ ...inputStyle, marginBottom: 12 }}
                />
                <button
                  onClick={sendMagicLink}
                  disabled={!email.trim() || sending}
                  style={{ ...primaryBtn, opacity: !email.trim() || sending ? 0.55 : 1 }}
                >
                  {sending ? "Odesílám…" : "Poslat přihlašovací odkaz →"}
                </button>
              </>
            )
          ) : (
            /* ── Email + password form ── */
            <>
              {/* Sign in / Sign up tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.border}`, paddingBottom: 0 }}>
                {[["signin", "Přihlásit se"], ["signup", "Registrovat"]].map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setSignMode(m)}
                    style={{
                      background: "none", border: "none",
                      color: signMode === m ? t.accent : t.text3,
                      fontSize: 13.5, fontWeight: signMode === m ? 700 : 400,
                      cursor: "pointer", padding: "0 4px 10px",
                      borderBottom: `2px solid ${signMode === m ? t.accent : "transparent"}`,
                      marginBottom: -1, transition: "all .15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tvuj@email.cz"
                type="email"
                autoComplete="email"
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <div style={{ position: "relative", marginBottom: 16 }}>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePassword()}
                  placeholder={signMode === "signup" ? "Nové heslo (min. 6 znaků)" : "Heslo"}
                  type={showPw ? "text" : "password"}
                  autoComplete={signMode === "signup" ? "new-password" : "current-password"}
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                    color: t.text3, display: "flex",
                  }}
                  tabIndex={-1}
                >
                  <Icon name={showPw ? "eye-off" : "eye"} size={16} color={t.text3} strokeWidth={1.8} />
                </button>
              </div>

              <button
                onClick={handlePassword}
                disabled={!email.trim() || !password || sending}
                style={{ ...primaryBtn, opacity: !email.trim() || !password || sending ? 0.55 : 1, marginBottom: 10 }}
              >
                {sending ? "Čekejte…" : signMode === "signup" ? "Vytvořit účet →" : "Přihlásit se →"}
              </button>

              {signMode === "signin" && (
                <button
                  onClick={handleForgotPassword}
                  style={{ background: "none", border: "none", color: t.text3, fontSize: 12.5, cursor: "pointer", padding: "4px 0", width: "100%", textAlign: "center" }}
                >
                  Zapomenuté heslo?
                </button>
              )}
            </>
          )}

          {/* Footer — author */}
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${t.border}` }}>
            <a
              href="https://www.zichmichal.cz/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                textDecoration: "none", borderRadius: 10,
                padding: "10px 12px", transition: "background .15s",
                background: t.input, border: `1px solid ${t.border}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent + "60"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
            >
              <MZLogo size={36} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>Michal Zich</div>
                <div style={{ fontSize: 12, color: t.text3 }}>zichmichal.cz ↗</div>
              </div>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
