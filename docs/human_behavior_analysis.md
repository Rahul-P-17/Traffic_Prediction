# Human Behaviour Pattern Analysis

We analyse **aggregated, population-level mobility patterns** — never individuals, emotions, or
identity. Hourly traffic is averaged per (zone, hour, weekday/weekend) and clustered with K-Means
(k=4) on the standardized 24-hour profile. Each cluster is then **interpreted** after the fact by its
temporal shape (morning+evening peaks → office/commuter-like; concentrated school-hour peaks →
school-zone-like; evening/weekend peaks → shopping/entertainment-like; flat high baseline →
transit/highway-like). K-Means itself only measures numerical similarity between aggregated curves; it
does not "know" what an office commuter is.
