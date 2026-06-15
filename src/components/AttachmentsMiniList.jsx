import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import { useConfirm } from './Confirm.jsx'
import Icon from './Icon.jsx'
import { supabase } from '../supabase.js'

// Allowlist of safe MIME types — executable/scriptable formats are blocked.
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "application/pdf",
  "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed",
]);

const BLOCKED_EXT = /\.(exe|bat|cmd|sh|ps1|js|jsx|ts|tsx|html|htm|php|py|rb|pl|jar|dll|so|dmg|pkg|deb|rpm|vbs|msi|app|apk)$/i;

const SIGNED_URL_EXPIRY_SECS = 3600; // 1 hour

export default function AttachmentsMiniList({ taskId, projectId }) {
  const { attachments, uploadAttachment, deleteAttachment } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);
  const fileRef = useRef(null);

  // Signed URL vyprší po 1 h — obnov je včas a při návratu na záložku,
  // ať odkazy nepřestanou fungovat u dlouho otevřeného detailu.
  useEffect(() => {
    const bump = () => setRefreshTick((n) => n + 1);
    const iv = setInterval(bump, (SIGNED_URL_EXPIRY_SECS - 600) * 1000); // ~50 min
    const onVis = () => { if (document.visibilityState === "visible") bump(); };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const relevant = attachments.filter((a) =>
    (taskId && a.taskId === taskId) ||
    (projectId && a.projectId === projectId)
  );

  // Fetch fresh signed URLs whenever the attachment list changes.
  const pathsKey = relevant.map(a => a.storagePath).join(",");
  useEffect(() => {
    if (!relevant.length) { setSignedUrls({}); return; }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        relevant.map(async (att) => {
          const { data, error } = await supabase.storage
            .from("attachments")
            .createSignedUrl(att.storagePath, SIGNED_URL_EXPIRY_SECS);
          return [att.storagePath, error ? null : data.signedUrl];
        })
      );
      if (!cancelled) setSignedUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey, refreshTick]);

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast("Max 25 MB na soubor", "error"); return; }
    if (!ALLOWED_MIME.has(file.type)) {
      toast(`Typ souboru "${file.type || "neznámý"}" není povolen.`, "error");
      return;
    }
    if (BLOCKED_EXT.test(file.name)) {
      toast("Tento typ souboru není z bezpečnostních důvodů povolen.", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadAttachment(file, { taskId: taskId ?? null, projectId: projectId ?? null });
      toast("Soubor nahrán", "success");
    } catch (e) {
      toast(e.message || "Chyba při nahrávání", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (att) => {
    if (!await confirm(`Smazat "${att.name}"?`)) return;
    try {
      await deleteAttachment(att);
      toast("Smazáno", "success");
    } catch (e) {
      toast(e.message || "Chyba při mazání", "error");
    }
  };

  const getUrl = (att) => signedUrls[att.storagePath] ?? null;
  const isImage = (att) => att.mimeType?.startsWith("image/");

  const fmtSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1px dashed ${dragOver ? "var(--accent-2)" : "var(--border-soft)"}`,
          borderRadius: 8, padding: "9px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          color: dragOver ? "var(--accent)" : "var(--text-2)", fontSize: 12,
          marginBottom: relevant.length ? 10 : 0,
          transition: "border-color .15s, color .15s",
          background: dragOver ? "var(--accent-soft)" : "transparent",
        }}
      >
        <Icon name="upload" size={13} color={dragOver ? "var(--accent)" : "var(--text-3)"} strokeWidth={2} />
        {uploading ? "Nahrávám…" : "Přidat soubor nebo obrázek"}
        <input
          ref={fileRef} type="file" style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {relevant.map((att) => {
          const url = getUrl(att);
          return (
            <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 7px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border-soft)" }}>
              {isImage(att) && url ? (
                <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                  <img src={url} alt={att.name} style={{ width: 38, height: 38, borderRadius: 5, objectFit: "cover", display: "block" }} />
                </a>
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 5, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="file" size={16} color="var(--text-3)" strokeWidth={1.5} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer"
                    style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {att.name}
                  </a>
                ) : (
                  <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                )}
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{fmtSize(att.size)}</div>
              </div>
              {url && (
                <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--text-3)", padding: 4, display: "flex", alignItems: "center" }}>
                  <Icon name="external-link" size={12} color="var(--text-3)" strokeWidth={2} />
                </a>
              )}
              <button
                onClick={() => handleDelete(att)}
                style={{ background: "none", border: "none", color: "var(--text-3)", padding: 4, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center" }}
              >
                <Icon name="trash" size={12} color="var(--text-3)" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
