# 過夜執行報告 — mini-taiwan-info 上架前資料真實化

> 給早上醒來的 user。每個 Wave 做了什麼、commit 了什麼、卡在哪。
> 主 agent 過夜自動填。詳細計畫見 `SESSION_BOARD.md` / `tmp/evening_plan.md`。
> **policy**：fresh session per task → 自己 commit → 主 agent 關 session → 開下一個；每波不 push。

開始時間：2026-05-29 23:5x

---

## ✅ Wave 0 — demographics 鄉鎮/村里資料（session recon_demog，已關閉）

**做了什麼**
- demographics schema：發現**本來就已 exposed**（全部文件記 406 是 stale，實測 anon REST 200），更正 4 處文件
- 新 `township_village_count` VIEW（368 鄉鎮 / 村里 7,975）— gis-platform mig 126
- 新 `population_by_township_monthly` 表 + `township_rank` VIEW（368 鄉鎮 2024-12，總人口 23,400,220）— mig 127 + analytics pipeline
- 修正資料源：ODRP005（有人口數）非 ODRP010（僅人口動態）

**commit**（未 push）
- gis-platform `295a546` feat(demographics): 村里數 VIEW + 人口排名表/VIEW（mig 126/127）
- analytics `cfc5730` feat(demographics): 鄉鎮人口排名 + 村里數 pipeline + catalog

**連帶發現（影響後續 wave）**
- ⚠️ maritime / rail / demographics **全部已 exposed**（data-inventory 證實）→ 後續「expose」工作多半不需要，先實測 REST 再說
- ⚠️ 稽核 Explore agent 多處幻覺（maritime 漁權/燈塔表「已存在」實為不存在）→ 建表類一律對 migrations 驗證
- 鄰數無全國機器可讀源 → 前端標「估計」，村里數用真實

**前端待接（Wave 3 我做）**：金字塔/村里數/鄉鎮排名 3 端點皆需 header `Accept-Profile: demographics`

---
<!-- 後續 Wave 在此 append -->
