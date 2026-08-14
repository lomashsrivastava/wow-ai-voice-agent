# DESIGN DECISIONS — WOW Voice AI Agent

## 1. Unified Monorepo Layout
* *Decision*: Structure the workspace with separate `backend/` and `frontend/` folders, with configuration and orchestrations managed at the root level.
* *Rationale*: Enhances module encapsulation and deployment flexibility (Vite build targets Netlify/Vercel; Fastify targets Render or Docker containers).

## 2. Dynamic Model Fallback Chain
* *Decision*: Prioritize `Gemini 2.5 Flash` over others, falling through to `Grok 3 Mini`, then local `Ollama`, and finally `Demo Mode`.
* *Rationale*: Gemini offers minimal latency (ideal for live call response times) and excellent Hinglish handling, while the Demo Mode ensures a guaranteed fail-safe for product presentations.

## 3. Heuristic Scoring on Client Simulator
* *Decision*: Compute real-time scorecard updates directly in the simulator UI.
* *Rationale*: Visual instant-qualification feedback improves user engagement and clearly highlights the agent's reasoning during live tests.
