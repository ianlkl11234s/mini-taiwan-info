/**
 * TopBar — 上方導航
 * 對應 prototype chrome.jsx TopBar
 */

import { Droplet, Home, Settings, Info } from "lucide-react";
import { Breadcrumb, type CrumbItem } from "./Breadcrumb";

interface TopBarProps {
  themeName: string;
  themeId: string;
  year: string;
  breadcrumb?: CrumbItem[];
  onCrumbClick?: (item: CrumbItem) => void;
}

export function TopBar({
  themeName,
  themeId,
  year,
  breadcrumb,
  onCrumbClick,
}: TopBarProps) {
  const Icon = themeId === "water" ? Droplet : Home;
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Icon size={18} color="#fff" />
        </div>
        <div>
          <div className="brand-name">
            Mini <span className="light">Taiwan Info</span>
          </div>
        </div>
      </div>

      <div className="tb-divider" />

      {breadcrumb ? (
        <Breadcrumb items={breadcrumb} onClick={onCrumbClick} />
      ) : (
        <>
          <button className="tb-select">
            <span className="ico">
              <Icon size={14} />
            </span>
            <span>{themeName}</span>
          </button>
          <button className="tb-select">
            <span>{year}</span>
          </button>
        </>
      )}

      <div className="tb-spacer" />

      <button className="tb-icon-btn" title="說明">
        <Info size={16} />
      </button>
      <button className="tb-icon-btn" title="設定">
        <Settings size={16} />
      </button>
    </div>
  );
}
