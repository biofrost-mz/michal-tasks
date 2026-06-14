import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Icon from "../components/Icon.jsx";
import EmptyState from "../components/EmptyState.jsx";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#64748b",
];

export default function TagsPage() {
  const { tags, tasks, addTag, updateTag, deleteTag, loaded, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#e3a850");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const rows = useMemo(() => {
    return tags
      .map((tag) => ({
        tag,
        count: tasks.filter((x) => (x.tagIds || []).includes(tag.id)).length,
      }))
      .sort((a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name, "cs"));
  }, [tags, tasks]);

  const max = Math.max(1, ...rows.map((r) => r.count));

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    addTag({ name, color: newColor });
    setNewName("");
    toast("Tag vytvořen", "success");
  };

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setEditName(tag.name || "");
    setEditColor(tag.color || "#e3a850");
  };

  const saveEdit = (tag) => {
    const name = editName.trim();
    if (!name) return;
    updateTag(tag.id, { name, color: editColor });
    setEditingId(null);
    toast("Tag upraven", "success");
  };

  const remove = async (tag) => {
    if (!(await confirm(`Smazat tag "${tag.name}"?`))) return;
    deleteTag(tag.id);
    toast("Tag smazán", "success");
  };

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{tags.length} tagů · sdílené napříč projekty</div>
          <h1 className="ph-title">Tagy</h1>
          <div className="ph-sub"><span>nejpoužívanější: {rows[0]?.tag?.name || "—"} ({rows[0]?.count || 0}×)</span></div>
        </div>
        <button className="btn primary" onClick={create}>
          <Icon name="plus" size={13} color="currentColor" strokeWidth={2} /> Nový tag
        </button>
      </div>

      <div className="quickadd">
        <span className="quickadd-plus">#</span>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Název nového tagu…"
        />
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {TAG_COLORS.slice(0, 8).map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              title={c}
              style={{
                width: isMobile ? 22 : 16,
                height: isMobile ? 22 : 16,
                borderRadius: 4,
                background: c,
                border: newColor === c ? "1.5px solid #fff" : "1px solid transparent",
                boxShadow: newColor === c ? `0 0 0 1px ${c}` : "none",
              }}
            />
          ))}
          <label title="Vlastní barva" style={{ width: 16, height: 16, borderRadius: 4, overflow: "hidden", border: "1px solid var(--border)", background: "linear-gradient(135deg,#f00,#0f0,#00f)", position: "relative", cursor: "pointer" }}>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
            />
          </label>
        </div>
        <span className="quickadd-kbd">Enter</span>
      </div>

      <div className="tagtable">
        <div className="tagrow head">
          <div>Tag ↑</div>
          <div>Použití</div>
          <div>Úkoly</div>
          <div>Akce</div>
        </div>

        {loaded && rows.length === 0 && (
          <EmptyState
            type="filter"
            title="Zatím žádné tagy"
            description="Tagy se vytvoří automaticky při přidání úkolu nebo pomocí formuláře výše."
          />
        )}
        {rows.map(({ tag, count }) => {
          const isEditing = editingId === tag.id;
          const widthPct = Math.round((count / max) * 100);

          return (
            <div key={tag.id} className="tagrow">
              <div className="tagrow-name" style={{ color: isEditing ? editColor : tag.color, alignItems: isEditing ? "flex-start" : "center", flexDirection: isEditing ? "column" : "row", gap: isEditing ? "6px" : "12px", width: "100%" }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(tag);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 8px", color: "var(--text)", fontSize: 13, width: "100%", outline: "none" }}
                    />
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                      {TAG_COLORS.slice(0, 8).map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          title={c}
                          style={{
                            width: isMobile ? 20 : 14,
                            height: isMobile ? 20 : 14,
                            borderRadius: 4,
                            background: c,
                            border: editColor === c ? "1.5px solid #fff" : "1px solid transparent",
                            boxShadow: editColor === c ? `0 0 0 1px ${c}` : "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        />
                      ))}
                      <label title="Vlastní barva" style={{ width: 14, height: 14, borderRadius: 4, overflow: "hidden", border: "1px solid var(--border)", background: "linear-gradient(135deg,#f00,#0f0,#00f)", position: "relative", cursor: "pointer" }}>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  tag.name
                )}
              </div>

              <div className="tagrow-bar">
                <div className="tagrow-bar-fill"><div style={{ width: `${widthPct}%`, background: tag.color }} /></div>
                <span className="tagrow-count">{count}×</span>
              </div>

              <div style={{ fontFamily: "var(--mono)", color: "var(--text-3)", fontSize: 13 }}>{count}</div>

              <div className="row" style={{ gap: 4 }}>
                {isEditing ? (
                  <>
                    <button className="btn primary" onClick={() => saveEdit(tag)} style={{ padding: "5px 10px", fontSize: 11 }}>Uložit</button>
                    <button className="btn" onClick={() => setEditingId(null)} style={{ padding: "5px 8px", fontSize: 11 }}>Zrušit</button>
                  </>
                ) : (
                  <>
                    <button className="icon-btn" title="Upravit" onClick={() => startEdit(tag)}>
                      <Icon name="edit-2" size={13} color="currentColor" strokeWidth={2} />
                    </button>
                    <button className="icon-btn" title="Smazat" onClick={() => remove(tag)}>
                      <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
