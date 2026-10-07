# Dataset Documentation

## Primary Traffic Dataset — REAL / PUBLIC

| Field | Value |
|---|---|
| Name | Metro Interstate Traffic Volume |
| Source | UCI Machine Learning Repository (dataset id 492), originally collected by the Minnesota Department of Transportation (MnDOT) |
| URL | https://archive.ics.uci.edu/ml/datasets/Metro+Interstate+Traffic+Volume |
| Downloaded via | GitHub mirror `ManojKumarMaruthi/Regression/Metro_Interstate_Traffic_Volume.csv` (identical content to the UCI release; used because the sandboxed build environment cannot reach `archive.ics.uci.edu` directly) |
| License | CC BY 4.0 |
| Citation | Hogue, J. (2019). Metro Interstate Traffic Volume [Dataset]. UCI ML Repository. https://doi.org/10.24432/C5X60B |
| Geographic coverage | Interstate 94 Westbound, MnDOT ATR station 301, roughly midway between Minneapolis and St Paul, MN, USA |
| Time period | 2012-10-02 to 2018-09-30 |
| Temporal resolution | Hourly |
| Number of raw records | 48,204 rows (before de-duplication); 48,151 unique timestamps after de-duplication |
| Real columns | `date_time`, `traffic_volume`, `temp`, `rain_1h`, `snow_1h`, `clouds_all`, `weather_main`, `weather_description`, `holiday` |
| Missing values | No missing values in the raw file; some rows are duplicated on `date_time` (differ only in weather description text) — de-duplicated by keeping the first occurrence |
| Preprocessing | De-duplication on `date_time`; chronological sort; `rain_1h`/`snow_1h` NaNs (none found) would be filled with 0 |

## Multi-Zone / Multi-Road Extension — DERIVED

The real dataset is **single-location** (one ATR station). To honestly demonstrate a multi-road/zone
dashboard (required by the Review-1 brief), the pipeline **derives** five zones/roads from the same
real hourly signal using fixed, documented scaling factors and small Gaussian noise (seed 42):

| Zone | Road | Type | Scale factor |
|---|---|---|---|
| Z1 | Anna Salai (Main Corridor) | office | 1.15 |
| Z2 | OMR (Tech Corridor) | office | 1.30 |
| Z3 | College Road | school | 0.60 (+school-hour boost) |
| Z4 | Pondy Bazaar Road | shopping | 0.75 (+evening/weekend boost) |
| Z5 | Outer Ring Road | highway | 1.45 |

This is clearly labeled **DERIVED**, not independent real measurement per road. Zone coordinates are
placeholder Chennai-area coordinates used only to demonstrate the heat map UI; they do not correspond
to the real MnDOT sensor location.

## Synthetic / Demo Contextual Sources

The real dataset does not include public transport GPS, event/festival schedules, school/office
timing, construction, parking, or accident data. These are generated with a **fixed random seed (42)**
and rule-based correlations (documented in `scripts/build_pipeline.py`), and every column is prefixed
`syn_`:

| Source | Column(s) | Generation logic |
|---|---|---|
| Public transport GPS (aggregated) | `syn_public_transport_activity` | 0–1 index, elevated during 7–9 AM / 5–7 PM |
| School & office timings | `syn_school_timing`, `syn_office_timing` | Rule-based boolean flags on weekday hour windows |
| Road construction | `syn_construction_impact` | 15 randomly chosen days/year get a 0.2–0.6 severity impact |
| Parking occupancy | `syn_parking_occupancy` | Base 0.3–0.7 correlated with shopping-zone traffic and peak hours |
| Accident reports | `syn_accident_flag`, `syn_accident_severity` | ~0.4% hourly probability, severity 0.3–1.0 when flagged |
| Events / festival calendar | `syn_festival_name`, `syn_event_presence`, `syn_event_crowd_level` | Fixed calendar of Pongal/Diwali/Christmas dates 2013–2018 |

**No synthetic column is ever presented as real-world data in the UI or docs.** The dashboard's Data
Sources panel and API (`GET /api/data-sources`) label every source explicitly as `REAL/PUBLIC`,
`DERIVED`, or `SYNTHETIC/DEMO`.

## Processed Dataset

- `data/processed/master_dataset.parquet` — full merged dataset used for training (202,755 rows after
  zone expansion, lag features, and dropping the first 24h per zone for lag availability)
- `data/demo/master_dataset_sample.csv` — first 3,000 rows, for quick inspection without parquet tooling

## Known Limitations

- Only one real physical sensor location underlies all "real" traffic figures; multi-zone realism is
  synthetic scaling, not independent ground truth.
- The dataset has a real gap between Aug 2014 and Jun 2015 (documented by other users of this dataset);
  our chronological split does not specifically account for this gap.
- Festival-day traffic patterns are **not** learned from real historical festival records — the festival
  calendar itself is synthetic, so Festival Mode is explicitly labeled "Scenario / Demo Forecast" (see
  `docs/festival_mode.md`).
- Next-weekend forecasting is technically supported by the ~6-year span, but the forecast values still
  come from the same location's derived zones, not independent multi-road ground truth.
