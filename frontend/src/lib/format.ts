/**
 * 數字 / 日期格式化（對齊 prototype `fmt.*`）
 */

export const fmt = {
  /** 千分位 + 指定小數位 */
  num(n: number | null | undefined, dp = 0): string {
    if (n == null || !Number.isFinite(n)) return "—";
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });
  },

  /** 百分比，例如 72.3% */
  pct(n: number | null | undefined, dp = 1): string {
    if (n == null || !Number.isFinite(n)) return "—";
    return `${n.toFixed(dp)}%`;
  },

  /** 百分點差，例如 +1.2 pp / -3.5 pp */
  pp(n: number | null | undefined, dp = 1): string {
    if (n == null || !Number.isFinite(n)) return "—";
    return `${n > 0 ? "+" : ""}${n.toFixed(dp)} pp`;
  },

  /** 帶符號數字，例如 +1.23 / -0.45 */
  signed(n: number | null | undefined, dp = 1): string {
    if (n == null || !Number.isFinite(n)) return "—";
    return `${n > 0 ? "+" : ""}${n.toFixed(dp)}`;
  },

  /** 大數縮寫，例如 23.5 萬 / 12.3 億 */
  bigNum(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return "—";
    if (n >= 1e8) return (n / 1e8).toFixed(2) + " 億";
    if (n >= 1e4) return (n / 1e4).toFixed(1) + " 萬";
    return n.toLocaleString();
  },

  /** ISO timestamp → 「YYYY-MM-DD HH:mm」 */
  datetime(iso: string | Date | null | undefined): string {
    if (!iso) return "—";
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  },

  /** ISO timestamp → 「YYYY-MM-DD」 */
  date(iso: string | Date | null | undefined): string {
    if (!iso) return "—";
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },
};
