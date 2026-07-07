/**
 * UserAvatar — 右上角會員入口（自 mini-taiwan-pulse 移植）
 *
 * 未登入 → 「使用 Google 登入」按鈕；登入 → avatar + 名稱 + 下拉（等級 / 登出）。
 * 樣式貼齊 TopBar：trigger 用既有 .tb-select，下拉用 globals.css CSS 變數。
 * （治理後台 AdminPanel 留在 pulse，不移植。）
 */

import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { signInWithGoogle, signOut, useUser } from "@/lib/auth";

export function UserAvatar({ tier }: { tier?: string | null } = {}) {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 下拉開啟時，點擊外部關閉
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (loading) return null;

  // ── 未登入：登入按鈕 ──
  if (!user) {
    return (
      <button
        type="button"
        className="tb-select"
        onClick={() => {
          void signInWithGoogle().catch((err) => console.warn("[auth] signIn failed", err));
        }}
        title="登入後可解鎖會員限定圖層"
      >
        <LogIn size={14} style={{ color: "var(--text-secondary)" }} />
        <span>使用 Google 登入</span>
      </button>
    );
  }

  // ── 已登入：avatar + 名稱 + 下拉 ──
  const meta = user.user_metadata ?? {};
  const displayName: string = meta.full_name ?? meta.name ?? user.email ?? "使用者";
  const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null;

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="tb-select"
        onClick={() => setOpen((v) => !v)}
        style={{ borderRadius: "var(--radius-pill)", padding: "5px 12px 5px 6px" }}
      >
        <Avatar url={avatarUrl} />
        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 180,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{user.email ?? displayName}</div>
            {tier && (
              <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-tertiary)" }}>
                會員等級：<b style={{ color: "var(--accent-deep)" }}>{tier}</b>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut().catch((err) => console.warn("[auth] signOut failed", err));
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--text)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
      )}
    </div>
  );
}

/** 圓形頭像：有圖顯示圖，無圖顯示 fallback 人形 icon */
function Avatar({ url }: { url: string | null }) {
  const size = 22;
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "var(--radius-pill)",
    flexShrink: 0,
  };
  if (url) {
    return <img src={url} alt="" referrerPolicy="no-referrer" style={{ ...common, objectFit: "cover" }} />;
  }
  return (
    <span
      style={{
        ...common,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-3)",
        color: "var(--text-tertiary)",
      }}
    >
      <UserIcon size={13} />
    </span>
  );
}
