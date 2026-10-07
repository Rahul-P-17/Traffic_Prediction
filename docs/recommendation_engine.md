# Recommendation Engine

Rule-based, explainable, and driven only by pipeline outputs (forecasts, anomalies, synthetic context):
- HEAVY congestion forecast on a road → alternate-route recommendation naming the least-loaded other zone.
- High public-transport-activity index + HEAVY next-hour congestion → extra-buses recommendation.
- Active construction-impact signal → temporary-diversion recommendation.
Every recommendation carries a `reason` string built from the actual triggering values and is labeled
"AI-Generated Recommendation" in both the API and UI — never presented as an official traffic-police
decision.
