import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const AnalysisSchema = z.object({
  decision: z.enum(["invest", "pass", "watchlist"]),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  thesis: z.array(z.string()).min(3).max(5),
  risks: z.array(z.string()).min(3).max(5),
  catalysts: z.array(z.string()).min(2).max(5),
  watchItems: z.array(z.string()).min(2).max(5),
  reasoning: z.string(),
  scorecard: z.array(z.object({
    label: z.string(),
    score: z.number().min(0).max(100),
    comment: z.string()
  })).min(4).max(6)
});

export async function runInvestmentResearch(companyName, range = "1y") {
  const company = await resolveCompany(companyName);
  const [marketData, webResearch] = await Promise.all([
    getMarketData(company, range),
    getWebResearch(company)
  ]);

  const context = {
    company,
    marketData,
    webResearch,
    generatedAt: new Date().toISOString()
  };

  const analysis = process.env.OPENAI_API_KEY
    ? await analyzeWithLlm(context)
    : fallbackAnalysis(context);

  return {
    company,
    marketData,
    webResearch,
    analysis,
    sources: buildSources(marketData, webResearch),
    generatedAt: context.generatedAt,
    mode: process.env.OPENAI_API_KEY ? "llm" : "fallback"
  };
}

async function resolveCompany(companyName) {
  const searchUrl = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  searchUrl.searchParams.set("q", companyName);
  searchUrl.searchParams.set("quotesCount", "8");
  searchUrl.searchParams.set("newsCount", "8");

  const search = await yahooFetch(searchUrl);
  const quote = search.quotes?.find((item) => item.quoteType === "EQUITY") || search.quotes?.[0];

  return {
    inputName: companyName,
    resolvedName: quote?.longname || quote?.shortname || companyName,
    symbol: quote?.symbol || companyName.toUpperCase(),
    exchange: quote?.exchDisp || quote?.exchange || "Unknown",
    quoteType: quote?.quoteType || "Unknown",
    yahooNews: normalizeYahooNews(search.news || [])
  };
}

async function getMarketData(company, range) {
  try {
    const [chartResult, quoteResult] = await Promise.allSettled([
      getChartData(company.symbol, range),
      getQuoteData(company.symbol)
    ]);

    const chart = chartResult.status === "fulfilled" ? chartResult.value : {};
    const quote = quoteResult.status === "fulfilled" ? quoteResult.value : {};

    return {
      quote: {
        symbol: quote.symbol || chart.symbol || company.symbol,
        currency: quote.currency || chart.currency,
        regularMarketPrice: numberValue(quote.regularMarketPrice ?? chart.regularMarketPrice),
        marketCap: numberValue(quote.marketCap),
        trailingPE: numberValue(quote.trailingPE),
        forwardPE: numberValue(quote.forwardPE),
        priceToBook: numberValue(quote.priceToBook),
        epsTrailingTwelveMonths: numberValue(quote.epsTrailingTwelveMonths),
        epsForward: numberValue(quote.epsForward),
        fiftyTwoWeekHigh: numberValue(quote.fiftyTwoWeekHigh ?? chart.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: numberValue(quote.fiftyTwoWeekLow ?? chart.fiftyTwoWeekLow),
        oneYearReturn: numberValue(chart.oneYearReturn),
        distanceFromHigh: numberValue(chart.distanceFromHigh),
        regularMarketVolume: numberValue(chart.regularMarketVolume),
        averageAnalystRating: quote.averageAnalystRating,
        recommendationMean: parseAnalystRating(quote.averageAnalystRating)
      },
      technicals: chart.technicals || {},
      priceSeries: chart.priceSeries || [],
      candles: chart.candles || [],
      chartRange: chart.range || range,
      chartInterval: chart.interval || "1d",
      rawAvailable: true,
      notes: [
        quoteResult.status === "rejected" ? "Yahoo quote fundamentals were unavailable; chart metadata was used." : null
      ].filter(Boolean)
    };
  } catch (error) {
    return {
      quote: { symbol: company.symbol },
      rawAvailable: false,
      error: error.message
    };
  }
}

async function getChartData(symbol, range = "1y") {
  const interval = range === "1mo" ? "1d" : "1d";
  const chartUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  chartUrl.searchParams.set("range", range);
  chartUrl.searchParams.set("interval", interval);

  const chartResponse = await yahooFetch(chartUrl);
  const result = chartResponse.chart?.result?.[0];
  if (!result) throw new Error(chartResponse.chart?.error?.description || "Yahoo chart data was empty.");

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const timestamps = result.timestamp || [];
  const candles = timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: numberValue(quote.open?.[index]),
    high: numberValue(quote.high?.[index]),
    low: numberValue(quote.low?.[index]),
    close: numberValue(quote.close?.[index]),
    volume: numberValue(quote.volume?.[index])
  })).filter((item) => (
    item.open !== null &&
    item.high !== null &&
    item.low !== null &&
    item.close !== null
  ));
  const closes = candles.map((item) => item.close);
  const firstClose = closes[0];
  const lastClose = closes.at(-1) || meta.regularMarketPrice;
  const high = numberValue(meta.fiftyTwoWeekHigh) || Math.max(...closes);
  const low = numberValue(meta.fiftyTwoWeekLow) || Math.min(...closes);
  const priceSeries = candles.slice(-90).map(({ close, date }) => ({ close, date }));

  return {
    symbol: meta.symbol,
    currency: meta.currency,
    regularMarketPrice: numberValue(meta.regularMarketPrice ?? lastClose),
    fiftyTwoWeekHigh: numberValue(high),
    fiftyTwoWeekLow: numberValue(low),
    regularMarketVolume: numberValue(meta.regularMarketVolume),
    oneYearReturn: firstClose && lastClose ? lastClose / firstClose - 1 : null,
    distanceFromHigh: high && lastClose ? 1 - lastClose / high : null,
    technicals: calculateTechnicals(closes, high, low),
    priceSeries,
    candles,
    range,
    interval
  };
}

