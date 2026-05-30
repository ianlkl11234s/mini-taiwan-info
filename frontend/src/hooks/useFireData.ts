/**
 * useFireData — 消防主題全國資料 hook
 *
 * 一次拉全國級 MV + 新增 ETL 表（fire.stations/hydrants/shelters/disaster/forest/MOI 5 表/EMS）。
 * 用 Promise.allSettled，任一 query 失敗不拖垮其他（沿 useWaterKpis 模式 / PB-13）。
 *
 * 對應 themes/fire.yaml (v2)。Backend: migrations 099 + 104 + 105 + 106 + 107 + 108 + 109。
 */

import { useEffect, useState } from "react";
import {
  fetchCauseTaxonomy,
  fetchIncidentsByCountyYear,
  fetchIncidentsByCauseYear,
  fetchIncidentsByCountyCauseYear,
  fetchIncidentsByHourMonth,
  fetchIncidentsByDayOfYear,
  listIncidents,
  fetchFireStations,
  fetchFireHydrantCountsByCounty,
  fetchShelterNationalCount,
  fetchDisasterIncidents,
  fetchForestFireRiskSummary,
  fetchIncidentsBySeverity,
  fetchIncidentsByLocationType,
  fetchCasualtyProperty,
  fetchPersonnelVehicles,
  fetchEmsByCountyYear,
  fetchEmergencyHospitals,
  fetchServiceCoverageByCounty,
  fetchUncoveredVillagesTop,
  deriveHospitalSummary,
  deriveNationalCoverage,
  deriveNationalSummary,
  deriveCountyAggregates,
  deriveCauseAggregates,
  deriveMonthlyTotals,
  deriveHourlyTotals,
  deriveDaypart,
  deriveYearlyTotals,
  deriveDayOfYearSeries,
  deriveFinancialLoss,
  deriveEmsSummary,
  deriveCapacitySummary,
  deriveLocationTypeAgg,
  deriveSeverityAgg,
  type CauseTaxonomyRow,
  type FireNationalSummary,
  type FireCountyAggregate,
  type FireCauseAggregate,
  type FireStationRow,
  type FireHydrantCountRow,
  type DisasterIncidentRow,
  type ForestFireRiskSummary,
  type CasualtyPropertyRow,
  type PersonnelVehiclesRow,
  type EmsByCountyYearRow,
  type IncidentsBySeverityRow,
  type IncidentsByLocationTypeRow,
  type FireFinancialLossSummary,
  type FireEmsSummary,
  type FireCapacitySummary,
  type LocationTypeAggregate,
  type SeverityAggregate,
  type EmergencyHospitalRow,
  type EmergencyHospitalSummary,
  type ServiceCoverageRow,
  type NationalServiceCoverage,
  type UncoveredVillageRow,
  type IncidentsByCountyYearRow,
  type IncidentsByCauseYearRow,
  type IncidentsByCountyCauseYearRow,
  type IncidentsByHourMonthRow,
  type IncidentsByDayOfYearRow,
  type IncidentRow,
} from "@/lib/queries/fire";
import { cachedFetch, TTL_LIVE, TTL_SHORT, TTL_LONG } from "@/lib/cache";

export interface FireDataState {
  loading: boolean;
  error: Error | null;

  /** Raw MV rows（既有，給進階聚合 / county view 用） */
  countyYear: IncidentsByCountyYearRow[];
  causeYear: IncidentsByCauseYearRow[];
  countyCauseYear: IncidentsByCountyCauseYearRow[];
  hourMonth: IncidentsByHourMonthRow[];
  dayOfYear: IncidentsByDayOfYearRow[];
  taxonomy: CauseTaxonomyRow[];
  /** 個案點位（最新年）— heatmap 用 */
  incidentPoints: IncidentRow[];

  /** Raw new ETL */
  stations: FireStationRow[];
  /** 各涵蓋縣市消防栓數（Batch3 F-2：per-county，台北21,848/高雄39,392/新北8,572/屏東3；不再 SUM 全台） */
  hydrantCounts: FireHydrantCountRow[];
  /** 全國避難所總數（不拉明細，22 縣市齊） */
  shelterNationalCount: number;
  /** 中央災變最近 N 筆（全國 timeline） */
  disasterEvents: DisasterIncidentRow[];
  /** 山林火災風險點分布 */
  forestRisk: ForestFireRiskSummary | null;
  /** MOI 統計處 5 表 raw */
  severityRows: IncidentsBySeverityRow[];
  locationTypeRows: IncidentsByLocationTypeRow[];
  casualtyRows: CasualtyPropertyRow[];
  personnelRows: PersonnelVehiclesRow[];
  emsYearlyRows: EmsByCountyYearRow[];
  /** B066 急救醫院 raw + summary（safety.emergency_hospitals via wrapper） */
  hospitals: EmergencyHospitalRow[];
  hospitalSummary: EmergencyHospitalSummary | null;
  /** B067 縣市 3km 服務圈覆蓋 raw + 全國 derive */
  serviceCoverage: ServiceCoverageRow[];
  nationalCoverage: NationalServiceCoverage | null;
  /** B068 圈外人口 Top 100 村里 */
  uncoveredVillages: UncoveredVillageRow[];

