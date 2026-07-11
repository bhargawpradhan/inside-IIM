# AI Investment Research Agent

An AI-powered investment research agent for the InsideIIM x Altuni AI Labs take-home assignment. The app takes a company name, resolves market data, optionally performs live web research, and returns an investment decision memo: `invest`, `pass`, or `watchlist`.

## Overview

The product is a full-stack analyst workspace:

- React frontend for entering a company and reading the investment memo.
- Node.js + Express backend for orchestration.
- LangChain.js for structured LLM reasoning.
- Three.js for the live 3D market-signal background.
- Yahoo Finance search, news, and chart data for real market evidence.
- Optional Tavily search for live qualitative research.
- Deterministic fallback scoring when API keys are not present, so the project can still be evaluated locally.

The output includes decision, confidence, summary, investment thesis, risks, catalysts, watch items, factor scorecard, live price metrics, a TradingView-style OHLC candlestick chart, a 90-day price tape, recent news, reasoning, and sources.

## How to run it

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Add keys in `.env`:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
TAVILY_API_KEY=optional_tavily_key
```

`OPENAI_API_KEY` enables the full LangChain LLM memo. `TAVILY_API_KEY` enables live web research. Without keys, the app still runs in fallback scoring mode.

4. Start the app:

```bash
npm run dev
```

If PowerShell blocks `npm`, use:

```powershell
npm.cmd run dev
```

5. Open the frontend:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:8787
```

## How it works

The backend implements a small research workflow in `server/researchAgent.js`:

1. `resolveCompany` searches Yahoo Finance and chooses the most relevant equity ticker.
2. `getMarketData` fetches real Yahoo Finance chart data, OHLC candles, live price, volume, 52-week range, 90-day price series, moving averages, volatility, and max drawdown.
3. `getWebResearch` uses Yahoo Finance news by default and calls Tavily when configured to collect broader qualitative evidence.
4. `analyzeWithLlm` uses LangChain.js, `ChatOpenAI`, prompt templates, and structured output validation with Zod.
5. `fallbackAnalysis` applies transparent factor scoring when no LLM key is configured.

The frontend in `src/main.jsx` presents the workflow as an advanced glass-style research desk with animated market background, selectable glass color themes, quick-pick companies, real candle range controls, signal stack, decision header, conviction score, candlestick chart, price chart, metrics, AI/risk/evidence panels, scenario lens, factor scorecard, thesis, risks, catalysts, watch items, execution checklist, recent research signals, reasoning, and sources.

## Key decisions & trade-offs

- I used Yahoo Finance because it provides real public-company search, news, and chart data without requiring a paid market-data key.
- I kept the agent auditable: the fallback score is intentionally simple and transparent, and the LLM path is constrained to a Zod schema.
- The decision can be `watchlist`, not only invest/pass, because real research often needs a neutral answer when evidence is incomplete.
- I made Tavily optional. Live web research improves memo quality, but the app should still run for reviewers without another API key.
- I do not fabricate unavailable data. If Yahoo's quote fundamentals are restricted in an environment, the app uses chart/news data and labels missing fields as unavailable.
- I lazy-load Three.js so the advanced 3D scene does not block the first React bundle. Vite still reports the Three.js vendor chunk as large, which is expected for a WebGL library.
- I added a Scenario Lens for bull/base/bear review. It reframes the already-fetched evidence and does not invent new financial data.
- I did not implement portfolio sizing, discounted cash-flow modeling, or user authentication. Those would add scope but are not needed to demonstrate an end-to-end AI product.

## Example runs

These examples describe the expected style of output. Exact metrics can change with market data.

### Tata Consultancy Services

- Decision: `watchlist`
- Reasoning: Strong profitability and enterprise quality, but valuation and growth assumptions need current verification.
- Risks: Slower IT services demand, margin pressure, missing live web context if Tavily is not configured.

### HDFC Bank

- Decision: `watchlist`
- Reasoning: Large, profitable financial franchise with durable market position, but banking metrics need deeper sector-specific analysis.
- Risks: Credit cycle, deposit competition, integration/execution issues, macro sensitivity.

### Tesla

- Decision: `pass` or `watchlist`
- Reasoning: Strong brand and growth optionality, but valuation and execution risk can dominate the score.
- Risks: Margin compression, competition, demand cyclicality, leadership/key-person risk.

## What I would improve with more time

- Add filing ingestion for annual reports, earnings-call transcripts, and investor presentations.
- Add peer comparison and sector-specific scoring models.
- Add citations at the sentence level in the LLM memo.
- Add a saved-research history and export-to-PDF button.
- Add deployment configuration for Vercel frontend plus a hosted Node API.
- Add automated tests around ticker resolution, fallback scoring, and API response shape.

## LLM chat session transcript/logs

I used an AI coding assistant to plan and build this project. A representative build log is included in `docs/llm-transcript.md`.