async function getQuoteData(symbol) {
  const quoteUrl = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  quoteUrl.searchParams.set("symbols", symbol);

  const quoteResponse = await yahooFetch(quoteUrl);
  if (quoteResponse.finance?.error) {
    throw new Error(quoteResponse.finance.error.description || "Yahoo quote request failed.");
  }

  return quoteResponse.quoteResponse?.result?.[0] || {};
}

async function getWebResearch(company) {
  const yahooResults = company.yahooNews || [];

  if (!process.env.TAVILY_API_KEY) {
    return {
      enabled: yahooResults.length > 0,
      provider: yahooResults.length > 0 ? "Yahoo Finance news search" : "Market data only",
      findings: yahooResults.length > 0
        ? yahooResults.slice(0, 4).map((item) => item.title)
        : ["No live news items were returned by Yahoo Finance search."],
      results: yahooResults
    };
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `${company.resolvedName} ${company.symbol} latest earnings competitive position risks`,
      search_depth: "advanced",
      max_results: 6,
      include_answer: true
    })
  });

  if (!response.ok) {
    return {
      enabled: false,
      findings: [`Tavily search failed with status ${response.status}.`],
      results: []
    };
  }

  const data = await response.json();
  return {
    enabled: true,
    provider: "Tavily + Yahoo Finance news search",
    findings: [data.answer].filter(Boolean),
    results: [
      ...yahooResults,
      ...(data.results || []).map((item) => ({
      title: item.title,
      url: item.url,
      content: item.content
      }))
    ]
  };
}

async function analyzeWithLlm(context) {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.2
  });

  const structuredModel = model.withStructuredOutput(AnalysisSchema, { name: "investment_memo" });
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", [
      "You are a disciplined buy-side investment research agent.",
      "Make a clear invest, pass, or watchlist call.",
      "Use only the provided data. If data is missing, say so and reduce confidence.",
      "Balance price momentum, valuation availability, market evidence, news quality, and downside risk.",
      "This is educational research, not financial advice."
    ].join(" ")],
    ["human", "Prepare an investment decision memo from this JSON context:\n{context}"]
  ]);

  const chain = prompt.pipe(structuredModel);
  return chain.invoke({ context: JSON.stringify(context, null, 2) });
}

