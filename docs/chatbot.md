# Chatbot

Deterministic retrieval-based query engine (`ml-service/app/main.py :: /chat/query`) — no LLM API key
required, no hallucination risk. It pattern-matches the question to one of a fixed set of intents
(busiest zone tomorrow, peak hour, heavy-congestion roads, weather impact, anomalies, weekend traffic)
and answers only from `pipeline_output.json`, citing the source field it read from. Unmatched questions
get an explicit fallback listing the topics it can answer, rather than a fabricated response.
