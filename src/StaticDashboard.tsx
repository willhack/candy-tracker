import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Candy } from "../shared/types";

const candyColors = [
  "#ff6d8b",
  "#ffb84d",
  "#42c9a5",
  "#8b7cf6",
  "#55b8ee",
  "#f47bd1",
  "#a8cf50",
  "#ff8560",
];

function CandyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Candy & { color: string } }>;
}) {
  if (!active || !payload?.length) return null;

  const candy = payload[0].payload;

  return (
    <div className="static-tooltip">
      <span className="static-tooltip-dot" style={{ backgroundColor: candy.color }} />
      <strong>{candy.name}</strong>
      <span>{candy.count} pieces</span>
    </div>
  );
}

export default function StaticDashboard() {
  const [candies, setCandies] = useState<Candy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}candies.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load candy data (${response.status}).`);
        return response.json() as Promise<Candy[]>;
      })
      .then(setCandies)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load candy data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(
    () =>
      [...candies]
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.createdAt.localeCompare(b.createdAt) ||
            a.id - b.id,
        )
        .map((candy, index) => ({
          ...candy,
          color: candyColors[index % candyColors.length],
        })),
    [candies],
  );
  const totalCount = useMemo(
    () => candies.reduce((total, candy) => total + candy.count, 0),
    [candies],
  );
  const chartHeight = Math.max(405, chartData.length * 29 + 65);

  return (
    <main className="snapshot-page">
      <header className="snapshot-header">
        <a className="snapshot-brand" href="./" aria-label="Candy Tracker home">
          <span className="snapshot-brand-mark" aria-hidden="true">✦</span>
          <span>OUR CANDY STASH</span>
        </a>
        <span className="snapshot-season"><span aria-hidden="true">🎃</span> HALLOWEEN HAUL</span>
      </header>

      <section className="snapshot-intro" aria-labelledby="snapshot-title">
        <div>
          <p className="snapshot-eyebrow"><span /> THE SWEETEST COLLECTION</p>
          <h1 id="snapshot-title">Look at all that <span>candy!</span></h1>
          <p className="snapshot-subtitle">A colorful look at all the treats from our Halloween adventure.</p>
        </div>
        <div className="snapshot-stats" aria-label={`${totalCount} pieces across ${candies.length} candy types`}>
          <div className="snapshot-stat">
            <strong>{loading ? "—" : totalCount}</strong>
            <span>SWEET TREATS</span>
          </div>
          <span className="snapshot-stat-divider" aria-hidden="true" />
          <div className="snapshot-stat">
            <strong>{loading ? "—" : candies.length}</strong>
            <span>CANDY TYPES</span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="snapshot-message snapshot-error" role="alert">{error}</div>
      ) : loading ? (
        <div className="snapshot-message" role="status">Unwrapping the candy charts...</div>
      ) : candies.length === 0 ? (
        <div className="snapshot-message">
          <span aria-hidden="true">🍬</span>
          <strong>No candy in the stash yet!</strong>
        </div>
      ) : (
        <section className="snapshot-charts" aria-label="Candy collection charts">
          <article className="snapshot-card" aria-labelledby="pie-title">
            <div className="snapshot-card-heading">
              <div>
                <p className="snapshot-card-eyebrow">A LITTLE BIT OF EVERYTHING</p>
                <h2 id="pie-title">Candy by share</h2>
              </div>
              <span className="snapshot-card-icon" aria-hidden="true">◉</span>
            </div>
            <div className="snapshot-pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="54%"
                    outerRadius="82%"
                    paddingAngle={chartData.length > 1 ? 2 : 0}
                    stroke="none"
                    isAnimationActive
                    animationDuration={800}
                  >
                    {chartData.map((candy) => (
                      <Cell key={candy.id} fill={candy.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CandyTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="snapshot-pie-center" aria-hidden="true">
                <span>✦</span>
                <strong>{totalCount}</strong>
                <small>PIECES</small>
              </div>
            </div>
            <div className="snapshot-legend" aria-label="Candy chart key">
              {chartData.map((candy) => (
                <span className="snapshot-legend-item" key={candy.id}>
                  <i style={{ backgroundColor: candy.color }} />
                  {candy.name}
                </span>
              ))}
            </div>
          </article>

          <article className="snapshot-card" aria-labelledby="bar-title">
            <div className="snapshot-card-heading">
              <div>
                <p className="snapshot-card-eyebrow">THE BIGGEST FAVORITES</p>
                <h2 id="bar-title">Pieces of each candy</h2>
              </div>
              <span className="snapshot-card-icon bar-icon" aria-hidden="true">▥</span>
            </div>
            <div className="snapshot-bar-wrap" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 8, right: 22, bottom: 8, left: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#f1eaf2" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a397a8", fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={125}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#675474", fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip content={<CandyTooltip />} cursor={{ fill: "#fbf7fb" }} />
                  <Bar
                    dataKey="count"
                    name="Pieces"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={23}
                    isAnimationActive
                    animationDuration={800}
                  >
                    {chartData.map((candy) => (
                      <Cell key={candy.id} fill={candy.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}

      <footer className="snapshot-footer">
        <span>MADE FOR BIG TRICK-OR-TREATING ADVENTURES</span>
        <span aria-hidden="true">✦ &nbsp; 🍭 &nbsp; ✦</span>
        <span>{candies.length} CANDY TYPES &nbsp;·&nbsp; {totalCount} SWEET TREATS</span>
      </footer>
    </main>
  );
}
