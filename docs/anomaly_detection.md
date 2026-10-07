# Anomaly Detection

Isolation Forest (`contamination=0.02`) trained on `[traffic_volume, hour, day_of_week, rain_1h,
syn_accident_flag]` across the full dataset, scored on the most recent 60 days. Anomaly type is
inferred conservatively: flagged as "accident-linked congestion" only when the synthetic accident flag
is set; otherwise labeled a generic "sudden traffic spike" / "unexpected traffic drop" / "unusual
traffic pattern" based on the ratio to the expected (historical average) traffic for that zone/hour.
We do not claim to know the real-world cause of an anomaly from traffic volume alone.
