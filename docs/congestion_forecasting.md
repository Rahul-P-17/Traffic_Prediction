# Congestion Forecasting

Forecasts for next_1h / next_6h / tomorrow / next_weekend are produced by feeding the trained XGBoost
model a feature row built from the target timestamp's calendar features plus the zone's most recent
lag/rolling/context values (construction/accident/event flags reset to 0 for future horizons since
they are not known in advance). Congestion level is derived from predicted volume vs. a documented
per-zone-type capacity assumption (office 7000, highway 9000, shopping 4500, school 3000 veh/hr).
