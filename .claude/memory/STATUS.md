# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-07-08（Session 13 · Fable 5 監督 12 agents：theme registry + manifest validator + pulse 會員系統移植 + 安全加固 + /theme-bootstrap skill。全部 commit 完成，**未 push**）

---

## 一句話現況

四包大改造完成且三閘全綠（typecheck / 4 寬度截圖 / codex 0 critical）：**registry 讓加新主題零改 App/MapView**（842→391 行、`theme===` 41→0）、**validator 守 manifest**（`pnpm validate:themes`，24 項違規已清）、**會員系統與 pulse 共用**（Google OAuth + 全域 tier，示範鎖層 `info_medical_ltc`）、**安全債清零**（audit 5→0、migration 280 已 apply、nginx header）。info 7 commits + gis-platform 2 commits 停在本地待 push。

## ⚠️ 下個 session 第一件事：完成上線序列（順序不能亂）

1. **[user]** Zeabur info service `VITE_MAPBOX_TOKEN` 換成已設 URL 限制的那顆 token（帳號有三顆：線上 `…n-DiOiAQ` 無限制、本地+pulse 共用 `…KlH6m3lg` 無限制、已設 3 URL 限制的是第三顆 — 詳見 root `_STATUS.md` S13 段）
2. push info + gis-platform → Zeabur rebuild（順帶補線上缺的 forestry/fishery GeoJSON）
3. 部署完成後 psql apply **migration 281**（gis-platform `281_info_gated_ltc_demo.sql`；**先 apply 線上長照點位會 403**）
4. **[user]** 真 Google 帳號 e2e 登入 + pulse 後台調 tier 驗鎖層；Mapbox 刪舊 token `…n-DiOiAQ`
- Supabase Auth Redirect URLs 已加 ✅；本地 dev 撞 `vite@6.4.2 Cannot find module` = 舊 server 殘留，重跑 `pnpm dev` 即好

## 新武器（本 session 產出，之後開發用）

- **加新主題**：`/theme-bootstrap {主題}`（設計討論 SOP + 28 pattern 對照表）→ `/theme-loop`（實作迭代）。registry checklist 見 `frontend/src/lib/theme-registry.tsx` 檔頭
- **manifest 閘門**：`pnpm validate:themes`（改 yaml 必跑；DEV load 驗證失敗會 throw）
- **鎖新圖層**：gated_layers INSERT（`info_` 前綴）+ RPC 套 275/276 pattern + registry entry 加 `gateKey`。機密資料**絕不走** `public/data/*.geojson` 靜態檔（公開 URL，會員機制管不到）
- **tier-gated RPC 一律走主 client**（withSchema clients 不帶 access token）

## 下個 session 候選（上線序列完成後）

1. **SSOT 雙軌收斂**：急救醫院 fire/medical 兩條 query；「每萬人」分母 2024 靜態人口 vs demographics 不一致（S13 診斷、未動）
2. **汙染主題**：用 `/theme-bootstrap 汙染` 開場（本次改造的第一個實戰驗證）
3. 小 UI 債：圖例刻度黏連 / home-basics 空括號 / footer switcher 捲動提示 / choropleth 首載白圖
4. socioeconomic 主題（第 7 主題，從零建）、縣市別年度出生死亡、老化指數歷年口徑統一（S12 遺留）
5. nginx CSP（草稿在 nginx.conf 註解，staging Report-Only 驗證後啟用）

## S12 遺產指路

spawn 協作工作流文件在 `.claude/guidelines/`（cmux_tmux_spawn_primer / spawn_patterns_catalog / cross-repo-data-onboard-spawn / spawn-orchestration-lessons）+ `.claude/scripts/`。復用前先讀 lessons。
