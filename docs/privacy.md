# Privacy

No names, phone numbers, emails, or individual identities are stored anywhere in the schema (see
`backend/src/db/schema.sql`). Public transport activity is stored only as an aggregated 0–1 index per
zone/hour — never per rider or per vehicle. No facial recognition, emotion detection, or individual
psychological/behavioural profiling is performed anywhere in the pipeline. See `GET /api/privacy` and
the dashboard's Privacy panel for the live statement.