function fallbackAnalysis(context) {
  const q = context.marketData.quote || {};
  const t = context.marketData.technicals || {};
  let score = 50;
  const thesis = [];
  const risks = [];
  const catalysts = [];
  const watchItems = [];

  if (q.epsTrailingTwelveMonths > 0) {
    score += 10;
    thesis.push(`Positive trailing EPS of ${q.epsTrailingTwelveMonths.toFixed(2)} supports current profitability.`);
  } else {
    risks.push("Trailing EPS is unavailable from the public quote endpoint, limiting profitability analysis.");
  }

  if (q.forwardPE && q.trailingPE && q.forwardPE < q.trailingPE) {
    score += 8;
    thesis.push(`Forward P/E below trailing P/E suggests the market expects earnings improvement.`);
  } else {
    risks.push("Forward earnings improvement is not visible from the available quote data.");
  }

  if (q.trailingPE && q.trailingPE < 35) {
    score += 8;
    thesis.push(`Trailing P/E of ${q.trailingPE.toFixed(1)} is not extreme for a quality company.`);
  } else if (q.trailingPE) {
    score -= 10;
    risks.push(`Trailing P/E of ${q.trailingPE.toFixed(1)} requires strong future execution.`);
  } else {
    risks.push("Valuation data is missing, so the agent cannot judge price discipline well.");
  }

  if (q.priceToBook && q.priceToBook < 8) {
    score += 5;
    thesis.push(`Price/book of ${q.priceToBook.toFixed(1)} is within a screenable range.`);
  } else if (q.priceToBook) {
    score -= 5;
    risks.push(`Price/book of ${q.priceToBook.toFixed(1)} may leave limited margin of safety.`);
  }

  if (q.distanceFromHigh !== null && q.distanceFromHigh !== undefined) {
    if (q.distanceFromHigh > 0.15) {
      score += 4;
      thesis.push("The current price is meaningfully below the 52-week high, which may improve entry discipline.");
    } else {
      risks.push("The stock trades close to its 52-week high, so expectations may already be optimistic.");
    }
  }

  if (q.oneYearReturn > 0.1) {
    score += 6;
    thesis.push(`One-year price return of ${(q.oneYearReturn * 100).toFixed(1)}% shows positive market momentum.`);
  } else if (q.oneYearReturn < -0.1) {
    score -= 6;
    risks.push(`One-year price return of ${(q.oneYearReturn * 100).toFixed(1)}% signals negative momentum.`);
  }

  if (t.trend === "uptrend") {
    score += 8;
    thesis.push("The 50-day average is above the 200-day average, indicating a positive medium-term trend.");
    catalysts.push("Sustained technical uptrend with improving moving-average structure.");
  } else if (t.trend === "downtrend") {
    score -= 8;
    risks.push("The 50-day average is below the 200-day average, indicating weak medium-term trend.");
    watchItems.push("Wait for the 50-day average to recover above the 200-day average.");
  }

  if (t.volatility && t.volatility < 0.35) {
    score += 4;
    thesis.push(`Annualized volatility near ${(t.volatility * 100).toFixed(1)}% is moderate for an equity screen.`);
  } else if (t.volatility) {
    score -= 4;
    risks.push(`Annualized volatility near ${(t.volatility * 100).toFixed(1)}% raises position-sizing risk.`);
  }

  if (t.maxDrawdown && t.maxDrawdown < -0.25) {
    score -= 6;
    risks.push(`The one-year max drawdown of ${(t.maxDrawdown * 100).toFixed(1)}% shows meaningful downside history.`);
    watchItems.push("Track whether price can stabilize above recent support levels.");
  }

  if (q.recommendationMean && q.recommendationMean <= 2.5) {
    score += 5;
    thesis.push("Sell-side recommendation data leans constructive.");
  }

  if (context.webResearch.results?.length) {
    score += 4;
    catalysts.push(...context.webResearch.results.slice(0, 2).map((item) => `Recent research signal: ${item.title}`));
  } else {
    risks.push("No recent news items were available from the configured research providers.");
  }

  while (thesis.length < 3) thesis.push("The company has live market data available for an evidence-based preliminary screen.");
  while (risks.length < 3) risks.push("The memo should be revisited with fresh filings, management commentary, and peer comparisons.");
  while (catalysts.length < 2) catalysts.push("Improved earnings visibility or positive management commentary could strengthen the setup.");
  while (watchItems.length < 2) watchItems.push("Confirm valuation and fundamentals from official filings before committing capital.");

  const boundedScore = Math.max(15, Math.min(88, Math.round(score)));
  const decision = boundedScore >= 68 ? "invest" : boundedScore <= 45 ? "pass" : "watchlist";
  const momentumScore = scoreFromReturn(q.oneYearReturn);
  const riskScore = t.maxDrawdown ? Math.max(0, Math.min(100, 100 + t.maxDrawdown * 180)) : 45;
  const evidenceScore = Math.min(100, 40 + (context.webResearch.results?.length || 0) * 10 + (context.marketData.rawAvailable ? 20 : 0));

  return {
    decision,
    confidence: boundedScore,
    summary: `${decision.toUpperCase()} based on live market data, recent research signals, price trend, valuation availability, and downside risk.`,
    thesis: thesis.slice(0, 5),
    risks: risks.slice(0, 5),
    catalysts: catalysts.slice(0, 5),
    watchItems: watchItems.slice(0, 5),
    reasoning: "This memo uses transparent factor scoring because OPENAI_API_KEY is not configured. The data itself is live: Yahoo Finance search/news and chart data are fetched at request time, and optional Tavily/OpenAI keys add deeper research and LLM judgment.",
    scorecard: [
      { label: "Momentum", score: momentumScore, comment: formatComment(q.oneYearReturn, "1y return") },
      { label: "Trend", score: t.trend === "uptrend" ? 76 : t.trend === "downtrend" ? 36 : 52, comment: t.trend || "Trend unavailable" },
      { label: "Risk", score: riskScore, comment: t.maxDrawdown ? `Max drawdown ${(t.maxDrawdown * 100).toFixed(1)}%` : "Drawdown unavailable" },
      { label: "Valuation", score: q.trailingPE ? Math.max(20, Math.min(90, 95 - q.trailingPE)) : 42, comment: q.trailingPE ? `P/E ${q.trailingPE.toFixed(1)}` : "P/E unavailable" },
      { label: "Evidence", score: evidenceScore, comment: `${context.webResearch.results?.length || 0} live research items` }
    ]
  };
}

