# Database

MySQL (schema in `backend/src/db/mysql_schema.sql`, applied via `npm run db:init`), covering all 12 tables. See docs/DATABASE_SETUP.md.
with indexes on timestamp/road_id/zone_id where applicable. Populated at backend startup from
`pipeline_output.json` via `backend/src/db/init.ts`.
