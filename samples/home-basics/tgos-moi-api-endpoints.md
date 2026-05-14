# TGOS 內政主題 API 端點手冊

> Base URL: `https://data.tgos.tw/MOIDataThemeAPIMgr`
> Swagger: `https://data.tgos.tw/MOIDataThemeAPIMgr/swagger/index.html`
> 認證: query string `Apikey=$TGOS_MOI_API_KEY`

⚠️ **此 API 不是統計 API**。它是「POI 主題 + 行政區反查 + 郵遞區號」三合一空間查詢框架。**首頁人口統計需另接戶政月報**。

---

## 端點分類（共 9 個）

| Tag | 端點數 | 用途 |
|---|---|---|
| Theme | 4 | POI 點位主題查詢 |
| Range | 2 | 行政區 / 統計區反查 |
| Zip33 | 3 | 郵遞區號工具 |

---

## Theme 系列（POI 主題）

### `GET /Theme/List`

取得所有可用主題清單（學校 / 醫院 / 警察 / 消防 / 加油站 / …）。

```
Apikey: required
```

回傳：陣列 `[{Theme_Id, Theme_Name, ...}, ...]`

⚠️ Theme 種類**未在 swagger 明列**，需先呼叫此端點取得 Theme_Id。

### `GET /Theme/Query`

縣市 / 鄉鎮 + 關鍵字檢索主題點位。

```
Theme_Id:  string  required
County:    string  e.g. "臺北市"（要 URL-encode；用「臺」非「台」）
Town:      string  e.g. "信義區"
Keywords:  string  optional
Apikey:    required
```

**Mini Taiwan Info 用法**：
- View B 縣市儀錶板 POI Tab：`?County=X` 取全縣 POI
- 鄉鎮聚合熱圖：按 `Town` group by

### `GET /Theme/Nearest`

給座標找最近主題點。

```
Theme_Id: required
Lng, Lat: required
Apikey:   required
```

### `GET /Theme/Buffer`

環域內所有主題點，**Radius ≤ 10,000 公尺**。

```
Theme_Id: required
Lng, Lat: required
Radius:   integer  (公尺，max 10000)
Apikey:   required
```

**Mini Taiwan Info 用法**：消防分隊 5/10 分鐘服務圈、POI 詳情頁的「周邊 1km」

---

## Range 系列（行政區反查）⭐ 互動鑽取核心

### `GET /Range/Administrative`

給座標反查行政層級（縣 / 鄉鎮 / 村里）。

```
Unit: string  county | town | village  required
Lng, Lat: required
Apikey: required
```

**Mini Taiwan Info 用法**：
- 點地圖 → 取得縣市 ID → 進 View B
- 縣市內點鄉鎮 → 取得鄉鎮 ID → drill
- 鄉鎮內點地點 → 取得村里 ID → 進村里視圖

連續三次呼叫同一座標的 `Unit=county/town/village` 完成完整鑽取。

### `GET /Range/Statistics`

點 → 統計區反查（最小統計區 / 一級 / 二級發布區）。

```
Unit: string  codebase | code1 | code2  required
Lng, Lat: required
Apikey: required
```

**Mini Taiwan Info 用法**：與 segis 人口統計資料 join 的 key

---

## Zip33 系列（地址工具）

### `GET /Zip33/Addr`

最近門牌 → 3+3 碼郵遞區號

```
Lng, Lat: required
Apikey: required
```

### `GET /Zip33/Road`

路名 → 郵遞區號

```
County: string  required
Town:   string  required
Road:   string  required
Apikey: required
```

### `GET /Zip33/Door`

門牌號碼 → 郵遞區號（最精細）

```
County / Town / Road / Section / Number / ... + Apikey
```

---

## 使用陷阱

| 項 | 說明 |
|---|---|
| **認證** | 單一 `Apikey`（query string），無 AppID 雙鑰；Token 去 TGOS 會員中心申請 |
| **編碼** | County / Town 必須 URL-encode，用「臺」非「台」（例：`%E8%87%BA%E5%8C%97%E5%B8%82`）|
| **Buffer 上限** | `Radius` ≤ 10000，超過會被截斷 |
| **無時序** | 所有端點皆為**快照查詢**，不支援時間範圍參數 |
| **回傳格式** | swagger 未定義 response schema，**實際格式需實打驗證**（推測 JSON + WGS84） |
| **OFormat / SRS 參數** | 未在 swagger 出現；推測預設 JSON + WGS84，**未驗證** |
| **Rate limit** | swagger 未標示，建議節流（每秒數請求）；正式上線前壓測 |
| **「主題」是黑盒** | 需先呼叫 `/Theme/List` 才知有哪些 Theme_Id；推測涵蓋 POI 類非統計類 |

---

## Mini Taiwan Info 整合策略

### 後端代理 + cache

**不**讓瀏覽器直接打 TGOS API：
1. 後端建 `/api/geo/admin/:level?lng=&lat=` 等 wrapper endpoint
2. Apikey 只在後端 `.env`，不暴露前端
3. 結果 cache（Redis / SQLite）：
   - Range/Administrative 結果 → cache 1 天（行政區界 1 天內幾乎不變）
   - Theme/Query 縣市結果 → cache 1 小時
   - Theme/Buffer 周邊 → cache 10 分鐘
4. 統一錯誤處理 + retry

### 不該用 TGOS 的場景

- ❌ 人口統計 → 用戶政月報
- ❌ 縣市彙總數字（鄉鎮數、村里數）→ 用內政部行政區清冊
- ❌ 老化指數、出生率 → 用 segis / 戶政衍生

### 該用 TGOS 的場景

- ✅ 地圖點擊位置 → 反查行政區
- ✅ 縣市 POI 分布熱圖
- ✅ POI 詳情頁「周邊 1km」
- ✅ 地址搜尋框 → 定位

---

## 第一階段（Phase 1.5）只接這 3 個端點

1. `GET /Range/Administrative` — 點地圖鑽取
2. `GET /Theme/List` — 取得可用 POI 類型清單
3. `GET /Theme/Query?County=X` — 縣市 POI 分布

其他延後。