  /** Derived 既有 */
  summary: FireNationalSummary | null;
  countyAggregates: FireCountyAggregate[];
  causeAggregates: FireCauseAggregate[];
  yearlyTotals: Array<{ year_minguo: number; incidents: number }>;
  monthlyTotals: Array<{ month: number; incidents: number }>;
  hourlyTotals: Array<{ hour: number; incidents: number }>;
  dayOfYearSeries: Array<{ day_index: number; month: number; day: number; incidents: number }>;
  daypart: Array<{ label: string; bucket: string; value: number }>;

  /** Derived 新 */
  financialLoss: FireFinancialLossSummary | null;
  emsSummary: FireEmsSummary | null;
  capacity: FireCapacitySummary | null;
  locationTypeAgg: LocationTypeAggregate | null;
  severityAgg: SeverityAggregate | null;
}

const EMPTY_STATE: FireDataState = {
  loading: true,
  error: null,
  countyYear: [],
  causeYear: [],
  countyCauseYear: [],
  hourMonth: [],
  dayOfYear: [],
  taxonomy: [],
  incidentPoints: [],
  stations: [],
  hydrantCounts: [],
  shelterNationalCount: 0,
  disasterEvents: [],
  forestRisk: null,
  severityRows: [],
  locationTypeRows: [],
  casualtyRows: [],
  personnelRows: [],
  emsYearlyRows: [],
  hospitals: [],
  hospitalSummary: null,
  serviceCoverage: [],
  nationalCoverage: null,
  uncoveredVillages: [],
  summary: null,
  countyAggregates: [],
  causeAggregates: [],
  yearlyTotals: [],
  monthlyTotals: [],
  hourlyTotals: [],
  dayOfYearSeries: [],
  daypart: [],
  financialLoss: null,
  emsSummary: null,
  capacity: null,
  locationTypeAgg: null,
  severityAgg: null,
};

