# LLM Chat Session Transcript

This is a concise transcript-style build log for the take-home assignment.

## Prompt

Build an AI Investment Research Agent for InsideIIM x Altuni AI Labs using React, Node.js, and LangChain.js. It should take a company name, research it, and decide whether to invest or pass with reasoning.

## AI Planning Notes

- Build a full-stack app rather than a notebook so the reviewer can interact with it.
- Use React + Vite for a fast frontend.
- Use Express for the API.
- Use LangChain.js for the LLM reasoning layer.
- Use Yahoo Finance for market data because it is accessible for local evaluation.
- Use Tavily as an optional search provider for recent qualitative research.
- Include a fallback deterministic scoring path so the project remains runnable without API keys.

## AI Implementation Notes

- Created `server/researchAgent.js` with ticker resolution, market-data gathering, optional web research, LLM structured output, and fallback scoring.
- Created `server/index.js` with `/api/health` and `/api/research`.
- Created a React interface with quick company examples, loading/error states, decision memo, metrics, thesis, risks, reasoning, and sources.
- Wrote a README matching the required assignment sections.

## Trade-off Discussion

The LLM is used where it adds judgment: weighing incomplete evidence and producing a readable memo. Numeric data gathering and fallback scoring remain deterministic so the system is easier to debug and explain.

The main limitation is data depth. A production-grade investment agent should ingest filings, earnings-call transcripts, segment data, peer multiples, and time-series financial statements.
