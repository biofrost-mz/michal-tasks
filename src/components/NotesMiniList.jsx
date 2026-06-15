import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'

export default function NotesMiniList({ taskId, projectId }) {
  const { notes, addNote, openNote } = useApp();
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
        <div style={{ color: "var(--text-3)", fontSize: 12, fontStyle: "italic", marginBottom: 8 }}>Zatím žádné poznámky</div>
      )}
      {relevant.map((n) => (
        <div
          key={n.id}
          onClick={() => openNote(n.id)}
          style={{ padding: "7px 10px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border-soft)", marginBottom: 5, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-soft)")}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {n.pinned && <Icon name="pin" size={10} color="var(--accent)" strokeWidth={2} />}
              {n.title || <em style={{ fontWeight: 400, color: "var(--text-3)" }}>Bez názvu</em>}
            </span>
          </div>
          {n.content && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {n.content.split("\n")[0]}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        style={{ width: "100%", padding: "6px 12px", borderRadius: 8, border: "1px dashed var(--border-soft)", background: "transparent", color: "var(--text-3)", fontSize: 12, marginTop: 2 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
      >
        + Přidat poznámku
      </button>
    </div>
  );
}
