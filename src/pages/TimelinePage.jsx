import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'
import { startOfToday, parseYMD, projectColor } from '../utils.js'

export default function TimelinePage() {
  const { t, tasks, projects, setTaskDetail } = useApp();
  const today = startOfToday();
  const [offsetDays, setOffsetDays] = useState(0);

  const DAYS = 28;
  const COL_W = 36;

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + offsetDays);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fmt = (d) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);

  const tasksWithDue = tasks.filter((task) => task.dueDate && task.status !== "done");

  const getDayIdx = (dateStr) => {
    const d = parseYMD(dateStr);
    return Math.round((d - startDate) / 86400000);
  };

  const DOW = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
  const MONTHS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

  const activeProjects = projects.filter((p) => p.status === "active");
  const unassigned = tasksWithDue.filter((task) => !task.projectId);

  const rows = [
    ...activeProjects.map((proj) => ({
      id: proj.id,
      label: proj.name,
      tasks: tasksWithDue.filter((task) => task.projectId === proj.id),
      color: projectColor(proj.id),
    })),
    ...(unassigned.length ? [{ id: "_inbox", label: "Bez projektu", tasks: unassigned, color: "#8b95a5" }] : []),
  ].filter((row) => row.tasks.length > 0);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: t.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", gap: 9 }}>
            <Icon name="calendar" size={20} color={t.accent} strokeWidth={2} />
            Plán
          </div>
          <div style={{ color: t.text3, fontSize: 13, marginTop: 2 }}>Přehled termínů úkolů na 28 dní</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setOffsetDays((o) => o - DAYS)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.bg2, color: t.text, fontSize: 13, cursor: "pointer" }}
          >← Zpět</button>
          <button
            onClick={() => setOffsetDays(0)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.accent}`, background: t.accentBg, color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >Dnes</button>
          <button
            onClick={() => setOffsetDays((o) => o + DAYS)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.bg2, color: t.text, fontSize: 13, cursor: "pointer" }}
          >Vpřed →</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: t.text3 }}>
          <div style={{ marginBottom: 12, opacity: 0.2, display: "flex", justifyContent: "center" }}>
            <Icon name="calendar" size={48} color={t.text} strokeWidth={0.75} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: t.text2 }}>Žádné úkoly s termínem</div>
          <div style={{ fontSize: 13 }}>Přidejte termín k úkolům a zobrazí se zde.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: DAYS * COL_W + 200 }}>
            {/* Day header */}
            <div style={{ display: "flex", marginLeft: 200, marginBottom: 6 }}>
              {days.map((d, i) => {
                const isToday = fmt(d) === todayStr;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const showMonth = i === 0 || d.getDate() === 1;
                return (
                  <div key={i} style={{ width: COL_W, flexShrink: 0, textAlign: "center", fontSize: 10,
                    color: isToday ? t.accent : isWeekend ? t.text2 : t.text3,
                    fontWeight: isToday ? 700 : 400,
                  }}>
                    {showMonth && <div style={{ fontSize: 9, color: t.text3, marginBottom: 1 }}>{MONTHS[d.getMonth()]}</div>}
                    <div>{DOW[d.getDay()]}</div>
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <div key={row.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ width: 200, flexShrink: 0, paddingRight: 12, paddingTop: 6, fontSize: 12, fontWeight: 600, color: t.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: row.color, marginRight: 6 }} />
                  {row.label}
                </div>

                <div style={{ position: "relative", flex: 1, height: 34, display: "flex" }}>
                  {/* Background cells */}
                  {days.map((d, i) => {
                    const isToday = fmt(d) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{
                        width: COL_W, flexShrink: 0, height: "100%",
                        borderLeft: `1px solid ${isToday ? t.accent + "60" : t.border}`,
                        background: isToday ? t.accent + "08" : isWeekend ? t.bg2 : "transparent",
                      }} />
                    );
                  })}

                  {/* Task chips */}
                  {row.tasks.map((task) => {
                    const idx = getDayIdx(task.dueDate);
                    if (idx < 0 || idx >= DAYS) return null;
                    const isOverdue = task.dueDate < todayStr;
                    const chipColor = isOverdue ? "#ef4444" : row.color;
                    return (
                      <div
                        key={task.id}
                        title={task.title}
                        onClick={() => setTaskDetail(task.id)}
                        style={{
                          position: "absolute",
                          left: idx * COL_W + 2,
                          top: 5,
                          height: 24,
                          maxWidth: COL_W * 3 - 4,
                          minWidth: COL_W - 4,
                          background: chipColor + "22",
                          border: `1px solid ${chipColor}55`,
                          borderLeft: `3px solid ${chipColor}`,
                          borderRadius: 5,
                          padding: "0 6px",
                          fontSize: 10,
                          fontWeight: 500,
                          color: chipColor,
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                          zIndex: 1,
                        }}
                      >
                        {task.recurrence && <span style={{ marginRight: 3, flexShrink: 0, display: "flex" }}><Icon name="repeat" size={9} color="currentColor" strokeWidth={2.5} /></span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, display: "flex", gap: 20, fontSize: 11, color: t.text3, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef444422", border: "1px solid #ef444455", borderLeft: "3px solid #ef4444" }} />
          Prošlý termín
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="repeat" size={11} color={t.text3} strokeWidth={2} /> Opakující se
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 14, height: 12, background: t.accent + "08", borderLeft: `2px solid ${t.accent}` }} />
          Dnes
        </div>
        <div style={{ marginLeft: "auto", color: t.text3 }}>Kliknutím na úkol otevřete detail</div>
      </div>
    </div>
  );
}
