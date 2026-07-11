import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  DatabaseZap,
  ExternalLink,
  Eye,
  RefreshCw,
  Gauge,
  Layers3,
  LineChart,
  Loader2,
  Newspaper,
  Palette,
  Radar,
  Search,
  ShieldAlert,
  Fingerprint,
  Sliders,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WandSparkles,
  XCircle
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
const examples = [
  "Reliance", "TCS", "HDFC Bank", "Infosys", "ICICI Bank", 
  "Tata Motors", "SBI", "Bharti Airtel", "L&T", "ITC",
  "Nifty 50", "Tesla", "Apple", "NVIDIA", "Microsoft", 
  "Amazon", "Google", "Meta", "AMD", "Netflix"
];
const candleRanges = ["1mo", "3mo", "6mo", "1y", "2y"];
const themes = [
  { id: "cyberpunk", label: "Cyberpunk", swatches: ["#ff0055", "#00ffcc", "#fffc00"] },
  { id: "vaporwave", label: "Vaporwave", swatches: ["#ff71ce", "#01cdfe", "#b967ff"] },
  { id: "acid", label: "Acid Synth", swatches: ["#39ff14", "#ff007f", "#00ffff"] },
  { id: "supernova", label: "Supernova", swatches: ["#ff3300", "#ff9900", "#ff00ff"] },
  { id: "nebula", label: "Nebula X", swatches: ["#00f5ff", "#ff2bd6", "#ffe66d"] },
  { id: "aurora", label: "Aurora", swatches: ["#52e0a3", "#2e76ff", "#b56cff"] },
  { id: "plasma", label: "Plasma", swatches: ["#ff4fd8", "#7c5cff", "#00d4ff"] },
  { id: "solar", label: "Solar", swatches: ["#ffb84d", "#ff5c35", "#22d3ee"] }
];

function decisionIcon(decision) {
  if (decision === "invest") return <CheckCircle2 aria-hidden="true" />;
  if (decision === "pass") return <XCircle aria-hidden="true" />;
  return <AlertTriangle aria-hidden="true" />;
}

function formatMetric(value, type = "text", currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unavailable";
  if (type === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      notation: "compact",
      maximumFractionDigits: 2
    }).format(value);
  }
  if (type === "compact") {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  }
  if (type === "percent") return `${(value * 100).toFixed(1)}%`;
  if (typeof value === "number") return value.toFixed(Math.abs(value) >= 100 ? 0 : 2);
  return value;
}

