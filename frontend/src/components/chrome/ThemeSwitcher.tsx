/**
 * ThemeSwitcher — 底部主題列
 * 對應 prototype chrome.jsx ThemeSwitcher
 */

import {
  Droplet,
  Home,
  Flame,
  Cross,
  Car,
  Users,
  Leaf,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { ThemeListItem } from "@/lib/themes";

const ICON_MAP: Record<string, LucideIcon> = {
  drop: Droplet,
  home: Home,
  fire: Flame,
  medical: Cross,
  car: Car,
  users: Users,
  leaf: Leaf,
  house: Building2,
};

interface ThemeSwitcherProps {
  themes: ThemeListItem[];
  activeTheme: string;
  onThemeChange: (id: string) => void;
}

export function ThemeSwitcher({ themes, activeTheme, onThemeChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher">
      {themes.map((t) => {
        const active = activeTheme === t.id;
        const Icon = ICON_MAP[t.icon] ?? Home;
        return (
          <button
            key={t.id}
            className={`theme-pill ${active ? "active" : ""} ${t.disabled ? "is-disabled" : ""}`}
            onClick={() => !t.disabled && onThemeChange(t.id)}
            disabled={t.disabled}
            style={
              {
                "--theme-color": t.color_accent,
                cursor: t.disabled ? "not-allowed" : "pointer",
              } as React.CSSProperties
            }
            aria-label={t.disabled ? `${t.name}（尚未開放）` : t.name}
          >
            <span className="ico">
              <Icon size={14} />
            </span>
            <span>{t.name}</span>
            {t.disabled && <span className="phase-badge">P2+</span>}
          </button>
        );
      })}

      <div className="theme-switcher-spacer" />
      <div className="footer-links">
        <a href="https://data.gov.tw/" target="_blank" rel="noopener noreferrer">資料來源</a>
        <a href="#">授權 CC BY 4.0</a>
        <a href="#">About</a>
        <a href="https://github.com/ianlkl11234s/mini-taiwan-info" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
      </div>
    </div>
  );
}
