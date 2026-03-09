import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import { useConfirm } from './Confirm.jsx'
import Icon from './Icon.jsx'
import { supabase } from '../supabase.js'

export default function AttachmentsMiniList({ taskId, projectId }) {
  const { t, attachments, uploadAttachment, deleteAttachment } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const relevant = attachments.filter((a) =>
    (taskId && a.taskId === taskId) ||
    (projectId && a.projectId === projectId)
  );

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast("Max 25 MB na soubor", "error"); return; }
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

  const getUrl = (att) => {
    const { data } = supabase.storage.from("attachments").getPublicUrl(att.storagePath);
    return data.publicUrl;
  };

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
          border: `1.5px dashed ${dragOver ? t.accent : t.border}`,
          borderRadius: 8,
          padding: "9px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: dragOver ? t.accent : t.text2,
          fontSize: 12,
          marginBottom: relevant.length ? 10 : 0,
          transition: "border-color .15s, color .15s",
          background: dragOver ? t.accentBg : "transparent",
        }}
      >
        <Icon name="upload" size={13} color={dragOver ? t.accent : t.text3} strokeWidth={2} />
        {uploading ? "Nahrávám…" : "Přidat soubor nebo obrázek"}
        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {relevant.map((att) => {
          const url = getUrl(att);
          return (
            <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 7, background: t.input }}>
              {isImage(att) ? (
                <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                  <img src={url} alt={att.name} style={{ width: 38, height: 38, borderRadius: 5, objectFit: "cover", display: "block" }} />
                </a>
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 5, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="file" size={16} color={t.text3} strokeWidth={1.5} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: t.text, fontSize: 12, fontWeight: 500, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {att.name}
                </a>
                <div style={{ fontSize: 10, color: t.text3 }}>{fmtSize(att.size)}</div>
              </div>
              <a href={url} target="_blank" rel="noreferrer" style={{ color: t.text3, padding: 4, display: "flex", alignItems: "center" }}>
                <Icon name="external-link" size={12} color={t.text3} strokeWidth={2} />
              </a>
              <button
                onClick={() => handleDelete(att)}
                style={{ background: "none", border: "none", color: t.text3, padding: 4, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center" }}
              >
                <Icon name="trash" size={12} color={t.text3} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
