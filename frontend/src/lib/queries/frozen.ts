/**
 * 凍結快照讀取器（2026-11-09，WA-3 §C 乙組）
 *
 * 一批不再更新的靜態表已搬出 Supabase（ADR-0026「不會變的資料不放 Supabase」），
 * 刪表前把前端原本查到的結果存成 public/data/frozen/<name>.json
 * （產生腳本：scripts/freeze-supabase-snapshots.py；原始資料正本在 S3 supabase-export/）。
 * 檔案格式：{ generated_at, data }；data 與原 PostgREST 回傳形狀相同。
 */

const inflight = new Map<string, Promise<unknown>>();

export function fetchFrozen<T>(name: string): Promise<T> {
  const url = `/data/frozen/${name}.json`;
  let p = inflight.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`frozen snapshot ${name}: HTTP ${res.status}`);
        return res.json() as Promise<{ generated_at: string; data: T }>;
      })
      .then((j) => j.data);
    // 失敗時移除，下次重試
    p.catch(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return p;
}
