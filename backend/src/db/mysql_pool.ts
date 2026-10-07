import mysql from "mysql2/promise";
import "dotenv/config";

/**
 * Single MySQL connection pool for the whole backend.
 *
 * Replaces the previous better-sqlite3 setup, which was the actual
 * runtime database despite mysql_schema.sql existing separately and
 * never being used. This file — plus init_mysql.ts and the async
 * rewrite of server.ts — is what makes MySQL the real runtime path.
 *
 * Credentials come ONLY from environment variables (see .env.example
 * at the repo root). Nothing here is hardcoded.
 */

const required = ["DB_HOST", "DB_USER", "DB_NAME"] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.warn(
      `[db] Warning: environment variable ${key} is not set. ` +
      `Copy .env.example to .env and fill in your MySQL credentials.`
    );
  }
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "chennai_traffic",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Call once at startup. Reports clearly (not a cryptic stack trace) if
 * MySQL is unreachable, so a misconfigured .env is obvious immediately
 * instead of surfacing as random query failures later.
 */
export async function checkMysqlConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(
      `[db] Connected to MySQL at ${process.env.DB_HOST || "localhost"}:` +
      `${process.env.DB_PORT || 3306} (database: ${process.env.DB_NAME || "chennai_traffic"})`
    );
    return true;
  } catch (err: any) {
    console.error("========================================================");
    console.error("[db] FATAL: Could not connect to MySQL.");
    console.error(`[db] Reason: ${err?.message ?? err}`);
    console.error("[db] Check that:");
    console.error("[db]   1. MySQL/MariaDB is running");
    console.error("[db]   2. .env exists with correct DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME");
    console.error("[db]   3. The database and user were created — see README.md 'Database setup'");
    console.error("[db]      or run: npm run db:init  (after creating the DB/user once)");
    console.error("========================================================");
    return false;
  }
}
