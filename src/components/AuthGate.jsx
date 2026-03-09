import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import { supabase } from '../supabase.js'

export default function AuthGate({ children }) {
  const { t } = useApp();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("magic"); // "magic" | "password"
  const [signMode, setSignMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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

  if (!session) {
    const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 14, boxSizing: "border-box" };
    const btnStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };

    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 400, maxWidth: "100%", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16, padding: "28px 28px 24px", boxShadow: t.shadow }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>M</div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Michal Tasks</span>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: t.input, borderRadius: 9, padding: 3, marginBottom: 20 }}>
            {[["magic", "Magic link"], ["password", "Email + heslo"]].map(([m, label]) => (
              <button key={m} onClick={() => { setAuthMode(m); setSent(false); }} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: authMode === m ? t.bg2 : "transparent", color: authMode === m ? t.text : t.text3, fontSize: 12.5, fontWeight: authMode === m ? 600 : 400, cursor: "pointer", transition: "all .15s" }}>
                {label}
              </button>
            ))}
          </div>

          {authMode === "magic" ? (
            sent ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📬</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Odkaz odeslán</div>
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 16 }}>Zkontroluj email <strong>{email}</strong> a klikni na odkaz.</div>
                <button onClick={() => { setSent(false); setEmail(""); }} style={{ ...btnStyle, background: "transparent", color: t.accent, border: `1px solid ${t.accent}`, width: "auto", padding: "7px 20px" }}>Zpět</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 12 }}>Zadej email a pošleme ti přihlašovací odkaz.</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMagicLink()} placeholder="email@example.com" type="email" style={{ ...inputStyle, marginBottom: 10 }} />
                <button onClick={sendMagicLink} disabled={!email.trim() || sending} style={{ ...btnStyle, opacity: !email.trim() || sending ? 0.6 : 1 }}>
                  {sending ? "Odesílám…" : "Poslat přihlašovací odkaz"}
                </button>
              </>
            )
          ) : (
            <>
              {/* Sign in / Sign up toggle */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {[["signin", "Přihlásit se"], ["signup", "Registrovat"]].map(([m, label]) => (
                  <button key={m} onClick={() => setSignMode(m)} style={{ background: "none", border: "none", color: signMode === m ? t.accent : t.text3, fontSize: 13, fontWeight: signMode === m ? 700 : 400, cursor: "pointer", padding: "0 0 4px", borderBottom: signMode === m ? `2px solid ${t.accent}` : "2px solid transparent" }}>
                    {label}
                  </button>
                ))}
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" style={{ ...inputStyle, marginBottom: 8 }} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePassword()} placeholder={signMode === "signup" ? "Nové heslo (min. 6 znaků)" : "Heslo"} type="password" style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={handlePassword} disabled={!email.trim() || !password || sending} style={{ ...btnStyle, opacity: !email.trim() || !password || sending ? 0.6 : 1, marginBottom: 8 }}>
                {sending ? "Čekejte…" : signMode === "signup" ? "Vytvořit účet" : "Přihlásit se"}
              </button>
              {signMode === "signin" && (
                <button onClick={handleForgotPassword} style={{ background: "none", border: "none", color: t.text3, fontSize: 12, cursor: "pointer", padding: 0, width: "100%", textAlign: "center" }}>
                  Zapomenuté heslo?
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return <div style={{ height: "100%" }}>{children}</div>;
}
