import React from "react";
import Icon from "./Icon.jsx";

const SHORTCUT_GROUPS = [
  {
    title: "Navigace",
    shortcuts: [
      { label: "Vyhledávání / Command Palette", keys: ["⌘", "K"] },
      { label: "Přehled (Dashboard)", keys: ["G", "H"] },
      { label: "Úkoly", keys: ["G", "T"] },
      { label: "Poznámky", keys: ["G", "N"] },
      { label: "Plán (Timeline)", keys: ["G", "P"] },
    ],
  },
  {
    title: "Akce",
    shortcuts: [
      { label: "Nový úkol (zaměření vstupu)", keys: ["N"] },
      { label: "Přejít na Úkoly (dnešek)", keys: ["T"] },
      { label: "Nápověda zkratek", keys: ["?"] },
    ],
  },
  {
    title: "V seznamu úkolů",
    shortcuts: [
      { label: "Další / Předchozí úkol", keys: ["J", "/", "K"] },
      { label: "Otevřít detail", keys: ["Enter"] },
      { label: "Označit jako hotovo", keys: ["D"] },
      { label: "Hvězdička (top)", keys: ["S"] },
    ],
  },
];

export default function ShortcutHelper({ onClose }) {
  return (
    <div
      className="shortcut-helper-overlay"
      onClick={onClose}
    >
      <div
        className="shortcut-helper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcut-helper-head">
          <div className="shortcut-helper-title">Klávesové zkratky</div>
          <button className="shortcut-helper-close" onClick={onClose}>
            <Icon name="x" size={14} color="currentColor" strokeWidth={2} />
          </button>
        </div>
        <div className="shortcut-helper-body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="shortcut-group">
              <div className="shortcut-group-title">{group.title}</div>
              {group.shortcuts.map((s) => (
                <div key={s.label} className="shortcut-row">
                  <span className="shortcut-label">{s.label}</span>
                  <span className="shortcut-keys">
                    {s.keys.map((k, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && k !== "/" && s.keys[i - 1] !== "/" && (
                          <span className="shortcut-plus">+</span>
                        )}
                        {k === "/" ? (
                          <span className="shortcut-plus" style={{ padding: "0 2px" }}>/</span>
                        ) : (
                          <span className="shortcut-key">{k}</span>
                        )}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
