import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#64748b",
];

export default function TagsPage() {
  const { t, tags, tasks, addTag, updateTag, deleteTag, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");

  const create = () => {
    if (!newName.trim()) return;
    addTag({ name: newName.trim(), color: newColor });
    setNewName("");
    toast("Tag vytvořen", "success");
  };

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px", maxWidth: isMobile ? "100%" : 680 }} className="fi">
      <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 20 }}>Správa tagů</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Nový tag…"
          style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
        />
        <button onClick={create} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          Přidat
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setNewColor(c)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: c,
              border: newColor === c ? "2.5px solid #fff" : "2px solid transparent",
              boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none",
              transition: "all .1s",
            }}
          />
        ))}
        <label
          title="Vlastní barva"
          style={{
            width: 24, height: 24, borderRadius: 6, overflow: "hidden",
            border: `2px solid ${t.border}`, cursor: "pointer", flexShrink: 0,
            background: `linear-gradient(135deg, #f00, #0f0, #00f)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}
        >
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
          />
        </label>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: newColor, border: `2px solid ${t.border}`, flexShrink: 0 }} title={newColor} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tags.map((tag) => {
          const count = tasks.filter((x) => (x.tagIds || []).includes(tag.id)).length;
          const isEditing = editing === tag.id;

          return (
            <div
              key={tag.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 9,
                borderLeft: `4px solid ${tag.color}`,
              }}
            >
              {!isEditing ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: tag.color }}>{tag.name}</span>
                  <span style={{ fontSize: 12, color: t.text3 }}>{count} úkolů</span>

                  <button
                    onClick={() => {
                      setEditing(tag.id);
                      setEditName(tag.name);
                    }}
                    style={{ background: "none", border: "none", color: t.text3, fontSize: 12, padding: "2px 6px" }}
                  >
                    Upravit
                  </button>

                  <button
                    onClick={async () => {
                      if (await confirm(`Smazat tag "${tag.name}"?`)) deleteTag(tag.id);
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, padding: "2px 6px" }}
                  >
                    Smazat
                  </button>
                </>
              ) : (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateTag(tag.id, { name: editName });
                        setEditing(null);
                        toast("Tag upraven", "success");
                      }
                    }}
                    style={{ flex: 1, padding: "4px 8px", borderRadius: 5, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
                  />

                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateTag(tag.id, { color: c })}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: c,
                          border: tag.color === c ? "2px solid #fff" : "1px solid transparent",
                          boxShadow: tag.color === c ? `0 0 0 1px ${c}` : "none",
                        }}
                      />
                    ))}
                    <label
                      title="Vlastní barva"
                      style={{
                        width: 18, height: 18, borderRadius: 4, overflow: "hidden",
                        border: `1px solid ${t.border}`, cursor: "pointer",
                        background: `linear-gradient(135deg, #f00, #0f0, #00f)`,
                        position: "relative", flexShrink: 0,
                      }}
                    >
                      <input
                        type="color"
                        value={tag.color}
                        onChange={(e) => updateTag(tag.id, { color: e.target.value })}
                        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => {
                      updateTag(tag.id, { name: editName });
                      setEditing(null);
                      toast("Tag upraven", "success");
                    }}
                    style={{ background: "none", border: "none", color: t.accent, fontSize: 12, fontWeight: 600, padding: "2px 6px" }}
                  >
                    Uložit
                  </button>

                  <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}>
                    <Icon name="x" size={13} color={t.text3} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
