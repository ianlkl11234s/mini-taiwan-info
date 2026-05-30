/**
 * aboutProjects — About 分頁的作者 + 作品集 SSOT
 *
 * 資料來源：.claude/board/about_content.md（跨 7 個 GIS 專案盤點）。
 * 截圖放 public/about/，路徑以 "/about/..." 開頭（Vite public 根）。
 * GitHub 帳號統一 ianlkl11234s。
 *
 * tier:
 *   "app"   — 有互動前端的應用（作品集主區，有線上版的排前面）
 *   "infra" — 純後端 / 分析型，作為「生態系基礎建設」一區
 *
 * site 為「已驗證可得」的線上版才填；查不到 / 未公開部署一律留空，
 * 卡片只顯示 GitHub（鐵則 1：不編造連結）。
 */

export interface AboutProject {
  name: string;
  desc: string;
  github: string;
  site?: string;
  screenshot?: string;
  tier: "app" | "infra";
  current?: boolean; // 本站
}

export const ABOUT_PROFILE = {
  name: "Migu",
  title: "Senior Data Analyst / GIS",
  avatar: "/about/avatar.jpg",
  github: "https://github.com/ianlkl11234s",
  threads: "https://www.threads.com/@ianlkl1314",
} as const;

/** 一行生態系定位（資料收集 → 分析 → 應用前端） */
export const ABOUT_ECOSYSTEM =
  "資料收集 → 分析 → 應用前端：從開放資料管線到互動視覺化，一個人從後端到地圖全包的台灣 GIS 生態系。";

export const ABOUT_PROJECTS: AboutProject[] = [
  // ── 應用前端（有線上版的排前面）──
  {
    name: "Mini Taiwan Info",
    desc: "台灣縣市開放資料互動儀錶板 — 選主題、看全台、點縣市、展指標，把政府開放資料變成看得懂的故事。",
    site: "https://mini-tw-info.itsmigu.com",
    github: "https://github.com/ianlkl11234s/mini-taiwan-info",
    screenshot: "/about/mini-taiwan-info.png",
    tier: "app",
    current: true,
  },
  {
    name: "Mini Taiwan Pulse",
    desc: "用開放資料感受台灣脈動 — 航班、船舶、軌道、氣象即時動態，以 3D 光球／光軌／拖尾線呈現在同一張地圖。",
    // site：repo 內未硬編公開 URL，待確認後補上（鐵則 1 不編造）
    github: "https://github.com/ianlkl11234s/mini-taiwan-pulse",
    screenshot: "/about/pulse-all-taiwan-overview.png",
    tier: "app",
  },
  {
    name: "Taiwan Flight Arc",
    desc: "航班軌跡生成式藝術 — 東亞 138 座機場、32,616 筆起降軌跡化成發光弧線與光軌（Mapbox + Three.js）。",
    site: "https://flight-arc.zeabur.app/",
    github: "https://github.com/ianlkl11234s/flight-arc-graph",
    screenshot: "/about/flightarc-capture-all-taiwan.png",
    tier: "app",
  },
  {
    name: "Mini-Taiwan 軌道運輸模擬",
    desc: "真實時刻表驅動的交通即時模擬 — 2D／3D 呈現北高中捷運、高鐵、台鐵全路網 992 班列車運行。",
    site: "https://mini-taiwan-learning-project.zeabur.app/",
    github: "https://github.com/ianlkl11234s/mini-taiwan-learning-project",
    screenshot: "/about/rail-sim.png",
    tier: "app",
  },
  {
    name: "Taiwan Weather Timelapse",
    desc: "台灣氣象時序動畫視覺化 — 把氣象觀測資料轉成時間軸上的動態變化。",
    site: "https://taiwan-weather-timelapse.zeabur.app/",
    github: "https://github.com/ianlkl11234s/taiwan-weather-timelapse",
    screenshot: "/about/weather.png",
    tier: "app",
  },
];
