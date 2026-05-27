import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'

export default function NotesMiniList({ taskId, projectId }) {
  const { t, notes, addNote, openNote } = useApp();
  const relevant = notes.filter((n) =>
    (taskId && n.primaryTaskId === taskId) ||
    (projectId && n.primaryProjectId === projectId)
  );

  const handleAdd = () => {
    const n = addNote({ primaryTaskId: taskId || null, primaryProjectId: projectId || null });
    openNote(n.id);
  };

  return (
    <div>
      {relevant.length === 0 && (
        <div style={{ color: t.text3, fontSize: 12, fontStyle: "italic", marginBottom: 8 }}>Zatím žádné poznámky</div>
      )}
      {relevant.map((n) => (
        <div
          key={n.id}
          onClick={() => openNote(n.id)}
          style={{ padding: "7px 10px", borderRadius: 7, background: t.input, border: `1px solid ${t.border}`, marginBottom: 5, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent + "60")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {n.pinned && <Icon name="pin" size={10} color={t.accent} strokeWidth={2} />}
              {n.title || <em style={{ fontWeight: 400, color: t.text3 }}>Bez názvu</em>}
            </span>
          </div>
          {n.content && (
            <div style={{ fontSize: 12, color: t.text3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {n.content.split("\n")[0]}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        style={{ width: "100%", padding: "6px 12px", borderRadius: 7, border: `1px dashed ${t.border}`, background: "transparent", color: t.text3, fontSize: 12, marginTop: 2 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.color = t.text3)}
      >
        + Přidat poznámku
      </button>
    </div>
  );
}
