/**
 * AboutView — 關於作者 + 作品集分頁
 *
 * 樸實（無 Hero 開場）的單頁：關於作者 → 一行生態定位 → 作品集卡片格線。
 * 以 overlay 形式蓋在 .main 區（topbar 與 theme-switcher 之間），不破壞 .app grid。
 * 資料來自 lib/aboutProjects.ts（SSOT），不寫死 JSX。
 */

import { Github, ExternalLink, ArrowLeft, AtSign } from "lucide-react";
import {
  ABOUT_PROFILE,
  ABOUT_PROJECTS,
  ABOUT_ECOSYSTEM,
  type AboutProject,
} from "@/lib/aboutProjects";

function ProjectCard({ p }: { p: AboutProject }) {
  return (
    <div className="about-card">
      <div className="about-card-thumb">
        {p.screenshot ? (
          <img src={p.screenshot} alt={p.name} loading="lazy" />
        ) : (
          <div className="about-card-thumb-fallback" aria-hidden>
            {p.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="about-card-body">
        <div className="about-card-name">
          <span>{p.name}</span>
          {p.current && <span className="about-card-badge">本站</span>}
        </div>
        <p className="about-card-desc">{p.desc}</p>
        <div className="about-card-actions">
          {p.site && (
            <a className="btn primary" href={p.site} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> Live
            </a>
          )}
          <a className="btn ghost" href={p.github} target="_blank" rel="noopener noreferrer">
            <Github size={13} /> GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

export function AboutView({ onClose }: { onClose: () => void }) {
  const appProjects = ABOUT_PROJECTS.filter((p) => p.tier === "app");

  return (
    <div className="about-page">
      <div className="about-inner">
        <button className="btn ghost about-close" onClick={onClose}>
          <ArrowLeft size={14} /> 返回儀錶板
        </button>

        {/* 關於作者 */}
        <section className="about-profile">
          <img className="about-avatar" src={ABOUT_PROFILE.avatar} alt={ABOUT_PROFILE.name} />
          <div className="about-profile-meta">
            <h1>{ABOUT_PROFILE.name}</h1>
            <div className="about-title">{ABOUT_PROFILE.title}</div>
            <div className="about-links">
              <a href={ABOUT_PROFILE.github} target="_blank" rel="noopener noreferrer">
                <Github size={15} /> GitHub
              </a>
              <a href={ABOUT_PROFILE.threads} target="_blank" rel="noopener noreferrer">
                <AtSign size={15} /> Threads
              </a>
            </div>
          </div>
        </section>

        {/* 一行生態系定位 */}
        <p className="about-eco">{ABOUT_ECOSYSTEM}</p>

        {/* 作品集 */}
        <section className="about-gallery-section">
          <h2 className="about-section-title">作品集</h2>
          <div className="about-gallery">
            {appProjects.map((p) => (
              <ProjectCard key={p.github} p={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
