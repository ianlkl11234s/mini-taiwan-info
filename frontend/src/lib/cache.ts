/**
 * 輕量前端 cache 層 — sessionStorage-based、無外部依賴。
 *
 * 解決問題：切 tab 重打 Supabase。同一 session 內，相同 key 在 TTL 內
 * 命中快取直接回傳，避免重複網路請求。
 *
 * 三大機制：
 *  1. sessionStorage TTL 存儲 — 帶過期時間戳，過期即失效（session 關閉自動清空）。
 *  2. in-flight dedupe — 同 key 同時多次呼叫，只觸發一次 fetcher，其餘共用同一 Promise。
 *  3. fallback — sessionStorage 不可用（隱私模式 / quota / SSR）時靜默降級，
 *     直接打 fetcher，永不因為 cache 層而讓主流程崩潰。
 */

// ── TTL 分級常數（毫秒） ─────────────────────────────────────────────
/** LIVE：上游高頻更新（蓄水率 / 雨量 / 地下水 / 河川水位，~10min 一筆）。 */
export const TTL_LIVE = 5 * 60 * 1000; // 5 分鐘
/** 別名：對應「中等更新頻率」語意，與 TTL_SHORT 等值。 */
export const TTL_MEDIUM = 30 * 60 * 1000; // 30 分鐘
/** SHORT：日 ~ 週更新的動態資料（旱災警戒 / 漏水率 / 水質 / 每日運量）。 */
export const TTL_SHORT = TTL_MEDIUM; // 30 分鐘
/** LONG：年 / 月度 aggregation、基礎參照資料（人口 / 站點 / 港灣 ...）。 */
export const TTL_LONG = 6 * 60 * 60 * 1000; // 6 小時
/** STATIC：幾乎不變的靜態資料。別名語意，與 TTL_DAY 等值。 */
export const TTL_STATIC = 24 * 60 * 60 * 1000; // 24 小時
/** 別名：與 TTL_STATIC 等值，語意上強調「一天」。 */
export const TTL_DAY = TTL_STATIC;

// ── 內部設定與型別 ───────────────────────────────────────────────────
const KEY_PREFIX = "mti:cache:";

interface CacheEnvelope<T> {
  /** Unix epoch（毫秒）— 寫入快取的時間。 */
  t: number;
  /** 此筆快取的存活時間（毫秒）。 */
  ttl: number;
  /** 實際值。 */
  v: T;
}

/** 同一 session（單一頁面 runtime）內的 in-flight Promise 去重表。 */
const inFlight = new Map<string, Promise<unknown>>();

// ── sessionStorage 安全存取（不可用即降級） ─────────────────────────
function getStore(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    // 探測寫入權限（Safari 隱私模式會 throw）。
    const probe = `${KEY_PREFIX}__probe__`;
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readEnvelope<T>(key: string): CacheEnvelope<T> | null {
  const store = getStore();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY_PREFIX + key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.t !== "number" ||
      typeof parsed.ttl !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, value: T, ttlMs: number): void {
  const store = getStore();
  if (!store) return;
  try {
    const envelope: CacheEnvelope<T> = { t: Date.now(), ttl: ttlMs, v: value };
    store.setItem(KEY_PREFIX + key, JSON.stringify(envelope));
  } catch {
    // quota 滿 / 序列化失敗 → 靜默放棄寫入，不影響主流程。
  }
}

function isFresh<T>(envelope: CacheEnvelope<T>): boolean {
  return Date.now() - envelope.t < envelope.ttl;
}

// ── 核心 API ────────────────────────────────────────────────────────
/**
 * 帶 TTL + in-flight dedupe 的快取讀取。
 *
 * 流程：
 *  1. sessionStorage 命中且未過期 → 直接回傳（不打網路）。
 *  2. 已有相同 key 的請求在途 → 共用該 Promise（dedupe）。
 *  3. 否則執行 fetcher，成功後寫入快取，最後清理 in-flight 紀錄。
 *
 * fetcher 拋錯時不寫入快取、不污染後續呼叫。
 *
 * @param key    快取鍵（建議用 `domain:subject` 命名，如 `water:reservoir`）。
 * @param ttlMs  存活時間（毫秒），用 TTL_LIVE / TTL_SHORT / TTL_LONG / TTL_STATIC。
 * @param fetcher 取值函式（回傳 Promise）。
 */
export function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1) sessionStorage 命中且新鮮。
  const cached = readEnvelope<T>(key);
  if (cached && isFresh(cached)) {
    return Promise.resolve(cached.v);
  }

  // 2) in-flight dedupe。
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // 3) 實際取值。
  const promise = (async () => {
    try {
      const value = await fetcher();
      writeEnvelope(key, value, ttlMs);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

// ── 工具 ────────────────────────────────────────────────────────────
/**
 * 使單一 key 失效（移除 sessionStorage 紀錄 + in-flight 紀錄）。
 * 下次 cachedFetch 會重新取值。
 */
export function invalidate(key: string): void {
  inFlight.delete(key);
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(KEY_PREFIX + key);
  } catch {
    // 忽略。
  }
}

/**
 * 清空本 cache 層的所有資料。
 * 預設只清本層（KEY_PREFIX 前綴）的鍵，不動其他 sessionStorage 內容。
 *
 * @param prefix 可選的 key 前綴過濾（如 `water:` 只清水主題）。
 */
export function clear(prefix?: string): void {
  // 清 in-flight。
  if (prefix) {
    for (const k of inFlight.keys()) {
      if (k.startsWith(prefix)) inFlight.delete(k);
    }
  } else {
    inFlight.clear();
  }

  const store = getStore();
  if (!store) return;
  try {
    const fullPrefix = prefix ? KEY_PREFIX + prefix : KEY_PREFIX;
    const toRemove: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k !== null && k.startsWith(fullPrefix)) toRemove.push(k);
    }
    for (const k of toRemove) store.removeItem(k);
  } catch {
    // 忽略。
  }
}