export function useFireData(opts: { enabled?: boolean } = {}): FireDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<FireDataState>(EMPTY_STATE);

  useEffect(() => {
    if (!enabled) {
      setState({ ...EMPTY_STATE, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      // Promise.allSettled — 任一 query 失敗不拖垮其他（PB-13 / Session 8 教訓）
      const results = await Promise.allSettled([
        cachedFetch("fire:cause_taxonomy", TTL_LONG, fetchCauseTaxonomy),                                 // 0
        cachedFetch("fire:incidents_by_county_year", TTL_LONG, fetchIncidentsByCountyYear),               // 1
        cachedFetch("fire:incidents_by_cause_year", TTL_LONG, fetchIncidentsByCauseYear),                 // 2
        cachedFetch("fire:incidents_by_county_cause_year", TTL_LONG, fetchIncidentsByCountyCauseYear),    // 3
        cachedFetch("fire:incidents_by_hour_month:113", TTL_LONG, () => fetchIncidentsByHourMonth(113)),   // 4（Batch3 F-1：單年 113）
        cachedFetch("fire:incidents_by_day_of_year:113", TTL_LIVE, () => fetchIncidentsByDayOfYear(113)), // 5
        cachedFetch("fire:list_incidents:113", TTL_SHORT, () => listIncidents({ yearMin: 113, yearMax: 113, limit: 50000 })), // 6
        // ─── 新 ETL ───
        cachedFetch("fire:fire_stations", TTL_LONG, fetchFireStations),                                   // 7
        cachedFetch("fire:hydrant_counts_by_county:v2", TTL_LONG, fetchFireHydrantCountsByCounty),         // 8（Batch3 F-2：per-county）
        cachedFetch("fire:shelter_count", TTL_LONG, fetchShelterNationalCount),                           // 9
        // 55k 筆 county-level，~15 unique disaster_name。多拉樣本確保 ViewA timeline dedupe 後仍能拿 6+ 種
        cachedFetch("fire:disaster_incidents:2000", TTL_SHORT, () => fetchDisasterIncidents({ limit: 2000, orderDesc: true })), // 10
        cachedFetch("fire:forest_risk_summary", TTL_LONG, fetchForestFireRiskSummary),                    // 11
        cachedFetch("fire:incidents_by_severity", TTL_LONG, fetchIncidentsBySeverity),                    // 12
        cachedFetch("fire:incidents_by_location_type", TTL_LONG, fetchIncidentsByLocationType),           // 13
        cachedFetch("fire:casualty_property", TTL_LONG, fetchCasualtyProperty),                           // 14
        cachedFetch("fire:personnel_vehicles", TTL_LONG, fetchPersonnelVehicles),                         // 15
        cachedFetch("fire:ems_by_county_year", TTL_SHORT, fetchEmsByCountyYear),                          // 16
        cachedFetch("fire:emergency_hospitals", TTL_LONG, fetchEmergencyHospitals),                       // 17 B066
        cachedFetch("fire:service_coverage_by_county", TTL_LONG, fetchServiceCoverageByCounty),           // 18 B067
        cachedFetch("fire:uncovered_villages_top", TTL_LONG, fetchUncoveredVillagesTop),                  // 19 B068
      ]);
      if (cancelled) return;

      const get = <T,>(idx: number, fallback: T): T =>
        results[idx].status === "fulfilled"
          ? ((results[idx] as PromiseFulfilledResult<T>).value ?? fallback)
          : fallback;

      const queryNames = [
        "taxonomy", "incidents_by_county_year", "incidents_by_cause_year",
        "incidents_by_county_cause_year", "incidents_by_hour_month",
        "incidents_by_day_of_year", "list_incidents",
        "fire_stations", "hydrant_counts_by_county", "shelter_count",
        "disaster_incidents", "forest_risk_summary",
        "incidents_by_severity", "incidents_by_location_type",
        "casualty_property", "personnel_vehicles", "ems_by_county_year",
        "emergency_hospitals", "service_coverage_by_county", "uncovered_villages_top",
      ];
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          // eslint-disable-next-line no-console
          console.warn(`[useFireData] ${queryNames[i]} fetch failed:`, r.reason);
        }
      });

      // Raw rows
      const taxonomy = get(0, [] as CauseTaxonomyRow[]);
      const countyYear = get(1, [] as IncidentsByCountyYearRow[]);
      const causeYear = get(2, [] as IncidentsByCauseYearRow[]);
      const countyCauseYear = get(3, [] as IncidentsByCountyCauseYearRow[]);
      const hourMonth = get(4, [] as IncidentsByHourMonthRow[]);
      const dayOfYear = get(5, [] as IncidentsByDayOfYearRow[]);
      const incidentPoints = get(6, [] as IncidentRow[]);
      const stations = get(7, [] as FireStationRow[]);
      const hydrantCounts = get(8, [] as FireHydrantCountRow[]);
      const shelterNationalCount = get(9, 0);
      const disasterEvents = get(10, [] as DisasterIncidentRow[]);
      const forestRisk = get<ForestFireRiskSummary | null>(11, null);
      const severityRows = get(12, [] as IncidentsBySeverityRow[]);
      const locationTypeRows = get(13, [] as IncidentsByLocationTypeRow[]);
      const casualtyRows = get(14, [] as CasualtyPropertyRow[]);
      const personnelRows = get(15, [] as PersonnelVehiclesRow[]);
      const emsYearlyRows = get(16, [] as EmsByCountyYearRow[]);
      const hospitals = get(17, [] as EmergencyHospitalRow[]);
      const serviceCoverage = get(18, [] as ServiceCoverageRow[]);
      const uncoveredVillages = get(19, [] as UncoveredVillageRow[]);

      const summary = deriveNationalSummary(countyYear, causeYear);
      const latest = summary?.latest_year_minguo ?? 113;

      // Any critical query failed → set error but still expose what came back
      const criticalFailed = [1, 2].some((i) => results[i].status === "rejected");
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      const error = criticalFailed && firstError
        ? (firstError.reason instanceof Error ? firstError.reason : new Error(String(firstError.reason)))
        : null;

      setState({
        loading: false,
        error,
        countyYear,
        causeYear,
        countyCauseYear,
        hourMonth,
        dayOfYear,
        taxonomy,
        incidentPoints,
        stations,
        hydrantCounts,
        shelterNationalCount,
        disasterEvents,
        forestRisk,
        severityRows,
        locationTypeRows,
        casualtyRows,
        personnelRows,
        emsYearlyRows,
        hospitals,
        hospitalSummary: deriveHospitalSummary(hospitals),
        serviceCoverage,
        nationalCoverage: deriveNationalCoverage(serviceCoverage),
        uncoveredVillages,
        summary,
        countyAggregates: deriveCountyAggregates(countyYear),
        causeAggregates: deriveCauseAggregates(causeYear, latest),
        yearlyTotals: deriveYearlyTotals(countyYear),
        monthlyTotals: deriveMonthlyTotals(hourMonth),
        hourlyTotals: deriveHourlyTotals(hourMonth),
        dayOfYearSeries: deriveDayOfYearSeries(dayOfYear),
        daypart: deriveDaypart(hourMonth),
        financialLoss: deriveFinancialLoss(casualtyRows),
        emsSummary: deriveEmsSummary(emsYearlyRows),
        capacity: deriveCapacitySummary(personnelRows),
        locationTypeAgg: deriveLocationTypeAgg(locationTypeRows),
        severityAgg: deriveSeverityAgg(severityRows),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
