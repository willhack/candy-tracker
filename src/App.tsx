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
  YAxis
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
  "#ff8560"
];

function compareCandyCreatedAt(a: Candy, b: Candy) {
  return a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
}

function compareCandyAlphabetically(a: Candy, b: Candy) {
  return a.name.localeCompare(b.name) || a.id - b.id;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}). Please try again.`);
  }

  return response.json() as Promise<T>;
}

type CandyUpdateResult = Candy | { id: number; name: string; deleted: true };
type ChartType = "pie" | "bar";

function CandyTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: Candy & { color: string } }>;
}) {
  if (!active || !payload?.length) return null;

  const candy = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <span className="tooltip-dot" style={{ backgroundColor: candy.color }} />
      <strong>{candy.name}</strong>
      <span>{candy.count} pieces</span>
    </div>
  );
}

function CandyRow({
  candy,
  color,
  disabled,
  onCountChange
}: {
  candy: Candy;
  color: string;
  disabled: boolean;
  onCountChange: (count: number) => void;
}) {
  const [countText, setCountText] = useState(String(candy.count));

  useEffect(() => {
    setCountText(String(candy.count));
  }, [candy.count]);

  function commitCount() {
    if (!/^\d+$/.test(countText)) {
      setCountText(String(candy.count));
      return;
    }

    const count = Number(countText);
    if (Number.isSafeInteger(count)) {
      onCountChange(count);
    } else {
      setCountText(String(candy.count));
    }
  }

  return (
    <li className="candy-row">
      <span className="candy-swatch" style={{ backgroundColor: color }} aria-hidden="true">
        <span />
      </span>
      <span className="candy-name">{candy.name}</span>
      <div className="count-controls" aria-label={`${candy.name} count controls`}>
        <button
          className="step-button"
          type="button"
          aria-label={`Remove one ${candy.name}`}
          disabled={disabled || candy.count === 0}
          onClick={() => onCountChange(candy.count - 1)}
        >
          −
        </button>
        <input
          className="count-input"
          aria-label={`${candy.name} count`}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={countText}
          disabled={disabled}
          onChange={(event) => setCountText(event.target.value)}
          onBlur={commitCount}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <button
          className="step-button"
          type="button"
          aria-label={`Add one ${candy.name}`}
          disabled={disabled}
          onClick={() => onCountChange(candy.count + 1)}
        >
          +
        </button>
      </div>
    </li>
  );
}

export default function App() {
  const [candies, setCandies] = useState<Candy[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIntake, setSavingIntake] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeIndex, setActiveIndex] = useState<number>();
  const [sortOrder, setSortOrder] = useState<"createdAt" | "alphabetical">("createdAt");
  const [chartType, setChartType] = useState<ChartType>("pie");

  useEffect(() => {
    request<Candy[]>("/api/candies")
      .then(setCandies)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load candy.");
      })
      .finally(() => setLoading(false));
  }, []);

  const totalCount = useMemo(
    () => candies.reduce((total, candy) => total + candy.count, 0),
    [candies]
  );
  const chartData = useMemo(
    () =>
      candies
        .map((candy, index) => ({
          ...candy,
          color: candyColors[index % candyColors.length]
        }))
        .sort((a, b) => b.count - a.count || compareCandyCreatedAt(a, b)),
    [candies]
  );
  const sortedChartData = useMemo(
    () =>
      [...chartData].sort(
        sortOrder === "createdAt" ? compareCandyCreatedAt : compareCandyAlphabetically
      ),
    [chartData, sortOrder]
  );

  async function addCandy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingIntake(true);

    try {
      const candy = await request<Candy>("/api/candies", {
        method: "POST",
        body: JSON.stringify({ name, count: Number(count) })
      });
      setCandies((current) => {
        const existingIndex = current.findIndex((item) => item.id === candy.id);
        if (existingIndex < 0) return [...current, candy].sort(compareCandyCreatedAt);
        return current.map((item) => (item.id === candy.id ? candy : item));
      });
      setName("");
      setCount("1");
      setNotice(`Yum! ${candy.name} is in the stash.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save candy.");
    } finally {
      setSavingIntake(false);
    }
  }

  async function updateCount(id: number, nextCount: number) {
    setError("");
    setNotice("");
    setPendingIds((current) => [...current, id]);

    try {
      const result = await request<CandyUpdateResult>(`/api/candies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ count: nextCount })
      });
      if ("deleted" in result) {
        setCandies((current) => current.filter((item) => item.id !== result.id));
        setNotice(`No more ${result.name} in your stash!`);
      } else {
        setCandies((current) => current.map((item) => (item.id === id ? result : item)));
        setNotice(`${result.name}: ${result.count} pieces.`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update candy.");
    } finally {
      setPendingIds((current) => current.filter((pendingId) => pendingId !== id));
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="My Candy Stash home">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>MY CANDY STASH</span>
        </a>
        <span className="season-pill">
          <span aria-hidden="true">🎃</span> HALLOWEEN HAUL
        </span>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> THE SWEETEST COLLECTION
          </p>
          <h1 id="page-title">
            Look at all
            <br />
            that <span>candy!</span>
          </h1>
          <p className="hero-description">
            Every treat has a little spot in your stash.
            <br className="desktop-break" /> Count your favorites and watch your collection grow!
          </p>
          <div
            className="hero-stats"
            aria-label={`${totalCount} total pieces across ${candies.length} candy types`}
          >
            <div className="stat">
              <span className="stat-number">{totalCount}</span>
              <span className="stat-label">SWEET TREATS</span>
            </div>
            <span className="stat-divider" aria-hidden="true" />
            <div className="stat">
              <span className="stat-number">{candies.length}</span>
              <span className="stat-label">CANDY TYPES</span>
            </div>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="sparkle sparkle-one">✦</span>
          <span className="sparkle sparkle-two">✦</span>
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <div className="candy-piece candy-piece-one">
            <span />
          </div>
          <div className="candy-piece candy-piece-two">
            <span />
          </div>
          <div className="candy-piece candy-piece-three">
            <span />
          </div>
          <div className="candy-piece candy-piece-four">
            <span />
          </div>
          <div className="hero-bag">
            <span className="bag-tie" />
            <span className="bag-face">☺</span>
            <span className="bag-label">
              SWEET
              <br />
              STASH
            </span>
          </div>
        </div>
      </section>

      <div className="content-grid">
        <section className="panel collection-panel" aria-labelledby="collection-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow section-eyebrow">YOUR HAUL</p>
              <h2 id="collection-title">Candy collection</h2>
            </div>
            <span className="type-badge">
              {candies.length} {candies.length === 1 ? "kind" : "kinds"}
            </span>
          </div>

          <div className="chart-switcher" role="group" aria-label="Chart type">
            <button
              type="button"
              className={chartType === "pie" ? "chart-switch active" : "chart-switch"}
              aria-pressed={chartType === "pie"}
              onClick={() => setChartType("pie")}
            >
              ◉ Pie
            </button>
            <button
              type="button"
              className={chartType === "bar" ? "chart-switch active" : "chart-switch"}
              aria-pressed={chartType === "bar"}
              onClick={() => setChartType("bar")}
            >
              ▥ Bars
            </button>
          </div>

          <div
            className={chartType === "bar" ? "chart-wrap bar-chart-wrap" : "chart-wrap"}
            style={chartType === "bar" ? { height: Math.max(286, chartData.length * 34 + 35) } : undefined}
          >
            {loading ? (
              <div className="empty-chart" role="status">
                Unwrapping your candy...
              </div>
            ) : candies.length === 0 ? (
              <div className="empty-chart">
                <span className="empty-candy" aria-hidden="true">
                  🍬
                </span>
                <strong>Your candy goes here!</strong>
                <span>Add your first treat to get started.</span>
              </div>
            ) : (
              <>
                {chartType === "pie" ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="57%"
                          outerRadius="82%"
                          paddingAngle={chartData.length > 1 ? 3 : 0}
                          stroke="none"
                          isAnimationActive
                          animationDuration={650}
                          activeIndex={activeIndex}
                          onMouseEnter={(_, index) => setActiveIndex(index)}
                          onMouseLeave={() => setActiveIndex(undefined)}
                        >
                          {chartData.map((item, index) => (
                            <Cell
                              key={item.id}
                              fill={item.color}
                              opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.68}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CandyTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="chart-center" aria-hidden="true">
                      <span className="center-sparkle">✦</span>
                      <strong>{totalCount}</strong>
                      <span>PIECES</span>
                    </div>
                  </>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 8, right: 25, bottom: 8, left: 3 }}
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
                        width={85}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#675474", fontSize: 10, fontWeight: 600 }}
                      />
                      <Tooltip content={<CandyTooltip />} cursor={{ fill: "#fbf7fb" }} />
                      <Bar
                        dataKey="count"
                        name="Pieces"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={24}
                        isAnimationActive
                        animationDuration={650}
                      >
                        {chartData.map((item) => (
                          <Cell key={item.id} fill={item.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </div>

          {candies.length > 0 && chartType === "pie" && (
            <div className="chart-legend" aria-label="Candy types in the chart">
              {chartData.map((candy, index) => (
                <span
                  className={activeIndex === index ? "legend-item legend-active" : "legend-item"}
                  key={candy.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  <i style={{ backgroundColor: candy.color }} />
                  {candy.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="panel list-panel" aria-labelledby="stash-title">
          <div className="section-heading list-heading">
            <div>
              <p className="eyebrow section-eyebrow">THE GOOD STUFF</p>
              <h2 id="stash-title">In your stash</h2>
            </div>
            <div className="list-tools">
              <span className="total-pill">
                {totalCount} <span>pieces</span>
              </span>
              <label className="sort-control">
                <span>SORT</span>
                <select
                  aria-label="Sort candy list"
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(
                      event.target.value === "alphabetical" ? "alphabetical" : "createdAt"
                    )
                  }
                >
                  <option value="createdAt">Date added</option>
                  <option value="alphabetical">A–Z</option>
                </select>
              </label>
            </div>
          </div>

          <div className="candy-list-region">
            {loading ? (
              <p className="list-message">Loading your stash...</p>
            ) : candies.length === 0 ? (
              <p className="list-message">Your list is waiting for its first candy!</p>
            ) : (
              <ul className="candy-list">
                {sortedChartData.map((candy) => (
                  <CandyRow
                    key={candy.id}
                    candy={candy}
                    color={candy.color}
                    disabled={pendingIds.includes(candy.id)}
                    onCountChange={(nextCount) => updateCount(candy.id, nextCount)}
                  />
                ))}
              </ul>
            )}
          </div>

          <form className="intake-form" onSubmit={addCandy}>
            <div className="form-heading">
              <span className="form-icon" aria-hidden="true">
                ✚
              </span>
              <div>
                <h3>Add to your stash</h3>
                <p>Find a new favorite? Pop it in!</p>
              </div>
            </div>
            <label className="field-label" htmlFor="candy-name">
              CANDY NAME
            </label>
            <input
              id="candy-name"
              className="text-input"
              type="text"
              placeholder="e.g. Gummy bears"
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <div className="count-field">
              <div>
                <label className="field-label" htmlFor="candy-count">
                  HOW MANY PIECES?
                </label>
                <span className="field-hint">Add a number to your stash</span>
              </div>
              <input
                id="candy-count"
                className="text-input intake-count"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={count}
                onChange={(event) => setCount(event.target.value)}
                required
              />
            </div>
            <button className="add-button" type="submit" disabled={savingIntake}>
              <span aria-hidden="true">✦</span>
              {savingIntake ? "Adding candy..." : "Add candy"}
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            </button>
            <p className="form-footnote">Already in your stash? We’ll add to its count!</p>
          </form>
        </section>
      </div>

      <footer className="footer">
        <span>MADE FOR BIG TRICK-OR-TREATING ADVENTURES</span>
        <span aria-hidden="true">✦ &nbsp; 🍭 &nbsp; ✦</span>
        <span>KEEP YOUR SWEET STASH CLOSE</span>
      </footer>

      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
      {error && (
        <div className="error-toast" role="alert">
          {error}
        </div>
      )}
    </main>
  );
}
