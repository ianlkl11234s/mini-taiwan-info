/**
 * Donut — 圓環顯示排名 (n/total) + tier label
 */

interface Props {
  value: number;
  total?: number;
  size?: number;
  stroke?: number;
  tier?: string;
}

export function Donut({ value, total = 22, size = 110, stroke = 11, tier }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / total));
  const dash = c * pct;
  const gradId = `donut-grad-${Math.round(Math.random() * 1e6)}`;
  return (
    <div className="donut" style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-deep)" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="donut-label"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div>
          <div
            className="big tnum"
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            {value}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-tertiary)" }}>
              {" / "}
              {total}
            </span>
          </div>
          {tier && (
            <div
              className="tier"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--accent-deep)",
                marginTop: 6,
              }}
            >
              {tier}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