function buildSources(marketData, webResearch) {
  const sources = [
    {
      title: "Yahoo Finance quote summary",
      url: marketData.quote?.symbol
        ? `https://finance.yahoo.com/quote/${encodeURIComponent(marketData.quote.symbol)}`
        : "https://finance.yahoo.com"
    }
  ];

  for (const item of webResearch.results || []) {
    sources.push({ title: item.title || item.url, url: item.url });
  }

  return sources;
}

function normalizeYahooNews(news) {
  return news
    .filter((item) => item.link)
    .slice(0, 8)
    .map((item) => ({
      title: item.title || "Yahoo Finance news item",
      url: item.link,
      publisher: item.publisher,
      providerPublishTime: item.providerPublishTime,
      content: item.summary || item.title
    }));
}

function calculateTechnicals(closes, high, low) {
  if (closes.length < 5) return {};
  const returns = closes.slice(1).map((close, index) => close / closes[index] - 1);
  const averageReturn = average(returns);
  const variance = average(returns.map((value) => (value - averageReturn) ** 2));
  const volatility = Math.sqrt(variance) * Math.sqrt(252);
  const ma50 = movingAverage(closes, 50);
  const ma200 = movingAverage(closes, 200);
  const maxDrawdown = calculateMaxDrawdown(closes);

  return {
    ma50,
    ma200,
    volatility,
    maxDrawdown,
    rangePosition: high && low && closes.at(-1) ? (closes.at(-1) - low) / (high - low) : null,
    trend: ma50 && ma200 ? (ma50 > ma200 ? "uptrend" : "downtrend") : "insufficient history"
  };
}

function movingAverage(values, period) {
  if (values.length < period) return null;
  return average(values.slice(-period));
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateMaxDrawdown(values) {
  let peak = values[0];
  let maxDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1);
  }
  return maxDrawdown;
}

function scoreFromReturn(value) {
  if (value === null || value === undefined) return 45;
  return Math.max(0, Math.min(100, 50 + value * 120));
}

function formatComment(value, label) {
  if (value === null || value === undefined) return `${label} unavailable`;
  return `${label} ${(value * 100).toFixed(1)}%`;
}

async function yahooFetch(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 investment-research-agent/1.0",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed with status ${response.status}`);
  }

  return response.json();
}

function parseAnalystRating(value) {
  if (!value || typeof value !== "string") return null;
  const parsed = Number(value.split(" ")[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && "raw" in value) return numberValue(value.raw);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
