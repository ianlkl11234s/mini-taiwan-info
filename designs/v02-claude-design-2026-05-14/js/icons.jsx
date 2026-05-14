/* ============================================================
   Icons — lightweight SVG library
   ============================================================ */

const _ic = (path, opts = {}) => ({ width = 18, color = "currentColor", stroke = 1.6 } = {}) => (
  <svg width={width} height={width} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...opts}>
    {path}
  </svg>
);

const Icons = {
  water: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"}>
      <path d="M12 2.5c-3.5 5-6 8.5-6 12a6 6 0 0012 0c0-3.5-2.5-7-6-12z"/>
    </svg>
  ),
  drop: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"}>
      <path d="M12 3c-3 4-5 7-5 10a5 5 0 0010 0c0-3-2-6-5-10z"/>
    </svg>
  ),
  cloudRain: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 14a4 4 0 100-8 5 5 0 00-9.6 1.5A3.5 3.5 0 007 14h9"/>
      <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>
    </svg>
  ),
  alert: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  waves: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>
      <path d="M2 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>
      <path d="M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>
    </svg>
  ),
  recycle: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9 12a3 3 0 016 0M9 12l-1.5-2M9 12l1.5-2"/>
    </svg>
  ),
  home: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/>
    </svg>
  ),
  users: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  car: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17l2-6h10l2 6M5 17a2 2 0 11-4 0M23 17a2 2 0 11-4 0"/>
    </svg>
  ),
  fire: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"}>
      <path d="M12 2c-2 3 0 5-3 8s-3 6-3 7a6 6 0 0012 0c0-2-1-3-1-5s-1-3-3-2 0-5-2-8z"/>
    </svg>
  ),
  medical: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="14" rx="2"/>
      <path d="M12 10v6M9 13h6M8 6V4h8v2"/>
    </svg>
  ),
  house: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <path d="M9 22V12h6v10"/>
    </svg>
  ),
  leaf: ({ size = 18, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 014 13V5h7a7 7 0 017 7v8z"/>
      <path d="M11 20L20 11"/>
    </svg>
  ),
  search: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <path d="M21 21l-4.3-4.3"/>
    </svg>
  ),
  settings: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8L4.2 7a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>
    </svg>
  ),
  download: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  share: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>
    </svg>
  ),
  plus: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  minus: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  expand: ({ size = 14, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  ),
  chev: ({ size = 14, color, dir = "down" }) => {
    const rot = { up: 180, right: -90, left: 90, down: 0 }[dir];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rot}deg)` }}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    );
  },
  x: ({ size = 14, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  info: ({ size = 14, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  database: ({ size = 14, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/>
    </svg>
  ),
  clock: ({ size = 14, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 14"/>
    </svg>
  ),
  bulb: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12c1 1 1 2 1 3h6c0-1 0-2 1-3a7 7 0 00-4-12z"/>
    </svg>
  ),
  arrowUp: ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  ),
  arrowDown: ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  flat: ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  scale: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  ),
  layers: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  locate: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
      <circle cx="12" cy="12" r="2" fill={color || "currentColor"}/>
    </svg>
  ),
  pin: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"}>
      <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"/>
      <circle cx="12" cy="9" r="2.5" fill="#fff"/>
    </svg>
  ),
  trend: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 14 15 9 10 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  swap: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 01-4 4H3"/>
    </svg>
  ),
  ranking: ({ size = 16, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="13" width="4" height="8" rx="1"/>
      <rect x="10" y="8" width="4" height="13" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  ),
};

// Format helpers
window.fmt = {
  num: (n, dp = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }),
  pct: (n, dp = 1) => `${n.toFixed(dp)}%`,
  pp: (n, dp = 1) => `${n > 0 ? "+" : ""}${n.toFixed(dp)} pp`,
  signed: (n, dp = 1) => `${n > 0 ? "+" : ""}${n.toFixed(dp)}`,
  bigNum: (n) => {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + " 億";
    if (n >= 1e4) return (n / 1e4).toFixed(1) + " 萬";
    return n.toLocaleString();
  },
};

window.Icons = Icons;