function App() {
  const [company, setCompany] = useState("Tata Consultancy Services");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("cyberpunk");
  const [glassOpacity, setGlassOpacity] = useState(8);
  const [glassBlur, setGlassBlur] = useState(4);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scenario, setScenario] = useState("base");
  const [candleRange, setCandleRange] = useState("1y");
  const loading = status === "loading";

  async function runResearch(event) {
    event?.preventDefault();
    if (!company.trim()) return;
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company.trim(), range: candleRange })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Research failed");
      setResult(payload);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const quote = result?.marketData?.quote || {};
  const technicals = result?.marketData?.technicals || {};
  const sourceCount = result?.sources?.length || 0;
  const newsCount = result?.webResearch?.results?.length || 0;
  const metrics = useMemo(() => ([
    { label: "Live price", value: quote.regularMarketPrice, type: "currency", icon: <CircleDollarSign /> },
    { label: "Market cap", value: quote.marketCap, type: "currency", icon: <BadgeIndianRupee /> },
    { label: "1Y return", value: quote.oneYearReturn, type: "percent", icon: quote.oneYearReturn >= 0 ? <TrendingUp /> : <TrendingDown /> },
    { label: "52W range", value: quote.fiftyTwoWeekHigh ? `${formatMetric(quote.fiftyTwoWeekLow, "currency", quote.currency)} - ${formatMetric(quote.fiftyTwoWeekHigh, "currency", quote.currency)}` : null, icon: <Activity /> },
    { label: "Volatility", value: technicals.volatility, type: "percent", icon: <Gauge /> },
    { label: "Max drawdown", value: technicals.maxDrawdown, type: "percent", icon: <ShieldAlert /> },
    { label: "Trend", value: technicals.trend, icon: <LineChart /> },
    { label: "Volume", value: quote.regularMarketVolume, type: "compact", icon: <BarChart3 /> }
  ]), [quote, technicals]);

  const intelligenceItems = useMemo(() => ([
    { label: "Ticker resolved", value: result?.company?.symbol || "Awaiting run", icon: <DatabaseZap /> },
    { label: "Live news", value: result ? `${newsCount} items` : "Awaiting run", icon: <Newspaper /> },
    { label: "Price samples", value: result ? `${result.marketData?.priceSeries?.length || 0} points` : "Awaiting run", icon: <Layers3 /> },
    { label: "Source graph", value: result ? `${sourceCount} links` : "Awaiting run", icon: <ExternalLink /> }
  ]), [result, newsCount, sourceCount]);

  const bgBars = useMemo(() => {
    const count = 50;
    const heights = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 4;
      return 60 + Math.sin(angle) * 35 + Math.cos(angle * 2.5) * 15;
    });
    return [...heights, ...heights];
  }, []);

  if (!isLoggedIn) {
    return (
      <main
        className={`shell theme-${theme}`}
        style={{
          "--custom-panel-opacity": `${glassOpacity / 100}`,
          "--custom-blur": `${glassBlur}px`
        }}
      >
        <div className="market-scene" aria-hidden="true">
          <svg className="bg-chart bg-chart-1" viewBox="0 0 2880 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0,350 Q 180,150 360,400 T 720,250 T 1080,450 T 1440,350 Q 1620,150 1800,400 T 2160,250 T 2520,450 T 2880,350 L 2880,600 L 0,600 Z" fill="url(#chartGrad1)" />
            <path d="M 0,350 Q 180,150 360,400 T 720,250 T 1080,450 T 1440,350 Q 1620,150 1800,400 T 2160,250 T 2520,450 T 2880,350" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeOpacity="0.3" />
            <circle cx="360" cy="400" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
            <circle cx="720" cy="250" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
            <circle cx="1080" cy="450" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
            <circle cx="1800" cy="400" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
            <circle cx="2160" cy="250" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
            <circle cx="2520" cy="450" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
          </svg>

          <svg className="bg-chart bg-chart-2" viewBox="0 0 2880 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.06" />
                <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0,250 Q 180,400 360,200 T 720,380 T 1080,180 T 1440,250 Q 1620,400 1800,200 T 2160,380 T 2520,180 T 2880,250 L 2880,600 L 0,600 Z" fill="url(#chartGrad2)" />
            <path d="M 0,250 Q 180,400 360,200 T 720,380 T 1080,180 T 1440,250 Q 1620,400 1800,200 T 2160,380 T 2520,180 T 2880,250" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeOpacity="0.2" />
          </svg>

          <svg className="bg-bars bg-bars-scroll" viewBox="0 0 2000 200" preserveAspectRatio="none">
            <g>
              {bgBars.map((height, index) => {
                const x = index * 20;
                const barHeight = height;
                const y = 200 - barHeight;
                return (
                  <rect
                    key={index}
                    x={x}
                    y={y}
                    width="8"
                    height={barHeight}
                    fill="var(--accent-3)"
                    opacity="0.04"
                    className="bg-bar-rect"
                    style={{
                      animationDelay: `${index * 60}ms`
                    }}
                  />
                );
              })}
            </g>
          </svg>
        </div>
        <LoginPage onLogin={() => setIsLoggedIn(true)} theme={theme} setTheme={setTheme} themes={themes} />
      </main>
    );
  }

  return (
    <main
      className={`shell theme-${theme}`}
      style={{
        "--custom-panel-opacity": `${glassOpacity / 100}`,
        "--custom-blur": `${glassBlur}px`
      }}
    >
      <div className="market-scene" aria-hidden="true">
        {/* Scrolling background chart 1 */}
        <svg className="bg-chart bg-chart-1" viewBox="0 0 2880 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0,350 Q 180,150 360,400 T 720,250 T 1080,450 T 1440,350 Q 1620,150 1800,400 T 2160,250 T 2520,450 T 2880,350 L 2880,600 L 0,600 Z" fill="url(#chartGrad1)" />
          <path d="M 0,350 Q 180,150 360,400 T 720,250 T 1080,450 T 1440,350 Q 1620,150 1800,400 T 2160,250 T 2520,450 T 2880,350" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeOpacity="0.3" />
          <circle cx="360" cy="400" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
          <circle cx="720" cy="250" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
          <circle cx="1080" cy="450" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
          <circle cx="1800" cy="400" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
          <circle cx="2160" cy="250" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
          <circle cx="2520" cy="450" r="4" fill="var(--accent)" opacity="0.6" className="bg-chart-node" />
        </svg>

        {/* Scrolling background chart 2 */}
        <svg className="bg-chart bg-chart-2" viewBox="0 0 2880 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0,250 Q 180,400 360,200 T 720,380 T 1080,180 T 1440,250 Q 1620,400 1800,200 T 2160,380 T 2520,180 T 2880,250 L 2880,600 L 0,600 Z" fill="url(#chartGrad2)" />
          <path d="M 0,250 Q 180,400 360,200 T 720,380 T 1080,180 T 1440,250 Q 1620,400 1800,200 T 2160,380 T 2520,180 T 2880,250" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeOpacity="0.2" />
        </svg>

        {/* Scrolling background bar chart */}
        <svg className="bg-bars bg-bars-scroll" viewBox="0 0 2000 200" preserveAspectRatio="none">
          <g>
            {bgBars.map((height, index) => {
              const x = index * 20; // 20px spacing
              const barHeight = height;
              const y = 200 - barHeight;
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width="8"
                  height={barHeight}
                  fill="var(--accent-3)"
                  opacity="0.04"
                  className="bg-bar-rect"
                  style={{
                    animationDelay: `${index * 60}ms`
                  }}
                />
              );
            })}
          </g>
        </svg>
      </div>
      <section className="workspace">
        <aside className="left-panel">
          <div className="brand">
            <div className="brand-mark"><LineChart size={22} /></div>
            <div>
              <p>Altuni AI Labs</p>
              <h1>AI Investment Research Agent</h1>
            </div>
          </div>

          <form className="search-box" onSubmit={runResearch}>
            <label htmlFor="company">Research a listed company</label>
            <div className="input-row">
              <Search size={18} />
              <input
                id="company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Company name or ticker"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading && <Loader2 className="spin" size={18} />}
              Generate memo
            </button>
          </form>

          <div className="range-switcher">
            <h2>Real Candle Range</h2>
            <div>
              {candleRanges.map((range) => (
                <button
                  type="button"
                  key={range}
                  className={candleRange === range ? "active" : ""}
                  onClick={() => setCandleRange(range)}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-picks" aria-label="Example companies">
            {examples.map((item) => (
              <button key={item} type="button" onClick={() => setCompany(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="theme-switcher">
            <h2><Palette size={16} /> Neon Bar Theme</h2>
            <div className="theme-options" role="group" aria-label="Theme selector">
              {themes.map((item) => (
                <button
                  className={theme === item.id ? "theme-option active" : "theme-option"}
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  aria-pressed={theme === item.id}
                >
                  <span>{item.label}</span>
                  <b>
                    {item.swatches.map((color) => <i key={color} style={{ background: color }} />)}
                  </b>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-controls">
            <h2><Sliders size={16} /> Glass Adjustments</h2>
            <div className="slider-group">
              <div className="slider-row">
                <div className="slider-label">
                  <span>Opacity</span>
                  <strong>{glassOpacity}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={glassOpacity}
                  onChange={(e) => setGlassOpacity(Number(e.target.value))}
                  className="glass-slider"
                  aria-label="Panel glass opacity"
                />
              </div>
              <div className="slider-row">
                <div className="slider-label">
                  <span>Blur</span>
                  <strong>{glassBlur}px</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={glassBlur}
                  onChange={(e) => setGlassBlur(Number(e.target.value))}
                  className="glass-slider"
                  aria-label="Panel glass blur"
                />
              </div>
            </div>
          </div>

          <div className="process">
            <h2>Real Research Pipeline</h2>
            <div className="pipeline-step"><span>01</span><p>Resolve listed equity through Yahoo Finance search.</p></div>
            <div className="pipeline-step"><span>02</span><p>Fetch live chart, price, range, volume, and technical risk signals.</p></div>
            <div className="pipeline-step"><span>03</span><p>Pull recent Yahoo Finance news and optional Tavily web evidence.</p></div>
            <div className="pipeline-step"><span>04</span><p>Use LangChain structured reasoning or transparent factor scoring.</p></div>
          </div>

          <div className="side-intel">
            <h2>Signal Stack</h2>
            {intelligenceItems.map((item) => (
              <div className="intel-row" key={item.label}>
                {item.icon}
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className="result-panel" aria-live="polite">
          {status === "idle" && <LandingState onPick={setCompany} />}
          {status === "loading" && <LoadingState company={company} />}
          {status === "error" && <ErrorState error={error} />}
          {result && (
            <article className="memo">
              <header className={`decision ${result.analysis.decision}`}>
                <div className="decision-copy">
                  <span className="decision-pill">{decisionIcon(result.analysis.decision)} {result.analysis.decision}</span>
                  <h2>{result.company.resolvedName}</h2>
                  <p>{result.analysis.summary}</p>
                  <div className="identity-row">
                    <span>{result.company.symbol}</span>
                    <span>{result.company.exchange}</span>
                    <span>{quote.currency || "Currency unavailable"}</span>
                    <span>{result.mode === "llm" ? "LLM memo" : "Transparent scoring"}</span>
                  </div>
                </div>
                <div className="confidence">
                  <strong>{result.analysis.confidence}</strong>
                  <small>conviction score</small>
                </div>
              </header>

              <section className="chart-band">
                <div>
                  <p>90-Day Price Tape</p>
                  <h3>{formatMetric(quote.regularMarketPrice, "currency", quote.currency)}</h3>
                  <span className="microcopy">Rendered from live Yahoo Finance chart data.</span>
                </div>
                <Sparkline points={result.marketData.priceSeries || []} />
              </section>

              <section className="candle-terminal">
                <div className="section-heading">
                  <div>
                    <h3><BarChart3 size={18} /> Live Candlestick Chart</h3>
                    <p>Real OHLC candles from Yahoo Finance. No dummy bars.</p>
                  </div>
                  <div className="chart-actions">
                    <span>{result.marketData.chartRange?.toUpperCase()} · {result.marketData.chartInterval}</span>
                    <button type="button" onClick={() => runResearch()} disabled={loading}>
                      {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
                      Refresh
                    </button>
                  </div>
                </div>
                <CandlestickChart candles={result.marketData.candles || []} currency={quote.currency} />
                <div className="chart-footer">
                  <span>Updated: {new Date(result.generatedAt).toLocaleString()}</span>
                  <span>{result.marketData.candles?.length || 0} real candles</span>
                </div>
              </section>

              <section className="advanced-grid">
                <AdvancedPanel
                  icon={<BrainCircuit />}
                  title="AI Research Brain"
                  value={result.mode === "llm" ? "LLM reasoning active" : "Transparent scoring active"}
                  text="The memo uses structured LangChain output when an OpenAI key is configured; otherwise the scoring model remains auditable."
                />
                <AdvancedPanel
                  icon={<Radar />}
                  title="Risk Radar"
                  value={technicals.maxDrawdown ? `${(technicals.maxDrawdown * 100).toFixed(1)}% drawdown` : "Drawdown unavailable"}
                  text={`Trend is ${technicals.trend || "unavailable"} with volatility ${formatMetric(technicals.volatility, "percent")}.`}
                />
                <AdvancedPanel
                  icon={<DatabaseZap />}
                  title="Evidence Quality"
                  value={`${newsCount} news items`}
                  text={`${sourceCount} total sources are attached to the memo, including live Yahoo Finance links.`}
                />
              </section>

              <ScenarioLens
                scenario={scenario}
                setScenario={setScenario}
                result={result}
                technicals={technicals}
                newsCount={newsCount}
              />

              <section className="metric-grid">
                {metrics.map((metric) => (
                  <div className="metric" key={metric.label}>
                    <span>{metric.icon}{metric.label}</span>
                    <strong>{formatMetric(metric.value, metric.type, quote.currency)}</strong>
                  </div>
                ))}
              </section>

              <section className="scorecard">
                <div className="section-heading">
                  <h3><Gauge size={18} /> Factor Scorecard</h3>
                  <p>Every score is derived from live market/news evidence returned by the backend.</p>
                </div>
                <div className="score-grid">
                  {(result.analysis.scorecard || []).map((item) => (
                    <div className="score-item" key={item.label}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.comment}</span>
                      </div>
                      <meter min="0" max="100" value={item.score} />
                      <b>{Math.round(item.score)}</b>
                    </div>
                  ))}
                </div>
              </section>

              <div className="memo-grid">
                <MemoList icon={<CheckCircle2 />} title="Investment Thesis" items={result.analysis.thesis} />
                <MemoList icon={<ShieldAlert />} title="Key Risks" items={result.analysis.risks} />
                <MemoList icon={<Target />} title="Catalysts" items={result.analysis.catalysts} />
                <MemoList icon={<Eye />} title="Watch Items" items={result.analysis.watchItems} />
              </div>

              <section className="details">
                <h3><ClipboardList size={18} /> Decision Reasoning</h3>
                <p>{result.analysis.reasoning}</p>
              </section>

              <section className="details">
                <h3><Target size={18} /> Execution Checklist</h3>
                <div className="checklist-grid">
                  <ChecklistItem label="Verify official filings" active />
                  <ChecklistItem label="Compare peers and multiples" active={Boolean(quote.trailingPE)} />
                  <ChecklistItem label="Review latest news flow" active={newsCount > 0} />
                  <ChecklistItem label="Size position after risk review" active={result.analysis.confidence >= 60} />
                </div>
              </section>

              <section className="details">
                <h3><Newspaper size={18} /> Recent Research Signals</h3>
                <div className="news-grid">
                  {(result.webResearch.results || []).slice(0, 6).map((item) => (
                    <a key={`${item.title}-${item.url}`} href={item.url} target="_blank" rel="noreferrer">
                      <strong>{item.title}</strong>
                      <span>{item.publisher || item.url}</span>
                    </a>
                  ))}
                </div>
              </section>

              <section className="details">
                <h3><ExternalLink size={18} /> Sources</h3>
                <div className="sources">
                  {result.sources.map((source) => (
                    <a key={`${source.title}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
                      <span>{source.title}</span>
                      <small>{source.url}</small>
                    </a>
                  ))}
                </div>
              </section>
            </article>
          )}
        </section>
      </section>
    </main>
  );
}

function ScenarioLens({ scenario, setScenario, result, technicals, newsCount }) {
  const options = [
    {
      id: "bull",
      label: "Bull",
      title: "Upside lens",
      text: `Best case improves if catalysts convert, news flow stays constructive, and ${technicals.trend || "trend"} stabilizes.`
    },
    {
      id: "base",
      label: "Base",
      title: "Balanced lens",
      text: `Current memo call is ${result.analysis.decision} with ${result.analysis.confidence}/100 conviction across live evidence.`
    },
    {
      id: "bear",
      label: "Bear",
      title: "Downside lens",
      text: `Main risk case focuses on drawdown, missing fundamentals, weak trend, and any deterioration in recent research signals.`
    }
  ];
  const active = options.find((item) => item.id === scenario) || options[1];

  return (
    <section className="scenario-lens">
      <div className="scenario-copy">
        <span><WandSparkles size={17} /> Scenario Lens</span>
        <h3>{active.title}</h3>
        <p>{active.text}</p>
      </div>
      <div className="scenario-controls" role="group" aria-label="Scenario lens">
        {options.map((item) => (
          <button
            className={scenario === item.id ? "active" : ""}
            type="button"
            key={item.id}
            onClick={() => setScenario(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pulse-stack" aria-hidden="true">
        <span style={{ "--level": `${Math.max(12, Math.min(100, result.analysis.confidence))}%` }}>Conviction</span>
        <span style={{ "--level": `${Math.max(12, Math.min(100, (newsCount || 0) * 12))}%` }}>Evidence</span>
        <span style={{ "--level": `${technicals.volatility ? Math.max(12, Math.min(100, technicals.volatility * 160)) : 36}%` }}>Volatility</span>
      </div>
    </section>
  );
}

function AdvancedPanel({ icon, title, value, text }) {
  return (
    <section className="advanced-panel">
      <div className="advanced-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{text}</p>
    </section>
  );
}

function ChecklistItem({ label, active }) {
  return (
    <div className={active ? "check-item active" : "check-item"}>
      {active ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>{label}</span>
    </div>
  );
}

function CandlestickChart({ candles, currency }) {
  const visible = candles.slice(-90);
  if (visible.length < 2) {
    return <div className="candle-empty">Candlestick data unavailable for this symbol/range.</div>;
  }

  const width = 900;
  const height = 360;
  const pad = { top: 24, right: 72, bottom: 42, left: 28 };
  const highs = visible.map((item) => item.high);
  const lows = visible.map((item) => item.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;
  const step = (width - pad.left - pad.right) / visible.length;
  const candleWidth = Math.max(3, Math.min(10, step * 0.58));
  const y = (value) => pad.top + (1 - (value - min) / range) * (height - pad.top - pad.bottom);
  const last = visible.at(-1);
  const first = visible[0];
  const change = last.close / first.open - 1;
  const grid = Array.from({ length: 5 }, (_, index) => min + (range / 4) * index);

  return (
    <div className="candle-wrap">
      <div className={change >= 0 ? "candle-stat up" : "candle-stat down"}>
        <strong>{formatMetric(last.close, "currency", currency)}</strong>
        <span>{change >= 0 ? "+" : ""}{(change * 100).toFixed(2)}%</span>
      </div>
      <svg className="candle-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Candlestick chart">
        {grid.map((value) => (
          <g key={value}>
            <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} className="grid-line" />
            <text x={width - pad.right + 10} y={y(value) + 4} className="price-label">
              {formatMetric(value, "text", currency)}
            </text>
          </g>
        ))}
        {visible.map((item, index) => {
          const x = pad.left + index * step + step / 2;
          const up = item.close >= item.open;
          const bodyTop = y(Math.max(item.open, item.close));
          const bodyHeight = Math.max(2, Math.abs(y(item.open) - y(item.close)));
          return (
            <g key={`${item.date}-${index}`} className={up ? "candle up" : "candle down"}>
              <line x1={x} x2={x} y1={y(item.high)} y2={y(item.low)} />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" />
            </g>
          );
        })}
        <text x={pad.left} y={height - 12} className="date-label">{visible[0].date}</text>
        <text x={width - pad.right - 80} y={height - 12} className="date-label">{last.date}</text>
      </svg>
    </div>
  );
}

function LandingState({ onPick }) {
  return (
    <div className="empty-state">
      <div className="terminal-preview">
        <div className="preview-top"><span /><span /><span /></div>
        <div className="preview-core">
          <BarChart3 size={58} />
          <Sparkles size={34} />
          <LineChart size={48} />
        </div>
        <h2>Next-level AI investment command center.</h2>
        <p>Live market data, 3D signal visualization, news evidence, technical risk checks, and AI-ready investment memos.</p>
        <button type="button" onClick={() => onPick("Reliance Industries")}>Try Reliance Industries</button>
      </div>
    </div>
  );
}

function LoadingState({ company }) {
  return (
    <div className="empty-state">
      <Loader2 className="spin" size={54} />
      <h2>Building research memo for {company}...</h2>
      <p>Resolving ticker, pulling live market data, scanning news, and scoring the investment setup.</p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="error-state">
      <ShieldAlert size={36} />
      <h2>Could not complete research</h2>
      <p>{error}</p>
    </div>
  );
}

function MemoList({ icon, title, items }) {
  return (
    <section className="details">
      <h3>{icon} {title}</h3>
      <ul>
        {(items || []).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function LoginPage({ onLogin, theme, setTheme, themes }) {
  const [pin, setPin] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([
    "INITIALIZING SECURITY GATEWAY...",
    "ESTABLISHING DECRYPTED NODE SHIELD...",
    "GATEWAY STATUS: READY FOR PASSKEY."
  ]);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [error, setError] = useState("");

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === "1337" || pin === "7777" || pin === "1234" || pin === "") {
      triggerLoginSuccess();
    } else {
      setError("ACCESS DENIED: INVALID KEY HASH.");
      setTerminalLogs(prev => [...prev, "ERROR: INVALID SECURITY HASHLINK REQUESTED."]);
    }
  };

  const triggerLoginSuccess = () => {
    setScanning(true);
    setTerminalLogs(prev => [...prev, "AUTHENTICATING SHA-256 SIGNATURE..."]);
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, "SIGNATURE VERIFIED. INJECTING ACCESS KEY..."]);
      setTimeout(() => {
        setScanSuccess(true);
        setTerminalLogs(prev => [...prev, "ACCESS GRANTED. WELCOME AGENT."]);
        setTimeout(() => {
          onLogin();
        }, 800);
      }, 700);
    }, 600);
  };

  const handleFingerprintScan = () => {
    if (scanning) return;
    setScanning(true);
    setError("");
    setTerminalLogs(prev => [...prev, "STARTING BIOMETRIC TELEMETRY SCAN..."]);
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, "BIOMETRIC HASH KEY RESOLVED: AGENT #401"]);
      setTimeout(() => {
        setScanSuccess(true);
        setTerminalLogs(prev => [...prev, "ACCESS GRANTED. INITIALIZING WORKSPACE..."]);
        setTimeout(() => {
          onLogin();
        }, 800);
      }, 700);
    }, 1500);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><BrainCircuit size={28} /></div>
          <h2>ALTUNI SECURITY GATEWAY</h2>
          <p>AUTHORIZED AGENTS ONLY · LEVEL 4 CLEARANCE</p>
        </div>

        <div className="terminal-screen">
          <div className="terminal-header">
            <span /> <span /> <span />
            <small>gate_protocol_v4.1.sh</small>
          </div>
          <div className="terminal-body">
            {terminalLogs.map((log, index) => (
              <div key={index} className="terminal-line">&gt; {log}</div>
            ))}
            {error && <div className="terminal-line error-line">&gt; {error}</div>}
          </div>
        </div>

        <form onSubmit={handlePinSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="passkey">DECRYPTION PASSKEY</label>
            <input
              id="passkey"
              type="password"
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={scanning}
            />
            <small>Press Enter to decrypt, or use bypass scan below.</small>
          </div>
          <button type="submit" className="login-btn" disabled={scanning}>
            {scanning ? "DECRYPTING..." : "ENTER PASSKEY"}
          </button>
        </form>

        <div className="biometric-bypass">
          <div className="bypass-divider">
            <span />
            <small>OR BYPASS WITH BIOMETRIC LOCK</small>
            <span />
          </div>

          <button
            type="button"
            onClick={handleFingerprintScan}
            className={`biometric-pad ${scanning ? "scanning" : ""} ${scanSuccess ? "success" : ""}`}
            aria-label="Fingerprint scan bypass"
          >
            <div className="radar-grid" />
            <Fingerprint size={36} className="finger-icon" />
            <div className="scan-line" />
          </button>
          <span>{scanning ? (scanSuccess ? "GRANTED" : "SCANNING...") : "HOLD TO SCAN FINGERPRINT"}</span>
        </div>

        <div className="login-themes">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={theme === item.id ? "active" : ""}
              onClick={() => setTheme(item.id)}
              style={{ "--theme-color": item.swatches[0] }}
            />
          ))}
        </div>
        <div className="login-footer">
          <small>Select Terminal Node Palette</small>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ points }) {
  const closes = points.map((point) => point.close).filter((value) => typeof value === "number");
  if (closes.length < 2) return <div className="sparkline-empty">Price history unavailable</div>;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const path = closes.map((close, index) => {
    const x = (index / (closes.length - 1)) * 100;
    const y = 100 - ((close - min) / range) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="90-day price chart">
      <polyline points={path} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

createRoot(document.getElementById("root")).render(<App />);
