/**
 * ViewA Fire — 消防主題全國概覽
 *
 * 4 區塊：火災發生 / 火災救災 / 火災交叉量能 / 其他救災救護
 *
 * 資料：useFireData() → Supabase（111-113 火災事件 + 5 大類 + MV）
 * placeholder：Sprint 2/3/4 部分用 mock，badge 明確標 待ETL
 *
 * 設計來源：designs/v03-fire-design-brief-2026-05-15/SPEC.md
 *           + Anthropic design bundle view-a-fire.jsx
 */

import { Flame } from "lucide-react";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import type { FireDataState } from "@/hooks/useFireData";
import { S1Incidents } from "@/components/fire/sections/S1Incidents";
import { S2Response } from "@/components/fire/sections/S2Response";
import { S3Capacity } from "@/components/fire/sections/S3Capacity";
import { S4Others } from "@/components/fire/sections/S4Others";

interface ViewAFireProps {
  data: FireDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

export function ViewAFire({ data, selectedCounty, onCountyClick }: ViewAFireProps) {
  const S = data.summary;
  const latestYear = S?.latest_year_minguo ?? 113;
  const western = latestYear + 1911;

  if (data.loading) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">全台概覽</span>
          <span className="small">· 消防</span>
          <Flame size={18} color="var(--accent)" />
        </h1>
        <p className="hook">正在載入消防資料 ...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">消防資料載入失敗</span>
        </h1>
        <p className="hook" style={{ color: "var(--accent-fire, #DC2626)" }}>
          {data.error.message}
        </p>
        <p className="muted">確認 .env.local 含 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY，且 fire schema 已 apply。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 消防</span>
              <Flame size={18} color="var(--accent)" />
            </h1>
            <p className="hook">
              <span className="em">島嶼的火帳，分四章看完。</span>{" "}
              民國 {latestYear} 年（{western}）火災 <b>{fmt.num(S?.yearly_incidents ?? 0)} 件</b> ·
              死亡 <b>{S?.total_deaths ?? 0}</b> · 受傷 <b>{S?.total_injuries ?? 0}</b>
              {S?.top_cause_5_name && (
                <>
                  ，主因「<b className="em">{S.top_cause_5_name}</b>」佔 {S.top_cause_5_pct?.toFixed(1)}%
                </>
              )}
              。
              <span className="muted" style={{ marginLeft: 4 }}>
                · 資料：消防署 13764（{fmt.num(data.countyYear.reduce((s, r) => s + r.incident_count, 0))} 件 / 民111-113）
              </span>
            </p>
          </div>
        </div>
      </div>

      <S1Incidents
        data={data}
        selectedCounty={selectedCounty}
        onCountyClick={onCountyClick}
      />
      <S2Response data={data} />
      <S3Capacity
        data={data}
        countyAggregates={data.countyAggregates}
        selectedCounty={selectedCounty}
        onCountyClick={onCountyClick}
      />
      <S4Others
        data={data}
        selectedCounty={selectedCounty}
        onCountyClick={onCountyClick}
      />
    </div>
  );
}
