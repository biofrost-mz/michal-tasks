import React from 'react'

export default function Icon({ name, size = 14, color = "currentColor", strokeWidth = 1.75, fill = "none" }) {
  const p = {
    home:           ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
    folder:         "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
    "check-square": ["M9 11l3 3L22 4", "M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"],
    calendar:       ["M8 2v4", "M16 2v4", "M3 8h18", "M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"],
    tag:            ["M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z", "M7 7h.01"],
    "file-text":    ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
    circle:         "M12 2a10 10 0 100 20A10 10 0 0012 2z",
    "play-circle":  ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M10 8l6 4-6 4V8z"],
    clock:          ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 6v6l4 2"],
    "check-circle": ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
    "pause-circle": ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M10 15V9", "M14 15V9"],
    star:           "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    "alert-circle": ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 8v4", "M12 16h.01"],
    "refresh-cw":   ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"],
    list:           ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
    search:         ["M11 2a9 9 0 100 18A9 9 0 0011 2z", "M21 21l-4.35-4.35"],
    pin:            ["M12 17v5", "M5 4a2 2 0 012-2h10a2 2 0 012 2v6a6 6 0 01-6 6 6 6 0 01-6-6V4z"],
    trash:          ["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"],
    plus:           ["M12 5v14", "M5 12h14"],
    x:              ["M18 6L6 18", "M6 6l12 12"],
    "chevron-down": "M6 9l6 6 6-6",
    "chevron-up":   "M18 15l-6-6-6 6",
    "chevron-left": "M15 18l-6-6 6-6",
    repeat:         ["M17 1l4 4-4 4", "M3 11V9a4 4 0 014-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 01-4 4H3"],
    "arrow-up":     ["M12 19V5", "M5 12l7-7 7 7"],
    minus:          "M5 12h14",
    paperclip:      ["M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"],
    upload:         ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
    file:           ["M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z", "M13 2v7h7"],
    image:          ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", "M21 15l-5-5L5 21"],
    "external-link": ["M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6", "M15 3h6v6", "M10 14L21 3"],
  };
  const d = p[name];
  if (!d) return null;
  const ds = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: "block" }}>
      {ds.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}
